const axios = require('axios');
const config = require('./config');

class EmbeddingService {
  constructor() {
    this.apiUrl = config.embedding.apiUrl;
    this.apiKey = config.embedding.apiKey;
    this.modelName = config.embedding.modelName;
    this.dimension = config.embedding.dimension;
    this.timeout = config.embedding.timeout;
  }

  async getEmbedding(text) {
    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model: this.modelName,
          input: text,
          encoding_format: 'float'
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: this.timeout
        }
      );

      if (response.data && response.data.data && response.data.data.length > 0) {
        return response.data.data[0].embedding;
      } else {
        throw new Error('嵌入响应格式无效');
      }
    } catch (error) {
      console.error('获取嵌入向量失败:', error.message);
      if (error.response) {
        console.error('API响应错误:', error.response.data);
      }
      throw new Error(`嵌入服务错误: ${error.message}`);
    }
  }

  async getEmbeddings(texts) {
    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model: this.modelName,
          input: texts,
          encoding_format: 'float'
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: this.timeout * 2
        }
      );

      if (response.data && response.data.data) {
        return response.data.data.map(item => item.embedding);
      } else {
        throw new Error('批量嵌入响应格式无效');
      }
    } catch (error) {
      console.error('批量获取嵌入向量失败:', error.message);
      if (error.response) {
        console.error('API响应错误:', error.response.data);
      }
      throw new Error(`批量嵌入服务错误: ${error.message}`);
    }
  }

  getDimension() {
    return this.dimension;
  }

  getModelName() {
    return this.modelName;
  }
}

module.exports = EmbeddingService;