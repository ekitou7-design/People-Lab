// Fictional, explicitly labeled SkillBridge demo fixtures (not real employee records).
// Adds a second demo employee alongside Order2People's emp-o2p-demo: one who holds an
// adjacent skill at the right skillId but an *unverified* qualification, so SkillBridge
// can demonstrate "not directly deployable, needs verification/training" rather than a
// trivial always-qualified match.
export const skillbridgeDemoEmployee = {
  id: 'emp-skillbridge-demo',
  candidateId: 'skillbridge-demo-fictional',
  name: '演示转岗员工（虚构）',
  initials: '虚',
  department: '生产一部',
  positionId: 'pos-assembly-demo',
  positionTitle: '演示装配员',
  managerId: 'actor-manager',
  managerName: '周明远',
  status: 'active',
  joinDate: '2026-10-01',
  leaveBalance: 3,
  confirmedNeeds: [],
};

/**
 * Order2People-shaped fixtures for the adjacent-skill employee: a qualification record
 * that targets the same skillId/level used by the quality-inspector demand but is marked
 * 'unverified' (evidence exists, not yet confirmed) plus a calendar with free capacity on
 * the same date as the Order2People demo order window. Reapplying creates new revisions,
 * never deletes history, same pattern as order2people-demo.mjs.
 */
export function skillbridgeDemoQualification(actorId) {
  const date = '2026-11-02';
  const validWindow = { start: `${date}T00:00:00+08:00`, end: '2026-12-31T23:59:59+08:00' };
  const source = {
    sourceType: 'demo', sourceId: 'skillbridge-demo', revision: 1,
    locator: 'fictional-manual-fixture', confirmedBy: actorId, confirmedAt: new Date().toISOString(),
  };
  return {
    id: 'skillbridge-demo-qualification',
    employeeId: skillbridgeDemoEmployee.id,
    skillId: 'inspection',
    level: 2,
    qualificationTypeId: 'quality-auth',
    status: 'unverified',
    validWindow,
    source,
  };
}

export function skillbridgeDemoCalendar(actorId) {
  const date = '2026-11-02';
  const window = { start: `${date}T08:00:00+08:00`, end: `${date}T16:00:00+08:00` };
  const source = {
    sourceType: 'demo', sourceId: 'skillbridge-demo', revision: 1,
    locator: 'fictional-manual-fixture', confirmedBy: actorId, confirmedAt: new Date().toISOString(),
  };
  return {
    id: 'skillbridge-demo-calendar',
    employeeId: skillbridgeDemoEmployee.id,
    siteId: 'demo',
    date,
    workIntervals: [window],
    absenceIntervals: [],
    qualificationsComplete: true,
    reservationsComplete: true,
    source,
  };
}
