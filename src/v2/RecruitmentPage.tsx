import { useEffect, useRef, useState, type FormEvent } from 'react';
import { IconArrowLeft, IconArrowRight, IconArrowUpRight, IconBook2, IconCheck, IconChevronRight, IconFileText, IconLayoutColumns, IconLink, IconListDetails, IconShieldCheck, IconUserPlus } from '@tabler/icons-react';
import type { Candidate, Employee, Evidence } from '../../shared/contracts';
import type { PageProps } from './types';
import { Avatar, Dialog, EmptyState, HighlightText, PageHeader, StatusBadge, type Tone } from './ui';

type StageFilter = Candidate['stage'] | 'all';
const stageLabels: Record<Candidate['stage'], string> = { screening: '待筛选', interview: '待面试', decision: '待决策', hired: '已录用' };
const evidenceLabels: Record<Evidence['status'], string> = { supported: '已有证据', unverified: '待核实', gap: '确认待提升' };
const evidenceTones: Record<Evidence['status'], Tone> = { supported: 'green', unverified: 'amber', gap: 'purple' };

export function RecruitmentPage({ data, busy, mutate, navigate, openKnowledge, focus }: PageProps) {
  const [candidateId, setCandidateId] = useState(focus?.candidateId || 'cand-chen');
  const [abilityId, setAbilityId] = useState(focus?.abilityId || data.position.abilities[0]?.id || '');
  const [stageFilter, setStageFilter] = useState<StageFilter>(focus?.stage || 'all');
  const [mode, setMode] = useState<'review' | 'compare'>('review');
  const [mobileTab, setMobileTab] = useState<'review' | 'source'>('review');
  const [hireOpen, setHireOpen] = useState(false);
  const [confirmedNeeds, setConfirmedNeeds] = useState<string[]>([]);
  const [localError, setLocalError] = useState('');
  const [notice, setNotice] = useState('');
  const [draftStage, setDraftStage] = useState<'screening' | 'interview' | 'decision'>('screening');
  const sourceRef = useRef<HTMLDivElement>(null);
  const candidates = stageFilter === 'all' ? data.candidates : data.candidates.filter(item => item.stage === stageFilter);
  const candidate = candidates.find(item => item.id === candidateId) || candidates[0];
  const ability = data.position.abilities.find(item => item.id === abilityId) || data.position.abilities[0];
  const selectedEvidence = candidate?.evidence.find(item => item.abilityId === ability?.id);
  const sourceSection = candidate?.resume.sections.find(item => item.id === selectedEvidence?.sectionId);

  useEffect(() => {
    if (focus?.candidateId) { setCandidateId(focus.candidateId); setStageFilter(focus.stage || 'all'); }
    if (focus?.abilityId) setAbilityId(focus.abilityId);
    if (focus?.stage) {
      setStageFilter(focus.stage);
      if (!focus.candidateId && focus.stage !== 'all') {
        const first = data.candidates.find(item => item.stage === focus.stage);
        if (first) setCandidateId(first.id);
      }
    }
    setMobileTab('review');
  }, [focus?.candidateId, focus?.abilityId, focus?.stage]);
  useEffect(() => { setDraftStage(candidate?.stage === 'hired' ? 'decision' : candidate?.stage || 'screening'); setLocalError(''); setNotice(''); }, [candidate?.id, candidate?.stage]);
  useEffect(() => {
    const container = sourceRef.current;
    const section = selectedEvidence?.sectionId && container?.querySelector<HTMLElement>(`[data-section-id="${CSS.escape(selectedEvidence.sectionId)}"]`);
    if (container && section) container.scrollTo({ top: Math.max(0, section.offsetTop - container.offsetTop - 12), behavior: 'smooth' });
  }, [candidate?.id, selectedEvidence?.sectionId, mobileTab]);

  function chooseCandidate(id: string, stage: StageFilter = stageFilter) { setCandidateId(id); setMobileTab('review'); setLocalError(''); setNotice(''); navigate({ page: 'recruitment', candidateId: id, abilityId, stage }); }
  function chooseStage(next: StageFilter) { setStageFilter(next); const first = data.candidates.find(item => next === 'all' || item.stage === next); if (first) chooseCandidate(first.id, next); else navigate({ page: 'recruitment', stage: next }); }
  function chooseAbility(id: string) { setAbilityId(id); navigate({ page: 'recruitment', candidateId: candidate?.id, abilityId: id, stage: stageFilter }); }
  async function updateStage() {
    if (!candidate) return;
    setLocalError('');
    try { await mutate(`/api/candidates/${candidate.id}/stage`, { stage: draftStage }); setNotice('招聘阶段已更新'); }
    catch (error) { setLocalError(error instanceof Error ? error.message : '阶段更新未完成'); }
  }
  async function hire(event: FormEvent) {
    event.preventDefault();
    if (!candidate) return;
    setLocalError('');
    try {
      const result = await mutate<{ employee: Employee }>(`/api/candidates/${candidate.id}/hire`, { confirmedNeeds });
      setHireOpen(false);
      navigate({ page: 'onboarding', employeeId: result.employee.id });
    } catch (error) { setLocalError(error instanceof Error ? error.message : '录用未完成，请重试'); }
  }

  if (data.actor.role !== 'hr') return <><PageHeader title="招聘证据审阅" /><section className="v2-card"><EmptyState title="招聘资料由 HR 管理" description="请切换为 HR 演示身份，查看候选人证据并确认录用。" /></section></>;
  return <div className="v2-recruitment-page">
    <PageHeader title="招聘证据审阅" description={`${data.position.department} / ${data.position.title} · 逐项核实岗位要求，保留人工决策。`} actions={<div className="v2-view-switch" role="group" aria-label="招聘审阅视图"><button className={mode === 'review' ? 'selected' : ''} aria-pressed={mode === 'review'} onClick={() => setMode('review')}><IconLayoutColumns size={15} />证据审阅</button><button className={mode === 'compare' ? 'selected' : ''} aria-pressed={mode === 'compare'} onClick={() => setMode('compare')}><IconListDetails size={15} />候选人比较</button></div>} />
    {notice && <div className="v2-notice success" role="status"><IconCheck size={16} />{notice}</div>}
    {localError && !hireOpen && <div className="v2-form-error" role="alert">{localError}</div>}
    {mode === 'compare' ? <section className="v2-card v2-compare-panel"><div className="v2-card-header"><div><h2>按同一套岗位标准比较</h2><p>未写明的能力保持待核实，点击单项回到原文审阅</p></div><button className="v2-button secondary compact" onClick={() => setMode('review')}><IconArrowLeft size={14} />返回证据审阅</button></div><div className="v2-table-scroll"><table className="v2-table v2-compare-table"><thead><tr><th>岗位能力与要求</th>{data.candidates.map(item => <th key={item.id}><span className="v2-table-person"><Avatar name={item.name} color={item.color} small />{item.name}</span></th>)}</tr></thead><tbody>{data.position.abilities.map(item => <tr key={item.id}><th><strong>{item.name}</strong><small>{item.requirement}</small></th>{data.candidates.map(person => { const evidence = person.evidence.find(evidence => evidence.abilityId === item.id); return <td key={person.id}>{evidence && <button className="v2-comparison-cell" onClick={() => { setCandidateId(person.id); setAbilityId(item.id); setStageFilter('all'); setMode('review'); navigate({ page: 'recruitment', candidateId: person.id, abilityId: item.id, stage: 'all' }); }}><StatusBadge tone={evidenceTones[evidence.status]}>{evidenceLabels[evidence.status]}</StatusBadge><p>{evidence.summary}</p><span>核对原文<IconArrowUpRight size={13} /></span></button>}</td>; })}</tr>)}</tbody></table></div></section> : <>
      <div className="v2-recruitment-layout">
        <aside className="v2-card v2-candidate-queue"><div className="v2-card-header"><div><h2>候选人队列</h2><p>{data.candidates.length} 位候选人</p></div></div><label className="v2-candidate-filter"><span>招聘阶段</span><select aria-label="筛选候选人阶段" value={stageFilter} onChange={event => chooseStage(event.target.value as StageFilter)}><option value="all">全部阶段</option><option value="screening">待筛选</option><option value="interview">待面试</option><option value="decision">待决策</option><option value="hired">已录用</option></select></label><div className="v2-candidate-list">{candidates.length ? candidates.map(item => <button key={item.id} aria-label={`查看${item.name}档案`} aria-pressed={candidate?.id === item.id} className={`v2-candidate-row ${candidate?.id === item.id ? 'selected' : ''}`} onClick={() => chooseCandidate(item.id)}><div><Avatar name={item.name} color={item.color} small /><strong>{item.name}</strong><IconChevronRight size={13} /></div><p>{item.experience}</p><StatusBadge tone={item.stage === 'hired' ? 'green' : 'blue'}>{stageLabels[item.stage]}</StatusBadge></button>) : <div className="v2-filter-empty"><p>当前阶段没有候选人</p><button className="v2-button secondary compact" onClick={() => chooseStage('all')}>查看全部</button></div>}</div><div className="v2-candidate-footnote"><IconShieldCheck size={15} /><span>虚构简历 · 规则模拟分析<br />招聘决定由 HR 确认</span></div></aside>
        {candidate && <>
          <div className="v2-mobile-review-tabs" role="group" aria-label="切换审阅内容"><button className={mobileTab === 'review' ? 'selected' : ''} aria-pressed={mobileTab === 'review'} onClick={() => setMobileTab('review')}>能力核实</button><button className={mobileTab === 'source' ? 'selected' : ''} aria-pressed={mobileTab === 'source'} onClick={() => setMobileTab('source')}>简历原文</button></div>
          <section className={`v2-card v2-evidence-review ${mobileTab === 'source' ? 'mobile-hidden' : ''}`}><div className="v2-card-header"><div><h2>{candidate.name} · 岗位能力核实</h2><p>已有证据 {candidate.evidence.filter(item => item.status === 'supported').length} 项 · 待核实 {candidate.evidence.filter(item => item.status === 'unverified').length} 项{candidate.evidence.some(item => item.status === 'gap') && ` · 确认待提升 ${candidate.evidence.filter(item => item.status === 'gap').length} 项`}</p></div></div><div className="v2-ability-tabs" role="group" aria-label="选择核实能力">{data.position.abilities.map(item => { const evidence = candidate.evidence.find(evidence => evidence.abilityId === item.id); return <button key={item.id} className={`${ability?.id === item.id ? 'selected' : ''} ${evidence?.status || ''}`} aria-label={`查看原文证据：${item.name}`} aria-pressed={ability?.id === item.id} onClick={() => chooseAbility(item.id)}>{item.name}</button>; })}</div><div className="v2-evidence-body">{ability && selectedEvidence && <div className={`v2-selected-evidence ${selectedEvidence.status}`}><div><h3>{ability.name}</h3><StatusBadge tone={evidenceTones[selectedEvidence.status]}>{evidenceLabels[selectedEvidence.status]}</StatusBadge></div><p><strong>岗位要求：</strong>{ability.requirement}</p><p className="v2-evidence-summary">{selectedEvidence.summary}</p>{selectedEvidence.quote && <blockquote><IconFileText size={15} /><span>{selectedEvidence.quote}</span></blockquote>}<button className="v2-text-button v2-mobile-source-link" onClick={() => setMobileTab('source')}>查看简历原文<IconArrowUpRight size={14} /></button></div>}<div className="v2-interview-questions"><h3>下一步核实问题</h3><ol>{candidate.interviewQuestions.map((question, index) => <li key={index}><span>{index + 1}.</span><p>{question}</p></li>)}</ol></div><div className="v2-evidence-caution"><IconShieldCheck size={15} /><p>未写明的能力保留为待核实，不自动认定为能力缺陷。</p></div></div><div className="v2-review-actions"><div className="v2-stage-update"><select aria-label="招聘阶段" value={draftStage} onChange={event => setDraftStage(event.target.value as typeof draftStage)} disabled={busy || candidate.stage === 'hired'}><option value="screening">待筛选</option><option value="interview">待面试</option><option value="decision">待决策</option></select><button className="v2-button secondary" disabled={busy || candidate.stage === 'hired' || draftStage === candidate.stage} onClick={updateStage}>更新招聘阶段</button></div><button className="v2-button primary full" disabled={busy || candidate.stage === 'hired'} onClick={() => { setLocalError(''); setConfirmedNeeds([]); setHireOpen(true); }}>{candidate.stage === 'hired' ? <><IconCheck size={16} />已确认录用</> : <>确认录用<IconArrowRight size={16} /></>}</button>{candidate.stage === 'hired' && <button className="v2-text-button" onClick={() => navigate({ page: 'onboarding', employeeId: data.employees.find(item => item.candidateId === candidate.id)?.id })}>查看关联入职档案<IconArrowUpRight size={14} /></button>}</div></section>
          <section className={`v2-card v2-resume-panel ${mobileTab === 'review' ? 'mobile-hidden' : ''}`} role="region" aria-label="原文证据"><div className="v2-card-header"><div><h2>简历原文</h2><p>{candidate.name} · 虚构演示简历</p></div><IconFileText size={18} /></div><div className="v2-source-current"><IconLink size={14} /><span>正在核实：{ability?.name}</span></div><div className="v2-source-body" ref={sourceRef}>{candidate.resume.sections.map(section => <section key={section.id} data-section-id={section.id} aria-current={section.id === selectedEvidence?.sectionId ? 'true' : undefined} className={section.id === selectedEvidence?.sectionId ? 'current' : ''}><div><h3>{section.title}</h3>{section.id === selectedEvidence?.sectionId && <StatusBadge tone="blue">证据来源</StatusBadge>}</div><p><HighlightText text={section.content} quote={section.id === selectedEvidence?.sectionId ? selectedEvidence.quote : undefined} /></p></section>)}</div><div className="v2-source-footer"><p>正在关联：{ability?.name}</p><p>来源章节：{sourceSection?.title || '暂无充分对应证据'}</p><p>证据类型：候选人自述，仍需面试核实</p><button className="v2-text-button" onClick={() => openKnowledge({ knowledgeId: 'sop-quality' })}><IconBook2 size={14} />对照岗位 SOP<IconArrowUpRight size={13} /></button></div></section>
        </>}
      </div>
    </>}
    {hireOpen && candidate && <Dialog title={`确认录用${candidate.name}`} label="确认录用候选人" description={`${data.position.title} · 由 HR 确认培养需求，录用后生成待入职档案`} onClose={() => setHireOpen(false)} error={localError}><form onSubmit={hire}><div className="v2-notice"><IconUserPlus size={18} /><p>确认后创建待入职档案和清单，员工正式入职后才开放服务与培养任务。</p></div><fieldset className="v2-hire-needs"><legend>人工确认的培养需求 <small>可不选</small></legend><p>仅勾选已经通过面试等方式核实的培养需求。简历未写明的能力不会自动勾选。</p>{data.position.abilities.map(item => <label key={item.id}><input type="checkbox" aria-label={item.name} checked={confirmedNeeds.includes(item.id)} onChange={event => setConfirmedNeeds(event.target.checked ? [...confirmedNeeds, item.id] : confirmedNeeds.filter(id => id !== item.id))} /><span><strong>{item.name}</strong><small>{item.requirement}</small></span></label>)}</fieldset><div className="v2-dialog-actions"><button type="button" className="v2-button secondary" disabled={busy} onClick={() => setHireOpen(false)}>暂不录用</button><button className="v2-button primary" disabled={busy}>{busy ? '正在确认…' : '确认录用'}<IconCheck size={16} /></button></div></form></Dialog>}
  </div>;
}

export default RecruitmentPage;
