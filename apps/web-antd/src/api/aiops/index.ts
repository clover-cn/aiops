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
 * 获取命令执行结果
 */
export async function getExecuteCommandApi(command: string) {
  // return requestClient.get('/aiops/runner', { params: { data: req } });
  return requestClient.post('/aiops/runner', { command }, { timeout: 30000 });
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
