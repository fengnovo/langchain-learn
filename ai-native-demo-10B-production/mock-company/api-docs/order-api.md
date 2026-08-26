# Order Service API
## 查询订单列表
GET /api/v1/orders
Query:
- page: number
- pageSize: number
- status?: PENDING | PAID | CANCELLED
返回：
```json
{
  "items": [],
  "total": 0
}
```
要求：
- pageSize 最大 100
- BFF 必须传递 traceId
- 下游超时 2 秒
