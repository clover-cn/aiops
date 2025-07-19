<script lang="ts" setup>
import { ref, computed, nextTick, watch } from 'vue';
import {
  Modal,
  Input,
  Button,
  Avatar,
  Spin,
  message,
  InputNumber,
  Tooltip,
  Divider,
} from 'ant-design-vue';
import { IconifyIcon } from '@vben/icons';
import {
  sendChatMessageStream,
  type ChatMessage as ApiChatMessage,
  ragQueryApi,
} from '#/api/index';
import { getExecuteCommandApi } from '#/api/index';
import MarkdownRenderer from './MarkdownRenderer.vue';
interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  isTyping?: boolean;
  isExecuting?: boolean;
  isServerCommand?: boolean;
  commandData?: any;
  commandOutput?: string;
  aiSummary?: string;
  isSummaryTyping?: boolean;
}

defineOptions({ name: 'AiChatDialog' });

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
  close: [];
}>();

const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value),
});

const inputMessage = ref('');
const messages = ref<ChatMessage[]>([
  {
    id: '1',
    type: 'ai',
    content:
      '您好！我是AI助手，我可以帮您解答关于系统运维、技术问题或其他任何疑问。请随时提问！',
    timestamp: new Date(),
  },
]);
const loading = ref(false);
const messagesContainer = ref<HTMLElement>();

// 上下文设置
const contextLimit = ref(6); // 默认保留10条上下文
const showSettings = ref(false); // 控制设置面板显示

// 构建带上下文限制的对话历史
const buildChatHistory = (systemPrompt: string): ApiChatMessage[] => {
  // 过滤掉正在输入和执行中的消息
  const validMessages = messages.value.filter(
    (msg) => !msg.isTyping && !msg.isExecuting,
  );

  // 转换为API格式
  const apiMessages: ApiChatMessage[] = validMessages.map((msg) => {
    let content = msg.content;

    // 如果是服务器命令消息且有AI总结，只使用AI总结作为上下文
    if (msg.isServerCommand && msg.aiSummary) {
      content = msg.aiSummary;
    }

    return {
      role: msg.type === 'user' ? ('user' as const) : ('assistant' as const),
      content: content,
    };
  });

  // 如果消息数量超过限制，进行截断（但保留system消息）
  let finalMessages: ApiChatMessage[];
  if (apiMessages.length > contextLimit.value) {
    // 保留最新的contextLimit.value条消息
    finalMessages = apiMessages.slice(-contextLimit.value);
  } else {
    finalMessages = apiMessages;
  }

  // 始终在开头添加system消息
  return [
    {
      role: 'system' as const,
      content: systemPrompt,
    },
    ...finalMessages,
  ];
};

const handleSendMessage = async () => {
  if (!inputMessage.value.trim()) {
    return;
  }

  const userMessage: ChatMessage = {
    id: Date.now().toString(),
    type: 'user',
    content: inputMessage.value.trim(),
    timestamp: new Date(),
  };

  messages.value.push(userMessage);
  inputMessage.value = '';

  // 滚动到底部
  await nextTick();
  scrollToBottom();

  // AI回复
  loading.value = true;
  try {
    await simulateAiResponse(userMessage.content);
  } catch (error) {
    message.error('AI回复失败，请重试');
  } finally {
    // 确保loading状态被清除（虽然在simulateAiResponse中也会设置）
    loading.value = false;
  }
};

// 生成AI对命令结果的总结（合并到现有消息中）
const generateCommandSummary = async (
  resultMessage: ChatMessage,
  commandData: any,
  commandOutput: string,
) => {
  try {
    // 构建总结提示词
    const summaryPrompt = `请对以下命令执行结果进行分析和总结，用简洁明了的中文回复用户：

    命令信息：
    - 命令类型：${commandData.commands.type}
    - 执行命令：${commandData.commands.command}
    - 命令描述：${commandData.commands.description}

    执行结果：
    ${commandOutput}

    请分析这个结果并给出：
    1. 命令执行状态（成功/失败）
    2. 关键信息摘要
    3. 如果有异常或需要注意的地方，请指出
    4. 如果是系统监控类命令，请解读关键指标

    请用友好、专业的语气回复，不要重复显示原始命令输出。`;

    const summaryHistory: ApiChatMessage[] = [
      {
        role: 'system' as const,
        content:
          '你是一个专业的运维助手，擅长分析命令执行结果并给出简洁明了的总结。请用中文回复，语气要友好专业。',
      },
      {
        role: 'user' as const,
        content: summaryPrompt,
      },
    ];

    // 使用流式API获取总结
    const summaryGenerator = sendChatMessageStream(summaryHistory, {
      temperature: 0.3,
      max_tokens: 1000,
    });

    let summaryContent = '';

    // 找到结果消息的索引
    const messageIndex = messages.value.findIndex(
      (msg) => msg.id === resultMessage.id,
    );

    if (messageIndex === -1) return;

    // 设置总结正在生成状态
    messages.value[messageIndex]!.isSummaryTyping = true;
    messages.value[messageIndex]!.aiSummary = '';

    for await (const chunk of summaryGenerator) {
      summaryContent += chunk;

      // 更新消息的AI总结内容，实现打字机效果
      messages.value[messageIndex]!.aiSummary = summaryContent;
      await nextTick();
      scrollToBottom();

      // 添加打字机延迟效果
      const delay = Math.min(30, Math.max(10, chunk.length * 2));
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    // 完成总结，移除typing状态
    messages.value[messageIndex]!.aiSummary = summaryContent;
    messages.value[messageIndex]!.isSummaryTyping = false;
    await nextTick();
    scrollToBottom();
  } catch (error) {
    console.error('生成命令总结失败:', error);
    // 如果总结失败，设置错误提示
    const messageIndex = messages.value.findIndex(
      (msg) => msg.id === resultMessage.id,
    );
    if (messageIndex !== -1) {
      messages.value[messageIndex]!.aiSummary = '命令已执行完成，但生成结果总结时出现问题。您可以查看上方的执行结果详情。';
      messages.value[messageIndex]!.isSummaryTyping = false;
      await nextTick();
      scrollToBottom();
    }
  }
};

// 构建基于RAG检索结果的动态Prompt
const buildRAGPrompt = async (userInput: string): Promise<string> => {
  try {
    // 使用RAG检索相关知识
    const ragResult = await ragQueryApi({
      query: userInput,
      topK: 3,
      threshold: 0.55,
    });

    const System = import.meta.env.VITE_CHAT_SYSTEM;

    // 基础系统提示词
    let systemPrompt = `你是一个专业的智能运维助手（AI-Ops Assistant）。

## 核心职责
你的核心职责是深入理解用户的运维需求和对话历史，将其转化为结构化的意图（Intent）和参数（Parameters）。你绝不能自己编造或直接生成最终的系统命令。

## 工作流程
1. **分析输入**: 结合用户的最新输入和下面的"对话历史"，识别其核心意图。
2. **参考知识**: 在用户输入中提到的服务和操作，必须严格参考下面提供的"相关知识库摘录"来确定其标准意图和可用参数。
3. **提取参数**: 如果用户提供了具体参数（如行数、文件名），请准确提取。如果未提供，则使用知识库中定义的默认值。
4. **生成JSON**: 严格按照指定的JSON格式返回结果。
5. **处理未知**: 如果无法在知识库中找到匹配项，或信息不足，请向用户澄清，不要猜测。
6. **普通对话**: 对于非运维请求，用自然语言友好回复。

## 相关知识库摘录`;

    // 如果RAG检索成功且有结果，添加检索到的知识
    if (
      ragResult.relevantKnowledge.success &&
      ragResult.relevantKnowledge.results.length > 0
    ) {
      systemPrompt += `\n基于您的输入"${userInput}"，我找到了以下相关的运维知识：\n`;

      ragResult.relevantKnowledge.results.forEach((metadata: any, index) => {
        console.log(`知识条目 ${index + 1} 知识条目名称: ${metadata.description} 相似度: ${metadata.similarity}`);

        systemPrompt += `\n### 知识条目 ${index + 1} (相似度: ${(metadata.similarity * 100).toFixed(1)}%)
- **意图标识**: ${metadata.intent}
- **描述**: ${metadata.description}
- **关键词**: ${metadata.keywords}
- **命令模板**: ${metadata.commandTemplate}
- **风险级别**: ${metadata.riskLevel}
- **分类**: ${metadata.category}`;

        if (metadata.parameters) {
          try {
            const params = JSON.parse(metadata.parameters);
            if (params.length > 0) {
              systemPrompt += `\n- **参数**: ${params.map((p: any) => `${p.name}(${p.type})`).join(', ')}`;
            }
          } catch (e) {
            // 忽略参数解析错误
          }
        }

        if (metadata.examples) {
          try {
            const examples = JSON.parse(metadata.examples);
            if (examples.length > 0) {
              systemPrompt += `\n- **示例**: ${examples.join(', ')}`;
            }
          } catch (e) {
            // 忽略示例解析错误
          }
        }
        systemPrompt += '\n';
      });

      // 添加统一的响应格式说明
      systemPrompt += `\n## 响应格式
      **运维命令**：仅返回JSON格式，无需任何前缀文字
      \`\`\`json
      {
        "intent": "操作意图",
        "commands": {
          "type": "系统类型(${System})",
          "command": "具体命令",
          "description": "命令说明"
        },
        "requiresApproval": 是否需要人工确认(true/false),
        "riskLevel": "low/medium/high",
        "isCommand": true
      }
      \`\`\`
      **普通对话**：直接自然语言回复

      ## 重要提醒
      1. 只有明确的运维操作请求才返回JSON格式
      2. 告别和问候等社交语句正常回复
      3. 不确定时主动询问，避免误判
      4. 运维命令返回JSON时不要添加任何解释文字`;
    } else {
      console.log('RAG检索未找到相关知识，使用默认提示词');

      // 如果没有找到相关知识，提供基本指导
      systemPrompt = `你是一个专业的智能运维助手（AI-Ops Assistant）。。
      ## 核心职责
      帮助用户处理系统运维操作和回答技术问题。
      ## 意图识别规则
      ### 运维命令（返回JSON格式）
      当用户明确请求以下操作时：
      - 系统操作：重启服务、关机、启动程序、停止服务
      - 监控查询：检查状态、查看日志、性能监控、查看进程
      - 故障排查：诊断问题、测试连接、检查配置
      - 资源管理：文件操作、进程管理、网络配置
      ### 普通对话（自然语言回复）
      - 问候告别：你好、再见、谢谢、不客气、好的等
      - 技术咨询：非直接操作的技术问题和概念解释
      - 不确定意图：主动询问澄清用户需求
      ## 响应格式
      **运维命令**：仅返回JSON格式，无需任何前缀文字
      \`\`\`json
      {
        "intent": "操作意图",
        "commands": {
          "type": "系统类型(${System})",
          "command": "具体命令",
          "description": "命令说明"
        },
        "requiresApproval": 是否需要人工确认(true/false),
        "riskLevel": "low/medium/high",
        "isCommand": true
      }
      \`\`\`
      **普通对话**：直接自然语言回复
      ## 特殊情况处理
      - 告别语句（再见、拜拜、好的等）：友好告别回复
      - 问候语句：正常寒暄回复
      - 模糊意图：主动询问用户具体需求
      - 非运维相关技术问题：提供解释和建议
      ## 重要提醒
      1. 只有明确的运维操作请求才返回JSON格式
      2. 告别和问候等社交语句正常回复
      3. 不确定时主动询问，避免误判
      4. 运维命令返回JSON时不要添加任何解释文字
      `;
    }
    return systemPrompt;
  } catch (error) {
    console.error('RAG检索失败，使用基础提示词:', error);

    // 如果RAG检索失败，返回基础的系统提示词
    // const System = import.meta.env.VITE_CHAT_SYSTEM;
    return `你是一个专业的智能运维助手（AI-Ops Assistant）。

## 核心职责
你的核心职责是理解用户的运维需求，但由于知识库暂时不可用，我只能提供基本的对话支持。

## 当前状态
知识库检索服务暂时不可用，我无法执行具体的运维操作。请稍后重试，或联系管理员检查RAG系统状态。

## 响应方式
请用自然语言友好地回复用户，说明当前系统状态，并建议用户稍后重试。`;
  }
};

const simulateAiResponse = async (userInput: string) => {
  try {
    // 使用RAG构建动态系统提示词
    const systemPrompt = await buildRAGPrompt(userInput);
    // 构建对话历史（包含刚刚添加的用户消息）
    const chatHistory = buildChatHistory(systemPrompt);
    // 使用流式API获取回复
    const streamGenerator = sendChatMessageStream(chatHistory, {
      temperature: 0.7,
      max_tokens: 2000,
    });

    let fullContent = '';
    let aiMessage: ChatMessage | null = null;
    let isFirstChunk = true;

    try {
      for await (const chunk of streamGenerator) {
        // console.log('接收到AI回复的分块数据:', chunk);

        // 第一次收到数据时，隐藏加载状态并创建AI消息
        if (isFirstChunk) {
          loading.value = false; // 隐藏"AI正在思考中..."

          aiMessage = {
            id: Date.now().toString(),
            type: 'ai',
            content: '',
            timestamp: new Date(),
            isTyping: true,
          };

          messages.value.push(aiMessage);
          await nextTick();
          scrollToBottom();
          isFirstChunk = false;
        }

        fullContent += chunk;

        // 更新消息内容，实现打字机效果
        if (aiMessage) {
          const messageIndex = messages.value.findIndex(
            (msg) => msg.id === aiMessage!.id,
          );
          if (messageIndex !== -1) {
            messages.value[messageIndex]!.content = fullContent;
            await nextTick();
            scrollToBottom();

            // 添加打字机延迟效果（根据内容长度动态调整）
            const delay = Math.min(50, Math.max(10, chunk.length * 2));
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }
    } catch (streamError) {
      console.error('流式数据处理错误:', streamError);
      // 如果流式处理出错，但已经有部分内容，保留已有内容
      if (aiMessage && fullContent) {
        console.log('保留已接收的内容:', fullContent);
      } else {
        throw streamError; // 如果没有任何内容，重新抛出错误
      }
    }

    // 确保最终内容被正确设置并移除typing状态
    if (aiMessage) {
      const messageIndex = messages.value.findIndex(
        (msg) => msg.id === aiMessage.id,
      );
      if (messageIndex !== -1) {
        // 最后一次更新内容，确保所有数据都被保存
        messages.value[messageIndex]!.content = fullContent;
        messages.value[messageIndex]!.isTyping = false;
        await nextTick();
        scrollToBottom();
        input_focus.value?.focus();
        // console.log('AI回复完成，最终内容长度:', fullContent.length);
        // console.log('最终内容:', fullContent);
        const match = fullContent.match(/```json([\s\S]*?)```/);
        if (match) {
          const jsonContent = match?.[1]?.trim();
          let jsonData = JSON.parse(jsonContent as string);
          if (jsonData.isCommand) {
            console.log('AI回复的JSON数据:', jsonData);
            console.log('执行命令:', jsonData.commands.command);
            // 移除包含JSON数据的AI消息，直接显示执行状态
            const jsonMessageIndex = messages.value.findIndex(
              (msg) => msg.id === aiMessage.id,
            );
            if (jsonMessageIndex !== -1) {
              messages.value.splice(jsonMessageIndex, 1);
            }

            // 添加正在执行命令的消息
            const executingMessage: ChatMessage = {
              id: Date.now().toString() + '_executing',
              type: 'ai',
              content: '命令执行中...',
              timestamp: new Date(),
              isTyping: false,
              isExecuting: true,
              commandData: jsonData,
            };

            messages.value.push(executingMessage);
            await nextTick();
            scrollToBottom();
            let res = await getExecuteCommandApi(jsonData.commands.command);
            console.log('命令执行结果:', res);
            // 移除执行中的消息
            const executingIndex = messages.value.findIndex(
              (msg) => msg.id === executingMessage.id,
            );
            if (executingIndex !== -1) {
              messages.value.splice(executingIndex, 1);
            }
            const Command = `${jsonData.commands.type}命令执行结果:
    - 命令: ${jsonData.commands.command}
    - 描述: ${jsonData.commands.description}
    - 风险级别: ${jsonData.riskLevel}
    - 执行结果: ${res.result.output || '无输出'}
    - 执行状态: ${res.result.success ? '成功' : '失败'}
    - 执行时间: ${res.result.timestamp}`;
            // 添加执行结果消息
            const resultMessage: ChatMessage = {
              id: Date.now().toString() + '_result',
              type: 'ai',
              content: res.result.output || Command,
              timestamp: new Date(),
              isTyping: false,
              isServerCommand: true,
              commandData: jsonData,
            };
            messages.value.push(resultMessage);
            await nextTick();
            scrollToBottom();

            if (res.result.output) {
              // 生成AI对命令结果的总结
              await generateCommandSummary(resultMessage, jsonData, res.result.output);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('AI回复失败:', error);

    // 确保加载状态被重置
    loading.value = false;

    // 移除可能存在的typing消息
    const typingIndex = messages.value.findIndex((msg) => msg.isTyping);
    if (typingIndex !== -1) {
      messages.value.splice(typingIndex, 1);
    }

    // 如果执行失败，就将执行中的ui移除，这个过程会移除上下文。移除content: '命令执行中...' 并且要type为 'ai' 的消息
    const executingIndex = messages.value.findIndex(
      (msg) => msg.isExecuting && msg.type === 'ai',
    );
    if (executingIndex !== -1) {
      messages.value.splice(executingIndex, 1);
    }

    // 添加错误消息
    const errorMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'ai',
      content: `抱歉，我暂时无法回复您的消息。错误信息：${error instanceof Error ? error.message : '未知错误'}`,
      timestamp: new Date(),
    };

    messages.value.push(errorMessage);
    await nextTick();
    scrollToBottom();

    throw error;
  }
};

const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

const handleKeyPress = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSendMessage();
  }
};

const handleClose = () => {
  emit('close');
};

const formatTime = (date: Date) => {
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const input_focus = ref<HTMLElement | null>(null);

// 监听窗口打开状态
watch(
  () => props.visible,
  (newVisible, oldVisible) => {
    if (newVisible && !oldVisible) {
      console.log('AI聊天窗口已打开');
      nextTick(() => {
        input_focus.value?.focus();
      });
    } else if (!newVisible && oldVisible) {
      console.log('AI聊天窗口已关闭');
    }
  },
  { immediate: true },
);
</script>

<template>
  <Modal
    v-model:open="dialogVisible"
    width="600px"
    :footer="null"
    :mask-closable="false"
    :destroy-on-close="false"
    class="ai-chat-modal"
    @cancel="handleClose"
  >
    <template #title>
      <div class="modal-title-container">
        <div class="title-left">
          <Tooltip title="设置">
            <Button
              type="text"
              size="small"
              @click="showSettings = !showSettings"
              class="settings-btn"
            >
              <IconifyIcon icon="lucide:settings" class="text-base" />
            </Button>
          </Tooltip>
        </div>
        <div class="title-center">
          <span>🤖 AI智能助手</span>
        </div>
        <div class="title-right"></div>
      </div>
    </template>
    <div class="ai-chat-dialog">
      <!-- 设置面板 -->
      <div v-if="showSettings" class="settings-panel">
        <div class="settings-header">
          <IconifyIcon icon="lucide:settings" class="mr-2" />
          <span>对话设置</span>
        </div>
        <div class="settings-content">
          <div class="setting-item">
            <label class="setting-label">
              <Tooltip
                title="设置保留的上下文消息数量，超出部分将被自动截断(截断后Ai将没有相关记忆)"
              >
                <IconifyIcon icon="lucide:help-circle" class="help-icon" />
              </Tooltip>
              上下文数量限制:
            </label>
            <InputNumber
              v-model:value="contextLimit"
              :min="1"
              :max="50"
              :step="1"
              size="small"
              class="context-input"
            />
            <span class="setting-desc">条消息</span>
          </div>
          <div class="setting-note">
            <IconifyIcon icon="lucide:info" class="mr-1" />
            当前对话包含
            {{ messages.filter((m) => !m.isTyping && !m.isExecuting).length }}
            条消息
          </div>
        </div>
        <Divider class="settings-divider" />
      </div>

      <!-- 消息列表 -->
      <div ref="messagesContainer" class="messages-container">
        <div
          v-for="msg in messages"
          :key="msg.id"
          :class="['message-item', msg.type]"
        >
          <div class="message-avatar">
            <Avatar
              v-if="msg.type === 'user'"
              class="flex items-center justify-center"
            >
              <IconifyIcon icon="lucide:user" class="text-xl" />
            </Avatar>
            <Avatar
              v-else
              style="background-color: #1890ff"
              class="flex items-center justify-center"
            >
              <IconifyIcon icon="lucide:bot" class="text-xl" />
            </Avatar>
          </div>
          <div class="message-content">
            <!-- 正在执行命令的UI -->
            <div v-if="msg.isExecuting" class="message-text executing-command">
              <div class="executing-header">
                <IconifyIcon icon="lucide:terminal" class="mr-2" />
                <Spin size="small" class="mr-2" />
                正在执行命令...
              </div>
              <div class="command-info">
                <div class="command-title">
                  命令类型: {{ msg.commandData?.commands?.type }}
                </div>
                <div class="command-desc">
                  {{ msg.commandData?.commands?.description }}
                </div>
                <div class="command-text">
                  {{ msg.commandData?.commands?.command }}
                </div>
                <div class="risk-level" :class="msg.commandData?.riskLevel">
                  风险级别: {{ msg.commandData?.riskLevel?.toUpperCase() }}
                </div>
              </div>
            </div>
            <!-- 服务器命令结果UI -->
            <div
              v-else-if="msg.isServerCommand"
              class="message-text server-command"
            >
              <div class="server-command-header">
                <IconifyIcon icon="lucide:check-circle" class="mr-2" />
                命令执行完成
              </div>
              <pre class="server-output">{{ msg.content }}</pre>

              <!-- AI总结部分 -->
              <div v-if="msg.aiSummary || msg.isSummaryTyping" class="ai-summary-section">
                <div class="ai-summary-header">
                  <IconifyIcon icon="lucide:brain" class="mr-2" />
                  <Spin v-if="msg.isSummaryTyping" size="small" class="mr-2" />
                  AI分析总结
                </div>
                <div class="ai-summary-content">
                  <MarkdownRenderer
                    :content="msg.aiSummary || '正在分析命令结果...'"
                    :enable-highlight="true"
                    :stream-mode="true"
                    :is-streaming="msg.isSummaryTyping"
                  />
                </div>
              </div>
            </div>
            <!-- 普通消息UI -->
            <div v-else class="message-text" :class="{ typing: msg.isTyping }">
              <!-- AI消息使用Markdown渲染（支持流式渲染） -->
              <MarkdownRenderer
                v-if="msg.type === 'ai'"
                :content="msg.content"
                :enable-highlight="true"
                :stream-mode="true"
                :is-streaming="msg.isTyping"
              />
              <!-- 用户消息使用普通文本 -->
              <template v-else>
                {{ msg.content }}
              </template>
            </div>
            <div class="message-time">{{ formatTime(msg.timestamp) }}</div>
          </div>
        </div>
        <!-- 加载状态 -->
        <div v-if="loading" class="message-item ai">
          <div class="message-avatar">
            <Avatar
              style="background-color: #1890ff"
              class="flex items-center justify-center"
            >
              <IconifyIcon icon="lucide:bot" class="text-xl" />
            </Avatar>
          </div>
          <div class="message-content">
            <div class="message-text">
              <Spin size="small" /> AI正在思考中...
            </div>
          </div>
        </div>
      </div>

      <!-- 输入区域 -->
      <div class="input-area">
        <Input.TextArea
          v-model:value="inputMessage"
          placeholder="请输入您的问题..."
          :rows="3"
          :disabled="loading"
          @keypress="handleKeyPress"
          ref="input_focus"
        />
        <Button
          type="primary"
          :loading="loading"
          :disabled="!inputMessage.trim()"
          @click="handleSendMessage"
          class="flex items-center"
        >
          <IconifyIcon icon="lucide:send" class="mr-2 text-base" />
          发送
        </Button>
      </div>
    </div>
  </Modal>
</template>

<style lang="scss" scoped>
.ai-chat-dialog {
  height: 500px;
  display: flex;
  flex-direction: column;
}

/* 模态框标题样式 */
.modal-title-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  position: relative;
}

.title-left {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  width: 40px;
  /* 固定宽度 */
}

.title-center {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-weight: 600;
  color: hsl(var(--foreground));
}

.title-right {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  width: 40px;
  /* 与左侧保持平衡 */
}

.settings-btn {
  color: #595959 !important;
  border: none !important;
  background: transparent !important;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.settings-btn {
  &:hover {
    background: rgba(0, 0, 0, 0.1) !important;
  }
}

/* 设置面板样式 */
.settings-panel {
  background: #fafafa;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  margin-bottom: 16px;
  animation: slide-down 0.3s ease-out;
}

.settings-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: #f0f0f0;
  border-bottom: 1px solid #e8e8e8;
  border-radius: 6px 6px 0 0;
  font-weight: 500;
  color: #262626;
}

.settings-content {
  padding: 16px;
}

.setting-item {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.setting-label {
  display: flex;
  align-items: center;
  font-size: 14px;
  color: #595959;
  min-width: 140px;
}

.help-icon {
  font-size: 14px;
  color: #8c8c8c;
  margin-right: 6px;
  cursor: help;
}

.context-input {
  width: 80px;
}

.setting-desc {
  font-size: 14px;
  color: #8c8c8c;
}

.setting-note {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: #8c8c8c;
  background: #f8f8f8;
  padding: 8px 12px;
  border-radius: 4px;
  border-left: 3px solid #1890ff;
}

.settings-divider {
  margin: 0 !important;
}

@keyframes slide-down {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px 0;
  max-height: 400px;
  transition: max-height 0.3s ease;
}

/* 当设置面板显示时调整消息容器高度 */
.ai-chat-dialog:has(.settings-panel) .messages-container {
  max-height: 280px;
}

.message-item {
  display: flex;
  margin-bottom: 16px;
  align-items: flex-start;
  animation: slide-in 0.3s ease-out;
}

.message-item.user {
  flex-direction: row-reverse;
}

.message-item.user .message-content {
  align-items: flex-end;
  margin-right: 8px;
}

.message-item.ai .message-content {
  margin-left: 8px;
}

.message-avatar {
  flex-shrink: 0;
}

.message-content {
  display: flex;
  flex-direction: column;
  max-width: 70%;
}

.message-text {
  background: #f5f5f5;
  padding: 8px 12px;
  border-radius: 8px;
  word-wrap: break-word;
  line-height: 1.5;
  color: hsl(var(--foreground));

  /* Markdown渲染器样式调整 */
  :deep(.markdown-renderer) {
    .markdown-content {
      margin: 0;

      /* 调整代码块在消息中的样式 */
      pre {
        margin: 0.5em 0;
        background: rgba(0, 0, 0, 0.05);
        border: 1px solid rgba(0, 0, 0, 0.1);
      }

      /* 调整段落间距 */
      p {
        margin: 0.5em 0;

        &:first-child {
          margin-top: 0;
        }

        &:last-child {
          margin-bottom: 0;
        }
      }

      /* 调整标题间距 */
      h1,
      h2,
      h3,
      h4,
      h5,
      h6 {
        margin: 0.8em 0 0.4em 0;

        &:first-child {
          margin-top: 0;
        }
      }

      /* 调整列表间距 */
      ul,
      ol {
        margin: 0.5em 0;

        &:first-child {
          margin-top: 0;
        }

        &:last-child {
          margin-bottom: 0;
        }
      }
    }
  }
}

.message-item.user .message-text {
  background: #1890ff;
  color: white;
}

.message-time {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

/* 打字机效果 */
.typing-cursor {
  animation: blink 1s infinite;
  font-weight: bold;
  margin-left: 2px;
}

@keyframes blink {
  0%,
  50% {
    opacity: 1;
  }

  51%,
  100% {
    opacity: 0;
  }
}

.message-text.typing {
  position: relative;
}

.input-area {
  display: flex;
  gap: 8px;
  align-items: flex-end;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.input-area .ant-input {
  flex: 1;
}

/* 滚动条样式 */
.messages-container::-webkit-scrollbar {
  width: 6px;
}

.messages-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.messages-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.messages-container::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 模态框样式优化 */
:deep(.ai-chat-modal .ant-modal-header) {
  background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%);
  border-bottom: none;
  border-radius: 8px 8px 0 0;
  position: relative;
}

:deep(.ai-chat-modal .ant-modal-title) {
  width: 100%;
  margin: 0;
  padding: 0;
}

:deep(.ai-chat-modal .ant-modal-close) {
  color: white;
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

:deep(.ai-chat-modal .ant-modal-close:hover) {
  background-color: rgba(255, 255, 255, 0.1);
}

:deep(.ai-chat-modal .ant-modal-content) {
  border-radius: 8px;
  overflow: hidden;
  background: hsl(var(--background));
}

/* 消息动画 */

@keyframes slide-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 输入框聚焦效果 */
:deep(.input-area .ant-input:focus) {
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

/* 发送按钮样式 */
:deep(.input-area .ant-btn-primary) {
  background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%);
  border: none;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.input-area .ant-btn-primary:hover) {
  background: linear-gradient(135deg, #40a9ff 0%, #69c0ff 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(24, 144, 255, 0.3);
}

/* Avatar 图标居中样式 */
:deep(.ant-avatar) {
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.ant-avatar .iconify) {
  display: flex;
}

/* 正在执行命令样式 */
.executing-command {
  background: #fff7e6;
  border: 1px solid #ffd591;
  border-radius: 6px;
  padding: 12px;
  animation: pulse-orange 2s infinite;
}

.executing-header {
  display: flex;
  align-items: center;
  color: #fa8c16;
  font-weight: 500;
  margin-bottom: 12px;
  font-size: 14px;
}

.command-info {
  background: #fafafa;
  border-radius: 4px;
  padding: 8px;
  margin-top: 8px;
}

.command-title {
  font-weight: 500;
  color: #262626;
  margin-bottom: 4px;
  font-size: 13px;
}

.command-desc {
  color: #595959;
  margin-bottom: 8px;
  font-size: 12px;
}

.command-text {
  background: #f5f5f5;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  padding: 6px 8px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  color: #262626;
  margin-bottom: 8px;
}

.risk-level {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 6px;
  border-radius: 3px;
  display: inline-block;
}

.risk-level.low {
  background: #f6ffed;
  color: #52c41a;
  border: 1px solid #b7eb8f;
}

.risk-level.medium {
  background: #fff7e6;
  color: #fa8c16;
  border: 1px solid #ffd591;
}

.risk-level.high {
  background: #fff2f0;
  color: #ff4d4f;
  border: 1px solid #ffccc7;
}

@keyframes pulse-orange {
  0% {
    box-shadow: 0 0 0 0 rgba(250, 140, 22, 0.4);
  }

  70% {
    box-shadow: 0 0 0 10px rgba(250, 140, 22, 0);
  }

  100% {
    box-shadow: 0 0 0 0 rgba(250, 140, 22, 0);
  }
}

/* 服务器命令结果样式 */
.server-command {
  background: #f6f8fa;
  border: 1px solid #e1e4e8;
  border-radius: 6px;
  padding: 12px;
}

.server-command-header {
  display: flex;
  align-items: center;
  color: #28a745;
  font-weight: 500;
  margin-bottom: 8px;
  font-size: 14px;
}

.server-output {
  background: #f8f9fa;
  border: 1px solid #e1e4e8;
  border-radius: 4px;
  padding: 8px;
  margin: 0 0 12px 0;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.4;
  white-space: pre-wrap;
  word-wrap: break-word;
  max-height: 300px;
  overflow-y: auto;
}

/* AI总结部分样式 */
.ai-summary-section {
  border-top: 1px solid #e1e4e8;
  padding-top: 12px;
  margin-top: 8px;
}

.ai-summary-header {
  display: flex;
  align-items: center;
  color: #1890ff;
  font-weight: 500;
  margin-bottom: 8px;
  font-size: 13px;
}

.ai-summary-content {
  background: #f0f8ff;
  border: 1px solid #d6e7ff;
  border-radius: 4px;
  padding: 8px;
  font-size: 13px;
  line-height: 1.5;

  /* AI总结中的Markdown样式调整 */
  :deep(.markdown-renderer) {
    .markdown-content {
      margin: 0;

      p {
        margin: 0.3em 0;

        &:first-child {
          margin-top: 0;
        }

        &:last-child {
          margin-bottom: 0;
        }
      }

      ul, ol {
        margin: 0.3em 0;
        padding-left: 1.2em;

        &:first-child {
          margin-top: 0;
        }

        &:last-child {
          margin-bottom: 0;
        }
      }

      h1, h2, h3, h4, h5, h6 {
        margin: 0.5em 0 0.3em 0;

        &:first-child {
          margin-top: 0;
        }
      }
    }
  }
}

// 浅色适配模式
.dark {
  /* 深色模式下的设置按钮 */
  .settings-btn {
    color: white !important;

    &:hover {
      background: rgba(255, 255, 255, 0.1) !important;
    }
  }

  .settings-header {
    background: #262626;
    border-color: #303030;
    color: #e6edf3;
  }

  .setting-label {
    color: #8b949e;
  }

  .settings-panel {
    background: #1f1f1f;
    border-color: #303030;
  }

  .help-icon {
    color: #6e7681;
  }

  .setting-desc {
    color: #6e7681;
  }

  .setting-note {
    color: #6e7681;
    background: #161b22;
    border-color: #1890ff;
  }

  .message-text {
    background: #3d3d5c;
    color: hsl(var(--foreground));

    /* 深色模式下的Markdown渲染器样式调整 */
    :deep(.markdown-renderer) {
      .markdown-content {
        pre {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.1);
        }
      }
    }
  }

  .message-item {
    .user {
      .message-text {
        background: #1890ff;
        color: white;
      }
    }
  }

  .message-time {
    color: hsl(var(--muted-foreground));
  }

  .input-area {
    border-top: 1px solid hsl(var(--border));
  }

  .messages-container::-webkit-scrollbar-thumb {
    background: hsl(var(--muted-foreground) / 0.3);
  }

  .messages-container::-webkit-scrollbar-thumb:hover {
    background: hsl(var(--muted-foreground) / 0.5);
  }

  .messages-container::-webkit-scrollbar-track {
    background: hsl(var(--muted));
  }

  .executing-command {
    background: #2b1d0e;
    border-color: #d4b106;
  }

  .executing-header {
    color: #ffa940;
  }

  .command-info {
    background: #1f1f1f;
  }

  .command-title {
    color: #e6edf3;
  }

  .command-desc {
    color: #8b949e;
  }

  .command-text {
    background: #161b22;
    border-color: #30363d;
    color: #e6edf3;
  }

  .risk-level.low {
    background: #162312;
    color: #73d13d;
    border-color: #389e0d;
  }

  .risk-level.medium {
    background: #2b1d0e;
    color: #ffa940;
    border-color: #d4b106;
  }

  .risk-level.high {
    background: #2a1215;
    color: #ff7875;
    border-color: #a8071a;
  }

  .server-command {
    background: #161b22;
    border-color: #30363d;
  }

  .server-command-header {
    color: #3fb950;
  }

  .server-output {
    background: #0d1117;
    border-color: #30363d;
    color: #e6edf3;
  }

  /* 深色模式下的AI总结样式 */
  .ai-summary-section {
    border-top-color: #30363d;
  }

  .ai-summary-header {
    color: #58a6ff;
  }

  .ai-summary-content {
    background: #0d1421;
    border-color: #1f6feb;
    color: #e6edf3;

    :deep(.markdown-renderer) {
      .markdown-content {
        color: #e6edf3;
      }
    }
  }

  /* 深色模式下的模态框 */
  &:deep(.ai-chat-modal .ant-modal-content) {
    background: hsl(var(--background));
    color: hsl(var(--foreground));
  }

  &:deep(.ai-chat-modal .ant-modal-body) {
    background: hsl(var(--background));
    color: hsl(var(--foreground));
  }
}
</style>
