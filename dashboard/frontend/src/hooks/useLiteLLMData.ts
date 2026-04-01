/**
 * Heretek OpenClaw Health Dashboard - LiteLLM Data Hook
 * 
 * React hook for accessing LiteLLM metrics data with automatic polling.
 * Provides spend, token usage, budget status, and model/agent analytics.
 * 
 * @version 1.0.0
 */

import { useState, useEffect, useCallback } from 'react';

export interface LiteLLMSpendData {
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
}

export interface TokenUsage {
  total: number;
  input: number;
  output: number;
}

export interface RequestCounts {
  total: number;
  successful: number;
  failed: number;
}

export interface LatencyMetrics {
  p50: number;
  p95: number;
  p99: number;
}

export interface BudgetAlert {
  type: 'budget_exceeded' | 'budget_warning';
  severity: 'critical' | 'warning';
  budget: string;
  message: string;
}

export interface BudgetInfo {
  key?: string;
  user?: string;
  spent: number;
  maxBudget: number;
  utilization: number;
  remaining: number;
  status: 'healthy' | 'warning' | 'exceeded';
}

export interface BudgetStatus {
  budgets: BudgetInfo[];
  alerts: BudgetAlert[];
  totalBudget: number;
  totalSpent: number;
  utilizationPercent: number;
}

export interface LiteLLMMetricsData {
  health: {
    status: 'healthy' | 'degraded' | 'error';
    timestamp: string;
  };
  spend: LiteLLMSpendData;
  tokens: TokenUsage;
  requests: RequestCounts;
  latency: LatencyMetrics;
  costByModel: Record<string, number>;
  costByAgent: Record<string, number>;
  budgets: BudgetStatus;
}

export interface LiteLLMCacheData {
  data: LiteLLMMetricsData | null;
  lastUpdated: string | null;
  error: string | null;
}

export interface UseLiteLLMDataReturn {
  data: LiteLLMMetricsData | null;
  cache: LiteLLMCacheData;
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
  refresh: () => Promise<void>;
}

const DEFAULT_POLL_INTERVAL = 30000; // 30 seconds

/**
 * Hook for accessing LiteLLM metrics data
 * @param pollInterval - Polling interval in milliseconds
 * @returns LiteLLM data and state
 */
export function useLiteLLMData(pollInterval: number = DEFAULT_POLL_INTERVAL): UseLiteLLMDataReturn {
  const [cache, setCache] = useState<LiteLLMCacheData>({
    data: null,
    lastUpdated: null,
    error: null
  });
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Fetch data from the backend API
   */
  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/litellm/metrics');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      setCache({
        data: result.data || result,
        lastUpdated: result.lastUpdated || new Date().toISOString(),
        error: result.error || null
      });
      
      setIsLoading(false);
    } catch (error) {
      setCache(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to fetch LiteLLM data',
        data: null
      }));
      setIsLoading(false);
    }
  }, []);

  // Initial fetch and polling
  useEffect(() => {
    fetchData();
    
    const intervalId = setInterval(fetchData, pollInterval);
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [fetchData, pollInterval]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await fetchData();
  }, [fetchData]);

  return {
    data: cache.data,
    cache,
    isLoading,
    error: cache.error,
    lastUpdated: cache.lastUpdated,
    refresh
  };
}

/**
 * Format currency value
 * @param value - Number to format
 * @returns Formatted currency string
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  }).format(value);
}

/**
 * Format token count
 * @param value - Number of tokens
 * @returns Formatted token string
 */
export function formatTokens(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
}

/**
 * Format latency in milliseconds
 * @param seconds - Latency in seconds
 * @returns Formatted latency string
 */
export function formatLatency(seconds: number): string {
  if (seconds >= 1) {
    return `${seconds.toFixed(2)}s`;
  }
  return `${(seconds * 1000).toFixed(0)}ms`;
}

/**
 * Get budget status color
 * @param status - Budget status
 * @returns Tailwind CSS color class
 */
export function getBudgetStatusColor(status: string): string {
  switch (status) {
    case 'exceeded':
      return 'text-red-500 bg-red-100 dark:bg-red-900/20';
    case 'warning':
      return 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/20';
    case 'healthy':
    default:
      return 'text-green-500 bg-green-100 dark:bg-green-900/20';
  }
}
