import { useEffect, useState } from 'react';
import { IconArrowUpRight, IconShieldCheck, IconSparkles } from '@tabler/icons-react';
import type { Bootstrap } from '../../shared/contracts';
import './hr-copilot.css';

type CopilotPage = 'dashboard' | 'recruitment' | 'onboarding' | 'service' | 'training' | 'knowledge';
type Intent = 'overview' | 'requests' | 'training';
interface Props { data: Bootstrap; onNavigate: (page: CopilotPage) => void }
interface Prompt { id: Intent; label: string; question: string }
interface Summary { text: string; detail: string; page: CopilotPage; action: string }

export function HrCopilot({ data, onNavigate }: Props) {
  const [selectedIntent, setSelectedIntent] = useState<Intent>('overview');
  useEffect(() => setSelectedIntent('overview'), [data.actor.id]);

  const role = data.actor.role;
  const employee = data.employees.find(person => person.id === data.actor.employeeId);
  const team = data.employees.filter(person => role === 'hr'
    || (role === 'manager' && person.managerId === data.actor.id)
    || (role === 'employee' && person.id === data.actor.employeeId));
  const teamIds = new Set(team.map(person => person.id));
  const leaves = data.leaves.filter(request => teamIds.has(request.employeeId));
  const roots = data.trainingTasks.filter(task => !task.parentTaskId && teamIds.has(task.employeeId));
  const pending = leaves.filter(request => request.status === 'pending').length;
  const approved = leaves.filter(request => request.status === 'approved').length;
  const rejected = leaves.filter(request => request.status === 'rejected').length;
  const completed = roots.filter(task => task.status === 'completed').length;
  const retry = roots.filter(task => task.status === 'needs_retry').length;
  const progress = roots.length ? Math.round(completed / roots.length * 100) : 0;

  const prompts: Prompt[] = [
    {
      id: 'overview',
      label: role === 'hr' ? '招聘进度' : role === 'manager' ? '团队入职' : '我的余额',
      question: role === 'hr' ? '招聘目前进展如何？' : role === 'manager' ? '团队入职办理进展如何？' : '我的年假还剩多少？',
    },
    { id: 'requests', label: role === 'employee' ? '我的申请' : '待审批事项', question: role === 'employee' ? '我的请假申请进展如何？' : '现在有哪些待审批事项？' },
    { id: 'training', label: role === 'hr' ? '培养进度' : role === 'manager' ? '团队培训' : '我的培训', question: role === 'employee' ? '我的岗位培训进展如何？' : '员工岗位培养进展如何？' },
  ];

  let summary: Summary;
  if (selectedIntent === 'training') {
    summary = roots.length ? {
      text: `${role === 'employee' ? '你' : '当前团队'}共有 ${roots.length} 项岗位培养任务，已完成 ${completed} 项，${retry} 项待复练；完成进度 ${progress}%。`,
      detail: '按原培训任务统计，关联复练不重复计数。演练记录不等同于实际操作资格。',
      page: 'training', action: role === 'employee' ? '继续岗位学习' : '查看培养任务',
    } : {
      text: role === 'employee' ? '你目前没有已分配的岗位培养任务。' : '当前还没有已分配的岗位培养任务。',
      detail: 'HR 确认员工正式入职后，系统分配岗位必修及已确认的发展任务。',
      page: 'training', action: '查看岗位培训',
    };
  } else if (selectedIntent === 'requests') {
    const openTickets = data.tickets.filter(ticket => ticket.status === 'open' && teamIds.has(ticket.employeeId)).length;
    summary = role === 'hr' ? {
      text: `当前有 ${pending} 件请假待审批、${openTickets} 条人工咨询待回复。`,
      detail: pending || openTickets ? '优先处理待办。批准请假时会再次校验余额，拒绝需填写原因。' : '当前待办已处理，进入员工服务可查看申请与答复记录。',
      page: 'service', action: '查看员工事务',
    } : {
      text: `${role === 'employee' ? '你的' : '团队的'}请假申请中，${pending} 件待审批，${approved} 件已批准，${rejected} 件已拒绝。`,
      detail: role === 'employee' ? '待审批申请尚未扣减余额，可在员工服务中查看具体日期和审批意见。' : pending ? '可进入员工服务审批团队申请，批准时重新校验可用余额。' : '当前没有待审批请假，可查看团队历史审批记录。',
      page: 'service', action: role === 'employee' ? '查看我的申请' : '查看团队审批',
    };
  } else if (role === 'hr') {
    const screening = data.candidates.filter(candidate => candidate.stage === 'screening').length;
    const interview = data.candidates.filter(candidate => candidate.stage === 'interview').length;
    const decision = data.candidates.filter(candidate => candidate.stage === 'decision').length;
    const hired = data.candidates.filter(candidate => candidate.stage === 'hired').length;
    summary = {
      text: `当前 ${data.candidates.length} 位候选人：${screening} 位待筛选、${interview} 位待面试、${decision} 位待决策，${hired} 位已录用。`,
      detail: decision ? '建议优先查看面试核实结果，推进人工录用决策。' : interview ? '建议结合简历原文，核实面试中的证据缺口。' : screening ? '建议先查看岗位匹配证据，再推进面试。' : '招聘记录可与入职档案继续关联，按实际状态推进。',
      page: 'recruitment', action: '查看招聘工作台',
    };
  } else if (role === 'manager') {
    const onboardings = data.onboardings.filter(record => teamIds.has(record.employeeId));
    const waiting = onboardings.filter(record => record.status === 'pending').length;
    const ready = onboardings.filter(record => record.status === 'pending' && record.items.every(item => item.done)).length;
    summary = {
      text: `团队当前 ${team.filter(person => person.status === 'active').length} 位员工在职，${waiting} 位待入职；其中 ${ready} 位入职清单已完成。`,
      detail: waiting ? '实际入职由 HR 确认，确认后自动开放员工服务与岗位培训。' : '新同事录用后，入职清单和办理进度会同步到这里。',
      page: 'onboarding', action: '查看团队入职',
    };
  } else {
    summary = employee ? {
      text: `你的当前可用年假为 ${employee.leaveBalance} 天，数据来自员工档案。`,
      detail: `有 ${pending} 件申请待审批。待审批不扣减，批准后按半天或全天扣减余额。`,
      page: 'service', action: '查看余额与申请',
    } : {
      text: '当前身份尚未关联在职员工档案，暂时无法读取假期余额。',
      detail: '请由 HR 完成入职确认，再查看员工服务与岗位任务。',
      page: 'service', action: '查看员工服务',
    };
  }

  return <section className="hc-card" aria-label="HR协同助手">
    <div className="hc-header">
      <span className="hc-icon" aria-hidden="true"><IconSparkles size={18} stroke={1.7} /></span>
      <h2>HR 协同助手</h2><span className="hc-badge">规则模拟</span>
    </div>
    <p className="hc-intro">基于当前业务记录，找到下一步。</p>
    <div className="hc-prompts" role="group" aria-label="选择业务摘要">
      {prompts.map(prompt => <button key={prompt.id} type="button" className={`hc-prompt ${selectedIntent === prompt.id ? 'hc-selected' : ''}`}
        aria-label={prompt.question} aria-pressed={selectedIntent === prompt.id} onClick={() => setSelectedIntent(prompt.id)}>{prompt.label}</button>)}
    </div>
    <div className="hc-summary" aria-live="polite" aria-atomic="true">
      <p className="hc-summary-text">{summary.text}</p>
      <p className="hc-detail">{summary.detail}</p>
      <button type="button" className="hc-navigate" aria-label={summary.action} onClick={() => onNavigate(summary.page)}>{summary.action}<IconArrowUpRight size={14} aria-hidden="true" /></button>
    </div>
    <div className="hc-footer"><IconShieldCheck size={12} aria-hidden="true" /><span>本地规则汇总 · 不调用外部模型</span></div>
  </section>;
}

export default HrCopilot;
