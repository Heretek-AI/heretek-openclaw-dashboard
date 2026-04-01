/**
 * Cost Calculation Engine
 * 
 * Calculates costs based on token usage and pricing data.
 * Supports multiple providers and models with accurate pricing.
 * 
 * @module cost-tracker/collectors/cost-calculator
 */

const { PricingLoader, createPricingLoader } = require('./../pricing/pricing-loader');

/**
 * Cost Calculator Class
 * 
 * Calculates and aggregates costs from token usage.
 */
class CostCalculator {
  /**
   * Create a CostCalculator instance
   * 
   * @param {Object} options - Configuration options
   * @param {string} options.pricingDir - Directory containing pricing JSON files
   */
  constructor(options = {}) {
    this.pricingLoader = createPricingLoader({
      pricingDir: options.pricingDir
    });
    
    /** @type {Array<Object>} */
    this.calculations = [];
    
    /** @type {Object} */
    this.stats = {
      totalCalculations: 0,
      totalCost: 0,
      lastCalculation: null
    };
  }

  /**
   * Initialize the calculator by loading pricing data
   * 
   * @returns {Promise<void>}
   */
  async initialize() {
    await this.pricingLoader.loadAll();
  }

  /**
   * Calculate cost for a single usage record
   * 
   * @param {Object} usage - Token usage record
   * @param {string} usage.model - Model identifier
   * @param {number} usage.inputTokens - Input token count
   * @param {number} usage.outputTokens - Output token count
   * @param {number} usage.cacheReadTokens - Cache read token count (optional)
   * @param {number} usage.cacheWriteTokens - Cache write token count (optional)
   * @returns {Object|null} Cost calculation result
   */
  calculate(usage) {
    const { model, inputTokens, outputTokens, cacheReadTokens = 0, cacheWriteTokens = 0 } = usage;
    
    const costBreakdown = this.pricingLoader.calculateCost(
      model,
      inputTokens,
      outputTokens,
      cacheReadTokens,
      cacheWriteTokens
    );
    
    if (!costBreakdown) {
      // Return estimated cost if model not found
      return this._estimateCost(usage);
    }
    
    const calculation = {
      ...costBreakdown,
      timestamp: usage.timestamp || new Date().toISOString(),
      agentId: usage.agentId || 'unknown',
      provider: usage.provider || costBreakdown.provider,
      calculationTime: new Date().toISOString()
    };
    
    this.calculations.push(calculation);
    this.stats.totalCalculations++;
    this.stats.totalCost += calculation.totalCost;
    this.stats.lastCalculation = new Date();
    
    return calculation;
  }

  /**
   * Calculate costs for multiple usage records
   * 
   * @param {Array<Object>} usageRecords - Array of usage records
   * @returns {Array<Object>} Array of cost calculations
   */
  calculateBatch(usageRecords) {
    return usageRecords.map(usage => this.calculate(usage));
  }

  /**
   * Get total cost across all calculations
   * 
   * @param {Object} filters - Filter options
   * @param {string} filters.agentId - Filter by agent (optional)
   * @param {string} filters.provider - Filter by provider (optional)
   * @param {string} filters.startDate - Start date filter (optional)
   * @param {string} filters.endDate - End date filter (optional)
   * @returns {Object} Total cost summary
   */
  getTotalCost(filters = {}) {
    const { agentId, provider, startDate, endDate } = filters;
    
    let filtered = [...this.calculations];
    
    if (agentId) {
      filtered = filtered.filter(c => c.agentId === agentId);
    }
    if (provider) {
      filtered = filtered.filter(c => c.provider === provider);
    }
    if (startDate) {
      const start = new Date(startDate);
      filtered = filtered.filter(c => new Date(c.timestamp) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      filtered = filtered.filter(c => new Date(c.timestamp) <= end);
    }
    
    const totalCost = filtered.reduce((sum, c) => sum + c.totalCost, 0);
    const totalInputTokens = filtered.reduce((sum, c) => sum + c.inputTokens, 0);
    const totalOutputTokens = filtered.reduce((sum, c) => sum + c.outputTokens, 0);
    const totalCacheReadTokens = filtered.reduce((sum, c) => sum + c.cacheReadTokens, 0);
    const totalCacheWriteTokens = filtered.reduce((sum, c) => sum + c.cacheWriteTokens, 0);
    
    return {
      totalCost,
      totalInputTokens,
      totalOutputTokens,
      totalCacheReadTokens,
      totalCacheWriteTokens,
      totalTokens: totalInputTokens + totalOutputTokens + totalCacheReadTokens + totalCacheWriteTokens,
      calculationCount: filtered.length,
      averageCostPerCalculation: filtered.length > 0 ? totalCost / filtered.length : 0,
      breakdown: {
        inputCost: filtered.reduce((sum, c) => sum + c.inputCost, 0),
        outputCost: filtered.reduce((sum, c) => sum + c.outputCost, 0),
        cacheReadCost: filtered.reduce((sum, c) => sum + c.cacheReadCost, 0),
        cacheWriteCost: filtered.reduce((sum, c) => sum + c.cacheWriteCost, 0)
      }
    };
  }

  /**
   * Get cost breakdown by agent
   * 
   * @returns {Object} Cost breakdown by agent ID
   */
  getByAgent() {
    const breakdown = {};
    
    for (const calculation of this.calculations) {
      const agentId = calculation.agentId || 'unknown';
      
      if (!breakdown[agentId]) {
        breakdown[agentId] = {
          agentId,
          totalCost: 0,
          inputCost: 0,
          outputCost: 0,
          cacheReadCost: 0,
          cacheWriteCost: 0,
          calculationCount: 0,
          models: {}
        };
      }
      
      breakdown[agentId].totalCost += calculation.totalCost;
      breakdown[agentId].inputCost += calculation.inputCost;
      breakdown[agentId].outputCost += calculation.outputCost;
      breakdown[agentId].cacheReadCost += calculation.cacheReadCost;
      breakdown[agentId].cacheWriteCost += calculation.cacheWriteCost;
      breakdown[agentId].calculationCount++;
      
      // Track by model
      const model = calculation.model || 'unknown';
      if (!breakdown[agentId].models[model]) {
        breakdown[agentId].models[model] = {
          totalCost: 0,
          calculationCount: 0
        };
      }
      breakdown[agentId].models[model].totalCost += calculation.totalCost;
      breakdown[agentId].models[model].calculationCount++;
    }
    
    return breakdown;
  }

  /**
   * Get cost breakdown by provider
   * 
   * @returns {Object} Cost breakdown by provider
   */
  getByProvider() {
    const breakdown = {};
    
    for (const calculation of this.calculations) {
      const provider = calculation.provider || 'unknown';
      
      if (!breakdown[provider]) {
        breakdown[provider] = {
          provider,
          totalCost: 0,
          inputCost: 0,
          outputCost: 0,
          cacheReadCost: 0,
          cacheWriteCost: 0,
          calculationCount: 0,
          models: {}
        };
      }
      
      breakdown[provider].totalCost += calculation.totalCost;
      breakdown[provider].inputCost += calculation.inputCost;
      breakdown[provider].outputCost += calculation.outputCost;
      breakdown[provider].cacheReadCost += calculation.cacheReadCost;
      breakdown[provider].cacheWriteCost += calculation.cacheWriteCost;
      breakdown[provider].calculationCount++;
      
      // Track by model
      const model = calculation.model || 'unknown';
      if (!breakdown[provider].models[model]) {
        breakdown[provider].models[model] = {
          totalCost: 0,
          calculationCount: 0
        };
      }
      breakdown[provider].models[model].totalCost += calculation.totalCost;
      breakdown[provider].models[model].calculationCount++;
    }
    
    return breakdown;
  }

  /**
   * Get cost breakdown by time period
   * 
   * @param {string} granularity - Time granularity: 'hour', 'day', 'week', 'month'
   * @returns {Object} Cost breakdown by time period
   */
  getByTimePeriod(granularity = 'day') {
    const breakdown = {};
    
    for (const calculation of this.calculations) {
      const timestamp = calculation.timestamp ? new Date(calculation.timestamp) : new Date();
      const periodKey = this._getPeriodKey(timestamp, granularity);
      
      if (!breakdown[periodKey]) {
        breakdown[periodKey] = {
          period: periodKey,
          totalCost: 0,
          inputCost: 0,
          outputCost: 0,
          cacheReadCost: 0,
          cacheWriteCost: 0,
          calculationCount: 0
        };
      }
      
      breakdown[periodKey].totalCost += calculation.totalCost;
      breakdown[periodKey].inputCost += calculation.inputCost;
      breakdown[periodKey].outputCost += calculation.outputCost;
      breakdown[periodKey].cacheReadCost += calculation.cacheReadCost;
      breakdown[periodKey].cacheWriteCost += calculation.cacheWriteCost;
      breakdown[periodKey].calculationCount++;
    }
    
    // Sort by period
    return Object.entries(breakdown)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
      }, {});
  }

  /**
   * Get cost efficiency metrics
   * 
   * @returns {Object} Efficiency metrics
   */
  getEfficiencyMetrics() {
    if (this.calculations.length === 0) {
      return {
        averageCostPerToken: 0,
        averageCostPerRequest: 0,
        tokensPerDollar: 0,
        cacheHitRate: 0,
        cacheSavings: 0
      };
    }
    
    const totalCost = this.calculations.reduce((sum, c) => sum + c.totalCost, 0);
    const totalTokens = this.calculations.reduce((sum, c) => 
      sum + c.inputTokens + c.outputTokens + c.cacheReadTokens + c.cacheWriteTokens, 0);
    const totalCacheTokens = this.calculations.reduce((sum, c) => 
      sum + c.cacheReadTokens + c.cacheWriteTokens, 0);
    
    // Calculate cache savings (cache reads are cheaper than regular input)
    let cacheSavings = 0;
    for (const calc of this.calculations) {
      const regularInputCost = calc.cacheReadTokens * (calc.pricing?.inputPerToken || 0);
      const actualCacheCost = calc.cacheReadCost;
      cacheSavings += (regularInputCost - actualCacheCost);
    }
    
    return {
      averageCostPerToken: totalTokens > 0 ? totalCost / totalTokens : 0,
      averageCostPerRequest: totalCost / this.calculations.length,
      tokensPerDollar: totalCost > 0 ? totalTokens / totalCost : 0,
      cacheHitRate: totalTokens > 0 ? totalCacheTokens / totalTokens : 0,
      cacheSavings,
      totalCost,
      totalTokens,
      totalRequests: this.calculations.length
    };
  }

  /**
   * Get all calculations
   * 
   * @returns {Array<Object>} Array of all calculations
   */
  getCalculations() {
    return [...this.calculations];
  }

  /**
   * Clear all calculations
   */
  clearCalculations() {
    this.calculations = [];
    this.stats = {
      totalCalculations: 0,
      totalCost: 0,
      lastCalculation: null
    };
  }

  /**
   * Get calculator statistics
   * 
   * @returns {Object} Statistics
   */
  getStats() {
    return { ...this.stats };
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Estimate cost for unknown models
   * 
   * @private
   * @param {Object} usage - Usage record
   * @returns {Object} Estimated cost
   */
  _estimateCost(usage) {
    // Use average pricing as fallback
    const avgInputCost = 0.000001; // $1 per million tokens
    const avgOutputCost = 0.000003; // $3 per million tokens
    
    const inputCost = (usage.inputTokens || 0) * avgInputCost;
    const outputCost = (usage.outputTokens || 0) * avgOutputCost;
    
    return {
      model: usage.model || 'unknown',
      provider: usage.provider || 'unknown',
      inputTokens: usage.inputTokens || 0,
      outputTokens: usage.outputTokens || 0,
      cacheReadTokens: usage.cacheReadTokens || 0,
      cacheWriteTokens: usage.cacheWriteTokens || 0,
      inputCost,
      outputCost,
      cacheReadCost: 0,
      cacheWriteCost: 0,
      totalCost: inputCost + outputCost,
      pricing: {
        inputPerToken: avgInputCost,
        outputPerToken: avgOutputCost,
        cacheReadPerToken: 0,
        cacheWritePerToken: 0
      },
      estimated: true
    };
  }

  /**
   * Get period key for timestamp
   * 
   * @private
   * @param {Date} timestamp - Timestamp
   * @param {string} granularity - Time granularity
   * @returns {string} Period key
   */
  _getPeriodKey(timestamp, granularity) {
    switch (granularity) {
      case 'hour':
        return timestamp.toISOString().slice(0, 13);
      case 'day':
        return timestamp.toISOString().slice(0, 10);
      case 'week':
        const weekStart = new Date(timestamp);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        return weekStart.toISOString().slice(0, 10);
      case 'month':
        return timestamp.toISOString().slice(0, 7);
      default:
        return timestamp.toISOString().slice(0, 10);
    }
  }
}

/**
 * Create a new CostCalculator instance
 * 
 * @param {Object} options - Configuration options
 * @returns {CostCalculator} New instance
 */
function createCostCalculator(options = {}) {
  return new CostCalculator(options);
}

module.exports = {
  CostCalculator,
  createCostCalculator
};
