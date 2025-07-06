# AIOps 智能运维监控大屏所需数据接口

基于 

```
 apps\web-antd\src\views\dashboard\aiops
```

 文件夹中的代码，以下是智能运维监控大屏需要的数据接口：



## 1. 系统概览数据



GET /api/aiops/overview

需要返回：

- 在线服务数（当前值和总数）
- 活跃告警数（当前值和今日总数）
- CPU使用率（当前值和平均值）
- 内存使用率（当前值和平均值）

## 2. 系统性能指标



GET /api/aiops/system-metrics

需要返回：

- 时间点数组（最近30分钟）
- CPU使用率数据
- 内存使用率数据
- 磁盘使用率数据

## 3. 实时告警监控



GET /api/aiops/alerts

需要返回告警列表，每条包含：

- 告警ID
- 告警级别（critical/warning/info）
- 告警标题
- 告警描述
- 受影响服务
- 告警时间

## 4. 服务健康状态



GET /api/aiops/service-health

需要返回各服务健康状态：

- 服务名称
- 健康实例数
- 总实例数
- 健康百分比

## 5. 网络流量监控



GET /api/aiops/network-traffic

需要返回网络流量数据：

- 时间点
- 入站流量数据
- 出站流量数据

## 6. 资源使用趋势



GET /api/aiops/resource-usage

需要返回各服务器的资源使用情况：

- 服务器名称列表
- 各服务器的CPU使用率
- 各服务器的内存使用率
- 各服务器的磁盘使用率
- 各服务器的网络使用率

## 7. 日志分析



GET /api/aiops/log-analysis

需要返回两部分数据：

- 日志统计：各级别日志数量及百分比（error/warn/info/debug）
- 最近日志：包含级别、消息内容、服务名称和时间

## 数据格式示例

以系统性能指标为例，接口返回格式可以是：



{

 "timePoints": ["10:00", "10:01", "10:02", "..."],

 "cpuData": [68, 70, 65, "..."],

 "memoryData": [76, 75, 78, "..."],

 "diskData": [45, 46, 45, "..."]

}

建议与后端开发人员沟通，确认各接口的具体字段名称和数据格式，以确保前后端数据对接顺畅。





## 后端开发指南

后端开发人员应该：

1. 遵循接口规范

   ：查看

    

   `backend-mock`

    

   中的接口定义，包括：

   - 接口路径（URL）
   - 请求方法（GET/POST/PUT/DELETE）
   - 请求参数格式
   - 响应数据结构

2. **保持响应格式一致**：确保真实接口返回的数据格式与 mock 服务一致



apps/backend-mock/utils



export function useResponseSuccess<T = any>(data: T) {

 return {

  code: 0,

  data,

  error: null,

  message: 'ok',

 };

}

1. **实现认证机制**：实现与 mock 服务相同的认证流程



apps/backend-mock/api/auth



export default defineEventHandler(async (event) => {

 const { password, username } = await readBody(event);

 if (!password || !username) {

  setResponseStatus(event, 400);

  return useResponseError(

   'BadRequestException',

   'Username and password are required',

  );

 }

 // ... 验证逻辑

 return useResponseSuccess({

  ...findUser,

  accessToken,

 });

});

## 关键接口示例

以下是一些关键接口，后端应该按照这些接口规范实现：

1. **登录接口**：`POST /api/auth/login`
2. **刷新令牌**：`POST /api/auth/refresh`
3. **获取用户信息**：`GET /api/user/info`
4. **获取菜单**：`GET /api/menu/all`
5. **上传文件**：`POST /api/upload`