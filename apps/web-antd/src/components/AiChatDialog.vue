<script lang="ts" setup>
import { ref, computed, nextTick, watch } from 'vue';
import { Modal, Input, Button, Avatar, Spin, message, InputNumber, Tooltip, Divider } from 'ant-design-vue';
import { IconifyIcon } from '@vben/icons';
import {
  sendChatMessageStream,
  type ChatMessage as ApiChatMessage,
} from '#/api/index';
import { getExecuteCommandApi } from '#/api/index';
interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  isTyping?: boolean;
  isExecuting?: boolean;
  isServerCommand?: boolean;
  commandData?: any;
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
const contextLimit = ref(10); // 默认保留10条上下文
const showSettings = ref(false); // 控制设置面板显示

// 构建带上下文限制的对话历史
const buildChatHistory = (systemPrompt: string): ApiChatMessage[] => {
  // 过滤掉正在输入和执行中的消息
  const validMessages = messages.value.filter((msg) => !msg.isTyping && !msg.isExecuting);

  // 转换为API格式
  const apiMessages: ApiChatMessage[] = validMessages.map((msg) => ({
    role: msg.type === 'user' ? ('user' as const) : ('assistant' as const),
    content: msg.content,
  }));

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
    await simulateAiResponse();
  } catch (error) {
    message.error('AI回复失败，请重试');
  } finally {
    // 确保loading状态被清除（虽然在simulateAiResponse中也会设置）
    loading.value = false;
  }
};

// 生成AI对命令结果的总结
const generateCommandSummary = async (commandData: any, commandOutput: string) => {
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
        content: '你是一个专业的运维助手，擅长分析命令执行结果并给出简洁明了的总结。请用中文回复，语气要友好专业。',
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
    let summaryMessage: ChatMessage | null = null;
    let isFirstChunk = true;

    for await (const chunk of summaryGenerator) {
      // 第一次收到数据时创建总结消息
      if (isFirstChunk) {
        summaryMessage = {
          id: Date.now().toString() + '_summary',
          type: 'ai',
          content: '',
          timestamp: new Date(),
          isTyping: true,
        };

        messages.value.push(summaryMessage);
        await nextTick();
        scrollToBottom();
        isFirstChunk = false;
      }

      summaryContent += chunk;

      // 更新消息内容，实现打字机效果
      if (summaryMessage) {
        const messageIndex = messages.value.findIndex(
          (msg) => msg.id === summaryMessage!.id,
        );
        if (messageIndex !== -1) {
          messages.value[messageIndex]!.content = summaryContent;
          await nextTick();
          scrollToBottom();

          // 添加打字机延迟效果
          const delay = Math.min(30, Math.max(10, chunk.length * 2));
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // 完成总结，移除typing状态
    if (summaryMessage) {
      const messageIndex = messages.value.findIndex(
        (msg) => msg.id === summaryMessage.id,
      );
      if (messageIndex !== -1) {
        messages.value[messageIndex]!.content = summaryContent;
        messages.value[messageIndex]!.isTyping = false;
        await nextTick();
        scrollToBottom();
      }
    }
  } catch (error) {
    console.error('生成命令总结失败:', error);
    // 如果总结失败，添加一个简单的提示消息
    const errorSummaryMessage: ChatMessage = {
      id: Date.now().toString() + '_summary_error',
      type: 'ai',
      content: '命令已执行完成，但生成结果总结时出现问题。您可以查看上方的执行结果详情。',
      timestamp: new Date(),
    };
    messages.value.push(errorSummaryMessage);
    await nextTick();
    scrollToBottom();
  }
};

const simulateAiResponse = async () => {
  try {
    const System = import.meta.env.VITE_CHAT_SYSTEM;
    // 系统提示词，定义AI助手的角色和行为
    const systemPrompt = `你是一个专业的智能运维助手。
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
      "requiresApproval": true/false,
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
    4. 运维命令返回JSON时不要添加任何解释文字`;
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
            const executingIndex = messages.value.findIndex(msg => msg.id === executingMessage.id);
            if (executingIndex !== -1) {
              messages.value.splice(executingIndex, 1);
            }
            const Command = `${jsonData.commands.type}命令执行结果:
    - 命令: ${jsonData.commands.command}
    - 描述: ${jsonData.commands.description}
    - 风险级别: ${jsonData.riskLevel}
    - 执行结果: ${res.result.output || '无输出'}
    - 执行状态: ${res.result.success ? '成功' : '失败'}
    - 执行时间: ${res.result.timestamp}`
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
              await generateCommandSummary(jsonData, res.result.output);
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
              <Tooltip title="设置保留的上下文消息数量，超出部分将被自动截断。System消息始终保留。">
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
            当前对话包含 {{ messages.filter(m => !m.isTyping && !m.isExecuting).length }} 条消息
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
                <div class="command-title">命令类型: {{ msg.commandData?.commands?.type }}</div>
                <div class="command-desc">{{ msg.commandData?.commands?.description }}</div>
                <div class="command-text">{{ msg.commandData?.commands?.command }}</div>
                <div class="risk-level" :class="msg.commandData?.riskLevel">
                  风险级别: {{ msg.commandData?.riskLevel?.toUpperCase() }}
                </div>
              </div>
            </div>
            <!-- 服务器命令结果UI -->
            <div v-else-if="msg.isServerCommand" class="message-text server-command">
              <div class="server-command-header">
                <IconifyIcon icon="lucide:check-circle" class="mr-2" />
                命令执行完成
              </div>
              <pre class="server-output">{{ msg.content }}</pre>
            </div>
            <!-- 普通消息UI -->
            <div v-else class="message-text" :class="{ typing: msg.isTyping }">
              {{ msg.content }}
              <span v-if="msg.isTyping" class="typing-cursor">|</span>
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
  width: 40px; /* 固定宽度 */
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
  color: white;
}

.title-right {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  width: 40px; /* 与左侧保持平衡 */
}

.settings-btn {
  color: white !important;
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
    background: rgba(255, 255, 255, 0.1) !important;
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

.dark .settings-panel {
  background: #1f1f1f;
  border-color: #303030;
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

.dark .settings-header {
  background: #262626;
  border-color: #303030;
  color: #e6edf3;
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

.dark .setting-label {
  color: #8b949e;
}

.help-icon {
  font-size: 14px;
  color: #8c8c8c;
  margin-right: 6px;
  cursor: help;
}

.dark .help-icon {
  color: #6e7681;
}

.context-input {
  width: 80px;
}

.setting-desc {
  font-size: 14px;
  color: #8c8c8c;
}

.dark .setting-desc {
  color: #6e7681;
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

.dark .setting-note {
  color: #6e7681;
  background: #161b22;
  border-color: #1890ff;
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

/* 深色模式适配 */
.dark .message-text {
  background: #3d3d5c;
  color: hsl(var(--foreground));
}

.dark .message-item.user .message-text {
  background: #1890ff;
  color: white;
}

.dark .message-time {
  color: hsl(var(--muted-foreground));
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

/* 深色模式下的输入区域 */
.dark .input-area {
  border-top: 1px solid hsl(var(--border));
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

/* 深色模式下的滚动条 */
.dark .messages-container::-webkit-scrollbar-track {
  background: hsl(var(--muted));
}

.dark .messages-container::-webkit-scrollbar-thumb {
  background: hsl(var(--muted-foreground) / 0.3);
}

.dark .messages-container::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--muted-foreground) / 0.5);
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

/* 深色模式下的模态框 */
.dark :deep(.ai-chat-modal .ant-modal-content) {
  background: hsl(var(--background));
  color: hsl(var(--foreground));
}

.dark :deep(.ai-chat-modal .ant-modal-body) {
  background: hsl(var(--background));
  color: hsl(var(--foreground));
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

.dark .executing-command {
  background: #2b1d0e;
  border-color: #d4b106;
}

.executing-header {
  display: flex;
  align-items: center;
  color: #fa8c16;
  font-weight: 500;
  margin-bottom: 12px;
  font-size: 14px;
}

.dark .executing-header {
  color: #ffa940;
}

.command-info {
  background: #fafafa;
  border-radius: 4px;
  padding: 8px;
  margin-top: 8px;
}

.dark .command-info {
  background: #1f1f1f;
}

.command-title {
  font-weight: 500;
  color: #262626;
  margin-bottom: 4px;
  font-size: 13px;
}

.dark .command-title {
  color: #e6edf3;
}

.command-desc {
  color: #595959;
  margin-bottom: 8px;
  font-size: 12px;
}

.dark .command-desc {
  color: #8b949e;
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

.dark .command-text {
  background: #161b22;
  border-color: #30363d;
  color: #e6edf3;
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

.dark .risk-level.low {
  background: #162312;
  color: #73d13d;
  border-color: #389e0d;
}

.dark .risk-level.medium {
  background: #2b1d0e;
  color: #ffa940;
  border-color: #d4b106;
}

.dark .risk-level.high {
  background: #2a1215;
  color: #ff7875;
  border-color: #a8071a;
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

.dark .server-command {
  background: #161b22;
  border-color: #30363d;
}

.server-command-header {
  display: flex;
  align-items: center;
  color: #28a745;
  font-weight: 500;
  margin-bottom: 8px;
  font-size: 14px;
}

.dark .server-command-header {
  color: #3fb950;
}

.server-output {
  background: #f8f9fa;
  border: 1px solid #e1e4e8;
  border-radius: 4px;
  padding: 8px;
  margin: 0;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.4;
  white-space: pre-wrap;
  word-wrap: break-word;
  max-height: 300px;
  overflow-y: auto;
}

.dark .server-output {
  background: #0d1117;
  border-color: #30363d;
  color: #e6edf3;
}
</style>
