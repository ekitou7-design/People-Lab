import { useEffect, useState } from 'react';
import type { CalculationSnapshot as Result } from '../../shared/order2people';
import type { PageProps } from './types';
import './Order2People.css';
import { Order2PeoplePlanningForm } from './Order2PeoplePlanningForm';
import { Order2PeopleEntryForm } from './Order2PeopleEntryForm';
type Entity = {
    id: string;
    revision: number;
    [key: string]: unknown;
};
const base = '/api/v1/order2people';
const kinds = ['orders', 'routings', 'qualifications', 'calendars', 'reservations'] as const;
const labels = { orders: '生产订单', routings: '工艺与标准', qualifications: '技能及岗位资格', calendars: '班次与休假', reservations: '已承诺任务' };
const hours = (n: number | null) => n === null ? '待补充' : `${(n / 3600).toFixed(2)} h`;
export function Order2PeoplePage({ data, navigate, focus }: PageProps) {
    const [records, setRecords] = useState<Record<string, Entity[]>>({});
    const [results, setResults] = useState<Result[]>([]);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [kind, setKind] = useState<typeof kinds[number]>('orders');
    const [draft, setDraft] = useState('{}');
    const [scope, setScope] = useState('{"siteId":"demo","timeZone":"Asia/Shanghai","window":{"start":"2026-11-02T08:00:00+08:00","end":"2026-11-02T16:00:00+08:00"},"completeForScope":true}');
    const [demands, setDemands] = useState('[]');
    const [complete, setComplete] = useState(false);
    const request = async (path: string, body?: unknown, method = 'POST') => { const r = await fetch(base + path, { method: body ? method : 'GET', headers: { 'Content-Type': 'application/json', 'x-demo-actor': data.actor.id }, ...(body ? { body: JSON.stringify(body) } : {}) }); const v = await r.json(); if (!r.ok)
        throw Error(v.error?.message || '请求失败'); return v; };
    const refresh = async () => { const values = await Promise.all(kinds.map(k => request('/' + k))); setRecords(Object.fromEntries(kinds.map((k, i) => [k, values[i].items]))); setResults((await request('/calculations')).items); };
    useEffect(() => { setBusy(true); void refresh().catch(e => setError(e.message)).finally(() => setBusy(false)); }, [data.actor.id, focus, data]);
    const act = async (fn: () => Promise<void>) => { setBusy(true); setError(''); try {
        await fn();
        await refresh();
    }
    catch (e) {
        setError((e as Error).message);
    }
    finally {
        setBusy(false);
    } };
    useEffect(() => { const saved = localStorage.getItem(`o2p-draft:${data.actor.id}`); if (saved) {
        try {
            const v = JSON.parse(saved);
            setScope(v.scope);
            setDemands(v.demands);
        }
        catch {
            localStorage.removeItem(`o2p-draft:${data.actor.id}`);
        }
    } }, [data.actor.id]);
    useEffect(() => { localStorage.setItem(`o2p-draft:${data.actor.id}`, JSON.stringify({ scope, demands })); }, [scope, demands, data.actor.id]);
    const latest = results.at(-1);
    const prepare = () => {
        const rows = (records.orders || []).filter(o => o.status !== 'cancelled').flatMap(o => {
            const routing = (records.routings || []).find(r => r.id === o.routingId);
            const pinned = routing?.revision === o.routingRevision ? routing : (routing?.history as Entity[] | undefined)?.find(r => r.revision === o.routingRevision);
            const window = o.window as {
                start: string;
                end: string;
            };
            return ((pinned?.operations || []) as {
                operationId: string;
                batchSize?: number;
            }[]).map(op => ({ id: `${o.id}:${op.operationId}`, orderId: o.id, operationId: op.operationId, date: window.start.slice(0, 10), window, quantity: o.quantity, batchCount: op.batchSize ? Math.ceil(Number(o.quantity) / op.batchSize) : 0 }));
        });
        setDemands(JSON.stringify(rows, null, 2));
        setComplete(false);
    };
    return <section className="o2p"><header><p>People-Lab · Order2People 第一阶段</p><h1>生产需求与能力诊断</h1><p>订单人工工时 → 合格人员共享容量 → 未覆盖工时。确定性计算，不推断招聘人数。</p></header><div className="o2p-toolbar">{data.actor.role === 'hr' && <button disabled={busy} onClick={() => void act(async () => { const v = await request('/demo/reset', { requestKey: crypto.randomUUID() }); setScope(JSON.stringify(v.scope, null, 2)); setDemands(JSON.stringify(v.dailyDemands, null, 2)); setComplete(false); })}>载入 / 重置演示样例</button>}<button disabled={busy} onClick={() => void act(refresh)}>刷新已保存数据</button><span>样例：100 件 × 360 秒；合格可用 8h；预期缺口 2h</span></div>{error && <p role="alert" className="o2p-error">{error}</p>}
 {latest?.status === 'stale' && <p role="alert" className="o2p-error">概览来自已过期快照，仅供历史查看；请使用当前输入重新计算。</p>}<div className="o2p-metrics">{[['需求工时', latest?.totals.demandSeconds ?? null], ['已分配工时', latest?.totals.allocatedSeconds ?? null], ['未覆盖工时', latest?.totals.gapSeconds ?? null]].map(([label, n]) => <article key={String(label)}><span>{label}</span><strong>{hours(n as number | null)}</strong></article>)}</div>
 <div className="o2p-grid"><article><h2>1. 维护生产输入</h2><p>场地：演示工厂 demo。引用已激活员工；来源需包含责任人与确认时间。</p><label>数据类型<select value={kind} onChange={e => setKind(e.target.value as typeof kind)}>{kinds.map(k => <option key={k} value={k}>{labels[k]}（{records[k]?.length || 0}）</option>)}</select></label><Order2PeopleEntryForm key={kind} kind={kind} actorId={data.actor.id} busy={busy} onSave={v => act(async () => { await request('/' + kind, { ...v, requestKey: crypto.randomUUID() }); })}/><details><summary>结构化录入、查看与版本维护</summary><label>结构化记录<textarea aria-label="结构化记录" rows={14} value={draft} onChange={e => setDraft(e.target.value)}/></label><button disabled={busy} onClick={() => void act(async () => { const body = JSON.parse(draft); await request('/' + kind, { ...body, requestKey: crypto.randomUUID() }); })}>保存新记录</button><div>{records[kind]?.map(v => <button key={v.id} onClick={() => setDraft(JSON.stringify(v, null, 2))}>{v.id} · v{v.revision}</button>)}</div><button disabled={busy} onClick={() => void act(async () => { const body = JSON.parse(draft); await request(`/${kind}/${encodeURIComponent(body.id)}`, { expectedRevision: body.revision, patch: body, reason: '人工维护', requestKey: crypto.randomUUID() }, 'PATCH'); })}>保存为新版本</button></details></article>
 <article><h2>2. 确认范围并计算</h2><p>须涵盖场地内所有在途订单；逐日明确工序数量、批次和执行窗口。</p><button disabled={busy} onClick={prepare}>从已保存订单准备每日需求草稿</button><p>草稿沿用订单窗口。跨日订单请明确拆分到每天；准备批次须人工核对。</p><Order2PeoplePlanningForm scope={scope} demands={demands} onScope={v => { setScope(v); setComplete(false); }} onDemands={v => { setDemands(v); setComplete(false); }}/><details><summary>高级结构化草稿编辑</summary><label>计算范围<textarea aria-label="计算范围" rows={7} value={scope} onChange={e => setScope(e.target.value)}/></label><label>每日工序需求<textarea aria-label="每日工序需求" rows={9} value={demands} onChange={e => setDemands(e.target.value)}/></label></details><label><input type="checkbox" checked={complete} onChange={e => setComplete(e.target.checked)}/>已核对窗口内全部订单、每日数量、批次、资格、班次和既有占用，确认输入范围完整</label><button disabled={busy} onClick={() => void act(async () => { await request('/calculations', { scope: { ...JSON.parse(scope), completeForScope: complete, confirmedBy: data.actor.id, confirmedAt: new Date().toISOString() }, dailyDemands: JSON.parse(demands), expectedInputRevisions: Object.fromEntries(kinds.map(k => [k, (records[k] || []).map(v => ({ id: v.id, revision: v.revision }))])), requestKey: crypto.randomUUID() }); })}>确认输入并计算</button></article></div>
 {latest && <article><h2>人员容量对比</h2><p>每位人员跨技能共享容量；分配用于分析，不代表产能预订。</p>{latest.capacities.map(c => { const used = latest.allocations.filter(a => a.employeeId === c.employeeId && a.date === c.date).reduce((n, a) => n + a.allocatedSeconds, 0); return <div className="o2p-capacity" key={`${c.employeeId}:${c.date}`}><span>{c.employeeId} · {c.date}</span><meter aria-label={`${c.employeeId} 已分配容量`} min={0} max={Math.max(1, c.availableSeconds)} value={used}/><span>{hours(used)} / {hours(c.availableSeconds)}</span></div>; })}</article>}
 <article><h2>3. 诊断记录与计算依据</h2>{!results.length && <p>尚无诊断。先录入订单、工艺、资格、日历和占用完整性，再计算。</p>}{results.slice().reverse().map(r => <details key={r.id} open={r.id === latest?.id}><summary>{r.id.slice(0, 8)} · {r.status} · v{r.revision}</summary>{r.status === 'stale' && <p role="alert">输入已变化，需要重新计算。</p>}{r.missingItems.map((m, i) => <p key={i} className="o2p-error">{m.fieldPath}：{m.reason}</p>)}<div className="o2p-table"><table><thead><tr><th>工序</th><th>需求</th><th>分配</th><th>缺口</th><th>计算依据（秒）</th></tr></thead><tbody>{r.lines.map(l => <tr key={l.demandId}><td>{l.operationId}<small>{l.requirements.map(q => `${q.skillId} ≥ ${q.minLevel} (${q.qualificationTypeIds.join("、")})`).join("；")}</small></td><td>{hours(l.demandSeconds)}</td><td>{hours(l.allocatedSeconds)}</td><td>{hours(l.gapSeconds)}{l.gapSeconds !== null && <meter aria-label={`${l.operationId} 缺口比例`} min={0} max={Math.max(1, l.demandSeconds || 0)} value={l.gapSeconds}/>}</td><td>{l.formula}</td></tr>)}</tbody></table></div><details><summary>来源、资格排除与竞争关系</summary>{r.lines.map(l => <div key={l.demandId}><h3>{l.operationId}</h3><pre>{JSON.stringify(l.sourceRefs, null, 2)}</pre>{l.excludedSupply.map((e, i) => <p key={i}>{e.employeeId}：{e.reason}</p>)}<p>同日竞争需求：{l.competingDemandIds.join("、") || "无"}</p></div>)}</details>{r.assumptions.map(a => <p key={a}>{a}</p>)}{data.actor.role === 'hr' && <><button disabled={busy || r.status !== 'calculated'} onClick={() => void act(async () => { await request(`/calculations/${r.id}/confirm`, { expectedRevision: r.revision, expectedInputHash: r.inputHash, requestKey: crypto.randomUUID() }); })}>HR 确认结果</button><button disabled={busy || r.status !== 'confirmed'} onClick={() => void act(async () => { const v = await request(`/calculations/${r.id}/skillbridge-demands`); const url = URL.createObjectURL(new Blob([JSON.stringify(v, null, 2)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = `skillbridge-${r.id}.json`; a.click(); URL.revokeObjectURL(url); })}>导出 SkillBridge JSON</button><button disabled={busy || r.status !== 'confirmed'} onClick={() => navigate({ page: 'skillbridge' })}>前往 SkillBridge 分析</button></>}</details>)}</article></section>;
}
