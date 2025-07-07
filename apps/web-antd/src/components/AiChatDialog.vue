<script lang="ts" setup>
import { ref, computed, nextTick } from 'vue';
import { Modal, Input, Button, Avatar, Spin, message } from 'ant-design-vue';
import { IconifyIcon } from '@vben/icons';
import { sendChatMessageStream, type ChatMessage as ApiChatMessage } from '#/api/index';

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  isTyping?: boolean;
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
    content: '您好！我是AI助手，我可以帮您解答关于系统运维、技术问题或其他任何疑问。请随时提问！',
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
    // 构建对话历史（包含刚刚添加的用户消息）
    const chatHistory: ApiChatMessage[] = messages.value
      .filter(msg => !msg.isTyping)
      .map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content,
      }));

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
          const messageIndex = messages.value.findIndex(msg => msg.id === aiMessage!.id);
          if (messageIndex !== -1) {
            messages.value[messageIndex]!.content = fullContent;
            await nextTick();
            scrollToBottom();

            // 添加打字机延迟效果（根据内容长度动态调整）
            const delay = Math.min(50, Math.max(10, chunk.length * 2));
            await new Promise(resolve => setTimeout(resolve, delay));
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
      const messageIndex = messages.value.findIndex(msg => msg.id === aiMessage.id);
      if (messageIndex !== -1) {
        // 最后一次更新内容，确保所有数据都被保存
        messages.value[messageIndex]!.content = fullContent;
        messages.value[messageIndex]!.isTyping = false;
        await nextTick();
        scrollToBottom();

        console.log('AI回复完成，最终内容长度:', fullContent.length);
        console.log('最终内容:', fullContent);
      }
    }
    
  } catch (error) {
    console.error('AI回复失败:', error);
    
    // 确保加载状态被重置
    loading.value = false;
    
    // 移除可能存在的typing消息
    const typingIndex = messages.value.findIndex(msg => msg.isTyping);
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
            <Avatar v-if="msg.type === 'user'" class="flex items-center justify-center">
              <IconifyIcon icon="lucide:user" class="text-xl" />
            </Avatar>
            <Avatar v-else style="background-color: #1890ff" class="flex items-center justify-center">
              <IconifyIcon icon="lucide:bot" class="text-xl" />
            </Avatar>
          </div>
          <div class="message-content">
            <div class="message-text" :class="{ 'typing': msg.isTyping }">
              {{ msg.content }}
              <span v-if="msg.isTyping" class="typing-cursor">|</span>
            </div>
            <div class="message-time">{{ formatTime(msg.timestamp) }}</div>
          </div>
        </div>
        
        <!-- 加载状态 -->
        <div v-if="loading" class="message-item ai">
          <div class="message-avatar">
            <Avatar style="background-color: #1890ff" class="flex items-center justify-center">
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
  0%, 50% {
    opacity: 1;
  }
  51%, 100% {
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
  align-items: center;
  justify-content: center;
}
</style>
