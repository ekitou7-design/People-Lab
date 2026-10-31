import type { Bootstrap, Candidate } from '../../shared/contracts';

export type Page = 'order2people' | 'skillbridge' | 'dashboard' | 'recruitment' | 'onboarding' | 'service' | 'training' | 'knowledge';
export interface NavigationTarget {
  page: Page;
  candidateId?: string;
  abilityId?: string;
  employeeId?: string;
  taskId?: string;
  requestId?: string;
  stage?: Candidate['stage'] | 'all';
  knowledgeId?: string;
  sectionId?: string;
  quote?: string;
  calculationId?: string;
  demandId?: string;
  caseId?: string;
}
export interface KnowledgeTarget { knowledgeId: string; sectionId?: string; quote?: string }
export type Mutate = <T = unknown>(path: string, body?: unknown, method?: 'POST' | 'PATCH') => Promise<T>;
export interface PageProps {
  refreshData?: () => Promise<unknown>;
  data: Bootstrap;
  busy: boolean;
  mutate: Mutate;
  navigate: (target: NavigationTarget) => void;
  openKnowledge: (target: KnowledgeTarget) => void;
  focus?: NavigationTarget;
}
