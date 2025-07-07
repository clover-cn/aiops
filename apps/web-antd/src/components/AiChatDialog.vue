<script lang="ts" setup>
import { ref, computed, nextTick } from 'vue';
import { Modal, Input, Button, Avatar, Spin, message } from 'ant-design-vue';
import { IconifyIcon } from '@vben/icons';
interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
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
    content: '您好！我是AI助手，有什么可以帮助您的吗？',
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
  const currentInput = inputMessage.value;
  inputMessage.value = '';

  // 滚动到底部
  await nextTick();
  scrollToBottom();

  // 模拟AI回复
  loading.value = true;
  try {
    // 这里可以替换为实际的AI API调用
    await simulateAiResponse(currentInput);
  } catch (error) {
    message.error('发送消息失败，请重试');
  } finally {
    loading.value = false;
  }
};

const simulateAiResponse = async (userInput: string) => {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
  
  const aiMessage: ChatMessage = {
    id: Date.now().toString(),
    type: 'ai',
    content: `我收到了您的消息："${userInput}"。这是一个模拟回复，您可以在这里集成真实的AI API。`,
    timestamp: new Date(),
  };

  messages.value.push(aiMessage);
  await nextTick();
  scrollToBottom();
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
            <div class="message-text">{{ msg.content }}</div>
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
