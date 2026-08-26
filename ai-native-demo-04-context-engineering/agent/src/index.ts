import fs from "fs";
import path from "path";
/**
 * Context Engineering Demo
 * 模拟AI Agent启动时：
 * 1.读取项目规范
 * 2.读取Skill
 * 3.组合上下文
 * 4.发送给LLM
 */
function loadContext(){
 const files=[
  "../docs/project-rule.md",
  "../docs/architecture.md",
  "../skills/frontend-review.md"
 ];
 return files.map(file=>{
   const content =
    fs.readFileSync(
      path.join(__dirname,file),
      "utf-8"
    );
   return content;
 }).join("\n\n");
}
const context = loadContext();
console.log(
"====== AI Context ======"
);
console.log(context);
console.log(
"\n用户任务:\n新增用户列表页面\n\nAI获得上下文后再生成代码。"
);
