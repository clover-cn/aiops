<script lang="ts" setup>
import type { AnalysisOverviewItem } from '@vben/common-ui';

import { computed } from 'vue';
import {
  AnalysisChartCard,
  AnalysisOverview,
} from '@vben/common-ui';
import {
  SvgBellIcon,
  SvgCakeIcon,
  SvgCardIcon,
  SvgDownloadIcon,
} from '@vben/icons';
import { usePreferences } from '@vben/preferences';

import SystemMetrics from './system-metrics.vue';
import AlertsPanel from './alerts-panel.vue';
import ServiceHealth from './service-health.vue';
import NetworkTraffic from './network-traffic.vue';
import ResourceUsage from './resource-usage.vue';
import LogAnalysis from './log-analysis.vue';

const { isDark } = usePreferences();
// 统一定时器刷新时间
const REFRESH_INTERVAL = 30000; // 30秒

// 计算主题相关的样式类
const containerClasses = computed(() => {
  return isDark.value
    ? 'min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4'
    : 'min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 p-4';
});

const titleClasses = computed(() => {
  return isDark.value
    ? 'text-3xl font-bold text-white mb-2'
    : 'text-3xl font-bold text-gray-800 mb-2';
});

const subtitleClasses = computed(() => {
  return isDark.value
    ? 'text-blue-200'
    : 'text-blue-600';
});

const cardClasses = computed(() => {
  return isDark.value
    ? 'bg-slate-800/50 backdrop-blur-sm border-slate-700'
    : 'bg-white/80 backdrop-blur-sm border-gray-200 shadow-sm';
});

// 系统概览数据
const overviewItems: AnalysisOverviewItem[] = [
  {
    icon: SvgCardIcon,
    title: '在线服务',
    totalTitle: '总服务数',
    totalValue: 156,
    value: 142,
  },
  {
    icon: SvgCakeIcon,
    title: '活跃告警',
    totalTitle: '今日告警',
    totalValue: 23,
    value: 5,
  },
  {
    icon: SvgDownloadIcon,
    title: 'CPU使用率',
    totalTitle: '平均使用率',
    totalValue: 75,
    value: 68,
  },
  {
    icon: SvgBellIcon,
    title: '内存使用率',
    totalTitle: '平均使用率',
    totalValue: 82,
    value: 76,
  },
];
</script>

<template>
  <div :class="containerClasses">
    <!-- 页面标题 -->
    <div class="mb-6 text-center">
      <h1 :class="titleClasses">智能运维监控大屏</h1>
      <p :class="subtitleClasses">AIOps Intelligent Operations Dashboard</p>
    </div>

    <!-- 系统概览 -->
    <div class="mb-6">
      <AnalysisOverview :items="overviewItems" />
    </div>

    <!-- 第一行：系统指标和告警面板 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <AnalysisChartCard
        title="系统性能指标"
        :class="cardClasses"
      >
        <SystemMetrics :refreshInterval="REFRESH_INTERVAL"/>
      </AnalysisChartCard>

      <AnalysisChartCard
        title="实时告警监控"
        :class="cardClasses"
      >
        <AlertsPanel />
      </AnalysisChartCard>
    </div>

    <!-- 第二行：服务健康状态和网络流量 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <AnalysisChartCard
        title="服务健康状态"
        :class="cardClasses"
      >
        <ServiceHealth />
      </AnalysisChartCard>

      <AnalysisChartCard
        title="网络流量监控"
        :class="cardClasses"
      >
        <NetworkTraffic :refreshInterval="REFRESH_INTERVAL"/>
      </AnalysisChartCard>
    </div>

    <!-- 第三行：资源使用情况和日志分析 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <AnalysisChartCard
        title="资源使用趋势"
        :class="cardClasses"
      >
        <ResourceUsage />
      </AnalysisChartCard>

      <AnalysisChartCard
        title="日志分析"
        :class="cardClasses"
      >
        <LogAnalysis />
      </AnalysisChartCard>
    </div>
  </div>
</template>

<style scoped>
/* 自定义样式，增强大屏效果 */
/* 深色模式样式 */
.dark :deep(.ant-card) {
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(71, 85, 105, 0.5);
  backdrop-filter: blur(8px);
}

.dark :deep(.ant-card-head) {
  border-bottom: 1px solid rgba(71, 85, 105, 0.3);
  background: rgba(15, 23, 42, 0.6);
}

.dark :deep(.ant-card-head-title) {
  color: #e2e8f0;
  font-weight: 600;
}

.dark :deep(.ant-card-body) {
  color: #cbd5e1;
}

/* 浅色模式样式 */
:deep(.ant-card) {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(229, 231, 235, 0.8);
  backdrop-filter: blur(8px);
}

:deep(.ant-card-head) {
  border-bottom: 1px solid rgba(229, 231, 235, 0.5);
  background: rgba(249, 250, 251, 0.8);
}

:deep(.ant-card-head-title) {
  color: #374151;
  font-weight: 600;
}

:deep(.ant-card-body) {
  color: #6b7280;
}
</style>
