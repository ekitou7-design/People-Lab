import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  IconArrowRight, IconArrowUpRight, IconBell, IconBook2, IconBriefcase,
  IconBuildingFactory2, IconCalendar, IconChartBar, IconCheck, IconChevronRight,
  IconCircleCheck, IconClock, IconFileText, IconLayoutDashboard, IconLink,
  IconListCheck, IconMenu2, IconMessageCircle, IconPlayerPlay, IconRefresh,
  IconSchool, IconSearch, IconSend, IconShieldCheck, IconSparkles,
  IconTargetArrow, IconUserPlus, IconUsers, IconX, IconAlertCircle,
} from '@tabler/icons-react';
import type { Bootstrap, Candidate, Citation, KnowledgeDocument, LeaveRequest, TrainingTask } from '../shared/contracts';
import { RecruitmentFunnel, RequestDonut, AbilityCoverage, HeadcountBars } from './components/DashboardCharts';
import { HrCopilot } from './components/HrCopilot';

type Page = 'dashboard' | 'recruitment' | 'onboarding' | 'service' | 'training' | 'knowledge';
type Tone = 'green' | 'amber' | 'blue' | 'gray' | 'red';
type Reference = { document: KnowledgeDocument; sectionId?: string; quote?: string };
const navigation = [
  { id: 'dashboard' as Page, name: '驾驶舱', icon: IconLayoutDashboard },
  { id: 'recruitment' as Page, name: '招聘工作台', icon: IconUsers },
  { id: 'onboarding' as Page, name: '入职管理', icon: IconUserPlus },
  { id: 'service' as Page, name: '员工服务', icon: IconMessageCircle },
  { id: 'training' as Page, name: '岗位培训', icon: IconSchool },
  { id: 'knowledge' as Page, name: '企业知识库', icon: IconBook2 },
];
const stages: Record<Candidate['stage'], string> = { screening: '待筛选', interview: '待面试', decision: '待决策', hired: '已录用' };
const evidenceLabels = { supported: '已有证据', unverified: '待核实', gap: '确认待提升' };
const periodLabels = { morning: '上午 · 0.5天', afternoon: '下午 · 0.5天', full: '全天 · 1天' };
const leaveLabels = { pending: '待审批', approved: '已批准', rejected: '已拒绝' };
const trainingLabels = { not_started: '待学习', learning: '学习中', needs_retry: '待复练', completed: '已完成' };
const roleLabels = { hr: 'HR 管理员', manager: '部门主管', employee: '员工' };

function Badge({ children, tone = 'gray' }: { children: ReactNode; tone?: Tone }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
function Avatar({ name, color = 'blue', small = false }: { name: string; color?: string; small?: boolean }) {
  const backgrounds: Record<string, string> = { violet: '#ece6f5', blue: '#e1ecf8', amber: '#fbefd8' };
  const foregrounds: Record<string, string> = { violet: '#78629c', blue: '#4d78a5', amber: '#99712e' };
  return <span className={`avatar ${small ? 'small' : ''}`} style={{ background: backgrounds[color] || '#e7eefb', color: foregrounds[color] || '#4d6b9a' }}>{name.slice(-2)}</span>;
}
function Empty({ title, description, children, icon = <IconUsers size={26} /> }: { title: string; description: string; children?: ReactNode; icon?: ReactNode }) {
  return <div className="empty-state"><div className="empty-icon">{icon}</div><h3>{title}</h3><p>{description}</p>{children}</div>;
}
function Modal({ title, label, onClose, children, drawer = false, subtitle, error }: { title: string; label: string; onClose: () => void; children: ReactNode; drawer?: boolean; subtitle?: string; error?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => { const element = ref.current; element?.showModal(); return () => { if (element?.open) element.close(); }; }, []);
  return <dialog ref={ref} aria-label={label} className={drawer ? 'modal drawer' : 'modal'} onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="modal-header"><div><span className="eyebrow">HRFLOW WORKSPACE</span><h2 id={id}>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-button" aria-label="关闭弹窗" onClick={onClose}><IconX size={20} /></button></div>
    <div className="modal-body">{children}{error && <p className="form-error" role="alert">{error}</p>}</div>
  </dialog>;
}
function SectionHeading({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return <div className="section-heading"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div>;
}
function timeLabel(value: string) {
  return new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Shanghai' }).format(new Date(value));
}

export default function App() {
  const [actorId, setActorId] = useState(() => localStorage.getItem('hrflow-demo-actor') || 'actor-hr');
  const [data, setData] = useState<Bootstrap | null>(null);
  const [page, setPage] = useState<Page>('dashboard');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [toast, setToast] = useState('');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [reference, setReference] = useState<Reference | null>(null);
  const [candidateId, setCandidateId] = useState('cand-chen');
  const [evidence, setEvidence] = useState<{ candidate: Candidate; sectionId: string; abilityName: string; quote: string } | null>(null);
  const [hireCandidate, setHireCandidate] = useState<Candidate | null>(null);
  const [confirmedNeeds, setConfirmedNeeds] = useState<string[]>([]);
  const [chat, setChat] = useState('');
  const [leaveFormOpen, setLeaveFormOpen] = useState(false);
  const [leaveDate, setLeaveDate] = useState('');
  const [leavePeriod, setLeavePeriod] = useState<'morning' | 'afternoon' | 'full'>('afternoon');
  const [leaveReason, setLeaveReason] = useState('');
  const [leavePreview, setLeavePreview] = useState(false);
  const [leaveKey, setLeaveKey] = useState('');
  const [rejectLeave, setRejectLeave] = useState<LeaveRequest | null>(null);
  const [rejection, setRejection] = useState('');
  const [approval, setApproval] = useState<LeaveRequest | null>(null);
  const [ticketReply, setTicketReply] = useState<Record<string, string>>({});
  const [trainingId, setTrainingId] = useState('');
  const [selectedSteps, setSelectedSteps] = useState<string[]>([]);
  const [trainingNote, setTrainingNote] = useState('');
  const [attemptKey, setAttemptKey] = useState('');
  const chatBottom = useRef<HTMLDivElement>(null);

  const request = useCallback(async <T,>(path: string, method = 'GET', body?: unknown, signal?: AbortSignal): Promise<T> => {
    const response = await fetch(path, { method, signal, headers: { 'Content-Type': 'application/json', 'x-demo-actor': actorId }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error?.message || '请求未完成，请稍后重试');
    return result as T;
  }, [actorId]);

  const refresh = useCallback(async () => {
    const next = await request<Bootstrap>('/api/bootstrap');
    setData(next);
    return next;
  }, [request]);

  useEffect(() => {
    const controller = new AbortController();
    setError('');
    request<Bootstrap>('/api/bootstrap', 'GET', undefined, controller.signal).then(next => {
      setData(next);
      if (!leaveDate) setLeaveDate(next.suggestedLeaveDate);
    }).catch(reason => {
      if (reason.name !== 'AbortError') {
        if (actorId !== 'actor-hr' && /身份|actor|用户|员工/i.test(reason.message)) {
          localStorage.setItem('hrflow-demo-actor', 'actor-hr');
          setActorId('actor-hr');
        } else setError(reason.message);
      }
    });
    return () => controller.abort();
  }, [request]);

  useEffect(() => { if (toast) { const timer = setTimeout(() => setToast(''), 4200); return () => clearTimeout(timer); } }, [toast]);
  useEffect(() => { chatBottom.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [data?.messages.length, page]);
  useEffect(() => { setSelectedSteps([]); setTrainingNote(''); setAttemptKey(crypto.randomUUID()); }, [trainingId, actorId]);

  async function act(key: string, path: string, body: unknown, success: string, method = 'POST') {
    if (busy) return false;
    setBusy(key); setError('');
    try { await request(path, method, body); await refresh(); setToast(success); return true; }
    catch (reason) { setError(reason instanceof Error ? reason.message : '操作未完成，请重试'); return false; }
    finally { setBusy(''); }
  }
  function go(next: Page) { setPage(next); setMobileMenu(false); setError(''); window.scrollTo({ top: 0 }); }
  function switchActor(next: string) {
    if (busy) return;
    localStorage.setItem('hrflow-demo-actor', next); setData(null); setActorId(next); setTrainingId('');
    setChat(''); setLeaveFormOpen(false); setLeavePreview(false); setError('');
    setReference(null); setEvidence(null); setHireCandidate(null); setRejectLeave(null); setApproval(null);
    setGuideOpen(false); setResetOpen(false); setPage('dashboard'); setMobileMenu(false); setToast('');
  }
  function cite(citation: Citation) {
    const document = data?.knowledge.find(item => item.id === citation.knowledgeId);
    if (document) setReference({ document, sectionId: citation.sectionId, quote: citation.quote });
  }

  if (!data) return <div className="boot-screen"><div className="brand-symbol"><IconBuildingFactory2 size={27} /></div><h1>HRFlow <span>AI</span></h1><p>{error || '正在连接人才协同工作台…'}</p>{error ? <button className="button primary" onClick={() => { setError(''); refresh().catch(reason => setError(reason.message)); }}>重新连接</button> : <div className="boot-loader" />}</div>;

  const isHR = data.actor.role === 'hr';
  const isEmployee = data.actor.role === 'employee';
  const employee = data.employees.find(item => item.id === data.actor.employeeId);
  const selectedCandidate = data.candidates.find(item => item.id === candidateId) || data.candidates[0];
  const currentTraining = data.trainingTasks.find(item => item.id === trainingId) || data.trainingTasks.find(item => item.status !== 'completed') || data.trainingTasks[0];
  const completedRetry = currentTraining && currentTraining.kind !== 'retry' && currentTraining.status === 'completed'
    ? data.trainingTasks.find(item => item.parentTaskId === currentTraining.id && item.status === 'completed') : undefined;
  const displayedAttempt = completedRetry?.attempts.at(-1) || currentTraining?.attempts.at(-1);
  const storylineName = data.candidates.find(item => item.id === 'cand-chen')?.name || data.employees.find(item => item.candidateId === 'cand-chen')?.name || '新同事';
  const tasks = data.trainingTasks.filter(item => item.kind !== 'retry');
  const visibleNavigation = navigation.filter(item => (item.id !== 'recruitment' || isHR) && (item.id !== 'onboarding' || !isEmployee));
  const todoCount = data.metrics.pendingOnboarding + data.metrics.pendingLeaves + data.metrics.openTickets;

  function openLeaveForm(message?: { date?: string; period?: 'morning' | 'afternoon' | 'full' }) {
    setLeaveDate(message?.date || data!.suggestedLeaveDate); setLeavePeriod(message?.period || 'afternoon');
    setLeaveFormOpen(true); setLeaveKey(crypto.randomUUID());
  }
  async function sendChat(event: FormEvent) {
    event.preventDefault();
    if (!chat.trim()) return;
    if (await act('chat', '/api/assistant', { message: chat.trim(), requestKey: crypto.randomUUID() }, '')) setChat('');
  }

  const pageDetails: Record<Page, { title: string; subtitle: string; label: string }> = {
    dashboard: { title: '人才协同驾驶舱', subtitle: '连接招聘、员工服务与岗位培养，关注需要你决策的下一步。', label: 'WORKSPACE OVERVIEW' },
    recruitment: { title: '招聘工作台', subtitle: '从岗位能力出发，让每一项招聘判断都有证据可循。', label: 'TALENT ACQUISITION' },
    onboarding: { title: '入职管理', subtitle: '把录用决定衔接为清晰的入职清单与岗位培养任务。', label: 'EMPLOYEE ONBOARDING' },
    service: { title: '员工服务', subtitle: isEmployee ? '制度有依据，事务有进度。你的日常人事助手。' : '集中处理员工申请与咨询，让每一件事务都有回应。', label: 'EMPLOYEE EXPERIENCE' },
    training: { title: '岗位培训', subtitle: '沿用岗位能力标准，从 SOP 学习走向情境演练与反馈。', label: 'LEARNING & DEVELOPMENT' },
    knowledge: { title: '企业知识库', subtitle: '制度、入职指引与岗位 SOP，为每一次回答提供可靠依据。', label: 'SHARED KNOWLEDGE' },
  };
  const displayDetails = pageDetails[page];

  return <div className="app-shell">
    {mobileMenu && <button className="sidebar-backdrop" aria-label="关闭导航" onClick={() => setMobileMenu(false)} />}
    <aside className={`sidebar ${mobileMenu ? 'is-open' : ''}`}>
      <a className="brand" href="#" onClick={event => { event.preventDefault(); go('dashboard'); }}><span className="brand-symbol"><IconBuildingFactory2 size={24} stroke={1.6} /></span><span>HRFlow <b>AI</b><small>企业人才协同平台</small></span></a>
      <div className="workspace-switch"><span className="workspace-mark">智</span><span>智造人才工作空间<small>Manufacturing workspace</small></span><IconChevronRight size={15} /></div>
      <div className="nav-caption">工作空间</div>
      <nav aria-label="主导航">{visibleNavigation.map(item => <button key={item.id} aria-label={item.name} className={`nav-item ${page === item.id ? 'active' : ''}`} onClick={() => go(item.id)}><item.icon size={20} stroke={1.7} /><span>{item.name}</span>{item.id === 'service' && todoCount > 0 && <span className="nav-count">{data.metrics.pendingLeaves + data.metrics.openTickets}</span>}{item.id === 'recruitment' && <small>{data.candidates.length}</small>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="agent-status"><span className="status-dot" /><div>三个 Agent，共享业务上下文<small>知识 · 档案 · 任务状态</small></div></div><button className="side-help" onClick={() => setGuideOpen(true)}><IconPlayerPlay size={17} /><span>查看演示路线</span><IconArrowUpRight size={16} /></button>{isHR && <button className="side-reset" onClick={() => setResetOpen(true)}><IconRefresh size={15} />重置演示数据</button>}<div className="sidebar-user"><Avatar name={data.actor.name} small /><div>{data.actor.name}<small>{roleLabels[data.actor.role]}</small></div><IconShieldCheck size={18} /></div></div>
    </aside>

    <div className="main-shell">
      <header className="topbar"><div className="breadcrumb"><button className="icon-button mobile-menu" aria-label="打开导航" onClick={() => setMobileMenu(true)}><IconMenu2 size={21} /></button><span>工作空间</span><IconChevronRight size={14} /><strong>{navigation.find(item => item.id === page)?.name}</strong></div><div className="topbar-actions"><span className="demo-chip"><span />本地演示</span><div className="topbar-divider" /><IconUsers size={17} className="actor-icon" /><select aria-label="切换演示身份" value={actorId} disabled={!!busy} onChange={event => switchActor(event.target.value)}>{data.actors.map(actor => <option key={actor.id} value={actor.id}>{actor.name} · {actor.title}</option>)}</select><Avatar name={data.actor.name} small /></div></header>
      <main className={`main-content ${page === 'dashboard' ? 'dashboard-content' : ''}`}>
        <div className="page-heading"><div><span className="eyebrow">{displayDetails.label}</span><h1>{displayDetails.title}</h1><p>{displayDetails.subtitle}</p></div><div className="page-heading-action"><span className="today"><IconCalendar size={16} />{data.today.replaceAll('-', '.')}</span><button className="button secondary compact" onClick={() => setGuideOpen(true)}><IconPlayerPlay size={16} />演示引导</button></div></div>
        {error && <div className="error-banner" role="alert"><IconAlertCircle size={19} /><span>{error}</span><button className="icon-button" aria-label="关闭错误提示" onClick={() => setError('')}><IconX size={16} /></button></div>}

        {page === 'dashboard' && <WorkspaceDashboard data={data} go={go} onCandidate={id => { setCandidateId(id); go('recruitment'); }} showGuide={() => setGuideOpen(true)} />}

        {page === 'recruitment' && (!isHR ? <Empty title="招聘数据由 HR 管理" description="请切换为 HR 演示身份查看候选人档案。" /> : <>
          <section className="position-strip"><div className="position-icon"><IconBriefcase size={24} stroke={1.6} /></div><div><div className="inline-title"><h2>{data.position.title}</h2><Badge tone="green">招聘中</Badge></div><p>{data.position.department} <span>·</span> {data.position.location} <span>·</span> 计划招聘 {data.position.headcount} 人</p></div><div className="position-pay"><strong>{data.position.salaryRange}</strong><small>演示岗位薪资范围</small></div><button className="button secondary compact" onClick={() => { const doc = data.knowledge.find(item => item.id === 'sop-quality'); if (doc) setReference({ document: doc }); }}><IconBook2 size={16} />岗位 SOP</button></section>
          <div className="section-heading candidate-heading"><div><h2>候选人概览 <span className="heading-count">{data.candidates.length}</span></h2><p>选择候选人查看原文证据与面试核实建议</p></div><Badge tone="gray">规则模拟分析 · HR 最终决策</Badge></div>
          <div className="candidate-grid">{data.candidates.map(candidate => <button className={`candidate-card ${selectedCandidate?.id === candidate.id ? 'selected' : ''}`} key={candidate.id} aria-label={`查看${candidate.name}档案`} onClick={() => setCandidateId(candidate.id)}><div className="candidate-card-top"><Avatar name={candidate.name} color={candidate.color} /><div><h3>{candidate.name}</h3><p>{candidate.experience}</p></div><Badge tone={candidate.stage === 'hired' ? 'green' : candidate.stage === 'decision' ? 'amber' : 'gray'}>{stages[candidate.stage]}</Badge></div><p className="candidate-summary">{candidate.summary}</p><div className="candidate-card-bottom"><span>{candidate.education}</span><IconArrowUpRight size={17} /></div></button>)}</div>
          <section className="panel comparison-panel"><SectionHeading title="按岗位能力对比" subtitle="“未写明”表示待核实，不直接认定为能力不足" /><div className="table-scroll"><table className="comparison-table"><thead><tr><th>岗位能力 / 任职要求</th>{data.candidates.map(candidate => <th key={candidate.id}><span className="table-person"><Avatar name={candidate.name} color={candidate.color} small />{candidate.name}</span></th>)}</tr></thead><tbody>{data.position.abilities.map(ability => <tr key={ability.id}><th><strong>{ability.name}</strong><small>{ability.requirement}</small></th>{data.candidates.map(candidate => { const item = candidate.evidence.find(item => item.abilityId === ability.id); return <td key={candidate.id}>{item && <button className="evidence-cell" onClick={() => { setCandidateId(candidate.id); setEvidence({ candidate, sectionId: item.sectionId, abilityName: ability.name, quote: item.quote }); }}><Badge tone={item.status === 'supported' ? 'green' : item.status === 'gap' ? 'amber' : 'gray'}>{evidenceLabels[item.status]}</Badge><span>{item.summary}</span><small>查看原文 <IconArrowUpRight size={12} /></small></button>}</td>; })}</tr>)}</tbody></table></div></section>
          {selectedCandidate && <div className="recruitment-columns"><section className="panel candidate-detail"><SectionHeading title={`${selectedCandidate.name} · 能力证据`} subtitle="点击原文，查看结论对应的简历片段" action={<Avatar name={selectedCandidate.name} color={selectedCandidate.color} small />} /><div className="evidence-list">{selectedCandidate.evidence.map(item => { const ability = data.position.abilities.find(ability => ability.id === item.abilityId); return <div className="evidence-row" key={item.abilityId}><div className="evidence-row-title"><strong>{ability?.name}</strong><Badge tone={item.status === 'supported' ? 'green' : item.status === 'gap' ? 'amber' : 'gray'}>{evidenceLabels[item.status]}</Badge></div><p>{item.summary}</p><button className="text-button" aria-label={`查看原文证据：${ability?.name}`} onClick={() => setEvidence({ candidate: selectedCandidate, sectionId: item.sectionId, abilityName: ability?.name || '', quote: item.quote })}><IconFileText size={15} />查看原文证据<IconArrowUpRight size={13} /></button></div>; })}</div></section><section className="panel interview-panel"><SectionHeading title="面试核实提纲" subtitle="围绕证据缺口，提出可验证的问题" action={<IconSparkles size={19} />} /><ol className="interview-list">{selectedCandidate.interviewQuestions.map((question, index) => <li key={index}><span>{String(index + 1).padStart(2, '0')}</span><p>{question}</p></li>)}</ol><div className="decision-box"><div><IconShieldCheck size={19} /><strong>由 HR 确认招聘决定</strong></div><p>录用时可人工确认培养需求，简历未提及的能力不会自动变成补课任务。</p><div className="decision-actions"><select aria-label="招聘阶段" value={selectedCandidate.stage === 'hired' ? 'decision' : selectedCandidate.stage} disabled={!!busy || selectedCandidate.stage === 'hired'} onChange={event => act('stage', `/api/candidates/${selectedCandidate.id}/stage`, { stage: event.target.value }, '招聘阶段已更新')}><option value="screening">待筛选</option><option value="interview">待面试</option><option value="decision">待决策</option></select><button className="button primary" disabled={!!busy || selectedCandidate.stage === 'hired'} onClick={() => { setConfirmedNeeds([]); setHireCandidate(selectedCandidate); }}>{selectedCandidate.stage === 'hired' ? <><IconCheck size={16} />已确认录用</> : <>确认录用<IconArrowRight size={16} /></>}</button></div></div></section></div>}
        </>)}

        {page === 'onboarding' && <>
          <div className="notice"><IconLink size={19} /><span>招聘确认录用后生成待入职档案；完成清单并确认入职，才会开放员工服务与正式培训任务。</span></div>
          {!data.onboardings.length ? <section className="panel"><Empty title="还没有待办理的入职" description="由 HR 在招聘工作台确认录用后，系统会自动建立入职清单。" icon={<IconUserPlus size={28} />}><button className="button primary" onClick={() => go('recruitment')}>前往招聘工作台<IconArrowRight size={16} /></button></Empty></section> : <div className="onboarding-grid">{data.onboardings.map(onboarding => { const person = data.employees.find(item => item.id === onboarding.employeeId); if (!person) return null; const done = onboarding.items.filter(item => item.done).length; return <section className="panel onboarding-card" key={onboarding.id}><div className="onboarding-person"><Avatar name={person.name} /><div><h2>{person.name}</h2><p>{person.positionTitle} · {person.department}</p></div><Badge tone={onboarding.status === 'completed' ? 'green' : 'blue'}>{onboarding.status === 'completed' ? '已入职' : '待入职'}</Badge></div><div className="onboarding-meta"><div><small>入职日期</small><strong>{person.joinDate}</strong></div><div><small>直属主管</small><strong>{person.managerName}</strong></div><div><small>入职清单</small><strong>{done} / {onboarding.items.length}</strong></div></div><div className="checklist">{onboarding.items.map(item => <label className={`checklist-row ${item.done ? 'checked' : ''}`} key={item.id}><input type="checkbox" aria-label={item.title} checked={item.done} disabled={!isHR || !!busy || onboarding.status === 'completed'} onChange={event => act('checklist', `/api/onboardings/${onboarding.id}`, { items: [{ id: item.id, done: event.target.checked }] }, '入职清单已更新', 'PATCH')} /><span><strong>{item.title}</strong><small>{item.done ? '已确认完成' : '等待 HR 核验并勾选'}</small></span>{item.done && <IconCircleCheck size={19} />}</label>)}</div><div className="onboarding-training"><IconSchool size={19} /><div><strong>入职后自动创建岗位培训</strong><p>岗位必修任务{person.confirmedNeeds.length ? `＋ ${person.confirmedNeeds.length} 项 HR 确认的培养需求` : '；未核实的能力不会自动生成补课任务'}</p></div></div>{onboarding.status === 'completed' ? <div className="success-inline"><IconCircleCheck size={18} />员工档案已生效，培训任务已创建一次</div> : <button className="button primary full" disabled={!isHR || !!busy || done !== onboarding.items.length} onClick={() => { if (confirm(`确认${person.name}已实际入职？完成后将创建正式培训任务。`)) act('onboarding', `/api/onboardings/${onboarding.id}/complete`, {}, '已确认入职，岗位培训任务已创建'); }}>确认入职<IconArrowRight size={17} /></button>}{onboarding.status === 'completed' && <button className="text-button onboarding-link" onClick={() => go('training')}>查看岗位培养任务<IconArrowUpRight size={15} /></button>}</section>; })}</div>}
        </>}

        {page === 'service' && <>
          {isEmployee && (!employee || employee.status !== 'active') ? <section className="panel"><Empty title="完成入职后开启员工服务" description="请由 HR 完成入职清单并确认入职，再切换为员工演示身份。" icon={<IconMessageCircle size={28} />} /></section> : isEmployee ? <div className="service-columns"><section className="panel chat-panel"><div className="chat-header"><span className="assistant-avatar"><IconSparkles size={22} /></span><div><h2>员工服务 Agent</h2><p>制度答疑 · 事务办理 · 进度查询</p></div><Badge tone="green">规则模拟 AI</Badge></div><div className="chat-messages"><div className="chat-welcome"><span className="welcome-icon"><IconMessageCircle size={24} /></span><h3>{employee?.name}，今天有什么可以帮你？</h3><p>我会根据演示制度回答，引用原文；需要办理事务时，会先请你确认。</p><div className="quick-questions">{['年假可以怎么申请？', '我的培训任务有哪些？', '帮我查询申请进度'].map(question => <button key={question} disabled={!!busy} onClick={() => act('chat', '/api/assistant', { message: question, requestKey: crypto.randomUUID() }, '')}>{question}<IconArrowUpRight size={14} /></button>)}</div></div>{data.messages.map(message => <div className={`chat-message ${message.role}`} key={message.id}>{message.role === 'assistant' && <span className="message-avatar"><IconSparkles size={16} /></span>}<div className="message-content"><div className="message-bubble">{message.content}</div>{message.citations.length > 0 && <div className="message-citations">{message.citations.map((citation, index) => { const doc = data.knowledge.find(item => item.id === citation.knowledgeId); return <button key={`${citation.sectionId}-${index}`} aria-label={`查看知识引用：${doc?.title || '制度原文'}`} onClick={() => cite(citation)}><IconBook2 size={13} />{doc?.title || '制度原文'}<IconArrowUpRight size={12} /></button>; })}</div>}{message.suggestedAction && <button className="button secondary compact suggested-action" onClick={() => openLeaveForm(message.suggestedAction!.prefill)}>填写请假申请<IconArrowRight size={14} /></button>}<time>{timeLabel(message.createdAt)}</time></div></div>)}{busy === 'chat' && <div className="assistant-thinking"><span /><span /><span /><small>正在检索演示制度…</small></div>}<div ref={chatBottom} /></div><form className="chat-compose" onSubmit={sendChat}><input aria-label="向员工服务助手提问" placeholder="问制度、办请假、查进度…" value={chat} onChange={event => setChat(event.target.value)} disabled={!!busy} /><button type="submit" aria-label="发送问题" disabled={!chat.trim() || !!busy}><IconSend size={19} /></button></form><p className="chat-disclaimer">回答来自演示知识库。无依据的问题将生成 HR 人工咨询工单。</p></section><div className="service-side"><section className="panel balance-card"><div className="balance-top"><span className="icon-tile"><IconCalendar size={21} /></span><Badge tone="green">员工自助</Badge></div><h2>我的可用年假</h2><div className="balance-value">{employee?.leaveBalance}<small>天</small></div><p>审批通过后扣减，待审批申请尚未扣减。</p><button className="button primary full" onClick={() => openLeaveForm()}>填写请假申请<IconArrowRight size={16} /></button></section><section className="panel"><SectionHeading title="我的申请" action={<Badge>{data.leaves.length} 条</Badge>} /><LeaveList leaves={data.leaves} /></section><section className="panel small-panel"><IconShieldCheck size={21} /><div><strong>办理前先确认</strong><p>申请需要本人提交，批准或拒绝由主管决定，所有状态可查询。</p></div></section></div></div> : <>
            <div className="service-summary"><div><span className="icon-tile"><IconCalendar size={23} /></span><strong>{data.metrics.pendingLeaves}<small>待审批请假</small></strong></div><div><span className="icon-tile amber"><IconMessageCircle size={23} /></span><strong>{data.metrics.openTickets}<small>待回复咨询</small></strong></div><div><span className="icon-tile"><IconCircleCheck size={23} /></span><strong>{data.metrics.approvedLeaves}<small>已批准请假</small></strong></div><p>切换为已入职员工身份<br />可体验问答和申请提交</p></div>
            <section className="panel"><SectionHeading title="请假申请与审批" subtitle="审批通过时校验并扣减余额，重复审批不会重复扣减" action={<Badge tone="blue">{roleLabels[data.actor.role]}</Badge>} />{!data.leaves.length ? <Empty title="还没有员工请假申请" description={data.metrics.activeEmployees ? '请切换为员工身份，在员工服务中提交一条请假申请。' : '先确认员工入职，再切换身份体验员工服务。'} icon={<IconCalendar size={26} />} /> : <div className="table-scroll"><table className="business-table"><thead><tr><th>申请人</th><th>请假时间</th><th>事由</th><th>申请状态</th><th>处理</th></tr></thead><tbody>{data.leaves.map(leave => <tr key={leave.id}><td><span className="table-person"><Avatar name={leave.employeeName} small /><strong>{leave.employeeName}</strong></span></td><td><strong>{leave.date}</strong><small>{periodLabels[leave.period]}</small></td><td className="reason-cell">{leave.reason}</td><td><Badge tone={leave.status === 'approved' ? 'green' : leave.status === 'rejected' ? 'red' : 'amber'}>{leaveLabels[leave.status]}</Badge></td><td>{leave.status === 'pending' ? <div className="table-actions"><button className="button primary compact" disabled={!!busy} onClick={() => setApproval(leave)}>批准申请</button><button className="button secondary compact" disabled={!!busy} onClick={() => { setRejectLeave(leave); setRejection(''); }}>拒绝申请</button></div> : <span className="muted">{leave.decisionReason || '审批已完成'}</span>}</td></tr>)}</tbody></table></div>}</section>
            <section className="panel ticket-panel"><SectionHeading title="人工咨询工单" subtitle="知识库没有依据的问题，由 HR 接管回复" />{!data.tickets.length ? <div className="quiet-empty horizontal"><IconMessageCircle size={22} /><p>暂无人工接管工单</p></div> : data.tickets.map(ticket => <div className="ticket" key={ticket.id}><div className="ticket-heading"><Avatar name={ticket.employeeName} small /><strong>{ticket.employeeName}</strong><span>{timeLabel(ticket.createdAt)}</span><Badge tone={ticket.status === 'open' ? 'amber' : 'green'}>{ticket.status === 'open' ? '待回复' : '已回复'}</Badge></div><p>{ticket.question}</p>{ticket.status === 'resolved' ? <div className="ticket-response"><IconCheck size={16} />{ticket.response}</div> : isHR ? <form onSubmit={event => { event.preventDefault(); act('ticket', `/api/tickets/${ticket.id}/resolve`, { response: ticketReply[ticket.id] || '' }, '咨询回复已保存'); }}><input aria-label={`回复${ticket.employeeName}的咨询`} placeholder="填写回复，确认后保存到工单" value={ticketReply[ticket.id] || ''} onChange={event => setTicketReply({ ...ticketReply, [ticket.id]: event.target.value })} required /><button className="button primary compact" disabled={!!busy}>回复工单</button></form> : <div className="muted">等待 HR 回复</div>}</div>)}</section>
          </>}
        </>}

        {page === 'training' && <>
          <div className="notice"><IconTargetArrow size={19} /><span>岗位必修＋HR 人工确认的培养需求。情境演练结果是学习证据，不替代实际岗位操作考核。</span></div>
          {!data.trainingTasks.length ? <section className="panel"><Empty title="员工入职后自动创建培训任务" description="岗位培养沿用招聘中的能力标准。先完成录用与入职，系统会分配必修学习任务。" icon={<IconSchool size={29} />}><button className="button primary" onClick={() => go(isHR ? 'onboarding' : 'dashboard')}>{isHR ? '前往入职管理' : '返回驾驶舱'}<IconArrowRight size={16} /></button></Empty></section> : <div className="training-layout"><aside className="panel training-task-list"><SectionHeading title={isEmployee ? '我的培养任务' : '岗位培养任务'} action={<Badge>{tasks.length} 项</Badge>} />{data.trainingTasks.map(task => { const person = data.employees.find(item => item.id === task.employeeId); return <button className={`training-task ${currentTraining?.id === task.id ? 'selected' : ''}`} key={task.id} onClick={() => setTrainingId(task.id)}><div className="task-type"><span>{task.kind === 'retry' ? '针对性复练' : task.kind === 'development' ? '确认培养需求' : '岗位必修'}</span><Badge tone={task.status === 'completed' ? 'green' : task.status === 'needs_retry' ? 'amber' : 'gray'}>{trainingLabels[task.status]}</Badge></div><h3>{task.title}</h3><p>{person?.name} · {task.description}</p><div className="training-task-bottom"><IconBook2 size={14} /><span>{task.attempts.length ? `已提交 ${task.attempts.length} 次演练` : '学习 → 演练 → 反馈'}</span><IconChevronRight size={15} /></div></button>; })}</aside>{currentTraining && <section className="panel training-detail"><div className="training-detail-head"><div><span className="eyebrow">{currentTraining.kind === 'retry' ? 'FOCUSED PRACTICE' : 'POSITION LEARNING'}</span><h2>{currentTraining.title}</h2><p>{currentTraining.description}</p></div><Badge tone={currentTraining.status === 'completed' ? 'green' : 'blue'}>{trainingLabels[currentTraining.status]}</Badge></div><div className="learning-steps"><span className="done"><IconBook2 size={16} />学习 SOP</span><IconChevronRight size={15} /><span className={currentTraining.status !== 'not_started' ? 'done' : ''}><IconListCheck size={16} />情境演练</span><IconChevronRight size={15} /><span className={currentTraining.attempts.length ? 'done' : ''}><IconChartBar size={16} />反馈与复练</span></div><div className="sop-resource"><span className="resource-icon"><IconFileText size={24} /></span><div><strong>{data.knowledge.find(item => item.id === currentTraining.knowledgeId)?.title || '岗位操作 SOP'}</strong><p>学习指定流程后，完成下面的工作情境判断</p></div><button className="button secondary compact" onClick={() => { const document = data.knowledge.find(item => item.id === currentTraining.knowledgeId); if (document) setReference({ document }); }}>查看 SOP<IconArrowUpRight size={15} /></button></div>
              {displayedAttempt && <div className={`training-feedback ${currentTraining.status === 'completed' ? 'passed' : ''}`}><div className="feedback-score"><strong>{displayedAttempt.score}<small>分</small></strong><div><h3>{currentTraining.status === 'completed' ? (completedRetry ? '关联复练已达到要求' : '本次演练已达到要求') : '还有关键步骤需要补齐'}</h3><p>{displayedAttempt.feedback}</p></div></div>{displayedAttempt.missing.length > 0 && <div className="missing-list"><strong>本次遗漏</strong>{displayedAttempt.missing.map(item => <span key={item}><IconAlertCircle size={14} />{data.trainingScenario.steps.find(step => step.id === item)?.label || item}</span>)}</div>}<button className="text-button" onClick={() => { const document = data.knowledge.find(item => item.id === currentTraining.knowledgeId); if (document) setReference({ document }); }}><IconBook2 size={14} />查看评分依据<IconArrowUpRight size={13} /></button></div>}
              {isEmployee && currentTraining.employeeId === employee?.id ? currentTraining.status === 'completed' ? <div className="completed-training"><IconCircleCheck size={40} stroke={1.4} /><h3>学习与演练记录已保存</h3><p>本次结果已同步到岗位培养进度，实际操作能力仍需主管按企业要求验收。</p><button className="button secondary" onClick={() => go('dashboard')}>查看协同进度<IconArrowRight size={16} /></button></div> : currentTraining.status === 'needs_retry' ? <div className="retry-callout"><IconRefresh size={27} /><div><h3>已生成一项针对性复练</h3><p>复习遗漏步骤，再完成一次完整演练。通过后会同步完成原任务。</p></div><button className="button primary" disabled={!!busy} onClick={async () => { const retry = currentTraining.kind === 'retry' ? currentTraining : data.trainingTasks.find(task => task.parentTaskId === currentTraining.id); if (retry && await act('training-start', `/api/training/${retry.id}/start`, {}, '已开始针对性复练')) setTrainingId(retry.id); }}>开始复练<IconArrowRight size={16} /></button></div> : <>
                {currentTraining.status === 'not_started' ? <div className="start-learning"><IconSchool size={30} stroke={1.5} /><h3>准备好开始岗位训练了吗？</h3><p>先阅读 SOP，再根据情境选择处理步骤并说明判断。</p><button className="button primary" disabled={!!busy} onClick={async () => { if (await act('training-start', `/api/training/${currentTraining.id}/start`, {}, '学习已开始')) setTrainingId(currentTraining.id); }}>开始学习<IconArrowRight size={16} /></button></div> : <form className="scenario" onSubmit={async event => { event.preventDefault(); if (await act('training-submit', `/api/training/${currentTraining.id}/submit`, { selectedSteps, note: trainingNote, requestKey: attemptKey || crypto.randomUUID() }, '演练已评分，反馈与培养进度已更新')) { setTrainingId(currentTraining.id); setAttemptKey(crypto.randomUUID()); } }}><div className="scenario-heading"><Badge tone="blue">情境演练</Badge><h3>{data.trainingScenario.title}</h3><p>{data.trainingScenario.prompt}</p></div><fieldset><legend>你会采取哪些步骤？<small>可多选，请根据 SOP 判断</small></legend><div className="scenario-options">{data.trainingScenario.steps.map((step, index) => <label className={`scenario-option ${selectedSteps.includes(step.id) ? 'checked' : ''}`} key={step.id}><input type="checkbox" aria-label={step.label} checked={selectedSteps.includes(step.id)} onChange={event => setSelectedSteps(event.target.checked ? [...selectedSteps, step.id] : selectedSteps.filter(item => item !== step.id))} /><span className="option-letter">{String.fromCharCode(65 + index)}</span><span><strong>{step.label}</strong><small>{step.description}</small></span></label>)}</div></fieldset><label className="field"><span>补充你的处理思路 <small>选填</small></span><textarea aria-label="演练说明" placeholder="例如：先控制不合格品，再补齐记录并跟进处理结果…" value={trainingNote} onChange={event => setTrainingNote(event.target.value)} rows={3} /></label><div className="scenario-submit"><p><IconShieldCheck size={15} />按固定演示规则评分，结果可追溯</p><button className="button primary" disabled={!!busy || !selectedSteps.length}>{busy === 'training-submit' ? '正在评分…' : '提交演练'}<IconArrowRight size={16} /></button></div></form>}
              </> : <div className="manager-training-note"><IconShieldCheck size={22} /><div><strong>当前为管理者查看模式</strong><p>切换为该员工身份，可完成 SOP 学习和情境演练。管理端可查看任务状态、每次评分与待提升项。</p></div></div>}
              {currentTraining.attempts.length > 0 && <details className="attempt-history"><summary>查看演练历史（{currentTraining.attempts.length}次）</summary>{[...currentTraining.attempts].reverse().map(attempt => <div key={attempt.id}><strong>{attempt.score}分</strong><span>{timeLabel(attempt.createdAt)}</span><p>{attempt.feedback}</p>{attempt.note && <blockquote>{attempt.note}</blockquote>}</div>)}</details>}
          </section>}</div>}
        </>}

        {page === 'knowledge' && <>
          <div className="knowledge-summary"><span className="knowledge-symbol"><IconBook2 size={30} stroke={1.5} /></span><div><h2>共享知识，让回答与执行有据可依</h2><p>三个 Agent 共用制度、岗位与 SOP，回答携带出处，办理遵循规则。</p></div><Badge tone="green">{data.knowledge.length} 份已发布资料</Badge></div><div className="knowledge-grid">{data.knowledge.map(document => <button className="panel knowledge-card" key={document.id} onClick={() => setReference({ document })}><div className="knowledge-card-top"><span className="resource-icon"><IconFileText size={24} /></span><Badge>{document.category}</Badge></div><h2>{document.title}</h2><p>{document.summary}</p><div className="document-meta"><span>{document.version}</span><span>{document.sections.length} 个章节</span></div><div className="knowledge-card-bottom"><span>生效 {document.effectiveDate}</span><span>阅读全文<IconArrowUpRight size={15} /></span></div></button>)}</div><div className="notice"><IconShieldCheck size={19} /><span>以上文件均为团队编制的演示资料，不代表命题企业的真实制度。知识引用与岗位训练使用相同文档版本。</span></div>
        </>}

        <footer className="app-footer"><span><IconBuildingFactory2 size={14} /> HRFlow AI · 人才协同工作空间</span><span>虚构数据 · 规则模拟 AI · 无真实外部操作</span></footer>
      </main>
    </div>

    {toast && <div className="toast" role="status"><IconCircleCheck size={19} />{toast}</div>}
    {busy && <div className="request-progress" role="status" aria-label="正在保存业务数据" />}

    {reference && <Modal title={reference.document.title} label="知识引用" drawer onClose={() => setReference(null)} subtitle={`${reference.document.version} · 生效 ${reference.document.effectiveDate}`}><div className="document-source"><IconShieldCheck size={17} /><span>{reference.document.sourceLabel}</span><Badge>{reference.document.category}</Badge></div>{reference.quote && <blockquote className="reference-quote"><IconLink size={17} /><p>{reference.quote}</p></blockquote>}<p className="document-intro">{reference.document.summary}</p><div className="document-sections">{reference.document.sections.map(section => <section className={section.id === reference.sectionId ? 'highlighted-section' : ''} key={section.id}><div>{section.id === reference.sectionId && <Badge tone="green">当前引用</Badge>}<h3>{section.title}</h3></div><p>{section.content}</p></section>)}</div><div className="document-footer"><IconFileText size={17} />全文来自演示资料，引用保持文档版本与章节关联。</div></Modal>}
    {evidence && <Modal title={`${evidence.candidate.name} · 简历原文`} label="原文证据" drawer onClose={() => setEvidence(null)} subtitle={`当前核实能力：${evidence.abilityName}`}><div className="evidence-source"><Avatar name={evidence.candidate.name} color={evidence.candidate.color} /><div><strong>{evidence.candidate.name}</strong><p>{evidence.candidate.education} · {evidence.candidate.experience}</p></div><Badge tone="gray">虚构演示简历</Badge></div><blockquote className="reference-quote"><IconLink size={17} /><p>{evidence.quote || '该能力在当前简历中没有充分证据，需要通过面试进一步核实。'}</p></blockquote><div className="document-sections">{evidence.candidate.resume.sections.map(section => <section className={section.id === evidence.sectionId ? 'highlighted-section' : ''} key={section.id}>{section.id === evidence.sectionId && <Badge tone="green">证据来源章节</Badge>}<h3>{section.title}</h3><p>{section.content}</p></section>)}</div><div className="document-footer"><IconShieldCheck size={17} />简历证据不足时标记待核实，由 HR 通过面试确认。</div></Modal>}
    {hireCandidate && <Modal title={`确认录用${hireCandidate.name}`} label="确认录用候选人" error={error} onClose={() => setHireCandidate(null)} subtitle={`${data.position.title} · ${data.position.department}`}><div className="notice"><IconUserPlus size={20} /><span>确认后创建待入职档案与清单，员工实际入职后才会开放正式任务。</span></div><fieldset className="needs-fieldset"><legend>人工确认的培养需求 <small>可不选</small></legend><p>仅选择已经通过面试等方式核实、需要安排培养的能力。简历未写明的项目不会自动勾选。</p>{data.position.abilities.map(ability => <label className="need-option" key={ability.id}><input type="checkbox" aria-label={ability.name} checked={confirmedNeeds.includes(ability.id)} onChange={event => setConfirmedNeeds(event.target.checked ? [...confirmedNeeds, ability.id] : confirmedNeeds.filter(item => item !== ability.id))} /><span><strong>{ability.name}</strong><small>{ability.requirement}</small></span></label>)}</fieldset><div className="modal-actions"><button className="button secondary" onClick={() => setHireCandidate(null)}>暂不录用</button><button className="button primary" disabled={!!busy} onClick={async () => { if (await act('hire', `/api/candidates/${hireCandidate.id}/hire`, { confirmedNeeds }, `${hireCandidate.name}已录用，待入职档案已创建`)) { setHireCandidate(null); go('onboarding'); } }}>{busy === 'hire' ? '正在保存…' : '确认录用'}<IconCheck size={16} /></button></div></Modal>}
    {leaveFormOpen && <Modal title="填写请假申请" label="填写请假申请" error={error} onClose={() => { setLeaveFormOpen(false); setLeavePreview(false); }} subtitle="本演示支持单个工作日的年假申请"><form onSubmit={event => { event.preventDefault(); setLeavePreview(true); }}><div className="form-balance"><span>当前可用年假</span><strong>{employee?.leaveBalance} 天</strong></div><label className="field"><span>请假日期</span><input type="date" aria-label="请假日期" value={leaveDate} min={data.today} onChange={event => setLeaveDate(event.target.value)} required /></label><label className="field"><span>请假时段</span><select aria-label="请假时段" value={leavePeriod} onChange={event => setLeavePeriod(event.target.value as typeof leavePeriod)}><option value="morning">上午 · 0.5天</option><option value="afternoon">下午 · 0.5天</option><option value="full">全天 · 1天</option></select></label><label className="field"><span>请假事由</span><textarea aria-label="请假事由" value={leaveReason} onChange={event => setLeaveReason(event.target.value)} rows={3} placeholder="请简要填写请假原因" required /></label><div className="form-help"><IconShieldCheck size={16} />提交前可预览，审批通过后才扣减余额。周末、过去日期及重叠申请会被系统拒绝。</div><div className="modal-actions"><button type="button" className="button secondary" onClick={() => setLeaveFormOpen(false)}>取消</button><button className="button primary" disabled={!!busy}>预览申请<IconArrowRight size={16} /></button></div></form></Modal>}
    {leavePreview && <Modal title="请假申请预览" label="请假申请预览" onClose={() => setLeavePreview(false)} subtitle="请核对后提交给直属主管审批"><div className="preview-summary"><span className="icon-tile"><IconCalendar size={25} /></span><div><h3>{employee?.name}的年假申请</h3><p>{data.position.department} · {employee?.managerName}审批</p></div></div><dl className="preview-fields"><div><dt>请假日期</dt><dd>{leaveDate}</dd></div><div><dt>时段 / 天数</dt><dd>{periodLabels[leavePeriod]}</dd></div><div><dt>请假事由</dt><dd>{leaveReason}</dd></div><div><dt>预计剩余年假</dt><dd>{Math.max(0, (employee?.leaveBalance || 0) - (leavePeriod === 'full' ? 1 : 0.5))} 天 <small>以审批结果为准</small></dd></div></dl><div className="modal-actions"><button className="button secondary" onClick={() => setLeavePreview(false)}>返回修改</button><button className="button primary" disabled={!!busy} onClick={async () => { if (await act('leave', '/api/leaves', { date: leaveDate, period: leavePeriod, reason: leaveReason, requestKey: leaveKey }, '请假申请已提交，等待主管审批')) { setLeavePreview(false); setLeaveFormOpen(false); setLeaveReason(''); } }}>{busy === 'leave' ? '正在提交…' : '提交申请'}<IconCheck size={16} /></button></div>{error && <p className="form-error" role="alert">{error}</p>}</Modal>}
    {approval && <Modal title="批准请假申请" label="批准请假申请" onClose={() => setApproval(null)}><div className="approval-summary"><IconCalendar size={29} /><h3>{approval.employeeName} · {approval.days} 天年假</h3><p>{approval.date} · {periodLabels[approval.period]}</p><blockquote>{approval.reason}</blockquote></div><div className="notice"><IconShieldCheck size={18} /><span>批准时系统会再次校验余额，并扣减一次。</span></div><div className="modal-actions"><button className="button secondary" onClick={() => setApproval(null)}>取消</button><button className="button primary" disabled={!!busy} onClick={async () => { if (await act('approve', `/api/leaves/${approval.id}/decision`, { decision: 'approved' }, '已批准申请，余额已更新')) setApproval(null); }}>批准申请<IconCheck size={16} /></button></div>{error && <p className="form-error" role="alert">{error}</p>}</Modal>}
    {rejectLeave && <Modal title="拒绝请假申请" label="拒绝请假申请" error={error} onClose={() => setRejectLeave(null)} subtitle={`${rejectLeave.employeeName} · ${rejectLeave.date}`}><form onSubmit={async event => { event.preventDefault(); if (await act('reject', `/api/leaves/${rejectLeave.id}/decision`, { decision: 'rejected', reason: rejection }, '申请已拒绝，意见已保留')) setRejectLeave(null); }}><label className="field"><span>拒绝原因 <small>必填，将反馈给员工</small></span><textarea aria-label="拒绝原因" rows={4} value={rejection} onChange={event => setRejection(event.target.value)} placeholder="请说明原因或建议的调整方式" required /></label><div className="modal-actions"><button className="button secondary" type="button" onClick={() => setRejectLeave(null)}>取消</button><button className="button danger" disabled={!!busy || !rejection.trim()}>拒绝申请</button></div></form></Modal>}
    {guideOpen && <Modal title="用一位新同事，走通人才协同" label="演示路线" onClose={() => setGuideOpen(false)} subtitle={`建议主线：质量检验员 · ${storylineName}`}><div className="guide-list">{[{ title: '验证招聘证据', text: `以 HR 身份对比三份简历，查看${storylineName}的原文证据与面试提纲。`, page: 'recruitment' as Page }, { title: '确认录用与培养需求', text: 'HR 决策录用，明确已核实的培养需求，生成待入职档案。', page: 'recruitment' as Page }, { title: '完成入职清单', text: '勾选已核验的入职事项，确认实际入职，自动创建岗位训练。', page: 'onboarding' as Page }, { title: '员工提问并提交申请', text: `切换为${storylineName}，查看制度引用、填写请假，再切换主管审批。`, page: 'service' as Page }, { title: '岗位演练与针对性复练', text: '切回员工，学习 SOP、提交演练，补齐遗漏项并完成复练。', page: 'training' as Page }, { title: '回到驾驶舱查看闭环', text: '查看招聘、审批与培养的真实状态和完整事件记录。', page: 'dashboard' as Page }].map((step, index) => <button key={index} onClick={() => { setGuideOpen(false); go(step.page); }}><span>{String(index + 1).padStart(2, '0')}</span><div><h3>{step.title}</h3><p>{step.text}</p></div><IconArrowUpRight size={17} /></button>)}</div><div className="form-help"><IconShieldCheck size={16} />身份切换仅用于演示，不代表真实账号登录或认证。</div></Modal>}
    {resetOpen && <Modal title="重置演示数据" label="重置演示数据" error={error} onClose={() => setResetOpen(false)} subtitle="清空本地业务记录，回到初始招聘状态"><div className="reset-warning"><IconRefresh size={29} /><p>本次录用、入职、请假、咨询、培训和业务动态将被清空。三份虚构候选人档案与演示知识资料会重新载入。</p></div><div className="modal-actions"><button className="button secondary" onClick={() => setResetOpen(false)}>保留当前数据</button><button className="button danger" disabled={!!busy} onClick={async () => { if (await act('reset', '/api/demo/reset', { confirm: 'RESET' }, '演示数据已重置')) { setResetOpen(false); setTrainingId(''); setCandidateId('cand-chen'); go('dashboard'); } }}>确认重置</button></div></Modal>}
  </div>;
}

function LeaveList({ leaves }: { leaves: LeaveRequest[] }) {
  if (!leaves.length) return <div className="quiet-empty"><IconCalendar size={24} /><p>尚未提交请假申请</p><small>申请后可在这里追踪审批状态</small></div>;
  return <div className="personal-leave-list">{leaves.map(leave => <div className="personal-leave" key={leave.id}><div><strong>{leave.date}</strong><Badge tone={leave.status === 'approved' ? 'green' : leave.status === 'rejected' ? 'red' : 'amber'}>{leaveLabels[leave.status]}</Badge></div><p>{periodLabels[leave.period]} · {leave.reason}</p>{leave.decisionReason && <small>审批意见：{leave.decisionReason}</small>}</div>)}</div>;
}

function WorkspaceDashboard({ data, go, onCandidate, showGuide }: {
  data: Bootstrap; go: (page: Page) => void; onCandidate: (id: string) => void; showGuide: () => void;
}) {
  const [showAllEvents, setShowAllEvents] = useState(false);
  const isHR = data.actor.role === 'hr';
  const isEmployee = data.actor.role === 'employee';
  const ownEmployee = data.employees.find(item => item.id === data.actor.employeeId);
  const rootTasks = data.trainingTasks.filter(item => item.kind !== 'retry');
  const pendingTasks = rootTasks.filter(item => item.status !== 'completed');
  const finishedTasks = rootTasks.filter(item => item.status === 'completed');
  const pendingOnboardings = data.onboardings.filter(item => item.status === 'pending');
  const pendingLeaves = data.leaves.filter(item => item.status === 'pending');
  const openTickets = data.tickets.filter(item => item.status === 'open');
  const pendingCount = pendingOnboardings.length + pendingLeaves.length + openTickets.length;
  const showRecruitingSuggestions = isHR && pendingCount === 0 && !data.employees.length;
  const suggestedCandidates = data.candidates.filter(item => item.stage !== 'hired');
  const activeEmployees = data.employees.filter(item => item.status === 'active');
  const metricItems = isEmployee ? [
    { title: '我的可用年假', value: ownEmployee?.leaveBalance || 0, suffix: '天', detail: '审批通过后扣减余额', icon: IconCalendar, page: 'service' as Page },
    { title: '我的请假申请', value: data.leaves.length, suffix: '件', detail: `${pendingLeaves.length} 件等待审批`, icon: IconMessageCircle, page: 'service' as Page },
    { title: '待完成培训', value: pendingTasks.length, suffix: '项', detail: '含学习中与待复练任务', icon: IconSchool, page: 'training' as Page },
    { title: '已完成培训', value: finishedTasks.length, suffix: '项', detail: '按原始培养任务计数', icon: IconCircleCheck, page: 'training' as Page },
  ] : isHR ? [
    { title: '招聘候选人', value: data.candidates.length, suffix: '人', detail: `${data.candidates.filter(item => item.stage === 'hired').length} 人已确认录用`, icon: IconUsers, page: 'recruitment' as Page },
    { title: '待办理入职', value: pendingOnboardings.length, suffix: '人', detail: `${activeEmployees.length} 人已正式入职`, icon: IconUserPlus, page: 'onboarding' as Page },
    { title: '待处理员工事务', value: pendingLeaves.length + openTickets.length, suffix: '件', detail: `${pendingLeaves.length} 项审批 · ${openTickets.length} 条咨询`, icon: IconMessageCircle, page: 'service' as Page },
    { title: '岗位培训完成', value: finishedTasks.length, suffix: `/ ${rootTasks.length}`, detail: `${data.trainingTasks.filter(item => item.kind === 'retry' && item.status !== 'completed').length} 项复练待完成`, icon: IconSchool, page: 'training' as Page },
  ] : [
    { title: '团队在职员工', value: activeEmployees.length, suffix: '人', detail: '已确认实际入职的成员', icon: IconUsers, page: 'onboarding' as Page },
    { title: '团队待入职', value: pendingOnboardings.length, suffix: '人', detail: '跟进材料与入职清单', icon: IconUserPlus, page: 'onboarding' as Page },
    { title: '团队待处理事务', value: pendingLeaves.length + openTickets.length, suffix: '件', detail: `${pendingLeaves.length} 项审批 · ${openTickets.length} 条咨询`, icon: IconMessageCircle, page: 'service' as Page },
    { title: '团队培训完成', value: finishedTasks.length, suffix: `/ ${rootTasks.length}`, detail: `${pendingTasks.length} 项培养任务待完成`, icon: IconSchool, page: 'training' as Page },
  ];
  const events = showAllEvents ? data.events : data.events.slice(0, 4);

  return <div className="workspace-dashboard">
    <div className="dashboard-context"><div><span className="scope-tag">{isHR ? '企业视角' : isEmployee ? '我的工作空间' : '团队视角'}</span><span>{isEmployee ? `${ownEmployee?.positionTitle || data.position.title} · ${ownEmployee?.department || data.position.department}` : `${data.position.department} · ${data.position.title}`}</span></div><button onClick={showGuide}><IconLink size={14} />查看人才协同链路<IconChevronRight size={14} /></button></div>
    <div className="metric-grid">{metricItems.map((item, index) => <button className={`metric metric-tone-${index}`} key={item.title} onClick={() => go(item.page)}><div className="metric-top"><span>{item.title}</span><span className="metric-icon"><item.icon size={20} stroke={1.7} /></span></div><div className="metric-value">{item.value}<small>{item.suffix}</small></div><div className="metric-bottom"><span>{item.detail}</span><IconArrowUpRight size={15} /></div></button>)}</div>

    <div className="dashboard-grid">
      <section className="panel dashboard-panel funnel-panel"><SectionHeading title={isHR ? '招聘阶段概览' : isEmployee ? '我的培养概览' : '团队培养概览'} subtitle={isHR ? '从简历到录用，查看当前推进阶段' : '学习、演练与复练持续关联'} action={<button className="panel-link" aria-label={isHR ? '查看招聘详情' : '查看培训详情'} onClick={() => go(isHR ? 'recruitment' : 'training')}><IconArrowUpRight size={17} /></button>} /><div className="dashboard-chart">{isHR ? <RecruitmentFunnel candidates={data.candidates} /> : <div className="learning-overview"><div className="learning-overview-number"><strong>{finishedTasks.length}<small>/ {rootTasks.length}</small></strong><span>岗位培养任务完成</span><Badge tone="blue">{pendingTasks.length} 项待完成</Badge></div>{rootTasks.length ? rootTasks.slice(0, 3).map(task => <button className="learning-overview-row" key={task.id} onClick={() => go('training')}><span className={`task-state-icon ${task.status === 'completed' ? 'completed' : ''}`}>{task.status === 'completed' ? <IconCheck size={14} /> : <IconBook2 size={14} />}</span><strong>{task.title}</strong><Badge tone={task.status === 'completed' ? 'green' : task.status === 'needs_retry' ? 'amber' : 'gray'}>{trainingLabels[task.status]}</Badge></button>) : <div className="compact-empty"><IconSchool size={24} /><p>确认入职后，岗位培养任务将显示在这里。</p></div>}</div>}</div></section>

      <section className="panel dashboard-panel request-panel"><SectionHeading title={isEmployee ? '我的事务概览' : '员工事务概览'} subtitle="请假申请与人工咨询的当前记录" action={<button className="panel-link" aria-label="查看员工事务" onClick={() => go('service')}><IconArrowUpRight size={17} /></button>} /><div className="dashboard-chart"><RequestDonut leaves={data.leaves} tickets={data.tickets} /></div></section>

      <section className="panel dashboard-panel ability-panel"><SectionHeading title={isHR ? '岗位能力证据覆盖' : '岗位能力标准'} subtitle={isHR ? '哪些岗位要求已有简历证据支持' : '招聘与培养沿用同一套能力要求'} action={<IconTargetArrow size={18} />} /><div className="dashboard-chart">{isHR ? <AbilityCoverage position={data.position} candidates={data.candidates} /> : <div className="ability-standards">{data.position.abilities.map((ability, index) => <div key={ability.id}><span className={`ability-index ability-${index}`}>{String(index + 1).padStart(2, '0')}</span><div><strong>{ability.name}</strong><p>{ability.requirement}</p></div></div>)}</div>}</div></section>

      <section className="panel dashboard-panel tasks-panel"><SectionHeading title={showRecruitingSuggestions ? '招聘推进建议' : isEmployee ? '我的事务与待办' : '协同待办'} subtitle={showRecruitingSuggestions ? '核实简历证据，确认候选人的下一步' : isEmployee ? '及时跟进申请与培养任务' : '需要人工确认与推进的关键事项'} action={<Badge tone={showRecruitingSuggestions ? 'blue' : pendingCount ? 'amber' : 'gray'}>{showRecruitingSuggestions ? `${suggestedCandidates.length} 位待推进` : `${pendingCount} 项待处理`}</Badge>} /><div className="dashboard-todos">
        {pendingOnboardings.slice(0, 2).map(onboarding => { const person = data.employees.find(item => item.id === onboarding.employeeId); return <button className="dashboard-todo-row" key={onboarding.id} onClick={() => go('onboarding')}><span className="todo-icon blue"><IconUserPlus size={18} /></span><div><strong>{person?.name}的入职清单</strong><p>{onboarding.items.filter(item => item.done).length} / {onboarding.items.length} 项已确认</p></div><Badge tone="blue">待入职</Badge><IconChevronRight size={14} /></button>; })}
        {pendingLeaves.slice(0, 2).map(leave => <button className="dashboard-todo-row" key={leave.id} onClick={() => go('service')}><span className="todo-icon amber"><IconCalendar size={18} /></span><div><strong>{isEmployee ? '我的年假申请' : `${leave.employeeName}的年假申请`}</strong><p>{leave.date} · {leave.days} 天</p></div><Badge tone="amber">待审批</Badge><IconChevronRight size={14} /></button>)}
        {openTickets.slice(0, 1).map(ticket => <button className="dashboard-todo-row" key={ticket.id} onClick={() => go('service')}><span className="todo-icon purple"><IconMessageCircle size={18} /></span><div><strong>{ticket.employeeName}的咨询</strong><p>{ticket.question}</p></div><Badge tone="amber">待回复</Badge><IconChevronRight size={14} /></button>)}
        {showRecruitingSuggestions && <>{suggestedCandidates.map(candidate => <button className="dashboard-todo-row candidate-todo" key={candidate.id} onClick={() => onCandidate(candidate.id)}><Avatar name={candidate.name} color={candidate.color} small /><div><strong>{candidate.name}<span>招聘证据待核实</span></strong><p>{candidate.experience} · {data.position.title}</p></div><Badge tone={candidate.stage === 'decision' ? 'amber' : 'blue'}>{stages[candidate.stage]}</Badge><IconChevronRight size={14} /></button>)}<div className="todo-bottom-note"><IconShieldCheck size={14} />简历证据不足时标记待核实，由 HR 确认。</div></>}
        {!pendingCount && (!isHR || data.employees.length > 0) && <div className="compact-empty"><IconCircleCheck size={25} /><strong>当前事务已处理</strong><p>{pendingTasks.length ? `还有 ${pendingTasks.length} 项岗位培养任务可继续推进。` : '新申请、咨询与入职待办会自动汇总。'}</p><button className="text-button" onClick={() => go(pendingTasks.length ? 'training' : 'service')}>{pendingTasks.length ? '继续岗位培养' : '查看事务记录'}<IconArrowRight size={14} /></button></div>}
      </div></section>

      <section className="panel dashboard-panel headcount-panel"><SectionHeading title={isEmployee ? '我的员工档案' : '部门在职人数'} subtitle={isEmployee ? '已入职档案与培养任务关联' : '仅统计已确认正式入职的员工'} action={<IconUsers size={18} />} /><div className="dashboard-chart">{isEmployee && ownEmployee ? <div className="personal-profile"><div><Avatar name={ownEmployee.name} /><span><strong>{ownEmployee.name}</strong><small>{ownEmployee.positionTitle}</small></span><Badge tone="green">已入职</Badge></div><dl><div><dt>所属部门</dt><dd>{ownEmployee.department}</dd></div><div><dt>直属主管</dt><dd>{ownEmployee.managerName}</dd></div><div><dt>入职日期</dt><dd>{ownEmployee.joinDate}</dd></div><div><dt>确认培养需求</dt><dd>{ownEmployee.confirmedNeeds.length} 项</dd></div></dl></div> : <HeadcountBars employees={data.employees} />}</div></section>

      <HrCopilot data={data} onNavigate={go} />
    </div>

    <section className="panel recent-activity"><div className="activity-title"><div><h2>最新业务动态</h2><span>建议、决策与执行可追踪</span></div>{data.events.length > 4 && <button className="text-button" onClick={() => setShowAllEvents(!showAllEvents)}>{showAllEvents ? '收起动态' : `查看全部 ${data.events.length} 条`}<IconChevronRight size={14} /></button>}</div><div className={`activity-grid ${showAllEvents ? 'expanded' : ''}`}>{events.length ? events.map(event => <div className="activity-item" key={event.id}><span className="activity-dot" /><div><strong>{event.title}</strong><p title={event.detail}>{event.detail}</p><small>{event.actorName} · {timeLabel(event.createdAt)}</small></div></div>) : <div className="activity-empty"><IconClock size={17} />尚无业务操作，完成招聘或员工事务后会自动留下记录。</div>}</div></section>
  </div>;
}
