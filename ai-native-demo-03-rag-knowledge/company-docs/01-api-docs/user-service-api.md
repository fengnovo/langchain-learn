# 用户中心服务 API 文档
## 服务名称
user-service
## 登录接口
POST /api/v1/auth/login
请求：
``` json
{
  "username":"demo",
  "password":"123456"
}
```
返回：
``` json
{
 "token":"xxx",
 "expire":7200
}
```
## 获取用户信息
GET /api/v1/users/{id}
返回：
``` json
{
 "id":1001,
 "name":"张三",
 "level":"VIP"
}
```
## 错误码
10001 用户不存在
10002 密码错误
10003 Token过期
