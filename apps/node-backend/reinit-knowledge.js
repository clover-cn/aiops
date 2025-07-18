console.log('=== 重新初始化知识库 ===');

const RAGSystem = require('./src/aiops/rag/index');

async function reinitializeKnowledge() {
  try {
    console.log('1. 初始化RAG系统...');
    const ragSystem = new RAGSystem();
    await ragSystem.initialize();
    
    console.log('2. 检查当前知识库状态...');
    const currentCount = await ragSystem.chromaClient.countDocuments();
    console.log(`当前知识库中有 ${currentCount} 条数据`);
    
    if (currentCount === 0) {
      console.log('3. 知识库为空，开始添加默认知识...');
      
      // 获取默认知识库数据
      const knowledgeBase = require('./src/aiops/rag/knowledge-base');
      const defaultKnowledge = knowledgeBase.getDefaultKnowledge();
      
      console.log(`准备添加 ${defaultKnowledge.length} 条默认知识...`);
      
      // 逐条添加知识
      for (let i = 0; i < defaultKnowledge.length; i++) {
        const knowledge = defaultKnowledge[i];
        console.log(`添加第 ${i + 1} 条: ${knowledge.intent} - ${knowledge.description}`);
        
        try {
          await ragSystem.addKnowledge(knowledge);
          console.log(`✓ 成功添加: ${knowledge.intent}`);
        } catch (error) {
          console.error(`✗ 添加失败: ${knowledge.intent} - ${error.message}`);
        }
      }
      
      console.log('4. 验证知识库初始化结果...');
      const finalCount = await ragSystem.chromaClient.countDocuments();
      console.log(`最终知识库中有 ${finalCount} 条数据`);
      
      if (finalCount > 0) {
        console.log('✓ 知识库初始化成功！');
        
        // 测试查询
        console.log('5. 测试查询功能...');
        const testResult = await ragSystem.query('检查服务状态');
        console.log(`测试查询结果: ${testResult.totalFound} 个匹配`);
        
        if (testResult.results.length > 0) {
          console.log(`最佳匹配: ${testResult.results[0].intent}`);
          console.log('✓ 查询功能正常！');
        }
      } else {
        console.log('✗ 知识库初始化失败，没有数据被添加');
      }
    } else {
      console.log('3. 知识库已有数据，无需重新初始化');
      
      // 显示现有知识
      console.log('4. 当前知识库内容:');
      const collection = await ragSystem.chromaClient.getCollection();
      collection.metadatas.forEach((meta, i) => {
        console.log(`  ${i + 1}. ${meta.intent}: ${meta.description}`);
      });
    }
    
    return true;
    
  } catch (error) {
    console.error('重新初始化失败:', error.message);
    console.error('详细错误:', error);
    return false;
  }
}

// 运行重新初始化
reinitializeKnowledge().then(success => {
  if (success) {
    console.log('\n=== 知识库重新初始化完成 ===');
    console.log('现在可以正常使用RAG查询接口了！');
  } else {
    console.log('\n=== 知识库重新初始化失败 ===');
    console.log('请检查错误信息并重试');
  }
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('初始化过程出错:', error);
  process.exit(1);
});