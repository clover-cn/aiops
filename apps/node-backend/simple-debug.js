console.log('开始调试...');

const fs = require('fs');
const path = require('path');

// 检查数据文件
const dataPath = path.join(__dirname, 'simple_vector_data.json');
console.log('数据文件路径:', dataPath);
console.log('数据文件存在:', fs.existsSync(dataPath));

if (fs.existsSync(dataPath)) {
  try {
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    console.log('数据文件内容:');
    console.log('- 文档数量:', data.documents?.length || 0);
    console.log('- 向量数量:', data.embeddings?.length || 0);
    console.log('- 元数据数量:', data.metadatas?.length || 0);
    console.log('- ID数量:', data.ids?.length || 0);
    
    if (data.metadatas && data.metadatas.length > 0) {
      console.log('\n前3个文档的元数据:');
      data.metadatas.slice(0, 3).forEach((meta, i) => {
        console.log(`${i+1}. 意图: ${meta.intent}`);
        console.log(`   描述: ${meta.description}`);
        console.log(`   关键词: ${meta.keywords}`);
      });
    }
    
    // 检查向量维度
    if (data.embeddings && data.embeddings.length > 0) {
      console.log('\n向量信息:');
      console.log('- 第一个向量维度:', data.embeddings[0]?.length || 0);
      console.log('- 第一个向量前5个值:', data.embeddings[0]?.slice(0, 5) || []);
    }
    
  } catch (error) {
    console.error('读取数据文件失败:', error.message);
  }
}

// 测试嵌入服务
console.log('\n测试嵌入服务...');
const EmbeddingService = require('./src/aiops/rag/embedding-service');

async function testEmbedding() {
  try {
    const embeddingService = new EmbeddingService();
    console.log('嵌入服务创建成功');
    
    const testText = '支付服务状态';
    console.log(`测试文本: "${testText}"`);
    
    const embedding = await embeddingService.getEmbedding(testText);
    console.log('嵌入向量生成成功');
    console.log('- 向量维度:', embedding.length);
    console.log('- 前5个值:', embedding.slice(0, 5).map(v => v.toFixed(4)));
    
  } catch (error) {
    console.error('嵌入服务测试失败:', error.message);
  }
}

testEmbedding().then(() => {
  console.log('\n调试完成');
}).catch(error => {
  console.error('调试失败:', error);
});