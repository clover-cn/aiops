<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';

import { onMounted, ref, onUnmounted } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);

let timer: NodeJS.Timeout | null = null;

// 服务器基准配置
const serverConfigs = [
  { name: 'Web-Server-01', cpu: 100, memory: 70, disk: 45, network: 60 },
  { name: 'DB-Server-01', cpu: 80, memory: 85, disk: 60, network: 40 },
  { name: 'Cache-Server-01', cpu: 45, memory: 90, disk: 30, network: 70 },
  { name: 'API-Gateway', cpu: 70, memory: 60, disk: 35, network: 85 },
  { name: 'File-Server-01', cpu: 35, memory: 50, disk: 80, network: 55 }
];

// 存储上一次的数据，用于平滑变化
let lastData: number[][] = [];

// 模拟更真实的资源使用数据
const generateResourceData = () => {
  const categories = ['CPU', '内存', '磁盘', '网络'];
  const servers = serverConfigs.map(config => config.name);

  const data: number[][] = [];

  servers.forEach((server, serverIndex) => {
    const config = serverConfigs[serverIndex];
    categories.forEach((category, categoryIndex) => {
      let baseUsage = 50;

      // 根据服务器类型和资源类型设置基准值
      switch (categoryIndex) {
        case 0: // CPU
          baseUsage = config?.cpu ?? 50;
          break;
        case 1: // 内存
          baseUsage = config?.memory ?? 50;
          break;
        case 2: // 磁盘
          baseUsage = config?.disk ?? 50;
          break;
        case 3: // 网络
          baseUsage = config?.network ?? 50;
          break;
      }

      // 如果有历史数据，基于历史数据进行小幅波动
      let usage = baseUsage;
      if (lastData.length > 0) {
        const lastUsage = lastData.find(item => item[0] === categoryIndex && item[1] === serverIndex)?.[2] || baseUsage;
        // 在上次数据基础上进行±5的随机波动
        usage = Math.max(20, Math.min(95, lastUsage + (Math.random() - 0.5) * 10));
      } else {
        // 首次加载，在基准值基础上进行±10的随机波动
        usage = Math.max(20, Math.min(95, baseUsage + (Math.random() - 0.5) * 20));
      }

      data.push([categoryIndex, serverIndex, Math.round(usage)]);
    });
  });

  // 保存当前数据作为下次的历史数据
  lastData = [...data];

  return { categories, servers, data };
};

const updateChart = () => {
  const { categories, servers, data } = generateResourceData();

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      position: 'top' as const,
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      borderColor: 'rgba(71, 85, 105, 0.5)',
      textStyle: {
        color: '#e2e8f0'
      },
      formatter: function(params: any) {
        const [categoryIndex, serverIndex, value] = params.data;
        const serverName = servers[serverIndex];
        const categoryName = categories[categoryIndex];
        let status = '正常';

        if (value >= 90) {
          status = '高负载';
        } else if (value >= 80) {
          status = '中等负载';
        }

        return `${serverName}<br/>${categoryName}: ${value}%<br/>状态: ${status}`;
      }
    },
    grid: {
      height: '70%',
      top: '10%',
      left: '15%',
      right: '5%'
    },
    xAxis: {
      type: 'category' as const,
      data: categories,
      splitArea: {
        show: true,
        areaStyle: {
          color: ['rgba(71, 85, 105, 0.1)', 'rgba(71, 85, 105, 0.05)']
        }
      },
      axisLine: {
        lineStyle: {
          color: 'rgba(71, 85, 105, 0.5)'
        }
      },
      axisLabel: {
        color: '#94a3b8'
      }
    },
    yAxis: {
      type: 'category' as const,
      data: servers,
      splitArea: {
        show: true,
        areaStyle: {
          color: ['rgba(71, 85, 105, 0.1)', 'rgba(71, 85, 105, 0.05)']
        }
      },
      axisLine: {
        lineStyle: {
          color: 'rgba(71, 85, 105, 0.5)'
        }
      },
      axisLabel: {
        color: '#94a3b8'
      }
    },
    visualMap: {
      min: 20,
      max: 95,
      calculable: true,
      orient: 'horizontal' as const,
      left: 'center',
      bottom: '15%',
      textStyle: {
        color: '#e2e8f0'
      },
      inRange: {
        color: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444']
      }
    },
    series: [
      {
        name: '资源使用率',
        type: 'heatmap' as const,
        data: data,
        label: {
          show: true,
          color: '#ffffff',
          fontSize: 10,
          formatter: '{c}%'
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
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
