import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { createApp } from '../server/app.mjs';

const dir = await mkdtemp(join(tmpdir(), 'skillbridge-browser-'));
const output = 'test-results/skillbridge';
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
  const url = `http://127.0.0.1:${server.address().port}`;
  await page.goto(url);

  // --- Seed the labeled SkillBridge demo employee FIRST. Adding an active employee changes
  // Order2People's inputs and (by contract) makes any earlier calculation stale, so the
  // calculation must be created and confirmed after the roster is final.
  await page.getByRole('button', { name: '人才方案', exact: true }).click();
  await page.getByRole('button', { name: '载入内部人才演示样例' }).click();
  await page.getByRole('button', { name: '载入内部人才演示样例' }).and(page.locator(':enabled')).waitFor();

  // --- Build the acceptance scenario via the real Order2People UI: load the demo
  // sample, confirm the input range, calculate, and confirm the result.
  await page.getByRole('button', { name: '生产用工', exact: true }).click();
  await page.getByRole('button', { name: '载入或恢复生产样例' }).click();
  await page.getByLabel('每日数量 1', { exact: true }).waitFor();
  await page.waitForFunction(() => document.querySelector('textarea[aria-label="每日工序需求"]')?.value.includes('o2p-demo-demand'));
  await page.getByRole('checkbox', { name: /已核对窗口内全部订单/ }).check();
  await page.getByRole('button', { name: '确认输入并计算' }).click();
  await page.getByText(/待确认 · v1/).waitFor();
  check((await page.locator('.o2p-metrics').innerText()).includes('2.00 h'), 'Order2People produces the documented 2h quality-inspection gap');
  await page.getByRole('button', { name: 'HR 确认结果', exact: true }).click();
  await page.getByText(/已确认 · v2/).waitFor();

  // --- Enter SkillBridge from the Order2People page's new entry point.
  await page.getByRole('button', { name: '前往人才方案' }).click();
  await page.getByRole('button', { name: '人才方案', exact: true }).waitFor();
  check(await page.getByRole('heading', { name: /人才方案 · SkillBridge/ }).isVisible(), 'navigating from Order2People lands on the SkillBridge workbench');

  // --- The confirmed gap line is listed as a pending capability gap.
  await page.getByText(/缺口 2\.0 h/).waitFor();
  check(true, 'SkillBridge lists the confirmed Order2People demand with its gap size');

  // --- Opening the analysis (case not yet created, since this is a fresh calculation id).
  const openButton = page.getByRole('button', { name: '分析人才方案' }).and(page.locator(':enabled'));
  if (await openButton.count()) {
    await openButton.click();
  } else {
    await page.getByRole('button', { name: '查看分析' }).click();
  }
  await page.getByRole('heading', { name: /内部人才与资格差距/ }).waitFor();
  check(true, 'opening a case shows the internal-candidate and skill-gap analysis');

  // --- The SkillBridge-demo employee must appear, explicitly marked as a demo fixture
  // and classified as only potentially transferable (not directly deployable).
  const demoCandidate = page.locator('.sb-candidate', { hasText: '演示转岗员工（虚构）' });
  await demoCandidate.locator('summary').waitFor();
  check(await demoCandidate.getByText('演示虚构人员').isVisible(), 'the adjacent-skill employee is explicitly labeled as a demo fixture, never disguised as a real record');
  check(await demoCandidate.locator('summary').getByText('资格待补齐或核验').isVisible(), 'adjacent-skill employee is classified as potential_transferable, not directly deployable');
  await demoCandidate.locator('summary').click();
  check(await demoCandidate.getByText(/核实|核验/).first().isVisible(), 'the unverified qualification shows a required verification action rather than a silent pass');

  // --- Three supply paths must all be visible for this one gap.
  check(await page.locator('.sb-proposal-head strong', { hasText: '内部调配' }).first().isVisible(), 'internal_assignment path is shown');
  check(await page.locator('.sb-proposal-head strong', { hasText: '内部培养' }).first().isVisible(), 'development_plan path is shown');
  check(await page.locator('.sb-proposal-head strong', { hasText: '外部招聘' }).first().isVisible(), 'external_requisition path is always offered as a path');

  // --- HR reviews the development-plan proposal and the decision persists.
  const devProposal = page.locator('.sb-proposal', { hasText: '内部培养' }).first();
  await devProposal.getByRole('button', { name: 'HR 审核' }).click();
  await devProposal.getByLabel('审核说明').fill('同意先安排资格核验，暂不正式调配');
  await devProposal.getByRole('button', { name: '批准' }).click();
  await page.getByText('已批准', { exact: true }).and(page.locator(':visible')).first().waitFor();
  check(true, 'HR can approve a development-plan proposal with a review note');

  // --- Executing the approved development-plan proposal creates a real TrainingTask and
  // only then links into the real Training workbench (approval alone must not execute).
  check(await devProposal.getByRole('button', { name: /查看培训工作台/ }).count() === 0, 'approval alone does not yet execute the proposal into a real training task');
  await devProposal.getByRole('button', { name: /创建培训任务|创建招聘需求草稿|创建调配占用/ }).click();
  await devProposal.getByRole('button', { name: '确认创建' }).click();
  await devProposal.getByText('已执行').waitFor();
  check(true, 'HR can execute an approved development-plan proposal into a real training task');
  await devProposal.getByRole('button', { name: /查看培训任务/ }).click();
  await page.getByRole('heading', { name: '培训管理' }).waitFor();
  check(true, 'executed development-plan proposal links into the real Training workbench, not a dead link');

  // --- The external-requisition path requires its own approval + execution before it
  // produces a real requisition draft and links into the real Recruitment workbench.
  await page.getByRole('button', { name: '人才方案', exact: true }).click();
  await page.locator('.sb-demand-row', { hasText: '缺口 2.0 h' }).getByRole('button', { name: '查看分析' }).click();
  const extProposal = page.locator('.sb-proposal', { hasText: '外部招聘' }).first();
  await extProposal.getByRole('button', { name: 'HR 审核' }).click();
  await extProposal.getByLabel('审核说明').fill('同意生成招聘需求草稿');
  await extProposal.getByRole('button', { name: '批准' }).click();
  await extProposal.getByText('已批准').first().waitFor();
  await extProposal.getByRole('button', { name: /创建培训任务|创建招聘需求草稿|创建调配占用/ }).click();
  await extProposal.getByRole('button', { name: '确认创建' }).click();
  await extProposal.getByText('已执行').waitFor();
  await extProposal.getByRole('button', { name: /前往招聘管理/ }).click();
  await page.getByRole('heading', { name: '招聘管理' }).waitFor();
  await page.getByText('招聘需求草稿 · 来自人才方案').waitFor();
  check(true, 'executed external-requisition proposal creates a real requisition draft visible on the Recruitment workbench, not a dead link');

  // --- Review decision survives a full browser refresh (persisted, not client-only state).
  await page.getByRole('button', { name: '人才方案', exact: true }).click();
  await page.locator('.sb-demand-row', { hasText: '缺口 2.0 h' }).getByRole('button', { name: '查看分析' }).click();
  await page.getByText('已批准', { exact: true }).and(page.locator(':visible')).first().waitFor();
  await page.reload();
  await page.getByRole('button', { name: '人才方案', exact: true }).click();
  await page.locator('.sb-demand-row', { hasText: '缺口 2.0 h' }).getByRole('button', { name: '查看分析' }).click();
  await page.getByText('已批准', { exact: true }).and(page.locator(':visible')).first().waitFor();
  check(true, 'HR review decision persists across a browser refresh');
  await page.screenshot({ path: join(output, 'desktop.png'), fullPage: true, animations: 'disabled' });

  // --- Invalidating the upstream Order2People input must freeze the SkillBridge case.
  await page.getByRole('button', { name: '生产用工', exact: true }).click();
  await page.getByRole('button', { name: '载入或恢复生产样例' }).click();
  await page.getByText(/已过期 · v2/).waitFor();
  await page.getByRole('button', { name: '人才方案', exact: true }).click();
  await page.locator('.sb-case-row').getByRole('button', { name: '打开记录' }).first().click();
  await page.getByText(/用工结果已过期/).waitFor();
  check(await page.getByRole('button', { name: 'HR 审核' }).count() === 0, 'stale case offers no further HR review action');
  check(true, 'stale upstream Order2People snapshot freezes the SkillBridge case instead of allowing further execution');

  // --- Mobile layout sanity: no horizontal overflow.
  await page.setViewportSize({ width: 390, height: 844 });
  // Below the 860px breakpoint the sidebar collapses (visibility:hidden) and a
  // "打开导航" toggle appears to expand it. Check for that toggle instead of
  // blindly clicking the nav item, which would hit a hidden, non-actionable button.
  const menuToggle = page.getByRole('button', { name: '打开导航' });
  if (await menuToggle.isVisible()) {
    await menuToggle.click();
  }
  await page.getByRole('button', { name: '人才方案', exact: true }).click();
  const bounds = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: innerWidth }));
  check(bounds.scroll <= bounds.width + 1, '390px SkillBridge layout has no page overflow');
  await page.screenshot({ path: join(output, 'mobile.png'), fullPage: true, animations: 'disabled' });

  check(errors.length === 0, 'no browser runtime errors');
  await writeFile(join(output, 'report.json'), JSON.stringify({ status: 'passed', checks, errors }, null, 2));
} catch (e) {
  // Failure evidence: what the user actually saw when the check failed.
  const bodyText = await page?.locator('body').innerText().catch(() => '');
  await page?.screenshot({ path: join(output, 'failure.png'), fullPage: true }).catch(() => {});
  await writeFile(join(output, 'failure-body.txt'), bodyText || '');
  const calcs = await fetch(`http://127.0.0.1:${server.address().port}/api/v1/order2people/calculations`, { headers: { 'x-demo-actor': 'actor-hr' } }).then((r) => r.json()).catch((x) => ({ fetchError: String(x) }));
  await writeFile(join(output, 'failure-calculations.json'), JSON.stringify((calcs.items || calcs).map?.((c) => ({ id: c.id, status: c.status, stale: c.stale, completeness: c.completeness, revision: c.revision, gap: c.totals?.gapSeconds, lines: c.lines?.map((l) => ({ id: l.demandId, gap: l.gapSeconds })) })) ?? calcs, null, 2));
  await writeFile(join(output, 'report.json'), JSON.stringify({ status: 'failed', checks, errors, error: e.stack }, null, 2));
  throw e;
} finally {
  await browser?.close();
  await new Promise((r) => server.close(r));
  instance.close();
  await rm(dir, { recursive: true, force: true });
}
