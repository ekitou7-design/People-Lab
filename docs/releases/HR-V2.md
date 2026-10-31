# HR-V2 · HRFlow AI 协同工作台

> 历史记录：下文仅对应当时版本与验证，不代表当前交付。最新见[文档导航](../README.md)、[评委上手](../JUDGES-QUICKSTART.md)及[本轮验证](../VALIDATION.md)。


HR-V2 将招聘、员工服务和岗位培养组织为围绕当前人员与任务的协同工作区。招聘审阅同时显示能力判断与简历原文，请假在同一办理卡中完成填写、预览和提交，知识引用返回后保留草稿。沿用 Express 与 SQLite 业务层，录用、入职、审批、余额、培训和工单仍由后端校验并保存。

## 本版变化

- 工作台采用紧凑指标、人员待办、可筛选招聘阶段及当前事项助手；摘要和入口随选中任务联动。
- 招聘采用候选人、能力证据和简历原文三栏布局，能力与候选人切换同步定位、高亮原句；支持比较及 HR 人工录用决定。
- 入职围绕单一员工展示核验清单、主管和培养衔接；确认入职后一次性创建岗位任务。
- 员工服务采用对话与办理双区布局，请假制度依据在填写、预览、提交结果中持续可见；知识库往返保留未提交内容。
- 培训连接 SOP、情境演练、反馈与历史；首次失败与关联复练结果分别保留，复练通过更新原任务。
- 知识库提供目录、搜索、版本、章节定位、引用高亮及返回原任务。
- 适配 1440px 桌面、1024px 平板及 390px 手机；辅助文字不低于 12px，保留演示身份和规则模拟标识。
- 前端拆分为六个页面和共享工作区，移除旧叠加样式；增加写入成功后同步失败恢复、慢响应身份保护及筛选状态回退。

## 设计与截图

[可编辑 Figma Design](https://www.figma.com/design/EBXWvieYKTM1od7pnZOrwS?node-id=6-1230) 含基础组件、六个桌面模块、平板工作台、两张手机画面和关键操作状态，共 16 个画框、104 个原型连接。手机原型当前进入桌面分步状态，尚未另建独立手机分步画框；本地 Demo 手机业务已实际验证。

[设计交付说明](https://github.com/ekitou7-design/People-Lab/blob/HR-V2/docs/design/README.md) · [14 张界面截图](https://github.com/ekitou7-design/People-Lab/tree/HR-V2/docs/images/v2)

## 验证

- `npm run build`：TypeScript 检查与生产构建通过。
- `npm test`：14/14 接口与状态测试通过。
- `npm run test:e2e`：52/52 浏览器检查通过，保留原 21 项并新增 31 项，生成 14 张截图。
- `npm run test:audit`：12/12 问答场景及 4/4 未开放能力边界检查通过。
- 完整流程无未捕获浏览器异常、无外部资源请求；测试使用独立临时数据库。
- 本机改版前后及服务重启后的业务摘要一致，已有业务记录保留，未通过重置执行迁移。

[验收记录](https://github.com/ekitou7-design/People-Lab/blob/HR-V2/docs/UI-v2验收记录.md) · [浏览器报告](https://github.com/ekitou7-design/People-Lab/blob/HR-V2/docs/test-reports/HR-V2/e2e-report.json) · [问答报告](https://github.com/ekitou7-design/People-Lab/blob/HR-V2/docs/test-reports/HR-V2/assistant-audit-replay.json)

## 运行

下载本版本源码并解压，Windows 双击 `启动HRFlow.cmd`；也可以执行：

```sh
npm ci
npm run build
npm start
```

访问 <http://127.0.0.1:3220>。需要 Node.js 22.13 或更新版本，SQLite 使用 Node 内置能力。初次安装和构建完成后可离线演示，无需模型密钥。停止请使用 `停止HRFlow.cmd`。

## 当前范围

本版本使用虚构资料和确定性规则模拟 AI，未接入真实模型、任意简历上传解析、向量检索、正式账号认证或外部 HR 系统。仓库不包含本机业务数据库、备份、日志、模型凭据、依赖目录和 Figma 会话 ID。原 HR-V1 标签与发布保持可用。
