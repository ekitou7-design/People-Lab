# 共享数据模型与 API 契约

状态：建议契约 v0.1，待审核、未实现。不得据此宣称新增端点已可调用。

## 当前实现与兼容原则

现有 API 见 [shared/API.md](../shared/API.md)，类型见 [shared/contracts.ts](../shared/contracts.ts)。当前 JSON 直接返回，错误为 `{error:{code,message}}`；写入后页面重新 GET /api/bootstrap。角色 hr/manager/employee，x-demo-actor 仅用于本地演示。现有候选人、员工、培训类型不具备订单产能含义。

新增建议使用 `/api/v1/order2people` 前缀，保持直返 JSON 和原错误基本结构，新增 errors/details 为可选字段。不改既有 bootstrap、Role、Position.headcount 或 Employee 的既有含义。新模型通过 employeeId 引用现有 active 员工，不将候选人、待入职或培训完成直接转为合格供给。生产主管和资格维护权限需明确授予 scope，不能靠新增请求头自报授权。

本轮不修改 shared/contracts.ts、shared/API.md 或数据库。后续实施时此文档与实际共享类型、运行校验及契约测试必须同 PR 同步。

## 通用规则

- ID 为不透明字符串，技能使用稳定 skillId，岗位使用 positionId，不以中文名称关联。版本为单调递增整数；schemaVersion 表示数据格式，engineVersion 表示算法及排序版本，不能互相代替。
- 时间为带时区偏移的 ISO 8601；场地显式 timeZone，阶段一 Asia/Shanghai；日期为 YYYY-MM-DD，区间 [start,end)。计算单位为整数人工秒、数量为正整数且声明 unit；不支持单位换算时阻断。
- 来源 SourceRef = `{sourceType,sourceId,revision,locator,confirmedBy,confirmedAt}`；AI 草稿原文位置必填，但 confirmedBy/At 可为 null。进入计算的业务输入须已人工确认。
- 所有写入携带 requestKey；更新携带 expectedRevision。相同键及同内容返回原记录，不重复写入；同键不同内容 409 IDEMPOTENCY_CONFLICT。版本不一致 409 REVISION_CONFLICT。服务端验证整次写入并事务提交。
- 记录创建者、时间、变更原因；输出保留快照，引用不能只指向会变动的最新记录。仅对快照无效的相关变更标记 stale。

## 模型（建议，不是现有 TypeScript 接口）

| 模型 | 必需字段/约束 |
| --- | --- |
| OrderRevision | id, revision, siteId, productId, quantity, unit, window, routingId, routingRevision, source, confirmedBy/At；取消为新版本 |
| RoutingRevision | id, revision, productId, effectiveWindow, operations；每工序 operationId, positionId, requirements, secondsPerUnit, setupSecondsPerBatch, batchSize, source；人工工时标准必须有效 |
| SkillRequirement | skillId, minLevel, qualificationTypeIds[]；同一需求行所有条件同时满足 |
| EmployeeQualification | id, revision, employeeId, skillId, level, qualificationTypeId, status(verified/unverified/revoked), validWindow, source；证据不等于资格 |
| CapacityCalendar | id, revision, employeeId, siteId, date, workIntervals[], absenceIntervals[], source；空班次须确认，不用缺失表示休息 |
| CapacityReservation | id, revision, employeeId, window, sourceOrderId/null, sourceOperationId/null, committedSeconds, source；阶段一要求占用区间与 committedSeconds 一致且可定位到日，无法解释则阻断 |
| OperationDemand | id, orderId/revision, operationId, date, window, quantity, batchCount, requirements[], positionId, demandSeconds, standardSource；由确认的每日分解生成 |
| PlanningScope | siteId, window, orderRefs[], calendarRefs[], qualificationRefs[], reservationRefs[], completeForScope, confirmedBy/At；必须列出相关在途订单与占用 |
| CalculationSnapshot | id, revision, schemaVersion, engineVersion, inputHash, scope, inputRevisions, createdAt, createdBy, completeness, missingItems[], assumptions[], status, lines[], allocations[], totals, confirmedBy/At |
| Allocation | employeeId, demandId, date, allocatedSeconds, eligibilityRefs[]；人员/日合计不超可用，需求合计不超需求 |
| GapLine | demandId, orderRef, operationId, positionId, requirements[], window, demandSeconds, allocatedSeconds, gapSeconds/null, excludedSupply[], competingDemandIds[], formula, sourceRefs[] |
| MissingItem | code, entityRef, fieldPath, reason, blocking, responsibleRole；记录缺什么及由谁补，不携带虚构默认值 |
| SkillBridgeDemand | schemaVersion, demandId, calculationId, inputHash, engineVersion, orderRef, operationId, positionId, requirements[], window, gapSeconds, sourceRefs[], assumptions[], confirmedBy/At；仅传需求 |

CalculationSnapshot.status = blocked / calculated / confirmed / stale；completeness = complete / incomplete。blocked 时 totals.gapSeconds、行 gapSeconds 和 referencePeople 均为 null；未知不能编码成 0。stale 保留历史数值但明确不可执行。Allocation 仅分析用途，不创建 CapacityReservation。

## 新端点建议与职责

下表路径均相对于 `/api/v1/order2people`。P0 数据读写支持人工录入；每个响应含实体 id/revision，列表为 `{items:[],nextCursor:null|string}`。

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
| POST /extractions（P1） | text, sourceRef, requestKey | 201 `{id,draft,extractedFields:[{path,value,sourceLocator,confidence}],missingItems}` | 主管/HR |

取消订单、撤销资格或占用通过新版本 status 字段表达，禁止物理删除历史；新增模型允许 active/cancelled 等领域状态时须先冻结枚举。dailyDemands 包含每日数量、批次及窗口，引擎重算 demandSeconds，不信任客户端传入工时。跨日总数量必须与订单确认数量及工艺口径一致，准备批次不能跨日重复计入。

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

## 契约变更记录

| 日期 | 版本 | 变更 | 影响方 | 确认状态 |
| --- | --- | --- | --- | --- |
| 2026-10-31 | 草案 v0.1 | 建议新增 Order2People 模型、版本 API、需求输出 | 数据/引擎/API/UI/集成负责人及未来 SkillBridge | 待用户审核，尚未通知具体开发者、未实施 |

破坏性变更必须记录字段、迁移、消费者、批准人和兼容期；实际文件和接口路径在 M0 冻结后方可认领实施。
