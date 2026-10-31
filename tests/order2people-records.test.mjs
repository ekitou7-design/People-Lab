import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRecord } from '../server/order2people-records.mjs';
import { demoInput, demoEmployee } from '../server/order2people-demo.mjs';
test('all demo input kinds satisfy authoritative entity validation', () => { const sample = demoInput('actor-hr'); for (const k of ['orders', 'routings', 'qualifications', 'calendars', 'reservations'])
    for (const v of sample[k])
        assert.doesNotThrow(() => validateRecord(k, v, { employees: [demoEmployee] })); });
test('malformed standard/qualification/calendar is rejected with 400, not TypeError', () => { for (const [kind, change] of [['routings', v => v.operations = [null]], ['routings', v => v.operations[0].requirements = [null]], ['routings', v => v.operations[0].requirements[0].qualificationTypeIds = []], ['qualifications', v => v.level = -1], ['calendars', v => v.date = '2026-02-30'], ['calendars', v => v.workIntervals = [null]], ['orders', v => v.routingRevision = 0], ['orders', v => v.status = 'unknown'], ['orders', v => delete v.source.locator]]) {
    const v = demoInput('actor-hr')[kind][0];
    change(v);
    assert.throws(() => validateRecord(kind, v, { employees: [demoEmployee] }), e => e.code === 'INVALID_INPUT' && e.status === 400);
} });
