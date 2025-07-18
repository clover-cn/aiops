const config = {
  // 嵌入服务配置
  embedding: {
    apiUrl: process.env.EMBEDDING_API_URL || 'https://api.siliconflow.cn/v1/embeddings',
    apiKey: process.env.EMBEDDING_API_KEY || 'sk-imvhsrqgwvoyfmhubnqnomnrdkozhuzauygwksrlqnlvocac',
    modelName: process.env.EMBEDDING_MODEL || 'Pro/BAAI/bge-m3',
    dimension: parseInt(process.env.EMBEDDING_DIMENSION) || 1024,
    timeout: parseInt(process.env.EMBEDDING_TIMEOUT) || 30000
  },

  // ChromaDB配置
  chroma: {
    mode: process.env.CHROMA_MODE || 'simple', // 'server', 'embedded', 或 'simple'
    url: process.env.CHROMA_URL || 'http://localhost:8000',
    collectionName: process.env.CHROMA_COLLECTION || 'aiops_knowledge_base',
    persistDirectory: process.env.CHROMA_PERSIST_DIR || './chroma_data'
  },

  // 检索配置
  retrieval: {
    defaultTopK: parseInt(process.env.RAG_DEFAULT_TOP_K) || 3,
    defaultThreshold: parseFloat(process.env.RAG_DEFAULT_THRESHOLD) || 0.65, // 检索相关度
    maxTopK: parseInt(process.env.RAG_MAX_TOP_K) || 10,
    minThreshold: parseFloat(process.env.RAG_MIN_THRESHOLD) || 0.3
  },

  // 知识库配置
  knowledgeBase: {
    autoInitialize: process.env.RAG_AUTO_INITIALIZE !== 'false',
    backupEnabled: process.env.RAG_BACKUP_ENABLED === 'true',
    backupInterval: parseInt(process.env.RAG_BACKUP_INTERVAL) || 24 * 60 * 60 * 1000 // 24小时
  },

  // 日志配置
  logging: {
    level: process.env.RAG_LOG_LEVEL || 'info',
    enableQueryLogging: process.env.RAG_ENABLE_QUERY_LOGGING === 'true',
    enablePerformanceLogging: process.env.RAG_ENABLE_PERFORMANCE_LOGGING === 'true'
  }
};

module.exports = config;