/**
 * Demo 05
 * 手写一个最小Agent Workflow
 * 模拟：
 * Planner
 * Coder
 * Reviewer
 * Tester
 */
/**
 * 共享状态
 * 所有Agent通过state交接信息。
 */
type State = {
 requirement:string;
 plan?:string;
 code?:string;
 review?:string;
 test?:string;
}
/**
 * Planner Agent
 */
function planner(state:State){
 console.log("Planner分析需求");
 state.plan =
 `
 登录功能:
 1. 登录页面
 2. auth API
 3. token保存
 `;
 return state;
}
/**
 * Coder Agent
 */
function coder(state:State){
 console.log("Coder生成代码");
 state.code =
 `
 Login.tsx
 authService.ts
 `;
 return state;
}
/**
 * Reviewer Agent
 */
function reviewer(state:State){
 console.log("Reviewer检查");
 state.review =
 `
 类型检查通过
 建议增加错误处理
 `;
 return state;
}
/**
 * Tester Agent
 */
function tester(state:State){
 console.log("Tester测试");
 state.test =
 `
 登录成功
 异常流程通过
 `;
 return state;
}
/**
 * Workflow执行器
 * 后续LangGraph本质就是：
 * Node = Agent函数
 * Edge = 流程连接
 */
function runWorkflow(){
 let state:State={
  requirement:
   "开发用户登录功能"
 };
 state=planner(state);
 state=coder(state);
 state=reviewer(state);
 state=tester(state);
 console.log(
  "最终状态:",
  state
 );
}
runWorkflow();
