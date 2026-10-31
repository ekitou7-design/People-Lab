import { useEffect, useState } from 'react';
import { IconArrowRight, IconArrowUpRight, IconBook2, IconCalendar, IconCheck, IconChevronRight, IconClock, IconLink, IconMessageCircle, IconSchool, IconShieldCheck, IconSparkles, IconUserPlus, IconUsers } from '@tabler/icons-react';
import type { PageProps, NavigationTarget } from './types';
import { Avatar, PageHeader, StatusBadge, type Tone } from './ui';

interface WorkItem { id: string; person: string; title: string; detail: string; kind: string; status: string; tone: Tone; color?: string; reason: string; sources: string[]; target: NavigationTarget }
const stageLabels = { screening: '待筛选', interview: '待面试', decision: '待决策', hired: '已录用' };

export function DashboardPage({ data, navigate, openKnowledge, focus }: PageProps) {
  const [selectedId, setSelectedId] = useState('');
  const [production, setProduction] = useState('正在读取生产进度…');
  useEffect(() => {
    if (data.actor.role === 'employee') return;
    let active = true;
    Promise.all(['/api/v1/order2people/orders', '/api/v1/order2people/calculations', '/api/v1/skillbridge/cases'].map(async url => {
      const response = await fetch(url, { headers: { 'x-demo-actor': data.actor.id } });
      if (!response.ok) throw Error('生产进度暂未同步');
      return response.json();
    })).then(([orders, calculations, cases]) => {
      const latest = calculations.items.at(-1);
      const proposals = cases.items.flatMap((c: { proposals: { status: string; execution?: { status: string } }[] }) => c.proposals);
      if (active) setProduction(`${orders.items.length} 个订单；${latest ? latest.status === 'stale' ? '输入已变化，需要重新计算' : latest.totals.gapSeconds === null ? '输入待补充' : `最近缺口 ${latest.totals.gapSeconds / 3600}h` : '尚未计算'}；${proposals.filter((p: { status: string }) => p.status === 'hr_approved').length} 项已批准，${proposals.filter((p: { execution?: { status: string } }) => p.execution?.status === 'executed').length} 项已执行`);
    }).catch(error => { if (active) setProduction(error.message); });
    return () => { active = false; };
  }, [data, focus]);

  const [filter, setFilter] = useState('全部');
  const isHR = data.actor.role === 'hr';
  const isEmployee = data.actor.role === 'employee';
  const ownEmployee = data.employees.find(item => item.id === data.actor.employeeId);
  const roots = data.trainingTasks.filter(task => task.kind !== 'retry');
  const finished = roots.filter(task => task.status === 'completed');
  const pendingLeaves = data.leaves.filter(item => item.status === 'pending');
  const pendingOnboarding = data.onboardings.filter(item => item.status === 'pending');
  const openTickets = data.tickets.filter(item => item.status === 'open');
  const work: WorkItem[] = [];
  for (const onboarding of pendingOnboarding) {
    const employee = data.employees.find(item => item.id === onboarding.employeeId);
    if (employee) work.push({ id: onboarding.id, person: employee.name, title: '完成入职清单', detail: `${employee.positionTitle} · ${onboarding.items.filter(item => item.done).length}/${onboarding.items.length} 项已核验`, kind: '入职', status: '待入职', tone: 'blue', reason: 'HR 核验清单并确认实际入职后，员工档案生效，同时创建岗位必修与已确认的培养任务。', sources: ['入职清单与资料核验', `计划入职日期 · ${employee.joinDate}`], target: { page: 'onboarding', employeeId: employee.id } });
  }
  for (const leave of pendingLeaves) work.push({ id: leave.id, person: leave.employeeName, title: isEmployee ? '跟进请假申请' : '处理年假审批', detail: `${leave.date} · ${leave.days} 天`, kind: '员工服务', status: '待审批', tone: 'amber', reason: `${leave.employeeName}提交的请假事由：${leave.reason}。审批通过时会再次校验并扣减余额，拒绝需填写意见。`, sources: ['员工请假申请', '员工请假与审批制度'], target: { page: 'service', requestId: leave.id } });
  for (const ticket of openTickets) work.push({ id: ticket.id, person: ticket.employeeName, title: isHR ? '回复员工咨询' : '跟进人工咨询', detail: ticket.question, kind: '员工服务', status: '待回复', tone: 'purple', reason: '该问题缺少可直接回答的知识依据，已保留上下文并转交 HR 人工处理。', sources: ['员工咨询记录', ticket.question], target: { page: 'service', employeeId: ticket.employeeId } });
  for (const task of roots.filter(item => item.status !== 'completed')) {
    const employee = data.employees.find(item => item.id === task.employeeId);
    work.push({ id: task.id, person: employee?.name || '员工', title: task.status === 'needs_retry' ? '补齐遗漏步骤并复练' : '继续岗位培养', detail: task.title, kind: '培养', status: task.status === 'needs_retry' ? '待复练' : task.status === 'learning' ? '学习中' : '待学习', tone: task.status === 'needs_retry' ? 'amber' : 'blue', reason: task.attempts.at(-1)?.feedback || task.description, sources: ['岗位培养任务', data.knowledge.find(item => item.id === task.knowledgeId)?.title || '岗位 SOP'], target: { page: 'training', taskId: task.id, employeeId: task.employeeId } });
  }
  if (isHR) for (const candidate of data.candidates.filter(item => item.stage !== 'hired')) {
    const evidence = candidate.evidence.find(item => item.status === 'unverified') || candidate.evidence.find(item => item.status === 'gap') || candidate.evidence[0];
    const ability = data.position.abilities.find(item => item.id === evidence?.abilityId);
    work.push({ id: candidate.id, person: candidate.name, title: evidence?.status === 'gap' ? '确认培养需求' : `核实${ability?.name || '岗位证据'}`, detail: `${data.position.title} · ${evidence?.status === 'unverified' ? '简历证据待确认' : '推进岗位匹配核实'}`, kind: '招聘', status: stageLabels[candidate.stage], tone: evidence?.status === 'gap' ? 'amber' : 'blue', color: candidate.color, reason: evidence?.summary || candidate.summary, sources: [`简历 · ${candidate.resume.sections.find(item => item.id === evidence?.sectionId)?.title || '候选人经历'}`, `岗位能力模型 · ${ability?.name || data.position.title}`], target: { page: 'recruitment', candidateId: candidate.id, abilityId: evidence?.abilityId } });
  }
  const filters = ['全部', ...new Set(work.map(item => item.kind))];
  const filtered = filter === '全部' || !filters.includes(filter) ? work : work.filter(item => item.kind === filter);
  useEffect(() => { if (!filters.includes(filter)) setFilter('全部'); }, [filter, filters.join('|')]);
  const selected = filtered.find(item => item.id === selectedId) || filtered.find(item => item.id === (focus?.candidateId || focus?.taskId)) || filtered[0];
  useEffect(() => { setSelectedId(''); setFilter('全部'); }, [data.actor.id]);
  const metrics = isEmployee ? [
    { label: '可用年假', value: ownEmployee?.leaveBalance || 0, suffix: '天', icon: IconCalendar, target: { page: 'service' as const } },
    { label: '待审批申请', value: pendingLeaves.length, suffix: '件', icon: IconMessageCircle, target: { page: 'service' as const } },
    { label: '待完成培养', value: roots.length - finished.length, suffix: '项', icon: IconSchool, target: { page: 'training' as const } },
    { label: '已完成培养', value: finished.length, suffix: '项', icon: IconCheck, target: { page: 'training' as const } },
  ] : [
    { label: isHR ? '候选人' : '团队在职', value: isHR ? data.candidates.length : data.employees.filter(item => item.status === 'active').length, suffix: '人', icon: IconUsers, target: { page: (isHR ? 'recruitment' : 'onboarding') as 'recruitment' | 'onboarding' } },
    { label: '待入职', value: pendingOnboarding.length, suffix: '人', icon: IconUserPlus, target: { page: 'onboarding' as const } },
    { label: '待处理事务', value: pendingLeaves.length + openTickets.length, suffix: '件', icon: IconMessageCircle, target: { page: 'service' as const } },
    { label: '已完成培养', value: finished.length, suffix: `/ ${roots.length}`, icon: IconSchool, target: { page: 'training' as const } },
  ];
  const sop = data.knowledge.find(item => item.id === 'sop-quality');
  function selectWork(item: WorkItem) {
    setSelectedId(item.id);
    navigate({ page: 'dashboard', ...(item.kind === '招聘' ? { candidateId: item.id } : { taskId: item.id }) });
  }
  return <div className="v2-dashboard-page">
    <PageHeader title="人才协同工作台" description={isEmployee ? '从当前任务出发，办理日常事务，继续岗位学习与演练。' : '从当前的人与任务出发，推进招聘、员工服务与岗位培养。'} actions={<span className="v2-date"><IconCalendar size={15} />{data.today.replaceAll('-', '.')}</span>} />
    {!isEmployee && <section className="v2-card"><h2>从订单识别能力缺口</h2><p>{production}</p><p>订单 → 缺口 → 人才路径 → 人工审核 → 执行反馈。无结果时先准备生产输入；批准与执行分别留痕。</p><button className="v2-button primary" onClick={() => navigate({ page: 'order2people' })}>开始生产需求诊断</button></section>}

    <div className="v2-metric-strip">{metrics.map(metric => <button key={metric.label} className="v2-metric-item" onClick={() => navigate(metric.target)}><div><span>{metric.label}</span><metric.icon size={18} /></div><strong>{metric.value}<small>{metric.suffix}</small></strong></button>)}</div>
    <div className="v2-dashboard-main"><section className="v2-card v2-priority-work"><div className="v2-card-header"><div><h2>现在需要推进</h2><p>选择一个人或事项，继续完成下一步</p></div><StatusBadge tone="blue">{work.length} 项可推进</StatusBadge></div>
      {isHR && <div className="v2-stage-track" aria-label="招聘与入职阶段">{[{ label: '筛选', count: data.candidates.filter(item => item.stage === 'screening').length, target: { page: 'recruitment' as const, stage: 'screening' as const } }, { label: '面试', count: data.candidates.filter(item => item.stage === 'interview').length, target: { page: 'recruitment' as const, stage: 'interview' as const } }, { label: '待决策', count: data.candidates.filter(item => item.stage === 'decision').length, target: { page: 'recruitment' as const, stage: 'decision' as const } }, { label: '入职', count: pendingOnboarding.length, target: { page: 'onboarding' as const } }].map(stage => <button key={stage.label} onClick={() => navigate(stage.target)}><span>{stage.label}</span><strong>{stage.count}</strong><IconChevronRight size={14} /></button>)}</div>}
      {work.some(item => item.kind !== '招聘') && <div className="v2-work-filters" role="group" aria-label="筛选待办类型">{filters.map(item => <button className={filter === item ? 'selected' : ''} aria-pressed={filter === item} key={item} onClick={() => { setFilter(item); setSelectedId(''); }}>{item}</button>)}</div>}
      <div className="v2-work-queue">{filtered.length ? filtered.map(item => <div key={item.id} className={`v2-task-row ${selected?.id === item.id ? 'selected' : ''}`}><button className="v2-task-select" aria-label={`选择事项：${item.person}·${item.title}`} aria-pressed={selected?.id === item.id} onClick={() => selectWork(item)}><Avatar name={item.person} color={item.color} /><span><strong>{item.person}<span> · </span>{item.title}</strong><small>{item.detail}</small></span></button><div className="v2-task-end"><StatusBadge tone={item.tone}>{item.status}</StatusBadge><button className="v2-button primary compact" onClick={() => navigate(item.target)}>继续处理<IconArrowRight size={14} /></button></div></div>) : <div className="v2-compact-empty"><IconCheck size={25} /><strong>当前事项已处理</strong><p>新的申请、咨询或培养任务会自动汇总到这里。</p><button className="v2-button secondary compact" onClick={() => navigate({ page: isEmployee ? 'service' : 'training' })}>查看{isEmployee ? '员工事务' : '培养记录'}<IconArrowRight size={14} /></button></div>}</div>
      <div className="v2-queue-note"><IconShieldCheck size={15} /><p>{data.employees.length ? '关键决定由人确认；业务执行结果持续写回同一份档案。' : '员工服务暂无待审批事项；确认入职后开放员工自助与正式培养任务。'}</p></div>
    </section>
    <aside className="v2-card v2-context-assistant" aria-label="当前事项助手"><div className="v2-card-header"><div><h2><IconSparkles size={18} />当前事项助手</h2><p>规则模拟 · 根据正在处理的人与任务提供依据</p></div></div>{selected ? <div className="v2-context-body"><StatusBadge tone="blue">岗位：{data.position.title}</StatusBadge><h3>{selected.person} · {selected.title}</h3><p>{selected.reason}</p><div className="v2-context-sources"><h4>依据来源</h4>{selected.sources.map((source, index) => <div key={index}><IconLink size={14} /><span>{source}</span></div>)}</div><button className="v2-button primary full" onClick={() => navigate(selected.target)}>{selected.kind === '招聘' ? '查看原文证据' : '继续处理当前事项'}<IconArrowUpRight size={15} /></button>{sop && <button className="v2-button secondary full" onClick={() => openKnowledge({ knowledgeId: sop.id })}><IconBook2 size={15} />打开岗位 SOP</button>}<div className="v2-context-rule"><IconShieldCheck size={15} /><span>{selected.kind === '招聘' ? '简历未写明的能力保留为待核实，不自动认定为能力缺陷。' : '摘要来自当前业务记录，不代替人工审批或岗位操作验收。'}</span></div></div> : <div className="v2-context-body"><StatusBadge tone="green">暂无待办</StatusBadge><h3>当前事项已处理</h3><p>选择新的业务事项后，这里会显示其依据与下一步操作。</p><button className="v2-button secondary full" onClick={() => navigate({ page: 'knowledge' })}>查看企业知识<IconBook2 size={15} /></button></div>}</aside></div>
    <section className="v2-card v2-activity-strip"><div><IconClock size={17} /><h2>最近业务动态</h2></div>{data.events.length ? <div className="v2-activity-items">{data.events.slice(0, 4).map(event => <div key={event.id}><strong>{event.title}</strong><small>{event.actorName} · {new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Shanghai' }).format(new Date(event.createdAt))}</small></div>)}</div> : <p>完成招聘、入职或员工事务后，执行记录会同步到这里。</p>}</section>
  </div>;
}

export default DashboardPage;
