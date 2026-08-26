/**
 * Demo06 Multi-Agent
 * 手写最小多智能体系统
 * 模拟：
 * Supervisor
 * Frontend Agent
 * Backend Agent
 * QA Agent
 * Reviewer
 */
/**
 * 共享任务状态
 */
type State = {
 requirement:string;
 frontend?:string;
 backend?:string;
 qa?:string;
 final?:string;
}
/**
 * Supervisor
 * 负责任务拆分
 */
function supervisor(state:State){
 console.log(
  "Supervisor: 分配任务"
 );
 return state;
}
/**
 * Frontend Agent
 */
function frontendAgent(state:State){
 console.log(
  "Frontend Agent执行"
 );
 state.frontend =
 `
 创建OrderList.tsx
 添加订单展示组件
 `;
 return state;
}
/**
 * Backend Agent
 */
function backendAgent(state:State){
 console.log(
  "Backend Agent执行"
 );
 state.backend =
 `
 创建GET /orders接口
 `;
 return state;
}
/**
 * QA Agent
 */
function qaAgent(state:State){
 console.log(
  "QA Agent执行"
 );
 state.qa =
 `
 测试：
 正常流程
 异常流程
 `;
 return state;
}
/**
 * Reviewer
 fan-in阶段
 汇总所有Agent结果
 */
function reviewer(state:State){
 console.log(
  "Reviewer汇总"
 );
 state.final =
 `
 FE:
 ${state.frontend}
 BE:
 ${state.backend}
 QA:
 ${state.qa}
 `;
 return state;
}
/**
 * 主流程
 实际项目：
 这里可以替换成：
 Promise.all()
 实现并行fan-out。
 */
function run(){
 let state:State={
  requirement:
   "开发订单模块"
 };
 state=supervisor(state);
 state=frontendAgent(state);
 state=backendAgent(state);
 state=qaAgent(state);
 state=reviewer(state);
 console.log(
  state.final
 );
}
run();
