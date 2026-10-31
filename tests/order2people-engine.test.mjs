import test from 'node:test';
import assert from 'node:assert/strict';
import { calculate, availableSeconds } from '../server/order2people-engine.mjs';
import { fixture, window } from './order2people-fixture.mjs';
test('golden: 10h demand, 8h qualified allocation, 2h gap, no hiring count', () => { const r = calculate(fixture()); assert.equal(r.status, 'calculated'); assert.deepEqual(r.totals, { demandSeconds: 36000, allocatedSeconds: 28800, gapSeconds: 7200, referencePeople: null }); });
test('missing standard or unknown capacity blocks definitive totals', () => { for (const change of [i => { delete i.routings[0].operations[0].secondsPerUnit; }, i => { i.calendars[0].reservationsComplete = false; }]) {
    const i = fixture();
    change(i);
    const r = calculate(i);
    assert.equal(r.status, 'blocked');
    assert.equal(r.totals.gapSeconds, null);
    assert.equal(r.lines[0].gapSeconds, null);
} });
test('unqualified, revoked and expired workers supply zero', () => { for (const change of [i => { i.qualifications = []; }, i => { i.qualifications[0].status = 'revoked'; }, i => { i.qualifications[0].validWindow = { ...window, end: window.start }; }]) {
    const i = fixture();
    change(i);
    assert.equal(calculate(i).totals.gapSeconds, 36000);
} });
test('same worker cannot supply two skills twice; residual flow finds non-greedy optimum', () => { const i = fixture(); i.orders[0].quantity = 80; i.dailyDemands[0].quantity = 80; const op = structuredClone(i.routings[0].operations[0]); op.operationId = 'opB'; op.requirements[0].skillId = 'B'; i.routings[0].operations.push(op); i.dailyDemands.push({ ...i.dailyDemands[0], id: 'e', operationId: 'opB' }); i.qualifications.push({ ...i.qualifications[0], id: 'qb', skillId: 'B' }); assert.equal(calculate(i).totals.allocatedSeconds, 28800); assert.equal(calculate(i).totals.gapSeconds, 28800); i.employees.push({ id: 'two', status: 'active' }); i.calendars.push({ ...i.calendars[0], employeeId: 'two' }); i.qualifications.push({ ...i.qualifications[0], id: 'q2', employeeId: 'two' }); const r = calculate(i); assert.equal(r.totals.gapSeconds, 0); assert.equal(r.allocations.find(a => a.demandId === 'e').employeeId, 'one'); assert.deepEqual(r, calculate(i)); });
test('overlapping absence/reservation deducted once and own orders excluded', () => { const i = fixture(), c = i.calendars[0]; const block = { start: window.start, end: '2026-11-02T11:00:00+08:00' }; c.absenceIntervals = [{ start: window.start, end: '2026-11-02T09:00:00+08:00' }]; assert.equal(availableSeconds(c, [{ window: block, sourceOrderId: null }], window, []), 18000); assert.equal(availableSeconds({ ...c, absenceIntervals: [] }, [{ window: block, sourceOrderId: 'order' }], window, ['order']), 28800); });
test('batch preparation uses integer seconds and explicit rounding', () => { const i = fixture(); i.orders[0].quantity = 120; i.dailyDemands[0].quantity = 120; i.dailyDemands[0].batchCount = 3; Object.assign(i.routings[0].operations[0], { batchSize: 50, setupSecondsPerBatch: 600 }); assert.equal(calculate(i).totals.demandSeconds, 45000); });
test('invalid daily input is a field error rather than a server exception', () => { for (const change of [i => i.dailyDemands.push(null), i => i.dailyDemands[0].date = '2026-02-30', i => i.dailyDemands[0].quantity = -1, i => i.dailyDemands[0].window.end = 'bad', i => i.dailyDemands.push(i.dailyDemands[0])]) {
    const i = fixture();
    change(i);
    assert.throws(() => calculate(i), e => e.status === 400 && e.code === 'INVALID_INPUT');
} });
test('unresolved routing and empty scope block totals', () => { for (const change of [i => i.routings = [], i => { i.orders = []; i.dailyDemands = []; }]) {
    const i = fixture();
    change(i);
    assert.equal(calculate(i).totals.gapSeconds, null);
} });
test('qualification expiring midway blocks rather than claiming a definite full gap', () => { const i = fixture(); i.qualifications[0].validWindow.end = '2026-11-02T12:00:00+08:00'; assert.equal(calculate(i).status, 'blocked'); });
test('pinned historical routing stays reproducible', () => { const i = fixture(); const original = structuredClone(i.routings[0]); i.routings[0].revision = 2; i.routings[0].operations[0].secondsPerUnit = 999; i.routings[0].history = [original]; assert.equal(calculate(i).totals.demandSeconds, 36000); });
test('different operation windows share capacity without borrowing unavailable hours', () => { const i = fixture(); i.orders[0].quantity = 60; i.dailyDemands[0].quantity = 60; i.dailyDemands[0].window.end = '2026-11-02T12:00:00+08:00'; const op = JSON.parse(JSON.stringify(i.routings[0].operations[0])); op.operationId = 'other'; i.routings[0].operations.push(op); i.dailyDemands.push({ ...i.dailyDemands[0], id: 'other', operationId: 'other', window: { start: '2026-11-02T12:00:00+08:00', end: window.end } }); const r = calculate(i); assert.equal(r.status, 'calculated'); assert.equal(r.totals.allocatedSeconds, 28800); assert.equal(r.totals.gapSeconds, 14400); assert.equal(r.lines[0].allocatedSeconds, 14400); });
test('capacity overview is clipped to analysis window, not the whole shift', () => { const i = fixture(); i.scope.window.end = '2026-11-02T12:00:00+08:00'; i.orders[0].window.end = i.scope.window.end; i.dailyDemands[0].window.end = i.scope.window.end; const r = calculate(i); assert.equal(r.status, 'calculated'); assert.equal(r.capacities[0].availableSeconds, 14400); assert.equal(r.totals.allocatedSeconds, 14400); assert.equal(r.totals.gapSeconds, 21600); });
