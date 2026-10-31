import { useEffect, useState } from 'react';
import { IconAlertTriangle, IconArrowRight, IconArrowUpRight, IconBolt, IconBriefcase, IconCheck, IconSchool, IconShieldCheck, IconUsers, IconX } from '@tabler/icons-react';
import type { CalculationSnapshot, GapLine } from '../../shared/order2people';
import type { InternalCandidate, ProposalPath, SkillBridgeCase, SkillBridgeProposal } from '../../shared/skillbridge';
import type { PageProps } from './types';
import { EmptyState, PageHeader, StatusBadge, type Tone } from './ui';
import './SkillBridge.css';

const o2pBase = '/api/v1/order2people';
const sbBase = '/api/v1/skillbridge';
const hours = (n: number) => `${(n / 3600).toFixed(1)} h`;

const classificationLabels = { qualified_verified: '已验证可直接上岗', potential_transferable: '潜在可迁移技能', insufficient_evidence: '证据不足待核实' } as const;
const classificationTones: Record<string, Tone> = { qualified_verified: 'green', potential_transferable: 'amber', insufficient_evidence: 'gray' };
const matchLabels = { verified_match: '已验证满足', adjacent_skill: '相近技能 · 待核实', no_evidence: '无证据' } as const;
const matchTones: Record<string, Tone> = { verified_match: 'green', adjacent_skill: 'amber', no_evidence: 'red' };
const pathLabels: Record<ProposalPath, string> = { internal_assignment: '内部调配', development_plan: '内部培养', external_requisition: '外部招聘' };
const pathIcons: Record<ProposalPath, typeof IconUsers> = { internal_assignment: IconUsers, development_plan: IconSchool, external_requisition: IconBriefcase };
const proposalStatusLabels = { draft: '待 HR 审核', hr_approved: '已批准', hr_rejected: '已拒绝' } as const;
const proposalStatusTones: Record<string, Tone> = { draft: 'blue', hr_approved: 'green', hr_rejected: 'red' };
const executionLabels = { not_executed: '尚未落地执行', executed: '已落地执行', blocked_stale: '上游已过期，无法执行' } as const;
const executionTones: Record<string, Tone> = { not_executed: 'gray', executed: 'green', blocked_stale: 'red' };
const refTypeLabels = { training_task: '培训任务', requisition: '招聘需求草稿', capacity_reservation: '容量占用' } as const;

export function SkillBridgePage({ data, navigate, focus }: PageProps) {
  const [calculations, setCalculations] = useState<CalculationSnapshot[]>([]);
  const [cases, setCases] = useState<SkillBridgeCase[]>([]);
  const [activeCaseId, setActiveCaseId] = useState(focus?.caseId || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reviewOpenId, setReviewOpenId] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [executeOpenId, setExecuteOpenId] = useState('');
  const [managerConfirmedBy, setManagerConfirmedBy] = useState('');
  const [riskAcknowledgement, setRiskAcknowledgement] = useState('');
  const [executeError, setExecuteError] = useState('');

  const request = async (url: string, body?: unknown, method = 'POST') => {
    const r = await fetch(url, { method: body ? method : 'GET', headers: { 'Content-Type': 'application/json', 'x-demo-actor': data.actor.id }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const v = await r.json();
    if (!r.ok) throw Error(v.error?.message || '请求失败');
    return v;
  };
  const refresh = async () => {
    const [calcList, caseList] = await Promise.all([request(`${o2pBase}/calculations`), request(`${sbBase}/cases`)]);
    setCalculations(calcList.items);
    setCases(caseList.items);
  };
  // The workbench keeps visited pages mounted; `focus` gets a new identity on every navigation
  // to this page, so re-entering always reloads upstream calculations and cases.
  useEffect(() => { void refresh().catch((e) => setError(e.message)); }, [data.actor.id, focus]);
  useEffect(() => { if (focus?.caseId) setActiveCaseId(focus.caseId); }, [focus?.caseId]);
  const act = async (fn: () => Promise<void>) => {
    setBusy(true); setError('');
    try { await fn(); await refresh(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  // Confirmed + complete + non-stale calculations with at least one uncovered gap line are
  // the only eligible source of SkillBridge demands — mirrors the server's own gate.
  const eligibleCalculations = calculations.filter((c) => c.status === 'confirmed' && c.completeness === 'complete');
  const openGapLines = eligibleCalculations.flatMap((c) => c.lines.filter((l) => (l.gapSeconds || 0) > 0).map((l) => ({ calculation: c, line: l })));
  const activeCase = cases.find((c) => c.id === activeCaseId);

  async function openCase(calculationId: string, line: GapLine) {
    await act(async () => {
      const demandId = `${calculationId}:${line.demandId}`;
      const created = await request(`${sbBase}/cases`, { calculationId, demandId, requestKey: crypto.randomUUID() });
      setActiveCaseId(created.id);
      navigate({ page: 'skillbridge', caseId: created.id });
    });
  }

  async function submitReview(proposal: SkillBridgeProposal, decision: 'hr_approved' | 'hr_rejected') {
    if (!reviewNote.trim()) { setReviewError('请填写审核说明'); return; }
    setReviewError('');
    try {
      await act(async () => {
        await request(`${sbBase}/proposals/${proposal.id}/review`, { decision, note: reviewNote.trim(), expectedRevision: proposal.revision, requestKey: crypto.randomUUID() }, 'PATCH');
      });
      setReviewOpenId(''); setReviewNote('');
    } catch (e) { setReviewError((e as Error).message); }
  }

  // Internal assignment requires an explicit manager confirmation + risk note before any
  // reservation is written; development/external paths need no extra confirmation beyond
  // the HR approval that already happened in review().
  async function submitExecute(proposal: SkillBridgeProposal) {
    if (proposal.path === 'internal_assignment' && (!managerConfirmedBy.trim() || !riskAcknowledgement.trim())) {
      setExecuteError('内部调配须填写主管确认人与风险说明，不允许未经确认直接调配');
      return;
    }
    setExecuteError('');
    try {
      await act(async () => {
        await request(`${sbBase}/proposals/${proposal.id}/execute`, {
          expectedRevision: proposal.revision, requestKey: crypto.randomUUID(),
          ...(proposal.path === 'internal_assignment' ? { managerConfirmedBy: managerConfirmedBy.trim(), riskAcknowledgement: riskAcknowledgement.trim() } : {}),
        });
      });
      setExecuteOpenId(''); setManagerConfirmedBy(''); setRiskAcknowledgement('');
    } catch (e) { setExecuteError((e as Error).message); }
  }

  if (data.actor.role === 'employee') {
    return <><PageHeader title="SkillBridge · 能力供给分析" /><section className="v2-card"><EmptyState title="SkillBridge 由 HR 与主管使用" description="请切换为 HR 或主管演示身份查看能力缺口的供给路径分析。" /></section></>;
  }

  return <section className="sb-page">
    <PageHeader eyebrow="People-Lab · SkillBridge 第二阶段" title="SkillBridge · 能力供给分析"
      description="只读消费 Order2People 已确认需求：内部有没有合适的人？没有现成人选时谁具备可迁移技能？什么时候必须考虑外部招聘？"
      actions={data.actor.role === 'hr' && <button className="v2-button secondary compact" disabled={busy} onClick={() => void act(async () => { await request(`${sbBase}/demo/reset`, { requestKey: crypto.randomUUID() }); })}>载入内部人才演示样例</button>} />
    <p className="v2-notice"><IconShieldCheck size={17} />技能匹配基于已验证资格与人工证据，不使用大模型推理；培训完成或简历关键词不会被当作正式资格。</p>
    {error && <p role="alert" className="v2-form-error">{error}</p>}

    <div className="sb-grid">
      <article className="v2-card sb-demand-list">
        <div className="v2-card-header"><div><h2>1. 待解决的能力缺口</h2><p>仅显示已确认、完整且未过期的 Order2People 需求</p></div></div>
        {!openGapLines.length && <div className="v2-empty"><EmptyState title="暂无可处理的能力缺口" description="请先在生产需求页面完成计算并由 HR 确认结果；blocked/stale 结果不会出现在此处。" action={{ label: '前往生产需求与能力诊断', onClick: () => navigate({ page: 'order2people' }) }} /></div>}
        <div className="sb-demand-rows">
          {openGapLines.map(({ calculation, line }) => {
            const fullDemandId = `${calculation.id}:${line.demandId}`;
            const existingCase = cases.find((c) => c.demandId === fullDemandId);
            return <div className="sb-demand-row" key={fullDemandId}>
              <div><strong>{line.operationId}</strong><small>{line.positionId} · 缺口 {hours(line.gapSeconds || 0)}</small><small>{line.requirements.map((r) => `${r.skillId} ≥ L${r.minLevel}`).join('；')}</small></div>
              {existingCase ? <button className="v2-button secondary compact" disabled={busy} onClick={() => { setActiveCaseId(existingCase.id); navigate({ page: 'skillbridge', caseId: existingCase.id }); }}>查看分析<IconArrowRight size={14} /></button>
                : data.actor.role === 'hr' ? <button className="v2-button primary compact" disabled={busy} onClick={() => void openCase(calculation.id, line)}>发起 SkillBridge 分析<IconArrowRight size={14} /></button>
                  : <StatusBadge tone="gray">待 HR 发起</StatusBadge>}
            </div>;
          })}
        </div>
      </article>

      {cases.length > 0 && <article className="v2-card sb-case-history">
        <div className="v2-card-header"><div><h2>已有分析记录</h2><p>包含上游已过期的历史分析，仅供查看</p></div></div>
        <div className="sb-demand-rows">
          {cases.map((c) => <div className="sb-demand-row sb-case-row" key={c.id}>
            <div><strong>{c.demandSnapshot.operationId}</strong><small>{c.demandSnapshot.positionId} · 分析时缺口 {hours(c.demandSnapshot.gapSeconds)}</small></div>
            {c.status === 'demand_stale' && <StatusBadge tone="red">上游已过期</StatusBadge>}
            <button className="v2-button secondary compact" disabled={busy} onClick={() => { setActiveCaseId(c.id); navigate({ page: 'skillbridge', caseId: c.id }); }}>打开记录<IconArrowRight size={14} /></button>
          </div>)}
        </div>
      </article>}

      {activeCase && <>
        {activeCase.status === 'demand_stale' && <div className="v2-form-error" role="alert"><IconAlertTriangle size={16} />上游 Order2People 结果已变化并过期，本分析仅供历史查看，不能继续作为调配、培养或招聘的执行依据。</div>}
        <article className="v2-card sb-candidates">
          <div className="v2-card-header"><div><h2>2 / 3. 内部人才与技能差距</h2><p>{activeCase.demandSnapshot.operationId} · {activeCase.demandSnapshot.positionId} · 缺口 {hours(activeCase.demandSnapshot.gapSeconds)}</p></div></div>
          {!activeCase.candidates.length && <p className="sb-muted">没有任何在职人员具备相关技能证据，内部无法形成可靠供给。</p>}
          {activeCase.candidates.map((candidate: InternalCandidate) => <details className="sb-candidate" key={candidate.employeeId}>
            <summary><span>{candidate.employeeName}{candidate.isDemoFixture && <StatusBadge tone="purple">演示虚构人员</StatusBadge>}</span><StatusBadge tone={classificationTones[candidate.classification]}>{classificationLabels[candidate.classification]}</StatusBadge></summary>
            <div className="sb-skillgaps">
              {candidate.skillGaps.map((gap, i) => <div className="sb-skillgap-row" key={i}>
                <div><strong>{gap.requirement.skillId}</strong><small>岗位要求 ≥ L{gap.requirement.minLevel} · {gap.requirement.qualificationTypeIds.join('、')}</small></div>
                <StatusBadge tone={matchTones[gap.matchKind]}>{matchLabels[gap.matchKind]}</StatusBadge>
                <div className="sb-evidence">{gap.evidenceRefs.length ? gap.evidenceRefs.map((e, j) => <p key={j}>{e.summary}</p>) : <p>无可用证据</p>}{gap.closingAction && <p className="sb-closing-action"><IconAlertTriangle size={13} />{gap.closingAction}</p>}</div>
              </div>)}
            </div>
            <div className="sb-capacity-note"><IconUsers size={14} />{candidate.capacity.note}{candidate.capacity.availableSecondsInWindow !== null && <strong> · 可用 {hours(candidate.capacity.availableSecondsInWindow)}</strong>}</div>
            {candidate.requiresManagerConfirmation.map((note, i) => <p className="sb-manager-note" key={i}><IconShieldCheck size={13} />{note}</p>)}
          </details>)}
        </article>

        <article className="v2-card sb-proposals">
          <div className="v2-card-header"><div><h2>4. 人才供给方案</h2><p>同一缺口的三类可选路径，均为可解释建议，不代表确定承诺</p></div></div>
          <div className="sb-proposal-list">
            {activeCase.proposals.map((proposal) => {
              const Icon = pathIcons[proposal.path];
              return <div className="sb-proposal" key={proposal.id}>
                <div className="sb-proposal-head"><Icon size={18} /><strong>{pathLabels[proposal.path]}</strong>{proposal.employeeId && <span>{activeCase.candidates.find((c) => c.employeeId === proposal.employeeId)?.employeeName || proposal.employeeId}</span>}<StatusBadge tone={proposalStatusTones[proposal.status]}>{proposalStatusLabels[proposal.status]}</StatusBadge></div>
                <p>{proposal.rationale.feasibilityNote}</p>
                <div className="sb-risks"><strong>风险与未知项</strong><ul>{proposal.rationale.risks.map((r, i) => <li key={i}>{r}</li>)}</ul></div>
                <p className="sb-next-action"><IconArrowRight size={14} />{proposal.rationale.nextAction}</p>
                {proposal.reviewedBy && <p className="sb-review-trail"><IconCheck size={13} />由 {proposal.reviewedBy} 于 {new Date(proposal.reviewedAt!).toLocaleString('zh-CN')} 审核：{proposal.reviewNote}</p>}
                <p className="sb-execution-trail"><StatusBadge tone={executionTones[proposal.execution.status]}>{executionLabels[proposal.execution.status]}</StatusBadge>{proposal.execution.status === 'executed' && <span> · {refTypeLabels[proposal.execution.refType!]} · 由 {proposal.execution.executedBy} 于 {new Date(proposal.execution.executedAt!).toLocaleString('zh-CN')} 执行</span>}</p>
                <div className="sb-proposal-actions">
                  {data.actor.role === 'hr' && proposal.status === 'draft' && activeCase.status !== 'demand_stale' && (reviewOpenId === proposal.id ? <div className="sb-review-form">
                    <textarea aria-label="审核说明" rows={2} value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="请填写审核依据，例如：已与主管确认原岗位容量" />
                    {reviewError && <p className="v2-form-error">{reviewError}</p>}
                    <div><button className="v2-button primary compact" disabled={busy} onClick={() => void submitReview(proposal, 'hr_approved')}>批准<IconCheck size={14} /></button><button className="v2-button secondary compact" disabled={busy} onClick={() => void submitReview(proposal, 'hr_rejected')}>拒绝<IconX size={14} /></button><button className="v2-button secondary compact" onClick={() => { setReviewOpenId(''); setReviewError(''); }}>取消</button></div>
                  </div> : <button className="v2-button secondary compact" onClick={() => { setReviewOpenId(proposal.id); setReviewNote(''); setReviewError(''); }}>HR 审核</button>)}

                  {/* Execution: only offered once HR has approved, and only once per proposal.
                      Internal assignment additionally requires an explicit manager risk form —
                      HR approval alone never implies a confirmed reassignment. */}
                  {data.actor.role === 'hr' && proposal.status === 'hr_approved' && proposal.execution.status === 'not_executed' && activeCase.status !== 'demand_stale' && (
                    executeOpenId === proposal.id ? <div className="sb-review-form">
                      {proposal.path === 'internal_assignment' && <>
                        <label>主管确认人<input aria-label="主管确认人" value={managerConfirmedBy} onChange={(e) => setManagerConfirmedBy(e.target.value)} placeholder="例如：周明远" /></label>
                        <textarea aria-label="风险与原岗位影响说明" rows={2} value={riskAcknowledgement} onChange={(e) => setRiskAcknowledgement(e.target.value)} placeholder="须说明已确认原岗位任务不受影响，不允许未经确认直接调配" />
                      </>}
                      {executeError && <p className="v2-form-error">{executeError}</p>}
                      <div><button className="v2-button primary compact" disabled={busy} onClick={() => void submitExecute(proposal)}>确认执行<IconBolt size={14} /></button><button className="v2-button secondary compact" onClick={() => { setExecuteOpenId(''); setExecuteError(''); }}>取消</button></div>
                    </div> : <button className="v2-button primary compact" onClick={() => { setExecuteOpenId(proposal.id); setManagerConfirmedBy(''); setRiskAcknowledgement(''); setExecuteError(''); }}>执行方案<IconBolt size={14} /></button>
                  )}

                  {/* Once executed, link straight to the real record instead of a generic page. */}
                  {proposal.execution.status === 'executed' && proposal.path === 'development_plan' && <button className="v2-button secondary compact" onClick={() => navigate({ page: 'training', taskId: proposal.execution.refId ?? undefined, employeeId: proposal.employeeId ?? undefined })}>查看已创建的培训任务<IconArrowUpRight size={14} /></button>}
                  {proposal.execution.status === 'executed' && proposal.path === 'external_requisition' && <button className="v2-button secondary compact" onClick={() => navigate({ page: 'recruitment', stage: 'all' })}>前往招聘工作台查看需求草稿<IconArrowUpRight size={14} /></button>}
                  {proposal.execution.status === 'executed' && proposal.path === 'internal_assignment' && <button className="v2-button secondary compact" onClick={() => navigate({ page: 'order2people' })}>前往生产需求查看占用与重新计算<IconArrowUpRight size={14} /></button>}
                </div>
              </div>;
            })}
          </div>
        </article>

        <article className="v2-card sb-review-status">
          <div className="v2-card-header"><div><h2>5. HR 审核状态与下一步</h2><p>方案状态与审核记录持久化保存，刷新页面不会丢失</p></div></div>
          <ul className="sb-status-summary">
            {activeCase.proposals.map((p) => <li key={p.id}><StatusBadge tone={proposalStatusTones[p.status]}>{proposalStatusLabels[p.status]}</StatusBadge><span>{pathLabels[p.path]}{p.employeeId ? ` · ${activeCase.candidates.find((c) => c.employeeId === p.employeeId)?.employeeName || p.employeeId}` : ''}</span></li>)}
          </ul>
          <p className="sb-muted">需求编号：{activeCase.demandId} · 计算编号：{activeCase.calculationId}</p>
        </article>
      </>}
    </div>
  </section>;
}

export default SkillBridgePage;
