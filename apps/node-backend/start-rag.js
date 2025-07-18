#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 启动AI-Ops RAG系统...\n');

// 检查依赖是否已安装
function checkDependencies() {
  const packageJsonPath = path.join(__dirname, 'package.json');
  const nodeModulesPath = path.join(__dirname, 'node_modules');
  
  if (!fs.existsSync(nodeModulesPath)) {
    console.log('📦 检测到依赖未安装，正在安装...');
    return new Promise((resolve, reject) => {
      const npm = spawn('npm', ['install'], { 
        stdio: 'inherit',
        cwd: __dirname
      });
      
      npm.on('close', (code) => {
        if (code === 0) {
          console.log('✅ 依赖安装完成\n');
          resolve();
        } else {
          reject(new Error('依赖安装失败'));
        }
      });
    });
  }
  
  return Promise.resolve();
}

// 检查ChromaDB是否运行
function checkChromaDB() {
  return new Promise(async (resolve) => {
    try {
      const ChromaClientWrapper = require('./src/aiops/rag/chroma-client');
      const chromaClient = new ChromaClientWrapper();
      
      console.log('🔍 测试ChromaDB连接...');
      const isConnected = await chromaClient.testConnection();
      
      if (isConnected) {
        console.log('✅ ChromaDB连接正常');
        resolve(true);
      } else {
        console.log('⚠️  ChromaDB未运行，请先启动ChromaDB:');
        console.log('   方法1: docker-compose up -d');
        console.log('   方法2: docker run -p 8000:8000 chromadb/chroma');
        console.log('   或者修改CHROMA_URL环境变量指向正确的地址\n');
        resolve(false);
      }
    } catch (error) {
      console.log('❌ ChromaDB连接检测失败:', error.message);
      console.log('⚠️  请确保已安装chromadb依赖包:');
      console.log('   npm install chromadb\n');
      resolve(false);
    }
  });
}

// 测试嵌入API
function testEmbeddingAPI() {
  return new Promise((resolve) => {
    const EmbeddingService = require('./src/aiops/rag/embedding-service');
    const embeddingService = new EmbeddingService();
    
    console.log('🔍 测试嵌入API连接...');
    embeddingService.getEmbedding('测试文本')
      .then(() => {
        console.log('✅ 嵌入API连接正常');
        resolve(true);
      })
      .catch((error) => {
        console.log('❌ 嵌入API连接失败:', error.message);
        console.log('   请检查API密钥和网络连接\n');
        resolve(false);
      });
  });
}

// 启动服务器
function startServer() {
  console.log('🌟 启动Node.js服务器...\n');
  
  const server = spawn('node', ['src/app.js'], {
    stdio: 'inherit',
    cwd: __dirname,
    env: { ...process.env, NODE_ENV: 'development' }
  });
  
  server.on('close', (code) => {
    console.log(`服务器退出，代码: ${code}`);
  });
  
  // 处理退出信号
  process.on('SIGINT', () => {
    console.log('\n🛑 正在关闭服务器...');
    server.kill('SIGINT');
  });
  
  process.on('SIGTERM', () => {
    console.log('\n🛑 正在关闭服务器...');
    server.kill('SIGTERM');
  });
}

// 显示系统信息
function showSystemInfo() {
  console.log('📋 系统配置信息:');
  console.log(`   嵌入API: ${process.env.EMBEDDING_API_URL || 'https://api.siliconflow.cn/v1/embeddings'}`);
  console.log(`   嵌入模型: ${process.env.EMBEDDING_MODEL || 'Pro/BAAI/bge-m3'}`);
  console.log(`   ChromaDB: ${process.env.CHROMA_URL || 'http://localhost:8000'}`);
  console.log(`   服务端口: ${process.env.PORT || 3001}`);
  console.log('');
  
  console.log('🔗 可用的API端点:');
  console.log('   RAG查询: POST /api/aiops/rag/query');
  console.log('   知识管理: GET/POST/PUT/DELETE /api/aiops/rag/knowledge');
  console.log('   系统状态: GET /api/aiops/rag/status');
  console.log('   测试脚本: node src/aiops/rag/test.js');
  console.log('');
}

// 主函数
async function main() {
  try {
    // 检查依赖
    await checkDependencies();
    
    // 显示系统信息
    showSystemInfo();
    
    // 检查外部服务
    const chromaOK = await checkChromaDB();
    const embeddingOK = await testEmbeddingAPI();
    
    if (!chromaOK) {
      console.log('⚠️  ChromaDB未运行，RAG功能可能无法正常工作');
    }
    
    if (!embeddingOK) {
      console.log('⚠️  嵌入API连接失败，RAG功能可能无法正常工作');
    }
    
    if (chromaOK && embeddingOK) {
      console.log('🎉 所有服务检查通过，RAG系统准备就绪！\n');
    } else {
      console.log('⚠️  部分服务检查失败，但仍会启动服务器\n');
    }
    
    // 启动服务器
    startServer();
    
  } catch (error) {
    console.error('❌ 启动失败:', error.message);
    process.exit(1);
  }
}

// 运行主函数
main();