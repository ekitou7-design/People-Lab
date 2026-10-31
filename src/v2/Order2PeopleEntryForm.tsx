import type { FormEvent } from 'react';
export type Kind = 'orders' | 'routings' | 'qualifications' | 'calendars' | 'reservations';
const definitions: Record<Kind, [
    string,
    string,
    string?
][]> = {
    orders: [['id', '订单编号'], ['productId', '产品编号'], ['quantity', '订单数量', 'number'], ['unit', '数量单位'], ['routingId', '工艺编号'], ['routingRevision', '工艺版本', 'number'], ['start', '开始时间', 'datetime-local'], ['end', '截止时间', 'datetime-local']],
    routings: [['id', '工艺编号'], ['productId', '产品编号'], ['unit', '数量单位'], ['operationId', '工序编号'], ['positionId', '岗位编号'], ['skillId', '技能编号'], ['minLevel', '最低技能等级', 'number'], ['qualificationTypeId', '资格类型编号'], ['secondsPerUnit', '单位人工工时（秒）', 'number'], ['setupSecondsPerBatch', '每批准备人工工时（秒）', 'number'], ['batchSize', '每批数量（无准备时可留空）', 'number'], ['start', '标准生效时间', 'datetime-local'], ['end', '标准失效时间', 'datetime-local']],
    qualifications: [['id', '资格记录编号'], ['employeeId', '在职员工编号'], ['skillId', '技能编号'], ['level', '技能等级', 'number'], ['qualificationTypeId', '资格类型编号'], ['start', '资格生效时间', 'datetime-local'], ['end', '资格失效时间', 'datetime-local']],
    calendars: [['id', '日历编号'], ['employeeId', '在职员工编号'], ['date', '日期', 'date'], ['start', '班次开始', 'datetime-local'], ['end', '班次结束', 'datetime-local']],
    reservations: [['id', '占用记录编号'], ['employeeId', '在职员工编号'], ['sourceOrderId', '来源订单编号（外部任务可留空）'], ['start', '占用开始', 'datetime-local'], ['end', '占用结束', 'datetime-local']]
};
export function Order2PeopleEntryForm({ kind, actorId, busy, onSave }: {
    kind: Kind;
    actorId: string;
    busy: boolean;
    onSave: (v: Record<string, unknown>) => Promise<void>;
}) {
    async function submit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const get = (k: string) => String(f.get(k) || '');
        const num = (k: string) => Number(get(k));
        const window = { start: get('start') + ':00+08:00', end: get('end') + ':00+08:00' };
        const source = { sourceType: 'manual', sourceId: get('sourceId'), revision: 1, locator: get('locator'), confirmedBy: actorId, confirmedAt: new Date().toISOString() };
        let record: Record<string, unknown> = { id: get('id'), source };
        if (kind === 'orders')
            record = { ...record, siteId: 'demo', productId: get('productId'), quantity: num('quantity'), unit: get('unit'), routingId: get('routingId'), routingRevision: num('routingRevision'), window, status: 'active' };
        if (kind === 'routings')
            record = { ...record, productId: get('productId'), unit: get('unit'), effectiveWindow: window, operations: [{ operationId: get('operationId'), positionId: get('positionId'), requirements: [{ skillId: get('skillId'), minLevel: num('minLevel'), qualificationTypeIds: [get('qualificationTypeId')] }], secondsPerUnit: get('secondsPerUnit') === '' ? null : num('secondsPerUnit'), setupSecondsPerBatch: num('setupSecondsPerBatch'), ...(get('batchSize') ? { batchSize: num('batchSize') } : {}), source }] };
        if (kind === 'qualifications')
            record = { ...record, employeeId: get('employeeId'), skillId: get('skillId'), level: num('level'), qualificationTypeId: get('qualificationTypeId'), status: get('status'), validWindow: window };
        if (kind === 'calendars')
            record = { ...record, siteId: 'demo', employeeId: get('employeeId'), date: get('date'), workIntervals: [window], absenceIntervals: [], qualificationsComplete: f.has('qualificationsComplete'), reservationsComplete: f.has('reservationsComplete') };
        if (kind === 'reservations')
            record = { ...record, employeeId: get('employeeId'), window, sourceOrderId: get('sourceOrderId') || null, sourceOperationId: null, committedSeconds: (Date.parse(window.end) - Date.parse(window.start)) / 1000 };
        await onSave(record);
    }
    return <form onSubmit={e => void submit(e)}><div className="o2p-fields">{definitions[kind].map(([key, label, type]) => <label key={key}>{label}<input name={key} type={type || 'text'} min={type === 'number' ? 0 : undefined} step={type === 'number' ? 1 : undefined} required={!['batchSize', 'sourceOrderId', 'secondsPerUnit'].includes(key)}/></label>)}<label>来源文件或记录编号<input name="sourceId" required/></label><label>来源位置或页码<input name="locator" required/></label></div>{kind === 'qualifications' && <label>核验状态<select name="status"><option value="unverified">待核验（不计入供给）</option><option value="verified">已核验</option><option value="revoked">已撤销</option></select></label>}{kind === 'calendars' && <><p>此表录入单段班次、无休假日历；多班次、休假或休息日请使用结构化编辑。</p><label><input name="qualificationsComplete" type="checkbox"/>已核对该人员完整资格档案</label><label><input name="reservationsComplete" type="checkbox"/>已录入该人员全部占用（空列表表示明确无任务）</label></>}<button disabled={busy} type="submit">保存记录</button></form>;
}
