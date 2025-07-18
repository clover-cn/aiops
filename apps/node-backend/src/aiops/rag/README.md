# AI-Ops RAG系统

基于Chroma向量数据库和SiliconFlow嵌入API的检索增强生成(RAG)系统，用于AI智能运维助手。

## 功能特性

- 🔍 **语义搜索**: 基于向量相似度的智能检索
- 📚 **知识库管理**: 支持知识的增删改查
- 🎯 **意图识别**: 准确理解用户运维需求
- 🔒 **安全设计**: AI只负责理解，不直接生成命令
- 📊 **多维检索**: 支持分类、风险级别等多种检索方式
- ⚡ **高性能**: 基于向量数据库的快速检索

## 系统架构

```
用户输入 → 嵌入向量化 → Chroma检索 → 相关知识 → 结构化输出
```

### 核心组件

1. **EmbeddingService**: 连接SiliconFlow API，将文本转换为向量
2. **ChromaClient**: 管理Chroma向量数据库
3. **KnowledgeBase**: 知识库管理，支持CRUD操作
4. **RetrievalService**: 检索服务，实现语义搜索
5. **RAGSystem**: 主系统，协调各组件工作

## 快速开始

### 1. 安装依赖

```bash
cd apps/node-backend
npm install
```

### 2. 配置环境变量

在 `.env` 文件中添加以下配置（可选，有默认值）：

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

### 3. 启动ChromaDB

```bash
# 使用Docker启动ChromaDB
docker run -p 8000:8000 chromadb/chroma
```

### 4. 启动服务

```bash
npm run dev
```

### 5. 测试系统

```bash
# 运行测试脚本
node src/aiops/rag/test.js
```

## API接口

### 基础查询

```http
POST /api/aiops/rag/query
Content-Type: application/json

{
  "query": "检查支付服务状态",
  "topK": 3,
  "threshold": 0.75
}
```

### 知识管理

#### 添加知识

```http
POST /api/aiops/rag/knowledge
Content-Type: application/json

{
  "intent": "server:check_status",
  "description": "检查服务器上服务的运行状态",
  "keywords": ["检查状态", "服务状态", "运行情况"],
  "commandTemplate": "ssh ${user}@${server_ip} \"systemctl status ${service_name}\"",
  "parameters": [
    {"name": "user", "type": "string", "default": "root"},
    {"name": "server_ip", "type": "string", "required": true},
    {"name": "service_name", "type": "string", "required": true}
  ],
  "riskLevel": "low",
  "category": "monitoring",
  "examples": ["检查支付服务状态", "看看用户服务是否正常"]
}
```

#### 获取知识列表

```http
GET /api/aiops/rag/knowledge
```

#### 更新知识

```http
PUT /api/aiops/rag/knowledge/{id}
Content-Type: application/json

{
  "description": "更新后的描述",
  ...
}
```

#### 删除知识

```http
DELETE /api/aiops/rag/knowledge/{id}
```

### 高级检索

#### 分类检索

```http
POST /api/aiops/rag/search/category
Content-Type: application/json

{
  "query": "检查状态",
  "category": "monitoring",
  "topK": 3,
  "threshold": 0.75
}
```

#### 风险级别检索

```http
POST /api/aiops/rag/search/risk
Content-Type: application/json

{
  "query": "重启服务",
  "riskLevel": "high",
  "topK": 3,
  "threshold": 0.75
}
```

### 系统状态

```http
GET /api/aiops/rag/status
```

## 知识库结构

每个知识条目包含以下字段：

- `intent`: 意图标识，如 "server:check_status"
- `description`: 功能描述
- `keywords`: 关键词数组，用于匹配
- `commandTemplate`: 命令模板，包含参数占位符
- `parameters`: 参数定义数组
- `riskLevel`: 风险级别 (low/medium/high)
- `category`: 分类 (monitoring/operation/maintenance等)
- `examples`: 示例用法数组

## 配置说明

### 检索参数

- `topK`: 返回最相似的K个结果 (默认: 3)
- `threshold`: 相似度阈值，过滤低相关度结果 (默认: 0.75)

### 相似度计算

系统使用余弦相似度计算向量间的相似性，并结合以下因素：

1. **向量相似度** (权重70%): 基于嵌入向量的语义相似度
2. **关键词匹配** (权重20%): 查询文本与知识库关键词的匹配度
3. **意图匹配** (权重10%): 查询文本与意图名称的匹配度

## 最佳实践

### 1. 知识库设计

- 使用清晰的意图命名规范: `{domain}:{action}`
- 提供丰富的关键词和示例
- 合理设置风险级别和分类

### 2. 检索优化

- 根据业务需求调整阈值
- 使用分类检索提高精确度
- 定期评估和优化知识库质量

### 3. 安全考虑

- AI只输出结构化意图，不直接生成命令
- 后端负责命令的安全构建和执行
- 实施适当的权限控制和审批流程

## 故障排除

### 常见问题

1. **ChromaDB连接失败**
   - 检查ChromaDB是否正常运行
   - 确认端口配置正确

2. **嵌入API调用失败**
   - 检查API密钥是否正确
   - 确认网络连接正常

3. **检索结果为空**
   - 降低相似度阈值
   - 检查知识库是否已初始化

### 日志调试

启用详细日志：

```env
RAG_LOG_LEVEL=debug
RAG_ENABLE_QUERY_LOGGING=true
RAG_ENABLE_PERFORMANCE_LOGGING=true
```

## 扩展开发

### 添加新的检索策略

继承 `RetrievalService` 类并实现自定义检索逻辑：

```javascript
class CustomRetrievalService extends RetrievalService {
  async customSearch(query, options) {
    // 自定义检索逻辑
  }
}
```

### 集成其他嵌入模型

实现 `EmbeddingService` 接口：

```javascript
class CustomEmbeddingService {
  async getEmbedding(text) {
    // 自定义嵌入逻辑
  }
}
```

## 许可证

MIT License