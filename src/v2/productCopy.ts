// Display names for the existing demo catalog. Unknown IDs stay visible; never infer a name.
const names: Record<string, string> = {
  inspect: '质量检验', 'pos-quality': '质量检验员', inspection: '检验与记录', 'quality-auth': '质量检验资格',
};
export const businessLabel = (id: string) => names[id] || id;

// Presentation only: stored snapshots, API messages and rules retain their original values.
const phrases: [string, string][] = [
  ['该员工资格已验证，但当前窗口可用容量为 0，调配会影响原有任务，需主管确认影响', '员工资格符合要求，但当前窗口可新增分配工时为 0，无法用于补缺口。须先维护真实供给数据，再重新计算并确认。'],
  ['由主管审批后再纳入正式供给', '经正式资格核验，并确认有效期和可用工时后，再计入合格供给'],
  ['在人员排班中落实调配', '核实实际调配区间后，由 HR 执行方案'],
  ['已存在至少一条可靠的内部调配路径', '存在资格和增量工时匹配的内部人选，实际调配区间仍待核验'],
  ['资格或增量容量不足；原分配不能再次用于补缺口', '资格或可新增分配工时不足，无法调配。原计算已分配工时不能重复用于补缺口。'],
  ['须补充可核验的实际调配区间及目标订单；当前模型不能安全表达部分时段承诺', '无法创建调配占用：须核实实际调配区间和目标订单，当前模型不支持核验部分时段承诺。'],
  ['Asia/Shanghai 自然日；日桶内人工工时可切分', '按上海时间逐日计算，假设同一日内人工工时可以拆分。'],
  ['按人员 ID、需求 ID 稳定排序最大流；分配不预订产能', '按人员和需求编号固定排序分配工时；计算不预订工时。'],
  ['日历、占用或资格完整性尚未确认', '班次、任务占用或资格资料尚未确认完整，请补全并确认。'],
  ['结果版本冲突', '结果已更新，请刷新后重新核对。'],
  ['审核结果须为 hr_approved 或 hr_rejected', '请选择批准或拒绝。'],
  ['状态须为 draft/open/closed', '请选择草稿、招聘中或已关闭。'],
  ['窗口净容量', '窗口净可用工时'], ['未承诺增量', '可新增分配工时'], ['当日可用容量', '当日可新增分配工时'],
  ['可用容量', '可用工时'], ['容量数据', '工时数据'], ['腾出容量', '腾出工时'],
  ['已验证', '已核验'], ['未验证', '待核验'],
];
export function displayCopy(text: string): string {
  for (const [before, after] of phrases) text = text.replaceAll(before, after);
  return text.replace(/\b(inspect|pos-quality|inspection|quality-auth)\b/g, businessLabel);
}
