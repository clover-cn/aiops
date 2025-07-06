<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';

import { onMounted, ref, onUnmounted } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);

let timer: NodeJS.Timeout | null = null;

// 模拟服务健康状态数据
const generateServiceData = () => {
  const services = [
    { name: 'API网关', healthy: 98, total: 100 },
    { name: '用户服务', healthy: 95, total: 100 },
    { name: '订单服务', healthy: 92, total: 100 },
    { name: '支付服务', healthy: 97, total: 100 },
    { name: '消息队列', healthy: 89, total: 100 },
    { name: '数据库集群', healthy: 94, total: 100 },
    { name: '缓存服务', healthy: 96, total: 100 },
    { name: '文件存储', healthy: 91, total: 100 }
  ];

  // 添加一些随机波动
  return services.map(service => ({
    ...service,
    healthy: Math.max(85, Math.min(100, service.healthy + (Math.random() - 0.5) * 6))
  }));
};

const updateChart = () => {
  const services = generateServiceData();

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      borderColor: 'rgba(71, 85, 105, 0.5)',
      textStyle: {
        color: '#e2e8f0'
      },
      formatter: function(params: any) {
        const data = params[0];
        const healthyPercent = (data.value / 100 * 100).toFixed(1);
        return `${data.name}<br/>健康度: ${healthyPercent}%`;
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '8%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: services.map(s => s.name),
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
      type: 'value',
      min: 80,
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
    series: [
      {
        name: '服务健康度',
        type: 'bar',
        data: services.map(s => s.healthy),
        itemStyle: {
          color: function(params: any) {
            const value = params.value;
            if (value >= 95) return '#10b981'; // 绿色 - 健康
            if (value >= 90) return '#f59e0b'; // 黄色 - 警告
            return '#ef4444'; // 红色 - 异常
          },
          borderRadius: [4, 4, 0, 0]
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.3)'
          }
        },
        label: {
          show: true,
          position: 'top',
          color: '#e2e8f0',
          fontSize: 10,
          formatter: '{c}%'
        }
      }
    ]
  };

  renderEcharts(option as any);
};

onMounted(() => {
  updateChart();
  // 每45秒更新一次数据
  timer = setInterval(updateChart, 45000);
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
