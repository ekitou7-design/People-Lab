import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { findInternalCandidates, buildPathRationales } from './skillbridge-engine.mjs';
import { skillbridgeDemoEmployee, skillbridgeDemoQualification, skillbridgeDemoCalendar } from './skillbridge-demo.mjs';
import { validateRecord as validateO2pRecord } from './order2people-records.mjs';
import { position } from './catalog.mjs';

const fail = (status, code, message) => { throw Object.assign(new Error(message), { status, code }); };
const check = (v, message) => { if (!v) fail(400, 'INVALID_INPUT', message); };
const initial = () => ({ cases: [], requisitions: [] });
const o2pCollections = ['orders', 'routings', 'qualifications', 'calendars', 'reservations'];
const o2pInitial = () => Object.fromEntries([...o2pCollections, 'calculations'].map((k) => [k, []]));
const noExecution = () => ({ status: 'not_executed', refType: null, refId: null, executedBy: null, executedAt: null, note: null });

/**
 * SkillBridge only reads Order2People's own aggregate (orders/routings/qualifications/
 * calendars/reservations/calculations) and HR-V2's employees/trainingTasks. It never
 * writes into state.order2people or recalculates anything there.
 */
export function skillbridgeRouter(store) {
  const api = Router();
  api.use((req, _res, next) => {
    if (!['actor-hr', 'actor-manager'].includes(req.actor.id)) fail(403, 'FORBIDDEN', '当前身份未获 demo 场地授权');
    next();
  });

  // Defensive defaults so cases/proposals created before `requisitions`/`execution` existed
  // still read as valid shapes rather than throwing — never a silent data loss.
  const read = () => {
    const state = store.read();
    const sb = state.skillbridge || initial();
    sb.requisitions ??= [];
    for (const c of sb.cases) for (const p of c.proposals) p.execution ??= noExecution();
    return { state, sb };
  };
  const mutate = (req, operation, fn) => {
    check(typeof req.body?.requestKey === 'string' && req.body.requestKey.length > 0, '缺少 requestKey');
    return store.transaction((state) => {
      state.skillbridge ??= initial();
      state.skillbridge.requisitions ??= [];
      for (const c of state.skillbridge.cases) for (const p of c.proposals) p.execution ??= noExecution();
      return fn(state.skillbridge, state);
    }, { actorId: req.actor.id, operation, key: req.body.requestKey, payload: req.body });
  };
  const lookupCase = (sb, id) => {
    const c = sb.cases.find((item) => item.id === id);
    if (!c) fail(404, 'NOT_FOUND', '分析记录不存在');
    return c;
  };

  /**
   * Resolve one demand line from Order2People's own export logic and re-validate every
   * gating condition (confirmed + complete + non-stale) using the live calculation record
   * — never trusting a client-provided copy of the demand. Mirrors order2people-api.mjs's
   * own invalidate()/stale check so SkillBridge cannot outlive a stale upstream snapshot.
   */
  function resolveDemand(state, calculationId, demandId) {
    const o2p = state.order2people;
    if (!o2p) fail(404, 'NOT_FOUND', 'Order2People 尚无计算记录');
    const calculation = o2p.calculations.find((c) => c.id === calculationId);
    if (!calculation) fail(404, 'NOT_FOUND', '计算记录不存在');
    const stale = calculation.stale === true;
    if (stale || calculation.status !== 'confirmed' || calculation.completeness !== 'complete') {
      fail(409, 'RESULT_NOT_EXPORTABLE', '仅可基于已确认、完整且未过期的 Order2People 计算结果发起分析');
    }
    const line = calculation.lines.find((l) => `${calculation.id}:${l.demandId}` === demandId || l.demandId === demandId);
    if (!line || !(line.gapSeconds > 0)) fail(404, 'NOT_FOUND', '该需求编号不存在或当前无能力缺口');
    return { calculation, line };
  }

  function isCalculationStillValid(state, calculationId) {
    const o2p = state.order2people;
    const calculation = o2p?.calculations.find((c) => c.id === calculationId);
    return !!calculation && calculation.stale !== true && calculation.status === 'confirmed' && calculation.completeness === 'complete';
  }

  function demoEmployeeIds(state) {
    return new Set(state.employees.filter((e) => e.id === 'emp-o2p-demo' || e.id === 'emp-skillbridge-demo').map((e) => e.id));
  }

  // GET /cases?calculationId= — list existing cases, optionally filtered; each item's
  // status is recomputed live (demand_stale) against the current Order2People snapshot,
  // same pattern as order2people-api.mjs's stale override on read.
  api.get('/cases', (req, res) => {
    const { state, sb } = read();
    let items = sb.cases;
    if (req.query.calculationId) items = items.filter((c) => c.calculationId === req.query.calculationId);
    const withStatus = items.map((c) => ({ ...c, status: isCalculationStillValid(state, c.calculationId) ? c.status : 'demand_stale' }));
    res.json({ items: withStatus, nextCursor: null });
  });

  api.get('/cases/:id', (req, res) => {
    const { state, sb } = read();
    const c = lookupCase(sb, req.params.id);
    res.json({ ...c, status: isCalculationStillValid(state, c.calculationId) ? c.status : 'demand_stale' });
  });

  /**
   * POST /demo/reset — HR only. Adds the SkillBridge-specific fixtures (one labeled
   * demo employee with an adjacent skill but unverified qualification, plus a calendar
   * with free capacity) alongside whatever Order2People data already exists. Never
   * deletes or rewrites existing orders/routings/calculations; only ensures the
   * SkillBridge demo employee + qualification + calendar rows exist as new revisions.
   * Does not call into order2people-api.mjs; writes the same shared state.order2people
   * shape directly, exactly as a client POST to those existing endpoints would.
   */
  api.post('/demo/reset', (req, res) => {
    if (req.actor.role !== 'hr') fail(403, 'FORBIDDEN', '仅 HR 可恢复演示样例');
    res.json(mutate(req, 'skillbridge-demo-reset', (sb, state) => {
      state.order2people ??= o2pInitial();
      const o2p = state.order2people;
      if (!state.employees.some((e) => e.id === skillbridgeDemoEmployee.id)) {
        state.employees.push(structuredClone(skillbridgeDemoEmployee));
      }
      const qualification = skillbridgeDemoQualification(req.actor.id);
      const calendar = skillbridgeDemoCalendar(req.actor.id);
      for (const [kind, record] of [['qualifications', qualification], ['calendars', calendar]]) {
        const old = o2p[kind].find((v) => v.id === record.id);
        if (old && old.source?.sourceId !== 'skillbridge-demo') fail(409, 'REVISION_CONFLICT', '演示 ID 已被其他数据占用，未覆盖');
        const v = { ...record, revision: (old?.revision || 0) + 1, createdBy: req.actor.id, createdAt: new Date().toISOString() };
        if (old) {
          const { history, ...previous } = old;
          v.history = [...(history || []), previous];
          o2p[kind][o2p[kind].indexOf(old)] = v;
        } else o2p[kind].push(v);
      }
      return { employeeId: skillbridgeDemoEmployee.id, message: 'SkillBridge 演示人员及技能证据已恢复为新版本，保留历史及其他记录' };
    }));
  });

  // POST /cases — HR only; opens a new analysis for one Order2People demand line.
  api.post('/cases', (req, res) => {
    if (req.actor.role !== 'hr') fail(403, 'FORBIDDEN', '仅 HR 可发起 SkillBridge 分析');
    const { calculationId, demandId } = req.body || {};
    check(typeof calculationId === 'string' && calculationId.length > 0, '须提供计算编号');
    check(typeof demandId === 'string' && demandId.length > 0, '须提供需求编号');
    const result = mutate(req, 'create-case', (sb, state) => {
      const { calculation, line } = resolveDemand(state, calculationId, demandId);
      const fullDemandId = `${calculation.id}:${line.demandId}`;
      const existing = sb.cases.find((c) => c.calculationId === calculationId && c.demandId === fullDemandId);
      if (existing) return existing;
      const demand = { ...line, window: line.window };
      const candidates = findInternalCandidates(demand, {
        employees: state.employees,
        qualifications: state.order2people.qualifications,
        trainingTasks: state.trainingTasks,
        calendars: state.order2people.calendars,
        reservations: state.order2people.reservations,
        demoEmployeeIds: demoEmployeeIds(state),
      });
      const proposals = buildPathRationales(demand, candidates).map((rationale) => ({
        id: randomUUID(), revision: 1, caseId: null, path: rationale.path, employeeId: rationale.employeeId || null,
        rationale, status: 'draft', reviewedBy: null, reviewedAt: null, reviewNote: null, execution: noExecution(),
        createdBy: req.actor.id, createdAt: new Date().toISOString(),
      }));
      const record = {
        id: randomUUID(), revision: 1, calculationId: calculation.id, demandId: fullDemandId,
        demandSnapshot: {
          positionId: line.positionId, operationId: line.operationId, requirements: line.requirements,
          window: line.window, gapSeconds: line.gapSeconds, sourceRefs: line.sourceRefs,
          inputHash: calculation.inputHash, engineVersion: calculation.engineVersion,
        },
        status: 'open', candidates, proposals: proposals.map((p) => ({ ...p, caseId: null })),
        createdBy: req.actor.id, createdAt: new Date().toISOString(),
      };
      record.proposals = record.proposals.map((p) => ({ ...p, caseId: record.id }));
      sb.cases.push(record);
      return record;
    });
    res.status(201).json(result);
  });

  // GET /cases/:id/candidates — convenience view of just the internal-candidate analysis.
  api.get('/cases/:id/candidates', (req, res) => {
    const { sb } = read();
    const c = lookupCase(sb, req.params.id);
    res.json({ caseId: c.id, candidates: c.candidates });
  });

  // PATCH /proposals/:id/review — HR only; records a human decision. Never mutates
  // Order2People data, never writes a TrainingTask/qualification, never auto-approves.
  api.patch('/proposals/:id/review', (req, res) => {
    if (req.actor.role !== 'hr') fail(403, 'FORBIDDEN', '仅 HR 可审核方案');
    const { decision, note, expectedRevision } = req.body || {};
    check(['hr_approved', 'hr_rejected'].includes(decision), '审核结果须为 hr_approved 或 hr_rejected');
    check(typeof note === 'string' && note.trim().length > 0, '须填写审核说明');
    const result = mutate(req, `review-proposal:${req.params.id}`, (sb, state) => {
      for (const c of sb.cases) {
        const proposal = c.proposals.find((p) => p.id === req.params.id);
        if (!proposal) continue;
        // Re-verify staleness server-side too; the frontend already hides the form, but the
        // API itself must not accept a review against a case whose upstream demand expired.
        if (!isCalculationStillValid(state, c.calculationId)) fail(409, 'DEMAND_STALE', '上游需求已过期，不能继续审核');
        if (proposal.revision !== expectedRevision) fail(409, 'REVISION_CONFLICT', '方案版本已更新，请重新加载');
        const { history, ...previous } = proposal;
        const updated = {
          ...previous, revision: proposal.revision + 1, status: decision,
          reviewedBy: req.actor.id, reviewedAt: new Date().toISOString(), reviewNote: note.trim(),
          history: [...(history || []), previous],
        };
        c.proposals[c.proposals.indexOf(proposal)] = updated;
        return updated;
      }
      fail(404, 'NOT_FOUND', '方案不存在');
    });
    res.json(result);
  });

  /**
   * POST /proposals/:id/execute — HR only. Turns an hr_approved proposal into a real,
   * persisted record in the owning module, with full traceability back to this proposal:
   *   - development_plan      -> new TrainingTask (Training workbench), kind 'development'.
   *   - external_requisition  -> new RecruitmentRequisition draft (Recruitment workbench).
   *   - internal_assignment   -> new Order2People CapacityReservation, but only after an
   *                              explicit manager risk/capacity confirmation is supplied in
   *                              the request body (never implied by the earlier HR review).
   * Never runs for a proposal that is not hr_approved, never runs twice (idempotent via the
   * proposal's own execution.status), and never runs against a stale case.
   */
  api.post('/proposals/:id/execute', (req, res) => {
    if (req.actor.role !== 'hr') fail(403, 'FORBIDDEN', '仅 HR 可执行方案');
    const { managerConfirmedBy, riskAcknowledgement, expectedRevision } = req.body || {};
    const result = mutate(req, `execute-proposal:${req.params.id}`, (sb, state) => {
      const c = sb.cases.find((item) => item.proposals.some((p) => p.id === req.params.id));
      if (!c) fail(404, 'NOT_FOUND', '方案不存在');
      const proposal = c.proposals.find((p) => p.id === req.params.id);
      if (proposal.execution?.status === 'executed') return { case: c, proposal };
      if (!isCalculationStillValid(state, c.calculationId)) {
        const { history, ...previous } = proposal;
        const blocked = { ...previous, execution: { status: 'blocked_stale', refType: null, refId: null, executedBy: null, executedAt: null, note: '上游需求已过期，不能继续执行' }, history: [...(history || []), previous] };
        c.proposals[c.proposals.indexOf(proposal)] = blocked;
        fail(409, 'DEMAND_STALE', '上游需求已过期，该方案不能继续执行');
      }
      check(typeof expectedRevision === 'number', '须提供方案当前版本号');
      if (proposal.revision !== expectedRevision) fail(409, 'REVISION_CONFLICT', '方案版本已更新，请重新加载');
      requireApproved(proposal);
      let refType, refId, note;
      if (proposal.path === 'development_plan') {
        ({ refType, refId, note } = createTrainingTask(state, c, proposal, req.actor));
      } else if (proposal.path === 'external_requisition') {
        ({ refType, refId, note } = createRequisition(sb, c, proposal, req.actor));
      } else {
        check(typeof managerConfirmedBy === 'string' && managerConfirmedBy.trim().length > 0, '内部调配须提供主管确认人');
        check(typeof riskAcknowledgement === 'string' && riskAcknowledgement.trim().length > 0, '内部调配须提供风险与原岗位影响说明，不允许未经确认直接调配');
        ({ refType, refId, note } = createAssignmentReservation(state, c, proposal, req.actor, managerConfirmedBy.trim(), riskAcknowledgement.trim()));
      }
      const { history, ...previous } = proposal;
      const updated = {
        ...previous, revision: proposal.revision + 1,
        execution: { status: 'executed', refType, refId, executedBy: req.actor.id, executedAt: new Date().toISOString(), note },
        history: [...(history || []), previous],
      };
      c.proposals[c.proposals.indexOf(proposal)] = updated;
      return { case: c, proposal: updated };
    });
    res.json(result.proposal);
  });

  // GET /requisitions — list recruitment-need drafts created from external_requisition proposals.
  api.get('/requisitions', (req, res) => {
    const { sb } = read();
    res.json({ items: sb.requisitions, nextCursor: null });
  });

  // PATCH /requisitions/:id — HR only; link a real candidate under review, or change status.
  // Never creates or invents a Candidate; only records which already-existing candidates HR
  // is evaluating against this need, and whether the need is still open.
  api.patch('/requisitions/:id', (req, res) => {
    if (req.actor.role !== 'hr') fail(403, 'FORBIDDEN', '仅 HR 可维护招聘需求草稿');
    const { status, linkedCandidateIds, expectedRevision } = req.body || {};
    const result = mutate(req, `update-requisition:${req.params.id}`, (sb, state) => {
      const requisition = sb.requisitions.find((r) => r.id === req.params.id);
      if (!requisition) fail(404, 'NOT_FOUND', '招聘需求草稿不存在');
      if (requisition.revision !== expectedRevision) fail(409, 'REVISION_CONFLICT', '需求草稿版本已更新，请重新加载');
      if (status !== undefined) check(['draft', 'open', 'closed'].includes(status), '状态须为 draft/open/closed');
      if (linkedCandidateIds !== undefined) {
        check(Array.isArray(linkedCandidateIds) && linkedCandidateIds.every((id) => state.candidates.some((cand) => cand.id === id)), '关联候选人须引用已存在的候选人');
      }
      const { history, ...previous } = requisition;
      const updated = {
        ...previous, revision: requisition.revision + 1,
        status: status ?? previous.status, linkedCandidateIds: linkedCandidateIds ?? previous.linkedCandidateIds,
        history: [...(history || []), previous],
      };
      sb.requisitions[sb.requisitions.indexOf(requisition)] = updated;
      return updated;
    });
    res.json(result);
  });

  function requireApproved(proposal) {
    if (proposal.status !== 'hr_approved') fail(409, 'PROPOSAL_NOT_APPROVED', '仅已批准的方案可以执行，请先完成 HR 审核');
  }

  /** development_plan -> one new TrainingTask, traceable back to the case/proposal. */
  function createTrainingTask(state, c, proposal, actor) {
    check(typeof proposal.employeeId === 'string', '内部培养方案须关联具体员工');
    const employee = state.employees.find((e) => e.id === proposal.employeeId && e.status === 'active');
    if (!employee) fail(404, 'NOT_FOUND', '员工档案不存在或未在职');
    const existing = state.trainingTasks.find((t) => t.skillBridgeProposalId === proposal.id);
    if (existing) return { refType: 'training_task', refId: existing.id, note: '已存在关联培训任务，未重复创建', employeeName: employee.name };
    const requirementSkillIds = c.demandSnapshot.requirements.map((r) => r.skillId);
    const ability = position.abilities.find((a) => requirementSkillIds.includes(a.id));
    const task = {
      id: `train-${employee.id}-sb-${c.id.slice(0, 8)}`, employeeId: employee.id, kind: 'development',
      title: `能力提升 · ${ability?.name || c.demandSnapshot.operationId}（SkillBridge）`,
      description: `来自 SkillBridge 分析 ${c.id.slice(0, 8)} 的内部培养方案：${proposal.rationale.feasibilityNote} 完成本任务不代表已自动取得岗位资格，仍需资格维护负责人核验并在 Order2People 更新正式资格记录。`,
      knowledgeId: 'sop-quality', status: 'not_started', attempts: [],
      skillBridgeCaseId: c.id, skillBridgeProposalId: proposal.id,
    };
    state.trainingTasks.push(task);
    return { refType: 'training_task', refId: task.id, note: `已创建培训任务「${task.title}」`, employeeName: employee.name };
  }

  /** external_requisition -> one new RecruitmentRequisition draft, never a fabricated Candidate. */
  function createRequisition(sb, c, proposal, actor) {
    const existing = sb.requisitions.find((r) => r.proposalId === proposal.id);
    if (existing) return { refType: 'requisition', refId: existing.id, note: '已存在关联招聘需求草稿，未重复创建' };
    const requisition = {
      id: randomUUID(), revision: 1, caseId: c.id, proposalId: proposal.id,
      positionId: c.demandSnapshot.positionId, operationId: c.demandSnapshot.operationId,
      skillRequirements: c.demandSnapshot.requirements, window: c.demandSnapshot.window, gapSeconds: c.demandSnapshot.gapSeconds,
      status: 'draft', note: proposal.rationale.feasibilityNote, linkedCandidateIds: [],
      createdBy: actor.id, createdAt: new Date().toISOString(),
    };
    sb.requisitions.push(requisition);
    return { refType: 'requisition', refId: requisition.id, note: `已创建招聘需求草稿 ${requisition.id.slice(0, 8)}` };
  }

  /**
   * internal_assignment -> one new Order2People CapacityReservation for the proposed employee,
   * covering the demand window. This genuinely commits capacity, so it correctly makes any
   * calculation depending on that employee's calendar stale on next read (same invalidate()
   * semantics order2people-api.mjs already applies) — an executed internal assignment must
   * retire the gap it was meant to close, not silently keep claiming free capacity elsewhere.
   */
  function createAssignmentReservation(state, c, proposal, actor, managerConfirmedBy, riskAcknowledgement) {
    check(typeof proposal.employeeId === 'string', '内部调配方案须关联具体员工');
    const employee = state.employees.find((e) => e.id === proposal.employeeId && e.status === 'active');
    if (!employee) fail(404, 'NOT_FOUND', '员工档案不存在或未在职');
    state.order2people ??= o2pInitial();
    const o2p = state.order2people;
    const existing = o2p.reservations.find((r) => r.source?.sourceId === proposal.id);
    if (existing) return { refType: 'capacity_reservation', refId: existing.id, note: '已存在关联容量占用记录，未重复创建', employeeName: employee.name };
    const window = c.demandSnapshot.window;
    const committedSeconds = Math.round((Date.parse(window.end) - Date.parse(window.start)) / 1000);
    const reservation = {
      id: `sb-assignment-${proposal.id}`, revision: 1, employeeId: employee.id, window, committedSeconds,
      sourceOrderId: null, status: 'active',
      source: {
        sourceType: 'skillbridge_assignment', sourceId: proposal.id, revision: 1,
        locator: `skillbridge:case:${c.id}:proposal:${proposal.id}`,
        confirmedBy: managerConfirmedBy, confirmedAt: new Date().toISOString(),
      },
      createdBy: actor.id, createdAt: new Date().toISOString(),
    };
    validateO2pRecord('reservations', reservation, state);
    o2p.reservations.push(reservation);
    return { refType: 'capacity_reservation', refId: reservation.id, note: `已为 ${employee.name} 创建容量占用（主管确认：${managerConfirmedBy}；风险说明：${riskAcknowledgement}），原计算结果将因此过期，须重新计算确认`, employeeName: employee.name };
  }

  return api;
}
