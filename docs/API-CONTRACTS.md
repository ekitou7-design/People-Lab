# 共享数据模型与 API 契约

状态：实现契约 v1.0，Order2People 第一阶段交付候选。运行时以本文件、shared/order2people.ts 和契约测试为准。P1 extraction 未实现。

## 当前实现与兼容原则

现有 API 见 [shared/API.md](../shared/API.md)，类型见 [shared/contracts.ts](../shared/contracts.ts)。当前 JSON 直接返回，错误为 `{error:{code,message}}`；写入后页面重新 GET /api/bootstrap。角色 hr/manager/employee，x-demo-actor 仅用于本地演示。现有候选人、员工、培训类型不具备订单产能含义。

新增端点使用 `/api/v1/order2people` 前缀，保持直返 JSON 和原错误基本结构，新增 errors/details 为可选字段。不改既有 bootstrap、Role、Position.headcount 或 Employee 的既有含义。新模型通过 employeeId 引用现有 active 员工，不将候选人、待入职或培训完成直接转为合格供给。生产主管和资格维护权限需明确授予 scope，不能靠新增请求头自报授权。

新增共享类型位于 shared/order2people.ts，不改变 shared/contracts.ts。新增数据保存在现有 SQLite business_state 的 order2people 聚合字段，首次写入时初始化，不清除旧业务数据。

## 通用规则

- ID 为不透明字符串，技能使用稳定 skillId，岗位使用 positionId，不以中文名称关联。版本为单调递增整数；schemaVersion 表示数据格式，engineVersion 表示算法及排序版本，不能互相代替。
- 时间为带时区偏移的 ISO 8601；场地显式 timeZone，阶段一 Asia/Shanghai；日期为 YYYY-MM-DD，区间 [start,end)。计算单位为整数人工秒、数量为正整数且声明 unit；不支持单位换算时阻断。
- 来源 SourceRef = `{sourceType,sourceId,revision,locator,confirmedBy,confirmedAt}`；AI 草稿原文位置必填，但 confirmedBy/At 可为 null。进入计算的业务输入须已人工确认。
- 所有写入携带 requestKey；更新携带 expectedRevision。相同键及同内容返回原记录，不重复写入；同键不同内容 409 IDEMPOTENCY_CONFLICT。版本不一致 409 REVISION_CONFLICT。服务端验证整次写入并事务提交。
- 记录创建者、时间、变更原因；输出保留快照，引用不能只指向会变动的最新记录。仅对快照无效的相关变更标记 stale。

## 模型（共享类型见 shared/order2people.ts）

| 模型 | 必需字段/约束 |
| --- | --- |
| OrderRevision | id, revision, siteId, productId, quantity, unit, window, routingId, routingRevision, source, confirmedBy/At；取消为新版本 |
| RoutingRevision | id, revision, productId, effectiveWindow, operations；每工序 operationId, positionId, requirements, secondsPerUnit, setupSecondsPerBatch, batchSize, source；人工工时标准必须有效 |
| SkillRequirement | skillId, minLevel, qualificationTypeIds[]；同一需求行所有条件同时满足 |
| EmployeeQualification | id, revision, employeeId, skillId, level, qualificationTypeId, status(verified/unverified/revoked), validWindow, source；证据不等于资格 |
| CapacityCalendar | id, revision, employeeId, siteId, date, workIntervals[], absenceIntervals[], source, qualificationsComplete, reservationsComplete；空班次须确认，不用缺失表示休息 |
| CapacityReservation | id, revision, employeeId, window, sourceOrderId/null, sourceOperationId/null, committedSeconds, source；阶段一要求占用区间与 committedSeconds 一致且可定位到日，无法解释则阻断 |
| OperationDemand | id, orderId/revision, operationId, date, window, quantity, batchCount, requirements[], positionId, demandSeconds, standardSource；由确认的每日分解生成 |
| PlanningScope | siteId, timeZone, window, completeForScope, confirmedBy/At；服务端 inputRevisions 和 inputSnapshot 枚举实际使用记录；必须列出相关在途订单与占用 |
| CalculationSnapshot | id, revision, schemaVersion, engineVersion, inputHash, scope, inputRevisions, createdAt, createdBy, completeness, missingItems[], assumptions[], status, lines[], allocations[], totals, confirmedBy/At |
| Allocation | employeeId, demandId, date, allocatedSeconds, eligibilityRefs[]；人员/日合计不超可用，需求合计不超需求 |
| GapLine | demandId, orderRef, operationId, positionId, requirements[], window, demandSeconds, allocatedSeconds, gapSeconds/null, excludedSupply[], competingDemandIds[], formula, sourceRefs[] |
| MissingItem | code, entityRef, fieldPath, reason, blocking, responsibleRole；记录缺什么及由谁补，不携带虚构默认值 |
| SkillBridgeDemand | schemaVersion, demandId, calculationId, inputHash, engineVersion, orderRef, operationId, positionId, requirements[], window, gapSeconds, sourceRefs[], assumptions[], confirmedBy/At；仅传需求 |

CalculationSnapshot.status = blocked / calculated / confirmed / stale；completeness = complete / incomplete。blocked 时 totals.gapSeconds、行 gapSeconds 和 referencePeople 均为 null；未知不能编码成 0。stale 保留历史数值但明确不可执行。Allocation 仅分析用途，不创建 CapacityReservation。

## 新端点与职责

下表路径均相对于 `/api/v1/order2people`。P0 数据读写支持人工录入；每个响应含实体 id/revision，列表为 `{items:[],nextCursor:null|string}`。默认返回全部本地演示记录；传 limit 正整数及 cursor 数字偏移可分页。calendars/reservations 支持 from/to 上海日期过滤，to 包含当天。确认范围的责任人与时间由服务端当前 actor 记录。

| 方法/路径 | 请求 | 成功响应 | 权限 |
| --- | --- | --- | --- |
| POST /orders | OrderRevision 业务字段 + requestKey | 201 OrderRevision | 所属场地主管 |
| GET /orders?siteId=&cursor= | 场地及分页 | 200 列表 | 主管/HR 场地授权 |
| GET /orders/:id | — | 200 最新 OrderRevision | 同上 |
| PATCH /orders/:id | expectedRevision, patch, reason, requestKey | 200 新版本 | 主管 |
| POST /routings | RoutingRevision + requestKey | 201 版本记录 | 工艺维护授权 |
| GET /routings/:id?revision= | 可选固定版本 | 200 版本记录 | 主管/HR/维护者 |
| POST /qualifications | EmployeeQualification + requestKey | 201 版本记录 | 资格维护授权 |
| GET /qualifications?siteId=&cursor= | 范围过滤 | 200 列表 | HR/授权维护者 |
| POST /calendars | CapacityCalendar + requestKey | 201 版本记录 | 主管/日历维护授权 |
| GET /calendars?siteId=&from=&to=&cursor= | 范围过滤 | 200 列表 | HR/主管 |
| POST /reservations | CapacityReservation + requestKey | 201 版本记录 | 主管 |
| GET /reservations?siteId=&from=&to=&cursor= | 范围过滤 | 200 列表 | HR/主管 |
| PATCH /routings/:id、/qualifications/:id、/calendars/:id、/reservations/:id | expectedRevision, patch, reason, requestKey | 200 新版本；旧结果失效 | 相应写权限 |
| POST /calculations | scope、dailyDemands、expectedInputRevisions、requestKey | 201 CalculationSnapshot，可能 blocked | HR/主管 |
| GET /calculations/:id | — | 200 快照及当前 stale 状态 | HR/主管场地授权 |
| POST /calculations/:id/confirm | expectedRevision, expectedInputHash, requestKey | 200 confirmed 快照 | HR |
| GET /calculations/:id/skillbridge-demands | — | 200 `{schemaVersion,calculationId,demands:[]}` | HR |
| POST /demo/reset | requestKey | 200 `{scope,dailyDemands,message}`，样例以新版本恢复，其他记录和历史保留 | HR |
| GET /calculations | — | 200 快照列表（含当前 stale 状态） | HR/主管 |
| POST /extractions（P1，未实现） | text, sourceRef, requestKey | 201 `{id,draft,extractedFields:[{path,value,sourceLocator,confidence}],missingItems}` | 主管/HR |

订单和占用 status 为 active/cancelled（省略视为 active）；资格状态 verified/unverified/revoked。取消、撤销均创建新版本，禁止物理删除历史。dailyDemands 包含每日数量、批次及窗口，引擎重算 demandSeconds，不信任客户端传入工时。跨日总数量必须与订单确认数量及工艺口径一致，准备批次不能跨日重复计入。

确认与导出需原子检查所有输入版本仍然有效。confirmed 且 complete 且非 stale 才可导出；同一快照和需求行导出 ID 稳定，不重复生成下游任务。零缺口导出 demands=[]，不虚构需求。

## 示例：完整快照中的一条缺口

以下只展示 GapLine 核心字段，ID 和数值均为验收示例，不是当前数据。

```json
{
  "demandId": "demand-example-1",
  "orderRef": {"id": "order-example", "revision": 1},
  "operationId": "inspect",
  "positionId": "quality-inspector",
  "requirements": [{"skillId": "inspection", "minLevel": 2, "qualificationTypeIds": ["quality-auth"]}],
  "window": {"start": "2026-11-02T08:00:00+08:00", "end": "2026-11-02T18:00:00+08:00"},
  "demandSeconds": 36000,
  "allocatedSeconds": 28800,
  "gapSeconds": 7200,
  "referencePeople": null,
  "formula": "100 * 360 + 0 = 36000",
  "sourceRefs": [{"sourceType": "routing", "sourceId": "route-example", "revision": 1, "locator": "operations.inspect", "confirmedBy": "actor-example", "confirmedAt": "2026-10-31T12:00:00+08:00"}]
}
```

## 错误与下游边界

400 INVALID_INPUT（字段类型/单位/窗口）、403 FORBIDDEN、404 NOT_FOUND、409 REVISION_CONFLICT / IDEMPOTENCY_CONFLICT / STALE_RESULT / RESULT_NOT_EXPORTABLE、500 INTERNAL_ERROR。错误形状兼容旧版，可新增 `{error:{code,message,details:[{fieldPath,reason}]}}`。业务资料不足返回成功保存的 blocked 快照及 MissingItem，不伪装成服务错误。未认证 401 在未来正式认证接入后使用；现有演示不能冒充生产认证。

SkillBridge 只接收确认的能力需求及期限，不默认获取员工姓名或敏感证据；未来返回 `{demandId,proposalId,status,evidenceRefs}` 建议，须单独审核接口。Graph 复用 skillId/qualificationTypeId；Simulator 记录 scenarioId 和基准快照；Agent 引用 demandId、授权和执行反馈。当前不新增这些消费接口，不把导出称为 SkillBridge 已接通。

## 演示权限与范围

服务端将 actor-hr 和 actor-manager 明确授予 demo 场地的读取、生产输入、工艺与资格维护及计算权限；HR 同时承担演示数据维护者职责，主管在本演示中兼任工艺/资格维护者。其他 actor 一律 403，不能通过客户端场地头扩权。确认、导出和样例恢复仅 HR。此为固定演示授权，不是真实登录或生产安全实现。

P0 联合计算使用 demo 场地完整聚合中的全部订单、人员档案和日历；用户须提供能够涵盖这些订单的分析窗口、逐日数量及批次，不能漏掉在途订单。现有 active 员工须补全日历与资格完整性，未知不能被排除为零。范围 refs 由 inputRevisions/inputSnapshot 记录，客户端不能挑选部分员工获得虚增供给。未引用的工艺不会单独使快照过期；被引用工艺、订单、资格、日历、占用或 active 员工身份/状态变化会使结果过期。

整数秒最大流在日内按工作、占用和需求窗口端点分段，保证不同执行窗口不会借用窗口外容量。同日同一员工分配总和受共享容量约束。资格仍需覆盖整条需求窗口；中途失效且未精确拆分时 blocked。批量存在时逐日批次须为 ceil(当日数量 / batchSize)，避免重复行人为增加批次；无批量时批次是人工确认值。没有额外提供人力当量的计算口径，referencePeople 始终 null。

未知标准允许保存 null，计算产生 blocked；格式错误为 400。输入 source 均须人工确认。sourceType=demo 为虚构样例，manual 为人工录入；没有真实模型或 AI 解析端点。计算不产生任何排班、招聘或培训写入。

## 契约变更记录

| 日期 | 版本 | 变更 | 影响方 | 确认状态 |
| --- | --- | --- | --- | --- |
| 2026-10-31 | 草案 v0.1 | 建议新增 Order2People 模型、版本 API、需求输出 | 数据/引擎/API/UI/集成负责人及未来 SkillBridge | 待用户审核，尚未通知具体开发者、未实施 |

破坏性变更必须记录字段、迁移、消费者、批准人和兼容期；实际文件和接口路径在 M0 冻结后方可认领实施。

| 2026-10-31 | v1.0 | 实现端点、共享类型、日历完整性字段、演示权限、样例恢复和不可执行状态；P1 未实现 | Order2People UI/API 与后续 SkillBridge | 用户 Goal 授权实施；新增接口不改变 HR-V2 消费者，团队通过 PR 复核 |

## SkillBridge 接口（第二阶段，已实现）

前缀 `/api/v1/skillbridge`。类型见 `shared/skillbridge.ts`，实现见 `server/skillbridge-api.mjs`、`server/skillbridge-engine.mjs`。错误形状沿用 `{error:{code,message}}`。写操作须带 `requestKey`（幂等）。仅 actor-hr、actor-manager 可访问，其他身份 403；此为固定演示授权，不是生产认证。

| 端点 | 请求 | 成功响应 | 权限 |
| --- | --- | --- | --- |
| GET /cases?calculationId= | — | 200 `{items:SkillBridgeCase[],nextCursor:null}`；上游已过期的记录实时返回 `status=demand_stale` | HR/主管 |
| GET /cases/:id | — | 200 SkillBridgeCase（同样实时判定 demand_stale） | HR/主管 |
| GET /cases/:id/candidates | — | 200 `{caseId,candidates:InternalCandidate[]}` | HR/主管 |
| POST /cases | calculationId, demandId（`<calculationId>:<demandId>`）, requestKey | 201 SkillBridgeCase，含候选人与三类路径草稿；同一需求重复发起返回已有记录 | HR |
| PATCH /proposals/:id/review | decision（hr_approved/hr_rejected）, note（必填）, expectedRevision, requestKey | 200 新版本方案，记录审核人、时间、说明，保留历史 | HR |
| POST /demo/reset | requestKey | 200 `{employeeId,message}`；新增带"演示虚构"标记的相近技能员工、未核验资格和日历，以新版本写入，不覆盖其他记录 | HR |

规则：
- 发起分析时服务端重新读取 Order2People 计算记录，仅接受 confirmed、complete 且非 stale 的结果，且该需求行缺口大于 0；否则 409 RESULT_NOT_EXPORTABLE（不信任客户端传入的需求内容）。
- 候选人分三类：qualified_verified、potential_transferable、insufficient_evidence。无任何证据的员工不入选；培训完成或简历关键词不会成为正式资格；相近技能只给出"待核实"及补齐动作。已被占用的容量不重复提供。
- 每个缺口始终给出内部调配、内部培养、外部招聘三类路径的可解释建议及风险和未知项；方案不代表承诺。
- 审核为人工决定。SkillBridge 不写入 Order2People 数据、不创建培训任务、不修改资格、不自动批准；上游结果过期后案例变为 demand_stale，仅供历史查看，不再允许审核。
- 演示员工在 `isDemoFixture` 中明确标记。

`POST /demo/reset` 会新增一名在职演示员工，按契约使既有 Order2People 计算结果过期，须重新计算并确认。

| 日期 | 版本 | 变更 | 影响方 | 确认状态 |
| --- | --- | --- | --- | --- |
| 2026-10-31 | SkillBridge v1.0 | 新增 `/api/v1/skillbridge/*`；向后兼容，不改动既有端点语义 | Order2People（只读被消费）、招聘与培训页面（仅导航跳转） | 随 PR 提交，待团队复核；未向外部发送消息 |

