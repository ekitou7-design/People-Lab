export function requireInput(value, message) {
    if (!value)
        throw Object.assign(new Error(message), { status: 400, code: 'INVALID_INPUT' });
}
export function validWindow(w) {
    return w && [w.start, w.end].every(v => typeof v === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.000)?(?:Z|[+-]\d\d:\d\d)$/.test(v) && Number.isFinite(Date.parse(v)) && validDate(v.slice(0, 10))) && Date.parse(w.end) > Date.parse(w.start);
}
export function validDate(value) { return typeof value === 'string' && /^\d{4}-\d\d-\d\d$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value; }
export function dayWindow(date) { return { start: `${date}T00:00:00+08:00`, end: new Date(Date.parse(`${date}T00:00:00+08:00`) + 86400000).toISOString() }; }
export function contains(outer, inner) { return validWindow(outer) && validWindow(inner) && Date.parse(outer.start) <= Date.parse(inner.start) && Date.parse(outer.end) >= Date.parse(inner.end); }
export function validateCalculationShape(input) {
    const { scope, dailyDemands } = input;
    requireInput(scope && scope.siteId === 'demo' && (!scope.timeZone || scope.timeZone === 'Asia/Shanghai') && validWindow(scope.window), '场地、时区或范围窗口无效');
    requireInput(Array.isArray(dailyDemands) && dailyDemands.length <= 1000, '须提供每日需求列表（最多 1000 行）');
    requireInput(dailyDemands.every(d => d && typeof d.id === 'string' && d.id && typeof d.orderId === 'string' && typeof d.operationId === 'string' && validDate(d.date) && validWindow(d.window) && contains(dayWindow(d.date), d.window) && Number.isSafeInteger(d.quantity) && d.quantity > 0 && Number.isSafeInteger(d.batchCount) && d.batchCount >= 0), '每日需求须包含 ID、订单、工序、正整数数量、非负批次和同一自然日内的有效窗口');
    requireInput(new Set(dailyDemands.map(d => d.id)).size === dailyDemands.length, '每日需求 ID 重复');
    for (const k of ['orders', 'routings', 'qualifications', 'calendars', 'reservations', 'employees'])
        requireInput(Array.isArray(input[k]), `${k} 须为列表`);
}
