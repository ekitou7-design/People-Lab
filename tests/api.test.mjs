import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp, nextWorkday, shanghaiToday } from '../server/app.mjs';

async function fixture(t) {
  const dataDir = mkdtempSync(join(tmpdir(), 'hrflow-api-'));
  let instance;
  let server;
  let url;
  async function start() {
    instance = createApp({ dataDir });
    server = instance.app.listen(0, '127.0.0.1');
    await new Promise((resolveReady, reject) => { server.once('listening', resolveReady); server.once('error', reject); });
    url = `http://127.0.0.1:${server.address().port}`;
  }
  async function stop() {
    if (server) { await new Promise((done) => server.close(done)); server = null; }
    if (instance) { instance.close(); instance = null; }
  }
  await start();
  t.after(async () => {
    await stop();
    const absolute = resolve(dataDir);
    assert.ok(absolute.startsWith(resolve(tmpdir(), 'hrflow-api-')), 'only remove this test’s temporary directory');
    rmSync(absolute, { recursive: true, force: true });
  });
  async function request(path, { actor = 'actor-hr', method = 'GET', body, raw } = {}) {
    const response = await fetch(`${url}/api${path}`, {
      method,
      headers: { 'x-demo-actor': actor, ...(body !== undefined || raw !== undefined ? { 'content-type': 'application/json' } : {}) },
      ...(body !== undefined || raw !== undefined ? { body: raw ?? JSON.stringify(body) } : {}),
    });
    const result = await response.json();
    return { status: response.status, body: result, headers: response.headers };
  }
  const post = (path, body = {}, actor = 'actor-hr') => request(path, { method: 'POST', body, actor });
  const boot = async (actor = 'actor-hr') => {
    const response = await request('/bootstrap', { actor });
    assert.equal(response.status, 200, JSON.stringify(response.body));
    return response.body;
  };
  async function activate(id = 'cand-chen', confirmedNeeds = []) {
    const hired = await post(`/candidates/${id}/hire`, { confirmedNeeds });
    assert.equal(hired.status, 200, JSON.stringify(hired.body));
    const onboarding = hired.body.onboarding;
    const patched = await request(`/onboardings/${onboarding.id}`, { method: 'PATCH', body: { items: onboarding.items.map((item) => ({ id: item.id, done: true })) } });
    assert.equal(patched.status, 200);
    const complete = await post(`/onboardings/${onboarding.id}/complete`);
    assert.equal(complete.status, 200, JSON.stringify(complete.body));
    return complete.body.employee;
  }
  return { request, post, boot, activate, stop, start, dataDir, get url() { return url; } };
}

test('bootstrap has stable, evidence-backed demo seeds and role-safe initial state', async (t) => {
  const api = await fixture(t);
  const health = await api.request('/health');
  assert.equal(health.status, 200);
  assert.equal(health.body.app, 'hrflow-demo');
  assert.equal(health.body.pid, process.pid);
  assert.equal(resolve(health.body.projectRoot), resolve(fileURLToPath(new URL('../', import.meta.url))));
  const boot = await api.boot();
  const expectedKeys = ['mode', 'actors', 'actor', 'today', 'suggestedLeaveDate', 'position', 'candidates', 'employees', 'onboardings', 'leaves', 'trainingTasks', 'tickets', 'messages', 'knowledge', 'events', 'metrics', 'trainingScenario'];
  assert.deepEqual(Object.keys(boot).sort(), expectedKeys.sort());
  assert.deepEqual(boot.candidates.map((candidate) => candidate.id), ['cand-chen', 'cand-lin', 'cand-zhou']);
  assert.equal(boot.employees.length, 0);
  assert.equal(boot.actors.length, 2);
  assert.equal(boot.position.abilities.length, 4);
  assert.deepEqual(boot.knowledge.map((document) => document.id), ['policy-leave', 'guide-onboarding', 'sop-quality']);
  for (const candidate of boot.candidates) {
    for (const evidence of candidate.evidence) {
      const section = candidate.resume.sections.find((item) => item.id === evidence.sectionId);
      assert.ok(section, `${candidate.id} evidence anchors an existing resume section`);
      assert.ok(section.content.includes(evidence.quote), `${candidate.id} quote is verbatim`);
    }
  }
  assert.equal(boot.trainingScenario.steps[1].required, false, 'choices are mixed');
  assert.equal((await api.boot('actor-manager')).candidates.length, 0);
  assert.equal((await api.request('/bootstrap', { actor: 'emp-chen' })).status, 403);
});

test('hiring is idempotent and onboarding activates only after all checklist items', async (t) => {
  const api = await fixture(t);
  assert.equal((await api.post('/candidates/cand-chen/stage', { stage: 'interview' })).status, 200);
  assert.equal((await api.post('/candidates/cand-chen/hire', { confirmedNeeds: ['invented'] })).status, 400);
  const hired = await api.post('/candidates/cand-chen/hire', { confirmedNeeds: ['reporting', 'reporting'] });
  assert.equal(hired.status, 200);
  assert.equal(hired.body.employee.status, 'pending');
  assert.deepEqual(hired.body.employee.confirmedNeeds, ['reporting']);
  assert.deepEqual(hired.body.onboarding.items.map((item) => item.id), ['identity', 'agreement', 'orientation']);
  const repeated = await api.post('/candidates/cand-chen/hire', { confirmedNeeds: ['reporting'] });
  assert.equal(repeated.body.employee.id, hired.body.employee.id);
  let boot = await api.boot();
  assert.equal(boot.employees.length, 1);
  assert.equal(boot.trainingTasks.length, 0);
  assert.equal(boot.actors.length, 2);
  assert.equal((await api.post(`/onboardings/${hired.body.onboarding.id}/complete`)).status, 409);
  const employee = await api.activate('cand-chen', ['reporting']);
  boot = await api.boot();
  assert.equal(employee.status, 'active');
  assert.equal(boot.actors.length, 3);
  assert.equal(boot.trainingTasks.length, 2);
  assert.deepEqual(boot.trainingTasks.map((task) => task.kind), ['mandatory', 'development']);
  assert.equal((await api.post(`/onboardings/${hired.body.onboarding.id}/complete`)).status, 200);
  assert.equal((await api.boot()).trainingTasks.length, 2);
  assert.equal((await api.post('/candidates/cand-chen/stage', { stage: 'screening' })).status, 409);
  const other = await api.activate('cand-lin');
  assert.equal((await api.boot(other.id)).trainingTasks.length, 1, 'unverified evidence does not create development tasks');
});

test('employee views and mutations are scoped to their own records', async (t) => {
  const api = await fixture(t);
  const chen = await api.activate('cand-chen');
  const lin = await api.activate('cand-lin');
  const global = await api.boot();
  const chenView = await api.boot(chen.id);
  assert.deepEqual(chenView.employees.map((employee) => employee.id), [chen.id]);
  assert.equal(chenView.candidates.length, 0);
  assert.ok(chenView.onboardings.every((item) => item.employeeId === chen.id));
  assert.ok(chenView.events.every((item) => item.employeeId === chen.id));
  const otherTask = global.trainingTasks.find((task) => task.employeeId === lin.id);
  assert.equal((await api.post(`/training/${otherTask.id}/start`, {}, chen.id)).status, 403);
  assert.equal((await api.post('/candidates/cand-zhou/hire', { confirmedNeeds: [] }, chen.id)).status, 403);
  assert.equal((await api.post('/demo/reset', { confirm: 'RESET' }, chen.id)).status, 403);
  assert.equal((await api.post('/assistant', { message: '你好', requestKey: 'manager-chat' }, 'actor-manager')).status, 403);
  const manager = await api.boot('actor-manager');
  assert.equal(manager.employees.length, 2);
  assert.equal(manager.candidates.length, 0);
});

test('leave submission, overlap prevention, human rejection and approval deduction', async (t) => {
  const api = await fixture(t);
  const employee = await api.activate();
  const date = (await api.boot()).suggestedLeaveDate;
  const payload = { date, period: 'afternoon', reason: '个人事务（演示）', requestKey: 'leave-1' };
  const submitted = await api.post('/leaves', payload, employee.id);
  assert.equal(submitted.status, 200);
  assert.equal(submitted.body.days, 0.5);
  assert.equal(submitted.body.status, 'pending');
  assert.equal((await api.boot(employee.id)).employees[0].leaveBalance, 3);
  const repeated = await api.post('/leaves', payload, employee.id);
  assert.equal(repeated.body.id, submitted.body.id);
  assert.equal((await api.boot(employee.id)).leaves.length, 1);
  assert.equal((await api.post('/leaves', { ...payload, reason: '不同内容' }, employee.id)).status, 409);
  assert.equal((await api.post('/leaves', { ...payload, requestKey: 'overlap' }, employee.id)).status, 409);
  assert.equal((await api.post(`/leaves/${submitted.body.id}/decision`, { decision: 'approved' }, employee.id)).status, 403);
  const decision = await api.post(`/leaves/${submitted.body.id}/decision`, { decision: 'approved' }, 'actor-manager');
  assert.equal(decision.status, 200);
  assert.equal((await api.boot(employee.id)).employees[0].leaveBalance, 2.5);
  assert.equal((await api.post(`/leaves/${submitted.body.id}/decision`, { decision: 'approved' }, 'actor-manager')).status, 200);
  assert.equal((await api.boot(employee.id)).employees[0].leaveBalance, 2.5, 'repeated approval does not deduct again');
  assert.equal((await api.post(`/leaves/${submitted.body.id}/decision`, { decision: 'rejected', reason: '改主意' }, 'actor-manager')).status, 409);
  const morning = await api.post('/leaves', { ...payload, period: 'morning', requestKey: 'morning' }, employee.id);
  assert.equal(morning.status, 200);
  assert.equal((await api.post(`/leaves/${morning.body.id}/decision`, { decision: 'rejected' }, 'actor-manager')).status, 400);
  assert.equal((await api.post(`/leaves/${morning.body.id}/decision`, { decision: 'rejected', reason: '请调整交接安排后重新申请。' }, 'actor-manager')).status, 200);
  assert.equal((await api.boot(employee.id)).employees[0].leaveBalance, 2.5);
  assert.equal((await api.post('/leaves', { ...payload, period: 'morning', requestKey: 'morning-reapply' }, employee.id)).status, 200);
  assert.equal((await api.post('/leaves', { ...payload, date: '2026-02-30', requestKey: 'invalid-date' }, employee.id)).status, 400);
  assert.equal((await api.post('/leaves', { ...payload, date: '2000-01-01', requestKey: 'past' }, employee.id)).status, 400);
  let weekend = date;
  while (![0, 6].includes(new Date(`${weekend}T12:00:00Z`).getUTCDay())) weekend = new Date(new Date(`${weekend}T12:00:00Z`).valueOf() + 86400000).toISOString().slice(0, 10);
  assert.equal((await api.post('/leaves', { ...payload, date: weekend, requestKey: 'weekend' }, employee.id)).status, 400);
});

test('approval rechecks current balance transactionally across multiple pending requests', async (t) => {
  const api = await fixture(t);
  const employee = await api.activate();
  let date = (await api.boot()).suggestedLeaveDate;
  const ids = [];
  for (let index = 0; index < 4; index++) {
    const submitted = await api.post('/leaves', { date, period: 'full', reason: '演示请假', requestKey: `bulk-${index}` }, employee.id);
    assert.equal(submitted.status, 200);
    ids.push(submitted.body.id);
    date = nextWorkday(date);
  }
  for (const id of ids.slice(0, 3)) assert.equal((await api.post(`/leaves/${id}/decision`, { decision: 'approved' }, 'actor-manager')).status, 200);
  const insufficient = await api.post(`/leaves/${ids[3]}/decision`, { decision: 'approved' }, 'actor-manager');
  assert.equal(insufficient.status, 409);
  assert.equal(insufficient.body.error.code, 'INSUFFICIENT_BALANCE');
  const boot = await api.boot(employee.id);
  assert.equal(boot.employees[0].leaveBalance, 0);
  assert.equal(boot.leaves.find((leave) => leave.id === ids[3]).status, 'pending');
  assert.equal(boot.metrics.approvedLeaves, 3);
  assert.equal((await api.post('/leaves', { date, period: 'morning', reason: '余额不足', requestKey: 'empty-balance' }, employee.id)).status, 409);
});

test('assistant retains leave slots, cites policies, deduplicates human tickets and stores HR replies', async (t) => {
  const api = await fixture(t);
  const employee = await api.activate();
  const first = await api.post('/assistant', { message: '我想请假', requestKey: 'chat-1' }, employee.id);
  assert.equal(first.status, 200);
  assert.equal(first.body.intent, 'leave');
  assert.ok(first.body.suggestedAction.missing.includes('date'));
  assert.ok(first.body.suggestedAction.missing.includes('period'));
  const secondPayload = { message: '下周二下午', requestKey: 'chat-2' };
  const second = await api.post('/assistant', secondPayload, employee.id);
  assert.equal(second.body.intent, 'leave');
  assert.equal(second.body.suggestedAction.prefill.period, 'afternoon');
  assert.match(second.body.suggestedAction.prefill.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(new Date(`${second.body.suggestedAction.prefill.date}T12:00:00Z`).getUTCDay(), 2);
  assert.deepEqual(second.body.suggestedAction.missing, ['reason']);
  const duplicate = await api.post('/assistant', secondPayload, employee.id);
  assert.equal(duplicate.body.id, second.body.id);
  assert.equal((await api.boot(employee.id)).messages.length, 4);
  assert.equal((await api.post('/assistant', { message: '别的内容', requestKey: 'chat-2' }, employee.id)).status, 409);
  const balance = await api.post('/assistant', { message: '我的年假余额是多少', requestKey: 'balance' }, employee.id);
  assert.match(balance.body.content, /3 天/);
  const unknown = '公司能报销宠物托管费吗？';
  await api.post('/assistant', { message: unknown, requestKey: 'unknown-1' }, employee.id);
  await api.post('/assistant', { message: unknown, requestKey: 'unknown-2' }, employee.id);
  let boot = await api.boot(employee.id);
  assert.equal(boot.tickets.length, 1);
  assert.equal(boot.tickets[0].status, 'open');
  for (const message of boot.messages.filter((item) => item.role === 'assistant')) {
    for (const cite of message.citations) {
      const source = boot.knowledge.find((document) => document.id === cite.knowledgeId).sections.find((section) => section.id === cite.sectionId);
      assert.ok(source.content.includes(cite.quote));
    }
  }
  const reply = '演示制度暂无此福利，请向 HR 进一步确认。';
  assert.equal((await api.post(`/tickets/${boot.tickets[0].id}/resolve`, { response: reply }, employee.id)).status, 403);
  assert.equal((await api.post(`/tickets/${boot.tickets[0].id}/resolve`, { response: reply })).status, 200);
  assert.equal((await api.post(`/tickets/${boot.tickets[0].id}/resolve`, { response: reply })).status, 200);
  boot = await api.boot(employee.id);
  assert.equal(boot.tickets[0].status, 'resolved');
  assert.equal(boot.messages.filter((message) => message.intent === 'human_reply').length, 1);
  assert.equal(boot.metrics.openTickets, 0);
});

test('unsupported leave policies are handed to HR without an annual-leave form or invented policy', async (t) => {
  const api = await fixture(t);
  const employee = await api.activate();
  // Establish an annual-leave draft first to verify the old context cannot leak.
  assert.equal((await api.post('/assistant', { message: '我想请假', requestKey: 'annual-context' }, employee.id)).body.intent, 'leave');
  const questions = [
    '我要申请病假，请帮我办理请假手续', '病假需要什么材料？', '我想请婚假，怎么请假？',
    '产假可以请多少天？', '陪产假余额是多少？', '育儿假要提交哪些资料？',
    '丧假怎么申请？', '我想申请事假，怎么请假？', '调休需要哪些材料？',
  ];
  for (const [index, message] of questions.entries()) {
    const response = await api.post('/assistant', { message, requestKey: `unsupported-${index}` }, employee.id);
    assert.equal(response.status, 200);
    assert.equal(response.body.intent, 'handoff', message);
    assert.equal(response.body.suggestedAction, undefined, message);
    assert.match(response.body.content, /仅支持年假/);
    assert.match(response.body.content, /转交 HR/);
    assert.deepEqual(response.body.citations, []);
  }
  await api.post('/assistant', { message: questions[0], requestKey: 'unsupported-repeat' }, employee.id);
  const boot = await api.boot(employee.id);
  assert.equal(boot.tickets.length, questions.length, 'repeated unsupported questions share one ticket');
  assert.equal(boot.leaves.length, 0);
  assert.equal(boot.employees[0].leaveBalance, 3);
  assert.equal(boot.trainingTasks[0].status, 'not_started');
});

test('negated leave intent switches to explicit training or asks for clarification without stale drafts', async (t) => {
  const api = await fixture(t);
  const employee = await api.activate();
  await api.post('/assistant', { message: '我想请假', requestKey: 'negation-context' }, employee.id);
  for (const [index, message] of ['我不想请假，想查培训', '我不需要请假，只看培训进度', '不用请假，我要看课程', '不请假了，想查培训'].entries()) {
    const response = await api.post('/assistant', { message, requestKey: `negated-training-${index}` }, employee.id);
    assert.equal(response.status, 200);
    assert.equal(response.body.intent, 'training', message);
    assert.equal(response.body.suggestedAction, undefined);
    assert.match(response.body.content, /1 项岗位培训/);
    assert.ok(response.body.citations.every(cite => cite.knowledgeId === 'sop-quality'));
  }
  await api.post('/assistant', { message: '我想请假', requestKey: 'negation-context-2' }, employee.id);
  const denied = await api.post('/assistant', { message: '我不想请假，下周二下午也不用', requestKey: 'plain-negation' }, employee.id);
  assert.equal(denied.body.intent, 'handoff');
  assert.equal(denied.body.suggestedAction, undefined);
  assert.match(denied.body.content, /暂不办理请假/);
  const followup = await api.post('/assistant', { message: '下周二下午', requestKey: 'after-negation' }, employee.id);
  assert.equal(followup.body.intent, 'handoff', 'a negated draft cannot be restored by a bare date');
  assert.equal(followup.body.suggestedAction, undefined);
  const boot = await api.boot(employee.id);
  assert.equal(boot.leaves.length, 0);
  assert.equal(boot.employees[0].leaveBalance, 3);
});

test('material words alone need HR while explicit onboarding and its follow-up keep valid citations', async (t) => {
  const api = await fixture(t);
  const employee = await api.activate();
  for (const [index, message] of ['需要哪些材料？', '报销需要什么资料？', '合同需要补什么？'].entries()) {
    const response = await api.post('/assistant', { message, requestKey: `unscoped-material-${index}` }, employee.id);
    assert.equal(response.body.intent, 'handoff', message);
    assert.equal(response.body.suggestedAction, undefined);
    assert.deepEqual(response.body.citations, []);
  }
  const explicit = await api.post('/assistant', { message: '入职需要什么材料？', requestKey: 'explicit-onboarding' }, employee.id);
  assert.equal(explicit.body.intent, 'onboarding');
  assert.ok(explicit.body.citations.every(cite => cite.knowledgeId === 'guide-onboarding'));
  const followup = await api.post('/assistant', { message: '还要补哪些资料？', requestKey: 'onboarding-material-followup' }, employee.id);
  assert.equal(followup.body.intent, 'onboarding');
  assert.ok(followup.body.citations.every(cite => cite.knowledgeId === 'guide-onboarding'));
  assert.equal((await api.boot(employee.id)).tickets.length, 3);
});

test('explicit balance-plus-training questions ask the employee to select one supported topic', async (t) => {
  const api = await fixture(t);
  const employee = await api.activate();
  for (const [index, message] of ['我的年假余额是多少？培训任务有哪些？', '帮我查年假余额和培训进度'].entries()) {
    const response = await api.post('/assistant', { message, requestKey: `combined-${index}` }, employee.id);
    assert.equal(response.status, 200);
    assert.equal(response.body.intent, 'clarify');
    assert.match(response.body.content, /一次处理一类需求/);
    assert.equal(response.body.suggestedAction, undefined);
    assert.deepEqual(response.body.citations, []);
  }
  assert.equal((await api.post('/assistant', { message: '先查年假余额', requestKey: 'clarified-balance' }, employee.id)).body.intent, 'policy');
  assert.equal((await api.post('/assistant', { message: '我的培训任务有哪些', requestKey: 'clarified-training' }, employee.id)).body.intent, 'training');
  const boot = await api.boot(employee.id);
  assert.equal(boot.tickets.length, 0);
  assert.equal(boot.leaves.length, 0);
  assert.equal(boot.employees[0].leaveBalance, 3);
});

test('training creates one retry, preserves attempts and counts only completed root tasks', async (t) => {
  const api = await fixture(t);
  const employee = await api.activate();
  const original = (await api.boot(employee.id)).trainingTasks[0];
  assert.equal((await api.post(`/training/${original.id}/submit`, { selectedSteps: ['isolate'], note: '', requestKey: 'before-start' }, employee.id)).status, 409);
  assert.equal((await api.post(`/training/${original.id}/start`, {}, employee.id)).body.status, 'learning');
  const failPayload = { selectedSteps: ['isolate', 'report'], note: '先隔离上报。', requestKey: 'training-fail' };
  const first = await api.post(`/training/${original.id}/submit`, failPayload, employee.id);
  assert.equal(first.status, 200);
  assert.equal(first.body.attempt.score, 50);
  assert.deepEqual(first.body.attempt.missing, ['followup', 'record']);
  assert.equal(first.body.task.status, 'needs_retry');
  assert.equal(first.body.retryTask.parentTaskId, original.id);
  const repeated = await api.post(`/training/${original.id}/submit`, failPayload, employee.id);
  assert.equal(repeated.body.attempt.id, first.body.attempt.id);
  assert.equal((await api.post(`/training/${original.id}/submit`, { ...failPayload, requestKey: 'cannot-bypass-retry' }, employee.id)).status, 409);
  const retryId = first.body.retryTask.id;
  assert.equal((await api.post(`/training/${retryId}/start`, {}, employee.id)).status, 200);
  const retryFail = await api.post(`/training/${retryId}/submit`, { selectedSteps: ['isolate'], note: '', requestKey: 'retry-fail' }, employee.id);
  assert.equal(retryFail.status, 200);
  let boot = await api.boot(employee.id);
  assert.equal(boot.trainingTasks.filter((task) => task.parentTaskId).length, 1);
  assert.equal(boot.metrics.rootTrainingCount, 1);
  assert.equal(boot.metrics.retryTraining, 1);
  assert.equal(boot.metrics.completedTraining, 0);
  assert.equal((await api.post(`/training/${retryId}/start`, {}, employee.id)).body.status, 'learning');
  const passPayload = { selectedSteps: ['isolate', 'record', 'report', 'followup'], note: '保留测量证据，隔离批次，向主管上报并跟进复核闭环。', requestKey: 'retry-pass' };
  const passed = await api.post(`/training/${retryId}/submit`, passPayload, employee.id);
  assert.equal(passed.status, 200);
  assert.equal(passed.body.attempt.score, 100);
  assert.equal((await api.post(`/training/${retryId}/submit`, passPayload, employee.id)).body.attempt.id, passed.body.attempt.id);
  boot = await api.boot(employee.id);
  assert.equal(boot.trainingTasks.find((task) => task.id === original.id).status, 'completed');
  assert.equal(boot.trainingTasks.find((task) => task.id === retryId).attempts.length, 2);
  assert.equal(boot.metrics.completedTraining, 1);
  assert.equal(boot.metrics.rootTrainingCount, 1);
  assert.equal(boot.metrics.retryTraining, 0);
  assert.equal((await api.post(`/training/${retryId}/submit`, { ...passPayload, requestKey: 'completed-new' }, employee.id)).status, 409);
});

test('incorrect selections fail the rubric even when every required step is selected', async (t) => {
  const api = await fixture(t);
  const employee = await api.activate();
  const boot = await api.boot(employee.id);
  const task = boot.trainingTasks[0];
  assert.equal((await api.post(`/training/${task.id}/start`, {}, employee.id)).status, 200);
  const response = await api.post(`/training/${task.id}/submit`, { selectedSteps: boot.trainingScenario.steps.map((step) => step.id), note: '', requestKey: 'select-all' }, employee.id);
  assert.equal(response.status, 200);
  assert.equal(response.body.attempt.score, 50);
  assert.equal(response.body.task.status, 'needs_retry');
  assert.match(response.body.attempt.feedback, /不当处置/);
});

test('SQLite persists state and idempotency across restarts; reset clears only this demo', async (t) => {
  const api = await fixture(t);
  const employee = await api.activate('cand-chen', ['reporting']);
  const date = (await api.boot()).suggestedLeaveDate;
  const payload = { date, period: 'morning', reason: '重启持久化演示', requestKey: 'persisted-leave' };
  const leave = await api.post('/leaves', payload, employee.id);
  await api.stop();
  await api.start();
  let boot = await api.boot(employee.id);
  assert.equal(boot.employees[0].name, '陈雨桐');
  assert.equal(boot.trainingTasks.length, 2);
  assert.equal(boot.leaves[0].id, leave.body.id);
  assert.equal((await api.post('/leaves', payload, employee.id)).body.id, leave.body.id);
  assert.equal((await api.boot()).leaves.length, 1);
  assert.equal((await api.post('/demo/reset', { confirm: 'yes' })).status, 400);
  assert.equal((await api.post('/demo/reset', { confirm: 'RESET' })).status, 200);
  boot = await api.boot();
  assert.equal(boot.employees.length, 0);
  assert.equal(boot.actors.length, 2);
  assert.equal(boot.candidates.length, 3);
  assert.ok(Object.values(boot.metrics).every((value, index) => index === 0 ? value === 3 : value === 0));
  assert.equal((await api.request('/bootstrap', { actor: employee.id })).status, 403);
  await api.stop();
  await api.start();
  assert.equal((await api.boot()).employees.length, 0);
});

test('invalid JSON and unknown APIs return JSON errors; source and database are not served', async (t) => {
  const api = await fixture(t);
  const invalid = await api.request('/assistant', { method: 'POST', raw: '{broken' });
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.error.code, 'INVALID_JSON');
  const missing = await api.request('/does-not-exist');
  assert.equal(missing.status, 404);
  assert.match(missing.headers.get('content-type'), /application\/json/);
  for (const path of ['/server/catalog.mjs', '/data/hrflow.sqlite', '/shared/contracts.ts']) {
    const response = await fetch(`${api.url}${path}`);
    const body = await response.text();
    assert.ok(!body.includes('export const baseActors') && !body.includes('SQLite format 3') && !body.includes('export interface Actor'));
  }
  assert.match(shanghaiToday(), /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(shanghaiToday(new Date('2026-10-30T16:30:00Z')), '2026-10-31');
});
