const config = require('./config');

class RetrievalService {
  constructor(chromaClient, embeddingService) {
    this.chromaClient = chromaClient;
    this.embeddingService = embeddingService;
  }

  async search(query, topK = config.retrieval.defaultTopK, threshold = config.retrieval.defaultThreshold) {
    try {
      // 生成查询向量
      const queryEmbedding = await this.embeddingService.getEmbedding(query);

      // 在向量数据库中搜索
      const results = await this.chromaClient.queryDocuments(queryEmbedding, topK);

      // 过滤低相似度结果
      const filteredResults = this.filterByThreshold(results, threshold);

      // 格式化结果
      const formattedResults = this.formatResults(filteredResults, query);

      return {
        success: true,
        query,
        results: formattedResults,
        totalFound: filteredResults.ids.length,
        threshold,
        topK
      };
    } catch (error) {
      console.error('检索失败:', error);
      throw new Error(`检索失败: ${error.message}`);
    }
  }

  filterByThreshold(results, threshold) {
    const { ids, documents, metadatas, distances } = results;
    
    // 将距离转换为相似度分数 (1 - distance)
    const similarities = distances.map(distance => 1 - distance);
    
    // 过滤低于阈值的结果
    const filteredIndices = similarities
      .map((similarity, index) => ({ similarity, index }))
      .filter(item => item.similarity >= threshold)
      .map(item => item.index);

    return {
      ids: filteredIndices.map(i => ids[i]),
      documents: filteredIndices.map(i => documents[i]),
      metadatas: filteredIndices.map(i => metadatas[i]),
      distances: filteredIndices.map(i => distances[i]),
      similarities: filteredIndices.map(i => similarities[i])
    };
  }

  formatResults(results, query) {
    const { ids, documents, metadatas, distances, similarities } = results;

    return ids.map((id, index) => {
      const metadata = metadatas[index];
      
      return {
        id,
        intent: metadata.intent,
        description: metadata.description,
        keywords: metadata.keywords ? metadata.keywords.split(',') : [],
        commandTemplate: metadata.commandTemplate,
        parameters: metadata.parameters ? JSON.parse(metadata.parameters) : [],
        riskLevel: metadata.riskLevel,
        category: metadata.category,
        examples: metadata.examples ? JSON.parse(metadata.examples) : [],
        similarity: similarities[index],
        distance: distances[index],
        document: documents[index],
        relevanceScore: this.calculateRelevanceScore(query, metadata, similarities[index])
      };
    }).sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  calculateRelevanceScore(query, metadata, similarity) {
    let score = similarity * 0.6; // 基础相似度权重60%

    // 关键词匹配加分 - 提高权重并优化匹配逻辑
    if (metadata.keywords) {
      const keywords = metadata.keywords.toLowerCase().split(',');
      const queryLower = query.toLowerCase();
      
      let keywordScore = 0;
      let exactMatches = 0;
      let partialMatches = 0;
      
      keywords.forEach(keyword => {
        const trimmedKeyword = keyword.trim();
        if (queryLower.includes(trimmedKeyword) || trimmedKeyword.includes(queryLower)) {
          if (queryLower === trimmedKeyword) {
            exactMatches++; // 完全匹配
          } else {
            partialMatches++; // 部分匹配
          }
        }
      });
      
      // 完全匹配给更高分数，部分匹配给较低分数
      keywordScore = (exactMatches * 0.3 + partialMatches * 0.15) / keywords.length;
      score += keywordScore * 0.3; // 关键词匹配权重30%
    }

    // 描述匹配加分
    if (metadata.description) {
      const descLower = metadata.description.toLowerCase();
      const queryLower = query.toLowerCase();
      
      // 检查查询词是否出现在描述中
      const queryWords = queryLower.split(/\s+/);
      const matchingWords = queryWords.filter(word =>
        word.length > 1 && descLower.includes(word)
      ).length;
      
      if (matchingWords > 0) {
        score += (matchingWords / queryWords.length) * 0.1; // 描述匹配权重10%
      }
    }

    return Math.min(score, 1.0); // 确保分数不超过1
  }

  async searchByCategory(query, category, topK = config.retrieval.defaultTopK, threshold = config.retrieval.defaultThreshold) {
    try {
      // 生成查询向量
      const queryEmbedding = await this.embeddingService.getEmbedding(query);

      // 在指定类别中搜索
      const results = await this.chromaClient.queryDocuments(
        queryEmbedding, 
        topK, 
        { category: { $eq: category } }
      );

      // 过滤低相似度结果
      const filteredResults = this.filterByThreshold(results, threshold);

      // 格式化结果
      const formattedResults = this.formatResults(filteredResults, query);

      return {
        success: true,
        query,
        category,
        results: formattedResults,
        totalFound: filteredResults.ids.length,
        threshold,
        topK
      };
    } catch (error) {
      console.error('分类检索失败:', error);
      throw new Error(`分类检索失败: ${error.message}`);
    }
  }

  async searchByRiskLevel(query, riskLevel, topK = config.retrieval.defaultTopK, threshold = config.retrieval.defaultThreshold) {
    try {
      // 生成查询向量
      const queryEmbedding = await this.embeddingService.getEmbedding(query);

      // 在指定风险级别中搜索
      const results = await this.chromaClient.queryDocuments(
        queryEmbedding, 
        topK, 
        { riskLevel: { $eq: riskLevel } }
      );

      // 过滤低相似度结果
      const filteredResults = this.filterByThreshold(results, threshold);

      // 格式化结果
      const formattedResults = this.formatResults(filteredResults, query);

      return {
        success: true,
        query,
        riskLevel,
        results: formattedResults,
        totalFound: filteredResults.ids.length,
        threshold,
        topK
      };
    } catch (error) {
      console.error('风险级别检索失败:', error);
      throw new Error(`风险级别检索失败: ${error.message}`);
    }
  }

  async getRecommendations(intent, topK = 5) {
    try {
      // 基于意图获取推荐
      const results = await this.chromaClient.queryDocuments(
        null, 
        topK, 
        { intent: { $ne: intent } } // 排除当前意图
      );

      // 格式化推荐结果
      const recommendations = results.ids.map((id, index) => {
        const metadata = results.metadatas[index];
        return {
          id,
          intent: metadata.intent,
          description: metadata.description,
          category: metadata.category,
          riskLevel: metadata.riskLevel
        };
      });

      return {
        success: true,
        recommendations,
        total: recommendations.length
      };
    } catch (error) {
      console.error('获取推荐失败:', error);
      throw new Error(`获取推荐失败: ${error.message}`);
    }
  }
}

module.exports = RetrievalService;