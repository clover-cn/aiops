# RAG系统快速启动指南

## 🚀 5分钟快速启动

### 步骤1: 安装依赖
```bash
cd apps/node-backend
npm install
```

### 步骤2: 启动ChromaDB
```bash
# 使用Docker Compose（推荐）
docker-compose up -d

# 或者直接使用Docker
docker run -d -p 8000:8000 --name chroma chromadb/chroma
```

### 步骤3: 配置环境变量（可选）
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑.env文件，修改API密钥等配置
```

### 步骤4: 测试连接
```bash
# 测试ChromaDB连接
npm run test:chroma

# 测试完整RAG系统
npm run test:rag
```

### 步骤5: 启动服务
```bash
# 启动RAG系统
npm run start:rag
```

## 🧪 验证安装

访问以下URL验证系统状态：
- 系统状态: `GET http://localhost:3001/api/aiops/rag/status`
- 健康检查: `GET http://localhost:3001/api/status`

## 📝 测试API

### 1. 获取JWT Token
```bash
curl -X POST "http://localhost:3001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "123456"}'
```

### 2. 测试RAG查询
```bash
curl -X POST "http://localhost:3001/api/aiops/rag/query" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"query": "检查支付服务状态", "topK": 3, "threshold": 0.75}'
```

### 3. 查看知识库
```bash
curl "http://localhost:3001/api/aiops/rag/knowledge" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🔧 常用命令

```bash
# 开发模式启动
npm run dev

# 仅启动RAG系统
npm run start:rag

# 测试ChromaDB连接
npm run test:chroma

# 测试RAG功能
npm run test:rag

# 查看ChromaDB容器状态
docker ps | grep chroma

# 查看ChromaDB日志
docker logs chroma

# 停止ChromaDB
docker-compose down
```

## 📊 系统架构

```
用户查询 → API接口 → RAG系统 → 嵌入服务 → SiliconFlow API
                    ↓
                检索服务 → ChromaDB → 返回相关知识
```

## 🎯 核心功能

- **智能检索**: 基于语义相似度的知识检索
- **知识管理**: 动态添加、更新、删除运维知识
- **意图识别**: 理解用户的运维需求
- **参数提取**: 从用户输入中提取命令参数
- **风险评估**: 根据操作风险级别进行分类

## 📚 预置知识库

系统预置了以下运维知识：
- 服务状态检查
- 服务重启操作
- 日志查看
- 磁盘使用检查
- 内存使用检查

## 🔍 故障排除

如果遇到问题，请查看 [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) 获取详细的故障排除指南。

## 📖 详细文档

- [RAG系统详细文档](./src/aiops/rag/README.md)
- [API接口文档](./README.md#api-接口)
- [故障排除指南](./TROUBLESHOOTING.md)