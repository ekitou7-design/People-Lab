import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { createApp } from '../server/app.mjs';
const dir = await mkdtemp(join(tmpdir(), 'o2p-browser-'));
const output = 'test-results/order2people';
await mkdir(output, { recursive: true });
const instance = createApp({ dataDir: dir });
const server = instance.app.listen(0, '127.0.0.1');
await new Promise(r => server.once('listening', r));
let browser;
const checks = [], errors = [];
const check = (ok, label) => { assert.ok(ok, label); checks.push(label); console.log('PASS', label); };
try {
    browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    page.on('pageerror', e => errors.push(e.message));
    const url = `http://127.0.0.1:${server.address().port}`;
    await page.goto(url);
    await page.getByRole('button', { name: '生产需求', exact: true }).click();
    await page.getByRole('button', { name: '载入 / 重置演示样例' }).click();
    await page.getByLabel('每日数量 1', { exact: true }).waitFor();
    await page.waitForFunction(() => document.querySelector('textarea[aria-label="每日工序需求"]')?.value.includes('o2p-demo-demand'));
    await page.getByRole('checkbox', { name: /已核对窗口内全部订单/ }).check();
    await page.getByRole('button', { name: '确认输入并计算' }).click();
    await page.getByText(/calculated · v1/).waitFor();
    check((await page.locator('.o2p-metrics').innerText()).includes('10.00 h'), 'order input produces 10h demand');
    check((await page.locator('.o2p-metrics').innerText()).includes('2.00 h'), 'qualified 8h capacity leaves 2h gap');
    await page.getByRole('button', { name: 'HR 确认结果', exact: true }).click();
    await page.getByText(/confirmed · v2/).waitFor();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: '导出 SkillBridge JSON' }).click();
    const exported = await download;
    check(exported.suggestedFilename().startsWith('skillbridge-'), 'confirmed result downloads SkillBridge JSON');
    await page.screenshot({ path: join(output, 'desktop.png'), fullPage: true, animations: 'disabled' });
    await page.reload();
    await page.getByRole('button', { name: '生产需求', exact: true }).click();
    await page.getByText(/confirmed · v2/).waitFor();
    check(true, 'saved calculation survives browser refresh');
    await page.getByRole('button', { name: '载入 / 重置演示样例' }).click();
    await page.getByText(/stale · v2/).waitFor();
    check(await page.getByRole('button', { name: '导出 SkillBridge JSON' }).isDisabled(), 'demo reset creates revisions and stale results cannot export');
    await page.getByRole('button', { name: '确认输入并计算' }).click();
    await page.getByText(/blocked · v1/).waitFor();
    check(true, 'unconfirmed input scope saves blocked snapshot');
    // Exercise a real human form, not just the seed loader.
    const form = page.locator('.o2p-grid form');
    for (const [name, value] of Object.entries({ id: 'manual-order', productId: 'demo-part', quantity: '20', unit: '件', routingId: 'o2p-demo-routing', routingRevision: '2', start: '2026-11-02T08:00', end: '2026-11-02T16:00', sourceId: 'manual-worksheet', locator: 'row 2' }))
        await form.locator(`[name="${name}"]`).fill(value);
    await page.getByRole('button', { name: '保存表单记录', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('select')?.textContent !== null && [...document.querySelectorAll('option')].some(o => o.textContent === '生产订单（2）'));
    await page.getByRole('button', { name: '从已保存订单准备每日需求草稿' }).click();
    await page.getByRole('checkbox', { name: /已核对窗口内全部订单/ }).check();
    await page.getByRole('button', { name: '确认输入并计算' }).click();
    await page.waitForFunction(() => document.querySelector('.o2p-metrics')?.textContent.includes('12.00 h'));
    check((await page.locator('.o2p-metrics').innerText()).includes('4.00 h'), 'manual form order joins existing order and shares 8h capacity with 4h combined gap');
    await page.setViewportSize({ width: 390, height: 844 });
    const bounds = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: innerWidth }));
    check(bounds.scroll <= bounds.width + 1, '390px layout has no page overflow');
    check(await page.getByTestId('primary-sidebar').evaluate(e=>e.getBoundingClientRect().right<=0), 'mobile sidebar is collapsed and does not cover form');
    await page.screenshot({ path: join(output, 'mobile.png'), fullPage: true, animations: 'disabled' });
    check(errors.length === 0, 'no browser runtime errors');
    await writeFile(join(output, 'report.json'), JSON.stringify({ status: 'passed', checks, errors }, null, 2));
}
catch (e) {
    await writeFile(join(output, 'report.json'), JSON.stringify({ status: 'failed', checks, errors, error: e.stack }, null, 2));
    throw e;
}
finally {
    await browser?.close();
    await new Promise(r => server.close(r));
    instance.close();
    await rm(dir, { recursive: true, force: true });
}
