const { v4: uuidv4 } = require('uuid');

class KnowledgeBase {
  constructor(embeddingService, chromaClient) {
    this.embeddingService = embeddingService;
    this.chromaClient = chromaClient;
  }

  async initialize() {
    // 确保ChromaDB已初始化
    if (!this.chromaClient.isReady()) {
      await this.chromaClient.initialize();
    }

    // 检查是否需要初始化示例数据
    const count = await this.chromaClient.countDocuments();
    if (count === 0) {
      console.log('知识库为空，正在初始化示例数据...');
      await this.initializeDefaultKnowledge();
    }

    console.log('知识库管理模块初始化完成');
  }

  async addKnowledge(knowledgeData) {
    try {
      const {
        intent,
        description,
        keywords = [],
        commandTemplate,
        parameters = [],
        riskLevel = 'low',
        category = 'general',
        examples = []
      } = knowledgeData;

      // 验证必需字段
      if (!intent || !description) {
        throw new Error('意图和描述是必需字段');
      }

      // 构建文档内容
      const documentText = this.buildDocumentText({
        intent,
        description,
        keywords,
        commandTemplate,
        parameters,
        examples
      });

      // 生成嵌入向量
      const embedding = await this.embeddingService.getEmbedding(documentText);

      // 构建元数据
      const metadata = {
        intent,
        description,
        keywords: keywords.join(','),
        commandTemplate: commandTemplate || '',
        parameters: JSON.stringify(parameters),
        riskLevel,
        category,
        examples: JSON.stringify(examples),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // 生成唯一ID
      const id = uuidv4();

      // 添加到向量数据库
      await this.chromaClient.addDocuments(
        [documentText],
        [embedding],
        [metadata],
        [id]
      );

      console.log(`已添加知识条目: ${intent}`);
      return { id, success: true };
    } catch (error) {
      console.error('添加知识失败:', error);
      throw new Error(`添加知识失败: ${error.message}`);
    }
  }

  async updateKnowledge(id, knowledgeData) {
    try {
      const {
        intent,
        description,
        keywords = [],
        commandTemplate,
        parameters = [],
        riskLevel = 'low',
        category = 'general',
        examples = []
      } = knowledgeData;

      // 构建文档内容
      const documentText = this.buildDocumentText({
        intent,
        description,
        keywords,
        commandTemplate,
        parameters,
        examples
      });

      // 生成嵌入向量
      const embedding = await this.embeddingService.getEmbedding(documentText);

      // 构建元数据
      const metadata = {
        intent,
        description,
        keywords: keywords.join(','),
        commandTemplate: commandTemplate || '',
        parameters: JSON.stringify(parameters),
        riskLevel,
        category,
        examples: JSON.stringify(examples),
        updatedAt: new Date().toISOString()
      };

      // 更新向量数据库
      await this.chromaClient.updateDocument(id, documentText, embedding, metadata);

      console.log(`已更新知识条目: ${id}`);
      return { success: true };
    } catch (error) {
      console.error('更新知识失败:', error);
      throw new Error(`更新知识失败: ${error.message}`);
    }
  }

  async deleteKnowledge(id) {
    try {
      await this.chromaClient.deleteDocument(id);
      console.log(`已删除知识条目: ${id}`);
      return { success: true };
    } catch (error) {
      console.error('删除知识失败:', error);
      throw new Error(`删除知识失败: ${error.message}`);
    }
  }

  async listKnowledge() {
    try {
      const result = await this.chromaClient.getCollection();
      
      const knowledgeList = result.ids.map((id, index) => ({
        id,
        document: result.documents[index],
        metadata: result.metadatas[index]
      }));

      return {
        success: true,
        data: knowledgeList,
        total: knowledgeList.length
      };
    } catch (error) {
      console.error('获取知识列表失败:', error);
      throw new Error(`获取知识列表失败: ${error.message}`);
    }
  }

  buildDocumentText(knowledgeData) {
    const {
      intent,
      description,
      keywords,
      commandTemplate,
      parameters,
      examples
    } = knowledgeData;

    let text = `意图: ${intent}\n描述: ${description}`;
    
    if (keywords && keywords.length > 0) {
      text += `\n关键词: ${keywords.join(', ')}`;
    }
    
    if (commandTemplate) {
      text += `\n命令模板: ${commandTemplate}`;
    }
    
    if (parameters && parameters.length > 0) {
      text += `\n参数: ${parameters.map(p => `${p.name}(${p.type})`).join(', ')}`;
    }
    
    if (examples && examples.length > 0) {
      text += `\n示例: ${examples.join('; ')}`;
    }

    return text;
  }

  async initializeDefaultKnowledge() {
    const defaultKnowledge = [
      {
        intent: 'server:check_status',
        description: '检查服务器上服务的运行状态',
        keywords: ['检查状态', '服务状态', '运行情况', '是否正常', '挂了没'],
        commandTemplate: 'ssh ${user}@${server_ip} "systemctl status ${service_name}"',
        parameters: [
          { name: 'user', type: 'string', default: 'root' },
          { name: 'server_ip', type: 'string', required: true },
          { name: 'service_name', type: 'string', required: true }
        ],
        riskLevel: 'low',
        category: 'monitoring',
        examples: ['检查支付服务状态', '看看用户服务是否正常', '支付服务挂了没']
      },
      // {
      //   intent: 'server:restart_service',
      //   description: '重启服务器上的指定服务',
      //   keywords: ['重启服务', '重启', '重新启动', 'restart'],
      //   commandTemplate: 'ssh ${user}@${server_ip} "systemctl restart ${service_name}"',
      //   parameters: [
      //     { name: 'user', type: 'string', default: 'root' },
      //     { name: 'server_ip', type: 'string', required: true },
      //     { name: 'service_name', type: 'string', required: true }
      //   ],
      //   riskLevel: 'high',
      //   category: 'operation',
      //   examples: ['重启支付服务', '重新启动用户服务', '重启nginx']
      // },
      // {
      //   intent: 'server:view_logs',
      //   description: '查看服务器上服务的日志',
      //   keywords: ['查看日志', '日志', 'log', '查日志'],
      //   commandTemplate: 'ssh ${user}@${server_ip} "journalctl -u ${service_name} -n ${lines}"',
      //   parameters: [
      //     { name: 'user', type: 'string', default: 'root' },
      //     { name: 'server_ip', type: 'string', required: true },
      //     { name: 'service_name', type: 'string', required: true },
      //     { name: 'lines', type: 'number', default: 100 }
      //   ],
      //   riskLevel: 'low',
      //   category: 'monitoring',
      //   examples: ['查看支付服务日志', '看看用户服务最近的日志', '查看最近200行日志']
      // },
      // {
      //   intent: 'server:check_disk_usage',
      //   description: '检查服务器磁盘使用情况',
      //   keywords: ['磁盘使用', '磁盘空间', '存储空间', '硬盘使用'],
      //   commandTemplate: 'ssh ${user}@${server_ip} "df -h"',
      //   parameters: [
      //     { name: 'user', type: 'string', default: 'root' },
      //     { name: 'server_ip', type: 'string', required: true }
      //   ],
      //   riskLevel: 'low',
      //   category: 'monitoring',
      //   examples: ['检查磁盘使用情况', '看看硬盘空间', '磁盘还有多少空间']
      // },
      // {
      //   intent: 'server:check_memory',
      //   description: '检查服务器内存使用情况',
      //   keywords: ['内存使用', '内存情况', 'memory', '内存占用'],
      //   commandTemplate: 'ssh ${user}@${server_ip} "free -h"',
      //   parameters: [
      //     { name: 'user', type: 'string', default: 'root' },
      //     { name: 'server_ip', type: 'string', required: true }
      //   ],
      //   riskLevel: 'low',
      //   category: 'monitoring',
      //   examples: ['检查内存使用情况', '看看内存占用', '内存还剩多少']
      // }
    ];

    for (const knowledge of defaultKnowledge) {
      await this.addKnowledge(knowledge);
    }

    console.log(`已初始化 ${defaultKnowledge.length} 条默认知识`);
  }
}

module.exports = KnowledgeBase;