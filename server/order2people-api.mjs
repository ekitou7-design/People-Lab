import { demoInput, demoEmployee } from './order2people-demo.mjs';
import { Router } from 'express';
import { randomUUID, createHash } from 'node:crypto';
import { validateRecord as validate } from './order2people-records.mjs';
import { validDate } from './order2people-validation.mjs';
import { calculate } from './order2people-engine.mjs';
const collections = ['orders', 'routings', 'qualifications', 'calendars', 'reservations'];
const fail = (status, code, message) => { throw Object.assign(new Error(message), { status, code }); };
const check = (v, message) => { if (!v)
    fail(400, 'INVALID_INPUT', message); };
const hash = v => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const initial = () => Object.fromEntries([...collections, 'calculations'].map(k => [k, []]));
export function order2peopleRouter(store) {
    const api = Router();
    api.use((req, _res, next) => { if (!['actor-hr', 'actor-manager'].includes(req.actor.id))
        fail(403, 'FORBIDDEN', '当前身份未获 demo 场地授权'); next(); });
    const effectiveInputs = (s, state) => {
        const orders = s.orders.filter(o => o.status !== 'cancelled');
        const used = new Set(orders.map(o => o.routingId));
        return { orders: s.orders, routings: s.routings.filter(r => used.has(r.id)), qualifications: s.qualifications, calendars: s.calendars, reservations: s.reservations, employees: state.employees.filter(e => e.status === 'active').map(e => ({ id: e.id, status: e.status })).sort((a, b) => a.id.localeCompare(b.id)) };
    };
    const invalidate = (s, state) => { const current = hash(effectiveInputs(s, state)); for (const c of s.calculations)
        if (c.dependencyHash !== current)
            c.stale = true; return s; };
    const read = () => { const state = store.read(); return invalidate(state.order2people || initial(), state); };
    const mutate = (req, operation, fn) => { check(typeof req.body?.requestKey === 'string' && req.body.requestKey.length > 0, '缺少 requestKey'); return store.transaction(state => { state.order2people ??= initial(); invalidate(state.order2people, state); return fn(state.order2people, state); }, { actorId: req.actor.id, operation, key: req.body.requestKey, payload: req.body }); };
    const lookup = (s, kind, id) => { const v = s[kind].find(v => v.id === id); if (!v)
        fail(404, 'NOT_FOUND', '记录不存在'); return v; };
    for (const kind of collections) {
        api.get(`/${kind}`, (req, res) => {
            if (req.query.siteId && req.query.siteId !== 'demo')
                fail(403, 'FORBIDDEN', '未授权场地');
            const { from, to, cursor, limit } = req.query;
            check((from === undefined || validDate(from)) && (to === undefined || validDate(to)), '筛选日期无效');
            check(!from || !to || from <= to, '筛选日期范围无效');
            let items = read()[kind];
            if (kind === 'calendars')
                items = items.filter(v => (!from || v.date >= from) && (!to || v.date <= to));
            if (kind === 'reservations')
                items = items.filter(v => (!from || Date.parse(v.window.end) > Date.parse(`${from}T00:00:00+08:00`)) && (!to || Date.parse(v.window.start) < Date.parse(`${to}T00:00:00+08:00`) + 86400000));
            const offset = cursor === undefined ? 0 : Number(cursor), size = limit === undefined ? items.length || 1 : Number(limit);
            check(Number.isSafeInteger(offset) && offset >= 0 && Number.isSafeInteger(size) && size > 0, '分页参数无效');
            res.json({ items: items.slice(offset, offset + size), nextCursor: offset + size < items.length ? String(offset + size) : null });
        });
        api.get(`/${kind}/:id`, (req, res) => { const s = read(), v = lookup(s, kind, req.params.id); if (req.query.revision && Number(req.query.revision) !== v.revision) {
            const old = v.history?.find(h => h.revision === Number(req.query.revision));
            if (!old)
                fail(404, 'NOT_FOUND', '版本不存在');
            return res.json(old);
        } res.json(v); });
        api.post(`/${kind}`, (req, res) => res.status(201).json(mutate(req, `create-${kind}`, (s, state) => { const { requestKey, history, createdBy, createdAt, revision, ...body } = req.body; const v = { ...body, id: body.id || randomUUID(), revision: 1, createdBy: req.actor.id, createdAt: new Date().toISOString() }; check(!s[kind].some(x => x.id === v.id), '重复 ID'); validate(kind, v, state); if (kind === 'calendars')
            check(!s.calendars.some(c => c.employeeId === v.employeeId && c.siteId === v.siteId && c.date === v.date), '同一人员日期已有日历，请更新原记录'); s[kind].push(v); invalidate(s, state); return v; })));
        api.patch(`/${kind}/:id`, (req, res) => res.json(mutate(req, `update-${kind}:${req.params.id}`, (s, state) => { const old = lookup(s, kind, req.params.id); if (old.revision !== req.body.expectedRevision)
            fail(409, 'REVISION_CONFLICT', '输入已更新，请重新加载'); check(req.body.reason && req.body.patch, '须提供修改内容与原因'); check(typeof req.body.patch === 'object' && !Array.isArray(req.body.patch), 'patch 须为对象'); const { history, ...previous } = old; const { id, revision, createdBy, createdAt, history: ignoredHistory, ...patch } = req.body.patch; const v = { ...previous, ...patch, id: old.id, revision: old.revision + 1, history: [...(history || []), previous], updatedBy: req.actor.id, reason: req.body.reason }; validate(kind, v, state); if (kind === 'calendars')
            check(!s.calendars.some(c => c.id !== v.id && c.employeeId === v.employeeId && c.siteId === v.siteId && c.date === v.date), '同一人员日期已有日历'); s[kind][s[kind].indexOf(old)] = v; invalidate(s, state); return v; })));
    }
    api.post('/demo/reset', (req, res) => {
        if (req.actor.role !== 'hr')
            fail(403, 'FORBIDDEN', '仅 HR 可恢复演示样例');
        res.json(mutate(req, 'demo-reset', (s, state) => {
            const sample = demoInput(req.actor.id);
            if (!state.employees.some(e => e.id === demoEmployee.id))
                state.employees.push(structuredClone(demoEmployee));
            for (const kind of collections) {
                for (const record of sample[kind]) {
                    const old = s[kind].find(v => v.id === record.id);
                    if (old && old.source?.sourceId !== 'o2p-demo')
                        fail(409, 'REVISION_CONFLICT', '演示 ID 已被其他数据占用，未覆盖');
                    const v = { ...record, revision: (old?.revision || 0) + 1, createdBy: req.actor.id, createdAt: new Date().toISOString() };
                    if (kind === 'orders')
                        v.routingRevision = (s.routings.find(r => r.id === v.routingId)?.revision || 0) + 1;
                    if (old) {
                        const { history, ...previous } = old;
                        v.history = [...(history || []), previous];
                        s[kind][s[kind].indexOf(old)] = v;
                    }
                    else
                        s[kind].push(v);
                }
            }
            invalidate(s, state);
            return { scope: sample.scope, dailyDemands: sample.dailyDemands, message: '演示样例已恢复为新版本，保留历史及其他记录' };
        }));
    });
    api.get('/calculations', (req, res) => res.json({ items: read().calculations.map(c => ({ ...c, status: c.stale ? 'stale' : c.status })), nextCursor: null }));
    api.post('/calculations', (req, res) => res.status(201).json(mutate(req, 'calculate', (s, state) => {
        const { scope, dailyDemands, expectedInputRevisions } = req.body;
        check(scope?.siteId === 'demo' && Array.isArray(dailyDemands), '须提供 demo 场地范围与每日工序');
        check(dailyDemands.every(d => d && typeof d === 'object'), '每日需求必须为对象');
        check(new Set(dailyDemands.map(d => d.id)).size === dailyDemands.length, '需求 ID 重复');
        const revisions = Object.fromEntries(collections.map(k => [k, s[k].map(v => ({ id: v.id, revision: v.revision }))]));
        if (hash(revisions) !== hash(expectedInputRevisions))
            fail(409, 'REVISION_CONFLICT', '输入版本已变化，请重新加载');
        const confirmedScope = { ...scope, confirmedBy: req.actor.id, confirmedAt: new Date().toISOString() };
        const input = { scope: confirmedScope, dailyDemands, ...Object.fromEntries(collections.map(k => [k, s[k]])), employees: state.employees };
        const result = { ...calculate(input), id: randomUUID(), revision: 1, inputHash: hash(input), dependencyHash: hash(effectiveInputs(s, state)), inputRevisions: revisions, inputSnapshot: structuredClone(input), createdBy: req.actor.id, createdAt: new Date().toISOString(), confirmedBy: null, confirmedAt: null };
        s.calculations.push(result);
        return result;
    })));
    api.get('/calculations/:id', (req, res) => { const c = lookup(read(), 'calculations', req.params.id); res.json({ ...c, status: c.stale ? 'stale' : c.status }); });
    api.post('/calculations/:id/confirm', (req, res) => { if (req.actor.role !== 'hr')
        fail(403, 'FORBIDDEN', '仅 HR 可确认'); res.json(mutate(req, `confirm:${req.params.id}`, s => { const c = lookup(s, 'calculations', req.params.id); if (c.stale)
        fail(409, 'STALE_RESULT', '结果已过期'); if (c.revision !== req.body.expectedRevision || c.inputHash !== req.body.expectedInputHash)
        fail(409, 'REVISION_CONFLICT', '结果版本冲突'); if (c.status !== 'calculated')
        fail(409, 'RESULT_NOT_EXPORTABLE', '须先完成有效计算'); c.status = 'confirmed'; c.revision++; c.confirmedBy = req.actor.id; c.confirmedAt = new Date().toISOString(); return c; })); });
    api.get('/calculations/:id/skillbridge-demands', (req, res) => { if (req.actor.role !== 'hr')
        fail(403, 'FORBIDDEN', '仅 HR 可导出'); const c = lookup(read(), 'calculations', req.params.id); if (c.stale || c.status !== 'confirmed' || c.completeness !== 'complete')
        fail(409, 'RESULT_NOT_EXPORTABLE', '仅可导出已确认且未过期的完整结果'); res.json({ schemaVersion: c.schemaVersion, calculationId: c.id, demands: c.lines.filter(l => l.gapSeconds > 0).map(l => ({ schemaVersion: c.schemaVersion, demandId: `${c.id}:${l.demandId}`, calculationId: c.id, inputHash: c.inputHash, engineVersion: c.engineVersion, orderRef: l.orderRef, operationId: l.operationId, positionId: l.positionId, requirements: l.requirements, window: l.window, gapSeconds: l.gapSeconds, sourceRefs: l.sourceRefs, assumptions: c.assumptions, confirmedBy: c.confirmedBy, confirmedAt: c.confirmedAt })) }); });
    return api;
}
