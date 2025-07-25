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

export interface Alert {
  id: string;
  key: string;
  level: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  service: string;
  metricType: string;
  currentValue: number;
  threshold: number;
  unit: string;
  time: string;
  timeDisplay: string;
  status: 'active' | 'resolved';
  count: number;
  resolvedTime?: string;
}

export interface AlertStats {
  active: {
    total: number;
    critical: number;
    warning: number;
    info: number;
  };
  today: {
    total: number;
    critical: number;
    warning: number;
    info: number;
  };
}

export interface AlertConfig {
  thresholds: {
    cpu: {
      warning: number;
      critical: number;
    };
    memory: {
      warning: number;
      critical: number;
    };
    disk: {
      warning: number;
      critical: number;
    };
  };
  checkInterval: number;
  retentionDays: number;
  maxAlerts: number;
}

export interface SystemOverview {
  services: {
    online: number;
    total: number;
  };
  alerts: {
    active: number;
    today: number;
  };
  cpu: {
    current: number;
    average: number;
  };
  memory: {
    current: number;
    average: number;
  };
}

export interface DockerSystemInfo {
  containers: {
    total: number;
    running: number;
    stopped: number;
    paused: number;
  };
  images: {
    total: number;
  };
  system: {
    name: string;
    serverVersion: string;
    apiVersion: string;
    operatingSystem: string;
    architecture: string;
    cpus: number;
    memory: number;
  };
  dockerRootDir: string;
  loggingDriver: string;
  cgroupDriver: string;
}

export interface DockerContainer {
  id: string;
  name: string;
  image: string;
  status: string;
  startedAt: string;
  finishedAt: string;
  ports: any;
  labels: any;
  created: string;
}

export interface DockerInfo {
  systemInfo: DockerSystemInfo;
  containerDetails: DockerContainer[];
  timestamp: string;
}

export interface DockerContainerStats {
  cpuUsage: number;
  memoryUsage: number;
  memoryLimit: number;
  networkRx: number;
  networkTx: number;
  blockRead: number;
  blockWrite: number;
}

export interface DockerContainerDetail {
  id: string;
  name: string;
  image: string;
  status: string;
  startedAt: string;
  finishedAt: string;
  ports: any;
  labels: any;
  env: string[];
  cmd: string[];
  created: string;
  mounts: any[];
  networkSettings: any;
  hostConfig: any;
}

// RAG相关接口类型定义
export interface RAGQueryRequest {
  query: string;
  topK?: number;
  threshold?: number;
}

export interface RAGQueryResult {
  success: boolean;
  query: string;
  relevantKnowledge: {
    success: boolean;
    query: string;
    results: Array<{
      id: string;
      content: string;
      metadata: {
        intent: string;
        description: string;
        keywords: string;
        commandTemplate: string;
        parameters: string;
        riskLevel: string;
        category: string;
        examples: string;
      };
      similarity: number;
      distance: number;
    }>;
    totalFound: number;
    threshold: number;
    topK: number;
  };
  timestamp: string;
}

export interface RAGCategorySearchRequest {
  query: string;
  category: string;
  topK?: number;
  threshold?: number;
}

export interface RAGRiskSearchRequest {
  query: string;
  riskLevel: string;
  topK?: number;
  threshold?: number;
}

export interface KnowledgeItem {
  id?: string;
  intent: string;
  description: string;
  keywords: string[];
  commandTemplate?: string;
  parameters?: Array<{
    name: string;
    type: string;
    required?: boolean;
    default?: any;
    description?: string;
  }>;
  riskLevel: 'low' | 'medium' | 'high';
  category: string;
  examples?: string[];
}

export interface KnowledgeListResponse {
  success: boolean;
  data: KnowledgeItem[];
  total: number;
  page: number;
  pageSize: number;
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
 * 获取Docker状态监控数据
 */
export async function getDockerInfoApi() {
  return requestClient.get<DockerInfo>('/aiops/docker');
}

/**
 * 获取特定容器的详细信息
 */
export async function getDockerContainerDetailApi(id: string) {
  return requestClient.get<DockerContainerDetail>(`/aiops/docker/container/${id}`);
}

/**
 * 获取容器统计信息
 */
export async function getDockerContainerStatsApi(id: string) {
  return requestClient.get<{ stats: DockerContainerStats; timestamp: string }>(`/aiops/docker/container/${id}/stats`);
}

/**
 * 获取命令执行结果（短时间运行命令）
 */
export async function getExecuteCommandApi(command: string) {
  // return requestClient.get('/aiops/runner', { params: { data: req } });
  return requestClient.post('/aiops/runner', { command }, { timeout: 30000 });
}

/**
 * 流式命令执行（长时间运行命令）
 */
export async function executeStreamCommandApi(command: string) {
  return requestClient.post('/aiops/runner/stream', { command });
}

/**
 * 获取进程状态和输出
 */
export async function getProcessStatusApi(processId: string) {
  return requestClient.get(`/aiops/runner/process/${processId}`);
}

/**
 * 终止进程
 */
export async function terminateProcessApi(processId: string) {
  return requestClient.delete(`/aiops/runner/process/${processId}`);
}

/**
 * 获取所有运行中的进程
 */
export async function getRunningProcessesApi() {
  return requestClient.get('/aiops/runner/processes');
}

// 告警相关API函数

/**
 * 获取活跃告警列表
 */
export async function getAlertsApi() {
  return requestClient.get<Alert[]>('/aiops/alerts');
}

/**
 * 获取告警统计信息
 */
export async function getAlertStatsApi() {
  return requestClient.get<AlertStats>('/aiops/alerts/stats');
}

/**
 * 获取告警历史记录
 */
export async function getAlertHistoryApi(limit?: number) {
  return requestClient.get<Alert[]>('/aiops/alerts/history', {
    params: { limit }
  });
}

/**
 * 获取告警配置
 */
export async function getAlertConfigApi() {
  return requestClient.get<AlertConfig>('/aiops/alerts/config');
}

/**
 * 更新告警阈值配置
 */
export async function updateAlertThresholdsApi(thresholds: AlertConfig['thresholds']) {
  return requestClient.put('/aiops/alerts/config/thresholds', { thresholds });
}

/**
 * 手动触发告警检查
 */
export async function triggerAlertCheckApi() {
  return requestClient.post('/aiops/alerts/check');
}

/**
 * 获取系统概览数据（包含告警统计）
 */
export async function getSystemOverviewApi() {
  return requestClient.get<SystemOverview>('/aiops/alerts/overview');
}

// RAG相关API函数

/**
 * RAG查询接口 - 基础检索增强生成查询
 */
export async function ragQueryApi(data: RAGQueryRequest) {
  return requestClient.post<RAGQueryResult>('/aiops/rag/query', data);
}

/**
 * 分类检索接口 - 按服务类别进行检索
 */
export async function ragCategorySearchApi(data: RAGCategorySearchRequest) {
  return requestClient.post<RAGQueryResult>('/aiops/rag/search/category', data);
}

/**
 * 风险级别检索接口 - 按风险级别进行检索
 */
export async function ragRiskSearchApi(data: RAGRiskSearchRequest) {
  return requestClient.post<RAGQueryResult>('/aiops/rag/search/risk', data);
}

/**
 * 获取知识库列表
 */
export async function getKnowledgeListApi(params?: {
  page?: number;
  pageSize?: number;
  category?: string;
  riskLevel?: string;
}) {
  return requestClient.get<KnowledgeListResponse>('/aiops/rag/knowledge', {
    params,
  });
}

/**
 * 添加知识条目
 */
export async function addKnowledgeApi(data: Omit<KnowledgeItem, 'id'>) {
  return requestClient.post<{ success: boolean; id: string }>(
    '/aiops/rag/knowledge',
    data,
  );
}

/**
 * 更新知识条目
 */
export async function updateKnowledgeApi(
  id: string,
  data: Partial<Omit<KnowledgeItem, 'id'>>,
) {
  return requestClient.put<{ success: boolean }>(
    `/aiops/rag/knowledge/${id}`,
    data,
  );
}

/**
 * 删除知识条目
 */
export async function deleteKnowledgeApi(id: string) {
  return requestClient.delete<{ success: boolean }>(
    `/aiops/rag/knowledge/${id}`,
  );
}

/**
 * 获取RAG系统状态
 */
export async function getRagStatusApi() {
  return requestClient.get<{
    success: boolean;
    status: string;
    chromaStatus: boolean;
    embeddingStatus: boolean;
    knowledgeCount: number;
    lastUpdate: string;
  }>('/aiops/rag/status');
}
