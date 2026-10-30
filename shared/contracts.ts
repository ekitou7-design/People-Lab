export type Role = 'hr' | 'manager' | 'employee';
export interface Actor { id: string; name: string; role: Role; title: string; employeeId?: string }
export interface Ability { id: string; name: string; requirement: string; mandatory: boolean }
export interface Position { id: string; title: string; department: string; location: string; headcount: number; salaryRange: string; description: string; abilities: Ability[] }
export interface Evidence { abilityId: string; status: 'supported' | 'unverified' | 'gap'; summary: string; quote: string; sectionId: string }
export interface Section { id: string; title: string; content: string }
export interface Candidate { id: string; name: string; initials: string; color: string; education: string; experience: string; summary: string; stage: 'screening' | 'interview' | 'decision' | 'hired'; skills: string[]; evidence: Evidence[]; resume: { sections: Section[] }; interviewQuestions: string[] }
export interface Employee { id: string; candidateId: string; name: string; initials: string; department: string; positionId: string; positionTitle: string; managerId: string; managerName: string; status: 'pending' | 'active'; joinDate: string; leaveBalance: number; confirmedNeeds: string[] }
export interface Onboarding { id: string; employeeId: string; status: 'pending' | 'completed'; items: { id: string; title: string; done: boolean }[] }
export interface LeaveRequest { id: string; employeeId: string; employeeName: string; date: string; period: 'morning' | 'afternoon' | 'full'; days: number; reason: string; status: 'pending' | 'approved' | 'rejected'; decisionReason: string; createdAt: string; decidedAt: string | null }
export interface TrainingAttempt { id: string; selectedSteps: string[]; note: string; score: number; feedback: string; missing: string[]; createdAt: string }
export interface TrainingTask { id: string; employeeId: string; kind: 'mandatory' | 'development' | 'retry'; title: string; description: string; knowledgeId: string; status: 'not_started' | 'learning' | 'needs_retry' | 'completed'; attempts: TrainingAttempt[]; parentTaskId?: string }
export interface KnowledgeDocument { id: string; title: string; category: string; version: string; effectiveDate: string; summary: string; sections: Section[]; sourceLabel: string }
export interface Citation { knowledgeId: string; sectionId: string; quote: string }
export interface ChatMessage { id: string; employeeId: string; role: 'user' | 'assistant'; content: string; citations: Citation[]; intent?: string; suggestedAction?: { type: 'leave_form'; prefill: { date?: string; period?: 'morning' | 'afternoon' | 'full' }; missing: string[] }; createdAt: string }
export interface Ticket { id: string; employeeId: string; employeeName: string; question: string; status: 'open' | 'resolved'; response: string; createdAt: string }
export interface BusinessEvent { id: string; type: string; title: string; detail: string; actorName: string; employeeId?: string; targetId: string; createdAt: string }
export interface Metrics { candidateCount: number; hiredCount: number; activeEmployees: number; pendingOnboarding: number; pendingLeaves: number; approvedLeaves: number; rootTrainingCount: number; completedTraining: number; retryTraining: number; openTickets: number }
export interface TrainingScenario { title: string; prompt: string; steps: { id: string; label: string; description: string; required: boolean }[] }
export interface Bootstrap { mode: 'demo'; actors: Actor[]; actor: Actor; today: string; suggestedLeaveDate: string; position: Position; candidates: Candidate[]; employees: Employee[]; onboardings: Onboarding[]; leaves: LeaveRequest[]; trainingTasks: TrainingTask[]; tickets: Ticket[]; messages: ChatMessage[]; knowledge: KnowledgeDocument[]; events: BusinessEvent[]; metrics: Metrics; trainingScenario: TrainingScenario }
