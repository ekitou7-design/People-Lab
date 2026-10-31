import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { createApp } from '../server/app.mjs';

/**
 * Covers the Phase 3 talent-execution closed loop end to end through the real browser UI:
 * 1. Internal assignment execution requires an explicit manager risk confirmation form
 *    (never implied by HR approval alone) and commits a real Order2People capacity
 *    reservation, which in turn makes the originating calculation stale.
 * 2. HR can link an already-existing candidate to a SkillBridge-originated requisition
 *    draft on the Recruitment workbench, and move it to "open" / "closed" — without ever
 *    fabricating a new candidate record.
 */
const dir = await mkdtemp(join(tmpdir(), 'talent-execution-browser-'));
const output = 'test-results/talent-execution';
await mkdir(output, { recursive: true });
const instance = createApp({ dataDir: dir });
const server = instance.app.listen(0, '127.0.0.1');
await new Promise((r) => server.once('listening', r));
let browser, page;
const checks = [], errors = [];
const check = (ok, label) => { assert.ok(ok, label); checks.push(label); console.log('PASS', label); };

try {
  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) });
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (dialog) => dialog.accept());
  const url = `http://127.0.0.1:${server.address().port}`;
  await page.goto(url);

  // --- Build the acceptance scenario via the real Order2People UI: load the demo sample
  // (which seeds the already-active, fully-qualified 'emp-o2p-demo' employee with a
  // confirmed calendar/qualification), confirm the range, calculate, and confirm the
  // result. Using the existing demo employee (same as skillbridge-e2e.mjs) avoids hiring a
  // brand-new employee with no Order2People calendar, which would correctly block the
  // calculation per the "no active employee's capacity may be assumed" business rule.
  await page.getByRole('button', { name: '生产需求', exact: true }).click();
  await page.getByRole('button', { name: '载入 / 重置演示样例' }).click();
  await page.getByLabel('每日数量 1', { exact: true }).waitFor();
  await page.waitForFunction(() => document.querySelector('textarea[aria-label="每日工序需求"]')?.value.includes('o2p-demo-demand'));
  await page.getByRole('checkbox', { name: /已核对窗口内全部订单/ }).check();
  await page.getByRole('button', { name: '确认输入并计算' }).click();
  await page.getByText(/calculated · v1/).waitFor();
  await page.getByRole('button', { name: 'HR 确认结果', exact: true }).click();
  await page.getByText(/confirmed · v2/).waitFor();

  // --- Open the SkillBridge case for this demand.
  await page.getByRole('button', { name: '前往 SkillBridge 分析' }).click();
  await page.getByRole('button', { name: '发起 SkillBridge 分析' }).and(page.locator(':enabled')).click();
  await page.getByRole('heading', { name: /内部人才与技能差距/ }).waitFor();

  // --- Approve and execute the internal_assignment proposal. The form must require both
  // a manager name and a risk acknowledgement before "确认执行" does anything real.
  const internalProposal = page.locator('.sb-proposal', { hasText: '内部调配' }).first();
  await internalProposal.getByRole('button', { name: 'HR 审核' }).click();
  await internalProposal.getByLabel('审核说明').fill('同意调配，已了解容量情况');
  await internalProposal.getByRole('button', { name: '批准' }).click();
  await internalProposal.getByText('已批准').first().waitFor();
  await internalProposal.getByRole('button', { name: '执行方案' }).click();
  check(await internalProposal.getByLabel('主管确认人').isVisible(), 'internal_assignment execution form requires an explicit manager confirmation field');
  check(await internalProposal.getByLabel('风险与原岗位影响说明').isVisible(), 'internal_assignment execution form requires an explicit risk/impact note field');
  await internalProposal.getByRole('button', { name: '确认执行' }).click();
  check(await internalProposal.getByText(/主管确认人与风险说明/).isVisible(), 'submitting without the manager confirmation and risk note is rejected rather than silently executed');
  await internalProposal.getByLabel('主管确认人').fill('周明远');
  await internalProposal.getByLabel('风险与原岗位影响说明').fill('已确认原岗位任务可在本窗口内让出，不产生新缺口');
  await internalProposal.getByRole('button', { name: '确认执行' }).click();
  await internalProposal.getByText('已落地执行').waitFor();
  check(true, 'HR can execute an approved internal_assignment proposal only after supplying manager confirmation and risk note');

  // --- The executed assignment really committed capacity in Order2People: the originating
  // calculation must now be stale, since the gap it described has genuinely been retired.
  // The Order2People page only refetches on actor change, not on navigation, so a real user
  // clicks the existing "刷新已保存数据" (refresh saved data) button to see the new status.
  await internalProposal.getByRole('button', { name: /前往生产需求查看占用与重新计算/ }).click();
  await page.getByRole('button', { name: '刷新已保存数据' }).click();
  await page.getByText(/stale · v2/).waitFor();
  check(true, 'executing an internal assignment commits a real Order2People reservation and invalidates the calculation it was meant to close');

  // --- External requisition: approve, execute, then link an existing candidate from the
  // Recruitment workbench without fabricating a new one.
  await page.getByRole('button', { name: 'SkillBridge', exact: true }).click();
  await page.locator('.sb-case-row').first().getByRole('button', { name: '打开记录' }).click();
  const extProposal = page.locator('.sb-proposal', { hasText: '外部招聘' }).first();
  if (await extProposal.getByRole('button', { name: 'HR 审核' }).count()) {
    await extProposal.getByRole('button', { name: 'HR 审核' }).click();
    await extProposal.getByLabel('审核说明').fill('同意生成招聘需求草稿');
    await extProposal.getByRole('button', { name: '批准' }).click();
    await extProposal.getByText('已批准').first().waitFor();
    await extProposal.getByRole('button', { name: '执行方案' }).click();
    await extProposal.getByRole('button', { name: '确认执行' }).click();
    await extProposal.getByText('已落地执行').waitFor();
  }
  await extProposal.getByRole('button', { name: /前往招聘工作台/ }).click();
  await page.getByText('来自 SkillBridge 的招聘需求草稿').waitFor();
  const requisitionRow = page.locator('.v2-requisition-row').first();
  await requisitionRow.getByLabel('选择要关联的候选人').selectOption({ label: '林知遥' }).catch(async () => {
    // Fall back to whatever candidate option actually exists in this demo roster.
    const options = await requisitionRow.getByLabel('选择要关联的候选人').locator('option').allTextContents();
    const real = options.find((label) => label !== '选择候选人…');
    await requisitionRow.getByLabel('选择要关联的候选人').selectOption({ label: real });
  });
  await requisitionRow.getByRole('button', { name: '关联' }).click();
  await requisitionRow.getByText('招聘中').waitFor();
  check(true, 'HR can link an already-existing candidate to a SkillBridge-originated requisition draft, moving it to open');
  await requisitionRow.getByRole('button', { name: '关闭需求' }).click();
  await requisitionRow.getByText('已关闭', { exact: true }).waitFor();
  check(true, 'HR can close a requisition draft once evaluation is finished');

  await page.screenshot({ path: join(output, 'desktop.png'), fullPage: true, animations: 'disabled' });
  check(errors.length === 0, 'no browser runtime errors');
  await writeFile(join(output, 'report.json'), JSON.stringify({ status: 'passed', checks, errors }, null, 2));
} catch (e) {
  const bodyText = await page?.locator('body').innerText().catch(() => '');
  await page?.screenshot({ path: join(output, 'failure.png'), fullPage: true }).catch(() => {});
  await writeFile(join(output, 'failure-body.txt'), bodyText || '');
  await writeFile(join(output, 'report.json'), JSON.stringify({ status: 'failed', checks, errors, error: e.stack }, null, 2));
  throw e;
} finally {
  await browser?.close();
  await new Promise((r) => server.close(r));
  instance.close();
  await rm(dir, { recursive: true, force: true });
}
