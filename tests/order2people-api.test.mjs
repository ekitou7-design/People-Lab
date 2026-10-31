import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server/app.mjs';
import { fixture } from './order2people-fixture.mjs';
test('Order2People API persists, enforces revisions/idempotency, confirmation and stale export', async (t) => {
    const dir = mkdtempSync(join(tmpdir(), 'order2people-'));
    let app = createApp({ dataDir: dir }), server;
    async function start() { server = app.app.listen(0, '127.0.0.1'); await new Promise(r => server.once('listening', r)); }
    async function stop() { await new Promise(r => server.close(r)); app.close(); }
    await start();
    t.after(async () => { await stop(); rmSync(dir, { recursive: true, force: true }); });
    async function request(path, body, method = 'POST', actor = 'actor-hr') { const r = await fetch(`http://127.0.0.1:${server.address().port}/api${path}`, { method: body ? method : 'GET', headers: { 'Content-Type': 'application/json', 'x-demo-actor': actor }, ...(body ? { body: JSON.stringify(body) } : {}) }); return { status: r.status, body: await r.json() }; }
    const base = '/v1/order2people';
    const i = fixture();
    Object.assign(i.orders[0], { siteId: 'demo', unit: '件', productId: 'part' });
    // Production capacity must refer to the existing HR-V2 active employee, not a parallel identity.
    const hire = await request('/candidates/cand-chen/hire', { confirmedNeeds: [] });
    const id = hire.body.employee.id;
    await request(`/onboardings/${hire.body.onboarding.id}`, { items: hire.body.onboarding.items.map(v => ({ id: v.id, done: true })) }, 'PATCH');
    // Use the real endpoints from the existing application for activation.
    const activate = await request(`/onboardings/${hire.body.onboarding.id}/complete`, { requestKey: 'activate' });
    if (activate.status !== 200)
        throw Error(JSON.stringify(activate));
    for (const k of ['qualifications', 'calendars'])
        i[k].forEach(v => v.employeeId = id);
    for (const kind of ['orders', 'routings', 'qualifications', 'calendars', 'reservations'])
        for (const v of i[kind]) {
            const r = await request(`${base}/${kind}`, { source: i.orders[0].source, ...v, requestKey: `create-${kind}` });
            assert.equal(r.status, 201, JSON.stringify(r));
        }
    const revs = Object.fromEntries(await Promise.all(['orders', 'routings', 'qualifications', 'calendars', 'reservations'].map(async (k) => [k, (await request(`${base}/${k}`)).body.items.map(v => ({ id: v.id, revision: v.revision }))])));
    const body = { scope: i.scope, dailyDemands: i.dailyDemands, expectedInputRevisions: revs, requestKey: 'calc' };
    const result = await request(`${base}/calculations`, body);
    assert.equal(result.status, 201);
    assert.equal(result.body.totals.gapSeconds, 7200);
    assert.equal((await request(`${base}/calculations`, body)).body.id, result.body.id);
    assert.equal((await request(`${base}/calculations`, { ...body, dailyDemands: [], requestKey: 'calc' })).status, 409);
    const c = result.body;
    assert.equal((await request(`${base}/calculations/${c.id}/skillbridge-demands`)).status, 409);
    assert.equal((await request(`${base}/calculations/${c.id}/confirm`, { expectedRevision: c.revision, expectedInputHash: c.inputHash, requestKey: 'confirm' })).status, 200);
    const exported = await request(`${base}/calculations/${c.id}/skillbridge-demands`);
    assert.equal(exported.status, 200);
    assert.equal(exported.body.demands[0].gapSeconds, 7200);
    assert.ok(!JSON.stringify(exported.body).includes(id));
    await stop();
    app = createApp({ dataDir: dir });
    await start();
    assert.equal((await request(`${base}/calculations/${c.id}`)).body.status, 'confirmed');
    const update = { expectedRevision: 1, patch: { quantity: 101 }, reason: 'changed order', requestKey: 'update' };
    assert.equal((await request(`${base}/orders/order`, update, 'PATCH')).status, 200);
    assert.equal((await request(`${base}/orders/order`, { ...update, requestKey: 'other' }, 'PATCH')).status, 409);
    assert.equal((await request(`${base}/calculations/${c.id}`)).body.status, 'stale');
    assert.equal((await request(`${base}/calculations/${c.id}/skillbridge-demands`)).status, 409);
    assert.equal((await request(`${base}/orders`, undefined, 'GET', id)).status, 403);
    const before = (await request('/bootstrap')).body;
    assert.equal((await request(`${base}/demo/reset`, { requestKey: 'demo-manager' }, 'POST', 'actor-manager')).status, 403);
    const demo = await request(`${base}/demo/reset`, { requestKey: 'demo-one' });
    assert.equal(demo.status, 200);
    const restore = await request(`${base}/demo/reset`, { requestKey: 'demo-two' });
    assert.equal(restore.status, 200);
    const kept = await request(`${base}/orders/order`);
    assert.equal(kept.body.quantity, 101);
    const sample = (await request(`${base}/orders/o2p-demo-order`)).body;
    assert.equal(sample.revision, 2);
    assert.equal(sample.routingRevision, 2);
    assert.equal(sample.history.length, 1);
    const after = (await request('/bootstrap')).body;
    for (const name of ['candidates', 'onboardings', 'trainingTasks', 'leaves', 'tickets'])
        assert.deepEqual(after[name], before[name], `${name} preserved by demo restore`);
    const newRevs = Object.fromEntries(await Promise.all(['orders', 'routings', 'qualifications', 'calendars', 'reservations'].map(async (k) => [k, (await request(`${base}/${k}`)).body.items.map(v => ({ id: v.id, revision: v.revision }))])));
    assert.equal((await request(`${base}/calculations`, { scope: i.scope, dailyDemands: [null], expectedInputRevisions: newRevs, requestKey: 'bad-row' })).status, 400);
});
test('zero gap export, qualification/calendar invalidation and filtered lists', async (t) => {
    const dir = mkdtempSync(join(tmpdir(), 'order2people-gates-')), instance = createApp({ dataDir: dir });
    const server = instance.app.listen(0, '127.0.0.1');
    await new Promise(r => server.once('listening', r));
    t.after(async () => { await new Promise(r => server.close(r)); instance.close(); rmSync(dir, { recursive: true, force: true }); });
    const request = async (path, body, method = 'POST') => { const r = await fetch(`http://127.0.0.1:${server.address().port}/api/v1/order2people${path}`, { method: body ? method : 'GET', headers: { 'Content-Type': 'application/json', 'x-demo-actor': 'actor-hr' }, ...(body ? { body: JSON.stringify({ requestKey: crypto.randomUUID(), ...body }) } : {}) }); return { status: r.status, body: await r.json() }; };
    const sample = (await request('/demo/reset', {})).body;
    const patch = async (kind, id, revision, patch) => request(`/${kind}/${id}`, { expectedRevision: revision, patch, reason: 'test gates' }, 'PATCH');
    await patch('orders', 'o2p-demo-order', 1, { quantity: 80 });
    sample.dailyDemands[0].quantity = 80;
    const run = async () => { const revisions = Object.fromEntries(await Promise.all(['orders', 'routings', 'qualifications', 'calendars', 'reservations'].map(async (k) => [k, (await request('/' + k)).body.items.map(v => ({ id: v.id, revision: v.revision }))]))); return request('/calculations', { scope: { ...sample.scope, completeForScope: true }, dailyDemands: sample.dailyDemands, expectedInputRevisions: revisions }); };
    const zero = (await run()).body;
    assert.equal(zero.totals.gapSeconds, 0);
    assert.equal((await request(`/calculations/${zero.id}/confirm`, { expectedRevision: zero.revision, expectedInputHash: zero.inputHash })).status, 200);
    assert.deepEqual((await request(`/calculations/${zero.id}/skillbridge-demands`)).body.demands, []);
    assert.equal((await patch('qualifications', 'o2p-demo-qualification', 1, { status: 'revoked' })).status, 200);
    assert.equal((await request(`/calculations/${zero.id}`)).body.status, 'stale');
    assert.equal((await request(`/calculations/${zero.id}/skillbridge-demands`)).status, 409);
    const revoked = (await run()).body;
    assert.equal(revoked.totals.gapSeconds, 28800);
    assert.equal((await patch('calendars', 'o2p-demo-calendar', 1, { reservationsComplete: false })).status, 200);
    assert.equal((await request(`/calculations/${revoked.id}`)).body.status, 'stale');
    const unknown = (await run()).body;
    assert.equal(unknown.status, 'blocked');
    assert.equal(unknown.totals.gapSeconds, null);
    assert.equal((await request(`/calculations/${unknown.id}/confirm`, { expectedRevision: 1, expectedInputHash: unknown.inputHash })).status, 409);
    assert.equal((await request(`/calculations/${unknown.id}/skillbridge-demands`)).status, 409);
    assert.equal((await request('/calendars?from=2026-11-03')).body.items.length, 0);
    assert.equal((await request('/calendars?from=2026-11-02&to=2026-11-02&limit=1')).body.items.length, 1);
    assert.equal((await request('/orders?siteId=other')).status, 403);
    assert.equal((await request('/calendars?from=2026-99-99')).status, 400);
});
