<script lang="ts" setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { Progress, Tag } from 'ant-design-vue';
import { usePreferences } from '@vben/preferences';

interface LogStat {
  level: 'error' | 'warn' | 'info' | 'debug';
  count: number;
  percentage: number;
  color: string;
}

interface RecentLog {
  id: string;
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  service: string;
  time: string;
}

const logStats = ref<LogStat[]>([]);
const recentLogs = ref<RecentLog[]>([]);
const { isDark } = usePreferences();

// 计算主题相关的样式类
const themeClasses = computed(() => {
  if (isDark.value) {
    return {
      titleColor: 'text-slate-300',
      textColor: 'text-slate-400',
      valueColor: 'text-slate-300',
      cardBg: 'bg-slate-800/30',
      cardBorder: 'border-slate-700/50',
      cardHover: 'hover:bg-slate-700/30',
      progressTrack: 'rgba(71, 85, 105, 0.3)',
      scrollThumb: 'scrollbar-thumb-slate-600',
      scrollTrack: 'scrollbar-track-slate-800',
    };
  } else {
    return {
      titleColor: 'text-gray-700',
      textColor: 'text-gray-600',
      valueColor: 'text-gray-800',
      cardBg: 'bg-gray-50/50',
      cardBorder: 'border-gray-200/50',
      cardHover: 'hover:bg-gray-100/50',
      progressTrack: 'rgba(229, 231, 235, 0.5)',
      scrollThumb: 'scrollbar-thumb-gray-400',
      scrollTrack: 'scrollbar-track-gray-200',
    };
  }
});

// 模拟日志统计数据
const generateLogStats = (): LogStat[] => {
  const total = 10000;
  const errorCount = Math.floor(Math.random() * 50) + 10;
  const warnCount = Math.floor(Math.random() * 200) + 50;
  const infoCount = Math.floor(Math.random() * 3000) + 2000;
  const debugCount = total - errorCount - warnCount - infoCount;

  return [
    {
      level: 'error',
      count: errorCount,
      percentage: (errorCount / total) * 100,
      color: '#ef4444'
    },
    {
      level: 'warn',
      count: warnCount,
      percentage: (warnCount / total) * 100,
      color: '#f59e0b'
    },
    {
      level: 'info',
      count: infoCount,
      percentage: (infoCount / total) * 100,
      color: '#3b82f6'
    },
    {
      level: 'debug',
      count: debugCount,
      percentage: (debugCount / total) * 100,
      color: '#6b7280'
    }
  ];
};

// 模拟最近日志数据
const generateRecentLogs = (): RecentLog[] => {
  const logMessages = [
    { level: 'error' as const, message: '数据库连接超时', service: 'user-service' },
    { level: 'warn' as const, message: '内存使用率超过阈值', service: 'api-gateway' },
    { level: 'error' as const, message: 'Redis连接失败', service: 'cache-service' },
    { level: 'info' as const, message: '用户登录成功', service: 'auth-service' },
    { level: 'warn' as const, message: 'API响应时间过长', service: 'order-service' },
    { level: 'error' as const, message: '支付接口调用失败', service: 'payment-service' },
    { level: 'info' as const, message: '定时任务执行完成', service: 'scheduler' },
    { level: 'debug' as const, message: '缓存命中率统计', service: 'cache-service' }
  ];

  return logMessages.slice(0, 6).map((log, index) => ({
    id: `log-${Date.now()}-${index}`,
    ...log,
    time: new Date(Date.now() - Math.random() * 3600000).toLocaleTimeString('zh-CN', { hour12: false })
  }));
};

const getLevelText = (level: string) => {
  switch (level) {
    case 'error':
      return 'ERROR';
    case 'warn':
      return 'WARN';
    case 'info':
      return 'INFO';
    case 'debug':
      return 'DEBUG';
    default:
      return 'UNKNOWN';
  }
};

const getLevelColor = (level: string) => {
  switch (level) {
    case 'error':
      return '#ef4444';
    case 'warn':
      return '#f59e0b';
    case 'info':
      return '#3b82f6';
    case 'debug':
      return '#6b7280';
    default:
      return '#6b7280';
  }
};

let timer: NodeJS.Timeout | null = null;

const updateData = () => {
  logStats.value = generateLogStats();
  recentLogs.value = generateRecentLogs();
};

onMounted(() => {
  updateData();
  // 每45秒更新一次数据
  timer = setInterval(updateData, 45000);
});

onUnmounted(() => {
  if (timer) {
    clearInterval(timer);
  }
});
</script>

<template>
  <div class="h-80 flex flex-col">
    <!-- 日志统计 -->
    <div class="mb-4">
      <h4 :class="`${themeClasses.titleColor} text-sm font-medium mb-3`">日志级别统计</h4>
      <div class="grid grid-cols-2 gap-3">
        <div v-for="stat in logStats" :key="stat.level" class="space-y-1">
          <div class="flex items-center justify-between text-xs">
            <span :class="themeClasses.textColor">{{ getLevelText(stat.level) }}</span>
            <span :class="themeClasses.valueColor">{{ stat.count }}</span>
          </div>
          <Progress
            :percent="stat.percentage"
            :stroke-color="stat.color"
            :show-info="false"
            size="small"
            class="custom-progress"
          />
        </div>
      </div>
    </div>

    <!-- 最近日志 -->
    <div class="flex-1 overflow-hidden">
      <h4 :class="`${themeClasses.titleColor} text-sm font-medium mb-3`">最近日志</h4>
      <div :class="`h-40 overflow-y-auto scrollbar-thin ${themeClasses.scrollThumb} ${themeClasses.scrollTrack} space-y-2`">
        <div
          v-for="log in recentLogs"
          :key="log.id"
          :class="`p-2 rounded border ${themeClasses.cardBorder} ${themeClasses.cardBg} ${themeClasses.cardHover} transition-colors`"
        >
          <div class="flex items-center justify-between mb-1">
            <Tag :color="getLevelColor(log.level)" class="text-xs px-1 py-0 min-w-0">
              {{ getLevelText(log.level) }}
            </Tag>
            <span :class="`text-xs ${themeClasses.textColor}`">{{ log.time }}</span>
          </div>
          <p :class="`text-xs ${themeClasses.valueColor} mb-1 truncate`">{{ log.message }}</p>
          <span :class="`text-xs ${isDark ? 'text-blue-400' : 'text-blue-600'}`">{{ log.service }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
:deep(.ant-progress-bg) {
  border-radius: 2px;
}

/* 深色模式进度条背景 */
.dark :deep(.ant-progress-outer) {
  background-color: rgba(71, 85, 105, 0.3);
}

/* 浅色模式进度条背景 */
:deep(.ant-progress-outer) {
  background-color: rgba(229, 231, 235, 0.5);
}

:deep(.ant-tag) {
  border: none;
  font-size: 10px;
  line-height: 1.2;
  padding: 1px 4px;
  margin: 0;
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
