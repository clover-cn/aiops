<script lang="ts" setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { Badge, List, ListItem, Avatar, message } from 'ant-design-vue';
import { usePreferences } from '@vben/preferences';
import { getAlertsApi, type Alert } from '#/api/aiops';

const alerts = ref<Alert[]>([]);
const loading = ref(false);
const { isDark } = usePreferences();

// 计算主题相关的样式类
const themeClasses = computed(() => {
  if (isDark.value) {
    return {
      badgeText: 'text-slate-300',
      updateText: 'text-slate-400',
      itemBorder: 'border-slate-700/50',
      titleColor: 'text-slate-200',
      descColor: 'text-slate-400',
      serviceColor: 'text-blue-400',
      scrollThumb: 'scrollbar-thumb-slate-600',
      scrollTrack: 'scrollbar-track-slate-800',
    };
  } else {
    return {
      badgeText: 'text-gray-700',
      updateText: 'text-gray-500',
      itemBorder: 'border-gray-200/50',
      titleColor: 'text-gray-800',
      descColor: 'text-gray-600',
      serviceColor: 'text-blue-600',
      scrollThumb: 'scrollbar-thumb-gray-400',
      scrollTrack: 'scrollbar-track-gray-200',
    };
  }
});

/**
 * 获取告警数据
 */
const fetchAlerts = async () => {
  try {
    loading.value = true;
    const response = await getAlertsApi();
    // API返回的是包装后的响应，需要检查response的结构
    if (Array.isArray(response)) {
      alerts.value = response.slice(0, 5); // 只显示最新5条
    } else if (response && typeof response === 'object' && 'data' in response) {
      alerts.value = (response as any).data.slice(0, 5);
    } else {
      console.error('获取告警数据失败: 响应格式异常');
      alerts.value = generateMockAlerts();
    }
  } catch (error) {
    console.error('获取告警数据异常:', error);
    // 如果API异常，使用模拟数据作为后备
    alerts.value = generateMockAlerts();
  } finally {
    loading.value = false;
  }
};

/**
 * 生成模拟告警数据（作为后备）
 */
const generateMockAlerts = (): Alert[] => {
  const mockAlerts = [
    {
      id: `mock-alert-${Date.now()}-1`,
      key: 'cpu_alert',
      level: 'critical' as const,
      title: 'CPU使用率过高',
      description: 'Web服务器CPU使用率达到92%，超过安全阈值',
      service: 'Web服务器',
      metricType: 'cpu',
      currentValue: 92,
      threshold: 85,
      unit: '%',
      time: new Date().toISOString(),
      timeDisplay: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
      status: 'active' as const,
      count: 1
    },
    {
      id: `mock-alert-${Date.now()}-2`,
      key: 'memory_alert',
      level: 'warning' as const,
      title: '内存使用率告警',
      description: '数据库服务器内存使用率达到78%',
      service: '数据库服务器',
      metricType: 'memory',
      currentValue: 78,
      threshold: 75,
      unit: '%',
      time: new Date().toISOString(),
      timeDisplay: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
      status: 'active' as const,
      count: 1
    }
  ];

  return mockAlerts.slice(0, 5);
};

const getLevelColor = (level: string) => {
  switch (level) {
    case 'critical':
      return '#ef4444';
    case 'warning':
      return '#f59e0b';
    case 'info':
      return '#3b82f6';
    default:
      return '#6b7280';
  }
};

const getLevelText = (level: string) => {
  switch (level) {
    case 'critical':
      return '严重';
    case 'warning':
      return '警告';
    case 'info':
      return '信息';
    default:
      return '未知';
  }
};

const getAvatarIcon = (level: string) => {
  switch (level) {
    case 'critical':
      return '🔴';
    case 'warning':
      return '🟡';
    case 'info':
      return '🔵';
    default:
      return '⚪';
  }
};

let timer: NodeJS.Timeout | null = null;

const updateAlerts = async () => {
  await fetchAlerts();
};

onMounted(() => {
  updateAlerts();
  // 每30秒更新一次告警数据
  timer = setInterval(updateAlerts, 30000);
});

onUnmounted(() => {
  if (timer) {
    clearInterval(timer);
  }
});
</script>

<template>
  <div class="h-80 overflow-hidden">
    <div class="mb-4 flex items-center justify-between">
      <div class="flex items-center space-x-4">
        <Badge :count="alerts.filter(a => a.level === 'critical').length" :color="getLevelColor('critical')">
          <span :class="themeClasses.badgeText">严重告警</span>
        </Badge>
        <Badge :count="alerts.filter(a => a.level === 'warning').length" :color="getLevelColor('warning')">
          <span :class="themeClasses.badgeText">警告告警</span>
        </Badge>
      </div>
      <span :class="`text-xs ${themeClasses.updateText}`">实时更新</span>
    </div>

    <div :class="`h-64 overflow-y-auto scrollbar-thin ${themeClasses.scrollThumb} ${themeClasses.scrollTrack}`">
      <List :data-source="alerts" size="small">
        <template #renderItem="{ item }">
          <ListItem :class="`border-b ${themeClasses.itemBorder} px-0 py-3`">
            <ListItem.Meta>
              <template #avatar>
                <div class="flex items-center justify-center w-8 h-8 rounded-full text-sm"
                     :style="{ backgroundColor: getLevelColor(item.level) + '20', border: `1px solid ${getLevelColor(item.level)}` }">
                  {{ getAvatarIcon(item.level) }}
                </div>
              </template>
              <template #title>
                <div class="flex items-center justify-between">
                  <span :class="`${themeClasses.titleColor} font-medium text-sm`">{{ item.title }}</span>
                  <Badge
                    :text="getLevelText(item.level)"
                    :color="getLevelColor(item.level)"
                    class="text-xs"
                  />
                </div>
              </template>
              <template #description>
                <div class="space-y-1">
                  <p :class="`${themeClasses.descColor} text-xs`">{{ item.description }}</p>
                  <div class="flex items-center justify-between text-xs">
                    <span :class="themeClasses.serviceColor">{{ item.service }}</span>
                    <span :class="themeClasses.updateText">{{ item.timeDisplay || item.time }}</span>
                  </div>
                </div>
              </template>
            </ListItem.Meta>
          </ListItem>
        </template>
      </List>
    </div>
  </div>
</template>

<style scoped>
/* 深色模式样式 */
.dark :deep(.ant-list-item) {
  border-bottom: 1px solid rgba(71, 85, 105, 0.3) !important;
}

/* 浅色模式样式 */
:deep(.ant-list-item) {
  border-bottom: 1px solid rgba(229, 231, 235, 0.5) !important;
}

:deep(.ant-list-item-meta-title) {
  margin-bottom: 4px;
}

:deep(.ant-badge-count) {
  font-size: 10px;
  min-width: 16px;
  height: 16px;
  line-height: 16px;
}

/* 自定义滚动条 */
.scrollbar-thin {
  scrollbar-width: thin;
}

/* 深色模式滚动条 */
.scrollbar-thumb-slate-600::-webkit-scrollbar-thumb {
  background-color: #475569;
  border-radius: 4px;
}

.scrollbar-track-slate-800::-webkit-scrollbar-track {
  background-color: #1e293b;
}

/* 浅色模式滚动条 */
.scrollbar-thumb-gray-400::-webkit-scrollbar-thumb {
  background-color: #9ca3af;
  border-radius: 4px;
}

.scrollbar-track-gray-200::-webkit-scrollbar-track {
  background-color: #e5e7eb;
}

::-webkit-scrollbar {
  width: 6px;
}
</style>
