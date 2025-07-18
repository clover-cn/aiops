const express = require('express');
const router = express.Router();
const RAGSystem = require('../../aiops/rag/index');
const config = require('../../aiops/rag/config');

// 初始化RAG系统
let ragSystem = null;

// 初始化RAG系统
async function initializeRAG() {
  if (!ragSystem) {
    ragSystem = new RAGSystem();
    await ragSystem.initialize();
  }
  return ragSystem;
}

// RAG查询接口
router.post('/query', async (req, res) => {
  try {
    const { query, topK = config.retrieval.defaultTopK, threshold = config.retrieval.defaultThreshold } = req.body;

    if (!query) {
      return res.status(400).json({
        code: -1,
        data: null,
        error: '查询内容不能为空',
        message: 'Query is required'
      });
    }

    // 确保RAG系统已初始化
    const rag = await initializeRAG();

    // 执行RAG查询
    const result = await rag.query(query, { topK, threshold });

    res.json({
      code: 0,
      data: result,
      error: null,
      message: 'success'
    });
  } catch (error) {
    console.error('RAG查询失败:', error);
    res.status(500).json({
      code: -1,
      data: null,
      error: error.message,
      message: 'RAG查询失败'
    });
  }
});

// 添加知识条目
router.post('/knowledge', async (req, res) => {
  try {
    const knowledgeData = req.body;

    // 确保RAG系统已初始化
    const rag = await initializeRAG();

    // 添加知识
    const result = await rag.addKnowledge(knowledgeData);

    res.json({
      code: 0,
      data: result,
      error: null,
      message: '知识添加成功'
    });
  } catch (error) {
    console.error('添加知识失败:', error);
    res.status(500).json({
      code: -1,
      data: null,
      error: error.message,
      message: '添加知识失败'
    });
  }
});

// 更新知识条目
router.put('/knowledge/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const knowledgeData = req.body;

    // 确保RAG系统已初始化
    const rag = await initializeRAG();

    // 更新知识
    const result = await rag.updateKnowledge(id, knowledgeData);

    res.json({
      code: 0,
      data: result,
      error: null,
      message: '知识更新成功'
    });
  } catch (error) {
    console.error('更新知识失败:', error);
    res.status(500).json({
      code: -1,
      data: null,
      error: error.message,
      message: '更新知识失败'
    });
  }
});

// 删除知识条目
router.delete('/knowledge/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 确保RAG系统已初始化
    const rag = await initializeRAG();

    // 删除知识
    const result = await rag.deleteKnowledge(id);

    res.json({
      code: 0,
      data: result,
      error: null,
      message: '知识删除成功'
    });
  } catch (error) {
    console.error('删除知识失败:', error);
    res.status(500).json({
      code: -1,
      data: null,
      error: error.message,
      message: '删除知识失败'
    });
  }
});

// 获取知识列表
router.get('/knowledge', async (req, res) => {
  try {
    // 确保RAG系统已初始化
    const rag = await initializeRAG();

    // 获取知识列表
    const result = await rag.listKnowledge();

    res.json({
      code: 0,
      data: result,
      error: null,
      message: 'success'
    });
  } catch (error) {
    console.error('获取知识列表失败:', error);
    res.status(500).json({
      code: -1,
      data: null,
      error: error.message,
      message: '获取知识列表失败'
    });
  }
});

// 分类检索
router.post('/search/category', async (req, res) => {
  try {
    const { query, category, topK = config.retrieval.defaultTopK, threshold = config.retrieval.defaultThreshold } = req.body;

    if (!query || !category) {
      return res.status(400).json({
        code: -1,
        data: null,
        error: '查询内容和分类不能为空',
        message: 'Query and category are required'
      });
    }

    // 确保RAG系统已初始化
    const rag = await initializeRAG();

    // 执行分类检索
    const result = await rag.retrievalService.searchByCategory(query, category, topK, threshold);

    res.json({
      code: 0,
      data: result,
      error: null,
      message: 'success'
    });
  } catch (error) {
    console.error('分类检索失败:', error);
    res.status(500).json({
      code: -1,
      data: null,
      error: error.message,
      message: '分类检索失败'
    });
  }
});

// 风险级别检索
router.post('/search/risk', async (req, res) => {
  try {
    const { query, riskLevel, topK = config.retrieval.defaultTopK, threshold = config.retrieval.defaultThreshold } = req.body;

    if (!query || !riskLevel) {
      return res.status(400).json({
        code: -1,
        data: null,
        error: '查询内容和风险级别不能为空',
        message: 'Query and risk level are required'
      });
    }

    // 确保RAG系统已初始化
    const rag = await initializeRAG();

    // 执行风险级别检索
    const result = await rag.retrievalService.searchByRiskLevel(query, riskLevel, topK, threshold);

    res.json({
      code: 0,
      data: result,
      error: null,
      message: 'success'
    });
  } catch (error) {
    console.error('风险级别检索失败:', error);
    res.status(500).json({
      code: -1,
      data: null,
      error: error.message,
      message: '风险级别检索失败'
    });
  }
});

// 获取推荐
router.get('/recommendations/:intent', async (req, res) => {
  try {
    const { intent } = req.params;
    const { topK = 5 } = req.query;

    // 确保RAG系统已初始化
    const rag = await initializeRAG();

    // 获取推荐
    const result = await rag.retrievalService.getRecommendations(intent, parseInt(topK));

    res.json({
      code: 0,
      data: result,
      error: null,
      message: 'success'
    });
  } catch (error) {
    console.error('获取推荐失败:', error);
    res.status(500).json({
      code: -1,
      data: null,
      error: error.message,
      message: '获取推荐失败'
    });
  }
});

// RAG系统状态检查
router.get('/status', async (req, res) => {
  try {
    const isInitialized = ragSystem !== null;
    let chromaStatus = false;
    let knowledgeCount = 0;

    if (isInitialized) {
      chromaStatus = ragSystem.chromaClient.isReady();
      if (chromaStatus) {
        knowledgeCount = await ragSystem.chromaClient.countDocuments();
      }
    }

    res.json({
      code: 0,
      data: {
        initialized: isInitialized,
        chromaReady: chromaStatus,
        knowledgeCount,
        embeddingModel: 'Pro/BAAI/bge-m3',
        embeddingDimension: 1024,
        timestamp: new Date().toISOString()
      },
      error: null,
      message: 'success'
    });
  } catch (error) {
    console.error('获取RAG状态失败:', error);
    res.status(500).json({
      code: -1,
      data: null,
      error: error.message,
      message: '获取RAG状态失败'
    });
  }
});

module.exports = router;