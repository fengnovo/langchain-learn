/**
 * 简单计算工具
 * 真实企业里面这里可能连接:
 * 数据库
 * 搜索服务
 * 内部API
 */
export async function calculator(expression: string) {
  try {
    /**
     * demo使用eval
     * 生产环境禁止
     * 应使用安全计算库
     */
    const result = eval(expression);
    return String(result);
  } catch (e) {
    return "计算失败";
  }
}
