<script lang="ts" setup>
import { ref, onMounted, computed } from 'vue';
import { Card, Form, FormItem, InputNumber, Button, message, Divider, Space, Spin } from 'ant-design-vue';
import { usePreferences } from '@vben/preferences';
import { getAlertConfigApi, updateAlertThresholdsApi, type AlertConfig } from '#/api/aiops';

const { isDark } = usePreferences();
const loading = ref(false);
const saving = ref(false);

// 表单数据
const formData = ref<AlertConfig['thresholds']>({
  cpu: {
    warning: 70,
    critical: 85
  },
  memory: {
    warning: 75,
    critical: 90
  },
  disk: {
    warning: 80,
    critical: 95
  }
});

// 计算主题相关的样式类
const themeClasses = computed(() => {
  if (isDark.value) {
    return {
      cardClass: 'bg-slate-800/50 border-slate-700',
      titleClass: 'text-slate-200',
      labelClass: 'text-slate-300',
      descClass: 'text-slate-400'
    };
  } else {
    return {
      cardClass: 'bg-white border-gray-200',
      titleClass: 'text-gray-800',
      labelClass: 'text-gray-700',
      descClass: 'text-gray-600'
    };
  }
});

/**
 * 获取告警配置
 */
const fetchConfig = async () => {
  try {
    loading.value = true;
    const response = await getAlertConfigApi();
    if (response && typeof response === 'object' && 'thresholds' in response) {
      formData.value = (response as any).data.thresholds;
    } else if (response && 'thresholds' in response) {
      formData.value = (response as any).thresholds;
    }
  } catch (error) {
    console.error('获取告警配置失败:', error);
    message.error('获取告警配置失败');
  } finally {
    loading.value = false;
  }
};

/**
 * 保存配置
 */
const saveConfig = async () => {
  try {
    // 验证配置
    for (const [metric, thresholds] of Object.entries(formData.value)) {
      if (thresholds.warning >= thresholds.critical) {
        message.error(`${getMetricName(metric)} 的警告阈值必须小于严重阈值`);
        return;
      }
    }

    saving.value = true;
    await updateAlertThresholdsApi(formData.value);
    message.success('告警配置保存成功');
  } catch (error) {
    console.error('保存告警配置失败:', error);
    message.error('保存告警配置失败');
  } finally {
    saving.value = false;
  }
};

/**
 * 重置为默认值
 */
const resetToDefault = () => {
  formData.value = {
    cpu: {
      warning: 70,
      critical: 85
    },
    memory: {
      warning: 75,
      critical: 90
    },
    disk: {
      warning: 80,
      critical: 95
    }
  };
  message.info('已重置为默认配置');
};

/**
 * 获取指标中文名称
 */
const getMetricName = (metric: string) => {
  const names: Record<string, string> = {
    cpu: 'CPU使用率',
    memory: '内存使用率',
    disk: '磁盘使用率'
  };
  return names[metric] || metric;
};

/**
 * 获取指标描述
 */
const getMetricDescription = (metric: string) => {
  const descriptions: Record<string, string> = {
    cpu: '监控系统CPU使用率，当超过设定阈值时触发告警',
    memory: '监控系统内存使用率，当超过设定阈值时触发告警',
    disk: '监控磁盘使用率，当超过设定阈值时触发告警'
  };
  return descriptions[metric] || '';
};

onMounted(() => {
  fetchConfig();
});
</script>

<template>
  <div class="p-6">
    <div class="mb-6">
      <h2 :class="`text-2xl font-bold ${themeClasses.titleClass}`">告警配置管理</h2>
      <p :class="`mt-2 ${themeClasses.descClass}`">配置系统监控指标的告警阈值</p>
    </div>

    <Spin :spinning="loading">
      <Card :class="`${themeClasses.cardClass} shadow-sm`">
        <template #title>
          <span :class="themeClasses.titleClass">阈值配置</span>
        </template>

        <Form layout="vertical">
          <div v-for="(thresholds, metric) in formData" :key="metric" class="mb-8">
            <Divider>
              <span :class="`text-lg font-medium ${themeClasses.titleClass}`">
                {{ getMetricName(metric) }}
              </span>
            </Divider>
            
            <p :class="`mb-4 text-sm ${themeClasses.descClass}`">
              {{ getMetricDescription(metric) }}
            </p>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormItem>
                <template #label>
                  <span :class="themeClasses.labelClass">警告阈值 (%)</span>
                </template>
                <InputNumber
                  v-model:value="thresholds.warning"
                  :min="1"
                  :max="99"
                  :step="1"
                  class="w-full"
                  placeholder="请输入警告阈值"
                />
                <div :class="`mt-1 text-xs ${themeClasses.descClass}`">
                  当 {{ getMetricName(metric) }} 超过此值时触发警告级别告警
                </div>
              </FormItem>

              <FormItem>
                <template #label>
                  <span :class="themeClasses.labelClass">严重阈值 (%)</span>
                </template>
                <InputNumber
                  v-model:value="thresholds.critical"
                  :min="1"
                  :max="100"
                  :step="1"
                  class="w-full"
                  placeholder="请输入严重阈值"
                />
                <div :class="`mt-1 text-xs ${themeClasses.descClass}`">
                  当 {{ getMetricName(metric) }} 超过此值时触发严重级别告警
                </div>
              </FormItem>
            </div>

            <div :class="`mt-2 p-3 rounded-md ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`">
              <div :class="`text-sm ${themeClasses.descClass}`">
                <strong>当前配置:</strong> 
                警告阈值 {{ thresholds.warning }}%，严重阈值 {{ thresholds.critical }}%
              </div>
            </div>
          </div>

          <Divider />

          <div class="flex justify-end">
            <Space>
              <Button @click="resetToDefault">
                重置默认
              </Button>
              <Button 
                type="primary" 
                :loading="saving"
                @click="saveConfig"
              >
                保存配置
              </Button>
            </Space>
          </div>
        </Form>
      </Card>
    </Spin>
  </div>
</template>

<style scoped>
:deep(.ant-card-head) {
  border-bottom: 1px solid rgba(229, 231, 235, 0.2);
}

.dark :deep(.ant-card-head) {
  border-bottom: 1px solid rgba(71, 85, 105, 0.3);
}

:deep(.ant-divider-horizontal.ant-divider-with-text) {
  margin: 16px 0;
}

:deep(.ant-input-number) {
  width: 100%;
}
</style>
