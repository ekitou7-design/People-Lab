import { requireInput as check, validWindow, validDate, dayWindow, contains } from './order2people-validation.mjs';
const object = v => v && typeof v === 'object' && !Array.isArray(v);
const text = v => typeof v === 'string' && v.trim().length > 0 && v.length <= 2000;
const integer = (n, min = 0) => Number.isSafeInteger(n) && n >= min;
export function validSource(v) { return object(v) && text(v.sourceType) && text(v.sourceId) && integer(v.revision, 1) && text(v.locator) && text(v.confirmedBy) && typeof v.confirmedAt === 'string' && Number.isFinite(Date.parse(v.confirmedAt)); }
export function validateRecord(kind, v, state) {
    check(object(v) && text(v.id), '记录及 ID 无效');
    check(validSource(v.source), '须填写来源类型、编号、版本、位置、责任人和确认时间');
    const interval = w => check(validWindow(w), '时间区间无效，须为带时区的整秒 ISO 时间');
    if (kind === 'orders') {
        check(v.siteId === 'demo' && text(v.unit) && text(v.productId) && text(v.routingId) && integer(v.routingRevision, 1) && integer(v.quantity, 1), '订单场地、产品、单位、数量或工艺版本无效');
        check(v.status === undefined || ['active', 'cancelled'].includes(v.status), '订单状态只能为 active/cancelled');
        interval(v.window);
    }
    if (kind === 'routings') {
        interval(v.effectiveWindow);
        check(text(v.productId) && text(v.unit), '工艺须声明产品与数量单位');
        check(Array.isArray(v.operations) && v.operations.length > 0 && v.operations.length <= 100 && v.operations.every(object), '须提供有效工序列表');
        check(new Set(v.operations.map(o => o.operationId)).size === v.operations.length, '工序 ID 重复');
        for (const o of v.operations) {
            check(text(o.operationId) && text(o.positionId) && validSource(o.source), '工序编号、岗位或标准来源无效');
            check(Array.isArray(o.requirements) && o.requirements.length > 0 && o.requirements.every(r => object(r) && text(r.skillId) && integer(r.minLevel) && Array.isArray(r.qualificationTypeIds) && r.qualificationTypeIds.length > 0 && r.qualificationTypeIds.every(text) && new Set(r.qualificationTypeIds).size === r.qualificationTypeIds.length), '工序技能、等级及资格要求无效');
            for (const key of ['secondsPerUnit', 'setupSecondsPerBatch'])
                check(o[key] === null || o[key] === undefined || integer(o[key]), '人工秒数须为非负整数；未知请留空');
            check(o.batchSize === undefined || integer(o.batchSize, 1), '批量须为正整数');
        }
    }
    if (['qualifications', 'calendars', 'reservations'].includes(kind))
        check(text(v.employeeId) && state.employees.some(e => e.id === v.employeeId && e.status === 'active'), '须引用已激活员工');
    if (kind === 'qualifications') {
        check(text(v.skillId) && text(v.qualificationTypeId) && integer(v.level) && ['verified', 'unverified', 'revoked'].includes(v.status), '资格类型、等级或状态无效');
        interval(v.validWindow);
    }
    if (kind === 'calendars') {
        check(v.siteId === 'demo' && validDate(v.date), '日历场地或日期无效');
        for (const key of ['workIntervals', 'absenceIntervals']) {
            check(Array.isArray(v[key]) && v[key].length <= 100, '须明确提供班次与休假列表');
            v[key].forEach(w => { interval(w); check(contains(dayWindow(v.date), w), '日历须按上海自然日拆分'); });
        }
        for (const key of ['qualificationsComplete', 'reservationsComplete'])
            check(typeof v[key] === 'boolean', '须显式确认资格与占用完整性');
    }
    if (kind === 'reservations') {
        interval(v.window);
        check(integer(v.committedSeconds) && v.committedSeconds === (Date.parse(v.window.end) - Date.parse(v.window.start)) / 1000, '占用秒数须与区间一致');
        check(v.sourceOrderId === null || text(v.sourceOrderId), '来源订单须为明确编号或 null');
        check(v.status === undefined || ['active', 'cancelled'].includes(v.status), '占用状态只能为 active/cancelled');
    }
}
