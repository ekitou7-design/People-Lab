import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { createApp } from '../server/app.mjs';

/**
 * Covers the Phase 3 talent-execution closed loop end to end through the real browser UI:
 * 1. Manager confirmation cannot override insufficient incremental capacity.
 * 2. Formally verified new supply invalidates old results and closes the gap on recalculation.
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
  await page.getByRole('button', { name: '人才方案', exact: true }).click();
  await page.getByRole('button', { name: '载入内部人才演示样例' }).click();
  await page.getByRole('button', { name: '载入内部人才演示样例' }).and(page.locator(':enabled')).waitFor();
  const api = async (path, body, method = 'POST') => {
    const response = await fetch(`${url}/api${path}`, { method: body ? method : 'GET', headers: { 'Content-Type': 'application/json', 'x-demo-actor': 'actor-hr' }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const value = await response.json(); assert.ok(response.ok, JSON.stringify(value)); return value;
  };


  // --- Build the acceptance scenario via the real Order2People UI: load the demo sample
  // (which seeds the already-active, fully-qualified 'emp-o2p-demo' employee with a
  // confirmed calendar/qualification), confirm the range, calculate, and confirm the
  // result. Using the existing demo employee (same as skillbridge-e2e.mjs) avoids hiring a
  // brand-new employee with no Order2People calendar, which would correctly block the
  // calculation per the "no active employee's capacity may be assumed" business rule.
  await page.getByRole('button', { name: '生产用工', exact: true }).click();
  await page.getByRole('button', { name: '载入或恢复生产样例' }).click();
  await page.getByLabel('每日数量 1', { exact: true }).waitFor();
  await page.waitForFunction(() => document.querySelector('textarea[aria-label="每日工序需求"]')?.value.includes('o2p-demo-demand'));
  await page.getByRole('checkbox', { name: /已核对窗口内全部订单/ }).check();
  await page.getByRole('button', { name: '确认输入并计算' }).click();
  await page.getByText(/待确认 · v1/).waitFor();
  await page.getByRole('button', { name: 'HR 确认结果', exact: true }).click();
  await page.getByText(/已确认 · v2/).waitFor();

  // --- Open the SkillBridge case for this demand.
  await page.getByRole('button', { name: '前往人才方案' }).click();
  await page.getByRole('button', { name: '分析人才方案' }).and(page.locator(':enabled')).click();
  await page.getByRole('heading', { name: /内部人才与资格差距/ }).waitFor();

  // --- Approve and execute the internal_assignment proposal. The form must require both
  // a manager name and a risk acknowledgement before "确认执行" does anything real.
  const internalProposal = page.locator('.sb-proposal', { hasText: '内部调配' }).first();
  await internalProposal.getByRole('button', { name: 'HR 审核' }).click();
  await internalProposal.getByLabel('审核说明').fill('同意调配，已了解容量情况');
  await internalProposal.getByRole('button', { name: '批准' }).click();
  await internalProposal.getByText('已批准').first().waitFor();
  await internalProposal.getByRole('button', { name: /创建培训任务|创建招聘需求草稿|创建调配占用/ }).click();
  check(await internalProposal.getByLabel('主管确认人').isVisible(), 'internal_assignment execution form requires an explicit manager confirmation field');
  check(await internalProposal.getByLabel('风险与原岗位影响说明').isVisible(), 'internal_assignment execution form requires an explicit risk/impact note field');
  await internalProposal.getByRole('button', { name: '确认创建' }).click();
  check(await internalProposal.getByText(/主管确认人与风险说明/).isVisible(), 'submitting without the manager confirmation and risk note is rejected rather than silently executed');
  await internalProposal.getByLabel('主管确认人').fill('周明远');
  await internalProposal.getByLabel('风险与原岗位影响说明').fill('已确认原岗位任务可在本窗口内让出，不产生新缺口');
  await internalProposal.getByRole('button', { name: '确认创建' }).click();
  await page.getByText(/资格或可新增分配工时不足/).waitFor();
  check((await api('/v1/order2people/reservations')).items.length === 0, 'manager confirmation cannot override zero incremental capacity; no reservation is written');
  check((await api('/v1/order2people/calculations')).items.at(-1).totals.gapSeconds === 7200, 'rejected assignment preserves the real 2h gap');

  // --- External requisition: approve, execute, then link an existing candidate from the
  // Recruitment workbench without fabricating a new one.
  await page.getByRole('button', { name: '人才方案', exact: true }).click();
  await page.locator('.sb-case-row').first().getByRole('button', { name: '打开记录' }).click();
  const extProposal = page.locator('.sb-proposal', { hasText: '外部招聘' }).first();
  if (await extProposal.getByRole('button', { name: 'HR 审核' }).count()) {
    await extProposal.getByRole('button', { name: 'HR 审核' }).click();
    await extProposal.getByLabel('审核说明').fill('同意生成招聘需求草稿');
    await extProposal.getByRole('button', { name: '批准' }).click();
    await extProposal.getByText('已批准').first().waitFor();
    await extProposal.getByRole('button', { name: /创建培训任务|创建招聘需求草稿|创建调配占用/ }).click();
    await extProposal.getByRole('button', { name: '确认创建' }).click();
    await extProposal.getByText('已执行').waitFor();
  }
  await extProposal.getByRole('button', { name: /前往招聘管理/ }).click();
  await page.getByText('招聘需求草稿 · 来自人才方案').waitFor();
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

  // A real qualification maintenance operation introduces usable supply. Training alone does not.
  await page.getByRole('button', { name: '人才方案', exact: true }).click();
  const dev = page.locator('.sb-proposal', { hasText: '内部培养' }).first();
  await dev.getByRole('button', { name: 'HR 审核' }).click();
  await dev.getByLabel('审核说明').fill('安排培养，完成后另行核验资格');
  await dev.getByRole('button', { name: '批准' }).click();
  await dev.getByText('已批准').first().waitFor();
  await dev.getByRole('button', { name: /创建培训任务|创建招聘需求草稿|创建调配占用/ }).click();
  await dev.getByRole('button', { name: '确认创建' }).click();
  await dev.getByText('已执行').waitFor();
  const bootstrap = await api('/bootstrap');
  const task = bootstrap.trainingTasks.find(t => t.skillBridgeProposalId);
  assert.ok(task);
  await dev.getByRole('button', { name: '查看培训任务' }).click();
  await page.getByText(task.title, { exact: true }).and(page.locator(':visible')).first().waitFor();
  check(!(await page.locator('body').innerText()).includes('先完成录用与实际入职'), 'created development task is immediately visible without reload');
  const before = (await api('/v1/order2people/qualifications')).items.find(q => q.id === 'skillbridge-demo-qualification');
  assert.equal(before.status, 'unverified');
  await api(`/v1/order2people/qualifications/${before.id}`, { expectedRevision: before.revision, patch: { status: 'verified' }, reason: '虚构案例：资格负责人完成正式核验，非培训自动授予', requestKey: 'formal-qualification' }, 'PATCH');
  await page.getByRole('button', { name: '生产用工', exact: true }).click();
  await page.getByText(/已过期 · v2/).waitFor();
  check(await page.getByRole('button', { name: '导出缺口数据（JSON）' }).isDisabled(), 'returning to production immediately shows stale and disables old export');
  await page.getByRole('checkbox', { name: /已核对窗口内全部订单/ }).check();
  await page.getByRole('button', { name: '确认输入并计算' }).click();
  await page.getByText(/待确认 · v1/).waitFor();
  const latest = (await api('/v1/order2people/calculations')).items.at(-1);
  assert.deepEqual([latest.totals.demandSeconds, latest.totals.allocatedSeconds, latest.totals.gapSeconds], [36000, 36000, 0]);
  check(true, 'formally verified new supply recalculates 10h demand / 10h allocated / zero gap');
  await page.getByRole('button', { name: 'HR 确认结果', exact: true }).and(page.locator(':enabled')).click();
  await page.getByRole('button', { name: '人才方案', exact: true }).click();
  await page.getByText('当前无待处理缺口', { exact: true }).waitFor();
  check(await page.getByText('已确认结果中没有待处理的用工缺口，可在生产用工中查看计算记录。', { exact: true }).isVisible(), 'zero-gap empty state does not ask for another calculation');
  await page.screenshot({ path: join(output, 'zero-gap-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: join(output, 'zero-gap-mobile.png'), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  check(true, 'SkillBridge consumes latest confirmed results and no longer offers the closed gap');
  await page.reload();
  await page.getByRole('button', { name: '培训管理', exact: true }).click();
  await page.getByText(task.title, { exact: true }).and(page.locator(':visible')).first().waitFor();
  check((await api('/bootstrap')).trainingTasks.filter(t => t.skillBridgeProposalId === task.skillBridgeProposalId).length === 1, 'refresh preserves one traceable development task');
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
