import { useEffect, useRef, useState } from 'react';
import { IconArrowRight, IconBook2, IconCheck, IconCircleCheck, IconClipboardCheck, IconSchool, IconShieldCheck, IconUserPlus } from '@tabler/icons-react';
import type { PageProps } from './types';
import { Avatar, EmptyState, PageHeader, StatusBadge } from './ui';
import './pages.css';

export function OnboardingPage({ data, busy, mutate, navigate, openKnowledge, focus }: PageProps) {
  const [selectedId, setSelectedId] = useState(focus?.employeeId || '');
  const [error, setError] = useState('');
  const [pending, setPending] = useState('');
  const [notice, setNotice] = useState('');
  const lock = useRef(false);
  const isHR = data.actor.role === 'hr';
  const isEmployee = data.actor.role === 'employee';
  const selected = data.onboardings.find(item => item.employeeId === selectedId)
    || data.onboardings.find(item => item.status === 'pending') || data.onboardings[0];
  const employee = data.employees.find(item => item.id === selected?.employeeId);
  const done = selected?.items.filter(item => item.done).length || 0;
  const working = busy || !!pending;
  const mandatoryCount = employee ? 1 + employee.confirmedNeeds.length : 0;
  useEffect(() => { setSelectedId(''); setError(''); setNotice(''); }, [data.actor.id]);
  useEffect(() => {
    if (focus?.page !== 'onboarding' || !focus.employeeId) return;
    setSelectedId(focus.employeeId); setError(''); setNotice('');
  }, [focus?.page, focus?.employeeId]);
  async function updateItem(id: string, complete: boolean) {
    if (!selected || !isHR || working || lock.current) return;
    lock.current = true; setPending(id); setError(''); setNotice('');
    try { await mutate(`/api/onboardings/${selected.id}`, { items: [{ id, done: complete }] }, 'PATCH'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : '清单未能保存，请重试。'); }
    finally { lock.current = false; setPending(''); }
  }
  async function complete() {
    if (!selected || !employee || !isHR || working || lock.current) return;
    if (!confirm(`确认${employee.name}已实际入职？完成后将创建正式培训任务。`)) return;
    lock.current = true; setPending('complete'); setError(''); setNotice('');
    try { await mutate(`/api/onboardings/${selected.id}/complete`, {}); setNotice('已确认实际入职，员工服务已开放，岗位培训任务已创建。'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : '入职确认未完成，请重试。'); }
    finally { lock.current = false; setPending(''); }
  }
  return <div className="v2p-page">
    <PageHeader title="入职管理" description="核验入职清单，确认员工实际入职。" actions={<button className="v2-button secondary compact" onClick={() => openKnowledge({ knowledgeId: 'guide-onboarding' })}><IconBook2 size={15} />入职指南</button>} />
    <p className="v2-notice"><IconShieldCheck size={17} />录用建立待入职档案。完成全部清单并由 HR 确认实际入职后，才会开放正式任务。</p>
    {!data.onboardings.length ? <section className="v2-card"><EmptyState title="还没有待办理的入职" description="HR 确认录用后，系统会建立员工档案和核验清单。" icon={<IconUserPlus size={28} />} action={{ label: isHR ? '前往招聘工作台' : '返回工作台', onClick: () => navigate({ page: isHR ? 'recruitment' : 'dashboard' }) }} /></section> : <div className="v2p-onboarding-layout">
      <aside className="v2-card v2p-record-queue" aria-label="入职记录"><div className="v2-card-header"><div><h2>{isEmployee ? '我的入职记录' : '入职记录'}</h2><p>{data.onboardings.filter(item => item.status === 'pending').length} 位待入职</p></div></div>{data.onboardings.map(record => {
        const person = data.employees.find(item => item.id === record.employeeId);
        if (!person) return null;
        return <button type="button" className={`v2p-queue-item ${selected?.id === record.id ? 'selected' : ''}`} key={record.id} aria-label={`查看${person.name}入职记录`} onClick={() => { setSelectedId(person.id); setError(''); setNotice(''); navigate({ page: 'onboarding', employeeId: person.id }); }}><span className="v2p-person"><Avatar name={person.name} small /><strong>{person.name}</strong></span><StatusBadge tone={record.status === 'completed' ? 'green' : 'blue'}>{record.status === 'completed' ? '已入职' : '待入职'}</StatusBadge><small>{person.positionTitle}</small><small>{record.items.filter(item => item.done).length} / {record.items.length} 项核验完成</small></button>;
      })}</aside>
      {selected && employee && <section className="v2-card v2p-onboarding-detail" aria-label={`${employee.name}的入职清单`}>
        <div className="v2-card-header"><div className="v2p-person"><Avatar name={employee.name} /><div><h2>{employee.name}</h2><p>{employee.positionTitle} · {employee.department}</p></div></div><StatusBadge tone={selected.status === 'completed' ? 'green' : 'blue'}>{selected.status === 'completed' ? '已入职' : '待入职'}</StatusBadge></div>
        <dl className="v2p-person-summary"><div><dt>入职日期</dt><dd>{employee.joinDate}</dd></div><div><dt>直属主管</dt><dd>{employee.managerName}</dd></div><div><dt>清单进度</dt><dd>{done} / {selected.items.length} 项</dd></div></dl>
        <div className="v2p-subheading"><IconClipboardCheck size={18} /><h3>资料与入职核验</h3><span>仅记录核验状态</span></div>
        <div className="v2p-checklist">{selected.items.map((item, index) => <label className={`v2p-checklist-item ${item.done ? 'done' : ''}`} key={item.id}><input type="checkbox" aria-label={item.title} checked={item.done} disabled={!isHR || working || selected.status === 'completed'} onChange={event => updateItem(item.id, event.target.checked)} /><span className="v2p-checklist-number">{String(index + 1).padStart(2, '0')}</span><span className="v2p-checklist-copy"><strong>{item.title}</strong><small>{item.done ? '已由 HR 确认完成' : '请完成核验后勾选，不提交真实敏感材料'}</small></span>{item.done && <IconCircleCheck size={19} />}</label>)}</div>
        <div className="v2p-onboarding-training"><IconSchool size={22} /><div><h3>入职后分配 {mandatoryCount} 项培训</h3><p>1 项岗位必修{employee.confirmedNeeds.length ? `＋ ${employee.confirmedNeeds.length} 项 HR 明确确认的发展任务` : '；未核实的能力不自动生成补课任务'}。</p>{employee.confirmedNeeds.length > 0 && <div className="v2p-need-tags">{employee.confirmedNeeds.map(id => <StatusBadge tone="purple" key={id}>{data.position.abilities.find(item => item.id === id)?.name || id}</StatusBadge>)}</div>}</div></div>
        {error && <p className="v2-form-error" role="alert">{error}</p>}{notice && <p className="v2p-success" role="status"><IconCheck size={17} />{notice}</p>}
        <div className="v2p-onboarding-final">{selected.status === 'completed' ? <><p className="v2p-success"><IconCircleCheck size={18} />员工档案已生效，培训任务已创建。</p><button className="v2-button primary" onClick={() => navigate({ page: 'training', employeeId: employee.id })}>查看培训任务<IconArrowRight size={16} /></button></> : <><p className="v2p-caption">{!isHR ? '当前身份可查看办理进度，清单更新和实际入职确认由 HR 办理。' : done === selected.items.length ? '全部核验已完成，请确认员工已实际入职。' : `还有 ${selected.items.length - done} 项待核验，完成后才可确认实际入职。`}</p><button className="v2-button primary" disabled={!isHR || working || done !== selected.items.length} onClick={complete}>{pending === 'complete' ? '正在确认…' : '确认入职'}<IconArrowRight size={16} /></button></>}</div>
      </section>}
    </div>}
  </div>;
}
