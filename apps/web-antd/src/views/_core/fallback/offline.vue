<script lang="ts" setup>
import { Fallback } from '@vben/common-ui';

defineOptions({ name: 'FallbackOfflineDemo' });
</script>

<template>
  <!-- 页面离线状态 -->
  <Fallback status="offline" />
</template>
