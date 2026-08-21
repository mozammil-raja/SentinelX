/**
 * SentinelX Frontend API Client Configuration
 * 
 * Provides unified HTTP fetch wrappers and endpoint definitions for backend REST services.
 */

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface TransactionRequest {
  transactionId?: string;
  userId: string;
  email: string;
  amount: number;
  currency: string;
  merchantId: string;
  cardBin?: string;
  ipAddress: string;
  deviceFingerprint?: string;
  os?: string;
  browser?: string;
}

export interface DecisionResponse {
  decisionId: string;
  transactionId: string;
  userId: string;
  finalScore: number;
  decision: 'ALLOW' | 'REVIEW' | 'BLOCK';
  firedRules: string[];
  evaluationTimeMs: number;
  timestamp: string;
}

export interface Rule {
  id: string;
  name: string;
  description: string;
  conditionJson: string;
  weight: number;
  version: number;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
}

export interface VelocityMetrics {
  userId?: string;
  ipAddress?: string;
  deviceFingerprint?: string;
  windowSeconds: number;
  userVelocityCount?: number;
  userVolumeAmount?: number;
  ipVelocityCount?: number;
  deviceVelocityCount?: number;
  isRedisAvailable?: boolean;
  timestamp: string;
}

export interface ReviewQueueItem {
  id: number;
  transactionId: string;
  decisionId: string;
  userId: string;
  amount: number;
  currency: string;
  merchantId: string;
  initialScore: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewerId?: string;
  reviewerNotes?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface TransactionResponse {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  merchantId: string;
  cardBin?: string;
  ipAddress: string;
  deviceFingerprint?: string;
  status: string;
  timestamp: string;
  createdAt: string;
}

/**
 * Generic API request helper
 */
async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  let authHeader: Record<string, string> = {};
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('sentinelx_session');
      if (stored) {
        const session = JSON.parse(stored);
        if (session?.token) {
          authHeader = { Authorization: `Bearer ${session.token}` };
        }
      }
    } catch {
      // Ignore localStorage read errors
    }
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API Error [${response.status}] ${response.statusText}: ${errorBody}`);
  }

  return response.json();
}

export interface SimulationSummary {
  totalProcessed: number;
  allowCount: number;
  reviewCount: number;
  blockCount: number;
  allowPercentage: number;
  reviewPercentage: number;
  blockPercentage: number;
  averageScore: number;
  averageLatencyMs: number;
}

export interface DiscrepancyItem {
  transactionId: string;
  userId: string;
  amount: number;
  merchantId: string;
  ipAddress: string;
  baselineVerdict: 'ALLOW' | 'REVIEW' | 'BLOCK';
  baselineScore: number;
  baselineFiredRules: string[];
  candidateVerdict: 'ALLOW' | 'REVIEW' | 'BLOCK';
  candidateScore: number;
  candidateFiredRules: string[];
  scoreDelta: number;
}

export interface BacktestReportResponse {
  runId: string;
  datasetSource: string;
  totalTransactions: number;
  simulationDurationMs: number;
  baseline: SimulationSummary;
  candidate: SimulationSummary;
  distributionShift: {
    ALLOW: number;
    REVIEW: number;
    BLOCK: number;
  };
  blockRateShiftPercentage: number;
  discrepancyCount: number;
  discrepancies: DiscrepancyItem[];
}

export interface BacktestRequest {
  datasetSource?: 'SAMPLE_BENCHMARK' | 'DATABASE_RANGE' | 'CUSTOM_PAYLOAD';
  limit?: number;
  customTransactions?: TransactionRequest[];
  candidateRules?: Partial<Rule>[];
}

export const api = {
  // Transaction Ingestion & Inquiries
  transactions: {
    evaluate: (payload: TransactionRequest) =>
      fetchJson<DecisionResponse>('/api/v1/transactions', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    getRecent: (page = 0, size = 50) =>
      fetchJson<TransactionResponse[]>(`/api/v1/transactions?page=${page}&size=${size}`),
    getById: (id: string) =>
      fetchJson<TransactionResponse>(`/api/v1/transactions/${id}`),
  },

  // Dynamic Rule Management
  rules: {
    getAll: () => fetchJson<Rule[]>('/api/v1/rules'),
    getById: (id: string) => fetchJson<Rule>(`/api/v1/rules/${id}`),
    toggle: (id: string) =>
      fetchJson<Rule>(`/api/v1/rules/${id}/toggle`, { method: 'PUT' }),
    update: (id: string, payload: Partial<Rule>) =>
      fetchJson<Rule>(`/api/v1/rules/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
  },

  // Velocity Telemetry
  velocity: {
    getUserVelocity: (userId: string, windowSeconds = 300) =>
      fetchJson<VelocityMetrics>(`/api/v1/velocity/user/${userId}?window=${windowSeconds}`),
    getIpVelocity: (ip: string, windowSeconds = 300) =>
      fetchJson<VelocityMetrics>(`/api/v1/velocity/ip/${ip}?window=${windowSeconds}`),
    getDeviceVelocity: (fingerprint: string, windowSeconds = 300) =>
      fetchJson<VelocityMetrics>(`/api/v1/velocity/device/${fingerprint}?window=${windowSeconds}`),
    getHealth: () =>
      fetchJson<{ status: string; engine: string; isRedisAvailable: boolean; timestamp: string }>('/api/v1/velocity/health'),
  },

  // Review Queue
  reviews: {
    getPending: () =>
      fetchJson<ReviewQueueItem[]>('/api/v1/reviews?status=PENDING'),
    getAll: (status?: string) =>
      fetchJson<ReviewQueueItem[]>(`/api/v1/reviews${status ? `?status=${status}` : ''}`),
    getById: (id: number | string) =>
      fetchJson<ReviewQueueItem>(`/api/v1/reviews/${id}`),
    resolve: (id: number | string, status: 'APPROVED' | 'REJECTED', reviewerId: string, reviewerNotes?: string) =>
      fetchJson<ReviewQueueItem>(`/api/v1/reviews/${id}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ status, reviewerId, reviewerNotes }),
      }),
  },

  // Historical Replay & Backtesting Simulation
  backtest: {
    run: (payload?: BacktestRequest) =>
      fetchJson<BacktestReportResponse>('/api/v1/backtest/run', {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      }),
    getBenchmark: () =>
      fetchJson<{ totalCount: number; categories: string[]; sampleTransactions: TransactionRequest[] }>('/api/v1/backtest/benchmark'),
  },
};
