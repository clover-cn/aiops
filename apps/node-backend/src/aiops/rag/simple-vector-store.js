const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * 简单的向量存储实现
 * 无需外部依赖，直接使用文件系统存储
 */
class SimpleVectorStore {
  constructor() {
    this.dataPath = path.join(__dirname, '../../../simple_vector_data.json');
    this.data = {
      documents: [],
      embeddings: [],
      metadatas: [],
      ids: []
    };
    this.isInitialized = false;
  }

  async initialize() {
    try {
      // 尝试加载现有数据
      if (fs.existsSync(this.dataPath)) {
        const fileContent = fs.readFileSync(this.dataPath, 'utf8').trim();
        
        // 检查文件是否为空或只包含空白字符
        if (fileContent) {
          try {
            this.data = JSON.parse(fileContent);
            console.log(`已加载 ${this.data.ids.length} 条现有数据`);
          } catch (parseError) {
            console.warn('数据文件格式无效，使用默认空数据结构');
            this.data = {
              documents: [],
              embeddings: [],
              metadatas: [],
              ids: []
            };
          }
        } else {
          console.log('数据文件为空，使用默认空数据结构');
          this.data = {
            documents: [],
            embeddings: [],
            metadatas: [],
            ids: []
          };
        }
      } else {
        console.log('数据文件不存在，使用默认空数据结构');
      }
      
      this.isInitialized = true;
      console.log('简单向量存储初始化完成');
    } catch (error) {
      console.error('简单向量存储初始化失败:', error);
      throw new Error(`简单向量存储初始化失败: ${error.message}`);
    }
  }

  async addDocuments(documents, embeddings, metadatas, ids) {
    if (!this.isInitialized) {
      throw new Error('向量存储未初始化');
    }

    try {
      const documentIds = ids || documents.map(() => uuidv4());

      // 添加到内存中的数据结构
      for (let i = 0; i < documents.length; i++) {
        this.data.documents.push(documents[i]);
        this.data.embeddings.push(embeddings[i]);
        this.data.metadatas.push(metadatas[i]);
        this.data.ids.push(documentIds[i]);
      }

      // 保存到文件
      await this.saveData();

      console.log(`已添加 ${documents.length} 个文档到简单向量存储`);
      return documentIds;
    } catch (error) {
      console.error('添加文档失败:', error);
      throw new Error(`添加文档失败: ${error.message}`);
    }
  }

  async queryDocuments(queryEmbedding, nResults = 3, where = null) {
    if (!this.isInitialized) {
      throw new Error('向量存储未初始化');
    }

    try {
      // 计算余弦相似度
      const similarities = this.data.embeddings.map((embedding, index) => ({
        index,
        similarity: this.cosineSimilarity(queryEmbedding, embedding),
        distance: 1 - this.cosineSimilarity(queryEmbedding, embedding)
      }));

      // 按相似度排序
      similarities.sort((a, b) => b.similarity - a.similarity);

      // 取前N个结果
      const topResults = similarities.slice(0, nResults);

      return {
        ids: topResults.map(r => this.data.ids[r.index]),
        documents: topResults.map(r => this.data.documents[r.index]),
        metadatas: topResults.map(r => this.data.metadatas[r.index]),
        distances: topResults.map(r => r.distance)
      };
    } catch (error) {
      console.error('查询文档失败:', error);
      throw new Error(`查询文档失败: ${error.message}`);
    }
  }

  async updateDocument(id, document, embedding, metadata) {
    if (!this.isInitialized) {
      throw new Error('向量存储未初始化');
    }

    try {
      const index = this.data.ids.indexOf(id);
      if (index === -1) {
        throw new Error(`文档ID ${id} 不存在`);
      }

      this.data.documents[index] = document;
      this.data.embeddings[index] = embedding;
      this.data.metadatas[index] = metadata;

      await this.saveData();
      console.log(`已更新文档: ${id}`);
    } catch (error) {
      console.error('更新文档失败:', error);
      throw new Error(`更新文档失败: ${error.message}`);
    }
  }

  async deleteDocument(id) {
    if (!this.isInitialized) {
      throw new Error('向量存储未初始化');
    }

    try {
      const index = this.data.ids.indexOf(id);
      if (index === -1) {
        throw new Error(`文档ID ${id} 不存在`);
      }

      this.data.documents.splice(index, 1);
      this.data.embeddings.splice(index, 1);
      this.data.metadatas.splice(index, 1);
      this.data.ids.splice(index, 1);

      await this.saveData();
      console.log(`已删除文档: ${id}`);
    } catch (error) {
      console.error('删除文档失败:', error);
      throw new Error(`删除文档失败: ${error.message}`);
    }
  }

  async getCollection() {
    if (!this.isInitialized) {
      throw new Error('向量存储未初始化');
    }

    return {
      ids: [...this.data.ids],
      documents: [...this.data.documents],
      metadatas: [...this.data.metadatas]
    };
  }

  async countDocuments() {
    if (!this.isInitialized) {
      throw new Error('向量存储未初始化');
    }

    return this.data.ids.length;
  }

  isReady() {
    return this.isInitialized;
  }

  async testConnection() {
    return true; // 简单存储总是可用
  }

  // 保存数据到文件
  async saveData() {
    try {
      fs.writeFileSync(this.dataPath, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error('保存数据失败:', error);
      throw error;
    }
  }

  // 计算余弦相似度
  cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) {
      throw new Error('向量维度不匹配');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }
}

module.exports = SimpleVectorStore;