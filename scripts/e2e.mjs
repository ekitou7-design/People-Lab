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
const screenshots = [];
const fontAudits = [];
const pageErrors = [];
const blockedRequests = [];
let service;
let browser;
let page;
let closeApp;
let loadedAssets = [];

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

async function screenshot(name) {
  await page.screenshot({ path: path.join(outputDir, name), fullPage: true });
  if (!screenshots.includes(name)) screenshots.push(name);
}

async function goPage(name) {
  const button = page.getByTestId('primary-sidebar').getByRole('button', { name, exact: true });
  const onScreen = await button.evaluate(element => {
    const bounds = element.getBoundingClientRect();
    return bounds.right > 0 && bounds.left < window.innerWidth;
  });
  if (!onScreen) await page.getByRole('button', { name: '打开导航', exact: true }).click();
  await button.click();
}

async function fitViewport(width, height, description, screenshotName) {
  await page.setViewportSize({ width, height });
  const size = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
  check(size.scrollWidth <= size.width + 1, description);
  await screenshot(screenshotName);
}

async function linkedEvidence(candidate, evidence) {
  const source = page.getByRole('region', { name: '原文证据', exact: true });
  const section = source.locator(`[data-section-id="${evidence.sectionId}"][aria-current="true"]`);
  await section.waitFor({ state: 'visible' });
  const highlight = (await section.locator('mark.v2-highlight').allTextContents()).join('');
  return (await source.innerText()).includes(candidate.name) && highlight.includes(evidence.quote);
}

async function readableText(description) {
  const violations = await page.evaluate(() => [...document.querySelectorAll('body *')].flatMap(element => {
    if (!(element instanceof HTMLElement) || element.closest('[aria-hidden="true"], [hidden]')) return [];
    const style = getComputedStyle(element);
    const bounds = element.getBoundingClientRect();
    if (style.display === 'none' || style.visibility !== 'visible' || Number(style.opacity) === 0 || bounds.width <= 0 || bounds.height <= 0 || bounds.right <= 0 || bounds.left >= innerWidth || bounds.bottom <= 0) return [];
    const text = [...element.childNodes].filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent?.trim() || '').filter(Boolean).join(' ')
      || (element.matches('input, textarea, select') ? element.getAttribute('aria-label') || element.getAttribute('placeholder') || '' : '');
    const fontSize = Number.parseFloat(style.fontSize);
    return text && Number.isFinite(fontSize) && fontSize < 12 ? [{ tag: element.tagName.toLowerCase(), text: text.slice(0, 70), fontSize }] : [];
  }));
  fontAudits.push({ description, violations });
  if (violations.length) console.error(JSON.stringify({ description, violations }, null, 2));
  check(violations.length === 0, description);
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
  loadedAssets = await page.evaluate(() => [...document.querySelectorAll('script[src], link[rel="stylesheet"]')].map(element => element.getAttribute(element.tagName === 'SCRIPT' ? 'src' : 'href')).filter(Boolean));
  await goPage('驾驶舱');
  await readableText('visible desktop dashboard text and controls use at least 12px fonts');
  await screenshot('06-initial-dashboard.png');
  await page.setViewportSize({ width: 1024, height: 768 });
  const tabletSizing = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
  check(tabletSizing.scrollWidth <= tabletSizing.width + 1, 'initial HR dashboard fits a 1024px tablet viewport without document-level horizontal overflow');
  await screenshot('07-tablet-dashboard.png');
  await page.setViewportSize({ width: 1440, height: 1080 });
  const contextAssistant = page.getByRole('complementary', { name: '当前事项助手', exact: true });
  await contextAssistant.getByRole('button', { name: '查看原文证据', exact: true }).click();
  const assistantEvidence = candidate.evidence.find(item => item.status === 'unverified') || candidate.evidence.find(item => item.status === 'gap') || candidate.evidence[0];
  const assistantAbility = initial.position.abilities.find(item => item.id === assistantEvidence.abilityId);
  check(await page.getByRole('button', { name: `查看${candidate.name}档案`, exact: true }).getAttribute('aria-pressed') === 'true'
    && await page.getByRole('button', { name: `查看原文证据：${assistantAbility.name}`, exact: true }).getAttribute('aria-pressed') === 'true', 'dashboard assistant opens the actual candidate and evidence task');
  await goPage('招聘工作台');
  await page.getByRole('button', { name: `查看${candidate.name}档案`, exact: true }).click();

  const citedEvidence = candidate.evidence.find(item => item.quote && item.status === 'supported');
  const ability = initial.position.abilities.find(item => item.id === citedEvidence.abilityId);
  await page.getByRole('button', { name: `查看原文证据：${ability.name}`, exact: true }).click();
  const evidenceRegion = page.getByRole('region', { name: '原文证据', exact: true });
  await evidenceRegion.waitFor({ state: 'visible' });
  const evidenceText = await evidenceRegion.innerText();
  check(evidenceText.includes(citedEvidence.quote.slice(0, 25)), 'candidate evidence opens the actual resume source');
  check(await linkedEvidence(candidate, citedEvidence), 'selected ability highlights the matching source section and verbatim quote');
  const anotherEvidence = candidate.evidence.find(item => item.status === 'supported' && item.abilityId !== citedEvidence.abilityId && item.quote);
  const anotherAbility = initial.position.abilities.find(item => item.id === anotherEvidence.abilityId);
  await page.getByRole('button', { name: `查看原文证据：${anotherAbility.name}`, exact: true }).click();
  check(await linkedEvidence(candidate, anotherEvidence), 'switching abilities updates the source highlight without opening a dialog');
  const anotherCandidate = initial.candidates.find(item => item.id !== candidate.id);
  const otherEvidence = anotherCandidate.evidence.find(item => item.abilityId === anotherEvidence.abilityId);
  await page.getByRole('button', { name: `查看${anotherCandidate.name}档案`, exact: true }).click();
  check(await linkedEvidence(anotherCandidate, otherEvidence), 'switching candidates replaces the linked resume and removes the old candidate context');
  await page.getByRole('button', { name: `查看${candidate.name}档案`, exact: true }).click();
  await page.getByRole('button', { name: `查看原文证据：${ability.name}`, exact: true }).click();
  await screenshot('01-resume-evidence.png');
  await fitViewport(1440, 1080, 'three-column recruitment review fits a 1440px desktop viewport', '08-v2-recruitment-desktop.png');
  await fitViewport(1024, 768, 'recruitment review fits a 1024px tablet viewport', '09-v2-recruitment-tablet.png');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('group', { name: '切换审阅内容', exact: true }).getByRole('button', { name: '简历原文', exact: true }).click();
  check(await linkedEvidence(candidate, citedEvidence), 'mobile recruitment source tab keeps the selected candidate and evidence highlight');
  await readableText('visible mobile recruitment text and controls use at least 12px fonts');
  await fitViewport(390, 844, 'recruitment source review fits a 390px phone viewport', '10-v2-recruitment-mobile.png');
  await page.setViewportSize({ width: 1440, height: 1080 });
  const reviewTab = page.getByRole('group', { name: '切换审阅内容', exact: true }).getByRole('button', { name: '能力核实', exact: true });
  if (await reviewTab.isVisible()) await reviewTab.click();
  await evidenceRegion.getByRole('button', { name: '对照岗位 SOP', exact: true }).click();
  await page.getByRole('region', { name: '知识原文', exact: true }).waitFor({ state: 'visible' });
  await page.getByRole('button', { name: '返回原任务', exact: true }).click();
  check(await linkedEvidence(candidate, citedEvidence)
    && await page.getByRole('button', { name: `查看原文证据：${ability.name}`, exact: true }).getAttribute('aria-pressed') === 'true', 'returning from a recruitment SOP preserves the candidate and selected ability');

  await page.getByRole('button', { name: '确认录用', exact: true }).click();
  const hireDialog = page.getByRole('dialog', { name: '确认录用候选人', exact: true });
  await hireDialog.waitFor({ state: 'visible' });
  await hireDialog.getByRole('button', { name: '确认录用', exact: true }).click();
  let snapshot = await poll(state, value => value.candidates.find(item => item.id === candidate.id)?.stage === 'hired', 'hire candidate');
  let employee = snapshot.employees.find(item => item.candidateId === candidate.id);
  check(employee?.status === 'pending', 'HR hiring creates a pending employee without activating the account');
  check(employee.confirmedNeeds.length === 0, 'unverified resume evidence is not silently turned into a development deficit');

  await goPage('驾驶舱');
  const remainingCandidate = snapshot.candidates.find(item => item.stage !== 'hired');
  await page.getByRole('button', { name: new RegExp(`^选择事项：${remainingCandidate.name}·`) }).click();
  const recruitmentContextSelected = (await contextAssistant.innerText()).includes(remainingCandidate.name);
  await page.getByRole('group', { name: '筛选待办类型', exact: true }).getByRole('button', { name: '入职', exact: true }).click();
  const filteredAssistantText = await contextAssistant.innerText();
  check(recruitmentContextSelected && filteredAssistantText.includes(employee.name)
    && filteredAssistantText.includes('完成入职清单') && !filteredAssistantText.includes(remainingCandidate.name), 'filtering mixed work items updates the assistant to an item inside the active filter');

  await goPage('入职管理');
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
  await goPage('驾驶舱');
  const workFilters = page.getByRole('group', { name: '筛选待办类型', exact: true });
  check(await workFilters.getByRole('button', { name: '全部', exact: true }).getAttribute('aria-pressed') === 'true'
    && await page.getByRole('button', { name: new RegExp(`^选择事项：${employee.name}·`) }).count() > 0
    && await page.getByRole('button', { name: new RegExp(`^选择事项：${remainingCandidate.name}·`) }).count() > 0, 'completing the last item in a filter restores all real recruitment and training work items');

  await page.getByRole('combobox', { name: '切换演示身份', exact: true }).selectOption(employeeActor.id);
  await goPage('员工服务');
  const question = page.getByRole('textbox', { name: '向员工服务助手提问', exact: true });
  await question.fill('请问年假怎么申请？');
  await question.press('Enter');
  const employeeState = () => state(employeeActor.id);
  snapshot = await poll(employeeState, value => value.messages.some(item => item.role === 'assistant' && item.citations.length), 'answer with policy citation');
  const answer = [...snapshot.messages].reverse().find(item => item.role === 'assistant' && item.citations.length);
  const citation = answer.citations[0];
  const document = snapshot.knowledge.find(item => item.id === citation.knowledgeId);
  await page.getByRole('button', { name: `查看知识引用：${document.title}`, exact: true }).last().click();
  const knowledgeRegion = page.getByRole('region', { name: '知识原文', exact: true });
  await knowledgeRegion.waitFor({ state: 'visible' });
  const knowledgeText = await knowledgeRegion.innerText();
  check(knowledgeText.includes(document.version) && knowledgeText.includes(citation.quote.slice(0, 20)), 'policy answer opens the cited document version and source text');
  await screenshot('02-policy-citation.png');
  await page.getByRole('button', { name: '返回原任务', exact: true }).click();
  check(await question.isVisible(), 'knowledge source returns to the employee service task');

  const leaveCard = page.getByRole('region', { name: '请假办理', exact: true });
  await leaveCard.getByRole('button', { name: '填写请假申请', exact: true }).click();
  let leaveForm = page.getByRole('form', { name: '请假申请表单', exact: true });
  const privateDraft = `仅属于${candidate.name}的未提交草稿`;
  await leaveForm.getByLabel('请假事由', { exact: true }).fill(privateDraft);
  await question.fill('尚未发送的私有问题');
  await page.getByRole('combobox', { name: '切换演示身份', exact: true }).selectOption('actor-manager');
  await goPage('员工服务');
  check(await page.getByRole('form', { name: '请假申请表单', exact: true }).count() === 0
    && !(await page.locator('body').innerText()).includes(privateDraft), 'switching roles clears and hides employee-only drafts');
  await page.getByRole('combobox', { name: '切换演示身份', exact: true }).selectOption(employeeActor.id);
  await goPage('员工服务');
  await leaveCard.getByRole('button', { name: '填写请假申请', exact: true }).click();
  leaveForm = page.getByRole('form', { name: '请假申请表单', exact: true });
  check(await leaveForm.getByLabel('请假事由', { exact: true }).inputValue() === '' && await question.inputValue() === '', 'returning to an employee starts with empty private form and chat drafts');
  await leaveForm.getByLabel('请假日期', { exact: true }).fill(snapshot.suggestedLeaveDate);
  await leaveForm.getByLabel('请假时段', { exact: true }).selectOption('afternoon');
  await leaveForm.getByLabel('请假事由', { exact: true }).fill('办理个人事务（自动化演示）');
  const processingPolicyDocument = snapshot.knowledge.find(item => item.id === 'policy-leave');
  const processingPolicyQuote = processingPolicyDocument.sections.find(item => item.id === 'leave-request').content;
  const processingPolicy = leaveCard.getByRole('complementary', { name: '请假制度依据', exact: true });
  const policyVisible = async () => {
    const text = await processingPolicy.innerText();
    return text.includes(processingPolicyDocument.version) && text.includes(processingPolicyQuote);
  };
  const editingPolicyVisible = await policyVisible();
  await processingPolicy.getByRole('button', { name: `查看办理依据：${processingPolicyDocument.title}`, exact: true }).click();
  await knowledgeRegion.waitFor({ state: 'visible' });
  await page.getByRole('button', { name: '返回原任务', exact: true }).click();
  leaveForm = page.getByRole('form', { name: '请假申请表单', exact: true });
  check(await leaveForm.getByLabel('请假事由', { exact: true }).inputValue() === '办理个人事务（自动化演示）'
    && await leaveForm.getByLabel('请假日期', { exact: true }).inputValue() === snapshot.suggestedLeaveDate
    && await leaveForm.getByLabel('请假时段', { exact: true }).inputValue() === 'afternoon', 'returning from policy evidence preserves the unsent inline leave draft');
  await leaveForm.getByRole('button', { name: '预览申请', exact: true }).click();
  const preview = leaveCard.getByRole('region', { name: '请假申请预览', exact: true });
  await preview.waitFor({ state: 'visible' });
  check((await preview.innerText()).includes('0.5'), 'employee reviews a half-day leave before submission');
  check(await page.getByRole('dialog').count() === 0, 'leave preview stays in the current task card without opening a dialog');
  await preview.getByRole('button', { name: '返回修改', exact: true }).click();
  leaveForm = page.getByRole('form', { name: '请假申请表单', exact: true });
  check(await leaveForm.getByLabel('请假事由', { exact: true }).inputValue() === '办理个人事务（自动化演示）'
    && await leaveForm.getByLabel('请假时段', { exact: true }).inputValue() === 'afternoon', 'editing the inline preview preserves the entered reason and period');
  await leaveForm.getByLabel('请假事由', { exact: true }).fill('办理个人事务（自动化演示，已核对）');
  await leaveForm.getByRole('button', { name: '预览申请', exact: true }).click();
  check((await preview.innerText()).includes('已核对'), 'edited content is reflected in the same inline preview');
  const previewPolicyVisible = await policyVisible();
  await fitViewport(1440, 1080, 'inline leave processing fits a 1440px desktop viewport', '11-v2-service-inline-desktop.png');
  await fitViewport(1024, 768, 'inline leave processing fits a 1024px tablet viewport', '12-v2-service-inline-tablet.png');
  await fitViewport(390, 844, 'inline leave processing fits a 390px phone viewport', '13-v2-service-inline-mobile.png');
  await readableText('visible mobile inline service text and controls use at least 12px fonts');
  await page.setViewportSize({ width: 1440, height: 1080 });
  let failedRefreshOnce = false;
  let leavePostCount = 0;
  const countLeavePosts = request => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/leaves') leavePostCount += 1;
  };
  const failSavedWriteRefresh = async route => {
    if (!failedRefreshOnce) {
      failedRefreshOnce = true;
      await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { code: 'TEST_SYNC_UNAVAILABLE', message: '隔离浏览器测试：本次同步暂不可用' } }) });
    } else await route.fallback();
  };
  page.on('request', countLeavePosts);
  await page.route('**/api/bootstrap', failSavedWriteRefresh);
  await preview.getByRole('button', { name: '提交申请', exact: true }).click();
  snapshot = await poll(employeeState, value => value.leaves.some(item => item.status === 'pending'), 'submit leave');
  const leave = snapshot.leaves.find(item => item.status === 'pending');
  const submittedResult = leaveCard.getByRole('region', { name: '申请办理结果', exact: true });
  await submittedResult.waitFor({ state: 'visible' });
  check(await submittedResult.getAttribute('data-leave-id') === leave.id && (await submittedResult.innerText()).includes(leave.id), 'the same task card displays the actual submitted request ID and result');
  const savedWriteWarning = page.getByRole('alert').filter({ hasText: '操作已保存' });
  await savedWriteWarning.waitFor({ state: 'visible' });
  check(failedRefreshOnce && leavePostCount === 1 && snapshot.leaves.length === 1
    && (await savedWriteWarning.innerText()).includes('请勿重复办理'), 'a failed refresh after a saved write preserves the real result and warning without resubmitting');
  await savedWriteWarning.getByRole('button', { name: '重新同步', exact: true }).click();
  await poll(() => savedWriteWarning.count(), count => count === 0, 'recover one failed bootstrap synchronization');
  await page.unroute('**/api/bootstrap', failSavedWriteRefresh);
  page.off('request', countLeavePosts);
  check(editingPolicyVisible && previewPolicyVisible && await policyVisible(), 'the policy version and verbatim basis remain available during editing, preview and result');
  check(snapshot.employees.find(item => item.id === employee.id).leaveBalance === 3, 'pending leave does not deduct the balance');
  await page.reload({ waitUntil: 'networkidle' });
  snapshot = await employeeState();
  check(snapshot.leaves.some(item => item.id === leave.id && item.status === 'pending'), 'submitted request survives refresh');
  await goPage('员工服务');
  await page.getByRole('button', { name: new RegExp(leave.date) }).first().click();
  await submittedResult.waitFor({ state: 'visible' });
  check((await submittedResult.innerText()).includes(leave.id), 'recent requests reopen the persisted inline result after refresh');

  await page.getByRole('combobox', { name: '切换演示身份', exact: true }).selectOption('actor-manager');
  await goPage('员工服务');
  await page.getByRole('button', { name: '批准申请', exact: true }).click();
  await page.getByRole('dialog', { name: '批准请假申请', exact: true }).getByRole('button', { name: '批准申请', exact: true }).click();
  snapshot = await poll(state, value => value.leaves.find(item => item.id === leave.id)?.status === 'approved', 'manager approves leave');
  check(snapshot.employees.find(item => item.id === employee.id).leaveBalance === 2.5, 'manager approval deducts the balance exactly once');

  await page.getByRole('combobox', { name: '切换演示身份', exact: true }).selectOption(employeeActor.id);
  await goPage('岗位培训');
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
  await fitViewport(390, 844, 'completed training fits a 390px phone viewport', '14-v2-training-mobile.png');
  await readableText('visible mobile training text and controls use at least 12px fonts');
  await page.setViewportSize({ width: 1440, height: 1080 });

  await page.getByRole('combobox', { name: '切换演示身份', exact: true }).selectOption('actor-hr');
  await goPage('驾驶舱');
  snapshot = await state();
  check(snapshot.metrics.hiredCount === 1 && snapshot.metrics.activeEmployees === 1 && snapshot.metrics.approvedLeaves === 1, 'dashboard metrics reflect hiring, onboarding and leave approval');
  check(snapshot.metrics.completedTraining >= 1 && snapshot.metrics.rootTrainingCount >= snapshot.metrics.completedTraining, 'dashboard counts completed original training without inflating totals with retry tasks');
  await screenshot('04-desktop-dashboard.png');
  await page.reload({ waitUntil: 'networkidle' });
  check((await state()).metrics.approvedLeaves === 1, 'dashboard data persists after refresh');

  await page.getByRole('combobox', { name: '切换演示身份', exact: true }).selectOption(employeeActor.id);
  await goPage('员工服务');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('textbox', { name: '向员工服务助手提问', exact: true }).waitFor({ state: 'visible' });
  await poll(() => page.getByTestId('primary-sidebar').evaluate(element => element.getBoundingClientRect().right), right => right <= 1, 'mobile sidebar finishes closing');
  const sizing = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
  check(sizing.scrollWidth <= sizing.width + 1, 'employee service fits a 390px viewport without document-level horizontal overflow');
  await readableText('visible mobile employee service text and controls use at least 12px fonts');
  await screenshot('05-mobile-employee-service.png');

  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.getByRole('combobox', { name: '切换演示身份', exact: true }).selectOption('actor-hr');
  await page.getByRole('button', { name: '重置演示数据', exact: true }).click();
  await page.getByRole('dialog', { name: '重置演示数据', exact: true }).getByRole('button', { name: '确认重置', exact: true }).click();
  snapshot = await poll(state, value => value.employees.length === 0 && value.leaves.length === 0, 'reset temporary demo data');
  check(snapshot.candidates.length === 3 && snapshot.metrics.hiredCount === 0 && snapshot.trainingTasks.length === 0, 'HR reset restores the seed without touching the normal demo database');
  check(pageErrors.length === 0, `browser runs without uncaught exceptions: ${pageErrors.join('; ')}`);
  check(blockedRequests.length === 0, `complete flow uses local assets and API only: ${blockedRequests.join('; ')}`);
  await writeFile(path.join(outputDir, 'e2e-report.json'), JSON.stringify({ status: 'passed', uiVersion: 'v2', baseChecksRetained: 21, loadedAssets, assertions, screenshots, fontAudits }, null, 2));
  await rm(path.join(outputDir, 'failure.png'), { force: true });
  console.log(`HRFlow browser acceptance passed. Screenshots: ${outputDir}`);
} catch (error) {
  await mkdir(outputDir, { recursive: true });
  if (page) await screenshot('failure.png').catch(() => {});
  await writeFile(path.join(outputDir, 'e2e-report.json'), JSON.stringify({ status: 'failed', error: error.stack, loadedAssets, assertions, pageErrors, blockedRequests, screenshots, fontAudits }, null, 2));
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
