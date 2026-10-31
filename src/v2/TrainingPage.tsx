import { useEffect, useRef, useState, type FormEvent } from 'react';
import { IconArrowRight, IconArrowUpRight, IconBook2, IconCheck, IconCircleCheck, IconClipboardCheck, IconRefresh, IconSchool, IconShieldCheck, IconTargetArrow } from '@tabler/icons-react';
import type { TrainingAttempt, TrainingTask } from '../../shared/contracts';
import type { PageProps } from './types';
import { EmptyState, PageHeader, StatusBadge } from './ui';
import './pages.css';

const labels = { not_started: '待学习', learning: '学习中', needs_retry: '待复练', completed: '已完成' };
const timeLabel = (value: string) => new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Shanghai' }).format(new Date(value));

export function TrainingPage({ data, busy, mutate, navigate, openKnowledge, focus }: PageProps) {
  const [selectedId, setSelectedId] = useState(focus?.taskId || '');
  const [employeeFilter, setEmployeeFilter] = useState(focus?.employeeId || '');
  const [selectedSteps, setSelectedSteps] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState('');
  const lock = useRef(false);
  const attempt = useRef<{ taskId: string; payload: string; key: string } | null>(null);
  const tasks = data.trainingTasks.filter(task => !employeeFilter || task.employeeId === employeeFilter);
  const roots = tasks.filter(task => !task.parentTaskId);
  const current = tasks.find(task => task.id === selectedId) || roots.find(task => task.status !== 'completed') || roots[0] || tasks[0];
  const root = current?.parentTaskId ? tasks.find(task => task.id === current.parentTaskId) || current : current;
  const retry = root && tasks.find(task => task.parentTaskId === root.id);
  const completedRetry = root?.status === 'completed' && retry?.status === 'completed' ? retry : undefined;
  const displayedAttempt = current?.id === root?.id && completedRetry ? completedRetry.attempts.at(-1) : current?.attempts.at(-1);
  const document = data.knowledge.find(item => item.id === current?.knowledgeId);
  const owner = data.employees.find(person => person.id === current?.employeeId);
  const canTrain = data.actor.role === 'employee' && data.actor.employeeId === current?.employeeId;
  const working = busy || !!pending;
  const completedCount = roots.filter(task => task.status === 'completed').length;
  const history = root ? [root, ...(retry ? [retry] : [])].flatMap(task => task.attempts.map((record, index) => ({ record, task, number: index + 1 })))
    .sort((left, right) => right.record.createdAt.localeCompare(left.record.createdAt)) : [];

  useEffect(() => { setSelectedId(''); setEmployeeFilter(''); setError(''); }, [data.actor.id]);
  useEffect(() => {
    if (focus?.page !== 'training') return;
    if (focus.taskId) setSelectedId(focus.taskId);
    setEmployeeFilter(focus.employeeId || ''); setError('');
  }, [focus?.page, focus?.taskId, focus?.employeeId]);
  useEffect(() => { setSelectedSteps([]); setNote(''); setError(''); attempt.current = null; }, [data.actor.id, current?.id]);
  function selectTask(task: TrainingTask) {
    setSelectedId(task.id); setError('');
    navigate({ page: 'training', taskId: task.id, ...(employeeFilter ? { employeeId: employeeFilter } : {}) });
  }
  async function start(target: TrainingTask) {
    if (!canTrain || working || lock.current) return;
    lock.current = true; setPending('start'); setError('');
    try {
      await mutate<TrainingTask>(`/api/training/${target.id}/start`, {});
      setSelectedSteps([]); setNote(''); attempt.current = null; selectTask(target);
    } catch (reason) { setError(reason instanceof Error ? reason.message : '学习状态未能保存，请重试。'); }
    finally { lock.current = false; setPending(''); }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!current || !canTrain || working || lock.current) return;
    const body = { selectedSteps, note: note.trim() };
    const serialized = JSON.stringify(body);
    const requestKey = attempt.current?.taskId === current.id && attempt.current.payload === serialized ? attempt.current.key : crypto.randomUUID();
    attempt.current = { taskId: current.id, payload: serialized, key: requestKey };
    lock.current = true; setPending('submit'); setError('');
    try { await mutate<{ task: TrainingTask; attempt: TrainingAttempt }>(`/api/training/${current.id}/submit`, { ...body, requestKey }); }
    catch (reason) { setError(reason instanceof Error ? reason.message : '演练提交未完成，请使用相同内容重试。'); }
    finally { lock.current = false; setPending(''); }
  }
  return <div className="v2p-page">
    <PageHeader title="培训管理" description="查看培训任务、学习资料和演练记录。" actions={<StatusBadge tone="blue">{completedCount} / {roots.length} 项已完成</StatusBadge>} />
    <p className="v2-notice"><IconShieldCheck size={17} />演练结果是学习证据，不替代实际岗位操作考核。复练关联原任务，完成率按原任务统计。</p>
    {!tasks.length ? <section className="v2-card"><EmptyState title="员工入职后自动创建培训任务" description="先完成录用与实际入职，系统会分配岗位必修及 HR 明确确认的发展任务。" icon={<IconSchool size={28} />} action={{ label: data.actor.role === 'hr' ? '前往入职管理' : '返回工作台', onClick: () => navigate({ page: data.actor.role === 'hr' ? 'onboarding' : 'dashboard' }) }} /></section> : current && root && <div className="v2p-training-layout">
      <aside className="v2-card v2p-training-queue" aria-label="培训任务队列"><div className="v2-card-header"><div><h2>{data.actor.role === 'employee' ? '我的培训任务' : '培训任务'}</h2><p>{roots.length} 项原始任务</p></div></div>{roots.map(task => {
        const person = data.employees.find(item => item.id === task.employeeId);
        const child = tasks.find(item => item.parentTaskId === task.id);
        return <div className={`v2p-task-group ${root.id === task.id ? 'selected' : ''}`} key={task.id}><button className="v2p-task-select" onClick={() => selectTask(task)}><span className="v2p-task-kind">{task.kind === 'development' ? '培养任务' : '岗位必修'}</span><strong>{task.title}</strong><small>{person?.name}</small><StatusBadge tone={task.status === 'completed' ? 'green' : task.status === 'needs_retry' ? 'amber' : 'blue'}>{labels[task.status]}</StatusBadge></button>{child && <button className={`v2p-child-task ${current.id === child.id ? 'active' : ''}`} onClick={() => selectTask(child)}><IconRefresh size={13} /><span>关联复练 · {labels[child.status]}</span><IconArrowUpRight size={13} /></button>}</div>;
      })}</aside>
      <section className="v2-card v2p-training-main" aria-label="岗位学习与情境演练"><div className="v2-card-header"><div><h2>{current.title}</h2><p>{owner?.name} · {current.kind === 'retry' ? '关联原任务的针对性复练' : current.kind === 'development' ? 'HR 已培养任务' : '岗位必修任务'}</p></div><StatusBadge tone={current.status === 'completed' ? 'green' : current.status === 'needs_retry' ? 'amber' : 'blue'}>{labels[current.status]}</StatusBadge></div><p className="v2p-task-description">{current.description}</p>
        {current.skillBridgeCaseId && <p className="v2-notice"><IconArrowUpRight size={15} />该任务来自 SkillBridge 能力缺口分析（分析编号 {current.skillBridgeCaseId.slice(0, 8)}）；完成不代表自动取得岗位资格，仍需资格维护负责人核验。<button className="v2-text-button" onClick={() => navigate({ page: 'skillbridge', caseId: current.skillBridgeCaseId })}>查看原分析<IconArrowUpRight size={13} /></button></p>}
        <div className="v2p-training-steps"><span className="active"><IconBook2 size={15} />SOP 学习</span><IconArrowRight size={13} /><span className={current.status !== 'not_started' ? 'active' : ''}><IconClipboardCheck size={15} />情境演练</span><IconArrowRight size={13} /><span className={displayedAttempt ? 'active' : ''}><IconTargetArrow size={15} />反馈与复练</span></div>
        {document && <div className="v2p-sop-resource"><div><IconBook2 size={22} /><span><strong>{document.title}</strong><small>{document.version} · 自编演示资料</small></span></div><button className="v2-button secondary compact" onClick={() => openKnowledge({ knowledgeId: document.id })}>查看 SOP<IconArrowUpRight size={14} /></button><details className="v2p-sop-points"><summary>展开 SOP 学习要点</summary>{document.sections.map(section => <section key={section.id}><h4>{section.title}</h4><p>{section.content}</p></section>)}</details></div>}
        {!canTrain ? <div className="v2p-training-state"><IconShieldCheck size={27} /><h3>当前为管理者查看模式</h3><p>可查看任务与演练记录。切换为该员工身份后，可开始学习和提交演练。</p></div> : current.status === 'completed' ? <div className="v2p-training-state completed"><IconCircleCheck size={37} /><h3>{completedRetry && current.id === root.id ? '原任务已通过关联复练完成' : '学习与演练记录已保存'}</h3><p>{completedRetry && current.id === root.id ? '最终结果取自关联复练，首次失败记录仍保留在演练历史中。' : '本次结果已同步到培训进度，实际操作能力仍需主管验收。'}</p><button className="v2-button secondary" onClick={() => navigate({ page: 'dashboard' })}>返回工作台<IconArrowRight size={16} /></button></div> : current.status === 'needs_retry' ? <div className="v2p-training-state retry"><IconRefresh size={31} /><h3>{current.kind === 'retry' ? '继续本项复练' : '已生成针对性复练'}</h3><p>根据演练反馈补齐遗漏步骤，再次完成演练。复练通过后，原任务同步完成。</p><button className="v2-button primary" disabled={working || (current.kind !== 'retry' && !retry)} onClick={() => { const target = current.kind === 'retry' ? current : retry; if (target) start(target); }}>{pending === 'start' ? '正在开始…' : '开始复练'}<IconArrowRight size={16} /></button></div> : current.status === 'not_started' ? <div className="v2p-training-state"><IconSchool size={32} /><h3>先学习 SOP，再进入情境演练</h3><p>查看资料中的处置要求，开始学习后即可选择步骤并提交处理思路。</p><button className="v2-button primary" disabled={working} onClick={() => start(current)}>{pending === 'start' ? '正在开始…' : '开始学习'}<IconArrowRight size={16} /></button></div> : <form className="v2p-scenario" onSubmit={submit}><StatusBadge tone="blue">情境演练 · 固定规则评分</StatusBadge><h3>{data.trainingScenario.title}</h3><p>{data.trainingScenario.prompt}</p><fieldset><legend>你会采取哪些步骤？<small>可多选，请依据 SOP 判断。</small></legend><div className="v2p-scenario-options">{data.trainingScenario.steps.map((option, index) => <label className={`v2p-scenario-option ${selectedSteps.includes(option.id) ? 'checked' : ''}`} key={option.id}><input type="checkbox" aria-label={option.label} checked={selectedSteps.includes(option.id)} disabled={working} onChange={event => setSelectedSteps(old => event.target.checked ? [...old, option.id] : old.filter(id => id !== option.id))} /><span className="v2p-option-letter">{String.fromCharCode(65 + index)}</span><span><strong>{option.label}</strong><small>{option.description}</small></span></label>)}</div></fieldset><label className="v2-field"><span>补充处理思路 · 选填</span><textarea aria-label="演练说明" rows={3} value={note} maxLength={2000} disabled={working} onChange={event => setNote(event.target.value)} placeholder="请说明你的处置与交接思路…" /></label><div className="v2p-actions"><span className="v2p-caption">评分依据：{document?.version || '演示规则'}</span><button className="v2-button primary" disabled={working || !selectedSteps.length}>{pending === 'submit' ? '正在评分…' : '提交演练'}<IconCheck size={16} /></button></div></form>}
        {error && <p className="v2-form-error" role="alert">{error}</p>}
      </section>
      <aside className="v2-card v2p-training-feedback" aria-label="演练反馈与历史"><div className="v2-card-header"><div><h2>演练反馈</h2><p>结果关联具体任务与资料版本</p></div></div>{displayedAttempt ? <><div className={`v2p-feedback-score ${current.status === 'completed' ? 'passed' : ''}`}><strong>{displayedAttempt.score}<small>分</small></strong><h3>{current.status === 'completed' ? completedRetry && current.id === root.id ? '关联复练已达到要求' : '本次演练已达到要求' : '有步骤需要补齐'}</h3>{completedRetry && current.id === root.id && <StatusBadge tone="green">最终结果来自关联复练</StatusBadge>}</div><p className="v2p-feedback-text">{displayedAttempt.feedback}</p>{displayedAttempt.missing.length > 0 && <div className="v2p-missing-steps"><h4>本次遗漏</h4>{displayedAttempt.missing.map(id => <span key={id}>{data.trainingScenario.steps.find(item => item.id === id)?.label || id}</span>)}</div>}<button className="v2p-text-button" onClick={() => openKnowledge({ knowledgeId: current.knowledgeId, sectionId: 'sop-assessment' })}><IconBook2 size={14} />查看评分依据<IconArrowUpRight size={14} /></button></> : <div className="v2p-feedback-empty"><IconClipboardCheck size={30} /><h3>完成演练后查看反馈</h3><p>系统会记录分数、遗漏步骤和每次提交的处理思路。</p></div>}
        {history.length > 0 && <details className="v2p-attempt-history" open><summary>演练历史 · {history.length} 次</summary>{history.map(({ record, task, number }) => <article key={record.id}><div><StatusBadge tone={record.score === 100 ? 'green' : 'amber'}>{task.kind === 'retry' ? '复练' : '原任务'}第 {number} 次</StatusBadge><strong>{record.score} 分</strong></div><time>{timeLabel(record.createdAt)}</time><p>{record.feedback}</p>{record.note && <blockquote>{record.note}</blockquote>}</article>)}</details>}
      </aside>
    </div>}
  </div>;
}
