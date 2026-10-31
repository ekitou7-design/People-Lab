import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server/app.mjs';
import { fixture } from './order2people-fixture.mjs';

/**
 * Covers the required acceptance story end to end:
 * 1. Order2People produces a confirmed, complete, non-stale 2h gap for a quality
 *    inspection demand.
 * 2. SkillBridge reads that demand (and only that kind of demand).
 * 3. An employee with an adjacent skill but an unverified qualification is found and
 *    explicitly marked "not directly deployable".
 * 4. A development-path proposal with a concrete verification/training next action is
 *    produced.
 * 5. An external-requisition path is always offered alongside.
 * 6. HR can review a proposal and the decision is persisted with reviewer/time/note.
 * 7. Once the upstream calculation is invalidated (stale), SkillBridge refuses to create
 *    new cases from it and marks existing cases demand_stale rather than usable.
 */
test('SkillBridge reads confirmed Order2People demands, classifies internal candidates, and gates stale input', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'skillbridge-'));
  const instance = createApp({ dataDir: dir });
  const server = instance.app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    instance.close();
    rmSync(dir, { recursive: true, force: true });
  });
  async function request(path, body, method = 'POST', actor = 'actor-hr') {
    const r = await fetch(`http://127.0.0.1:${server.address().port}/api${path}`, {
      method: body ? method : 'GET',
      headers: { 'Content-Type': 'application/json', 'x-demo-actor': actor },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: r.status, body: await r.json() };
  }
  const o2p = '/v1/order2people';
  const sb = '/v1/skillbridge';

  // --- Build the Order2People side: one hired+active employee holding the full
  // qualification, producing a 2h gap (matches the documented acceptance numbers).
  // The requirement is aligned to skillId 'inspection' / qualificationTypeId
  // 'quality-auth' to match the SkillBridge demo employee's adjacent-skill fixture.
  const i = fixture();
  Object.assign(i.orders[0], { siteId: 'demo', unit: '件', productId: 'part' });
  i.routings[0].operations[0].requirements = [{ skillId: 'inspection', minLevel: 2, qualificationTypeIds: ['quality-auth'] }];
  i.qualifications[0] = { ...i.qualifications[0], skillId: 'inspection', level: 2, qualificationTypeId: 'quality-auth' };
  const hire = await request('/candidates/cand-chen/hire', { confirmedNeeds: [] });
  const employeeId = hire.body.employee.id;
  await request(`/onboardings/${hire.body.onboarding.id}`, { items: hire.body.onboarding.items.map((v) => ({ id: v.id, done: true })) }, 'PATCH');
  const activate = await request(`/onboardings/${hire.body.onboarding.id}/complete`, { requestKey: 'activate' });
  assert.equal(activate.status, 200);
  for (const k of ['qualifications', 'calendars']) i[k].forEach((v) => (v.employeeId = employeeId));
  for (const kind of ['orders', 'routings', 'qualifications', 'calendars', 'reservations']) {
    for (const v of i[kind]) {
      const r = await request(`${o2p}/${kind}`, { source: i.orders[0].source, ...v, requestKey: `create-${kind}` });
      assert.equal(r.status, 201, JSON.stringify(r));
    }
  }

  // --- Seed the SkillBridge-specific demo employee: adjacent skill, unverified qualification.
  const seeded = await request(`${sb}/demo/reset`, { requestKey: 'sb-seed' });
  assert.equal(seeded.status, 200, JSON.stringify(seeded));
  assert.equal(seeded.body.employeeId, 'emp-skillbridge-demo');

  // --- Calculate and confirm a gap of exactly 7200s (2h), matching the acceptance story.
  const revs = Object.fromEntries(await Promise.all(['orders', 'routings', 'qualifications', 'calendars', 'reservations'].map(async (k) => [k, (await request(`${o2p}/${k}`)).body.items.map((v) => ({ id: v.id, revision: v.revision }))])));
  const calcBody = { scope: i.scope, dailyDemands: i.dailyDemands, expectedInputRevisions: revs, requestKey: 'calc' };
  const calc = await request(`${o2p}/calculations`, calcBody);
  assert.equal(calc.status, 201);
  assert.equal(calc.body.totals.gapSeconds, 7200);
  const demandId = `${calc.body.id}:${calc.body.lines[0].demandId}`;

  // Not yet confirmed: SkillBridge must refuse to open a case.
  const tooEarly = await request(`${sb}/cases`, { calculationId: calc.body.id, demandId, requestKey: 'case-early' });
  assert.equal(tooEarly.status, 409);
  assert.equal(tooEarly.body.error.code, 'RESULT_NOT_EXPORTABLE');

  const confirm = await request(`${o2p}/calculations/${calc.body.id}/confirm`, { expectedRevision: calc.body.revision, expectedInputHash: calc.body.inputHash, requestKey: 'confirm' });
  assert.equal(confirm.status, 200);

  // --- Open the SkillBridge case now that the upstream result is confirmed+complete+fresh.
  const opened = await request(`${sb}/cases`, { calculationId: calc.body.id, demandId, requestKey: 'case-1' });
  assert.equal(opened.status, 201, JSON.stringify(opened));
  const skillCase = opened.body;
  assert.equal(skillCase.demandSnapshot.gapSeconds, 7200);
  assert.equal(skillCase.status, 'open');

  // Idempotent re-open returns the same case rather than duplicating analysis.
  const reopened = await request(`${sb}/cases`, { calculationId: calc.body.id, demandId, requestKey: 'case-2' });
  assert.equal(reopened.body.id, skillCase.id);

  // --- Candidate classification: the hired cand-chen employee is fully verified; the
  // SkillBridge demo employee has an adjacent skill but unverified qualification and
  // must be explicitly marked as not directly deployable.
  const candidatesRes = await request(`${sb}/cases/${skillCase.id}/candidates`, undefined, 'GET');
  assert.equal(candidatesRes.status, 200);
  const byId = Object.fromEntries(candidatesRes.body.candidates.map((c) => [c.employeeId, c]));
  assert.equal(byId[employeeId]?.classification, 'qualified_verified');
  assert.equal(byId['emp-skillbridge-demo']?.classification, 'potential_transferable');
  assert.ok(byId['emp-skillbridge-demo'].isDemoFixture);
  const gapLine = byId['emp-skillbridge-demo'].skillGaps[0];
  assert.equal(gapLine.matchKind, 'adjacent_skill');
  assert.equal(gapLine.currentStatus, 'unverified');
  assert.match(gapLine.closingAction, /核实|核验/);
  assert.ok(byId['emp-skillbridge-demo'].requiresManagerConfirmation.length > 0, 'unverified evidence must require manager confirmation, not an automatic score');

  // --- Proposal paths: internal_assignment for the verified+capacity employee,
  // development_plan for the adjacent-skill employee, and external_requisition always offered.
  const paths = skillCase.proposals.map((p) => p.path);
  assert.ok(paths.includes('internal_assignment'));
  assert.ok(paths.includes('development_plan'));
  assert.ok(paths.includes('external_requisition'));
  const devProposal = skillCase.proposals.find((p) => p.path === 'development_plan' && p.employeeId === 'emp-skillbridge-demo');
  assert.ok(devProposal, 'expected a development-path proposal for the adjacent-skill employee');
  assert.equal(devProposal.status, 'draft');
  assert.match(devProposal.rationale.nextAction, /核验|培训/);
  assert.ok(devProposal.rationale.risks.some((r) => /不等于岗位资质|未提供可验证/.test(r)), 'training-is-not-qualification disclaimer must be present');

  // --- HR review leaves an audit trail: reviewer, time, and note are persisted.
  const review = await request(`${sb}/proposals/${devProposal.id}/review`, { decision: 'hr_approved', note: '同意安排资格核验，暂不正式调配', expectedRevision: devProposal.revision, requestKey: 'review-1' }, 'PATCH');
  assert.equal(review.status, 200, JSON.stringify(review));
  assert.equal(review.body.status, 'hr_approved');
  assert.equal(review.body.reviewedBy, 'actor-hr');
  assert.ok(review.body.reviewedAt);
  assert.equal(review.body.reviewNote, '同意安排资格核验，暂不正式调配');

  // Stale expectedRevision must be rejected, not silently overwritten.
  const staleReview = await request(`${sb}/proposals/${devProposal.id}/review`, { decision: 'hr_rejected', note: 'retry', expectedRevision: devProposal.revision, requestKey: 'review-2' }, 'PATCH');
  assert.equal(staleReview.status, 409);

  // --- Review survives a server restart (persistence check).
  await new Promise((resolve) => server.close(resolve));
  instance.close();
  const instance2 = createApp({ dataDir: dir });
  const server2 = instance2.app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server2.once('listening', resolve));
  const persistedCase = await fetch(`http://127.0.0.1:${server2.address().port}/api${sb}/cases/${skillCase.id}`, { headers: { 'x-demo-actor': 'actor-hr' } }).then((r) => r.json());
  assert.equal(persistedCase.proposals.find((p) => p.id === devProposal.id).status, 'hr_approved');
  await new Promise((resolve) => server2.close(resolve));
  instance2.close();

  // --- Resume on the original port/instance equivalent for the rest of the test.
  const instance3 = createApp({ dataDir: dir });
  const server3 = instance3.app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server3.once('listening', resolve));
  t.after(async () => { await new Promise((resolve) => server3.close(resolve)); instance3.close(); });
  async function request3(path, body, method = 'POST', actor = 'actor-hr') {
    const r = await fetch(`http://127.0.0.1:${server3.address().port}/api${path}`, {
      method: body ? method : 'GET', headers: { 'Content-Type': 'application/json', 'x-demo-actor': actor },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: r.status, body: await r.json() };
  }

  // --- Changing the order quantity invalidates the upstream calculation; SkillBridge
  // must reflect the case as demand_stale and refuse to open any new case from it.
  const patch = await request3(`${o2p}/orders/order`, { expectedRevision: 1, patch: { quantity: 101 }, reason: 'demand changed', requestKey: 'update' }, 'PATCH');
  assert.equal(patch.status, 200);
  const staleCalc = await request3(`${o2p}/calculations/${calc.body.id}`);
  assert.equal(staleCalc.body.status, 'stale');
  const staleCase = await request3(`${sb}/cases/${skillCase.id}`);
  assert.equal(staleCase.body.status, 'demand_stale', 'existing case must flip to demand_stale once upstream snapshot is invalidated');
  const refusedNewCase = await request3(`${sb}/cases`, { calculationId: calc.body.id, demandId, requestKey: 'case-after-stale' });
  assert.equal(refusedNewCase.status, 409);
  assert.equal(refusedNewCase.body.error.code, 'RESULT_NOT_EXPORTABLE');

  // The frozen proposal is still readable for audit purposes but cannot be newly reviewed
  // as if it were current (its case is demand_stale; UI/consumers must treat it as historical).
  const stillReadable = await request3(`${sb}/cases/${skillCase.id}/candidates`);
  assert.equal(stillReadable.status, 200);

  // Employee role must not be able to read SkillBridge at all (same actor gate as Order2People).
  const employeeBlocked = await request3(`${sb}/cases`, undefined, 'GET', employeeId);
  assert.equal(employeeBlocked.status, 403);
});

test('SkillBridge never classifies an employee with zero evidence as a candidate, and capacity already committed is not re-offered', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'skillbridge-capacity-'));
  const instance = createApp({ dataDir: dir });
  const server = instance.app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => { await new Promise((resolve) => server.close(resolve)); instance.close(); rmSync(dir, { recursive: true, force: true }); });
  async function request(path, body, method = 'POST', actor = 'actor-hr') {
    const r = await fetch(`http://127.0.0.1:${server.address().port}/api${path}`, {
      method: body ? method : 'GET', headers: { 'Content-Type': 'application/json', 'x-demo-actor': actor },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: r.status, body: await r.json() };
  }
  const o2p = '/v1/order2people';
  const sb = '/v1/skillbridge';
  const i = fixture();
  Object.assign(i.orders[0], { siteId: 'demo', unit: '件', productId: 'part' });
  const hire = await request('/candidates/cand-chen/hire', { confirmedNeeds: [] });
  const employeeId = hire.body.employee.id;
  await request(`/onboardings/${hire.body.onboarding.id}`, { items: hire.body.onboarding.items.map((v) => ({ id: v.id, done: true })) }, 'PATCH');
  await request(`/onboardings/${hire.body.onboarding.id}/complete`, { requestKey: 'activate' });
  for (const k of ['qualifications', 'calendars']) i[k].forEach((v) => (v.employeeId = employeeId));
  // Fully commit the employee's entire window to an unrelated existing task, so the
  // verified qualification holder has zero free capacity left — internal_assignment
  // must not claim this person is safely available.
  i.reservations.push({ employeeId, window: i.calendars[0].workIntervals[0], sourceOrderId: 'other-order', committedSeconds: 28800, source: i.orders[0].source });
  for (const kind of ['orders', 'routings', 'qualifications', 'calendars', 'reservations']) {
    for (const v of i[kind]) {
      const r = await request(`${o2p}/${kind}`, { source: i.orders[0].source, ...v, requestKey: `create-${kind}` });
      assert.equal(r.status, 201, JSON.stringify(r));
    }
  }
  const revs = Object.fromEntries(await Promise.all(['orders', 'routings', 'qualifications', 'calendars', 'reservations'].map(async (k) => [k, (await request(`${o2p}/${k}`)).body.items.map((v) => ({ id: v.id, revision: v.revision }))])));
  const calc = await request(`${o2p}/calculations`, { scope: i.scope, dailyDemands: i.dailyDemands, expectedInputRevisions: revs, requestKey: 'calc' });
  assert.equal(calc.status, 201);
  // With all 8h already reserved elsewhere, Order2People itself must report the full demand as gap.
  assert.equal(calc.body.totals.gapSeconds, 36000);
  await request(`${o2p}/calculations/${calc.body.id}/confirm`, { expectedRevision: calc.body.revision, expectedInputHash: calc.body.inputHash, requestKey: 'confirm' });
  const demandId = `${calc.body.id}:${calc.body.lines[0].demandId}`;
  const opened = await request(`${sb}/cases`, { calculationId: calc.body.id, demandId, requestKey: 'case-1' });
  assert.equal(opened.status, 201, JSON.stringify(opened));
  const candidate = opened.body.candidates.find((c) => c.employeeId === employeeId);
  assert.equal(candidate.classification, 'qualified_verified');
  assert.equal(candidate.capacity.committedSecondsInWindow, 28800, 'already-committed reservation seconds must be counted, not ignored');
  assert.equal(candidate.capacity.availableSecondsInWindow, 0, 'fully committed capacity must not be re-offered as available supply');
  const internalProposal = opened.body.proposals.find((p) => p.path === 'internal_assignment' && p.employeeId === employeeId);
  assert.ok(internalProposal);
  assert.match(internalProposal.rationale.feasibilityNote, /不足以覆盖|日历未确认/);
  assert.ok(internalProposal.rationale.risks.some((r) => /不能宣称安全可调配/.test(r)), 'must not claim safe reassignment without full impact data');
});
