import { useEffect, useRef, useState, type FormEvent } from 'react';
import { IconArrowRight, IconArrowUpRight, IconBook2, IconCalendar, IconCheck, IconCircleCheck, IconClock, IconMessageCircle, IconSend, IconShieldCheck, IconSparkles } from '@tabler/icons-react';
import type { ChatMessage, LeaveRequest } from '../../shared/contracts';
import type { PageProps } from './types';
import { Avatar, Dialog, EmptyState, PageHeader, StatusBadge } from './ui';
import './pages.css';

type Period = 'morning' | 'afternoon' | 'full';
type LeaveStep = 'idle' | 'editing' | 'review' | 'submitted';
const periods: Record<Period, string> = { morning: '上午 · 0.5 天', afternoon: '下午 · 0.5 天', full: '全天 · 1 天' };
const statuses = { pending: '待审批', approved: '已批准', rejected: '已拒绝' };
const errorMessage = (error: unknown) => error instanceof Error ? error.message : '操作未完成，请重试。';
const timeLabel = (value: string) => new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Shanghai' }).format(new Date(value));

export function ServicePage({ data, busy, mutate, navigate, openKnowledge, focus }: PageProps) {
  const [chat, setChat] = useState('');
  const [chatError, setChatError] = useState('');
  const [lastReply, setLastReply] = useState<{ question: string; message: ChatMessage } | null>(null);
  const [step, setStep] = useState<LeaveStep>('idle');
  const [date, setDate] = useState(data.suggestedLeaveDate);
  const [period, setPeriod] = useState<Period>('afternoon');
  const [reason, setReason] = useState('');
  const [leaveError, setLeaveError] = useState('');
  const [submitted, setSubmitted] = useState<LeaveRequest | null>(null);
  const [pending, setPending] = useState('');
  const [decision, setDecision] = useState<{ leave: LeaveRequest; value: 'approved' | 'rejected' } | null>(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [decisionError, setDecisionError] = useState('');
  const [ticketReplies, setTicketReplies] = useState<Record<string, string>>({});
  const [ticketErrors, setTicketErrors] = useState<Record<string, string>>({});
  const lock = useRef(false);
  const chatAttempt = useRef<{ text: string; key: string } | null>(null);
  const leaveAttempt = useRef<{ payload: string; key: string } | null>(null);
  const chatEnd = useRef<HTMLDivElement>(null);
  const formCard = useRef<HTMLElement>(null);
  const employee = data.employees.find(item => item.id === data.actor.employeeId);
  const isEmployee = data.actor.role === 'employee';
  const isHR = data.actor.role === 'hr';
  const working = busy || !!pending;
  const messages = data.messages.filter(item => !isEmployee || item.employeeId === employee?.id);
  const visibleReply = lastReply && !messages.some(item => item.id === lastReply.message.id) ? lastReply : null;
  const leaves = data.leaves.filter(item => !isEmployee || item.employeeId === employee?.id);
  const currentResult = submitted ? leaves.find(item => item.id === submitted.id) || submitted : null;
  const days = period === 'full' ? 1 : .5;
  const leavePolicy = data.knowledge.find(item => item.id === 'policy-leave');
  const leaveBasis = leavePolicy?.sections.find(section => section.id === 'leave-request');

  useEffect(() => {
    setChat(''); setChatError(''); setLastReply(null); setStep('idle'); setDate(data.suggestedLeaveDate);
    setPeriod('afternoon'); setReason(''); setLeaveError(''); setSubmitted(null); setDecision(null);
    setDecisionError(''); setDecisionReason(''); setTicketReplies({}); setTicketErrors({});
    chatAttempt.current = null; leaveAttempt.current = null;
  }, [data.actor.id]);
  useEffect(() => {
    if (!focus?.requestId) return;
    const record = data.leaves.find(item => item.id === focus.requestId);
    if (!record) return;
    if (isEmployee) { setSubmitted(record); setStep('submitted'); }
    else if (record.status === 'pending') { setDecision({ leave: record, value: 'approved' }); setDecisionError(''); }
  }, [focus?.requestId, data.actor.id]);
  useEffect(() => { chatEnd.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [messages.length, lastReply?.message.id]);

  async function sendChat(text = chat) {
    const message = text.trim();
    if (!message || working || lock.current) return;
    const requestKey = chatAttempt.current?.text === message ? chatAttempt.current.key : crypto.randomUUID();
    chatAttempt.current = { text: message, key: requestKey };
    lock.current = true; setPending('chat'); setChatError('');
    try {
      const reply = await mutate<ChatMessage>('/api/assistant', { message, requestKey });
      setLastReply({ question: message, message: reply }); setChat(''); chatAttempt.current = null;
    } catch (error) { setChatError(errorMessage(error)); }
    finally { lock.current = false; setPending(''); }
  }
  function beginLeave(prefill?: { date?: string; period?: Period }) {
    if (working) return;
    const editing = step === 'editing' || step === 'review';
    setDate(prefill?.date || (editing ? date : data.suggestedLeaveDate));
    setPeriod(prefill?.period || (editing ? period : 'afternoon'));
    if (!editing) { setReason(''); leaveAttempt.current = null; }
    setLeaveError(''); setSubmitted(null); setStep('editing');
    requestAnimationFrame(() => formCard.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
  }
  function preview(event: FormEvent) {
    event.preventDefault(); setLeaveError('');
    if (!reason.trim()) { setLeaveError('请填写请假事由。'); return; }
    setStep('review');
  }
  async function submitLeave() {
    if (working || lock.current) return;
    const payload = { date, period, reason: reason.trim() };
    const serialized = JSON.stringify(payload);
    const requestKey = leaveAttempt.current?.payload === serialized ? leaveAttempt.current.key : crypto.randomUUID();
    leaveAttempt.current = { payload: serialized, key: requestKey };
    lock.current = true; setPending('leave'); setLeaveError('');
    try {
      const result = await mutate<LeaveRequest>('/api/leaves', { ...payload, requestKey });
      setSubmitted(result); setStep('submitted');
    } catch (error) { setLeaveError(errorMessage(error)); }
    finally { lock.current = false; setPending(''); }
  }
  async function decide() {
    if (!decision || working || lock.current) return;
    if (decision.value === 'rejected' && !decisionReason.trim()) { setDecisionError('拒绝申请时请填写原因。'); return; }
    lock.current = true; setPending('decision'); setDecisionError('');
    try {
      await mutate(`/api/leaves/${decision.leave.id}/decision`, { decision: decision.value, ...(decision.value === 'rejected' ? { reason: decisionReason.trim() } : {}) });
      setDecision(null); setDecisionReason('');
    } catch (error) { setDecisionError(errorMessage(error)); }
    finally { lock.current = false; setPending(''); }
  }
  async function replyTicket(id: string) {
    if (working || lock.current) return;
    lock.current = true; setPending(`ticket-${id}`); setTicketErrors(old => ({ ...old, [id]: '' }));
    try { await mutate(`/api/tickets/${id}/resolve`, { response: (ticketReplies[id] || '').trim() }); setTicketReplies(old => ({ ...old, [id]: '' })); }
    catch (error) { setTicketErrors(old => ({ ...old, [id]: errorMessage(error) })); }
    finally { lock.current = false; setPending(''); }
  }
  function messageView(message: ChatMessage) {
    return <div className={`v2p-message ${message.role}`} key={message.id}>
      <span className="v2p-message-author">{message.role === 'user' ? employee?.name || '我' : message.intent === 'human_reply' ? 'HR 人工答复' : '员工服务助手'}</span>
      <p className="v2p-message-body">{message.content}</p>
      {message.citations.length > 0 && <div className="v2p-citations">{message.citations.map((cite, index) => {
        const document = data.knowledge.find(item => item.id === cite.knowledgeId);
        return document && <div className="v2p-citation" key={`${cite.sectionId}-${index}`}><strong>{document.title} · {document.version}</strong><p>{cite.quote}</p><button type="button" className="v2-button secondary compact" aria-label={`查看知识引用：${document.title}`} onClick={() => openKnowledge(cite)}><IconBook2 size={14} />查看制度原文<IconArrowUpRight size={14} /></button></div>;
      })}</div>}
      {message.suggestedAction && <button className="v2p-text-button" disabled={working} onClick={() => beginLeave(message.suggestedAction?.prefill)}>填写请假申请<IconArrowRight size={15} /></button>}
      <time>{timeLabel(message.createdAt)}</time>
    </div>;
  }

  return <div className="v2p-page">
    <PageHeader title="员工服务" description={isEmployee ? `${employee?.name || data.actor.name} · 查询制度、提交年假申请和查看办理进度。` : '集中处理员工请假与人工咨询，每一项办理都有记录。'} actions={<StatusBadge tone="blue">规则模拟 · 本地演示</StatusBadge>} />
    {isEmployee && !employee ? <section className="v2-card"><EmptyState title="入职后开启员工服务" description="请由 HR 完成入职清单并确认实际入职。" /></section> : isEmployee ? <div className="v2p-service-layout">
      <section className="v2-card v2p-conversation" aria-label="员工服务对话">
        <div className="v2-card-header"><div><h2><IconSparkles size={18} />员工服务助手</h2><p>规则模拟 · 引用演示制度，未知事项转人工</p></div><StatusBadge tone="blue">员工自助</StatusBadge></div>
        <div className="v2p-quick-questions">{['年假可以怎么申请？', '我的培训任务有哪些？', '帮我查询申请进度'].map(question => <button type="button" key={question} disabled={working} onClick={() => sendChat(question)}>{question}</button>)}</div>
        <div className="v2p-chat-history" aria-live="polite">
          {!messages.length && !visibleReply && <div className="v2p-chat-welcome"><IconMessageCircle size={27} /><h3>今天有什么可以帮你？</h3><p>可以问制度、办年假或查询进度。请假申请会先在右侧预览，再由本人提交。</p></div>}
          {messages.map(messageView)}
          {visibleReply && <><div className="v2p-message user"><span className="v2p-message-author">{employee?.name}</span><p className="v2p-message-body">{visibleReply.question}</p></div>{messageView(visibleReply.message)}</>}
          {pending === 'chat' && <p className="v2p-muted" role="status">正在查询演示资料…</p>}<div ref={chatEnd} />
        </div>
        <div className="v2p-recent-requests"><h3>最近申请</h3>{!leaves.length ? <p className="v2p-muted">提交后的审批结果会持续显示在这里。</p> : leaves.slice(0, 3).map(leave => <button className="v2p-recent-request" key={leave.id} onClick={() => { setSubmitted(leave); setStep('submitted'); setLeaveError(''); }}><span>{leave.date} · {periods[leave.period]}</span><StatusBadge tone={leave.status === 'approved' ? 'green' : leave.status === 'rejected' ? 'red' : 'amber'}>{statuses[leave.status]}</StatusBadge><IconArrowUpRight size={14} /></button>)}</div>
        <form className="v2p-chat-compose" onSubmit={event => { event.preventDefault(); sendChat(); }}><label htmlFor="v2p-chat-question">继续提问</label><div><input id="v2p-chat-question" aria-label="向员工服务助手提问" value={chat} onChange={event => setChat(event.target.value)} placeholder="例如：我的申请进度如何？" disabled={working} maxLength={2000} /><button type="submit" className="v2-button primary" aria-label="发送问题" disabled={working || !chat.trim()}><IconSend size={17} /></button></div>{chatError && <p className="v2-form-error" role="alert">{chatError}</p>}</form>
      </section>
      <section ref={formCard} className="v2-card v2p-leave-card" aria-label="请假办理">
        <div className="v2-card-header"><div><h2>{step === 'idle' ? '当前办理' : step === 'review' ? '核对请假申请' : step === 'submitted' ? '申请进度' : '填写请假申请'}</h2><p>年假申请</p></div></div>
        <div className="v2p-flow-label"><span className={step === 'editing' || step === 'idle' ? 'active' : ''}>填写</span><IconArrowRight size={12} /><span className={step === 'review' ? 'active' : ''}>预览</span><IconArrowRight size={12} /><span className={step === 'submitted' ? 'active' : ''}>提交结果</span></div>
        {step === 'idle' ? <div className="v2p-leave-idle"><span className="v2p-big-icon"><IconCalendar size={27} /></span><h3>年假申请</h3><p>当前可用年假 <strong>{employee?.leaveBalance} 天</strong>。支持单个工作日的上午、下午或全天申请。</p><button className="v2-button primary full" onClick={() => beginLeave()} disabled={working}>填写请假申请<IconArrowRight size={16} /></button><p className="v2p-caption">其他假别未配置制度，可通过助手转交 HR。</p></div> : step === 'editing' ? <form aria-label="请假申请表单" className="v2p-form-stack" onSubmit={preview}>
          <label className="v2-field"><span>请假日期</span><input type="date" aria-label="请假日期" required min={data.today} value={date} onChange={event => setDate(event.target.value)} disabled={working} /></label>
          <label className="v2-field"><span>请假时段</span><select aria-label="请假时段" value={period} onChange={event => setPeriod(event.target.value as Period)} disabled={working}>{Object.entries(periods).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <label className="v2-field"><span>请假事由</span><textarea aria-label="请假事由" required rows={3} maxLength={500} value={reason} placeholder="请简要填写请假事由" onChange={event => setReason(event.target.value)} disabled={working} /></label>
          <div className="v2p-form-summary"><p>当前余额 {employee?.leaveBalance} 天</p><p>审批通过后预计剩余 {Math.max(0, (employee?.leaveBalance || 0) - days)} 天</p><p>审批人：{employee?.managerName}</p></div>
          <button className="v2-button primary full" disabled={working}>预览申请<IconArrowRight size={16} /></button><button className="v2p-text-button" type="button" onClick={() => setStep('idle')} disabled={working}>取消填写</button>
        </form> : step === 'review' ? <div role="region" aria-label="请假申请预览"><StatusBadge tone="blue">本人确认后提交</StatusBadge><dl className="v2p-detail-list"><div><dt>申请人</dt><dd>{employee?.name}</dd></div><div><dt>请假日期</dt><dd>{date}</dd></div><div><dt>时段 / 天数</dt><dd>{periods[period]}</dd></div><div><dt>请假事由</dt><dd>{reason}</dd></div><div><dt>审批人</dt><dd>{employee?.managerName}</dd></div></dl><p className="v2p-caption">提交后为待审批状态。批准时会重新校验并扣减余额。</p><div className="v2p-actions"><button className="v2-button secondary" disabled={working} onClick={() => { setStep('editing'); setLeaveError(''); }}>返回修改</button><button className="v2-button primary" disabled={working} onClick={submitLeave}>{pending === 'leave' ? '正在提交…' : '提交申请'}<IconCheck size={16} /></button></div></div> : currentResult && <div role="region" aria-label="申请进度" data-leave-id={currentResult.id} className="v2p-submit-result"><IconCircleCheck size={34} /><h3>{currentResult.status === 'pending' ? '已提交，等待主管审批' : `申请${statuses[currentResult.status]}`}</h3><StatusBadge tone={currentResult.status === 'approved' ? 'green' : currentResult.status === 'rejected' ? 'red' : 'amber'}>{statuses[currentResult.status]}</StatusBadge><dl className="v2p-detail-list"><div><dt>日期与时段</dt><dd>{currentResult.date} · {periods[currentResult.period]}</dd></div><div><dt>请假事由</dt><dd>{currentResult.reason}</dd></div><div><dt>申请编号</dt><dd className="v2p-record-id">{currentResult.id}</dd></div>{currentResult.decisionReason && <div><dt>审批意见</dt><dd>{currentResult.decisionReason}</dd></div>}</dl><p className="v2p-caption">{currentResult.status === 'pending' ? '待审批申请尚未扣减余额。刷新页面后，仍可在最近申请中查看。' : '审批结果与余额已记录，可在最近申请中继续查看。'}</p><button className="v2-button secondary full" onClick={() => beginLeave()} disabled={working}>填写新的申请</button></div>}
        {leaveError && <p className="v2-form-error" role="alert">{leaveError}</p>}
        {leavePolicy && leaveBasis && <aside className="v2p-leave-basis" aria-label="请假制度依据"><strong>{leavePolicy.title} · {leavePolicy.version}</strong><blockquote>{leaveBasis.content}</blockquote><button type="button" className="v2-button secondary compact" aria-label={`查看办理依据：${leavePolicy.title}`} onClick={() => openKnowledge({ knowledgeId: leavePolicy.id, sectionId: leaveBasis.id, quote: leaveBasis.content })}><IconBook2 size={14} />查看制度原文<IconArrowUpRight size={14} /></button></aside>}
        <div className="v2p-card-footnote"><IconShieldCheck size={14} /><span>演示制度 · 过去日期、周末、重叠申请由系统校验</span></div>
      </section>
    </div> : <>
      <div className="v2p-service-metrics"><section className="v2-card"><IconClock size={20} /><strong>{data.leaves.filter(item => item.status === 'pending').length}</strong><span>待审批请假</span></section><section className="v2-card"><IconCircleCheck size={20} /><strong>{data.leaves.filter(item => item.status === 'approved').length}</strong><span>已批准请假</span></section><section className="v2-card"><IconMessageCircle size={20} /><strong>{data.tickets.filter(item => item.status === 'open').length}</strong><span>待回复咨询</span></section></div>
      <section className="v2-card v2p-managed-requests"><div className="v2-card-header"><div><h2>请假申请与审批</h2><p>批准时校验并扣减余额，重复审批不重复扣减。</p></div><StatusBadge tone="blue">{isHR ? 'HR 管理员' : '部门主管'}</StatusBadge></div>{!leaves.length ? <EmptyState title="还没有员工请假申请" description="员工正式入职后，可在员工服务中提交申请。" icon={<IconCalendar size={26} />} /> : <div className="v2-table-scroll"><table className="v2-table"><thead><tr><th>申请人</th><th>请假时间</th><th>事由</th><th>状态</th><th>处理</th></tr></thead><tbody>{leaves.map(leave => <tr key={leave.id} className={focus?.requestId === leave.id ? 'v2p-focused-row' : ''}><td><span className="v2p-person"><Avatar name={leave.employeeName} small />{leave.employeeName}</span></td><td>{leave.date}<small>{periods[leave.period]}</small></td><td>{leave.reason}</td><td><StatusBadge tone={leave.status === 'approved' ? 'green' : leave.status === 'rejected' ? 'red' : 'amber'}>{statuses[leave.status]}</StatusBadge></td><td>{leave.status === 'pending' ? <div className="v2p-actions compact"><button className="v2-button primary compact" disabled={working} onClick={() => { setDecision({ leave, value: 'approved' }); setDecisionError(''); }}>批准申请</button><button className="v2-button secondary compact" disabled={working} onClick={() => { setDecision({ leave, value: 'rejected' }); setDecisionReason(''); setDecisionError(''); }}>拒绝申请</button></div> : <span className="v2p-caption">{leave.decisionReason || '审批已完成'}</span>}</td></tr>)}</tbody></table></div>}</section>
      <section className="v2-card v2p-tickets"><div className="v2-card-header"><div><h2>人工咨询工单</h2><p>知识库无法回答的问题，由 HR 回复。</p></div></div>{!data.tickets.length ? <EmptyState title="暂无人工咨询" description="员工咨询超出演示知识范围时，系统会保留问题并转交 HR。" icon={<IconMessageCircle size={24} />} /> : data.tickets.map(ticket => <article className="v2p-ticket" key={ticket.id}><header><span className="v2p-person"><Avatar name={ticket.employeeName} small /><strong>{ticket.employeeName}</strong></span><time>{timeLabel(ticket.createdAt)}</time><StatusBadge tone={ticket.status === 'resolved' ? 'green' : 'amber'}>{ticket.status === 'resolved' ? '已回复' : '待回复'}</StatusBadge></header><p>{ticket.question}</p>{ticket.status === 'resolved' ? <div className="v2p-ticket-response"><IconCheck size={16} />{ticket.response}</div> : isHR ? <form onSubmit={event => { event.preventDefault(); replyTicket(ticket.id); }}><label className="v2-field"><span>HR 答复</span><textarea aria-label={`回复${ticket.employeeName}的咨询`} required maxLength={2000} rows={2} value={ticketReplies[ticket.id] || ''} onChange={event => setTicketReplies(old => ({ ...old, [ticket.id]: event.target.value }))} disabled={working} /></label><button className="v2-button primary compact" disabled={working || !(ticketReplies[ticket.id] || '').trim()}>回复工单</button>{ticketErrors[ticket.id] && <p className="v2-form-error" role="alert">{ticketErrors[ticket.id]}</p>}</form> : <p className="v2p-muted">等待 HR 回复</p>}</article>)}</section>
    </>}
    {decision && <Dialog title={decision.value === 'approved' ? '批准请假申请' : '拒绝请假申请'} label={decision.value === 'approved' ? '批准请假申请' : '拒绝请假申请'} description={`${decision.leave.employeeName} · ${decision.leave.date} · ${periods[decision.leave.period]}`} onClose={() => { if (!working) setDecision(null); }} error={decisionError}><p className="v2p-decision-reason">{decision.leave.reason}</p>{decision.value === 'approved' ? <p className="v2-notice">批准时系统会再次校验余额，并扣减 {decision.leave.days} 天。</p> : <label className="v2-field"><span>拒绝原因 · 必填</span><textarea aria-label="拒绝原因" rows={3} required value={decisionReason} onChange={event => setDecisionReason(event.target.value)} disabled={working} /></label>}<div className="v2-dialog-actions"><button className="v2-button secondary" disabled={working} onClick={() => setDecision(null)}>取消</button><button className={`v2-button ${decision.value === 'approved' ? 'primary' : 'danger'}`} disabled={working || (decision.value === 'rejected' && !decisionReason.trim())} onClick={decide}>{decision.value === 'approved' ? '批准申请' : '拒绝申请'}</button></div></Dialog>}
  </div>;
}
