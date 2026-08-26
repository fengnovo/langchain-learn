/**
 * Demo08 AI Coding Harness
 * 模拟：
 * AI生成代码
 * ↓
 * 质量检查
 * ↓
 * 是否允许提交
 */
/**
 * 模拟AI生成结果
 */
const generatedCode = `
function login(){
 console.log("login")
}
`;
/**
 * Lint检查
 */
function lintCheck(code:string){
 console.log(
  "执行Lint检查"
 );
 if(code.includes("console.log")){
   return {
    pass:false,
    reason:"禁止console.log"
   };
 }
 return {
  pass:true
 };
}
/**
 * 安全检查
 */
function securityCheck(code:string){
 console.log(
  "执行安全检查"
 );
 if(code.includes("rm -rf")){
  return {
   pass:false,
   reason:"危险命令"
  };
 }
 return {
  pass:true
 };
}
/**
 * 测试检查
 */
function testCheck(){
 console.log(
  "执行测试"
 );
 return {
  pass:true
 };
}
/**
 * Harness入口
 */
function runHarness(){
 const checks=[
  lintCheck(generatedCode),
  securityCheck(generatedCode),
  testCheck()
 ];
 const failed =
 checks.find(
  item=>!item.pass
 );
 if(failed){
  console.log(
   "提交失败:",
   failed.reason
  );
 }else{
  console.log(
   "所有检查通过，可以提交"
  );
 }
}
runHarness();
