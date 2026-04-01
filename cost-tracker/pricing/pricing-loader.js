/**
 * Pricing Database Loader
 * 
 * Loads and manages pricing data for all LLM providers.
 * Provides unified access to model pricing information.
 * 
 * @module cost-tracker/pricing/pricing-loader
 */

const fs = require('fs');
const path = require('path');

/**
 * Pricing Loader Class
 * 
 * Manages loading, caching, and querying of pricing data.
 */
class PricingLoader {
  /**
   * Create a PricingLoader instance
   * 
   * @param {Object} options - Configuration options
   * @param {string} options.pricingDir - Directory containing pricing JSON files
   */
  constructor(options = {}) {
    this.pricingDir = options.pricingDir || path.join(__dirname, 'pricing');
    
    /** @type {Map<string, Object>} */
    this.pricingData = new Map();
    
    /** @type {Object|null} */
    this.lastLoaded = null;
    
    /** @type {Array<string>} */
    this.loadErrors = [];
  }

  /**
   * Load all pricing data from JSON files
   * 
   * @returns {Promise<Map<string, Object>>} Map of provider ID to pricing data
   */
  async loadAll() {
    this.pricingData.clear();
    this.loadErrors = [];

    if (!fs.existsSync(this.pricingDir)) {
      this.loadErrors.push(`Pricing directory not found: ${this.pricingDir}`);
      return this.pricingData;
    }

    const files = fs.readdirSync(this.pricingDir)
      .filter(f => f.endsWith('-pricing.json'));

    for (const file of files) {
      try {
        const filePath = path.join(this.pricingDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        
        if (data.provider) {
          this.pricingData.set(data.provider, data);
        }
      } catch (error) {
        this.loadErrors.push(`Failed to load ${file}: ${error.message}`);
      }
    }

    this.lastLoaded = new Date();
    return this.pricingData;
  }

  /**
   * Load pricing data for a specific provider
   * 
   * @param {string} provider - Provider identifier
   * @returns {Promise<Object|null>} Pricing data or null
   */
  async loadProvider(provider) {
    const filePath = path.join(this.pricingDir, `${provider}-pricing.json`);
    
    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);
      this.pricingData.set(provider, data);
      return data;
    } catch (error) {
      this.loadErrors.push(`Failed to load ${provider}: ${error.message}`);
      return null;
    }
  }

  /**
   * Get pricing data for a provider
   * 
   * @param {string} provider - Provider identifier
   * @returns {Object|null} Pricing data or null
   */
  getProvider(provider) {
    return this.pricingData.get(provider);
  }

  /**
   * Get all loaded pricing data
   * 
   * @returns {Object} Object mapping provider IDs to pricing data
   */
  getAllProviders() {
    const result = {};
    for (const [provider, data] of this.pricingData) {
      result[provider] = data;
    }
    return result;
  }

  /**
   * Get model pricing information
   * 
   * @param {string} model - Model identifier (e.g., "openai/gpt-4o" or "gpt-4o")
   * @returns {Object|null} Model pricing info or null
   */
  getModelPricing(model) {
    if (!model) return null;

    // Parse model identifier
    let provider = null;
    let modelName = model;

    if (model.includes('/')) {
      const parts = model.split('/');
      provider = parts[0];
      modelName = parts.slice(1).join('/');
    }

    // Normalize provider names
    const providerMap = {
      'openai': 'openai',
      'anthropic': 'anthropic',
      'google': 'google',
      'xai': 'xai',
      'azure': 'azure',
      'ollama': 'ollama',
      'minimax': 'minimax',
      'zai': 'zai'
    };

    // If provider specified, use it
    if (provider && providerMap[provider.toLowerCase()]) {
      const normalizedProvider = providerMap[provider.toLowerCase()];
      const pricingData = this.pricingData.get(normalizedProvider);
      if (pricingData && pricingData.models) {
        // Try exact match first
        if (pricingData.models[modelName]) {
          return {
            provider: normalizedProvider,
            model: modelName,
            ...pricingData.models[modelName]
          };
        }
        // Try case-insensitive match
        const modelKey = Object.keys(pricingData.models).find(
          k => k.toLowerCase() === modelName.toLowerCase()
        );
        if (modelKey) {
          return {
            provider: normalizedProvider,
            model: modelKey,
            ...pricingData.models[modelKey]
          };
        }
      }
    }

    // Search all providers if no provider specified or not found
    for (const [prov, data] of this.pricingData) {
      if (data.models) {
        if (data.models[modelName]) {
          return {
            provider: prov,
            model: modelName,
            ...data.models[modelName]
          };
        }
        // Try case-insensitive match
        const modelKey = Object.keys(data.models).find(
          k => k.toLowerCase() === modelName.toLowerCase()
        );
        if (modelKey) {
          return {
            provider: prov,
            model: modelKey,
            ...data.models[modelKey]
          };
        }
      }
    }

    return null;
  }

  /**
   * Calculate cost for a token usage
   * 
   * @param {string} model - Model identifier
   * @param {number} inputTokens - Number of input tokens
   * @param {number} outputTokens - Number of output tokens
   * @param {number} cacheReadTokens - Number of cache read tokens (optional)
   * @param {number} cacheWriteTokens - Number of cache write tokens (optional)
   * @returns {Object|null} Cost breakdown or null
   */
  calculateCost(model, inputTokens, outputTokens, cacheReadTokens = 0, cacheWriteTokens = 0) {
    const pricing = this.getModelPricing(model);
    
    if (!pricing) {
      return null;
    }

    const inputCost = (inputTokens || 0) * (pricing.input_cost_per_token || 0);
    const outputCost = (outputTokens || 0) * (pricing.output_cost_per_token || 0);
    const cacheReadCost = (cacheReadTokens || 0) * (pricing.cache_read_cost_per_token || 0);
    const cacheWriteCost = (cacheWriteTokens || 0) * (pricing.cache_write_cost_per_token || 0);

    return {
      model: pricing.model,
      provider: pricing.provider,
      inputTokens,
      outputTokens,
      cacheReadTokens,
      cacheWriteTokens,
      inputCost,
      outputCost,
      cacheReadCost,
      cacheWriteCost,
      totalCost: inputCost + outputCost + cacheReadCost + cacheWriteCost,
      pricing: {
        inputPerToken: pricing.input_cost_per_token || 0,
        outputPerToken: pricing.output_cost_per_token || 0,
        cacheReadPerToken: pricing.cache_read_cost_per_token || 0,
        cacheWritePerToken: pricing.cache_write_cost_per_token || 0
      }
    };
  }

  /**
   * Get list of available providers
   * 
   * @returns {Array<string>} Array of provider IDs
   */
  getAvailableProviders() {
    return Array.from(this.pricingData.keys());
  }

  /**
   * Get list of models for a provider
   * 
   * @param {string} provider - Provider identifier
   * @returns {Array<string>} Array of model names
   */
  getModelsForProvider(provider) {
    const data = this.pricingData.get(provider);
    if (!data || !data.models) {
      return [];
    }
    return Object.keys(data.models);
  }

  /**
   * Get load errors
   * 
   * @returns {Array<string>} Array of error messages
   */
  getErrors() {
    return this.loadErrors;
  }

  /**
   * Get last loaded timestamp
   * 
   * @returns {Date|null} Last loaded timestamp
   */
  getLastLoaded() {
    return this.lastLoaded;
  }

  /**
   * Refresh pricing data
   * 
   * @returns {Promise<Map<string, Object>>} Reloaded pricing data
   */
  async refresh() {
    return this.loadAll();
  }
}

/**
 * Create a new PricingLoader instance
 * 
 * @param {Object} options - Configuration options
 * @returns {PricingLoader} New instance
 */
function createPricingLoader(options = {}) {
  return new PricingLoader(options);
}

module.exports = {
  PricingLoader,
  createPricingLoader
};
