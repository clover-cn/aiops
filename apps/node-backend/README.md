# Vue Vben Admin - Node.js Backend

基于 Node.js + Express 的后端实现，为 AI Ops 项目提供 API 服务。

## 功能特性

- ✅ JWT 身份认证
- ✅ 用户登录/登出
- ✅ 令牌刷新机制
- ✅ 用户信息获取
- ✅ 动态菜单加载
- ✅ 文件上传功能
- ✅ CORS 跨域支持
- ✅ 安全中间件
- ✅ 请求日志记录

## 技术栈

- **Node.js** - 运行时环境
- **Express** - Web 框架
- **jsonwebtoken** - JWT 令牌处理
- **multer** - 文件上传处理
- **cors** - 跨域资源共享
- **helmet** - 安全中间件
- **morgan** - 请求日志

## 项目结构

```
apps/node-backend/
├── src/
│   ├── routes/          # 路由文件
│   │   ├── auth.js      # 认证相关路由
│   │   ├── user.js      # 用户相关路由
│   │   ├── menu.js      # 菜单相关路由
│   │   └── upload.js    # 文件上传路由
│   ├── utils/           # 工具函数
│   │   ├── response.js  # 响应格式化
│   │   ├── jwt-utils.js # JWT 工具
│   │   ├── cookie-utils.js # Cookie 工具
│   │   └── mock-data.js # 模拟数据
│   └── app.js           # 应用入口文件
├── uploads/             # 文件上传目录
├── .env                 # 环境配置
├── package.json         # 项目配置
└── README.md           # 项目文档
```

## 快速开始

### 1. 安装依赖

```bash
cd apps/node-backend
npm install
```

### 2. 环境配置

复制 `.env` 文件并根据需要修改配置：

```bash
# Server Configuration
PORT=3001
NODE_ENV=development

# JWT Configuration
ACCESS_TOKEN_SECRET=your_access_token_secret
REFRESH_TOKEN_SECRET=your_refresh_token_secret
ACCESS_TOKEN_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_IN=30d

# CORS Configuration
CORS_ORIGIN=http://localhost:5173
```

### 3. 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

服务将在 `http://localhost:3001` 启动。

## API 接口

### 认证接口

#### 登录
```
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "123456"
}
```

#### 刷新令牌
```
POST /api/auth/refresh
```

#### 登出
```
POST /api/auth/logout
```

### 用户接口

#### 获取用户信息
```
GET /api/user/info
Authorization: Bearer <access_token>
```

### 菜单接口

#### 获取菜单
```
GET /api/menu/all
Authorization: Bearer <access_token>
```

### 文件上传

#### 上传文件
```
POST /api/upload
Authorization: Bearer <access_token>
Content-Type: multipart/form-data

file: <文件>
```

#### 获取文件列表
```
GET /api/upload/list
Authorization: Bearer <access_token>
```

## 响应格式

所有接口都遵循统一的响应格式：

### 成功响应
```json
{
  "code": 0,
  "data": {},
  "error": null,
  "message": "ok"
}
```

### 错误响应
```json
{
  "code": -1,
  "data": null,
  "error": "错误详情",
  "message": "错误消息"
}
```

## 默认用户

系统预置了以下测试用户：

| 用户名 | 密码   | 角色  | 说明     |
|--------|--------|-------|----------|
| vben   | 123456 | super | 超级管理员 |
| admin  | 123456 | admin | 管理员   |
| jack   | 123456 | user  | 普通用户 |

## 开发说明

### 添加新接口

1. 在 `src/routes/` 目录下创建或修改路由文件
2. 在 `src/app.js` 中注册新的路由
3. 使用统一的响应格式和错误处理

### 数据模拟

模拟数据定义在 `src/utils/mock-data.js` 中，可以根据需要修改用户、菜单等数据。

### 安全配置

- JWT 密钥请在生产环境中使用强密码
- 启用 HTTPS（生产环境）
- 配置适当的 CORS 策略
- 定期更新依赖包

## 部署

### 使用 PM2

```bash
npm install -g pm2
pm2 start src/app.js --name "vben-backend"
```

### 使用 Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

## 许可证

MIT License
