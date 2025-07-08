<script lang="ts" setup>
import { ref, computed, nextTick, watch } from 'vue';
import { Modal, Input, Button, Avatar, Spin, message } from 'ant-design-vue';
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

const simulateAiResponse = async () => {
  try {
    const System = import.meta.env.VITE_CHAT_SYSTEM;
    // 系统提示词，定义AI助手的角色和行为
    const systemPrompt = `你是一个专业的智能运维助手。
    ## 重要规则
    1. 如果用户询问的是运维操作命令(如：检查服务状态、重启服务、查看日志、系统监控等),则**只返回JSON格式(\`\`\`json\`\`\`开头跟结尾),绝对不要添加任何前缀文字、解释或说明**:
    {
      "intent": "意图类型",
      "commands": {
          "type": "命令类型(${System})",
          "command": "具体命令",
          "description": "命令说明"
      },
      "requiresApproval": "是否需要审批(true/false)",
      "riskLevel": "风险级别(low/medium/high)"
    }
    2. 如果用户询问的是普通问题、聊天或非运维操作,则正常对话回复,不用按照以上格式回复。
    ## 重要提醒
    - 运维命令请求:直接返回JSON,不要任何前缀文字
    - 普通对话:正常聊天回复
    ## commands对象说明
    - 请根据命令类型返回对应平台的命令,如Linux、Windows等。
    - 如果用户有多条命令,请合并成对应平台的一条命令返回。
    ## 运维命令判断标准
    - 系统操作: 重启、关机、服务管理
    - 监控查询: 状态检查、性能查看、日志查看
    - 故障排查: 诊断、测试、检查
    - 资源管理: 文件操作、进程管理、网络配置
    ## 扣分规则(总分100分)
    - 如果用户询问的是运维操作命令,但返回了非JSON格式,
      则扣除20分。
    - 如果用户询问的是运维操作命令,但没有按照JSON格式返回,
      则扣除30分。
    - 如果用户询问的是运维操作命令,但返回了其他格式,
      则扣除50分。
    - 如果用户询问的是运维操作命令,但没有返回任何内容,
      则扣除100分。
    ## 评分标准
    - 每次回答都会根据以上规则进行评分,如果扣分超过50分,则会被认为是错误回答。
    - 如果回答正确,则不会扣分。
    - 如果回答错误,则会根据扣分规则进行扣分。
    ## 注意事项
    - 请确保返回的JSON格式正确,否则会被认为是错误回答。
    - 请确保返回的内容符合用户的意图,否则会被认为是错误回答。
    - 请确保返回的内容符合运维操作命令的标准,否则会被认为是错误回答。
    - 请确保返回的内容符合普通对话的标准,否则会被认为是错误回答。
    - 请确保返回的内容符合以上规则,否则会被认为是错误回答。`;
    // 构建对话历史（包含刚刚添加的用户消息）
    const chatHistory: ApiChatMessage[] = [
      // 首先添加系统消息
      {
        role: 'system' as const,
        content: systemPrompt,
      },
      // 然后添加用户和助手的对话历史
      ...messages.value
        .filter((msg) => !msg.isTyping)
        .map((msg) => ({
          role:
            msg.type === 'user' ? ('user' as const) : ('assistant' as const),
          content: msg.content,
        })),
    ];
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
        let startsJsonData = fullContent.startsWith('```json');
        console.log('是否是```json开头:', startsJsonData);

        let endJsonData = fullContent.endsWith('```');
        console.log('是否是```结尾:', endJsonData);
        if (startsJsonData && endJsonData) {
          let cleanData = fullContent
            .replace(/```json\s*/, '')
            .replace(/\s*```$/, '');
          let jsonData = JSON.parse(cleanData);
          console.log('AI回复的JSON数据:', jsonData);
          console.log('执行命令:', jsonData.commands.command);

          // 添加正在执行命令的消息
          const executingMessage: ChatMessage = {
            id: Date.now().toString() + '_executing',
            type: 'ai',
            content: '',
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
          // 模拟命令执行过程
          // setTimeout(async () => {
          //   // 移除执行中的消息
          //   const executingIndex = messages.value.findIndex(msg => msg.id === executingMessage.id);
          //   if (executingIndex !== -1) {
          //     messages.value.splice(executingIndex, 1);
          //   }

          //   // 添加执行结果消息
          //   const resultMessage: ChatMessage = {
          //     id: Date.now().toString() + '_result',
          //     type: 'ai',
          //     content: `命令执行完成！\n\n执行的命令: ${jsonData.commands.command}\n\n模拟执行结果:\n- 服务状态: 正常运行\n- CPU使用率: 45%\n- 内存使用率: 62%\n- 磁盘使用率: 78%\n\n执行时间: ${new Date().toLocaleString()}`,
          //     timestamp: new Date(),
          //     isTyping: false,
          //     isServerCommand: true,
          //     commandData: jsonData,
          //   };

          //   messages.value.push(resultMessage);
          //   await nextTick();
          //   scrollToBottom();
          // }, 3000); // 3秒后显示结果
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
    title="🤖 AI智能助手"
    width="600px"
    :footer="null"
    :mask-closable="false"
    :destroy-on-close="false"
    class="ai-chat-modal"
    @cancel="handleClose"
  >
    <div class="ai-chat-dialog">
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

<style scoped>
.ai-chat-dialog {
  height: 500px;
  display: flex;
  flex-direction: column;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px 0;
  max-height: 400px;
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
}

:deep(.ai-chat-modal .ant-modal-title) {
  color: white;
  font-weight: 600;
}

:deep(.ai-chat-modal .ant-modal-close) {
  color: white;
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
