# RAG系统故障排除指南

## 常见问题及解决方案

### 1. ChromaDB连接问题

#### 问题：`ChromaDB未运行，请先启动ChromaDB`

**原因：** ChromaDB服务未启动或连接配置错误

**解决方案：**

1. **启动ChromaDB服务**
   ```bash
   # 方法1: 使用Docker Compose（推荐）
   cd apps/node-backend
   docker-compose up -d
   
   # 方法2: 直接使用Docker
   docker run -p 8000:8000 chromadb/chroma
   
   # 方法3: 本地安装ChromaDB
   pip install chromadb
   chroma run --host 0.0.0.0 --port 8000
   ```

2. **检查端口占用**
   ```bash
   # Windows
   netstat -ano | findstr :8000
   
   # Linux/Mac
   lsof -i :8000
   ```

3. **修改连接地址**
   ```bash
   # 在.env文件中设置
   CHROMA_URL=http://your-chroma-server:8000
   ```

#### 问题：`Cannot find module 'chromadb'`

**解决方案：**
```bash
cd apps/node-backend
npm install chromadb
```

### 2. 嵌入API问题

#### 问题：`嵌入API连接失败`

**原因：** API密钥错误或网络连接问题

**解决方案：**

1. **检查API密钥**
   ```bash
   # 在.env文件中设置正确的API密钥
   EMBEDDING_API_KEY=your_actual_api_key_here
   ```

2. **测试网络连接**
   ```bash
   curl -X POST "https://api.siliconflow.cn/v1/embeddings" \
     -H "Authorization: Bearer your_api_key" \
     -H "Content-Type: application/json" \
     -d '{"model": "Pro/BAAI/bge-m3", "input": "test"}'
   ```

3. **检查防火墙设置**
   - 确保可以访问 `https://api.siliconflow.cn`
   - 检查代理设置

### 3. 依赖安装问题

#### 问题：依赖安装失败

**解决方案：**

1. **清理缓存重新安装**
   ```bash
   cd apps/node-backend
   rm -rf node_modules package-lock.json
   npm cache clean --force
   npm install
   ```

2. **使用国内镜像**
   ```bash
   npm config set registry https://registry.npmmirror.com/
   npm install
   ```

3. **检查Node.js版本**
   ```bash
   node --version  # 建议使用 Node.js 16+
   npm --version
   ```

### 4. 权限问题

#### 问题：文件权限错误

**解决方案：**

1. **Linux/Mac权限修复**
   ```bash
   chmod +x start-rag.js
   chmod +x test-chroma.js
   ```

2. **Windows权限问题**
   - 以管理员身份运行命令提示符
   - 或使用PowerShell

### 5. 端口冲突

#### 问题：端口被占用

**解决方案：**

1. **修改服务端口**
   ```bash
   # 在.env文件中设置
   PORT=3002
   CHROMA_URL=http://localhost:8001
   ```

2. **停止占用端口的进程**
   ```bash
   # Windows
   netstat -ano | findstr :3001
   taskkill /PID <PID> /F
   
   # Linux/Mac
   lsof -ti:3001 | xargs kill -9
   ```

## 测试步骤

### 1. 基础连接测试

```bash
cd apps/node-backend

# 1. 测试ChromaDB连接
npm run test:chroma

# 2. 测试完整RAG系统
npm run test:rag

# 3. 启动服务
npm run start:rag
```

### 2. 手动测试API

```bash
# 测试RAG查询
curl -X POST "http://localhost:3001/api/aiops/rag/query" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_jwt_token" \
  -d '{"query": "检查服务状态", "topK": 3}'

# 测试系统状态
curl "http://localhost:3001/api/aiops/rag/status" \
  -H "Authorization: Bearer your_jwt_token"
```

## 日志调试

### 启用详细日志

在`.env`文件中添加：
```env
RAG_LOG_LEVEL=debug
RAG_ENABLE_QUERY_LOGGING=true
RAG_ENABLE_PERFORMANCE_LOGGING=true
NODE_ENV=development
```

### 查看日志

```bash
# 启动时查看详细日志
npm run start:rag

# 或者直接运行Node.js查看错误堆栈
node start-rag.js
```

## 环境检查清单

- [ ] Node.js版本 >= 16
- [ ] npm依赖已安装
- [ ] ChromaDB服务正在运行
- [ ] 端口3001和8000未被占用
- [ ] 网络可以访问SiliconFlow API
- [ ] API密钥配置正确
- [ ] 环境变量配置完整

## 获取帮助

如果以上方案都无法解决问题，请：

1. 收集错误日志
2. 检查系统环境信息
3. 提供详细的错误描述

### 系统信息收集

```bash
# 系统信息
node --version
npm --version
docker --version

# 网络测试
ping api.siliconflow.cn
curl -I http://localhost:8000

# 进程检查
ps aux | grep chroma
ps aux | grep node