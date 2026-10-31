/** Additive Order2People v1 contracts. HR-V2 contracts retain their meaning. */
export interface Window {
    start: string;
    end: string;
}
export interface SourceRef {
    sourceType: string;
    sourceId: string;
    revision: number;
    locator: string;
    confirmedBy: string;
    confirmedAt: string;
}
export interface Entity {
    id: string;
    revision: number;
    createdBy?: string;
    createdAt?: string;
    history?: Entity[];
}
export interface SkillRequirement {
    skillId: string;
    minLevel: number;
    qualificationTypeIds: string[];
}
export interface OrderRevision extends Entity {
    siteId: 'demo';
    productId: string;
    quantity: number;
    unit: string;
    window: Window;
    routingId: string;
    routingRevision: number;
    source: SourceRef;
    status?: 'active' | 'cancelled';
}
export interface Operation {
    operationId: string;
    positionId: string;
    requirements: SkillRequirement[];
    secondsPerUnit: number | null;
    setupSecondsPerBatch: number | null;
    batchSize?: number;
    source: SourceRef;
}
export interface RoutingRevision extends Entity {
    productId: string;
    unit: string;
    effectiveWindow: Window;
    operations: Operation[];
    source: SourceRef;
}
export interface EmployeeQualification extends Entity {
    employeeId: string;
    skillId: string;
    level: number;
    qualificationTypeId: string;
    status: 'verified' | 'unverified' | 'revoked';
    validWindow: Window;
    source: SourceRef;
}
export interface CapacityCalendar extends Entity {
    employeeId: string;
    siteId: 'demo';
    date: string;
    workIntervals: Window[];
    absenceIntervals: Window[];
    qualificationsComplete: boolean;
    reservationsComplete: boolean;
    source: SourceRef;
}
export interface CapacityReservation extends Entity {
    employeeId: string;
    window: Window;
    sourceOrderId: string | null;
    sourceOperationId?: string | null;
    committedSeconds: number;
    source: SourceRef;
    status?: 'active' | 'cancelled';
}
export interface DailyDemand {
    id: string;
    orderId: string;
    operationId: string;
    date: string;
    window: Window;
    quantity: number;
    batchCount: number;
}
export interface PlanningScope {
    siteId: 'demo';
    timeZone?: 'Asia/Shanghai';
    window: Window;
    completeForScope: boolean;
    confirmedBy: string;
    confirmedAt: string;
}
export interface Allocation {
    employeeId: string;
    demandId: string;
    date: string;
    allocatedSeconds: number;
    eligibilityRefs: {
        id: string;
        revision: number;
    }[];
}
export interface GapLine extends DailyDemand {
    demandId: string;
    orderRef: {
        id: string;
        revision: number;
    };
    positionId: string;
    requirements: SkillRequirement[];
    demandSeconds: number | null;
    allocatedSeconds: number;
    gapSeconds: number | null;
    referencePeople: null;
    formula: string;
    sourceRefs: SourceRef[];
    excludedSupply: {
        employeeId: string;
        reason: string;
    }[];
    competingDemandIds: string[];
}
export interface MissingItem {
    code: string;
    entityRef: string;
    fieldPath: string;
    reason: string;
    blocking: boolean;
    responsibleRole: string;
}
export interface CalculationSnapshot extends Entity {
    schemaVersion: '1.0';
    engineVersion: string;
    inputHash: string;
    scope: PlanningScope;
    inputRevisions: Record<string, {
        id: string;
        revision: number;
    }[]>;
    status: 'blocked' | 'calculated' | 'confirmed' | 'stale';
    completeness: 'complete' | 'incomplete';
    missingItems: MissingItem[];
    assumptions: string[];
    lines: GapLine[];
    allocations: Allocation[];
    capacities: {
        employeeId: string;
        date: string;
        availableSeconds: number;
    }[];
    totals: {
        demandSeconds: number | null;
        allocatedSeconds: number | null;
        gapSeconds: number | null;
        referencePeople: null;
    };
    confirmedBy: string | null;
    confirmedAt: string | null;
}
export interface SkillBridgeDemand {
    schemaVersion: '1.0';
    demandId: string;
    calculationId: string;
    inputHash: string;
    engineVersion: string;
    orderRef: {
        id: string;
        revision: number;
    };
    operationId: string;
    positionId: string;
    requirements: SkillRequirement[];
    window: Window;
    gapSeconds: number;
    sourceRefs: SourceRef[];
    assumptions: string[];
    confirmedBy: string;
    confirmedAt: string;
}
export interface SkillBridgeExport {
    schemaVersion: '1.0';
    calculationId: string;
    demands: SkillBridgeDemand[];
}
