// RAG系统主入口
const EmbeddingService = require('./embedding-service');
const KnowledgeBase = require('./knowledge-base');
const ChromaClient = require('./chroma-client');
const ChromaClientEmbedded = require('./chroma-client-embedded');
const SimpleVectorStore = require('./simple-vector-store');
const RetrievalService = require('./retrieval-service');
const config = require('./config');

class RAGSystem {
  constructor() {
    this.embeddingService = new EmbeddingService();
    
    // 根据配置选择向量存储模式
    if (config.chroma.mode === 'simple') {
      console.log('使用简单向量存储模式（无需外部依赖，数据存储在本地文件）');
      this.chromaClient = new SimpleVectorStore();
    } else if (config.chroma.mode === 'embedded') {
      console.log('使用嵌入式ChromaDB模式（无需单独启动服务器）');
      this.chromaClient = new ChromaClientEmbedded();
    } else {
      console.log('使用服务器模式ChromaDB（需要启动ChromaDB服务器）');
      this.chromaClient = new ChromaClient();
    }
    
    this.knowledgeBase = new KnowledgeBase(this.embeddingService, this.chromaClient);
    this.retrievalService = new RetrievalService(this.chromaClient, this.embeddingService);
  }

  async initialize() {
    await this.chromaClient.initialize();
    await this.knowledgeBase.initialize();
    console.log('RAG系统初始化完成');
  }

  async query(userInput, options = {}) {
    const { topK = 3, threshold = 0.75 } = options;
    
    try {
      // 检索相关知识
      const relevantKnowledge = await this.retrievalService.search(userInput, topK, threshold);
      
      return {
        success: true,
        query: userInput,
        relevantKnowledge,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('RAG查询失败:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async addKnowledge(knowledge) {
    return await this.knowledgeBase.addKnowledge(knowledge);
  }

  async updateKnowledge(id, knowledge) {
    return await this.knowledgeBase.updateKnowledge(id, knowledge);
  }

  async deleteKnowledge(id) {
    return await this.knowledgeBase.deleteKnowledge(id);
  }

  async listKnowledge() {
    return await this.knowledgeBase.listKnowledge();
  }
}

module.exports = RAGSystem;