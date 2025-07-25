<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';

import { onMounted, ref, onUnmounted, computed } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';
import { usePreferences } from '@vben/preferences';
import { getDockerInfoApi } from '#/api/index';
import { message } from 'ant-design-vue';
import { 
  Card, 
  Statistic, 
  Table, 
  Tag, 
  Descriptions, 
  DescriptionsItem 
} from 'ant-design-vue';

// 定义Props
const props = defineProps({
  refreshInterval: {
    type: Number,
    required: false,
    default: 30000
  }
});

// 图表引用
const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);
const { isDark } = usePreferences();

// 数据状态
const dockerInfo = ref<any>(null);
const loading = ref(false);
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
      backgroundColor: 'rgba(30, 41, 59, 0.5)'
    };
  } else {
    return {
      tooltipBg: 'rgba(255, 255, 255, 0.95)',
      tooltipBorder: 'rgba(229, 231, 235, 0.8)',
      textColor: '#374151',
      axisLineColor: 'rgba(229, 231, 235, 0.8)',
      axisLabelColor: '#6b7280',
      splitLineColor: 'rgba(229, 231, 235, 0.5)',
      backgroundColor: 'rgba(249, 250, 251, 0.8)'
    };
  }
});

// 获取Docker状态数据
const fetchDockerInfo = async () => {
  try {
    loading.value = true;
    const data = await getDockerInfoApi();
    dockerInfo.value = data;
    updateChart();
  } catch (error) {
    console.error('获取Docker状态失败:', error);
    message.error('获取Docker状态失败，请稍后重试');
  } finally {
    loading.value = false;
  }
};

// 更新图表
const updateChart = () => {
  if (!dockerInfo.value || !dockerInfo.value.data) return;
  
  const { systemInfo, containerDetails } = dockerInfo.value.data;
  const colors = themeColors.value;
  
  // 准备容器状态数据
  const statusData = [
    { name: '运行中', value: systemInfo.containers.running, itemStyle: { color: '#10b981' } },
    { name: '已停止', value: systemInfo.containers.stopped, itemStyle: { color: '#ef4444' } },
    { name: '已暂停', value: systemInfo.containers.paused, itemStyle: { color: '#f59e0b' } }
  ];
  
  // 准备镜像数据
  const imageData = [
    { name: '镜像总数', value: systemInfo.images.total, itemStyle: { color: '#3b82f6' } }
  ];
  
  // 图表选项
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: {
        color: colors.textColor
      }
    },
    legend: {
      show: false
    },
    series: [
      {
        name: '容器状态',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['25%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: 'transparent',
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 20,
            fontWeight: 'bold',
            color: colors.textColor
          }
        },
        labelLine: {
          show: false
        },
        data: statusData
      },
      {
        name: '镜像统计',
        type: 'pie',
        radius: ['20%', '35%'],
        center: ['25%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 5,
          borderColor: 'transparent',
          borderWidth: 2
        },
        label: {
          show: false
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 16,
            fontWeight: 'bold',
            color: colors.textColor
          }
        },
        labelLine: {
          show: false
        },
        data: imageData
      }
    ]
  };
  
  renderEcharts(option as any);
};

// 容器状态标签颜色
const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'running':
      return 'success';
    case 'exited':
      return 'error';
    case 'paused':
      return 'warning';
    default:
      return 'default';
  }
};

// 容器状态标签文本
const getStatusText = (status: string) => {
  switch (status.toLowerCase()) {
    case 'running':
      return '运行中';
    case 'exited':
      return '已停止';
    case 'paused':
      return '已暂停';
    default:
      return status;
  }
};

// 格式化内存大小
const formatMemory = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 格式化时间
const formatTime = (time: string) => {
  if (!time || time === '0001-01-01T00:00:00Z') return '-';
  return new Date(time).toLocaleString('zh-CN');
};

onMounted(async () => {
  await fetchDockerInfo();
  timer = setInterval(fetchDockerInfo, props.refreshInterval);
});

onUnmounted(() => {
  if (timer) {
    clearInterval(timer);
  }
});
</script>

<template>
  <div class="docker-status-container">
    <!-- 系统信息概览 -->
    <div v-if="dockerInfo && dockerInfo.data" class="mb-6">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card :class="isDark ? 'bg-slate-800/50' : 'bg-white/80'">
          <Statistic 
            title="运行中容器" 
            :value="dockerInfo.data.systemInfo.containers.running"
            :value-style="{ color: '#10b981' }"
          />
        </Card>
        <Card :class="isDark ? 'bg-slate-800/50' : 'bg-white/80'">
          <Statistic 
            title="已停止容器" 
            :value="dockerInfo.data.systemInfo.containers.stopped"
            :value-style="{ color: '#ef4444' }"
          />
        </Card>
        <Card :class="isDark ? 'bg-slate-800/50' : 'bg-white/80'">
          <Statistic 
            title="镜像总数" 
            :value="dockerInfo.data.systemInfo.images.total"
            :value-style="{ color: '#3b82f6' }"
          />
        </Card>
        <Card :class="isDark ? 'bg-slate-800/50' : 'bg-white/80'">
          <Statistic 
            title="CPU核心数" 
            :value="dockerInfo.data.systemInfo.system.cpus"
            :value-style="{ color: '#8b5cf6' }"
          />
        </Card>
      </div>
      
      <!-- 图表和系统详情 -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <!-- 容器状态图表 -->
        <Card :class="isDark ? 'bg-slate-800/50' : 'bg-white/80'" title="容器状态分布">
          <div class="h-64">
            <EchartsUI ref="chartRef" class="h-full w-full" />
          </div>
        </Card>
        
        <!-- 系统信息详情 -->
        <Card :class="isDark ? 'bg-slate-800/50' : 'bg-white/80'" title="Docker系统信息">
          <Descriptions :column="1" size="small" bordered>
            <DescriptionsItem label="Docker版本">
              {{ dockerInfo.data.systemInfo.system.serverVersion }}
            </DescriptionsItem>
            <DescriptionsItem label="API版本">
              {{ dockerInfo.data.systemInfo.system.apiVersion }}
            </DescriptionsItem>
            <DescriptionsItem label="操作系统">
              {{ dockerInfo.data.systemInfo.system.operatingSystem }}
            </DescriptionsItem>
            <DescriptionsItem label="架构">
              {{ dockerInfo.data.systemInfo.system.architecture }}
            </DescriptionsItem>
            <DescriptionsItem label="总内存">
              {{ formatMemory(dockerInfo.data.systemInfo.system.memory) }}
            </DescriptionsItem>
            <DescriptionsItem label="Docker根目录">
              {{ dockerInfo.data.systemInfo.dockerRootDir }}
            </DescriptionsItem>
          </Descriptions>
        </Card>
      </div>
      
      <!-- 容器列表 -->
      <Card :class="isDark ? 'bg-slate-800/50' : 'bg-white/80'" title="容器列表">
        <Table 
          :data-source="dockerInfo.data.containerDetails" 
          :pagination="false" 
          :scroll="{ x: true }"
          size="small"
        >
          <Table.Column title="容器ID" dataIndex="id" key="id" :width="120" />
          <Table.Column title="名称" dataIndex="name" key="name" :width="150" />
          <Table.Column title="镜像" dataIndex="image" key="image" :width="200" />
          <Table.Column title="状态" key="status" :width="100">
            <template #default="{ record }">
              <Tag :color="getStatusColor(record.status)">
                {{ getStatusText(record.status) }}
              </Tag>
            </template>
          </Table.Column>
          <Table.Column title="创建时间" key="created" :width="180">
            <template #default="{ record }">
              {{ formatTime(record.created) }}
            </template>
          </Table.Column>
          <Table.Column title="启动时间" key="startedAt" :width="180">
            <template #default="{ record }">
              {{ formatTime(record.startedAt) }}
            </template>
          </Table.Column>
        </Table>
      </Card>
    </div>
    
    <!-- 加载状态 -->
    <div v-else class="flex items-center justify-center h-64">
      <div class="text-center">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-2"></div>
        <p class="text-gray-500">正在加载Docker状态信息...</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.docker-status-container {
  padding: 16px;
}

:deep(.ant-card) {
  border-radius: 8px;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

:deep(.ant-statistic-title) {
  font-size: 14px;
}

:deep(.ant-statistic-content) {
  font-size: 24px;
  font-weight: 600;
}

:deep(.ant-descriptions-item-label) {
  font-weight: 500;
}

.dark :deep(.ant-card) {
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(71, 85, 105, 0.5);
}

.dark :deep(.ant-table) {
  background: rgba(30, 41, 59, 0.3);
}

.dark :deep(.ant-table-thead > tr > th) {
  background: rgba(15, 23, 42, 0.8);
  color: #e2e8f0;
}

.dark :deep(.ant-table-tbody > tr > td) {
  color: #cbd5e1;
}
</style>