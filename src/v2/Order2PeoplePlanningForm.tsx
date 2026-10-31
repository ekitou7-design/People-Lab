type Window = {
    start: string;
    end: string;
};
type Demand = {
    id: string;
    orderId: string;
    operationId: string;
    date: string;
    quantity: number;
    batchCount: number;
    window: Window;
};
const local = (v: string) => v?.slice(0, 16) || '';
const iso = (v: string) => v ? `${v}:00+08:00` : '';
export function Order2PeoplePlanningForm({ scope, demands, onScope, onDemands }: {
    scope: string;
    demands: string;
    onScope: (v: string) => void;
    onDemands: (v: string) => void;
}) {
    let value: {
        siteId: string;
        timeZone: string;
        window: Window;
    };
    let rows: Demand[];
    try {
        value = JSON.parse(scope);
        rows = JSON.parse(demands);
        if (!value || typeof value !== 'object' || !value.window || !Array.isArray(rows) || rows.some(r => !r || !r.window))
            throw Error();
    }
    catch {
        return <p role="alert">草稿格式有误，请展开“高级结构化草稿编辑”检查。</p>;
    }
    const update = (index: number, patch: Partial<Demand>) => onDemands(JSON.stringify(rows.map((r, i) => i === index ? { ...r, ...patch } : r), null, 2));
    return <><div className="o2p-fields"><label>分析开始（上海时间）<input aria-label="分析开始" type="datetime-local" value={local(value.window?.start)} onChange={e => onScope(JSON.stringify({ ...value, window: { ...value.window, start: iso(e.target.value) } }))}/></label><label>分析截止（上海时间）<input aria-label="分析截止" type="datetime-local" value={local(value.window?.end)} onChange={e => onScope(JSON.stringify({ ...value, window: { ...value.window, end: iso(e.target.value) } }))}/></label></div><p>场地：演示工厂 · Asia/Shanghai</p><div className="o2p-demand-rows">{rows.map((r, i) => <fieldset key={i}><legend>每日工序 {i + 1}</legend><div className="o2p-fields">{([['orderId', '订单编号'], ['operationId', '工序编号'], ['date', '日期']] as const).map(([key, label]) => <label key={key}>{label}<input aria-label={`${label} ${i + 1}`} type={key === 'date' ? 'date' : 'text'} value={r[key]} onChange={e => update(i, { [key]: e.target.value })}/></label>)}{([['quantity', '每日数量'], ['batchCount', '每日批次数']] as const).map(([key, label]) => <label key={key}>{label}<input aria-label={`${label} ${i + 1}`} type="number" min={0} step={1} value={r[key]} onChange={e => update(i, { [key]: Number(e.target.value) })}/></label>)}<label>执行开始<input type="datetime-local" value={local(r.window.start)} onChange={e => update(i, { window: { ...r.window, start: iso(e.target.value) } })}/></label><label>执行截止<input type="datetime-local" value={local(r.window.end)} onChange={e => update(i, { window: { ...r.window, end: iso(e.target.value) } })}/></label></div><button type="button" onClick={() => onDemands(JSON.stringify(rows.filter((_, n) => n !== i), null, 2))}>删除草稿行</button></fieldset>)}</div><button type="button" onClick={() => onDemands(JSON.stringify([...rows, { id: crypto.randomUUID(), orderId: '', operationId: '', date: '', quantity: 1, batchCount: 0, window: { start: '', end: '' } }], null, 2))}>添加每日工序行</button></>;
}
