# Runner API 使用说明

## 概述

Runner API 提供了两种命令执行模式来解决不同场景的需求：

1. **短时间运行命令** - 适用于快速执行并返回结果的命令
2. **长时间运行命令** - 适用于持续运行或需要实时输出的命令

## API 端点

### 1. 短时间运行命令

**端点**: `POST /`

**用途**: 执行快速完成的命令，如 `ls`, `dir`, `ps`, `whoami` 等

**请求示例**:
```javascript
// 执行简单命令
fetch('/api/runner', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    command: 'dir',
    timeout: 10000  // 可选，默认10秒
  })
})
```

**响应示例**:
```json
{
  "success": true,
  "message": "命令执行完成",
  "result": {
    "success": true,
    "command": "dir",
    "output": "文件列表...",
    "executionTime": 234,
    "timestamp": "2025-01-19 15:25:00"
  }
}
```

### 2. 长时间运行命令（流式）

**端点**: `POST /stream`

**用途**: 执行持续运行的命令，如 `netstat -e 60`, `ping -t`, `tail -f` 等

**请求示例**:
```javascript
// 启动长时间运行的命令
const response = await fetch('/api/runner/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    command: 'netstat -e 60'
  })
});

const result = await response.json();
const processId = result.data.processId;
```

**响应示例**:
```json
{
  "success": true,
  "message": "命令已启动",
  "data": {
    "processId": "cmd_1",
    "status": "running",
    "timestamp": "2025-01-19 15:25:00"
  }
}
```

### 3. 获取进程状态和输出

**端点**: `GET /process/:processId`

**参数**:
- `from` (可选): 从第几条输出开始获取，用于增量获取

**请求示例**:
```javascript
// 获取进程的最新输出
const response = await fetch(`/api/runner/process/${processId}?from=0`);
const processInfo = await response.json();
```

**响应示例**:
```json
{
  "success": true,
  "message": "获取进程信息成功",
  "data": {
    "processId": "cmd_1",
    "command": "netstat -e 60",
    "status": "running",
    "startTime": "2025-01-19 15:25:00",
    "executionTime": 5000,
    "output": [
      {
        "type": "stdout",
        "content": "接口统计\n\n                           接收的            发送的\n\n字节                    3718975488      3044424276\n",
        "timestamp": "2025-01-19 15:25:01"
      }
    ],
    "totalOutputCount": 1,
    "hasMoreOutput": true
  }
}
```

### 4. 终止进程

**端点**: `DELETE /process/:processId`

**请求示例**:
```javascript
// 终止正在运行的进程
await fetch(`/api/runner/process/${processId}`, {
  method: 'DELETE'
});
```

### 5. 获取所有进程列表

**端点**: `GET /processes`

**请求示例**:
```javascript
// 获取所有正在运行的进程
const response = await fetch('/api/runner/processes');
const processes = await response.json();
```

## 使用场景示例

### 场景1: 执行 netstat -e 60 命令

```javascript
async function monitorNetworkStats() {
  // 1. 启动命令
  const startResponse = await fetch('/api/runner/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command: 'netstat -e 60' })
  });
  
  const { data: { processId } } = await startResponse.json();
  console.log('命令已启动，进程ID:', processId);
  
  // 2. 定期获取输出
  let outputIndex = 0;
  const interval = setInterval(async () => {
    const response = await fetch(`/api/runner/process/${processId}?from=${outputIndex}`);
    const processInfo = await response.json();
    
    if (processInfo.success) {
      const { output, status, totalOutputCount } = processInfo.data;
      
      // 显示新的输出
      output.forEach(item => {
        console.log(`[${item.timestamp}] ${item.content}`);
      });
      
      outputIndex = totalOutputCount;
      
      // 如果进程结束，停止轮询
      if (status !== 'running') {
        clearInterval(interval);
        console.log('命令执行完成，状态:', status);
      }
    }
  }, 2000); // 每2秒检查一次
  
  // 3. 10秒后手动终止（可选）
  setTimeout(async () => {
    await fetch(`/api/runner/process/${processId}`, { method: 'DELETE' });
    clearInterval(interval);
    console.log('命令已手动终止');
  }, 10000);
}
```

### 场景2: 执行 ping 命令

```javascript
async function pingHost(host) {
  const command = process.platform === 'win32' 
    ? `ping -t ${host}` 
    : `ping ${host}`;
    
  const response = await fetch('/api/runner/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command })
  });
  
  const { data: { processId } } = await response.json();
  
  // 实时显示ping结果
  let outputIndex = 0;
  const showOutput = async () => {
    const response = await fetch(`/api/runner/process/${processId}?from=${outputIndex}`);
    const processInfo = await response.json();
    
    if (processInfo.success) {
      processInfo.data.output.forEach(item => {
        if (item.type === 'stdout') {
          console.log(item.content.trim());
        }
      });
      outputIndex = processInfo.data.totalOutputCount;
      
      if (processInfo.data.status === 'running') {
        setTimeout(showOutput, 1000);
      }
    }
  };
  
  showOutput();
  
  return processId;
}
```

## 进程状态说明

- `running`: 进程正在运行
- `completed`: 进程正常结束
- `killed`: 进程被手动终止
- `error`: 进程执行出错

## 注意事项

1. **安全限制**: 危险命令（如 `rm`, `del`, `shutdown` 等）会被阻止执行
2. **进程清理**: 完成的进程信息会在5分钟后自动清理
3. **编码处理**: Windows系统会自动处理GBK编码转换
4. **资源管理**: 建议及时终止不需要的长时间运行进程

## 错误处理

所有API都会返回统一的错误格式：

```json
{
  "success": false,
  "message": "错误描述",
  "error": "详细错误信息"
}
```

常见错误：
- 命令不安全：包含危险操作
- 进程不存在：指定的进程ID不存在
- 命令执行失败：系统执行命令时出错
