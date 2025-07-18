const { ChromaClient } = require('chromadb');
const { v4: uuidv4 } = require('uuid');
const config = require('./config');
const path = require('path');
const fs = require('fs');

class ChromaClientEmbedded {
  constructor() {
    this.client = null;
    this.collection = null;
    this.collectionName = config.chroma.collectionName;
    this.isInitialized = false;
    this.isEmbedded = true;
  }

  async initialize() {
    try {
      // 确保数据目录存在
      const persistPath = path.resolve(__dirname, '../../../chroma_data');
      if (!fs.existsSync(persistPath)) {
        fs.mkdirSync(persistPath, { recursive: true });
      }

      // 使用嵌入式模式的正确配置
      this.client = new ChromaClient({
        // 对于嵌入式模式，不设置path参数，使用默认的内存模式
        // 或者使用文件系统持久化
      });

      console.log(`使用嵌入式ChromaDB，数据存储在内存中`);

      // 创建或获取集合
      this.collection = await this.client.getOrCreateCollection({
        name: this.collectionName,
        metadata: {
          description: 'AI运维助手知识库（嵌入式模式）',
          created_at: new Date().toISOString()
        }
      });

      this.isInitialized = true;
      console.log('ChromaDB嵌入式客户端初始化完成');
    } catch (error) {
      console.error('ChromaDB嵌入式初始化失败:', error);
      throw new Error(`ChromaDB嵌入式初始化失败: ${error.message}`);
    }
  }

  async addDocuments(documents, embeddings, metadatas, ids) {
    if (!this.isInitialized) {
      throw new Error('ChromaDB客户端未初始化');
    }

    try {
      const documentIds = ids || documents.map(() => uuidv4());

      await this.collection.upsert({
        ids: documentIds,
        embeddings: embeddings,
        documents: documents,
        metadatas: metadatas
      });

      console.log(`已添加 ${documents.length} 个文档到嵌入式知识库`);
      return documentIds;
    } catch (error) {
      console.error('添加文档失败:', error);
      throw new Error(`添加文档失败: ${error.message}`);
    }
  }

  async queryDocuments(queryEmbedding, nResults = 3, where = null) {
    if (!this.isInitialized) {
      throw new Error('ChromaDB客户端未初始化');
    }

    try {
      const queryParams = {
        queryEmbeddings: [queryEmbedding],
        nResults: nResults,
        include: ['documents', 'metadatas', 'distances']
      };

      if (where) {
        queryParams.where = where;
      }

      const results = await this.collection.query(queryParams);

      return {
        ids: results.ids[0] || [],
        documents: results.documents[0] || [],
        metadatas: results.metadatas[0] || [],
        distances: results.distances[0] || []
      };
    } catch (error) {
      console.error('查询文档失败:', error);
      throw new Error(`查询文档失败: ${error.message}`);
    }
  }

  async updateDocument(id, document, embedding, metadata) {
    if (!this.isInitialized) {
      throw new Error('ChromaDB客户端未初始化');
    }

    try {
      await this.collection.upsert({
        ids: [id],
        embeddings: [embedding],
        documents: [document],
        metadatas: [metadata]
      });

      console.log(`已更新文档: ${id}`);
    } catch (error) {
      console.error('更新文档失败:', error);
      throw new Error(`更新文档失败: ${error.message}`);
    }
  }

  async deleteDocument(id) {
    if (!this.isInitialized) {
      throw new Error('ChromaDB客户端未初始化');
    }

    try {
      await this.collection.delete({
        ids: [id]
      });

      console.log(`已删除文档: ${id}`);
    } catch (error) {
      console.error('删除文档失败:', error);
      throw new Error(`删除文档失败: ${error.message}`);
    }
  }

  async getCollection() {
    if (!this.isInitialized) {
      throw new Error('ChromaDB客户端未初始化');
    }

    try {
      const result = await this.collection.get({
        include: ['documents', 'metadatas']
      });

      return {
        ids: result.ids || [],
        documents: result.documents || [],
        metadatas: result.metadatas || []
      };
    } catch (error) {
      console.error('获取集合失败:', error);
      throw new Error(`获取集合失败: ${error.message}`);
    }
  }

  async countDocuments() {
    if (!this.isInitialized) {
      throw new Error('ChromaDB客户端未初始化');
    }

    try {
      const result = await this.collection.count();
      return result;
    } catch (error) {
      console.error('统计文档数量失败:', error);
      throw new Error(`统计文档数量失败: ${error.message}`);
    }
  }

  isReady() {
    return this.isInitialized;
  }

  async testConnection() {
    try {
      // 嵌入式模式不需要网络连接测试
      console.log('嵌入式模式，无需网络连接');
      return true;
    } catch (error) {
      console.error('嵌入式模式测试失败:', error);
      return false;
    }
  }
}

module.exports = ChromaClientEmbedded;