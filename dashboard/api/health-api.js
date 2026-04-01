/**
 * Heretek OpenClaw Health Check Dashboard API
 * 
 * REST API server for health data aggregation and WebSocket real-time updates
 * 
 * @version 1.0.0
 * @author Heretek OpenClaw Team
 * @see {@link https://github.com/heretek-ai/heretek-openclaw}
 */

const http = require('http');
const WebSocket = require('ws');
const { URL } = require('url');

// Import collectors
const AgentCollector = require('../collectors/agent-collector');
const ServiceCollector = require('../collectors/service-collector');
const ResourceCollector = require('../collectors/resource-collector');
const AlertManager = require('../collectors/alert-manager');

/**
 * Health Check Dashboard API Server
 */
class HealthApiServer {
  constructor(options = {}) {
    this.port = options.port || 8080;
    this.host = options.host || '0.0.0.0';
    this.collectors = {
      agent: new AgentCollector(),
      service: new ServiceCollector(),
      resource: new ResourceCollector(),
      alert: new AlertManager()
    };
    this.wss = null;
    this.server = null;
    this.updateInterval = options.updateInterval || 5000;
    this.updateTimer = null;
    this.lastHealthData = null;
    this.prometheusUrl = options.prometheusUrl || 'http://prometheus:9090';
  }

  /**
   * Start the health API server
   */
  async start() {
    console.log(`[HealthAPI] Starting Health Check Dashboard API on port ${this.port}`);

    // Initialize collectors
    await this.collectors.agent.initialize();
    await this.collectors.service.initialize();
    await this.collectors.resource.initialize();
    await this.collectors.alert.initialize();

    // Create HTTP server
    this.server = http.createServer(this.handleRequest.bind(this));

    // Create WebSocket server
    this.wss = new WebSocket.Server({ server: this.server, path: '/ws' });
    this.wss.on('connection', this.handleWebSocketConnection.bind(this));

    // Start periodic health data collection
    this.startPeriodicCollection();

    // Start server
    return new Promise((resolve, reject) => {
      this.server.listen(this.port, this.host, (err) => {
        if (err) reject(err);
        else {
          console.log(`[HealthAPI] Server running at http://${this.host}:${this.port}`);
          console.log(`[HealthAPI] WebSocket endpoint at ws://${this.host}:${this.port}/ws`);
          resolve();
        }
      });
    });
  }

  /**
   * Stop the health API server
   */
  async stop() {
    console.log('[HealthAPI] Stopping Health Check Dashboard API');

    // Stop periodic collection
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }

    // Close WebSocket connections
    if (this.wss) {
      this.wss.clients.forEach(client => client.close());
      await new Promise(resolve => this.wss.close(resolve));
    }

    // Close HTTP server
    if (this.server) {
      await new Promise(resolve => this.server.close(resolve));
    }

    // Cleanup collectors
    await this.collectors.agent.cleanup();
    await this.collectors.service.cleanup();
    await this.collectors.resource.cleanup();
    await this.collectors.alert.cleanup();

    console.log('[HealthAPI] Server stopped');
  }

  /**
   * Start periodic health data collection
   */
  startPeriodicCollection() {
    const collectAndBroadcast = async () => {
      try {
        const healthData = await this.collectHealthData();
        this.lastHealthData = healthData;
        this.broadcastHealthData(healthData);
        
        // Check for alerts
        await this.collectors.alert.checkAlerts(healthData);
      } catch (error) {
        console.error('[HealthAPI] Error collecting health data:', error);
      }
    };

    // Initial collection
    collectAndBroadcast();

    // Periodic collection
    this.updateTimer = setInterval(collectAndBroadcast, this.updateInterval);
  }

  /**
   * Collect health data from all collectors
   */
  async collectHealthData() {
    const [agentData, serviceData, resourceData, alertData] = await Promise.all([
      this.collectors.agent.collect(),
      this.collectors.service.collect(),
      this.collectors.resource.collect(),
      this.collectors.alert.getAlerts()
    ]);

    return {
      timestamp: new Date().toISOString(),
      agents: agentData,
      services: serviceData,
      resources: resourceData,
      alerts: alertData,
      summary: this.generateSummary(agentData, serviceData, resourceData, alertData)
    };
  }

  /**
   * Generate health summary
   */
  generateSummary(agents, services, resources, alerts) {
    const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
    const warningAlerts = alerts.filter(a => a.severity === 'warning').length;
    
    const healthyAgents = agents.filter(a => a.status === 'active' || a.status === 'idle').length;
    const totalAgents = agents.length;
    
    const healthyServices = services.filter(s => s.status === 'healthy').length;
    const totalServices = services.length;

    const overallStatus = criticalAlerts > 0 ? 'critical' 
      : warningAlerts > 0 ? 'warning' 
      : healthyAgents === totalAgents && healthyServices === totalServices ? 'healthy' 
      : 'degraded';

    return {
      overallStatus,
      healthyAgents,
      totalAgents,
      healthyServices,
      totalServices,
      criticalAlerts,
      warningAlerts,
      cpuUsage: resources.cpu?.system?.usage || 0,
      memoryUsage: resources.memory?.system?.usage || 0,
      diskUsage: resources.disk?.system?.usage || 0
    };
  }

  /**
   * Broadcast health data to all WebSocket clients
   */
  broadcastHealthData(data) {
    if (!this.wss || this.wss.clients.size === 0) return;

    const message = JSON.stringify({
      type: 'health-update',
      data
    });

    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  /**
   * Handle HTTP requests
   */
  handleRequest(req, res) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Route handling
    const routes = {
      'GET /api/health': () => this.getHealth(),
      'GET /api/health/agents': () => this.collectors.agent.collect(),
      'GET /api/health/services': () => this.collectors.service.collect(),
      'GET /api/health/resources': () => this.collectors.resource.collect(),
      'GET /api/health/alerts': () => this.collectors.alert.getAlerts(),
      'GET /api/health/summary': () => this.getHealthSummary(),
      'POST /api/alerts/:id/acknowledge': (body) => this.collectors.alert.acknowledgeAlert(body.id),
      'POST /api/alerts/:id/dismiss': (body) => this.collectors.alert.dismissAlert(body.id),
      'GET /api/metrics': () => this.getPrometheusMetrics(),
      'GET /api/config': () => this.getConfig(),
      'POST /api/config/alerts': (body) => this.collectors.alert.updateThresholds(body)
    };

    const routeKey = `${req.method} ${pathname}`;
    const handler = routes[routeKey];

    if (handler) {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const parsedBody = body ? JSON.parse(body) : {};
          // Extract ID from URL for acknowledge/dismiss routes
          if (pathname.includes('/api/alerts/') && (pathname.endsWith('/acknowledge') || pathname.endsWith('/dismiss'))) {
            const match = pathname.match(/\/api\/alerts\/([^/]+)\//);
            if (match) {
              parsedBody.id = match[1];
            }
          }
          const result = await handler(parsedBody);
          res.writeHead(200);
          res.end(JSON.stringify(result));
        } catch (error) {
          console.error(`[HealthAPI] Error handling ${routeKey}:`, error);
          res.writeHead(500);
          res.end(JSON.stringify({ error: error.message }));
        }
      });
    } else if (pathname === '/' || pathname === '/health') {
      // Health check endpoint
      res.writeHead(200);
      res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  }

  /**
   * Get current health data
   */
  async getHealth() {
    if (this.lastHealthData) {
      return this.lastHealthData;
    }
    return this.collectHealthData();
  }

  /**
   * Get health summary
   */
  async getHealthSummary() {
    const data = await this.getHealth();
    return data.summary;
  }

  /**
   * Get Prometheus metrics
   */
  async getPrometheusMetrics() {
    try {
      const response = await fetch(`${this.prometheusUrl}/api/v1/query?query=up`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[HealthAPI] Error fetching Prometheus metrics:', error);
      return { error: 'Failed to fetch Prometheus metrics' };
    }
  }

  /**
   * Get dashboard configuration
   */
  async getConfig() {
    const fs = require('fs');
    const path = require('path');
    const configPath = path.join(__dirname, '../config/dashboard-config.yaml');
    
    if (fs.existsSync(configPath)) {
      const yaml = require('js-yaml');
      return yaml.load(fs.readFileSync(configPath, 'utf8'));
    }
    return { error: 'Configuration not found' };
  }

  /**
   * Handle WebSocket connection
   */
  handleWebSocketConnection(ws) {
    console.log('[HealthAPI] New WebSocket client connected');

    // Send initial health data
    if (this.lastHealthData) {
      ws.send(JSON.stringify({
        type: 'health-update',
        data: this.lastHealthData
      }));
    }

    ws.on('close', () => {
      console.log('[HealthAPI] WebSocket client disconnected');
    });

    ws.on('error', (error) => {
      console.error('[HealthAPI] WebSocket error:', error);
    });
  }
}

// Export for use as module
module.exports = HealthApiServer;

// Run as standalone server
if (require.main === module) {
  const server = new HealthApiServer({
    port: process.env.HEALTH_API_PORT || 8080,
    host: process.env.HEALTH_API_HOST || '0.0.0.0',
    updateInterval: parseInt(process.env.HEALTH_API_INTERVAL) || 5000,
    prometheusUrl: process.env.PROMETHEUS_URL || 'http://localhost:9090'
  });

  server.start().catch(console.error);

  // Graceful shutdown
  process.on('SIGTERM', () => server.stop());
  process.on('SIGINT', () => server.stop());
}
