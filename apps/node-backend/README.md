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
- 🆕 **RAG智能检索系统**
  - 基于Chroma向量数据库的语义搜索
  - SiliconFlow嵌入API集成
  - AI运维知识库管理
  - 意图识别和参数提取

## 技术栈

- **Node.js** - 运行时环境
- **Express** - Web 框架
- **jsonwebtoken** - JWT 令牌处理
- **multer** - 文件上传处理
- **cors** - 跨域资源共享
- **helmet** - 安全中间件
- **morgan** - 请求日志
- **chromadb** - 向量数据库
- **axios** - HTTP客户端

## 项目结构

```
apps/node-backend/
├── src/
│   ├── aiops/           # AI运维模块
│   │   └── rag/         # RAG系统
│   │       ├── index.js           # RAG主入口
│   │       ├── embedding-service.js # 嵌入服务
│   │       ├── chroma-client.js   # Chroma客户端
│   │       ├── knowledge-base.js  # 知识库管理
│   │       ├── retrieval-service.js # 检索服务
│   │       ├── config.js          # 配置文件
│   │       ├── test.js            # 测试脚本
│   │       └── README.md          # RAG文档
│   ├── routes/          # 路由文件
│   │   ├── aiops/       # AI运维路由
│   │   │   ├── index.js     # 主路由
│   │   │   ├── rag.js       # RAG接口
│   │   │   ├── systemMetrics.js
│   │   │   ├── runner.js
│   │   │   └── networkTraffic.js
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
├── start-rag.js         # RAG启动脚本
├── docker-compose.yml   # Docker配置
├── .env                 # 环境配置
├── .env.example         # 环境配置示例
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

### 3. 启动ChromaDB（RAG系统需要）

```bash
# 使用Docker Compose启动ChromaDB
docker-compose up -d

# 或者直接使用Docker
docker run -p 8000:8000 chromadb/chroma
```

### 4. 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm start

# 启动RAG系统（包含依赖检查）
npm run start:rag

# 测试RAG系统
npm run test:rag
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

### AI运维RAG接口

#### RAG查询
```
POST /api/aiops/rag/query
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "query": "检查支付服务状态",
  "topK": 3,
  "threshold": 0.75
}
```

#### 知识库管理
```
# 获取知识列表
GET /api/aiops/rag/knowledge

# 添加知识
POST /api/aiops/rag/knowledge
{
  "intent": "server:check_status",
  "description": "检查服务器上服务的运行状态",
  "keywords": ["检查状态", "服务状态"],
  "commandTemplate": "ssh ${user}@${server_ip} \"systemctl status ${service_name}\"",
  "parameters": [...],
  "riskLevel": "low",
  "category": "monitoring"
}

# 更新知识
PUT /api/aiops/rag/knowledge/{id}

# 删除知识
DELETE /api/aiops/rag/knowledge/{id}
```

#### 系统状态
```
GET /api/aiops/rag/status
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

## RAG系统配置

RAG系统使用以下环境变量进行配置：

```env
# 嵌入服务配置
EMBEDDING_API_URL=https://api.siliconflow.cn/v1/embeddings
EMBEDDING_API_KEY=your_api_key_here
EMBEDDING_MODEL=Pro/BAAI/bge-m3
EMBEDDING_DIMENSION=1024

# ChromaDB配置
CHROMA_URL=http://localhost:8000
CHROMA_COLLECTION=aiops_knowledge_base

# 检索配置
RAG_DEFAULT_TOP_K=3
RAG_DEFAULT_THRESHOLD=0.75
```

详细配置请参考 `.env.example` 文件。

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

### RAG系统部署

1. 启动ChromaDB：
```bash
docker-compose up -d
```

2. 配置环境变量（复制.env.example到.env并修改）

3. 启动服务：
```bash
npm run start:rag
```

## 许可证

MIT License
