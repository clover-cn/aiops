import { requestClient } from '#/api/request';

export interface SystemMetrics {
  timePoints: string[]
  cpuData: number[]
  memoryData: number[]
  diskData: number[]
}

/**
 * 获取系统性能指标
 */
export async function getSystemMetricsApi() {
  return requestClient.get<SystemMetrics>('/aiops/system-metrics');
}
