/**
 * Additive SkillBridge v1 contracts. Read-only consumer of Order2People's confirmed
 * SkillBridgeDemand export; does not alter Order2People or HR-V2 contract meaning.
 *
 * SkillBridge never invents a match score and never upgrades training completion or
 * resume keywords into a verified qualification. Every candidate classification must
 * trace back to an EmployeeQualification (Order2People) or an explicit, human-confirmed
 * note. Anything without that evidence is 'unverified'.
 */
import type { SkillRequirement, SourceRef, Window } from './order2people';

/** Why an employee's current qualification evidence does or does not cover a demand's requirement. */
export type SkillMatchKind =
  | 'verified_match'       // a verified EmployeeQualification already meets skillId + minLevel + qualificationTypeId
  | 'adjacent_skill'       // employee holds the same skillId at a lower level, or an unverified/expired qualification for it
  | 'no_evidence';         // no qualification record at all for this skillId

export interface SkillEvidenceRef {
  kind: 'order2people_qualification' | 'training_task_completed' | 'manual_hr_note';
  /** EmployeeQualification.id, TrainingTask.id, or a free-form note id. */
  refId: string;
  /** Human-readable summary shown to HR; never a generated confidence score. */
  summary: string;
}

/** One requirement-vs-employee comparison line, fully explainable. */
export interface SkillGapLine {
  requirement: SkillRequirement;
  matchKind: SkillMatchKind;
  /** The employee's best current evidence for this skillId, if any (still may be insufficient). */
  currentLevel: number | null;
  currentStatus: 'verified' | 'unverified' | 'revoked' | null;
  evidenceRefs: SkillEvidenceRef[];
  /** What must happen before this requirement can be considered met. Never a promised date. */
  closingAction: string | null;
}

export type CandidateClassification =
  | 'qualified_verified'     // meets every requirement with verified evidence
  | 'potential_transferable' // meets some requirements, or meets all at unverified/expired status
  | 'insufficient_evidence'; // no usable evidence for the required skills

export interface CandidateCapacitySnapshot {
  /** Sourced from Order2People CapacityCalendar/CapacityReservation for the same demand window; null if unknown. */
  availableSecondsInWindow: number | null;
  /** Seconds already committed via CapacityReservation inside the demand window; always counted, never re-offered as free capacity. */
  committedSecondsInWindow: number;
  /** True only when both calendar and reservation completeness flags were confirmed for the relevant dates. */
  capacityDataComplete: boolean;
  note: string;
}

export interface InternalCandidate {
  employeeId: string;
  employeeName: string;
  classification: CandidateClassification;
  skillGaps: SkillGapLine[];
  capacity: CandidateCapacitySnapshot;
  /** Explicit statement of what a supervisor must confirm before any deployment/training decision is final. */
  requiresManagerConfirmation: string[];
  /** True only when the employee record is a labeled demo fixture, never a real person. */
  isDemoFixture: boolean;
}

export type ProposalPath = 'internal_assignment' | 'development_plan' | 'external_requisition';

export interface PathRationale {
  path: ProposalPath;
  employeeId?: string;
  /** Plain-language explanation of why this path is viable, written from the evidence above — never a numeric score. */
  feasibilityNote: string;
  /** Known risks or unknowns that keep this from being a guaranteed outcome. */
  risks: string[];
  /** Concrete next action a human must take; never a cost or committed date. */
  nextAction: string;
}

export type ProposalStatus = 'draft' | 'hr_approved' | 'hr_rejected';

/** What, if anything, has actually been created in Recruitment/Training/Order2People from this proposal. */
export type ExecutionStatus = 'not_executed' | 'executed' | 'blocked_stale';

export interface ProposalExecution {
  status: ExecutionStatus;
  /** 'training_task' (development_plan) | 'requisition' (external_requisition) | 'capacity_reservation' (internal_assignment). */
  refType: 'training_task' | 'requisition' | 'capacity_reservation' | null;
  /** TrainingTask.id, RecruitmentRequisition.id, or CapacityReservation.id. */
  refId: string | null;
  executedBy: string | null;
  executedAt: string | null;
  /** Human note captured at execution time, e.g. manager's risk acknowledgement for an internal assignment. */
  note: string | null;
}

export interface SkillBridgeProposal {
  id: string;
  revision: number;
  caseId: string;
  path: ProposalPath;
  employeeId: string | null;
  rationale: PathRationale;
  status: ProposalStatus;
  /** Set only once a human (HR) reviews; never auto-populated. */
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  /** Set only once HR executes an approved proposal; never auto-populated by review alone. */
  execution: ProposalExecution;
  createdBy: string;
  createdAt: string;
  history?: SkillBridgeProposal[];
}

/** Lightweight recruitment-need draft created from an external_requisition proposal.
 *  Not a Candidate — no fabricated person is ever created. HR links real candidates manually. */
export type RequisitionStatus = 'draft' | 'open' | 'closed';

export interface RecruitmentRequisition {
  id: string;
  revision: number;
  caseId: string;
  proposalId: string;
  positionId: string;
  operationId: string;
  skillRequirements: SkillRequirement[];
  window: Window;
  gapSeconds: number;
  status: RequisitionStatus;
  note: string;
  /** Candidate.id values HR has manually linked as being evaluated against this requisition. */
  linkedCandidateIds: string[];
  createdBy: string;
  createdAt: string;
  history?: RecruitmentRequisition[];
}

export type CaseStatus = 'open' | 'demand_stale';

/**
 * A SkillBridge case anchors all analysis to one Order2People SkillBridgeDemand line.
 * If the underlying calculation becomes stale/unconfirmed/incomplete, status flips to
 * 'demand_stale' and existing proposals are frozen (read-only) rather than deleted.
 */
export interface SkillBridgeCase {
  id: string;
  revision: number;
  calculationId: string;
  demandId: string;
  /** Snapshot of the SkillBridgeDemand at case-creation time, for traceability. Not re-fetched live. */
  demandSnapshot: {
    positionId: string;
    operationId: string;
    requirements: SkillRequirement[];
    window: Window;
    gapSeconds: number;
    sourceRefs: SourceRef[];
    inputHash: string;
    engineVersion: string;
  };
  status: CaseStatus;
  candidates: InternalCandidate[];
  proposals: SkillBridgeProposal[];
  createdBy: string;
  createdAt: string;
}

export interface SkillBridgeCaseList {
  items: SkillBridgeCase[];
  nextCursor: string | null;
}
