// 模拟订单服务代码
export interface Order {
 id:number;
 userId:number;
 amount:number;
 status:string;
}
/**
 * 创建订单
 * 真实项目中这里会包含：
 - 参数校验
 - 库存扣减
 - 支付流程
 - 消息通知
 */
export async function createOrder(
 order:Order
){
 console.log(
  "create order",
  order
 );
 return {
  success:true
 };
}
