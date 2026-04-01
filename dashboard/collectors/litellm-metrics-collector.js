/**
 * Heretek OpenClaw Health Dashboard - LiteLLM Metrics Collector
 * 
 * Collects and aggregates metrics from LiteLLM Proxy for the health dashboard.
 * Runs as a periodic collector that caches data for frontend consumption.
 * 
 * @version 1.0.0
 */

const EventEmitter = require('events');
const LiteLLMIntegration = require('../integrations/litellm-integration');

class LiteLLMMetricsCollector extends EventEmitter {
  /**
   * Create LiteLLM Metrics Collector
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    super();
    this.litellm = new LiteLLMIntegration({
      baseUrl: options.litellmUrl || process.env.LITELLM_URL || 'http://litellm:4000',
      masterKey: options.masterKey || process.env.LITELLM_MASTER_KEY,
      timeout: options.timeout || 10000
    });
    
    this.collectionInterval = options.collectionInterval || 30000; // 30 seconds
    this.cache = {
      data: null,
      lastUpdated: null,
      error: null
    };
    this.intervalId = null;
    this.initialized = false;
  }

  /**
   * Initialize and start collecting metrics
   */
  async initialize() {
    try {
      await this.litellm.initialize();
      this.initialized = true;
      
      // Initial collection
      await this.collect();
      
      // Start periodic collection
      this.startCollection();
      
      console.log('[LiteLLMMetricsCollector] Initialized');
      this.emit('initialized');
    } catch (error) {
      console.error('[LiteLLMMetricsCollector] Initialization failed:', error.message);
      this.cache.error = error.message;
      this.emit('error', error);
    }
  }

  /**
   * Start periodic collection
   */
  startCollection() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    
    this.intervalId = setInterval(async () => {
      try {
        await this.collect();
      } catch (error) {
        console.error('[LiteLLMMetricsCollector] Collection error:', error.message);
        this.cache.error = error.message;
        this.emit('error', error);
      }
    }, this.collectionInterval);
    
    console.log(`[LiteLLMMetricsCollector] Collection interval set to ${this.collectionInterval / 1000}s`);
  }

  /**
   * Stop periodic collection
   */
  stopCollection() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[LiteLLMMetricsCollector] Collection stopped');
    }
  }

  /**
   * Collect metrics from LiteLLM
   */
  async collect() {
    const startTime = Date.now();
    
    try {
      const dashboardData = await this.litellm.getDashboardData();
      
      this.cache = {
        data: {
          ...dashboardData,
          collectionTime: Date.now() - startTime
        },
        lastUpdated: new Date().toISOString(),
        error: null
      };
      
      this.emit('data', this.cache.data);
      console.log(`[LiteLLMMetricsCollector] Collected metrics in ${Date.now() - startTime}ms`);
      
      return this.cache.data;
    } catch (error) {
      this.cache.error = error.message;
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Get cached data
   * @returns {Object|null} Cached metrics data
   */
  getData() {
    return this.cache;
  }

  /**
   * Get specific metric
   * @param {string} metric - Metric name
   * @returns {any} Metric value
   */
  getMetric(metric) {
    if (!this.cache.data) return null;
    return this.cache.data[metric];
  }

  /**
   * Get spend data
   * @returns {Object} Spend data
   */
  getSpend() {
    return this.cache.data?.spend || null;
  }

  /**
   * Get token usage data
   * @returns {Object} Token usage data
   */
  getTokenUsage() {
    return this.cache.data?.tokens || null;
  }

  /**
   * Get budget status
   * @returns {Object} Budget status
   */
  getBudgetStatus() {
    return this.cache.data?.budgets || null;
  }

  /**
   * Get cost by model
   * @returns {Object} Cost by model
   */
  getCostByModel() {
    return this.cache.data?.costByModel || {};
  }

  /**
   * Get cost by agent
   * @returns {Object} Cost by agent
   */
  getCostByAgent() {
    return this.cache.data?.costByAgent || {};
  }

  /**
   * Get latency metrics
   * @returns {Object} Latency metrics
   */
  getLatency() {
    return this.cache.data?.latency || null;
  }

  /**
   * Get request counts
   * @returns {Object} Request count data
   */
  getRequestCounts() {
    return this.cache.data?.requests || null;
  }

  /**
   * Check if collector is healthy
   * @returns {Object} Health status
   */
  getHealth() {
    const isHealthy = this.initialized && !this.cache.error && this.cache.lastUpdated !== null;
    const staleThreshold = this.collectionInterval * 2;
    const isStale = this.cache.lastUpdated && 
      (Date.now() - new Date(this.cache.lastUpdated).getTime() > staleThreshold);
    
    return {
      healthy: isHealthy && !isStale,
      initialized: this.initialized,
      hasError: !!this.cache.error,
      isStale,
      lastUpdated: this.cache.lastUpdated,
      error: this.cache.error
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    this.stopCollection();
    await this.litellm.cleanup();
    this.initialized = false;
    this.removeAllListeners();
    console.log('[LiteLLMMetricsCollector] Cleaned up');
  }
}

module.exports = LiteLLMMetricsCollector;
