import test from 'node:test';
import assert from 'node:assert/strict';
import { findInternalCandidates, buildPathRationales } from '../server/skillbridge-engine.mjs';
import { fixture } from './order2people-fixture.mjs';
const analyse = (edit = () => {}) => {
  const i = fixture(); edit(i);
  const demand = { ...i.dailyDemands[0], requirements: i.routings[0].operations[0].requirements, gapSeconds: 7200 };
  return findInternalCandidates(demand, { ...i, trainingTasks: [], demoEmployeeIds: new Set(), allocations: [{ employeeId: 'one', date: '2026-11-02', allocatedSeconds: 28800 }] });
};
test('baseline allocated 8h is not incremental supply', () => {
  const candidates = analyse();
  assert.equal(candidates[0].capacity.availableSecondsInWindow, 0);
  assert.ok(!buildPathRationales({ gapSeconds: 7200, window: fixture().scope.window }, candidates).some(p => p.feasibilityNote.includes('仍有余量')));
});
for (const [name, edit] of [
  ['starts late', q => q.validWindow.start = '2026-11-02T09:00:00+08:00'],
  ['ends early', q => q.validWindow.end = '2026-11-02T15:00:00+08:00'],
  ['expired', q => q.validWindow.end = '2026-11-01T23:59:59+08:00'],
  ['revoked', q => q.status = 'revoked'],
  ['unverified', q => q.status = 'unverified'],
  ['low level', q => q.level = 0],
  ['missing source', q => delete q.source],
]) test(`qualification ${name} cannot execute`, () => assert.notEqual(analyse(i => edit(i.qualifications[0]))[0]?.classification, 'qualified_verified'));
test('all required qualification types must cover window', () => assert.notEqual(analyse(i => i.routings[0].operations[0].requirements[0].qualificationTypeIds.push('other'))[0].classification, 'qualified_verified'));
test('complete qualification remains verified', () => assert.equal(analyse()[0].classification, 'qualified_verified'));
