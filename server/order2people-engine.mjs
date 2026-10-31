import { validateCalculationShape, contains, validWindow } from './order2people-validation.mjs';
// All arithmetic uses integer labour seconds. Daily capacity is shared by every skill.
export const engineVersion = 'daily-maxflow-1';
const time = value => Date.parse(value);
export function unionSeconds(intervals, window) {
    const sorted = intervals.map(i => [Math.max(time(i.start), time(window.start)), Math.min(time(i.end), time(window.end))]).filter(([a, b]) => b > a).sort((a, b) => a[0] - b[0]);
    let end = -Infinity, total = 0;
    for (const [a, b] of sorted) {
        total += Math.max(0, b - Math.max(a, end));
        end = Math.max(end, b);
    }
    return total / 1000;
}
export function availableSeconds(calendar, reservations, window, orderIds) {
    const work = calendar.workIntervals;
    const blocked = [...calendar.absenceIntervals, ...reservations.filter(r => r.status !== 'cancelled' && !orderIds.includes(r.sourceOrderId)).map(r => r.window)];
    // Intersect absences/reservations with actual work before taking their union.
    const intersections = work.flatMap(w => blocked.map(b => ({ start: new Date(Math.max(time(w.start), time(b.start))).toISOString(), end: new Date(Math.min(time(w.end), time(b.end))).toISOString() })));
    return unionSeconds(work, window) - unionSeconds(intersections, window);
}
export function qualificationCovers(q, requirement, type, employeeId, window) {
    return q.employeeId === employeeId && q.skillId === requirement.skillId && q.qualificationTypeId === type
        && q.status === 'verified' && q.level >= requirement.minLevel && !!q.source?.confirmedBy
        && validWindow(q.validWindow) && contains(q.validWindow, window);
}
export function calculate(input) {
    validateCalculationShape(input);
    const { scope, orders, routings, qualifications, calendars, reservations, employees, dailyDemands } = input;
    const missingItems = [];
    const missing = (entityRef, fieldPath, reason) => missingItems.push({ code: 'MISSING_DATA', entityRef, fieldPath, reason, blocking: true, responsibleRole: 'manager' });
    if (!scope.completeForScope || !scope.confirmedBy || !scope.confirmedAt)
        missing('scope', 'completeForScope', '须确认全部订单、资格、日历和占用范围');
    if (!orders.some(o => o.status !== 'cancelled'))
        missing('scope', 'orders', '尚未提供范围内生产订单');
    const routingFor = order => routings.flatMap(r => [r, ...(r.history || [])]).find(r => r.id === order?.routingId && r.revision === order.routingRevision);
    const lines = dailyDemands.map(d => {
        const order = orders.find(o => o.id === d.orderId);
        const routing = routingFor(order);
        const op = routing?.operations.find(o => o.operationId === d.operationId);
        if (order?.status === 'cancelled')
            missing(d.id, 'order', '已取消订单不能参与分配');
        if (!order || !op)
            missing(d.id, 'routing', '订单或工艺版本不存在');
        if (!Number.isSafeInteger(op?.secondsPerUnit) || op.secondsPerUnit < 0 || !Number.isSafeInteger(op?.setupSecondsPerBatch) || op.setupSecondsPerBatch < 0)
            missing(d.id, 'secondsPerUnit', '缺少有效人工工时标准');
        if (!op?.source?.confirmedBy || !order?.source?.confirmedBy)
            missing(d.id, 'source', '标准与订单须人工确认来源');
        if (!op?.requirements?.length || op.requirements.some(r => !r.skillId || !Array.isArray(r.qualificationTypeIds) || !r.qualificationTypeIds.length))
            missing(d.id, 'requirements', '缺少技能资格要求');
        if (!d.window || !Number.isFinite(time(d.window.start)) || time(d.window.end) <= time(d.window.start))
            missing(d.id, 'window', '缺少工序执行窗口');
        const demandSeconds = op && Number.isSafeInteger(op.secondsPerUnit) && Number.isSafeInteger(op.setupSecondsPerBatch) ? d.quantity * op.secondsPerUnit + d.batchCount * op.setupSecondsPerBatch : null;
        if (demandSeconds !== null && !Number.isSafeInteger(demandSeconds))
            missing(d.id, 'demandSeconds', '需求工时超过安全整数范围');
        return { ...d, demandId: d.id, orderRef: { id: order?.id, revision: order?.revision }, positionId: op?.positionId, requirements: op?.requirements || [], demandSeconds, allocatedSeconds: 0, gapSeconds: null, referencePeople: null, excludedSupply: [], competingDemandIds: [], formula: `${d.quantity} × ${op?.secondsPerUnit ?? '?'} + ${d.batchCount} × ${op?.setupSecondsPerBatch ?? '?'} = ${demandSeconds ?? '?'}`, sourceRefs: [op?.source, order?.source].filter(Boolean) };
    }).sort((a, b) => a.id.localeCompare(b.id));
    for (const order of orders.filter(o => o.status !== 'cancelled')) {
        const routing = routingFor(order);
        if (!routing)
            missing(order.id, 'routing', '订单引用工艺版本不存在');
        if (routing?.productId && routing.productId !== order.productId)
            missing(order.id, 'productId', '产品与工艺不匹配');
        if (routing?.unit && routing.unit !== order.unit)
            missing(order.id, 'unit', '订单与工艺单位不一致，不支持自动换算');
        for (const op of routing?.operations || []) {
            const rows = lines.filter(d => d.orderId === order.id && d.operationId === op.operationId);
            if (rows.reduce((n, d) => n + d.quantity, 0) !== order.quantity)
                missing(order.id, 'dailyDemands', '每日工序数量之和须等于订单数量');
            for (const d of rows) {
                if (!Number.isSafeInteger(d.quantity) || d.quantity <= 0 || !Number.isSafeInteger(d.batchCount) || d.batchCount < 0 || (op.batchSize && d.batchCount !== Math.ceil(d.quantity / op.batchSize)))
                    missing(d.id, 'batchCount', '数量或批次不符合工艺标准');
                for (const w of [order.window, routing.effectiveWindow, scope.window])
                    if (!w || time(d.window?.start) < time(w.start) || time(d.window?.end) > time(w.end))
                        missing(d.id, 'window', '执行窗口不在订单、标准或范围有效期内');
            }
        }
    }
    const allocations = [], capacities = [];
    const dates = [...new Set(lines.map(l => l.date))].sort();
    for (const date of dates) {
        const dayLines = lines.filter(l => l.date === date);
        const dayStart = time(`${date}T00:00:00+08:00`);
        const window = { start: new Date(Math.max(dayStart, time(scope.window.start))).toISOString(), end: new Date(Math.min(dayStart + 86400000, time(scope.window.end))).toISOString() };
        const people = employees.filter(e => e.status === 'active').sort((a, b) => a.id.localeCompare(b.id));
        const edges = [], graph = Array.from({ length: people.length + dayLines.length + 2 }, () => []), sink = graph.length - 1;
        const add = (a, b, cap, meta) => { const f = { to: b, cap, initial: cap, reverse: graph[b].length, meta }; const r = { to: a, cap: 0, reverse: graph[a].length }; graph[a].push(f); graph[b].push(r); if (meta)
            edges.push(f); };
        people.forEach((employee, i) => {
            const c = calendars.find(c => c.employeeId === employee.id && c.date === date && c.siteId === scope.siteId);
            if (!c || !c.source?.confirmedBy || c.reservationsComplete !== true || c.qualificationsComplete !== true) {
                missing(employee.id, 'calendar', '日历、占用或资格完整性尚未确认');
                return;
            }
            if (!Array.isArray(c.workIntervals) || !Array.isArray(c.absenceIntervals) || [...c.workIntervals, ...c.absenceIntervals].some(w => !validWindow(w))) {
                missing(c.id, 'workIntervals', '日历区间无效');
                return;
            }
            const seconds = availableSeconds(c, reservations.filter(r => r.employeeId === employee.id), window, orders.filter(o => o.status !== 'cancelled').map(o => o.id));
            capacities.push({ employeeId: employee.id, date, availableSeconds: seconds });
            add(0, 1 + i, seconds);
            const ownReservations = reservations.filter(r => r.employeeId === employee.id);
            const points = [...new Set([window.start, window.end, ...dayLines.flatMap(l => [l.window.start, l.window.end]), ...c.workIntervals.flatMap(w => [w.start, w.end]), ...c.absenceIntervals.flatMap(w => [w.start, w.end]), ...ownReservations.flatMap(r => [r.window.start, r.window.end])].map(time).filter(t => t >= time(window.start) && t <= time(window.end)))].sort((a, b) => a - b);
            const segments = [];
            for (let n = 1; n < points.length; n++) {
                const w = { start: new Date(points[n - 1]).toISOString(), end: new Date(points[n]).toISOString() };
                const cap = availableSeconds(c, ownReservations, w, orders.filter(o => o.status !== 'cancelled').map(o => o.id));
                if (cap > 0) {
                    const node = graph.length;
                    graph.push([]);
                    add(1 + i, node, cap);
                    segments.push({ node, window: w, cap });
                }
            }
            dayLines.forEach((line, j) => {
                const refs = [];
                for (const r of line.requirements)
                    for (const type of r.qualificationTypeIds || []) {
                        const matching = qualifications.filter(q => q.employeeId === employee.id && q.skillId === r.skillId && q.qualificationTypeId === type && q.status === 'verified' && q.level >= r.minLevel);
                        if (matching.some(q => validWindow(q.validWindow) && Date.parse(q.validWindow.start) < Date.parse(line.window.end) && Date.parse(q.validWindow.end) > Date.parse(line.window.start)) && !matching.some(q => contains(q.validWindow, line.window)))
                            missing(line.id, 'validWindow', '资格在执行窗口中途生效或失效；须精确拆分后重算');
                    }
                const eligible = line.requirements.every(r => (r.qualificationTypeIds || []).length > 0 && r.qualificationTypeIds.every(type => {
                    const q = qualifications.find(q => qualificationCovers(q, r, type, employee.id, line.window));
                    if (q)
                        refs.push({ id: q.id, revision: q.revision });
                    return !!q;
                }));
                if (eligible) {
                    for (const seg of segments)
                        if (contains(line.window, seg.window))
                            add(seg.node, 1 + people.length + j, seg.cap, { employeeId: employee.id, demandId: line.id, date, eligibilityRefs: refs });
                }
                else
                    line.excludedSupply.push({ employeeId: employee.id, reason: '缺少覆盖完整执行窗口的有效资格或等级不足' });
            });
        });
        dayLines.forEach((l, j) => add(1 + people.length + j, sink, l.demandSeconds || 0));
        if (missingItems.length)
            continue;
        // Edmonds–Karp residual paths avoid the multi-skilled-worker greedy trap.
        while (true) {
            const prev = Array(graph.length).fill(null), queue = [0];
            prev[0] = true;
            for (let k = 0; k < queue.length && !prev[sink]; k++) {
                const a = queue[k];
                graph[a].forEach((e, n) => { if (e.cap > 0 && !prev[e.to]) {
                    prev[e.to] = [a, n];
                    queue.push(e.to);
                } });
            }
            if (!prev[sink])
                break;
            let flow = Infinity;
            for (let v = sink; v;) {
                const [a, n] = prev[v];
                flow = Math.min(flow, graph[a][n].cap);
                v = a;
            }
            for (let v = sink; v;) {
                const [a, n] = prev[v], e = graph[a][n];
                e.cap -= flow;
                graph[v][e.reverse].cap += flow;
                v = a;
            }
        }
        for (const e of edges)
            if (e.initial > e.cap)
                allocations.push({ ...e.meta, allocatedSeconds: e.initial - e.cap });
    }
    if (!Number.isSafeInteger(lines.reduce((n, l) => n + (l.demandSeconds || 0), 0)))
        missing('scope', 'totals', '合计工时超过安全整数范围');
    const blocked = missingItems.length > 0;
    for (const line of lines) {
        line.allocatedSeconds = blocked ? 0 : allocations.filter(a => a.demandId === line.id).reduce((n, a) => n + a.allocatedSeconds, 0);
        line.gapSeconds = blocked ? null : line.demandSeconds - line.allocatedSeconds;
        line.competingDemandIds = lines.filter(l => l.date === line.date && l.id !== line.id).map(l => l.id);
    }
    return { schemaVersion: '1.0', engineVersion, scope, status: blocked ? 'blocked' : 'calculated', completeness: blocked ? 'incomplete' : 'complete', missingItems, lines, allocations: blocked ? [] : allocations, capacities, totals: { demandSeconds: blocked ? null : lines.reduce((n, l) => n + l.demandSeconds, 0), allocatedSeconds: blocked ? null : lines.reduce((n, l) => n + l.allocatedSeconds, 0), gapSeconds: blocked ? null : lines.reduce((n, l) => n + l.gapSeconds, 0), referencePeople: null }, assumptions: ['Asia/Shanghai 自然日；日桶内人工工时可切分', '按人员 ID、需求 ID 稳定排序最大流；分配不预订产能', '不保证工序先后、设备、连续作业或分钟级排产；缺口不能等同招聘人数'] };
}
