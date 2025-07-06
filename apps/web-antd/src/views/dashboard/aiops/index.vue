<script lang="ts" setup>
import type { AnalysisOverviewItem } from '@vben/common-ui';

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

import SystemMetrics from './system-metrics.vue';
import AlertsPanel from './alerts-panel.vue';
import ServiceHealth from './service-health.vue';
import NetworkTraffic from './network-traffic.vue';
import ResourceUsage from './resource-usage.vue';
import LogAnalysis from './log-analysis.vue';

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
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
    <!-- 页面标题 -->
    <div class="mb-6 text-center">
      <h1 class="text-3xl font-bold text-white mb-2">智能运维监控大屏</h1>
      <p class="text-blue-200">AIOps Intelligent Operations Dashboard</p>
    </div>

    <!-- 系统概览 -->
    <div class="mb-6">
      <AnalysisOverview :items="overviewItems" />
    </div>

    <!-- 第一行：系统指标和告警面板 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <AnalysisChartCard 
        title="系统性能指标" 
        class="bg-slate-800/50 backdrop-blur-sm border-slate-700"
      >
        <SystemMetrics />
      </AnalysisChartCard>
      
      <AnalysisChartCard 
        title="实时告警监控" 
        class="bg-slate-800/50 backdrop-blur-sm border-slate-700"
      >
        <AlertsPanel />
      </AnalysisChartCard>
    </div>

    <!-- 第二行：服务健康状态和网络流量 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <AnalysisChartCard 
        title="服务健康状态" 
        class="bg-slate-800/50 backdrop-blur-sm border-slate-700"
      >
        <ServiceHealth />
      </AnalysisChartCard>
      
      <AnalysisChartCard 
        title="网络流量监控" 
        class="bg-slate-800/50 backdrop-blur-sm border-slate-700"
      >
        <NetworkTraffic />
      </AnalysisChartCard>
    </div>

    <!-- 第三行：资源使用情况和日志分析 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <AnalysisChartCard 
        title="资源使用趋势" 
        class="bg-slate-800/50 backdrop-blur-sm border-slate-700"
      >
        <ResourceUsage />
      </AnalysisChartCard>
      
      <AnalysisChartCard 
        title="日志分析" 
        class="bg-slate-800/50 backdrop-blur-sm border-slate-700"
      >
        <LogAnalysis />
      </AnalysisChartCard>
    </div>
  </div>
</template>

<style scoped>
/* 自定义样式，增强大屏效果 */
:deep(.ant-card) {
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(71, 85, 105, 0.5);
  backdrop-filter: blur(8px);
}

:deep(.ant-card-head) {
  border-bottom: 1px solid rgba(71, 85, 105, 0.3);
  background: rgba(15, 23, 42, 0.6);
}

:deep(.ant-card-head-title) {
  color: #e2e8f0;
  font-weight: 600;
}

:deep(.ant-card-body) {
  color: #cbd5e1;
}
</style>
