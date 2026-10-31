import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server/app.mjs';
import { fixture } from './order2people-fixture.mjs';

/**
 * Covers the Phase 3 talent-execution closed loop: turning an hr_approved SkillBridge
 * proposal into a real, persisted record in the owning module (Training/Recruitment/
 * Order2People), never auto-approving, and respecting upstream staleness.
 */
async function harness(t, prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix));
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
  return request;
}

/** Build a confirmed, non-stale, 2h-gap SkillBridge case with both an adjacent-skill
 *  employee (development_plan candidate) and a verified+capacity employee (internal_assignment
 *  candidate), mirroring the existing skillbridge-api.test.mjs acceptance setup. */
async function openAcceptanceCase(request) {
  const o2p = '/v1/order2people';
  const sb = '/v1/skillbridge';
  const i = fixture();
  Object.assign(i.orders[0], { siteId: 'demo', unit: '件', productId: 'part' });
  i.routings[0].operations[0].requirements = [{ skillId: 'inspection', minLevel: 2, qualificationTypeIds: ['quality-auth'] }];
  i.qualifications[0] = { ...i.qualifications[0], skillId: 'inspection', level: 2, qualificationTypeId: 'quality-auth' };
  const hire = await request('/candidates/cand-chen/hire', { confirmedNeeds: [] });
  const employeeId = hire.body.employee.id;
  await request(`/onboardings/${hire.body.onboarding.id}`, { items: hire.body.onboarding.items.map((v) => ({ id: v.id, done: true })) }, 'PATCH');
  await request(`/onboardings/${hire.body.onboarding.id}/complete`, { requestKey: 'activate' });
  for (const k of ['qualifications', 'calendars']) i[k].forEach((v) => (v.employeeId = employeeId));
  for (const kind of ['orders', 'routings', 'qualifications', 'calendars', 'reservations']) {
    for (const v of i[kind]) {
      const r = await request(`${o2p}/${kind}`, { source: i.orders[0].source, ...v, requestKey: `create-${kind}` });
      assert.equal(r.status, 201, JSON.stringify(r));
    }
  }
  await request(`${sb}/demo/reset`, { requestKey: 'sb-seed' });
  const revs = Object.fromEntries(await Promise.all(['orders', 'routings', 'qualifications', 'calendars', 'reservations'].map(async (k) => [k, (await request(`${o2p}/${k}`)).body.items.map((v) => ({ id: v.id, revision: v.revision }))])));
  const calc = await request(`${o2p}/calculations`, { scope: i.scope, dailyDemands: i.dailyDemands, expectedInputRevisions: revs, requestKey: 'calc' });
  assert.equal(calc.status, 201);
  const demandId = `${calc.body.id}:${calc.body.lines[0].demandId}`;
  await request(`${o2p}/calculations/${calc.body.id}/confirm`, { expectedRevision: calc.body.revision, expectedInputHash: calc.body.inputHash, requestKey: 'confirm' });
  const opened = await request(`${sb}/cases`, { calculationId: calc.body.id, demandId, requestKey: 'case-1' });
  assert.equal(opened.status, 201, JSON.stringify(opened));
  return { calc: calc.body, case: opened.body, employeeId };
}

test('executing a development_plan proposal creates a real, traceable TrainingTask only after HR approval', async (t) => {
  const request = await harness(t, 'talent-exec-dev-');
  const sb = '/v1/skillbridge';
  const { case: skillCase } = await openAcceptanceCase(request);
  const devProposal = skillCase.proposals.find((p) => p.path === 'development_plan' && p.employeeId === 'emp-skillbridge-demo');
  assert.ok(devProposal);

  // Cannot execute a proposal that HR has not yet approved.
  const tooEarly = await request(`${sb}/proposals/${devProposal.id}/execute`, { expectedRevision: devProposal.revision, requestKey: 'exec-early' });
  assert.equal(tooEarly.status, 409);
  assert.equal(tooEarly.body.error.code, 'PROPOSAL_NOT_APPROVED');

  const review = await request(`${sb}/proposals/${devProposal.id}/review`, { decision: 'hr_approved', note: '同意安排资格核验', expectedRevision: devProposal.revision, requestKey: 'review-1' }, 'PATCH');
  assert.equal(review.status, 200);

  const executed = await request(`${sb}/proposals/${devProposal.id}/execute`, { expectedRevision: review.body.revision, requestKey: 'exec-1' });
  assert.equal(executed.status, 200, JSON.stringify(executed));
  assert.equal(executed.body.execution.status, 'executed');
  assert.equal(executed.body.execution.refType, 'training_task');
  assert.ok(executed.body.execution.refId);

  // The TrainingTask really exists in the Training module's own collection, traceable back.
  const bootstrap = await request('/bootstrap', undefined, 'GET');
  const task = bootstrap.body.trainingTasks.find((t2) => t2.id === executed.body.execution.refId);
  assert.ok(task, 'expected a real TrainingTask to exist');
  assert.equal(task.employeeId, 'emp-skillbridge-demo');
  assert.equal(task.kind, 'development');
  assert.equal(task.skillBridgeCaseId, skillCase.id);
  assert.equal(task.skillBridgeProposalId, devProposal.id);
  assert.match(task.description, /不代表已自动取得岗位资格/);

  // Re-executing is idempotent: no duplicate TrainingTask is created.
  const again = await request(`${sb}/proposals/${devProposal.id}/execute`, { expectedRevision: executed.body.revision, requestKey: 'exec-2' });
  assert.equal(again.status, 200);
  assert.equal(again.body.execution.refId, executed.body.execution.refId);
  const bootstrap2 = await request('/bootstrap', undefined, 'GET');
  assert.equal(bootstrap2.body.trainingTasks.filter((t2) => t2.skillBridgeProposalId === devProposal.id).length, 1, 'must not create a second TrainingTask on re-execute');

  // Completing the training task still does not grant a qualification — SkillBridge/Training
  // must never upgrade training completion into Order2People qualification evidence.
  // (The demo fixture seeds one pre-existing 'unverified' qualification for this employee;
  // the assertion is that training completion does not create a new one or flip it to verified.)
  const o2pQualsBefore = await request('/v1/order2people/qualifications', undefined, 'GET');
  const before = o2pQualsBefore.body.items.filter((q) => q.employeeId === 'emp-skillbridge-demo');
  const start = await request(`/training/${task.id}/start`, {}, 'POST', 'emp-skillbridge-demo');
  assert.equal(start.status, 200, JSON.stringify(start));
  const submit = await request(`/training/${task.id}/submit`, { selectedSteps: ['isolate', 'record', 'report', 'followup'], note: '', requestKey: 'submit-1' }, 'POST', 'emp-skillbridge-demo');
  assert.equal(submit.status, 200, JSON.stringify(submit));
  assert.equal(submit.body.task.status, 'completed');
  const o2pQualsAfter = await request('/v1/order2people/qualifications', undefined, 'GET');
  const after = o2pQualsAfter.body.items.filter((q) => q.employeeId === 'emp-skillbridge-demo');
  assert.equal(after.length, before.length, 'training completion must never create a new Order2People qualification record');
  assert.ok(after.every((q) => q.status === 'unverified'), 'training completion must never flip an existing qualification to verified');
});

test('executing an external_requisition proposal creates a requisition draft, never a fabricated candidate', async (t) => {
  const request = await harness(t, 'talent-exec-req-');
  const sb = '/v1/skillbridge';
  const { case: skillCase } = await openAcceptanceCase(request);
  const extProposal = skillCase.proposals.find((p) => p.path === 'external_requisition');
  assert.ok(extProposal);
  const candidatesBefore = await request('/bootstrap', undefined, 'GET');
  const countBefore = candidatesBefore.body.candidates.length;

  const review = await request(`${sb}/proposals/${extProposal.id}/review`, { decision: 'hr_approved', note: '同意生成招聘需求草稿', expectedRevision: extProposal.revision, requestKey: 'review-1' }, 'PATCH');
  assert.equal(review.status, 200);
  const executed = await request(`${sb}/proposals/${extProposal.id}/execute`, { expectedRevision: review.body.revision, requestKey: 'exec-1' });
  assert.equal(executed.status, 200, JSON.stringify(executed));
  assert.equal(executed.body.execution.refType, 'requisition');

  const list = await request(`${sb}/requisitions`, undefined, 'GET');
  assert.equal(list.status, 200);
  const requisition = list.body.items.find((r) => r.id === executed.body.execution.refId);
  assert.ok(requisition);
  assert.equal(requisition.caseId, skillCase.id);
  assert.equal(requisition.proposalId, extProposal.id);
  assert.equal(requisition.status, 'draft');
  assert.deepEqual(requisition.linkedCandidateIds, []);
  assert.ok(requisition.skillRequirements.some((r) => r.skillId === 'inspection'));

  // No Candidate was fabricated as a side effect.
  const candidatesAfter = await request('/bootstrap', undefined, 'GET');
  assert.equal(candidatesAfter.body.candidates.length, countBefore, 'must never auto-create a Candidate record');

  // HR can link an existing candidate and move the requisition to open, but cannot invent one.
  const invalidLink = await request(`${sb}/requisitions/${requisition.id}`, { linkedCandidateIds: ['not-a-real-candidate'], expectedRevision: requisition.revision, requestKey: 'bad-link' }, 'PATCH');
  assert.equal(invalidLink.status, 400);
  const validLink = await request(`${sb}/requisitions/${requisition.id}`, { status: 'open', linkedCandidateIds: ['cand-lin'], expectedRevision: requisition.revision, requestKey: 'link-1' }, 'PATCH');
  assert.equal(validLink.status, 200, JSON.stringify(validLink));
  assert.equal(validLink.body.status, 'open');
  assert.deepEqual(validLink.body.linkedCandidateIds, ['cand-lin']);
});

test('executing an internal_assignment proposal requires explicit manager risk confirmation and commits real capacity', async (t) => {
  const request = await harness(t, 'talent-exec-assign-');
  const sb = '/v1/skillbridge';
  const o2p = '/v1/order2people';
  const { case: skillCase, calc, employeeId } = await openAcceptanceCase(request);
  const internalProposal = skillCase.proposals.find((p) => p.path === 'internal_assignment' && p.employeeId === employeeId);
  assert.ok(internalProposal, 'expected an internal_assignment proposal for the verified+capacity employee');

  const review = await request(`${sb}/proposals/${internalProposal.id}/review`, { decision: 'hr_approved', note: '同意调配', expectedRevision: internalProposal.revision, requestKey: 'review-1' }, 'PATCH');
  assert.equal(review.status, 200);

  // Cannot execute an internal assignment without an explicit manager confirmation + risk note.
  const missingConfirmation = await request(`${sb}/proposals/${internalProposal.id}/execute`, { expectedRevision: review.body.revision, requestKey: 'exec-missing' });
  assert.equal(missingConfirmation.status, 400);

  const executed = await request(`${sb}/proposals/${internalProposal.id}/execute`, {
    expectedRevision: review.body.revision, requestKey: 'exec-1',
    managerConfirmedBy: 'actor-manager', riskAcknowledgement: '已确认原岗位任务可在本窗口内让出，不产生新缺口',
  });
  assert.equal(executed.status, 200, JSON.stringify(executed));
  assert.equal(executed.body.execution.refType, 'capacity_reservation');

  // A real CapacityReservation now exists in Order2People's own collection.
  const reservations = await request(`${o2p}/reservations`, undefined, 'GET');
  const reservation = reservations.body.items.find((r) => r.id === executed.body.execution.refId);
  assert.ok(reservation);
  assert.equal(reservation.employeeId, employeeId);
  assert.equal(reservation.source.sourceType, 'skillbridge_assignment');
  assert.equal(reservation.source.confirmedBy, 'actor-manager');

  // Committing real capacity must invalidate the calculation that produced this gap —
  // an executed assignment is supposed to retire the gap, not silently coexist with it.
  const staleCalc = await request(`${o2p}/calculations/${calc.id}`, undefined, 'GET');
  assert.equal(staleCalc.body.status, 'stale', 'executing an internal assignment must invalidate the upstream calculation it was meant to close');
});

test('a stale upstream demand blocks proposal execution even if the proposal was already hr_approved', async (t) => {
  const request = await harness(t, 'talent-exec-stale-');
  const sb = '/v1/skillbridge';
  const o2p = '/v1/order2people';
  const { case: skillCase } = await openAcceptanceCase(request);
  const devProposal = skillCase.proposals.find((p) => p.path === 'development_plan');
  assert.ok(devProposal);
  const review = await request(`${sb}/proposals/${devProposal.id}/review`, { decision: 'hr_approved', note: '同意', expectedRevision: devProposal.revision, requestKey: 'review-1' }, 'PATCH');
  assert.equal(review.status, 200);

  // Invalidate the upstream calculation by changing the order quantity.
  const patch = await request(`${o2p}/orders/order`, { expectedRevision: 1, patch: { quantity: 101 }, reason: 'demand changed', requestKey: 'update' }, 'PATCH');
  assert.equal(patch.status, 200);

  const execAfterStale = await request(`${sb}/proposals/${devProposal.id}/execute`, { expectedRevision: review.body.revision, requestKey: 'exec-stale' });
  assert.equal(execAfterStale.status, 409);
  assert.equal(execAfterStale.body.error.code, 'DEMAND_STALE');

  // Review itself is also blocked for a second, different proposal on the now-stale case.
  const extProposal = skillCase.proposals.find((p) => p.path === 'external_requisition');
  const reviewAfterStale = await request(`${sb}/proposals/${extProposal.id}/review`, { decision: 'hr_approved', note: '同意', expectedRevision: extProposal.revision, requestKey: 'review-after-stale' }, 'PATCH');
  assert.equal(reviewAfterStale.status, 409);
  assert.equal(reviewAfterStale.body.error.code, 'DEMAND_STALE');
});
