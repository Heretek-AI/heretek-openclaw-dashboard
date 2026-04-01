/**
 * Heretek OpenClaw Health Dashboard - LiteLLM API Routes
 * 
 * Express routes for exposing LiteLLM metrics to the frontend dashboard.
 * Proxies requests to LiteLLM Proxy API with proper authentication.
 * 
 * @version 1.0.0
 */

const express = require('express');
const LiteLLMIntegration = require('../integrations/litellm-integration');
const LiteLLMMetricsCollector = require('../collectors/litellm-metrics-collector');

const router = express.Router();

// Singleton instances
let litellm = null;
let collector = null;

/**
 * Initialize LiteLLM API module
 * @param {Object} options - Configuration options
 */
function initialize(options = {}) {
  const masterKey = options.masterKey || process.env.LITELLM_MASTER_KEY;
  const litellmUrl = options.litellmUrl || process.env.LITELLM_URL || 'http://litellm:4000';
  
  litellm = new LiteLLMIntegration({
    baseUrl: litellmUrl,
    masterKey,
    timeout: 10000
  });
  
  collector = new LiteLLMMetricsCollector({
    litellmUrl,
    masterKey,
    collectionInterval: options.collectionInterval || 30000
  });
  
  return { litellm, collector };
}

/**
 * Start the collector
 */
async function startCollector() {
  if (collector) {
    await collector.initialize();
  }
}

/**
 * Stop the collector
 */
async function stopCollector() {
  if (collector) {
    await collector.cleanup();
  }
}

/**
 * GET /api/litellm/health
 * Health check for LiteLLM connection
 */
router.get('/health', async (req, res) => {
  try {
    if (!litellm) {
      return res.status(503).json({ status: 'not_initialized' });
    }
    
    const health = await litellm.healthCheck();
    res.json({
      status: 'healthy',
      litellm: health
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      error: error.message
    });
  }
});

/**
 * GET /api/litellm/metrics
 * Get comprehensive LiteLLM metrics data
 */
router.get('/metrics', async (req, res) => {
  try {
    if (!collector) {
      return res.status(503).json({ error: 'Collector not initialized' });
    }
    
    const cache = collector.getData();
    
    res.json({
      data: cache.data,
      lastUpdated: cache.lastUpdated,
      error: cache.error
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/litellm/spend
 * Get spend data
 */
router.get('/spend', async (req, res) => {
  try {
    if (!litellm) {
      return res.status(503).json({ error: 'Not initialized' });
    }
    
    const spend = await litellm.getSpend();
    res.json(spend);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/litellm/spend/models
 * Get spend data grouped by model
 */
router.get('/spend/models', async (req, res) => {
  try {
    if (!litellm) {
      return res.status(503).json({ error: 'Not initialized' });
    }
    
    const spend = await litellm.getSpendByModels();
    res.json(spend);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/litellm/spend/endpoints
 * Get spend data grouped by endpoints (agents)
 */
router.get('/spend/endpoints', async (req, res) => {
  try {
    if (!litellm) {
      return res.status(503).json({ error: 'Not initialized' });
    }
    
    const spend = await litellm.getSpendByEndpoints();
    res.json(spend);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/litellm/budgets
 * Get budget status
 */
router.get('/budgets', async (req, res) => {
  try {
    if (!collector) {
      return res.status(503).json({ error: 'Collector not initialized' });
    }
    
    const budgetStatus = collector.getBudgetStatus();
    res.json(budgetStatus);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/litellm/models/usage
 * Get model usage statistics
 */
router.get('/models/usage', async (req, res) => {
  try {
    if (!litellm) {
      return res.status(503).json({ error: 'Not initialized' });
    }
    
    const usage = await litellm.getModelUsage();
    res.json(usage);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/litellm/agents/usage
 * Get agent usage statistics
 */
router.get('/agents/usage', async (req, res) => {
  try {
    if (!litellm) {
      return res.status(503).json({ error: 'Not initialized' });
    }
    
    const usage = await litellm.getAgentUsage();
    res.json(usage);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/litellm/prometheus
 * Get raw Prometheus metrics
 */
router.get('/prometheus', async (req, res) => {
  try {
    if (!litellm) {
      return res.status(503).json({ error: 'Not initialized' });
    }
    
    const metrics = await litellm.getPrometheusMetrics();
    res.set('Content-Type', 'text/plain');
    res.send(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = {
  router,
  initialize,
  startCollector,
  stopCollector
};
