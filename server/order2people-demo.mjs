// Fictional, explicitly marked demo fixtures. Reapplying creates revisions, never deletes history.
export function demoInput(actorId) {
    const date = '2026-11-02', window = { start: `${date}T08:00:00+08:00`, end: `${date}T16:00:00+08:00` };
    const source = { sourceType: 'demo', sourceId: 'o2p-demo', revision: 1, locator: 'fictional-manual-fixture', confirmedBy: actorId, confirmedAt: new Date().toISOString() };
    const requirements = [{ skillId: 'inspection', minLevel: 2, qualificationTypeIds: ['quality-auth'] }];
    return { scope: { siteId: 'demo', timeZone: 'Asia/Shanghai', window, completeForScope: false }, dailyDemands: [{ id: 'o2p-demo-demand', orderId: 'o2p-demo-order', operationId: 'inspect', date, window, quantity: 100, batchCount: 0 }],
        orders: [{ id: 'o2p-demo-order', siteId: 'demo', productId: 'demo-part', quantity: 100, unit: '件', window, routingId: 'o2p-demo-routing', routingRevision: 1, status: 'active', source }],
        routings: [{ id: 'o2p-demo-routing', productId: 'demo-part', unit: '件', effectiveWindow: window, operations: [{ operationId: 'inspect', positionId: 'pos-quality', requirements, secondsPerUnit: 360, setupSecondsPerBatch: 0, source }], source }],
        qualifications: [{ id: 'o2p-demo-qualification', employeeId: 'emp-o2p-demo', skillId: 'inspection', level: 2, qualificationTypeId: 'quality-auth', status: 'verified', validWindow: window, source }],
        calendars: [{ id: 'o2p-demo-calendar', employeeId: 'emp-o2p-demo', siteId: 'demo', date, workIntervals: [window], absenceIntervals: [], qualificationsComplete: true, reservationsComplete: true, source }], reservations: [] };
}
export const demoEmployee = { id: 'emp-o2p-demo', candidateId: 'o2p-demo-fictional', name: '演示检验员（虚构）', initials: '演', department: '质量管理部', positionId: 'pos-quality', positionTitle: '演示检验员', managerId: 'actor-manager', managerName: '周明远', status: 'active', joinDate: '2026-11-02', leaveBalance: 0, confirmedNeeds: [] };
