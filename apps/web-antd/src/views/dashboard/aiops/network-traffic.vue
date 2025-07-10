<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';

import { onMounted, ref, onUnmounted, computed } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';
import { usePreferences } from '@vben/preferences';
import { getNetworkTrafficApi } from '#/api/index';
import { message } from 'ant-design-vue';

const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);
const { isDark } = usePreferences();
// JavaScript 和 TypeScript环境通用
const props = defineProps({
  refreshInterval: {
    type: Number, // 接收定义期望的类型
    required: true, // 标记为必需，如果父组件没传，Vue会发出警告
    // default: 30000 // 或者提供一个默认值
  }
});

// 仅限 TypeScript环境
// interface Props {
//   refreshInterval?: number; // 可选属性，默认为30秒
// }
// 有默认值
// const props = withDefaults(defineProps<Props>(), {
//   refreshInterval: 30000
// });
// 没有默认值不需要withDefaults
// const props = defineProps<Props>();

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

// 获取网络流量数据并更新图表
const updateChart = async () => {
  try {
    const { timePoints, inboundData, outboundData } = await getNetworkTrafficApi();
    const colors = themeColors.value;
  
    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: colors.tooltipBg,
        borderColor: colors.tooltipBorder,
        textStyle: {
          color: colors.textColor
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
        axisLine: {
          lineStyle: {
            color: colors.axisLineColor
          }
        },
        axisLabel: {
          color: colors.axisLabelColor,
          formatter: '{value} Mbps'
        },
        splitLine: {
          lineStyle: {
            color: colors.splitLineColor
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
  } catch (error) {
    message.error('获取网络流量数据失败，请稍后重试');
  }
};

onMounted(async () => {
  await updateChart();
  timer = setInterval(updateChart, props.refreshInterval);
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
