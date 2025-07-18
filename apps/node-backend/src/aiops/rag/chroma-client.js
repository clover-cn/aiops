const { ChromaClient } = require('chromadb');
const { v4: uuidv4 } = require('uuid');
const config = require('./config');

class ChromaClientWrapper {
  constructor() {
    this.client = null;
    this.collection = null;
    this.collectionName = config.chroma.collectionName;
    this.chromaUrl = config.chroma.url;
    this.isInitialized = false;
  }

  async initialize() {
    try {
      // 初始化ChromaDB客户端
      this.client = new ChromaClient({
        path: this.chromaUrl
      });

      // 创建或获取集合
      try {
        this.collection = await this.client.getOrCreateCollection({
          name: this.collectionName,
          metadata: {
            description: 'AI运维助手知识库',
            created_at: new Date().toISOString()
          }
        });
        console.log(`已连接到集合: ${this.collectionName}`);
      } catch (error) {
        console.error('创建/获取集合失败:', error);
        throw error;
      }

      this.isInitialized = true;
      console.log('ChromaDB客户端初始化完成');
    } catch (error) {
      console.error('ChromaDB初始化失败:', error);
      throw new Error(`ChromaDB初始化失败: ${error.message}`);
    }
  }

  async addDocuments(documents, embeddings, metadatas, ids) {
    if (!this.isInitialized) {
      throw new Error('ChromaDB客户端未初始化');
    }

    try {
      // 如果没有提供ID，自动生成
      const documentIds = ids || documents.map(() => uuidv4());

      await this.collection.upsert({
        ids: documentIds,
        embeddings: embeddings,
        documents: documents,
        metadatas: metadatas
      });

      console.log(`已添加 ${documents.length} 个文档到知识库`);
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

  // 测试连接
  async testConnection() {
    try {
      if (!this.client) {
        this.client = new ChromaClient({
          path: this.chromaUrl
        });
      }
      
      // 尝试获取版本信息来测试连接
      const version = await this.client.version();
      console.log('ChromaDB版本:', version);
      return true;
    } catch (error) {
      console.error('ChromaDB连接测试失败:', error);
      return false;
    }
  }
}

module.exports = ChromaClientWrapper;