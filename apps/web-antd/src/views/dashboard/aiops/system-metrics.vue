<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';

import { onMounted, ref, onUnmounted, computed } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';
import { getSystemMetricsApi } from '#/api/index';
import { message } from 'ant-design-vue';
import { usePreferences } from '@vben/preferences';

const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);
const { isDark } = usePreferences();

let timer: NodeJS.Timeout | null = null;


// 计算主题相关的颜色配置
const themeColors = computed(() => {
  if (isDark.value) {
    return {
      tooltipBg: 'rgba(15, 23, 42, 0.9)',
      tooltipBorder: 'rgba(71, 85, 105, 0.5)',
      textColor: '#e2e8f0',
      axisLineColor: 'rgba(71, 85, 105, 0.5)',
      axisLabelColor: '#94a3b8',
      splitLineColor: 'rgba(71, 85, 105, 0.2)',
    };
  } else {
    return {
      tooltipBg: 'rgba(255, 255, 255, 0.95)',
      tooltipBorder: 'rgba(229, 231, 235, 0.8)',
      textColor: '#374151',
      axisLineColor: 'rgba(229, 231, 235, 0.8)',
      axisLabelColor: '#6b7280',
      splitLineColor: 'rgba(229, 231, 235, 0.5)',
    };
  }
});

const updateChart = async () => {
  try {
    const { timePoints, cpuData, memoryData, diskData } = await getSystemMetricsApi();
    const colors = themeColors.value;

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: colors.tooltipBg,
        borderColor: colors.tooltipBorder,
        textStyle: {
          color: colors.textColor
        }
      },
      legend: {
        data: ['CPU使用率', '内存使用率', '磁盘使用率'],
        textStyle: {
          color: colors.textColor
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
            color: colors.axisLineColor
          }
        },
        axisLabel: {
          color: colors.axisLabelColor,
          fontSize: 10
        }
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        axisLine: {
          lineStyle: {
            color: colors.axisLineColor
          }
        },
        axisLabel: {
          color: colors.axisLabelColor,
          formatter: '{value}%'
        },
        splitLine: {
          lineStyle: {
            color: colors.splitLineColor
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
  } catch (error) {
    message.error('更新图表数据失败，请稍后重试');
  }
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
