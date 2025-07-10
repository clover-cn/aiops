import { requestClient } from '#/api/request';

export interface SystemMetrics {
  timePoints: string[];
  cpuData: number[];
  memoryData: number[];
  diskData: number[];
}

export interface NetworkTraffic {
  timePoints: string[];
  inboundData: number[];
  outboundData: number[];
  currentTraffic: {
    inbound: number;
    outbound: number;
    timestamp: string;
  };
}

/**
 * 获取系统性能指标
 */
export async function getSystemMetricsApi() {
  return requestClient.get<SystemMetrics>('/aiops/system-metrics');
}

/**
 * 获取网络流量监控数据
 */
export async function getNetworkTrafficApi() {
  return requestClient.get<NetworkTraffic>('/aiops/network-traffic');
}

/**
 * 获取命令执行结果
 */
export async function getExecuteCommandApi(command: string) {
  // return requestClient.get('/aiops/runner', { params: { data: req } });
  return requestClient.post('/aiops/runner', { command });
}
