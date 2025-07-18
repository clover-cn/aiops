# RAG查询接口使用说明

## 问题解决总结

### 🔍 问题原因
之前RAG查询接口返回空结果的原因是：
1. **默认阈值过高**：系统默认使用0.75的相似度阈值，但实际语义相似度通常在0.5-0.7之间
2. **硬编码参数**：多个文件中硬编码了0.75阈值，没有使用配置文件中的设置

### ✅ 解决方案
1. **降低默认阈值**：从0.75调整到0.5，更适合实际的语义相似度分布
2. **统一配置管理**：所有默认参数都从配置文件读取，便于调整
3. **优化相关性算法**：增强关键词匹配和描述匹配的权重

## API使用方法

### 基本查询接口
```
POST /api/aiops/rag/query
```

#### 请求参数
```json
{
  "query": "支付服务状态",        // 必需：查询内容
  "topK": 3,                    // 可选：返回结果数量，默认3
  "threshold": 0.5              // 可选：相似度阈值，默认0.5
}
```

#### 响应格式
```json
{
  "code": 0,
  "data": {
    "success": true,
    "query": "支付服务状态",
    "results": [
      {
        "id": "c91afc6a-6077-4da5-8843-b31d4bb1f454",
        "intent": "server:check_status",
        "description": "检查服务器上服务的运行状态",
        "keywords": ["检查状态", "服务状态", "运行情况", "是否正常", "挂了没"],
        "commandTemplate": "ssh ${user}@${server_ip} \"systemctl status ${service_name}\"",
        "parameters": [
          {
            "name": "user",
            "type": "string",
            "default": "root"
          },
          {
            "name": "server_ip",
            "type": "string",
            "required": true
          },
          {
            "name": "service_name",
            "type": "string",
            "required": true
          }
        ],
        "riskLevel": "low",
        "category": "monitoring",
        "examples": ["检查支付服务状态", "看看用户服务是否正常", "支付服务挂了没"],
        "similarity": 0.6319,          // 向量相似度
        "distance": 0.3681,            // 向量距离
        "relevanceScore": 0.3881       // 综合相关性分数
      }
    ],
    "totalFound": 2,
    "threshold": 0.5,
    "topK": 3
  },
  "error": null,
  "message": "success"
}
```

## 查询示例

### ✅ 有效查询示例
这些查询能找到相关的运维知识：

```bash
# 服务状态相关
curl -X POST http://localhost:3000/api/aiops/rag/query \
  -H "Content-Type: application/json" \
  -d '{"query": "支付服务状态"}'

curl -X POST http://localhost:3000/api/aiops/rag/query \
  -H "Content-Type: application/json" \
  -d '{"query": "检查服务状态"}'

# 服务重启相关
curl -X POST http://localhost:3000/api/aiops/rag/query \
  -H "Content-Type: application/json" \
  -d '{"query": "重启服务"}'

# 日志查看相关
curl -X POST http://localhost:3000/api/aiops/rag/query \
  -H "Content-Type: application/json" \
  -d '{"query": "查看日志"}'

# 网络检查相关
curl -X POST http://localhost:3000/api/aiops/rag/query \
  -H "Content-Type: application/json" \
  -d '{"query": "网络连接"}'
```

### ❌ 无效查询示例
这些查询不会找到相关结果（符合预期）：

```bash
# 不相关的查询
curl -X POST http://localhost:3000/api/aiops/rag/query \
  -H "Content-Type: application/json" \
  -d '{"query": "苹果服务"}'

curl -X POST http://localhost:3000/api/aiops/rag/query \
  -H "Content-Type: application/json" \
  -d '{"query": "天气预报"}'
```

## 阈值调整建议

### 相似度阈值说明
- **0.7-1.0**：非常相似，几乎完全匹配
- **0.5-0.7**：相关性较高，推荐使用
- **0.3-0.5**：有一定相关性，可能有用
- **0.0-0.3**：相关性较低，通常不推荐

### 根据场景调整阈值

#### 严格匹配（高精度）
```json
{
  "query": "支付服务状态",
  "threshold": 0.7
}
```

#### 宽松匹配（高召回）
```json
{
  "query": "支付服务状态",
  "threshold": 0.3
}
```

#### 平衡模式（推荐）
```json
{
  "query": "支付服务状态",
  "threshold": 0.5
}
```

## 其他接口

### 分类检索
```
POST /api/aiops/rag/search/category
```
```json
{
  "query": "检查状态",
  "category": "monitoring",
  "topK": 3,
  "threshold": 0.5
}
```

### 风险级别检索
```
POST /api/aiops/rag/search/risk
```
```json
{
  "query": "重启服务",
  "riskLevel": "medium",
  "topK": 3,
  "threshold": 0.5
}
```

### 获取知识列表
```
GET /api/aiops/rag/knowledge
```

### 系统状态检查
```
GET /api/aiops/rag/status
```

## 配置参数

可以通过环境变量调整默认行为：

```bash
# 检索配置
RAG_DEFAULT_TOP_K=3           # 默认返回结果数
RAG_DEFAULT_THRESHOLD=0.5     # 默认相似度阈值
RAG_MAX_TOP_K=10             # 最大返回结果数
RAG_MIN_THRESHOLD=0.3        # 最小相似度阈值

# 存储模式
CHROMA_MODE=simple           # simple/server/embedded

# 嵌入服务
EMBEDDING_API_KEY=your_key   # SiliconFlow API密钥
EMBEDDING_MODEL=Pro/BAAI/bge-m3
EMBEDDING_DIMENSION=1024
```

## 故障排除

### 1. 查询返回空结果
- 检查阈值是否过高，尝试降低到0.3-0.5
- 确认查询内容与知识库中的关键词相关
- 使用更通用的查询词汇

### 2. 相似度分数偏低
- 这是正常现象，语义相似度通常在0.3-0.7之间
- 关注相关性分数（relevanceScore），它综合了多个因素

### 3. API调用失败
- 检查嵌入服务API密钥是否正确
- 确认网络连接正常
- 查看服务器日志获取详细错误信息

## 性能优化建议

1. **合理设置topK**：通常3-5个结果足够
2. **适当调整阈值**：根据业务需求平衡精度和召回
3. **使用分类检索**：在特定类别中搜索可提高准确性
4. **缓存常用查询**：对于频繁查询可考虑添加缓存层