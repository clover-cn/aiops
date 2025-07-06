<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';

import { onMounted, ref, onUnmounted } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);

let timer: NodeJS.Timeout | null = null;

// 存储历史流量数据
let lastInbound = 45;
let lastOutbound = 35;

// 生成更真实的网络流量数据
const generateNetworkData = () => {
  const now = new Date();
  const timePoints: string[] = [];
  const inboundData: number[] = [];
  const outboundData: number[] = [];

  // 基准流量值
  const baseInbound = 45; // 45 Mbps
  const baseOutbound = 35; // 35 Mbps

  for (let i = 19; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60000); // 每分钟一个点
    timePoints.push(time.toLocaleTimeString('zh-CN', { hour12: false }));

    // 模拟业务高峰期（工作时间流量更高）
    const hour = time.getHours();
    let peakMultiplier = 1;
    if (hour >= 9 && hour <= 18) {
      peakMultiplier = 1.3 + Math.sin((hour - 9) / 9 * Math.PI) * 0.4; // 工作时间流量波动
    } else {
      peakMultiplier = 0.6 + Math.random() * 0.3; // 非工作时间较低流量
    }

    // 生成连续的入站流量数据
    const inboundTrend = (baseInbound * peakMultiplier - lastInbound) * 0.15;
    const inboundNoise = (Math.random() - 0.5) * 8;
    lastInbound = Math.max(5, Math.min(100, lastInbound + inboundTrend + inboundNoise));
    inboundData.push(Math.round(lastInbound));

    // 生成连续的出站流量数据（通常比入站流量小）
    const outboundTrend = (baseOutbound * peakMultiplier * 0.8 - lastOutbound) * 0.15;
    const outboundNoise = (Math.random() - 0.5) * 6;
    lastOutbound = Math.max(3, Math.min(80, lastOutbound + outboundTrend + outboundNoise));
    outboundData.push(Math.round(lastOutbound));
  }

  return { timePoints, inboundData, outboundData };
};

const updateChart = () => {
  const { timePoints, inboundData, outboundData } = generateNetworkData();

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      borderColor: 'rgba(71, 85, 105, 0.5)',
      textStyle: {
        color: '#e2e8f0'
      },
      formatter: function(params: any) {
        let result = `${params[0].name}<br/>`;
        params.forEach((param: any) => {
          result += `${param.seriesName}: ${param.value} Mbps<br/>`;
        });
        return result;
      }
    },
    legend: {
      data: ['入站流量', '出站流量'],
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
      type: 'category',
      boundaryGap: false,
      data: timePoints,
      axisLine: {
        lineStyle: {
          color: 'rgba(71, 85, 105, 0.5)'
        }
      },
      axisLabel: {
        color: '#94a3b8',
        fontSize: 10
      }
    },
    yAxis: {
      type: 'value',
      min: 0,
      axisLine: {
        lineStyle: {
          color: 'rgba(71, 85, 105, 0.5)'
        }
      },
      axisLabel: {
        color: '#94a3b8',
        formatter: '{value} Mbps'
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(71, 85, 105, 0.2)'
        }
      }
    },
    series: [
      {
        name: '入站流量',
        type: 'line',
        smooth: true,
        data: inboundData,
        lineStyle: {
          color: '#06b6d4',
          width: 3
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(6, 182, 212, 0.4)' },
              { offset: 1, color: 'rgba(6, 182, 212, 0.05)' }
            ]
          }
        },
        symbol: 'circle',
        symbolSize: 6,
        emphasis: {
          scale: true,
          scaleSize: 8
        }
      },
      {
        name: '出站流量',
        type: 'line',
        smooth: true,
        data: outboundData,
        lineStyle: {
          color: '#8b5cf6',
          width: 3
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(139, 92, 246, 0.4)' },
              { offset: 1, color: 'rgba(139, 92, 246, 0.05)' }
            ]
          }
        },
        symbol: 'circle',
        symbolSize: 6,
        emphasis: {
          scale: true,
          scaleSize: 8
        }
      }
    ]
  };

  renderEcharts(option as any);
};

onMounted(() => {
  updateChart();
  // 每30秒更新一次数据
  timer = setInterval(updateChart, 30000);
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
