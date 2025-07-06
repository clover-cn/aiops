<script lang="ts" setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { Progress, Tag } from 'ant-design-vue';

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
      <h4 class="text-slate-300 text-sm font-medium mb-3">日志级别统计</h4>
      <div class="grid grid-cols-2 gap-3">
        <div v-for="stat in logStats" :key="stat.level" class="space-y-1">
          <div class="flex items-center justify-between text-xs">
            <span class="text-slate-400">{{ getLevelText(stat.level) }}</span>
            <span class="text-slate-300">{{ stat.count }}</span>
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
      <h4 class="text-slate-300 text-sm font-medium mb-3">最近日志</h4>
      <div class="h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800 space-y-2">
        <div
          v-for="log in recentLogs"
          :key="log.id"
          class="p-2 rounded border border-slate-700/50 bg-slate-800/30 hover:bg-slate-700/30 transition-colors"
        >
          <div class="flex items-center justify-between mb-1">
            <Tag :color="getLevelColor(log.level)" class="text-xs px-1 py-0 min-w-0">
              {{ getLevelText(log.level) }}
            </Tag>
            <span class="text-xs text-slate-500">{{ log.time }}</span>
          </div>
          <p class="text-xs text-slate-300 mb-1 truncate">{{ log.message }}</p>
          <span class="text-xs text-blue-400">{{ log.service }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
:deep(.ant-progress-bg) {
  border-radius: 2px;
}

:deep(.ant-progress-outer) {
  background-color: rgba(71, 85, 105, 0.3);
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

.scrollbar-thumb-slate-600::-webkit-scrollbar-thumb {
  background-color: #475569;
  border-radius: 4px;
}

.scrollbar-track-slate-800::-webkit-scrollbar-track {
  background-color: #1e293b;
}

::-webkit-scrollbar {
  width: 6px;
}
</style>
