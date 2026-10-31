import express from 'express';
import { order2peopleRouter } from './order2people-api.mjs';
import { skillbridgeRouter } from './skillbridge-api.mjs';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { baseActors, position, knowledge, trainingScenario } from './catalog.mjs';
import { openStore } from './store.mjs';

export const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const validPeriods = ['morning', 'afternoon', 'full'];
const periodNames = { morning: '上午', afternoon: '下午', full: '全天' };

function problem(status, code, message) {
  return Object.assign(new Error(message), { status, code });
}
function requireThat(condition, status, code, message) {
  if (!condition) throw problem(status, code, message);
}
function textField(value, name, { optional = false, max = 2000 } = {}) {
  if (optional && (value === undefined || value === null)) return '';
  requireThat(typeof value === 'string', 400, 'INVALID_INPUT', `${name}必须是文字。`);
  const result = value.trim();
  requireThat((optional || result.length > 0) && result.length <= max, 400, 'INVALID_INPUT', `${name}不能为空且不能超过 ${max} 个字符。`);
  return result;
}
function bodyObject(req) {
  requireThat(req.body && typeof req.body === 'object' && !Array.isArray(req.body), 400, 'INVALID_INPUT', '请提交有效的 JSON 对象。');
  return req.body;
}
function dateOnly(value, label = '日期') {
  requireThat(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value), 400, 'INVALID_DATE', `${label}请使用 YYYY-MM-DD 格式。`);
  const date = new Date(`${value}T12:00:00Z`);
  requireThat(!Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value, 400, 'INVALID_DATE', `${label}不是有效日期。`);
  return value;
}
export function shanghaiToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const get = (type) => parts.find((part) => part.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
function addDays(date, days) {
  const result = new Date(`${date}T12:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}
function isWeekend(date) { return [0, 6].includes(new Date(`${date}T12:00:00Z`).getUTCDay()); }
export function nextWorkday(today = shanghaiToday()) {
  let date = addDays(today, 1);
  while (isWeekend(date)) date = addDays(date, 1);
  return date;
}
function allActors(state) {
  return [...baseActors, ...state.employees.filter((employee) => employee.status === 'active').map((employee) => ({
    id: employee.id, name: employee.name, role: 'employee', title: employee.positionTitle, employeeId: employee.id,
  }))];
}
function role(actor, allowed) {
  requireThat(allowed.includes(actor.role), 403, 'FORBIDDEN', '当前演示身份没有执行此操作的权限。');
}
function activeEmployee(state, actor) {
  role(actor, ['employee']);
  const employee = state.employees.find((item) => item.id === actor.employeeId && item.status === 'active');
  requireThat(employee, 403, 'EMPLOYEE_INACTIVE', '请先由 HR 确认正式入职，再使用员工服务。');
  return employee;
}
function findRecord(collection, id, label) {
  const record = collection.find((item) => item.id === id);
  requireThat(record, 404, 'NOT_FOUND', `未找到${label}。`);
  return record;
}
function ownTraining(state, actor, id) {
  const employee = activeEmployee(state, actor);
  const task = findRecord(state.trainingTasks, id, '培训任务');
  requireThat(task.employeeId === employee.id, 403, 'FORBIDDEN', '只能操作自己的培训任务。');
  return { employee, task };
}
function event(state, actor, type, title, detail, targetId, employeeId) {
  const record = { id: `evt-${randomUUID()}`, type, title, detail, actorName: actor.name, targetId, createdAt: new Date().toISOString() };
  if (employeeId) record.employeeId = employeeId;
  state.events.unshift(record);
  return record;
}
function getMetrics(state) {
  const roots = state.trainingTasks.filter((task) => !task.parentTaskId);
  return {
    candidateCount: state.candidates.length,
    hiredCount: state.employees.length,
    activeEmployees: state.employees.filter((employee) => employee.status === 'active').length,
    pendingOnboarding: state.onboardings.filter((onboarding) => onboarding.status === 'pending').length,
    pendingLeaves: state.leaves.filter((leave) => leave.status === 'pending').length,
    approvedLeaves: state.leaves.filter((leave) => leave.status === 'approved').length,
    rootTrainingCount: roots.length,
    completedTraining: roots.filter((task) => task.status === 'completed').length,
    retryTraining: roots.filter((task) => task.status === 'needs_retry').length,
    openTickets: state.tickets.filter((ticket) => ticket.status === 'open').length,
  };
}
function bootstrap(state, actor) {
  const employees = state.employees.filter((employee) => actor.role === 'hr'
    || (actor.role === 'manager' && employee.managerId === actor.id)
    || (actor.role === 'employee' && employee.id === actor.employeeId));
  const visibleIds = new Set(employees.map((employee) => employee.id));
  const visible = (items) => items.filter((item) => actor.role === 'hr' || visibleIds.has(item.employeeId));
  const view = {
    candidates: actor.role === 'hr' ? state.candidates : [], employees,
    onboardings: visible(state.onboardings), leaves: visible(state.leaves),
    trainingTasks: visible(state.trainingTasks), tickets: visible(state.tickets),
    messages: visible(state.messages), events: visible(state.events),
  };
  return {
    mode: 'demo', actors: allActors(state), actor,
    today: shanghaiToday(), suggestedLeaveDate: nextWorkday(),
    position, ...view, knowledge, metrics: getMetrics(view), trainingScenario,
  };
}
function citation(knowledgeId, sectionId) {
  const document = knowledge.find((item) => item.id === knowledgeId);
  const section = document.sections.find((item) => item.id === sectionId);
  return { knowledgeId, sectionId, quote: section.content };
}
function extractLeaveDetails(message, today) {
  let date;
  const explicit = message.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (explicit) {
    try { date = dateOnly(explicit[1]); } catch { /* Ask for a corrected date below. */ }
  } else if (message.includes('后天')) date = addDays(today, 2);
  else if (message.includes('明天')) date = addDays(today, 1);
  else if (message.includes('今天')) date = today;
  else {
    const weekday = message.match(/(下周|本周|这周|周|星期)([一二三四五六日天])/);
    if (weekday) {
      const desired = '一二三四五六日'.indexOf(weekday[2] === '天' ? '日' : weekday[2]);
      const current = (new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7;
      let offset = desired - current;
      if (weekday[1] === '下周') offset += 7;
      else if (offset < 0 && !['本周', '这周'].includes(weekday[1])) offset += 7;
      date = addDays(today, offset);
    }
  }
  let period;
  if (/上午|早上/.test(message)) period = 'morning';
  else if (/下午/.test(message)) period = 'afternoon';
  else if (/全天|整天|一天/.test(message)) period = 'full';
  return { ...(date ? { date } : {}), ...(period ? { period } : {}) };
}
function handoffReply(state, employee, message, explanation = '现有演示知识库没有足够依据回答这个问题。') {
  const normalized = message.replace(/\s+/g, ' ').trim();
  let ticket = state.tickets.find((item) => item.employeeId === employee.id && item.question === normalized);
  if (!ticket) {
    ticket = { id: `ticket-${randomUUID()}`, employeeId: employee.id, employeeName: employee.name, question: normalized, status: 'open', response: '', createdAt: new Date().toISOString() };
    state.tickets.unshift(ticket);
    event(state, { name: employee.name }, 'ticket_created', '咨询已转交 HR', `知识库暂无可靠依据：${normalized}`, ticket.id, employee.id);
  }
  return {
    intent: 'handoff', content: ticket.status === 'resolved'
      ? `这条问题已有 HR 答复：${ticket.response}。你可在人工工单中查看记录。`
      : `${explanation}我已保留上下文并转交 HR，工单编号 ${ticket.id.slice(-8)}。相同问题会沿用已有工单。`,
    citations: [],
  };
}
function trainingReply(state, employee) {
  const roots = state.trainingTasks.filter((task) => task.employeeId === employee.id && !task.parentTaskId);
  return {
    intent: 'training', content: `你有 ${roots.length} 项岗位培训，其中 ${roots.filter((task) => task.status === 'completed').length} 项已完成。发现不合格品时，应先隔离标识，再记录证据、向质量主管上报并跟进复核闭环。你可以到“岗位培训”完成情境演练；模拟通过不等于真实操作资格。`,
    citations: [citation('sop-quality', 'sop-isolate'), citation('sop-quality', 'sop-record'), citation('sop-quality', 'sop-report'), citation('sop-quality', 'sop-followup'), citation('sop-quality', 'sop-assessment')],
  };
}
function buildReply(state, employee, message) {
  const today = shanghaiToday();
  const previous = state.messages.filter((item) => item.employeeId === employee.id && item.role === 'assistant').at(-1);
  const details = extractLeaveDetails(message, today);
  const trainingIntent = /培训|学习|课程|考核|测评|上岗|SOP|不合格|隔离|质量异常|尺寸异常|检验/.test(message);
  const balanceIntent = /余额|还剩|剩余|几天年假|多少天年假|假期额度/.test(message);
  const statusIntent = /进度|状态|批了吗|处理到哪|处理结果|我的申请/.test(message);
  const onboardingIntent = /入职|报到|新员工|新人|主管是谁/.test(message)
    || (previous?.intent === 'onboarding' && /材料|资料|合同/.test(message));
  const leaveNegated = /(?:不(?:想|要|需要|打算|准备|用)?|不是(?:要|想)?|暂不|暂时不|取消|撤回)(?:再)?(?:申请|办理)?(?:请假|休假|请年假|年假)/.test(message);
  // A denied action must not be revived by a previous leave-form conversation.
  if (leaveNegated && trainingIntent) return trainingReply(state, employee);
  const unsupportedLeave = message.match(/陪产假|产检假|病假|婚假|产假|育儿假|丧假|事假|调休|工伤假|护理假|探亲假|哺乳假/);
  if (unsupportedLeave) {
    return handoffReply(state, employee, message, `本 Demo 仅支持年假制度查询与办理，未配置${unsupportedLeave[0]}的制度或申请流程，不能套用年假表单。`);
  }
  if (leaveNegated && !onboardingIntent && !balanceIntent && !statusIntent) {
    return handoffReply(state, employee, message, '已理解你暂不办理请假。请说明需要查询的其他事项，或等待 HR 进一步确认。');
  }
  // Recognize this explicit two-topic combination without claiming general NLU.
  if (balanceIntent && trainingIntent) {
    return {
      intent: 'clarify', content: '这条消息同时涉及年假余额与岗位培训。本演示一次处理一类需求，请选择先问“我的年假余额是多少？”或“我的培训任务有哪些？”。',
      citations: [],
    };
  }
  const leaveFollowup = !leaveNegated && previous?.intent === 'leave' && previous.suggestedAction
    && (details.date || details.period || /请假|年假|半天|原因/.test(message));
  if (statusIntent) {
    const leaves = state.leaves.filter((leave) => leave.employeeId === employee.id);
    const tasks = state.trainingTasks.filter((task) => task.employeeId === employee.id && !task.parentTaskId);
    const statusName = { pending: '待审批', approved: '已批准', rejected: '已拒绝' };
    const list = leaves.length ? leaves.slice(0, 3).map((leave) => `${leave.date} ${periodNames[leave.period]}：${statusName[leave.status]}${leave.decisionReason ? `（${leave.decisionReason}）` : ''}`).join('；') : '暂无请假申请';
    return {
      intent: 'status', content: `你的办理进度：${list}。岗位培训已完成 ${tasks.filter((task) => task.status === 'completed').length}/${tasks.length} 项。以上来自当前演示业务记录。`,
      citations: [citation('policy-leave', 'leave-approval')],
    };
  }
  if (balanceIntent) {
    return {
      intent: 'policy', content: `你的当前可用年假为 ${employee.leaveBalance} 天（读取自演示员工档案）。待审批申请暂不扣减，批准时会重新校验余额；半天计 0.5 天，全天计 1 天。`,
      citations: [citation('policy-leave', 'leave-balance'), citation('policy-leave', 'leave-request')],
    };
  }
  if (!leaveNegated && (/请假|年假|休假/.test(message) || leaveFollowup)) {
    const prefill = { ...(leaveFollowup ? previous.suggestedAction.prefill : {}), ...details };
    let correction = '';
    if (prefill.date && (prefill.date < today || isWeekend(prefill.date))) {
      correction = '你提供的日期是过去日期或周末，请重新选择工作日。';
      delete prefill.date;
    }
    const missing = [];
    if (!prefill.date) missing.push('date');
    if (!prefill.period) missing.push('period');
    // Reasons are intentionally entered in the reviewable form, never inferred.
    missing.push('reason');
    const prompt = !prefill.date && !prefill.period ? '请告诉我具体日期，以及上午、下午还是全天。'
      : !prefill.date ? '还需要一个具体的工作日日期。'
      : !prefill.period ? '还需要确认上午、下午还是全天。'
      : `已为申请表补齐 ${prefill.date} ${periodNames[prefill.period]}，请在表单填写原因并确认提交。`;
    return {
      intent: 'leave', content: `${correction}当前可用年假 ${employee.leaveBalance} 天。本演示每次仅支持一个工作日，提交后由主管审批。${prompt}`,
      citations: [citation('policy-leave', 'leave-request'), citation('policy-leave', 'leave-approval')],
      suggestedAction: { type: 'leave_form', prefill, missing },
    };
  }
  if (onboardingIntent) {
    return {
      intent: 'onboarding', content: `你已正式入职${employee.department}，岗位为${employee.positionTitle}，主管是${employee.managerName}。演示入职项目包括资料核对、协议确认和入职说明；服务与培训均已开放。请勿在演示中提交真实身份证等敏感材料。`,
      citations: [citation('guide-onboarding', 'onboarding-materials'), citation('guide-onboarding', 'onboarding-activation')],
    };
  }
  if (trainingIntent) return trainingReply(state, employee);
  return handoffReply(state, employee, message);
}

export function createApp({ dataDir = join(projectRoot, 'data') } = {}) {
  const store = openStore(dataDir);
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '200kb' }));
  app.get('/api/health', (_req, res) => res.json({ app: 'hrflow-demo', status: 'ok', mode: 'demo', pid: process.pid, projectRoot }));
  const api = express.Router();
  api.use((req, _res, next) => {
    const actorId = req.get('x-demo-actor') || 'actor-hr';
    req.actor = allActors(store.read()).find((actor) => actor.id === actorId);
    requireThat(req.actor, 403, 'INVALID_ACTOR', '演示身份无效或员工尚未入职，请重新选择身份。');
    next();
  });
  api.get('/bootstrap', (req, res) => res.json(bootstrap(store.read(), req.actor)));

  api.post('/candidates/:id/stage', (req, res) => {
    role(req.actor, ['hr']);
    const { stage } = bodyObject(req);
    requireThat(['screening', 'interview', 'decision'].includes(stage), 400, 'INVALID_STAGE', '请选择有效的招聘阶段。');
    const result = store.transaction((state) => {
      const candidate = findRecord(state.candidates, req.params.id, '候选人');
      requireThat(candidate.stage !== 'hired', 409, 'ALREADY_HIRED', '已录用候选人的招聘阶段不能回退。');
      if (candidate.stage !== stage) {
        candidate.stage = stage;
        event(state, req.actor, 'candidate_stage', '招聘阶段已更新', `${candidate.name}进入${{ screening: '简历筛选', interview: '面试核实', decision: '人工决策' }[stage]}阶段。`, candidate.id);
      }
      return candidate;
    });
    res.json(result);
  });

  api.post('/candidates/:id/hire', (req, res) => {
    role(req.actor, ['hr']);
    const { confirmedNeeds = [] } = bodyObject(req);
    requireThat(Array.isArray(confirmedNeeds) && confirmedNeeds.every((id) => position.abilities.some((ability) => ability.id === id)), 400, 'INVALID_NEEDS', '培养需求必须来自已确认的岗位能力项。');
    const needs = [...new Set(confirmedNeeds)];
    const result = store.transaction((state) => {
      const candidate = findRecord(state.candidates, req.params.id, '候选人');
      const existing = state.employees.find((employee) => employee.candidateId === candidate.id);
      if (existing) return { employee: existing, onboarding: state.onboardings.find((item) => item.employeeId === existing.id) };
      const employeeId = `emp-${candidate.id.slice(5)}`;
      const employee = {
        id: employeeId, candidateId: candidate.id, name: candidate.name, initials: candidate.initials,
        department: position.department, positionId: position.id, positionTitle: position.title,
        managerId: 'actor-manager', managerName: baseActors.find((actor) => actor.id === 'actor-manager').name,
        status: 'pending', joinDate: shanghaiToday(), leaveBalance: 3, confirmedNeeds: needs,
      };
      const onboarding = {
        id: `onboard-${employeeId}`, employeeId, status: 'pending',
        items: [
          { id: 'identity', title: '身份与入职资料核对（仅记录状态）', done: false },
          { id: 'agreement', title: '入职协议确认', done: false },
          { id: 'orientation', title: '入职说明与主管交接', done: false },
        ],
      };
      candidate.stage = 'hired';
      state.employees.push(employee);
      state.onboardings.push(onboarding);
      event(state, req.actor, 'candidate_hired', '录用已确认 · 待入职', `${candidate.name}的待入职档案及核对清单已建立。已确认 ${needs.length} 项发展需求，未将简历缺失证据自动视为能力不足。`, onboarding.id, employeeId);
      return { employee, onboarding };
    });
    res.json(result);
  });

  api.patch('/onboardings/:id', (req, res) => {
    role(req.actor, ['hr']);
    const { items = [], joinDate } = bodyObject(req);
    requireThat(Array.isArray(items) && items.every((item) => item && typeof item.id === 'string' && typeof item.done === 'boolean'), 400, 'INVALID_ITEMS', '入职清单需提供项目编号与完成状态。');
    requireThat(new Set(items.map((item) => item.id)).size === items.length, 400, 'INVALID_ITEMS', '同一清单项目不能重复提交。');
    if (joinDate !== undefined) dateOnly(joinDate, '入职日期');
    const result = store.transaction((state) => {
      const onboarding = findRecord(state.onboardings, req.params.id, '入职记录');
      requireThat(onboarding.status !== 'completed', 409, 'ONBOARDING_COMPLETED', '已完成的入职记录不能再修改。');
      const employee = findRecord(state.employees, onboarding.employeeId, '员工档案');
      for (const item of items) findRecord(onboarding.items, item.id, '入职清单项目').done = item.done;
      if (joinDate !== undefined) employee.joinDate = joinDate;
      return onboarding;
    });
    res.json(result);
  });

  api.post('/onboardings/:id/complete', (req, res) => {
    role(req.actor, ['hr']);
    bodyObject(req);
    const result = store.transaction((state) => {
      const onboarding = findRecord(state.onboardings, req.params.id, '入职记录');
      const employee = findRecord(state.employees, onboarding.employeeId, '员工档案');
      if (onboarding.status === 'completed') return { employee, onboarding, trainingTasks: state.trainingTasks.filter((task) => task.employeeId === employee.id) };
      requireThat(onboarding.items.every((item) => item.done), 409, 'CHECKLIST_INCOMPLETE', '请先完成全部入职清单，再确认正式入职。');
      onboarding.status = 'completed';
      employee.status = 'active';
      const trainingTasks = [{
        id: `train-${employee.id}-mandatory`, employeeId: employee.id, kind: 'mandatory',
        title: '岗位必修 · 不合格品处置', description: '学习岗位演示 SOP，并通过隔离、记录、上报与跟进闭环的情境演练。',
        knowledgeId: 'sop-quality', status: 'not_started', attempts: [],
      }, ...employee.confirmedNeeds.map((abilityId) => {
        const ability = position.abilities.find((item) => item.id === abilityId);
        return {
          id: `train-${employee.id}-${abilityId}`, employeeId: employee.id, kind: 'development',
          title: `能力提升 · ${ability.name}`, description: `HR 已明确确认的发展需求：${ability.requirement}本 Demo 统一使用异常处置练习，仅验证隔离、记录、上报与跟进步骤；通过本练习不代表已验证图纸识读等全部岗位能力，后续仍需针对性考核。`,
          knowledgeId: 'sop-quality', status: 'not_started', attempts: [],
        };
      })];
      state.trainingTasks.push(...trainingTasks);
      event(state, req.actor, 'employee_joined', '员工已入职 · 培训已分配', `${employee.name}的员工服务已开放，自动创建 ${trainingTasks.length} 项岗位培训。`, onboarding.id, employee.id);
      return { employee, onboarding, trainingTasks };
    });
    res.json(result);
  });

  api.post('/assistant', (req, res) => {
    const body = bodyObject(req);
    const message = textField(body.message, '咨询内容');
    const requestKey = textField(body.requestKey, '操作编号', { max: 160 });
    const result = store.transaction((state) => {
      const employee = activeEmployee(state, req.actor);
      const reply = buildReply(state, employee, message);
      const now = new Date().toISOString();
      state.messages.push({ id: `msg-${randomUUID()}`, employeeId: employee.id, role: 'user', content: message, citations: [], createdAt: now });
      const assistant = { id: `msg-${randomUUID()}`, employeeId: employee.id, role: 'assistant', ...reply, createdAt: now };
      state.messages.push(assistant);
      return assistant;
    }, { actorId: req.actor.id, operation: 'assistant', key: requestKey, payload: { message } });
    res.json(result);
  });

  api.post('/leaves', (req, res) => {
    const body = bodyObject(req);
    const date = dateOnly(body.date);
    const period = body.period;
    requireThat(validPeriods.includes(period), 400, 'INVALID_PERIOD', '请选择上午、下午或全天。');
    const reason = textField(body.reason, '请假原因', { max: 500 });
    const requestKey = textField(body.requestKey, '操作编号', { max: 160 });
    const days = period === 'full' ? 1 : 0.5;
    const result = store.transaction((state) => {
      const employee = activeEmployee(state, req.actor);
      requireThat(date >= shanghaiToday(), 400, 'PAST_DATE', '不能申请过去日期的假期。');
      requireThat(!isWeekend(date), 400, 'NON_WORKING_DAY', '本演示只支持工作日请假，请重新选择日期。');
      requireThat(employee.leaveBalance >= days, 409, 'INSUFFICIENT_BALANCE', '当前可用年假不足，无法提交申请。');
      const overlaps = state.leaves.some((leave) => leave.employeeId === employee.id && leave.date === date && leave.status !== 'rejected' && (leave.period === period || leave.period === 'full' || period === 'full'));
      requireThat(!overlaps, 409, 'OVERLAPPING_LEAVE', '该日期时段已有待审批或已批准申请，请先查看已有记录。');
      const leave = { id: `leave-${randomUUID()}`, employeeId: employee.id, employeeName: employee.name, date, period, days, reason, status: 'pending', decisionReason: '', createdAt: new Date().toISOString(), decidedAt: null };
      state.leaves.unshift(leave);
      event(state, req.actor, 'leave_submitted', '请假申请已提交', `${employee.name}申请 ${date} ${periodNames[period]}，共 ${days} 天，等待主管审批。`, leave.id, employee.id);
      return leave;
    }, { actorId: req.actor.id, operation: 'leave-create', key: requestKey, payload: { date, period, reason } });
    res.json(result);
  });

  api.post('/leaves/:id/decision', (req, res) => {
    role(req.actor, ['hr', 'manager']);
    const { decision, reason: inputReason } = bodyObject(req);
    requireThat(['approved', 'rejected'].includes(decision), 400, 'INVALID_DECISION', '请选择批准或拒绝。');
    const reason = textField(inputReason, '审批意见', { optional: decision !== 'rejected', max: 500 });
    const result = store.transaction((state) => {
      const leave = findRecord(state.leaves, req.params.id, '请假申请');
      const employee = findRecord(state.employees, leave.employeeId, '员工档案');
      requireThat(req.actor.role === 'hr' || employee.managerId === req.actor.id, 403, 'FORBIDDEN', '只能审批所属团队员工的申请。');
      if (leave.status === decision) return leave;
      requireThat(leave.status === 'pending', 409, 'DECISION_FINAL', '该申请已处理，不能重复更改审批结果。');
      if (decision === 'approved') {
        requireThat(employee.leaveBalance >= leave.days, 409, 'INSUFFICIENT_BALANCE', '审批时可用年假已不足，申请仍保持待审批状态。');
        employee.leaveBalance = Math.round((employee.leaveBalance - leave.days) * 2) / 2;
      }
      leave.status = decision;
      leave.decisionReason = reason;
      leave.decidedAt = new Date().toISOString();
      event(state, req.actor, 'leave_decided', decision === 'approved' ? '请假已批准' : '请假已拒绝', `${employee.name}的 ${leave.date} ${periodNames[leave.period]}申请${decision === 'approved' ? '已批准' : `已拒绝：${reason}`}。`, leave.id, employee.id);
      return leave;
    });
    res.json(result);
  });

  api.post('/training/:id/start', (req, res) => {
    bodyObject(req);
    const result = store.transaction((state) => {
      const { task, employee } = ownTraining(state, req.actor, req.params.id);
      if (task.status === 'not_started' || (task.kind === 'retry' && task.status === 'needs_retry')) {
        task.status = 'learning';
        event(state, req.actor, 'training_started', '岗位学习已开始', `${employee.name}开始“${task.title}”。`, task.id, employee.id);
      }
      return task;
    });
    res.json(result);
  });

  api.post('/training/:id/submit', (req, res) => {
    const body = bodyObject(req);
    requireThat(Array.isArray(body.selectedSteps) && body.selectedSteps.every((id) => trainingScenario.steps.some((step) => step.id === id)), 400, 'INVALID_STEPS', '请提交有效的演练步骤选项。');
    const selectedSteps = [...new Set(body.selectedSteps)];
    const note = textField(body.note, '交接说明', { optional: true, max: 2000 });
    const requestKey = textField(body.requestKey, '操作编号', { max: 160 });
    const result = store.transaction((state) => {
      const { task, employee } = ownTraining(state, req.actor, req.params.id);
      requireThat(task.status !== 'completed', 409, 'TRAINING_COMPLETED', '该任务已通过，请查看已保存的培训结果。');
      requireThat(task.parentTaskId || task.status !== 'needs_retry', 409, 'RETRY_REQUIRED', '请打开已生成的复练任务继续练习。');
      requireThat(task.status === 'learning', 409, 'TRAINING_NOT_STARTED', '请先打开任务开始学习，再提交演练。复练失败后也请重新开始复练。');
      const required = trainingScenario.steps.filter((step) => step.required);
      const missing = required.filter((step) => !selectedSteps.includes(step.id)).map((step) => step.id);
      const wrong = trainingScenario.steps.filter((step) => !step.required && selectedSteps.includes(step.id));
      const score = Math.max(0, (required.length - missing.length) * 25 - wrong.length * 25);
      const passed = missing.length === 0 && wrong.length === 0;
      const missingNames = missing.map((id) => required.find((step) => step.id === id).label);
      const feedback = passed
        ? '本次演练 100 分：已覆盖隔离、记录、上报与跟进闭环四项要求。结果依据自编演示 SOP；真实岗位资格仍需企业考核。'
        : `本次演练 ${score} 分。${missingNames.length ? `遗漏：${missingNames.join('、')}。` : ''}${wrong.length ? `不当处置：${wrong.map((step) => step.label).join('、')}。` : ''}请复习《质量检验与不合格品处置 SOP》第 2—5 节后复练。`;
      const attempt = { id: `attempt-${randomUUID()}`, selectedSteps, note, score, feedback, missing, createdAt: new Date().toISOString() };
      task.attempts.push(attempt);
      task.status = passed ? 'completed' : 'needs_retry';
      let retryTask;
      if (passed && task.parentTaskId) {
        const parent = findRecord(state.trainingTasks, task.parentTaskId, '原培训任务');
        parent.status = 'completed';
      } else if (!passed) {
        const root = task.parentTaskId ? findRecord(state.trainingTasks, task.parentTaskId, '原培训任务') : task;
        root.status = 'needs_retry';
        retryTask = state.trainingTasks.find((item) => item.parentTaskId === root.id);
        if (!retryTask) {
          retryTask = { id: `retry-${root.id}`, employeeId: employee.id, kind: 'retry', title: `复练 · ${root.title}`, description: '复习上次反馈及演示 SOP，补齐缺失步骤后再次提交。同一原任务仅创建一个复练任务。', knowledgeId: root.knowledgeId, status: 'not_started', attempts: [], parentTaskId: root.id };
          state.trainingTasks.push(retryTask);
        }
      }
      event(state, req.actor, passed ? 'training_passed' : 'training_retry', passed ? '培训演练已通过' : '培训需复练', `${employee.name}完成“${task.title}”，得分 ${score}。${passed ? '培训进度已更新。' : '请查看具体反馈与复练任务。'}`, task.id, employee.id);
      return { task, attempt, ...(retryTask ? { retryTask } : {}) };
    }, { actorId: req.actor.id, operation: `training-submit:${req.params.id}`, key: requestKey, payload: { selectedSteps, note } });
    res.json(result);
  });

  api.post('/tickets/:id/resolve', (req, res) => {
    role(req.actor, ['hr']);
    const response = textField(bodyObject(req).response, 'HR 答复');
    const result = store.transaction((state) => {
      const ticket = findRecord(state.tickets, req.params.id, '人工工单');
      if (ticket.status === 'resolved') {
        requireThat(ticket.response === response, 409, 'TICKET_RESOLVED', '工单已有答复，请查看已保存的处理结果。');
        return ticket;
      }
      ticket.status = 'resolved';
      ticket.response = response;
      state.messages.push({ id: `msg-${randomUUID()}`, employeeId: ticket.employeeId, role: 'assistant', content: `HR 已答复你的问题“${ticket.question}”：${response}`, citations: [], intent: 'human_reply', createdAt: new Date().toISOString() });
      event(state, req.actor, 'ticket_resolved', '人工工单已答复', `${ticket.employeeName}的咨询已处理：${response}`, ticket.id, ticket.employeeId);
      return ticket;
    });
    res.json(result);
  });

  api.post('/demo/reset', (req, res) => {
    role(req.actor, ['hr']);
    requireThat(bodyObject(req).confirm === 'RESET', 400, 'RESET_CONFIRMATION_REQUIRED', '请明确确认重置演示数据。');
    store.reset();
    res.json({ ok: true });
  });
  api.use('/v1/order2people', order2peopleRouter(store));
  api.use('/v1/skillbridge', skillbridgeRouter(store));
  api.use((_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: '未找到该 API。' } }));
  app.use('/api', api);
  // Only the compiled frontend is public; source and database files are never mounted.
  const distDir = join(projectRoot, 'dist');
  app.use(express.static(distDir, { dotfiles: 'deny', index: false, redirect: false }));
  app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    if (existsSync(join(distDir, 'index.html'))) return res.sendFile(join(distDir, 'index.html'));
    return res.status(404).json({ error: { code: 'FRONTEND_NOT_BUILT', message: '前端尚未构建。开发请使用 npm run dev；演示部署请先 npm run build。' } });
  });
  app.use((_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: '未找到该资源。' } }));
  app.use((error, _req, res, _next) => {
    const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 600 ? error.status : 500;
    const invalidJson = error.type === 'entity.parse.failed';
    res.status(invalidJson ? 400 : status).json({ error: {
      code: invalidJson ? 'INVALID_JSON' : error.code || (status === 413 ? 'PAYLOAD_TOO_LARGE' : 'INTERNAL_ERROR'),
      message: invalidJson ? 'JSON 格式不正确，请检查后重试。' : status === 500 ? '服务暂时无法处理此请求，请重试。' : error.message,
    } });
  });
  return { app, close: () => store.close() };
}
