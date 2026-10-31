// Deterministic skill-rule analysis. No ML/LLM inference is performed here — every
// classification traces to an EmployeeQualification record (Order2People) or a
// TrainingTask completion already present in business state. Training completion is
// never upgraded into a verified qualification by this module.
export const engineVersion = 'skillbridge-rules-1';

const time = (value) => Date.parse(value);

/**
 * Overlap-seconds of a reservation window against the demand window, used to prove
 * capacity is or is not already committed. Mirrors Order2People's own interval math
 * (order2people-engine.mjs) rather than re-deriving a different notion of "available".
 */
function overlapSeconds(windowA, windowB) {
  const start = Math.max(time(windowA.start), time(windowB.start));
  const end = Math.min(time(windowA.end), time(windowB.end));
  return Math.max(0, end - start) / 1000;
}

/**
 * Classify one employee's qualification evidence against one SkillRequirement.
 * Never produces a numeric confidence score — only a traceable matchKind + evidence refs.
 */
function matchRequirement(requirement, qualifications, trainingTasks, employeeId) {
  const relevant = qualifications.filter((q) => q.employeeId === employeeId && q.skillId === requirement.skillId
    && (requirement.qualificationTypeIds || []).includes(q.qualificationTypeId));
  // Prefer the strongest evidence: verified > unverified > revoked.
  const byStrength = [...relevant].sort((a, b) => {
    const rank = { verified: 2, unverified: 1, revoked: 0 };
    return (rank[b.status] ?? -1) - (rank[a.status] ?? -1);
  });
  const best = byStrength[0];
  const evidenceRefs = [];
  if (best) {
    evidenceRefs.push({
      kind: 'order2people_qualification', refId: best.id,
      summary: `${best.status === 'verified' ? '已验证' : best.status === 'unverified' ? '未验证' : '已撤销'}资格记录：技能 ${best.skillId} 等级 ${best.level}，类型 ${best.qualificationTypeId}`,
    });
  }
  const relatedTraining = trainingTasks.filter((t) => t.employeeId === employeeId && t.status === 'completed'
    && (t.knowledgeId === 'sop-quality' || t.title?.includes(requirement.skillId)));
  for (const task of relatedTraining) {
    evidenceRefs.push({
      kind: 'training_task_completed', refId: task.id,
      summary: `完成培训任务「${task.title}」，完成不代表已具备正式上岗资格，仅作为培养路径参考`,
    });
  }
  const meetsLevel = best && best.status === 'verified' && best.level >= requirement.minLevel
    && time(best.validWindow?.end) >= Date.now();
  let matchKind, closingAction;
  if (meetsLevel) { matchKind = 'verified_match'; closingAction = null; }
  else if (best) {
    matchKind = 'adjacent_skill';
    closingAction = best.status === 'unverified'
      ? `需由资格维护负责人核实并确认「${requirement.skillId}」资格类型 ${best.qualificationTypeId} 后方可计入正式供给`
      : best.status === 'revoked'
        ? `资格已撤销，须重新评估并取得新的有效资格记录`
        : `当前等级 ${best.level} 低于岗位要求 ${requirement.minLevel}，需补足等级或重新认证`;
  } else if (relatedTraining.length) {
    matchKind = 'adjacent_skill';
    closingAction = `尚无「${requirement.skillId}」资格记录，仅有培训完成记录；培训通过不等于岗位资质，需安排正式资格核验`;
  } else {
    matchKind = 'no_evidence';
    closingAction = `无任何「${requirement.skillId}」技能证据，需先核实是否具备基础能力再评估培养或招聘`;
  }
  return {
    requirement, matchKind,
    currentLevel: best?.level ?? null,
    currentStatus: best?.status ?? null,
    evidenceRefs, closingAction,
  };
}

function classify(skillGaps) {
  if (skillGaps.every((g) => g.matchKind === 'verified_match')) return 'qualified_verified';
  if (skillGaps.some((g) => g.matchKind !== 'no_evidence')) return 'potential_transferable';
  return 'insufficient_evidence';
}

/**
 * Capacity snapshot for one employee inside the demand window, from Order2People's own
 * calendars/reservations. Already-committed reservation seconds are always subtracted,
 * never re-offered as free "internal supply" (this is the core safety rule requested:
 * do not claim an internal reassignment is safe without checking existing commitments).
 */
function capacityFor(employeeId, demandWindow, calendars, reservations) {
  const date = demandWindow.start.slice(0, 10);
  const calendar = calendars.find((c) => c.employeeId === employeeId && c.date === date);
  if (!calendar) {
    return { availableSecondsInWindow: null, committedSecondsInWindow: 0, capacityDataComplete: false, note: `无 ${date} 的日历记录，无法判断可用容量` };
  }
  const workSeconds = calendar.workIntervals.reduce((n, w) => n + overlapSeconds(w, demandWindow), 0);
  const absenceSeconds = calendar.absenceIntervals.reduce((n, w) => n + overlapSeconds(w, demandWindow), 0);
  const activeReservations = reservations.filter((r) => r.employeeId === employeeId && r.status !== 'cancelled');
  const committedSecondsInWindow = activeReservations.reduce((n, r) => n + overlapSeconds(r.window, demandWindow), 0);
  const complete = calendar.qualificationsComplete && calendar.reservationsComplete;
  const availableSecondsInWindow = complete ? Math.max(0, workSeconds - absenceSeconds - committedSecondsInWindow) : null;
  return {
    availableSecondsInWindow, committedSecondsInWindow, capacityDataComplete: complete,
    note: complete
      ? `${date} 班次 ${Math.round(workSeconds / 3600)}h，休假 ${Math.round(absenceSeconds / 3600)}h，已占用 ${Math.round(committedSecondsInWindow / 3600)}h`
      : `${date} 日历未确认资格或占用完整性，可用容量不可判定`,
  };
}

/**
 * Build the InternalCandidate list for one demand's requirements. Only considers active
 * employees already present in business state — never invents a person.
 */
export function findInternalCandidates(demand, { employees, qualifications, trainingTasks, calendars, reservations, demoEmployeeIds }) {
  const activeEmployees = employees.filter((e) => e.status === 'active');
  return activeEmployees.map((employee) => {
    const skillGaps = demand.requirements.map((req) => matchRequirement(req, qualifications, trainingTasks, employee.id));
    const classification = classify(skillGaps);
    const capacity = capacityFor(employee.id, demand.window, calendars, reservations);
    const requiresManagerConfirmation = [];
    if (skillGaps.some((g) => g.matchKind === 'adjacent_skill')) requiresManagerConfirmation.push('主管须核实未验证或等级不足的资格证据后才能确认可迁移技能');
    if (!capacity.capacityDataComplete) requiresManagerConfirmation.push('须补全该员工日历的资格与占用完整性确认，才能判断是否有可用容量');
    if (classification === 'qualified_verified' && capacity.availableSecondsInWindow === 0) requiresManagerConfirmation.push('该员工资格已验证，但当前窗口可用容量为 0，调配会影响原有任务，需主管确认影响');
    return {
      employeeId: employee.id, employeeName: employee.name, classification, skillGaps, capacity,
      requiresManagerConfirmation, isDemoFixture: demoEmployeeIds.has(employee.id),
    };
  }).filter((c) => c.classification !== 'insufficient_evidence' || c.skillGaps.some((g) => g.evidenceRefs.length > 0))
    // Keep insufficient_evidence candidates out entirely when there is zero evidence of any kind,
    // to avoid implying every active employee was "considered" with no basis; still sort evidence-bearing first.
    .sort((a, b) => {
      const rank = { qualified_verified: 2, potential_transferable: 1, insufficient_evidence: 0 };
      return rank[b.classification] - rank[a.classification];
    });
}

/**
 * Build explainable path rationales (internal assignment / development / external
 * requisition). Never states a guaranteed date, cost, or headcount — only feasibility
 * notes, risks, and the concrete next human action.
 */
export function buildPathRationales(demand, candidates) {
  const rationales = [];
  const verifiedWithCapacity = candidates.filter((c) => c.classification === 'qualified_verified' && (c.capacity.availableSecondsInWindow ?? 0) >= demand.gapSeconds);
  for (const c of verifiedWithCapacity) {
    rationales.push({
      path: 'internal_assignment', employeeId: c.employeeId,
      feasibilityNote: `${c.employeeName} 的资格已验证且满足岗位要求，${demand.window.start.slice(0, 10)} 当日可用容量 ${Math.round((c.capacity.availableSecondsInWindow ?? 0) / 3600)}h，覆盖缺口 ${Math.round(demand.gapSeconds / 3600)}h 后仍有余量，且已扣除既有任务占用。`,
      risks: ['调配仍需确认原岗位任务不会因此次借调而产生新的能力缺口', '容量数据基于当前日历快照，变化后需重新核验'],
      nextAction: `由主管确认 ${c.employeeName} 原岗位任务不受影响后，在人员排班中落实调配`,
    });
  }
  const verifiedNoCapacity = candidates.filter((c) => c.classification === 'qualified_verified' && !verifiedWithCapacity.includes(c));
  for (const c of verifiedNoCapacity) {
    rationales.push({
      path: 'internal_assignment', employeeId: c.employeeId,
      feasibilityNote: `${c.employeeName} 资格已验证，但${c.capacity.capacityDataComplete ? `当日可用容量仅 ${Math.round((c.capacity.availableSecondsInWindow ?? 0) / 3600)}h，不足以覆盖 ${Math.round(demand.gapSeconds / 3600)}h 缺口` : '日历未确认完整性，无法判断是否有可用容量'}。`,
      risks: ['不能宣称安全可调配：缺少完整的原岗位影响数据或可用容量不足', '若强行调配可能在原岗位产生新的能力缺口'],
      nextAction: c.capacity.capacityDataComplete ? '如需调配，须先与原岗位主管确认腾出容量的影响' : '须先补全该员工日历的资格与占用完整性确认',
    });
  }
  const transferable = candidates.filter((c) => c.classification === 'potential_transferable');
  for (const c of transferable) {
    const closing = c.skillGaps.filter((g) => g.matchKind !== 'verified_match').map((g) => g.closingAction).filter(Boolean);
    rationales.push({
      path: 'development_plan', employeeId: c.employeeId,
      feasibilityNote: `${c.employeeName} 具备部分相关技能证据，尚未满足全部岗位要求：${closing.join('；') || '需补充技能证据'}。`,
      risks: ['培训通过不等于岗位资质，仍需正式资格核验', '未提供可验证的培养周期，不能当作确定到岗时间', '是否需要导师或主管考核尚待确认'],
      nextAction: `建议安排 ${c.employeeName} 完成资格核验或针对性培训，由主管审批后再纳入正式供给`,
    });
  }
  // External path is always offered as a visible option; feasibility depends on whether any viable internal path exists.
  const hasReliableInternal = verifiedWithCapacity.length > 0;
  rationales.push({
    path: 'external_requisition',
    feasibilityNote: hasReliableInternal
      ? '已存在至少一条可靠的内部调配路径；外部招聘仅作为备选或长期人才储备考虑。'
      : `内部暂无可直接满足资格与容量要求的人员（${transferable.length} 人具备部分可迁移技能，仍需核验）。`,
    risks: ['外部招聘到岗时间与成本未知，需交由招聘模块评估', '生成的是招聘需求草稿，不代表已发起正式招聘'],
    nextAction: '将该缺口的岗位、技能要求与时间窗口转交招聘工作台，由 HR 发起或关联候选人评审',
  });
  return rationales;
}
