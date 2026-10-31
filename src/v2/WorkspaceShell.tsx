import { useState, type ReactNode } from 'react';
import { IconArrowUpRight, IconBook2, IconBuildingFactory2, IconChevronRight, IconLayoutDashboard, IconMenu2, IconMessageCircle, IconPlayerPlay, IconRefresh, IconSchool, IconShieldCheck, IconUserPlus, IconUsers, IconUsersGroup, IconX } from '@tabler/icons-react';
import type { Bootstrap } from '../../shared/contracts';
import type { NavigationTarget, Page } from './types';
import { Avatar } from './ui';

export interface WorkspaceShellProps {
  data: Bootstrap;
  page: Page;
  busy: boolean;
  onNavigate: (target: NavigationTarget) => void;
  onActorChange: (actorId: string) => void;
  onOpenGuide: () => void;
  onOpenReset: () => void;
  children: ReactNode;
}
const items = [
  { page: 'order2people' as Page, label: '生产需求', title: '生产需求与能力', icon: IconBuildingFactory2 },
  { page: 'skillbridge' as Page, label: 'SkillBridge', title: 'SkillBridge 能力供给', icon: IconUsersGroup },
  { page: 'dashboard' as Page, label: '驾驶舱', title: '人才工作台', icon: IconLayoutDashboard },
  { page: 'recruitment' as Page, label: '招聘工作台', title: '招聘证据审阅', icon: IconUsers },
  { page: 'onboarding' as Page, label: '入职管理', title: '入职办理', icon: IconUserPlus },
  { page: 'service' as Page, label: '员工服务', title: '员工服务', icon: IconMessageCircle },
  { page: 'training' as Page, label: '岗位培训', title: '岗位培养', icon: IconSchool },
  { page: 'knowledge' as Page, label: '企业知识库', title: '企业知识', icon: IconBook2 },
];
const roles = { hr: 'HR 管理员', manager: '部门主管', employee: '员工' };

export function WorkspaceShell({ data, page, busy, onNavigate, onActorChange, onOpenGuide, onOpenReset, children }: WorkspaceShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = (target: NavigationTarget) => { setMenuOpen(false); onNavigate(target); };
  const navItems = items.filter(item => (item.page !== 'order2people' || data.actor.role !== 'employee') && (item.page !== 'skillbridge' || data.actor.role !== 'employee') && (item.page !== 'recruitment' || data.actor.role === 'hr') && (item.page !== 'onboarding' || data.actor.role !== 'employee'));
  const pending = data.leaves.filter(item => item.status === 'pending').length + data.tickets.filter(item => item.status === 'open').length;
  return <div className="v2-workspace">
    <a className="v2-skip-link" href="#v2-main">跳到主要内容</a>
    {menuOpen && <button className="v2-nav-backdrop" aria-label="关闭导航" onClick={() => setMenuOpen(false)} />}
    <aside className={`v2-sidebar ${menuOpen ? 'open' : ''}`} data-testid="primary-sidebar">
      <a href="#" className="v2-brand" onClick={event => { event.preventDefault(); navigate({ page: 'dashboard' }); }}><span><IconBuildingFactory2 size={23} stroke={1.6} /></span><div>HRFlow <b>AI</b><small>企业人才协同平台</small></div></a>
      <div className="v2-space-label"><span>智</span><div>智造人才工作空间<small>招聘 · 服务 · 岗位培养</small></div></div>
      <div className="v2-nav-label">工作空间</div>
      <nav aria-label="主导航">{navItems.map(item => <button key={item.page} aria-label={item.label} aria-current={page === item.page ? 'page' : undefined} className={`v2-nav-item ${page === item.page ? 'active' : ''}`} onClick={() => navigate({ page: item.page })}><item.icon size={19} stroke={1.7} /><span>{item.title}</span>{item.page === 'recruitment' && <small>{data.candidates.filter(candidate => candidate.stage !== 'hired').length}</small>}{item.page === 'service' && pending > 0 && <small>{pending}</small>}</button>)}</nav>
      <div className="v2-sidebar-bottom"><div className="v2-demo-note"><span />规则模拟 · 本地演示<small>业务状态真实保存，资料均为虚构</small></div><button className="v2-sidebar-action" onClick={onOpenGuide}><IconPlayerPlay size={16} /><span>查看演示路线</span><IconArrowUpRight size={15} /></button>{data.actor.role === 'hr' && <button className="v2-sidebar-action subtle" onClick={onOpenReset} disabled={busy}><IconRefresh size={15} /><span>重置演示数据</span></button>}<div className="v2-sidebar-person"><Avatar name={data.actor.name} small /><div><strong>{data.actor.name}</strong><small>{roles[data.actor.role]}</small></div><IconShieldCheck size={17} /></div></div>
    </aside>
    <div className="v2-main-shell"><header className="v2-topbar"><div className="v2-breadcrumb"><button className="v2-icon-button v2-menu-toggle" aria-label={menuOpen ? '关闭导航' : '打开导航'} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <IconX size={21} /> : <IconMenu2 size={21} />}</button><span>工作空间</span><IconChevronRight size={14} /><strong>{items.find(item => item.page === page)?.title}</strong></div><div className="v2-topbar-right"><span className="v2-demo-pill">演示环境</span><label className="v2-actor-select"><IconUsers size={16} /><select aria-label="切换演示身份" disabled={busy} value={data.actor.id} onChange={event => { setMenuOpen(false); onActorChange(event.target.value); }}>{data.actors.map(actor => <option key={actor.id} value={actor.id}>{actor.name} · {actor.title}</option>)}</select></label><Avatar name={data.actor.name} small /></div></header><main id="v2-main" className="v2-main" tabIndex={-1}>{children}</main></div>
  </div>;
}

export default WorkspaceShell;
