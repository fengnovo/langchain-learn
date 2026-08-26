# Mock公司知识库
## 支付接口
POST /payment/create
## 订单规则
支付回调必须幂等。
重复通知不能重复扣款。
## 技术规范
所有接口必须定义TypeScript类型。
