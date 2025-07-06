<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';

import { onMounted, ref, onUnmounted } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);

let timer: NodeJS.Timeout | null = null;

// 存储历史数据点，用于生成连续的趋势
let historicalData = {
  cpu: [] as number[],
  memory: [] as number[],
  disk: [] as number[]
};

// 生成更真实的波动数据
const generateRealisticValue = (lastValue: number, baseValue: number, volatility: number = 5) => {
  if (lastValue === 0) return baseValue;

  // 基于上一个值进行小幅波动，同时有向基准值回归的趋势
  const trend = (baseValue - lastValue) * 0.1; // 10%的回归趋势
  const randomChange = (Math.random() - 0.5) * volatility * 2;
  const newValue = lastValue + trend + randomChange;

  return Math.max(10, Math.min(95, newValue));
};

// 模拟更真实的实时数据
const generateMetricsData = () => {
  const now = new Date();
  const timePoints: string[] = [];
  const cpuData: number[] = [];
  const memoryData: number[] = [];
  const diskData: number[] = [];

  // 基准值
  const baseCpu = 68;
  const baseMemory = 76;
  const baseDisk = 45;

  for (let i = 29; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60000); // 每分钟一个点
    timePoints.push(time.toLocaleTimeString('zh-CN', { hour12: false }));

    const dataIndex = 29 - i;

    // 生成连续的数据点
    if (dataIndex === 0) {
      // 第一个数据点
      cpuData.push(baseCpu + (Math.random() - 0.5) * 10);
      memoryData.push(baseMemory + (Math.random() - 0.5) * 8);
      diskData.push(baseDisk + (Math.random() - 0.5) * 6);
    } else {
      // 基于前一个数据点生成
      cpuData.push(generateRealisticValue(cpuData[dataIndex - 1] ?? 0, baseCpu, 3));
      memoryData.push(generateRealisticValue(memoryData[dataIndex - 1] ?? 0, baseMemory, 2));
      diskData.push(generateRealisticValue(diskData[dataIndex - 1] ?? 0, baseDisk, 1));
    }
  }

  // 保存最新的数据用于下次生成
  historicalData.cpu = cpuData.slice(-5);
  historicalData.memory = memoryData.slice(-5);
  historicalData.disk = diskData.slice(-5);

  return {
    timePoints,
    cpuData: cpuData.map(v => Math.round(v)),
    memoryData: memoryData.map(v => Math.round(v)),
    diskData: diskData.map(v => Math.round(v))
  };
};

const updateChart = () => {
  const { timePoints, cpuData, memoryData, diskData } = generateMetricsData();

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      borderColor: 'rgba(71, 85, 105, 0.5)',
      textStyle: {
        color: '#e2e8f0'
      }
    },
    legend: {
      data: ['CPU使用率', '内存使用率', '磁盘使用率'],
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
        name: 'CPU使用率',
        type: 'line',
        smooth: true,
        data: cpuData,
        lineStyle: {
          color: '#ef4444',
          width: 2
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(239, 68, 68, 0.3)' },
              { offset: 1, color: 'rgba(239, 68, 68, 0.05)' }
            ]
          }
        },
        symbol: 'circle',
        symbolSize: 4
      },
      {
        name: '内存使用率',
        type: 'line',
        smooth: true,
        data: memoryData,
        lineStyle: {
          color: '#3b82f6',
          width: 2
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0.05)' }
            ]
          }
        },
        symbol: 'circle',
        symbolSize: 4
      },
      {
        name: '磁盘使用率',
        type: 'line',
        smooth: true,
        data: diskData,
        lineStyle: {
          color: '#10b981',
          width: 2
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(16, 185, 129, 0.3)' },
              { offset: 1, color: 'rgba(16, 185, 129, 0.05)' }
            ]
          }
        },
        symbol: 'circle',
        symbolSize: 4
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
