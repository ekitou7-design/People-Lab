import { useId, type CSSProperties } from 'react';
import type { Candidate, Employee, LeaveRequest, Position, Ticket } from '../../shared/contracts';
import './dashboard-charts.css';

const palette = ['#287cf7', '#27b7b0', '#9575e8', '#efbd50'];
const percent = (value: number, total: number) => total > 0 ? Math.round((value / total) * 1000) / 10 : 0;

function EmptyChart({ description }: { description: string }) {
  return <div className="df-empty" role="status">
    <svg className="df-empty-icon" width="64" height="48" viewBox="0 0 64 48" fill="none" aria-hidden="true">
      <rect x="8" y="28" width="10" height="14" rx="3" fill="#dbe8fb" />
      <rect x="27" y="16" width="10" height="26" rx="3" fill="#dbe8fb" />
      <rect x="46" y="5" width="10" height="37" rx="3" fill="#e9eff7" />
      <path d="M3 44H61" stroke="#d6e0ec" strokeWidth="2" strokeLinecap="round" />
    </svg>
    <p>{description}</p>
  </div>;
}

export function RecruitmentFunnel({ candidates }: { candidates: Candidate[] }) {
  const chartId = useId();
  const rows = [
    { label: '简历总数', detail: '当前全部候选人', value: candidates.length, color: '#287cf7' },
    { label: '面试及后续', detail: '待面试、待决策、已录用', value: candidates.filter(candidate => ['interview', 'decision', 'hired'].includes(candidate.stage)).length, color: '#28a4dc' },
    { label: '决策及录用', detail: '待决策、已录用', value: candidates.filter(candidate => ['decision', 'hired'].includes(candidate.stage)).length, color: '#27b7b0' },
    { label: '已录用', detail: 'HR 已确认录用', value: candidates.filter(candidate => candidate.stage === 'hired').length, color: '#9575e8' },
  ];
  const shapes = [
    '10,8 270,8 246,54 34,54',
    '34,62 246,62 222,108 58,108',
    '58,116 222,116 198,162 82,162',
    '82,170 198,170 174,216 106,216',
  ];
  return <div className="df-chart df-funnel" role="group" aria-label={`招聘阶段累计计数：${rows.map(row => `${row.label}${row.value}人`).join('，')}`}>
    <div className="df-funnel-layout">
      <svg className="df-funnel-shape" viewBox="0 0 280 224" aria-hidden="true">
        <defs><linearGradient id={`${chartId}-sheen`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff" stopOpacity="0.12" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient></defs>
        {rows.map((row, index) => <g key={row.label}>
          <polygon points={shapes[index]} fill={row.value ? row.color : '#eaf0f8'} />
          <polygon points={shapes[index]} fill={`url(#${chartId}-sheen)`} />
          <text x="140" y={38 + index * 54} textAnchor="middle" fill={row.value ? '#fff' : '#8e9db0'} className="df-funnel-count">{row.value}</text>
        </g>)}
      </svg>
      <ul className="df-funnel-legend">
        {rows.map(row => <li key={row.label}>
          <span className="df-legend-marker" style={{ backgroundColor: row.color }} aria-hidden="true" />
          <span className="df-funnel-row-name"><strong>{row.label}</strong><small>{row.detail}</small></span>
          <span className="df-funnel-value">{row.value}<small>人</small></span>
        </li>)}
      </ul>
    </div>
    <p className="df-chart-note">按当前阶段累计计数，层宽为阶段示意，不代表历史转化率。</p>
  </div>;
}

export function RequestDonut({ leaves, tickets }: { leaves: LeaveRequest[]; tickets: Ticket[] }) {
  const rows = [
    { label: '待审批', value: leaves.filter(leave => leave.status === 'pending').length, color: palette[0] },
    { label: '已批准', value: leaves.filter(leave => leave.status === 'approved').length, color: palette[1] },
    { label: '已拒绝', value: leaves.filter(leave => leave.status === 'rejected').length, color: palette[2] },
    { label: '人工咨询', value: tickets.length, color: palette[3] },
  ];
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  const radius = 75;
  const circumference = 2 * Math.PI * radius;
  let cursor = 0;
  const segments = rows.map(row => {
    const fraction = total ? row.value / total : 0;
    const segment = { ...row, offset: cursor * circumference, length: fraction * circumference };
    cursor += fraction;
    return segment;
  });
  return <div className="df-chart df-requests" role="group" aria-label={`员工事务共${total}件：${rows.map(row => `${row.label}${row.value}件`).join('，')}`}>
    <div className="df-donut-layout">
      <div className="df-donut-visual">
        <svg className="df-donut-svg" viewBox="0 0 200 200" aria-hidden="true">
          <circle cx="100" cy="100" r={radius} fill="none" stroke="#edf1f7" strokeWidth="23" />
          {segments.filter(segment => segment.value > 0).map(segment => <circle key={segment.label}
            cx="100" cy="100" r={radius} fill="none" stroke={segment.color} strokeWidth="23"
            strokeDasharray={`${segment.length} ${circumference - segment.length}`}
            strokeDashoffset={-segment.offset} transform="rotate(-90 100 100)" />)}
        </svg>
        <div className="df-donut-center"><strong>{total}</strong><span>{total ? '事务总数' : '暂无事务'}</span></div>
      </div>
      <ul className="df-donut-legend">
        {rows.map(row => <li key={row.label}>
          <span className="df-legend-marker" style={{ backgroundColor: row.color }} aria-hidden="true" />
          <span className="df-donut-label">{row.label}</span>
          <strong>{row.value}</strong><span className="df-donut-percent">{percent(row.value, total)}%</span>
        </li>)}
      </ul>
    </div>
    <p className="df-chart-note">按请假申请与人工咨询记录计数，咨询包含待回复及已答复。</p>
  </div>;
}

export function AbilityCoverage({ position, candidates }: { position: Position; candidates: Candidate[] }) {
  if (!candidates.length) return <div className="df-chart df-ability" aria-label="岗位能力证据覆盖：暂无候选人"><EmptyChart description="暂无候选人，录入后显示各能力的简历证据覆盖。" /></div>;
  const rows = position.abilities.map((ability, index) => {
    const count = candidates.filter(candidate => candidate.evidence.some(evidence => evidence.abilityId === ability.id && evidence.status === 'supported')).length;
    return { ...ability, count, coverage: percent(count, candidates.length), color: palette[index % palette.length] };
  });
  return <div className="df-chart df-ability" role="group" aria-label={`岗位能力证据覆盖，${candidates.length}位候选人，${rows.map(row => `${row.name}${row.count}人已有证据`).join('，')}`}>
    <div className="df-bars">
      {rows.map(row => {
        const barStyle: CSSProperties = { width: `${row.coverage}%`, backgroundColor: row.color };
        return <div className="df-bar-row" key={row.id}>
          <div className="df-bar-label"><span title={row.requirement}>{row.name}</span><span className="df-bar-value"><strong>{row.count}</strong> / {candidates.length} 人 <small>{row.coverage}%</small></span></div>
          <div className="df-bar-track" aria-hidden="true"><span className="df-bar-fill" style={barStyle} /></div>
        </div>;
      })}
    </div>
    <p className="df-chart-note">仅统计简历中“已有证据”的人数，不代表真实能力已通过考核。</p>
  </div>;
}

export function HeadcountBars({ employees }: { employees: Employee[] }) {
  const active = employees.filter(employee => employee.status === 'active');
  if (!active.length) return <div className="df-chart df-headcount" aria-label="部门在职人数：暂无在职员工"><EmptyChart description="暂无在职员工，HR 确认实际入职后显示部门人数。" /></div>;
  const counts = new Map<string, number>();
  for (const employee of active) {
    const department = employee.department.trim() || '未分配部门';
    counts.set(department, (counts.get(department) || 0) + 1);
  }
  const rows = [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], 'zh-CN'));
  const maximum = Math.max(...rows.map(([, count]) => count));
  return <div className="df-chart df-headcount" role="group" aria-label={`部门在职人数，共${active.length}人：${rows.map(([name, count]) => `${name}${count}人`).join('，')}`}>
    <div className="df-headcount-total"><strong>{active.length}<small>人在职</small></strong><span>{rows.length} 个部门</span></div>
    <div className="df-bars">
      {rows.map(([name, count], index) => {
        const barStyle: CSSProperties = { width: `${count / maximum * 100}%`, backgroundColor: palette[index % palette.length] };
        return <div className="df-bar-row" key={name}>
          <div className="df-bar-label"><span>{name}</span><span className="df-bar-value"><strong>{count}</strong> 人</span></div>
          <div className="df-bar-track" aria-hidden="true"><span className="df-bar-fill" style={barStyle} /></div>
        </div>;
      })}
    </div>
    <p className="df-chart-note">仅统计已正式入职员工，不包含待入职档案。</p>
  </div>;
}
