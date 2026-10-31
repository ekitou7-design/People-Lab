import { useCallback, useEffect, useRef, useState } from 'react';
import { IconArrowRight, IconBuildingFactory2, IconRefresh, IconShieldCheck, IconX } from '@tabler/icons-react';
import type { Bootstrap } from '../../shared/contracts';
import type { KnowledgeTarget, Mutate, NavigationTarget, Page, PageProps } from './types';
import { WorkspaceShell } from './WorkspaceShell';
import { Order2PeoplePage } from './Order2PeoplePage';
import { DashboardPage } from './DashboardPage';
import { RecruitmentPage } from './RecruitmentPage';
import { OnboardingPage } from './OnboardingPage';
import { ServicePage } from './ServicePage';
import { TrainingPage } from './TrainingPage';
import { KnowledgePage } from './KnowledgePage';
import { Dialog } from './ui';

export default function WorkbenchApp() {
  const [actorId, setActorId] = useState(() => localStorage.getItem('hrflow-demo-actor') || 'actor-hr');
  const actorRef = useRef(actorId);
  actorRef.current = actorId;
  const [data, setData] = useState<Bootstrap | null>(null);
  const [target, setTarget] = useState<NavigationTarget>({ page: 'dashboard' });
  const [contexts, setContexts] = useState<Partial<Record<Page, NavigationTarget>>>({ dashboard: { page: 'dashboard' } });
  const [returnTarget, setReturnTarget] = useState<NavigationTarget | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [guideOpen, setGuideOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetError, setResetError] = useState('');
  const [revision, setRevision] = useState(0);

  const request = useCallback(async <T,>(path: string, method = 'GET', body?: unknown, signal?: AbortSignal): Promise<T> => {
    const response = await fetch(path, { method, signal, headers: { 'Content-Type': 'application/json', 'x-demo-actor': actorId }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error?.message || '请求未完成，请稍后重试');
    return result as T;
  }, [actorId]);
  const refresh = useCallback(async () => {
    const requestedActor = actorId;
    const next = await request<Bootstrap>('/api/bootstrap');
    if (actorRef.current === requestedActor) setData(next);
    return next;
  }, [request, actorId]);
  useEffect(() => {
    const controller = new AbortController();
    request<Bootstrap>('/api/bootstrap', 'GET', undefined, controller.signal).then(next => { if (actorRef.current === actorId) setData(next); }).catch(reason => {
      if (reason.name === 'AbortError') return;
      if (actorId !== 'actor-hr' && /身份|actor|用户|员工/i.test(reason.message)) {
        localStorage.setItem('hrflow-demo-actor', 'actor-hr'); setActorId('actor-hr');
      } else setError(reason.message);
    });
    return () => controller.abort();
  }, [request, actorId]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 4200); return () => clearTimeout(timer); }, [toast]);

  // Return saved writes even when the following read fails, so forms do not repeat a successful operation.
  const mutate: Mutate = async <T,>(path: string, body?: unknown, method: 'POST' | 'PATCH' = 'POST'): Promise<T> => {
    if (busyRef.current) throw new Error('上一项操作正在保存，请稍候');
    busyRef.current = true; setBusy(true); setError('');
    try {
      const result = await request<T>(path, method, body);
      try { await refresh(); setToast('操作已保存，业务记录已同步'); }
      catch { setError('操作已保存，但最新数据暂未同步。请重新连接后查看，请勿重复办理。'); }
      return result;
    } finally { busyRef.current = false; setBusy(false); }
  };
  function navigate(next: NavigationTarget) {
    if (data && ((next.page === 'recruitment' && data.actor.role !== 'hr') || (next.page === 'onboarding' && data.actor.role === 'employee'))) next = { page: 'dashboard' };
    setTarget({ ...next }); setError(current => current.startsWith('操作已保存') ? current : '');
    setContexts(current => ({ ...current, [next.page]: { ...next } }));
    if (next.page !== 'knowledge') setReturnTarget(null);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function openKnowledge(reference: KnowledgeTarget) {
    if (target.page !== 'knowledge') setReturnTarget(target);
    setTarget({ page: 'knowledge', ...reference });
    setContexts(current => ({ ...current, knowledge: { page: 'knowledge', ...reference } }));
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function switchActor(next: string) {
    if (busyRef.current || next === actorId) return;
    localStorage.setItem('hrflow-demo-actor', next); actorRef.current = next; setData(null); setActorId(next);
    setTarget({ page: 'dashboard' }); setReturnTarget(null); setGuideOpen(false);
    setContexts({ dashboard: { page: 'dashboard' } });
    setResetOpen(false); setResetError(''); setError(''); setToast('');
  }
  if (!data) return <div className="v2-boot"><span><IconBuildingFactory2 size={30} /></span><h1>People-Lab</h1><p>{error || '正在连接人才协同工作台…'}</p>{error && <button className="v2-button primary" onClick={() => { setError(''); refresh().catch(reason => setError(reason.message)); }}>重新连接</button>}</div>;

  const pageProps: PageProps = { data, busy, mutate, navigate, openKnowledge, focus: target };
  const pageKey = `${data.actor.id}-${revision}`;
  const steps: { title: string; text: string; target: NavigationTarget; visible: boolean }[] = [
    { title: '审阅候选人与能力证据', text: '同时查看匹配判断、简历原句和面试问题，由 HR 确认录用。', target: { page: 'recruitment', candidateId: 'cand-chen' }, visible: data.actor.role === 'hr' },
    { title: '完成核验并确认入职', text: '核验清单完成后激活员工档案，自动分配岗位培养任务。', target: { page: 'onboarding' }, visible: data.actor.role !== 'employee' },
    { title: '咨询制度、填写申请与审批', text: '切换员工身份，在办理卡中填写、预览并提交；主管身份处理审批。', target: { page: 'service' }, visible: true },
    { title: '学习 SOP，完成演练与复练', text: '切换员工身份，根据四项规则补齐遗漏；首次与关联复练记录分别保留。', target: { page: 'training' }, visible: true },
    { title: '查看协同进度与操作记录', text: '指标与人员明细由同一份业务记录更新。', target: { page: 'dashboard' }, visible: true },
  ];
  return <WorkspaceShell key={data.actor.id} data={data} page={target.page} busy={busy} onNavigate={navigate} onActorChange={switchActor} onOpenGuide={() => setGuideOpen(true)} onOpenReset={() => { setResetError(''); setResetOpen(true); }}>
    {error && <div className="v2-global-error" role="alert"><span>{error}</span><button className="v2-button secondary" disabled={busy} onClick={() => refresh().then(() => setError('')).catch(reason => setError(reason.message))}>重新同步</button><button className="v2-icon-button" aria-label="关闭提示" onClick={() => setError('')}><IconX size={18} /></button></div>}
    {Object.entries(contexts).map(([page, focus]) => <div key={`${pageKey}-${page}`} style={{ display: target.page === page ? undefined : 'none' }} aria-hidden={target.page !== page || undefined}>
      {page === 'order2people' && data.actor.role !== 'employee' && <Order2PeoplePage {...pageProps} />}
      {page === 'dashboard' && <DashboardPage {...pageProps} focus={focus} />}
      {page === 'recruitment' && <RecruitmentPage {...pageProps} focus={focus} />}
      {page === 'onboarding' && <OnboardingPage {...pageProps} focus={focus} />}
      {page === 'service' && <ServicePage {...pageProps} focus={focus} />}
      {page === 'training' && <TrainingPage {...pageProps} focus={focus} />}
      {page === 'knowledge' && <KnowledgePage {...pageProps} focus={focus} onBack={returnTarget ? () => navigate(returnTarget) : undefined} />}
    </div>)}
    {toast && <div className="v2-toast" role="status"><IconShieldCheck size={18} />{toast}</div>}
    {guideOpen && <Dialog title="用一位新同事，走通人才协同" label="演示路线" description="演示身份切换仅用于体验流程。业务操作由后端校验并保存。" onClose={() => setGuideOpen(false)}><div className="v2-guide-list">{steps.filter(step => step.visible).map((step, index) => <button key={step.title} onClick={() => { setGuideOpen(false); navigate(step.target); }}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{step.title}</strong><p>{step.text}</p></div><IconArrowRight size={18} /></button>)}</div><p className="v2-muted"><IconShieldCheck size={16} />虚构演示企业 · 预置证据 · 程序规则评分 · 人工决定</p></Dialog>}
    {resetOpen && data.actor.role === 'hr' && <Dialog title="重置演示数据" label="重置演示数据" description="清空本地业务记录，回到初始招聘状态" error={resetError} onClose={() => { if (!busy) setResetOpen(false); }}><div className="v2-reset-warning"><IconRefresh size={28} /><p>录用、入职、请假、咨询、培训和操作记录将被清空。三份虚构简历与演示知识资料会恢复为初始状态。</p></div><div className="v2-dialog-actions"><button className="v2-button secondary" disabled={busy} onClick={() => setResetOpen(false)}>保留当前数据</button><button className="v2-button danger" disabled={busy} onClick={async () => { try { await mutate('/api/demo/reset', { confirm: 'RESET' }); setResetOpen(false); setRevision(value => value + 1); navigate({ page: 'dashboard' }); } catch (reason) { setResetError(reason instanceof Error ? reason.message : '重置未完成'); } }}>确认重置</button></div></Dialog>}
  </WorkspaceShell>;
}
