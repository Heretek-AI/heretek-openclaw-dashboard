/**
 * Token Usage Collector
 * 
 * Collects token usage data from LiteLLM API.
 * Leverages LiteLLM's built-in observability endpoints for cost, usage, and model activity.
 * 
 * @module cost-tracker/collectors/token-collector
 */

const fetch = require('node-fetch');

/**
 * LiteLLM API Endpoints
 * Based on LiteLLM Proxy Server API documentation
 */
const LITELLM_ENDPOINTS = {
  // Spend/Cost endpoints
  SPEND: '/spend/endpoints',
  SPEND_TAGS: '/spend/tags',
  SPEND_DAILY: '/spend/daily',
  
  // Usage endpoints
  USAGE: '/usage',
  MODEL_USAGE: '/model/usage',
  KEY_USAGE: '/key/usage',
  USER_USAGE: '/user/usage',
  
  // Model activity
  MODEL_INFO: '/model/info',
  MODEL_ACTIVITY: '/model/activity',
  
  // Key activity
  KEY_INFO: '/key/info',
  KEY_ACTIVITY: '/key/activity',
  
  // Endpoint activity
  ENDPOINT_ACTIVITY: '/endpoint/activity',
  
  // MCP Server activity
  MCP_ACTIVITY: '/mcp/activity',
  
  // Logs
  REQUEST_LOGS: '/logs/request',
  AUDIT_LOGS: '/logs/audit',
  
  // Health
  HEALTH: '/health'
};

/**
 * Token Collector Class
 * 
 * Collects and aggregates token usage data from LiteLLM.
 */
class TokenCollector {
  /**
   * Create a TokenCollector instance
   * 
   * @param {Object} options - Configuration options
   * @param {string} options.litellmBaseUrl - LiteLLM API base URL
   * @param {string} options.litellmApiKey - LiteLLM API key for authentication
   */
  constructor(options = {}) {
    this.litellmBaseUrl = options.litellmBaseUrl || 'http://localhost:4000';
    this.litellmApiKey = options.litellmApiKey || process.env.LITELLM_MASTER_KEY || '';
    
    /** @type {Array<Object>} */
    this.cachedUsage = [];
    
    /** @type {Object|null} */
    this.lastCollection = null;
    
    /** @type {Array<string>} */
    this.collectionErrors = [];
    
    /** @type {Object} */
    this.cache = {
      spend: null,
      modelActivity: null,
      keyActivity: null,
      endpointActivity: null,
      mcpActivity: null
    };
  }

  /**
   * Fetch spend/cost data from LiteLLM
   * 
   * @param {Object} options - Query options
   * @param {string} options.startDate - Start date (ISO 8601)
   * @param {string} options.endDate - End date (ISO 8601)
   * @param {string} options.agentId - Filter by agent ID (optional)
   * @returns {Promise<Object>} Spend data
   */
  async fetchSpendData(options = {}) {
    const { startDate, endDate, agentId } = options;
    
    try {
      const url = new URL(`${this.litellmBaseUrl}${LITELLM_ENDPOINTS.SPEND}`);
      
      if (startDate) {
        url.searchParams.append('start_date', startDate);
      }
      if (endDate) {
        url.searchParams.append('end_date', endDate);
      }
      if (agentId) {
        url.searchParams.append('agent_id', agentId);
      }

      const response = await this._makeRequest(url.toString());
      
      if (response) {
        this.cache.spend = response;
        this.lastCollection = new Date();
        
        // Process into normalized usage records
        const usage = this._processSpendData(response, agentId);
        this.cachedUsage = [...this.cachedUsage, ...usage];
        
        return { raw: response, usage };
      }
      
      return { raw: null, usage: [] };
    } catch (error) {
      this.collectionErrors.push(`Spend fetch error: ${error.message}`);
      return { raw: null, usage: [] };
    }
  }

  /**
   * Fetch model activity data from LiteLLM
   * 
   * @returns {Promise<Object>} Model activity data
   */
  async fetchModelActivity() {
    try {
      const url = `${this.litellmBaseUrl}${LITELLM_ENDPOINTS.MODEL_ACTIVITY}`;
      const response = await this._makeRequest(url);
      
      if (response) {
        this.cache.modelActivity = response;
        this.lastCollection = new Date();
        return response;
      }
      
      return null;
    } catch (error) {
      this.collectionErrors.push(`Model activity fetch error: ${error.message}`);
      return null;
    }
  }

  /**
   * Fetch key activity data from LiteLLM
   * 
   * @returns {Promise<Object>} Key activity data
   */
  async fetchKeyActivity() {
    try {
      const url = `${this.litellmBaseUrl}${LITELLM_ENDPOINTS.KEY_ACTIVITY}`;
      const response = await this._makeRequest(url);
      
      if (response) {
        this.cache.keyActivity = response;
        this.lastCollection = new Date();
        return response;
      }
      
      return null;
    } catch (error) {
      this.collectionErrors.push(`Key activity fetch error: ${error.message}`);
      return null;
    }
  }

  /**
   * Fetch endpoint activity data from LiteLLM
   * 
   * @returns {Promise<Object>} Endpoint activity data
   */
  async fetchEndpointActivity() {
    try {
      const url = `${this.litellmBaseUrl}${LITELLM_ENDPOINTS.ENDPOINT_ACTIVITY}`;
      const response = await this._makeRequest(url);
      
      if (response) {
        this.cache.endpointActivity = response;
        this.lastCollection = new Date();
        return response;
      }
      
      return null;
    } catch (error) {
      this.collectionErrors.push(`Endpoint activity fetch error: ${error.message}`);
      return null;
    }
  }

  /**
   * Fetch MCP server activity data from LiteLLM
   * 
   * @returns {Promise<Object>} MCP activity data
   */
  async fetchMCPActivity() {
    try {
      const url = `${this.litellmBaseUrl}${LITELLM_ENDPOINTS.MCP_ACTIVITY}`;
      const response = await this._makeRequest(url);
      
      if (response) {
        this.cache.mcpActivity = response;
        this.lastCollection = new Date();
        return response;
      }
      
      return null;
    } catch (error) {
      this.collectionErrors.push(`MCP activity fetch error: ${error.message}`);
      return null;
    }
  }

  /**
   * Fetch daily spend data for trend analysis
   * 
   * @param {Object} options - Query options
   * @param {string} options.startDate - Start date (ISO 8601)
   * @param {string} options.endDate - End date (ISO 8601)
   * @returns {Promise<Array<Object>>} Daily spend data
   */
  async fetchDailySpend(options = {}) {
    const { startDate, endDate } = options;
    
    try {
      const url = new URL(`${this.litellmBaseUrl}${LITELLM_ENDPOINTS.SPEND_DAILY}`);
      
      if (startDate) {
        url.searchParams.append('start_date', startDate);
      }
      if (endDate) {
        url.searchParams.append('end_date', endDate);
      }

      const response = await this._makeRequest(url.toString());
      return response || [];
    } catch (error) {
      this.collectionErrors.push(`Daily spend fetch error: ${error.message}`);
      return [];
    }
  }

  /**
   * Fetch request logs from LiteLLM
   * 
   * @param {Object} options - Query options
   * @param {number} options.limit - Max records to fetch
   * @param {string} options.startTime - Start time filter
   * @param {string} options.endTime - End time filter
   * @returns {Promise<Array<Object>>} Request logs
   */
  async fetchRequestLogs(options = {}) {
    const { limit = 100, startTime, endTime } = options;
    
    try {
      const url = new URL(`${this.litellmBaseUrl}${LITELLM_ENDPOINTS.REQUEST_LOGS}`);
      url.searchParams.append('limit', limit.toString());
      
      if (startTime) {
        url.searchParams.append('start_time', startTime);
      }
      if (endTime) {
        url.searchParams.append('end_time', endTime);
      }

      const response = await this._makeRequest(url.toString());
      return response || [];
    } catch (error) {
      this.collectionErrors.push(`Request logs fetch error: ${error.message}`);
      return [];
    }
  }

  /**
   * Get all collected usage data
   * 
   * @param {Object} options - Filter options
   * @param {string} options.agentId - Filter by agent (optional)
   * @param {string} options.provider - Filter by provider (optional)
   * @param {string} options.model - Filter by model (optional)
   * @returns {Array<Object>} Array of usage records
   */
  getUsage(options = {}) {
    const { agentId, provider, model } = options;
    
    let usage = [...this.cachedUsage];
    
    if (agentId) {
      usage = usage.filter(u => u.agentId === agentId);
    }
    if (provider) {
      usage = usage.filter(u => u.provider === provider);
    }
    if (model) {
      usage = usage.filter(u => u.model === model);
    }
    
    return usage;
  }

  /**
   * Get usage aggregated by agent
   * 
   * @returns {Object} Usage aggregated by agent ID
   */
  getByAgent() {
    const aggregation = {};
    
    for (const usage of this.cachedUsage) {
      const agentId = usage.agentId || 'unknown';
      
      if (!aggregation[agentId]) {
        aggregation[agentId] = {
          agentId,
          inputTokens: 0,
          outputTokens: 0,
          cacheReadTokens: 0,
          cacheWriteTokens: 0,
          totalTokens: 0,
          requestCount: 0,
          totalCost: 0
        };
      }
      
      aggregation[agentId].inputTokens += usage.inputTokens || 0;
      aggregation[agentId].outputTokens += usage.outputTokens || 0;
      aggregation[agentId].cacheReadTokens += usage.cacheReadTokens || 0;
      aggregation[agentId].cacheWriteTokens += usage.cacheWriteTokens || 0;
      aggregation[agentId].totalTokens += usage.totalTokens || 0;
      aggregation[agentId].requestCount += 1;
      aggregation[agentId].totalCost += usage.cost?.totalCost || 0;
    }
    
    return aggregation;
  }

  /**
   * Get usage aggregated by provider
   * 
   * @returns {Object} Usage aggregated by provider
   */
  getByProvider() {
    const aggregation = {};
    
    for (const usage of this.cachedUsage) {
      const provider = usage.provider || 'unknown';
      
      if (!aggregation[provider]) {
        aggregation[provider] = {
          provider,
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          requestCount: 0,
          totalCost: 0,
          models: {}
        };
      }
      
      aggregation[provider].inputTokens += usage.inputTokens || 0;
      aggregation[provider].outputTokens += usage.outputTokens || 0;
      aggregation[provider].totalTokens += usage.totalTokens || 0;
      aggregation[provider].requestCount += 1;
      aggregation[provider].totalCost += usage.cost?.totalCost || 0;
      
      // Track by model
      const model = usage.model || 'unknown';
      if (!aggregation[provider].models[model]) {
        aggregation[provider].models[model] = {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          requestCount: 0,
          totalCost: 0
        };
      }
      aggregation[provider].models[model].inputTokens += usage.inputTokens || 0;
      aggregation[provider].models[model].outputTokens += usage.outputTokens || 0;
      aggregation[provider].models[model].totalTokens += usage.totalTokens || 0;
      aggregation[provider].models[model].requestCount += 1;
      aggregation[provider].models[model].totalCost += usage.cost?.totalCost || 0;
    }
    
    return aggregation;
  }

  /**
   * Get cached spend data
   * 
   * @returns {Object|null} Spend data
   */
  getSpendData() {
    return this.cache.spend;
  }

  /**
   * Get cached model activity
   * 
   * @returns {Object|null} Model activity data
   */
  getModelActivity() {
    return this.cache.modelActivity;
  }

  /**
   * Get cached key activity
   * 
   * @returns {Object|null} Key activity data
   */
  getKeyActivity() {
    return this.cache.keyActivity;
  }

  /**
   * Get cached endpoint activity
   * 
   * @returns {Object|null} Endpoint activity data
   */
  getEndpointActivity() {
    return this.cache.endpointActivity;
  }

  /**
   * Get cached MCP activity
   * 
   * @returns {Object|null} MCP activity data
   */
  getMCPActivity() {
    return this.cache.mcpActivity;
  }

  /**
   * Clear cached data
   */
  clearCache() {
    this.cachedUsage = [];
    this.cache = {
      spend: null,
      modelActivity: null,
      keyActivity: null,
      endpointActivity: null,
      mcpActivity: null
    };
  }

  /**
   * Get collection errors
   * 
   * @returns {Array<string>} Array of error messages
   */
  getErrors() {
    return this.collectionErrors;
  }

  /**
   * Get last collection timestamp
   * 
   * @returns {Date|null} Last collection timestamp
   */
  getLastCollection() {
    return this.lastCollection;
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Make authenticated request to LiteLLM API
   * 
   * @private
   * @param {string} url - Request URL
   * @returns {Promise<Object|null>} Response data
   */
  async _makeRequest(url) {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (this.litellmApiKey) {
      headers['Authorization'] = `Bearer ${this.litellmApiKey}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication failed - check LITELLM_MASTER_KEY');
      }
      throw new Error(`LiteLLM API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  }

  /**
   * Process spend data into normalized usage records
   * 
   * @private
   * @param {Object} data - Raw spend data
   * @param {string} agentId - Agent ID filter
   * @returns {Array<Object>} Processed usage records
   */
  _processSpendData(data, agentId) {
    const usage = [];
    
    // Handle different response formats from LiteLLM
    const records = Array.isArray(data) ? data : (data.records || data.data || data.spends || []);
    
    for (const record of records) {
      // Skip if agent filter specified and doesn't match
      if (agentId && record.agent_id !== agentId && record.metadata?.agentId !== agentId) {
        continue;
      }
      
      const inputTokens = record.input_tokens || record.prompt_tokens || 0;
      const outputTokens = record.completion_tokens || record.output_tokens || 0;
      const totalTokens = inputTokens + outputTokens;
      
      // Extract agent ID from various possible fields
      let extractedAgentId = record.agent_id || 
                            record.metadata?.agentId || 
                            record.metadata?.agent_id ||
                            this._extractAgentFromModel(record.model);
      
      usage.push({
        source: 'litellm',
        timestamp: record.timestamp || record.startTime || new Date().toISOString(),
        agentId: extractedAgentId,
        provider: record.provider || this._extractProvider(record.model),
        model: record.model || 'unknown',
        inputTokens,
        outputTokens,
        cacheReadTokens: record.cache_read_tokens || 0,
        cacheWriteTokens: record.cache_write_tokens || 0,
        totalTokens,
        cost: {
          totalCost: record.cost || record.total_cost || 0,
          inputCost: record.input_cost || 0,
          outputCost: record.output_cost || 0,
          cacheReadCost: record.cache_read_cost || 0,
          cacheWriteCost: record.cache_write_cost || 0
        },
        key: record.api_key || record.key_alias || null,
        user: record.user || record.user_id || null,
        raw: record
      });
    }
    
    return usage;
  }

  /**
   * Extract agent ID from model identifier
   * 
   * @private
   * @param {string} model - Model identifier
   * @returns {string} Agent ID or 'unknown'
   */
  _extractAgentFromModel(model) {
    if (!model) return 'unknown';
    
    // Check for agent/ prefix (e.g., agent/steward)
    if (model.startsWith('agent/')) {
      return model.replace('agent/', '');
    }
    
    return 'unknown';
  }

  /**
   * Extract provider name from model identifier
   * 
   * @private
   * @param {string} model - Model identifier
   * @returns {string} Provider name
   */
  _extractProvider(model) {
    if (!model) return 'unknown';
    
    const providerPrefixes = [
      'openai', 'anthropic', 'google', 'xai', 'azure', 'ollama',
      'minimax', 'zai', 'groq', 'cohere', 'mistral'
    ];
    
    for (const prefix of providerPrefixes) {
      if (model.toLowerCase().startsWith(prefix)) {
        return prefix;
      }
    }
    
    // Check for agent/ prefix
    if (model.startsWith('agent/')) {
      return 'agent';
    }
    
    return 'unknown';
  }
}

/**
 * Create a new TokenCollector instance
 * 
 * @param {Object} options - Configuration options
 * @returns {TokenCollector} New instance
 */
function createTokenCollector(options = {}) {
  return new TokenCollector(options);
}

module.exports = {
  TokenCollector,
  createTokenCollector,
  LITELLM_ENDPOINTS
};
