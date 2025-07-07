<script lang="ts" setup>
import { ref } from 'vue';

import { FloatButton } from 'ant-design-vue';

import aiIconGif from '#/static/images/ai-icon.gif';

import AiChatDialog from './AiChatDialog.vue';

defineOptions({ name: 'AiChatFloat' });

const dialogVisible = ref(false);

const handleFloatButtonClick = () => {
  dialogVisible.value = true;
};

const handleDialogClose = () => {
  dialogVisible.value = false;
};
</script>

<template>
  <div class="ai-chat-float">
    <!-- 悬浮按钮 -->
    <FloatButton
      :style="{
        right: '24px',
        bottom: '24px',
        width: '56px',
        height: '56px',
      }"
      @click="handleFloatButtonClick"
    >
      <template #icon>
        <img :src="aiIconGif" alt="AI助手" class="ai-icon" />
      </template>
    </FloatButton>

    <!-- AI对话窗口 -->
    <AiChatDialog v-model:visible="dialogVisible" @close="handleDialogClose" />
  </div>
</template>

<style scoped>
/* AI图标脉冲动画 */
@keyframes pulse {
  0% {
    opacity: 1;
  }

  50% {
    opacity: 0.7;
  }

  100% {
    opacity: 1;
  }
}

@keyframes breathe {
  0%,
  100% {
    opacity: 0.3;
    transform: scale(1);
  }

  50% {
    opacity: 0.1;
    transform: scale(1.1);
  }
}

.ai-chat-float {
  position: fixed;
  z-index: 9999;
}

.ai-icon {
  width: 32px;
  height: 32px;
  object-fit: cover;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

/* 悬浮按钮动画效果 */
:deep(.ant-float-btn) {
  background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%);
  border: none;
  box-shadow: 0 4px 12px rgb(24 144 255 / 30%);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

:deep(.ant-float-btn:hover) {
  background: linear-gradient(135deg, #40a9ff 0%, #69c0ff 100%);
  box-shadow: 0 8px 20px rgb(24 144 255 / 40%);
  transform: scale(1.1) translateY(-2px);
}

:deep(.ant-float-btn:active) {
  transform: scale(0.95);
}

/* 悬浮按钮呼吸效果 */
:deep(.ant-float-btn)::before {
  position: absolute;
  inset: -2px;
  z-index: -1;
  content: '';
  background: linear-gradient(135deg, #1890ff, #40a9ff);
  border-radius: 50%;
  opacity: 0.3;
  animation: breathe 3s ease-in-out infinite;
}
</style>
