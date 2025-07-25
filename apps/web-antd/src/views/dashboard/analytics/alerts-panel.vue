<script lang="ts" setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { Badge, List, ListItem, Avatar } from 'ant-design-vue';
import { usePreferences } from '@vben/preferences';

interface Alert {
  id: string;
  level: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  time: string;
  service: string;
}

const alerts = ref<Alert[]>([]);
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

// 模拟告警数据
const generateAlerts = (): Alert[] => {
  const alertTypes = [
    {
      level: 'critical' as const,
      title: 'CPU使用率过高',
      description: '服务器CPU使用率超过90%',
      service: 'web-server-01'
    },
    {
      level: 'warning' as const,
      title: '内存使用率告警',
      description: '内存使用率超过80%',
      service: 'database-01'
    },
    {
      level: 'critical' as const,
      title: '磁盘空间不足',
      description: '磁盘使用率超过95%',
      service: 'storage-01'
    },
    {
      level: 'warning' as const,
      title: '网络延迟异常',
      description: '网络响应时间超过阈值',
      service: 'api-gateway'
    },
    {
      level: 'info' as const,
      title: '服务重启',
      description: '微服务自动重启完成',
      service: 'user-service'
    },
    {
      level: 'critical' as const,
      title: '数据库连接异常',
      description: '数据库连接池耗尽',
      service: 'mysql-cluster'
    }
  ];

  return alertTypes.map((alert, index) => ({
    id: `alert-${Date.now()}-${index}`,
    ...alert,
    time: new Date(Date.now() - Math.random() * 3600000).toLocaleTimeString('zh-CN', { hour12: false })
  })).slice(0, 5); // 只显示最新5条
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

const updateAlerts = () => {
  alerts.value = generateAlerts();
};

onMounted(() => {
  updateAlerts();
  // 每60秒更新一次告警数据
  timer = setInterval(updateAlerts, 60000);
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
                    <span :class="themeClasses.updateText">{{ item.time }}</span>
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
