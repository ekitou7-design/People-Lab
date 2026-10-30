import assert from 'node:assert/strict';
import { access, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createApp } from '../server/app.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = path.join(root, 'test-results');
const dataDir = await mkdtemp(path.join(os.tmpdir(), 'hrflow-e2e-'));
const assertions = [];
const pageErrors = [];
const blockedRequests = [];
let service;
let browser;
let page;
let closeApp;

function check(condition, description) {
  assert.ok(condition, description);
  assertions.push(description);
  console.log(`PASS ${description}`);
}

async function poll(read, predicate, description) {
  const deadline = Date.now() + 10_000;
  let value;
  while (Date.now() < deadline) {
    value = await read();
    if (predicate(value)) return value;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out: ${description}`);
}

async function closeDialog() {
  const dialog = page.getByRole('dialog');
  const close = dialog.getByRole('button', { name: '关闭弹窗', exact: true });
  if (await close.count()) await close.click();
  else await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'hidden' });
}

async function screenshot(name) {
  await page.screenshot({ path: path.join(outputDir, name), fullPage: true });
}

try {
  await access(path.join(root, 'dist', 'index.html')).catch(() => {
    throw new Error('Build the frontend first: npm run build');
  });
  await mkdir(outputDir, { recursive: true });
  const created = await createApp({ dataDir });
  closeApp = created.close;
  service = await new Promise((resolve, reject) => {
    const listening = created.app.listen(0, '127.0.0.1', () => resolve(listening));
    listening.once('error', reject);
  });
  const origin = `http://127.0.0.1:${service.address().port}`;
  const state = async (actor = 'actor-hr') => {
    const response = await fetch(`${origin}/api/bootstrap`, { headers: { 'x-demo-actor': actor } });
    assert.equal(response.status, 200);
    return response.json();
  };
  const initial = await state();
  check(initial.candidates.length === 3 && initial.employees.length === 0, 'isolated demo starts with three candidates and no employees');
  const candidate = initial.candidates.find(item => item.id === 'cand-chen');
  assert.ok(candidate, 'Chen candidate exists');

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1080 }, locale: 'zh-CN', timezoneId: 'Asia/Shanghai', reducedMotion: 'reduce' });
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin === origin || ['data:', 'blob:'].includes(url.protocol)) return route.continue();
    blockedRequests.push(route.request().url());
    return route.abort();
  });
  page = await context.newPage();
  page.setDefaultTimeout(10_000);
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '驾驶舱', exact: true }).click();
  await screenshot('06-initial-dashboard.png');
  await page.setViewportSize({ width: 1024, height: 768 });
  const tabletSizing = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
  check(tabletSizing.scrollWidth <= tabletSizing.width + 1, 'initial HR dashboard fits a 1024px tablet viewport without document-level horizontal overflow');
  await screenshot('07-tablet-dashboard.png');
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.getByRole('button', { name: '招聘工作台', exact: true }).click();
  await page.getByRole('button', { name: `查看${candidate.name}档案`, exact: true }).click();

  const citedEvidence = candidate.evidence.find(item => item.quote && item.status === 'supported');
  const ability = initial.position.abilities.find(item => item.id === citedEvidence.abilityId);
  await page.getByRole('button', { name: `查看原文证据：${ability.name}`, exact: true }).click();
  const evidenceDialog = page.getByRole('dialog', { name: '原文证据', exact: true });
  await evidenceDialog.waitFor({ state: 'visible' });
  const evidenceText = await evidenceDialog.innerText();
  check(evidenceText.includes(citedEvidence.quote.slice(0, 25)), 'candidate evidence opens the actual resume source');
  await screenshot('01-resume-evidence.png');
  await closeDialog();

  await page.getByRole('button', { name: '确认录用', exact: true }).click();
  const hireDialog = page.getByRole('dialog', { name: '确认录用候选人', exact: true });
  await hireDialog.waitFor({ state: 'visible' });
  await hireDialog.getByRole('button', { name: '确认录用', exact: true }).click();
  let snapshot = await poll(state, value => value.candidates.find(item => item.id === candidate.id)?.stage === 'hired', 'hire candidate');
  let employee = snapshot.employees.find(item => item.candidateId === candidate.id);
  check(employee?.status === 'pending', 'HR hiring creates a pending employee without activating the account');
  check(employee.confirmedNeeds.length === 0, 'unverified resume evidence is not silently turned into a development deficit');

  await page.getByRole('button', { name: '入职管理', exact: true }).click();
  const onboarding = snapshot.onboardings.find(item => item.employeeId === employee.id);
  assert.ok(onboarding);
  for (const item of onboarding.items) {
    const checkbox = page.getByRole('checkbox', { name: item.title, exact: true });
    await checkbox.click();
    await poll(state, value => value.onboardings.find(record => record.id === onboarding.id)?.items.find(step => step.id === item.id)?.done, `save onboarding item ${item.id}`);
    await poll(() => checkbox.isChecked(), Boolean, `render saved onboarding item ${item.id}`);
  }
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: '确认入职', exact: true }).click();
  snapshot = await poll(state, value => value.employees.find(item => item.id === employee.id)?.status === 'active', 'complete onboarding');
  employee = snapshot.employees.find(item => item.id === employee.id);
  const employeeActor = snapshot.actors.find(item => item.employeeId === employee.id);
  check(Boolean(employeeActor) && snapshot.trainingTasks.some(item => item.employeeId === employee.id), 'onboarding activates the employee actor and creates training tasks');

  await page.getByRole('combobox', { name: '切换演示身份', exact: true }).selectOption(employeeActor.id);
  await page.getByRole('button', { name: '员工服务', exact: true }).click();
  const question = page.getByRole('textbox', { name: '向员工服务助手提问', exact: true });
  await question.fill('请问年假怎么申请？');
  await question.press('Enter');
  const employeeState = () => state(employeeActor.id);
  snapshot = await poll(employeeState, value => value.messages.some(item => item.role === 'assistant' && item.citations.length), 'answer with policy citation');
  const answer = [...snapshot.messages].reverse().find(item => item.role === 'assistant' && item.citations.length);
  const citation = answer.citations[0];
  const document = snapshot.knowledge.find(item => item.id === citation.knowledgeId);
  await page.getByRole('button', { name: `查看知识引用：${document.title}`, exact: true }).last().click();
  const knowledgeDialog = page.getByRole('dialog', { name: '知识引用', exact: true });
  await knowledgeDialog.waitFor({ state: 'visible' });
  const knowledgeText = await knowledgeDialog.innerText();
  check(knowledgeText.includes(document.version) && knowledgeText.includes(citation.quote.slice(0, 20)), 'policy answer opens the cited document version and source text');
  await screenshot('02-policy-citation.png');
  await closeDialog();

  await page.getByRole('button', { name: '填写请假申请', exact: true }).last().click();
  await page.getByLabel('请假日期', { exact: true }).fill(snapshot.suggestedLeaveDate);
  await page.getByLabel('请假时段', { exact: true }).selectOption('afternoon');
  await page.getByLabel('请假事由', { exact: true }).fill('办理个人事务（自动化演示）');
  await page.getByRole('button', { name: '预览申请', exact: true }).click();
  const preview = page.getByRole('dialog', { name: '请假申请预览', exact: true });
  await preview.waitFor({ state: 'visible' });
  check((await preview.innerText()).includes('0.5'), 'employee reviews a half-day leave before submission');
  await preview.getByRole('button', { name: '提交申请', exact: true }).click();
  snapshot = await poll(employeeState, value => value.leaves.some(item => item.status === 'pending'), 'submit leave');
  const leave = snapshot.leaves.find(item => item.status === 'pending');
  check(snapshot.employees.find(item => item.id === employee.id).leaveBalance === 3, 'pending leave does not deduct the balance');
  await page.reload({ waitUntil: 'networkidle' });
  snapshot = await employeeState();
  check(snapshot.leaves.some(item => item.id === leave.id && item.status === 'pending'), 'submitted request survives refresh');

  await page.getByRole('combobox', { name: '切换演示身份', exact: true }).selectOption('actor-manager');
  await page.getByRole('button', { name: '员工服务', exact: true }).click();
  await page.getByRole('button', { name: '批准申请', exact: true }).click();
  await page.getByRole('dialog', { name: '批准请假申请', exact: true }).getByRole('button', { name: '批准申请', exact: true }).click();
  snapshot = await poll(state, value => value.leaves.find(item => item.id === leave.id)?.status === 'approved', 'manager approves leave');
  check(snapshot.employees.find(item => item.id === employee.id).leaveBalance === 2.5, 'manager approval deducts the balance exactly once');

  await page.getByRole('combobox', { name: '切换演示身份', exact: true }).selectOption(employeeActor.id);
  await page.getByRole('button', { name: '岗位培训', exact: true }).click();
  await page.getByRole('button', { name: '开始学习', exact: true }).first().click();
  snapshot = await employeeState();
  const required = snapshot.trainingScenario.steps.filter(item => item.required);
  await page.getByRole('checkbox', { name: required[0].label, exact: true }).check();
  await page.getByRole('textbox', { name: '演练说明', exact: true }).fill('先完成第一步，其他步骤尚未掌握。');
  await page.getByRole('button', { name: '提交演练', exact: true }).click();
  snapshot = await poll(employeeState, value => value.trainingTasks.some(item => item.kind === 'retry'), 'failed training creates retry task');
  const retry = snapshot.trainingTasks.find(item => item.kind === 'retry');
  check(snapshot.trainingTasks.find(item => item.id === retry.parentTaskId)?.status === 'needs_retry', 'incomplete scenario is marked for retry rather than passing');
  await screenshot('03-training-feedback.png');
  await page.getByRole('button', { name: '开始复练', exact: true }).click();
  await page.getByRole('checkbox', { name: required[0].label, exact: true }).check();
  await page.getByRole('textbox', { name: '演练说明', exact: true }).fill('再次练习仍只记住一个步骤，需要继续复习。');
  await page.getByRole('button', { name: '提交演练', exact: true }).click();
  snapshot = await poll(employeeState, value => value.trainingTasks.find(item => item.id === retry.id)?.status === 'needs_retry', 'retry can fail and be restarted');
  check(snapshot.trainingTasks.filter(item => item.parentTaskId === retry.parentTaskId && item.kind === 'retry').length === 1, 'repeated failure reuses the single retry task');
  await page.getByRole('button', { name: '开始复练', exact: true }).click();
  for (const step of required) {
    await page.getByRole('checkbox', { name: step.label, exact: true }).check();
  }
  await page.getByRole('textbox', { name: '演练说明', exact: true }).fill('依照演示SOP，完成隔离、记录、上报及后续跟进。');
  await page.getByRole('button', { name: '提交演练', exact: true }).click();
  snapshot = await poll(employeeState, value => value.trainingTasks.find(item => item.id === retry.id)?.status === 'completed', 'complete retry');
  check(snapshot.trainingTasks.find(item => item.id === retry.parentTaskId)?.status === 'completed', 'passing retry completes its original task');

  await page.getByRole('combobox', { name: '切换演示身份', exact: true }).selectOption('actor-hr');
  await page.getByRole('button', { name: '驾驶舱', exact: true }).click();
  snapshot = await state();
  check(snapshot.metrics.hiredCount === 1 && snapshot.metrics.activeEmployees === 1 && snapshot.metrics.approvedLeaves === 1, 'dashboard metrics reflect hiring, onboarding and leave approval');
  check(snapshot.metrics.completedTraining >= 1 && snapshot.metrics.rootTrainingCount >= snapshot.metrics.completedTraining, 'dashboard counts completed original training without inflating totals with retry tasks');
  await screenshot('04-desktop-dashboard.png');
  await page.reload({ waitUntil: 'networkidle' });
  check((await state()).metrics.approvedLeaves === 1, 'dashboard data persists after refresh');

  await page.getByRole('combobox', { name: '切换演示身份', exact: true }).selectOption(employeeActor.id);
  await page.getByRole('button', { name: '员工服务', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('textbox', { name: '向员工服务助手提问', exact: true }).waitFor({ state: 'visible' });
  await poll(() => page.locator('aside').evaluate(element => element.getBoundingClientRect().right), right => right <= 1, 'mobile sidebar finishes closing');
  const sizing = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
  check(sizing.scrollWidth <= sizing.width + 1, 'employee service fits a 390px viewport without document-level horizontal overflow');
  await screenshot('05-mobile-employee-service.png');

  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.getByRole('combobox', { name: '切换演示身份', exact: true }).selectOption('actor-hr');
  await page.getByRole('button', { name: '重置演示数据', exact: true }).click();
  await page.getByRole('dialog', { name: '重置演示数据', exact: true }).getByRole('button', { name: '确认重置', exact: true }).click();
  snapshot = await poll(state, value => value.employees.length === 0 && value.leaves.length === 0, 'reset temporary demo data');
  check(snapshot.candidates.length === 3 && snapshot.metrics.hiredCount === 0 && snapshot.trainingTasks.length === 0, 'HR reset restores the seed without touching the normal demo database');
  check(pageErrors.length === 0, `browser runs without uncaught exceptions: ${pageErrors.join('; ')}`);
  check(blockedRequests.length === 0, `complete flow uses local assets and API only: ${blockedRequests.join('; ')}`);
  await writeFile(path.join(outputDir, 'e2e-report.json'), JSON.stringify({ status: 'passed', assertions, screenshots: ['01-resume-evidence.png', '02-policy-citation.png', '03-training-feedback.png', '04-desktop-dashboard.png', '05-mobile-employee-service.png', '06-initial-dashboard.png', '07-tablet-dashboard.png'] }, null, 2));
  await rm(path.join(outputDir, 'failure.png'), { force: true });
  console.log(`HRFlow browser acceptance passed. Screenshots: ${outputDir}`);
} catch (error) {
  await mkdir(outputDir, { recursive: true });
  if (page) await screenshot('failure.png').catch(() => {});
  await writeFile(path.join(outputDir, 'e2e-report.json'), JSON.stringify({ status: 'failed', error: error.stack, assertions, pageErrors, blockedRequests }, null, 2));
  console.error(error);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (service) await new Promise(resolve => service.close(resolve));
  if (closeApp) await closeApp();
  const relative = path.relative(os.tmpdir(), dataDir);
  assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative) && path.basename(dataDir).startsWith('hrflow-e2e-'), 'temporary database cleanup must remain inside the system temporary directory');
  await rm(dataDir, { recursive: true, force: true });
}
