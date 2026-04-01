/**
 * Heretek OpenClaw - LiteLLM Integration Module
 * 
 * Provides API client for LiteLLM Proxy observability features:
 * - Cost tracking via /spend endpoints
 * - Prometheus metrics from /metrics
 * - Token usage by model/agent
 * - Budget status and alerts
 * 
 * @version 1.0.0
 * @see https://docs.litellm.ai/docs/proxy/prometheus
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

class LiteLLMIntegration {
  /**
   * Create LiteLLM Integration client
   * @param {Object} options - Configuration options
   * @param {string} options.baseUrl - LiteLLM Proxy URL (default: http://litellm:4000)
   * @param {string} options.masterKey - LITELLM_MASTER_KEY for authentication
   * @param {number} options.timeout - Request timeout in ms (default: 10000)
   */
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || process.env.LITELLM_URL || 'http://litellm:4000';
    this.masterKey = options.masterKey || process.env.LITELLM_MASTER_KEY;
    this.timeout = options.timeout || 10000;
    this.initialized = false;
  }

  /**
   * Initialize the integration
   */
  async initialize() {
    try {
      // Test connection with health check
      await this.healthCheck();
      this.initialized = true;
      console.log('[LiteLLMIntegration] Connected to LiteLLM Proxy at', this.baseUrl);
    } catch (error) {
      console.warn('[LiteLLMIntegration] Initial connection failed:', error.message);
      this.initialized = false;
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    this.initialized = false;
  }

  /**
   * Make HTTP request to LiteLLM API
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Fetch options
   * @returns {Promise<Object>} Response data
   */
  async request(endpoint, options = {}) {
    const url = new URL(endpoint, this.baseUrl);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;

    return new Promise((resolve, reject) => {
      const reqOptions = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: options.method || 'GET',
        timeout: this.timeout,
        headers: {
          'Content-Type': 'application/json',
          ...(this.masterKey && { 'Authorization': `Bearer ${this.masterKey}` }),
          ...options.headers
        }
      };

      const req = lib.request(reqOptions, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            if (res.statusCode >= 400) {
              reject(new Error(jsonData.error?.message || `HTTP ${res.statusCode}`));
            } else {
              resolve(jsonData);
            }
          } catch (e) {
            resolve({ text: data, statusCode: res.statusCode });
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (options.body) {
        req.write(JSON.stringify(options.body));
      }
      req.end();
    });
  }

  /**
   * Health check endpoint
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    return await this.request('/health');
  }

  /**
   * Get total spend data
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Spend data
   */
  async getSpend(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/spend${queryString ? '?' + queryString : ''}`;
    return await this.request(endpoint);
  }

  /**
   * Get spend by API key
   * @returns {Promise<Object>} Spend data grouped by API key
   */
  async getSpendByKeys() {
    return await this.request('/spend/keys');
  }

  /**
   * Get spend by user
   * @returns {Promise<Object>} Spend data grouped by user
   */
  async getSpendByUsers() {
    return await this.request('/spend/users');
  }

  /**
   * Get spend by tag
   * @returns {Promise<Object>} Spend data grouped by tag
   */
  async getSpendByTags() {
    return await this.request('/spend/tags');
  }

  /**
   * Get spend by model
   * @returns {Promise<Object>} Spend data grouped by model
   */
  async getSpendByModels() {
    return await this.request('/spend/models');
  }

  /**
   * Get spend by endpoints
   * @returns {Promise<Object>} Spend data grouped by endpoint
   */
  async getSpendByEndpoints() {
    return await this.request('/spend/endpoints');
  }

  /**
   * Get budget list
   * @returns {Promise<Object>} List of all budgets
   */
  async getBudgetList() {
    return await this.request('/budget/list');
  }

  /**
   * Get budget info for specific key/user
   * @param {Object} params - Budget query params
   * @returns {Promise<Object>} Budget details
   */
  async getBudgetInfo(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/budget/info${queryString ? '?' + queryString : ''}`;
    return await this.request(endpoint);
  }

  /**
   * Get Prometheus metrics
   * @returns {Promise<string>} Raw Prometheus format metrics
   */
  async getPrometheusMetrics() {
    const response = await this.request('/metrics', {
      headers: { 'Accept': 'text/plain' }
    });
    return response.text || '';
  }

  /**
   * Parse Prometheus metrics into object
   * @param {string} metricsText - Raw Prometheus metrics
   * @returns {Object} Parsed metrics
   */
  parsePrometheusMetrics(metricsText) {
    const metrics = {};
    const lines = metricsText.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('#') || !line.trim()) continue;
      
      // Match metric name and value: metric_name{labels} value
      const match = line.match(/^(\w+)(?:\{([^}]+)\})?\s+([\d.]+)$/);
      if (match) {
        const [, name, labels, value] = match;
        const parsedLabels = labels ? this.parseLabels(labels) : {};
        
        if (!metrics[name]) {
          metrics[name] = [];
        }
        metrics[name].push({
          labels: parsedLabels,
          value: parseFloat(value)
        });
      }
    }
    
    return metrics;
  }

  /**
   * Parse Prometheus labels string
   * @param {string} labelsStr - Labels string: key1="value1",key2="value2"
   * @returns {Object} Parsed labels
   */
  parseLabels(labelsStr) {
    const labels = {};
    const regex = /(\w+)="([^"]*)"/g;
    let match;
    while ((match = regex.exec(labelsStr)) !== null) {
      labels[match[1]] = match[2];
    }
    return labels;
  }

  /**
   * Get aggregated metrics from Prometheus data
   * @param {Object} metrics - Parsed Prometheus metrics
   * @returns {Object} Aggregated metrics
   */
  aggregateMetrics(metrics) {
    const aggregated = {
      cost: {
        total: 0,
        byModel: {},
        byAgent: {}
      },
      tokens: {
        total: 0,
        input: 0,
        output: 0
      },
      requests: {
        total: 0,
        successful: 0,
        failed: 0
      },
      latency: {
        p50: 0,
        p95: 0,
        p99: 0
      }
    };

    // Process cost metrics
    if (metrics.litellm_cost_dollars_total) {
      for (const entry of metrics.litellm_cost_dollars_total) {
        aggregated.cost.total += entry.value;
        const model = entry.labels.model || 'unknown';
        aggregated.cost.byModel[model] = (aggregated.cost.byModel[model] || 0) + entry.value;
        
        // Extract agent from model if it's an agent endpoint
        if (model.startsWith('agent/')) {
          const agent = model.replace('agent/', '');
          aggregated.cost.byAgent[agent] = (aggregated.cost.byAgent[agent] || 0) + entry.value;
        }
      }
    }

    // Process token metrics
    if (metrics.litellm_tokens_total) {
      for (const entry of metrics.litellm_tokens_total) {
        aggregated.tokens.total += entry.value;
        const type = entry.labels.type || 'unknown';
        if (type === 'input') {
          aggregated.tokens.input += entry.value;
        } else if (type === 'output') {
          aggregated.tokens.output += entry.value;
        }
      }
    }

    // Process request counts
    if (metrics.litellm_request_count_total) {
      for (const entry of metrics.litellm_request_count_total) {
        aggregated.requests.total += entry.value;
        const status = entry.labels.status || 'unknown';
        if (status === 'success') {
          aggregated.requests.successful += entry.value;
        } else if (status === 'failure') {
          aggregated.requests.failed += entry.value;
        }
      }
    }

    // Process latency metrics
    if (metrics.litellm_request_latency_seconds) {
      const latencies = metrics.litellm_request_latency_seconds.map(e => e.value);
      latencies.sort((a, b) => a - b);
      if (latencies.length > 0) {
        aggregated.latency.p50 = this.percentile(latencies, 50);
        aggregated.latency.p95 = this.percentile(latencies, 95);
        aggregated.latency.p99 = this.percentile(latencies, 99);
      }
    }

    return aggregated;
  }

  /**
   * Calculate percentile from sorted array
   * @param {number[]} sorted - Sorted array of values
   * @param {number} p - Percentile (0-100)
   * @returns {number} Percentile value
   */
  percentile(sorted, p) {
    if (sorted.length === 0) return 0;
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Get real-time spend data with time filters
   * @param {Object} filters - Time filters
   * @param {string} filters.startDate - ISO date string
   * @param {string} filters.endDate - ISO date string
   * @returns {Promise<Object>} Filtered spend data
   */
  async getFilteredSpend(filters = {}) {
    const params = {};
    if (filters.startDate) params.start_date = filters.startDate;
    if (filters.endDate) params.end_date = filters.endDate;
    return await this.getSpend(params);
  }

  /**
   * Get model usage statistics
   * @returns {Promise<Object>} Model usage stats
   */
  async getModelUsage() {
    const [spendByModels, metricsText] = await Promise.all([
      this.getSpendByModels(),
      this.getPrometheusMetrics()
    ]);
    
    const metrics = this.parsePrometheusMetrics(metricsText);
    const aggregated = this.aggregateMetrics(metrics);
    
    return {
      models: spendByModels.models || [],
      costByModel: aggregated.cost.byModel,
      tokenUsage: aggregated.tokens,
      requestCount: aggregated.requests
    };
  }

  /**
   * Get agent usage statistics (via passthrough endpoints)
   * @returns {Promise<Object>} Agent usage stats
   */
  async getAgentUsage() {
    const [spendByEndpoints, metricsText] = await Promise.all([
      this.getSpendByEndpoints(),
      this.getPrometheusMetrics()
    ]);
    
    const metrics = this.parsePrometheusMetrics(metricsText);
    const aggregated = this.aggregateMetrics(metrics);
    
    return {
      endpoints: spendByEndpoints.endpoints || [],
      costByAgent: aggregated.cost.byAgent,
      tokenUsage: aggregated.tokens,
      requestCount: aggregated.requests
    };
  }

  /**
   * Get budget status for all configured budgets
   * @returns {Promise<Object>} Budget status with alerts
   */
  async getBudgetStatus() {
    const budgetList = await this.getBudgetList();
    const budgets = budgetList.budgets || [];
    
    const status = {
      budgets: [],
      alerts: [],
      totalBudget: 0,
      totalSpent: 0,
      utilizationPercent: 0
    };
    
    for (const budget of budgets) {
      const budgetInfo = await this.getBudgetInfo({ 
        key: budget.key, 
        user: budget.user 
      });
      
      const spent = budgetInfo.spent || 0;
      const max = budgetInfo.max_budget || 0;
      const utilization = max > 0 ? (spent / max) * 100 : 0;
      
      status.budgets.push({
        ...budget,
        spent,
        maxBudget: max,
        utilization,
        remaining: max - spent,
        status: utilization >= 100 ? 'exceeded' : utilization >= 80 ? 'warning' : 'healthy'
      });
      
      status.totalBudget += max;
      status.totalSpent += spent;
      
      // Generate alerts
      if (utilization >= 100) {
        status.alerts.push({
          type: 'budget_exceeded',
          severity: 'critical',
          budget: budget.key || budget.user,
          message: `Budget exceeded: ${budget.key || budget.user} has spent $${spent.toFixed(2)} of $${max.toFixed(2)}`
        });
      } else if (utilization >= 80) {
        status.alerts.push({
          type: 'budget_warning',
          severity: 'warning',
          budget: budget.key || budget.user,
          message: `Budget warning: ${budget.key || budget.user} has used ${utilization.toFixed(1)}% of budget`
        });
      }
    }
    
    status.utilizationPercent = status.totalBudget > 0 
      ? (status.totalSpent / status.totalBudget) * 100 
      : 0;
    
    return status;
  }

  /**
   * Get comprehensive dashboard data
   * @returns {Promise<Object>} All metrics for dashboard
   */
  async getDashboardData() {
    const [health, spendData, metricsText, budgetStatus] = await Promise.all([
      this.healthCheck(),
      this.getSpend(),
      this.getPrometheusMetrics(),
      this.getBudgetStatus()
    ]);
    
    const metrics = this.parsePrometheusMetrics(metricsText);
    const aggregated = this.aggregateMetrics(metrics);
    
    return {
      health: {
        status: health.status || 'healthy',
        timestamp: new Date().toISOString()
      },
      spend: {
        total: spendData.spend?.['this_month'] || spendData.spend?.total || 0,
        today: spendData.spend?.today || 0,
        thisWeek: spendData.spend?.this_week || 0,
        thisMonth: spendData.spend?.this_month || 0
      },
      tokens: aggregated.tokens,
      requests: aggregated.requests,
      latency: aggregated.latency,
      costByModel: aggregated.cost.byModel,
      costByAgent: aggregated.cost.byAgent,
      budgets: budgetStatus
    };
  }
}

module.exports = LiteLLMIntegration;
