import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { findInternalCandidates, buildPathRationales } from './skillbridge-engine.mjs';
import { skillbridgeDemoEmployee, skillbridgeDemoQualification, skillbridgeDemoCalendar } from './skillbridge-demo.mjs';

const fail = (status, code, message) => { throw Object.assign(new Error(message), { status, code }); };
const check = (v, message) => { if (!v) fail(400, 'INVALID_INPUT', message); };
const initial = () => ({ cases: [] });
const o2pCollections = ['orders', 'routings', 'qualifications', 'calendars', 'reservations'];
const o2pInitial = () => Object.fromEntries([...o2pCollections, 'calculations'].map((k) => [k, []]));

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

  const read = () => { const state = store.read(); return { state, sb: state.skillbridge || initial() }; };
  const mutate = (req, operation, fn) => {
    check(typeof req.body?.requestKey === 'string' && req.body.requestKey.length > 0, '缺少 requestKey');
    return store.transaction((state) => {
      state.skillbridge ??= initial();
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
        rationale, status: 'draft', reviewedBy: null, reviewedAt: null, reviewNote: null,
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
    const result = mutate(req, `review-proposal:${req.params.id}`, (sb) => {
      for (const c of sb.cases) {
        const proposal = c.proposals.find((p) => p.id === req.params.id);
        if (!proposal) continue;
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

  return api;
}
