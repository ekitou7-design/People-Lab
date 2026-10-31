# API contract

> 当前交付导航（2026-10-31）：[评委上手](../docs/JUDGES-QUICKSTART.md) · [使用说明](../docs/USER-GUIDE.md) · [队友移交](../docs/HANDOFF.md) · [文档索引](../docs/README.md)。本任务集成入口为PR #5，含PR #4依赖；以GitHub确认合并状态。下文原阶段/验证记录保留对应时间语境。


All API JSON is direct (no data envelope). Error shape: {error:{code,message}}. Mutations may return created records; frontend re-fetches GET /api/bootstrap after success. Use header x-demo-actor with a valid Actor.id; default actor-hr. actor-manager is the manager; active employee IDs are selectable demo actors. No real authentication is claimed. Employee users see only their own employees/leaves/training/tickets/messages/events; candidate data is HR-only. See contracts.ts for exact response fields.

- GET /api/health -> {app:'hrflow-demo',status:'ok',...}
- GET /api/bootstrap -> Bootstrap
- POST /api/candidates/:id/stage {stage:'screening'|'interview'|'decision'} (HR)
- POST /api/candidates/:id/hire {confirmedNeeds:string[]} (HR); idempotent, creates pending Employee and Onboarding. HR explicitly chooses confirmed development needs; do not turn missing resume evidence into an automatic deficit.
- PATCH /api/onboardings/:id {items:[{id,done}],joinDate?:'YYYY-MM-DD'} (HR)
- POST /api/onboardings/:id/complete {} (HR); all required items done, activates employee and creates mandatory training plus explicitly confirmed development tasks once.
- POST /api/assistant {message:string,requestKey:string} (active employee); saves user+assistant messages; deterministic policy/onboarding/training/status/leave replies with citations. Missing leave details prompt user and suggestedAction prefill; unknown question creates one human ticket.
- POST /api/leaves {date:'YYYY-MM-DD',period:'morning'|'afternoon'|'full',reason:string,requestKey:string} (active employee); validates date and balance and overlaps, saves pending request. One working day only; weekends and past dates rejected. Balance decreases only on approval.
- POST /api/leaves/:id/decision {decision:'approved'|'rejected',reason?:string} (manager or HR); rejection requires reason, idempotent same decision, opposite repeat rejected; approval transactional balance check and deduction once.
- POST /api/training/:id/start {} (own active employee)
- POST /api/training/:id/submit {selectedSteps:string[],note:string,requestKey:string} (own active employee); fixed scenario rubric, score, citations via knowledgeId, missed requirements -> exactly one linked retry task; pass on retry completes parent too. Root task metrics exclude retry tasks. Duplicate requestKey never duplicates attempt.
- POST /api/tickets/:id/resolve {response:string} (HR)
- POST /api/demo/reset {confirm:'RESET'} (HR)

Core seed: 1 quality inspector position, 3 fictional candidates (use IDs cand-chen, cand-lin, cand-zhou); no active employee before first onboarding. 4 abilities: drawing, inspection, reporting, coordination. Knowledge IDs: policy-leave, guide-onboarding, sop-quality. Required scenario step IDs: isolate, record, report, followup; optional incorrect choices continue, discard. Initial leave balance 3. Date calculations use Asia/Shanghai. Each onboarding uses checklist IDs identity, agreement, orientation. Events oldest->newest or newest->oldest must be consistently newest first. Training scenario choices appear mixed, not correct-first.

## 2026-10-31 修复说明入口

[使用说明](../docs/USER-GUIDE.md) · [队友及 Agent 移交](../docs/HANDOFF.md) · [本轮验证](../docs/VALIDATION.md)。容量以未承诺增量为准，资格覆盖完整需求窗口；部分时段调配无法证明区间时显式阻断。历史发布/阶段记录不是本轮验收。
