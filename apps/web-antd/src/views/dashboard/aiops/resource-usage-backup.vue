<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';

import { onMounted, ref, onUnmounted } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);

let timer: NodeJS.Timeout | null = null;

// 服务器基准配置
const serverConfigs = [
  { name: 'Web-Server-01', cpu: 65, memory: 70, disk: 45, network: 60 },
  { name: 'DB-Server-01', cpu: 80, memory: 85, disk: 60, network: 40 },
  { name: 'Cache-Server-01', cpu: 45, memory: 90, disk: 30, network: 70 },
  { name: 'API-Gateway', cpu: 70, memory: 60, disk: 35, network: 85 },
  { name: 'File-Server-01', cpu: 35, memory: 50, disk: 80, network: 55 }
];

// 生成资源使用数据（柱状图版本）
const generateResourceData = () => {
  const categories = ['CPU', '内存', '磁盘', '网络'];
  const servers = serverConfigs.map(config => config.name);
  
  const seriesData = categories.map((category, categoryIndex) => {
    const data = servers.map((server, serverIndex) => {
      const config = serverConfigs[serverIndex];
      let baseUsage = 50;
      
      switch (categoryIndex) {
        case 0: baseUsage = config?.cpu ?? 50; break;
        case 1: baseUsage = config?.memory ?? 50; break;
        case 2: baseUsage = config?.disk ?? 50; break;
        case 3: baseUsage = config?.network ?? 50; break;
      }
      
      // 在基准值基础上进行小幅波动
      const usage = Math.max(20, Math.min(95, baseUsage + (Math.random() - 0.5) * 15));
      return Math.round(usage);
    });

    return {
      name: category,
      type: 'bar' as const,
      data: data,
      itemStyle: {
        color: function(params: any) {
          const value = params.value;
          if (value >= 90) return '#ef4444'; // 红色 - 高负载
          if (value >= 80) return '#f59e0b'; // 橙色 - 中等负载
          if (value >= 60) return '#10b981'; // 绿色 - 正常
          return '#3b82f6'; // 蓝色 - 低负载
        }
      }
    };
  });

  return { servers, seriesData };
};

const updateChart = () => {
  const { servers, seriesData } = generateResourceData();

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis' as const,
      axisPointer: {
        type: 'shadow' as const
      },
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      borderColor: 'rgba(71, 85, 105, 0.5)',
      textStyle: {
        color: '#e2e8f0'
      }
    },
    legend: {
      data: ['CPU', '内存', '磁盘', '网络'],
      textStyle: {
        color: '#e2e8f0'
      },
      top: 10
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category' as const,
      data: servers,
      axisLine: {
        lineStyle: {
          color: 'rgba(71, 85, 105, 0.5)'
        }
      },
      axisLabel: {
        color: '#94a3b8',
        fontSize: 10,
        rotate: 45
      }
    },
    yAxis: {
      type: 'value' as const,
      min: 0,
      max: 100,
      axisLine: {
        lineStyle: {
          color: 'rgba(71, 85, 105, 0.5)'
        }
      },
      axisLabel: {
        color: '#94a3b8',
        formatter: '{value}%'
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(71, 85, 105, 0.2)'
        }
      }
    },
    series: seriesData
  };

  renderEcharts(option);
};

onMounted(() => {
  updateChart();
  // 每60秒更新一次数据
  timer = setInterval(updateChart, 60000);
});

onUnmounted(() => {
  if (timer) {
    clearInterval(timer);
  }
});
</script>

<template>
  <div class="h-80">
    <EchartsUI ref="chartRef" class="h-full w-full" />
  </div>
</template>
