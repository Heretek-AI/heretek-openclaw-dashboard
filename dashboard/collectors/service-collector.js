/**
 * Heretek OpenClaw Health Check Dashboard - Service Collector
 * 
 * Collects health data for all services in the OpenClaw system
 * including LiteLLM, Redis, PostgreSQL, Neo4j, Ollama, and Langfuse
 * 
 * @version 1.0.0
 */

const http = require('http');
const https = require('https');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class ServiceCollector {
  constructor(options = {}) {
    this.services = options.services || this.getDefaultServices();
    this.timeout = options.timeout || 5000;
    this.langfuseUrl = options.langfuseUrl || 'http://localhost:3000';
    this.litellmUrl = options.litellmUrl || 'http://localhost:4000';
    this.postgresUrl = options.postgresUrl || 'localhost:5432';
    this.redisUrl = options.redisUrl || 'localhost:6379';
    this.ollamaUrl = options.ollamaUrl || 'http://localhost:11434';
    this.neo4jUrl = options.neo4jUrl || null;
    this.initialized = false;
  }

  /**
   * Initialize the collector
   */
  async initialize() {
    this.initialized = true;
    console.log('[ServiceCollector] Initialized');
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    this.initialized = false;
  }

  /**
   * Collect service health data
   */
  async collect() {
    const serviceHealth = [];

    for (const service of this.services) {
      try {
        const health = await this.getServiceHealth(service);
        serviceHealth.push(health);
      } catch (error) {
        serviceHealth.push({
          id: service.id,
          name: service.name,
          status: 'error',
          error: error.message,
          responseTime: null,
          uptime: null
        });
      }
    }

    return serviceHealth;
  }

  /**
   * Get health data for a specific service
   */
  async getServiceHealth(service) {
    const startTime = Date.now();
    let healthData = {
      id: service.id,
      name: service.name,
      type: service.type,
      status: 'unknown',
      responseTime: null,
      uptime: null,
      details: {},
      error: null
    };

    try {
      switch (service.type) {
        case 'http':
          healthData = await this.checkHttpService(service, healthData, startTime);
          break;
        case 'tcp':
          healthData = await this.checkTcpService(service, healthData, startTime);
          break;
        case 'redis':
          healthData = await this.checkRedisService(service, healthData, startTime);
          break;
        case 'postgres':
          healthData = await this.checkPostgresService(service, healthData, startTime);
          break;
        case 'langfuse':
          healthData = await this.checkLangfuseService(service, healthData, startTime);
          break;
        case 'litellm':
          healthData = await this.checkLiteLLMService(service, healthData, startTime);
          break;
        case 'ollama':
          healthData = await this.checkOllamaService(service, healthData, startTime);
          break;
        default:
          healthData.status = 'unknown';
      }
    } catch (error) {
      healthData.status = 'error';
      healthData.error = error.message;
    }

    return healthData;
  }

  /**
   * Check HTTP-based service
   */
  async checkHttpService(service, healthData, startTime) {
    const response = await this.httpRequest(service.healthUrl || service.url);
    healthData.responseTime = Date.now() - startTime;
    healthData.status = response.ok ? 'healthy' : 'degraded';
    healthData.details.statusCode = response.status;
    return healthData;
  }

  /**
   * Check TCP-based service
   */
  async checkTcpService(service, healthData, startTime) {
    const [host, port] = service.url.split(':');
    try {
      await this.tcpConnect(host, port);
      healthData.responseTime = Date.now() - startTime;
      healthData.status = 'healthy';
    } catch (error) {
      healthData.status = 'error';
      healthData.error = error.message;
    }
    return healthData;
  }

  /**
   * Check Redis service
   */
  async checkRedisService(service, healthData, startTime) {
    try {
      // Try redis-cli ping
      const { stdout } = await execAsync(`redis-cli -h ${service.host || 'localhost'} -p ${service.port || 6379} ping`);
      healthData.responseTime = Date.now() - startTime;
      healthData.status = stdout.trim() === 'PONG' ? 'healthy' : 'degraded';
      
      // Get additional Redis info
      try {
        const info = await execAsync(`redis-cli -h ${service.host || 'localhost'} -p ${service.port || 6379} info memory`);
        const usedMemory = info.stdout.match(/used_memory:(\d+)/);
        if (usedMemory) {
          healthData.details.usedMemory = Math.round(parseInt(usedMemory[1]) / 1024 / 1024) + ' MB';
        }
      } catch (e) {
        // Ignore memory info errors
      }
    } catch (error) {
      healthData.status = 'error';
      healthData.error = error.message;
    }
    return healthData;
  }

  /**
   * Check PostgreSQL service
   */
  async checkPostgresService(service, healthData, startTime) {
    try {
      // Try pg_isready
      const { stdout } = await execAsync(
        `pg_isready -h ${service.host || 'localhost'} -p ${service.port || 5432} -U ${service.user || 'postgres'}`
      );
      healthData.responseTime = Date.now() - startTime;
      healthData.status = stdout.includes('accepting connections') ? 'healthy' : 'degraded';
      
      // Get additional PostgreSQL info
      try {
        const dbInfo = await execAsync(
          `psql -h ${service.host || 'localhost'} -p ${service.port || 5432} -U ${service.user || 'postgres'} -d ${service.database || 'postgres'} -c "SELECT count(*) FROM pg_stat_activity;" -t`
        );
        const connections = parseInt(dbInfo.stdout.trim());
        if (!isNaN(connections)) {
          healthData.details.activeConnections = connections;
        }
      } catch (e) {
        // Ignore connection info errors
      }
    } catch (error) {
      healthData.status = 'error';
      healthData.error = error.message;
    }
    return healthData;
  }

  /**
   * Check Langfuse service with detailed metrics
   */
  async checkLangfuseService(service, healthData, startTime) {
    try {
      // Check health endpoint
      const healthResponse = await this.httpRequest(`${this.langfuseUrl}/api/health`);
      healthData.responseTime = Date.now() - startTime;
      
      if (healthResponse.ok) {
        healthData.status = 'healthy';
        healthData.details.statusCode = healthResponse.status;
        
        // Try to get Langfuse metrics
        try {
          const metricsResponse = await this.httpRequest(`${this.langfuseUrl}/api/metrics`);
          if (metricsResponse.ok) {
            healthData.details.metrics = metricsResponse.data;
          }
        } catch (e) {
          // Metrics endpoint may not be available
        }

        // Get trace count from API
        try {
          const tracesResponse = await this.httpRequest(`${this.langfuseUrl}/api/public/traces?limit=1`);
          if (tracesResponse.ok && tracesResponse.data?.meta?.totalItems !== undefined) {
            healthData.details.totalTraces = tracesResponse.data.meta.totalItems;
          }
        } catch (e) {
          // Traces API may require auth
        }
      } else {
        healthData.status = 'degraded';
      }
    } catch (error) {
      healthData.status = 'error';
      healthData.error = error.message;
    }
    return healthData;
  }

  /**
   * Check LiteLLM service with detailed metrics
   */
  async checkLiteLLMService(service, healthData, startTime) {
    try {
      // Check health endpoint
      const healthResponse = await this.httpRequest(`${this.litellmUrl}/health`);
      healthData.responseTime = Date.now() - startTime;
      
      if (healthResponse.ok) {
        healthData.status = 'healthy';
        
        // Get LiteLLM metrics
        try {
          const metricsResponse = await this.httpRequest(`${this.litellmUrl}/metrics`);
          if (metricsResponse.ok) {
            // Parse Prometheus-format metrics
            healthData.details.metrics = this.parsePrometheusMetrics(metricsResponse.text);
          }
        } catch (e) {
          // Metrics endpoint may not be available
        }

        // Get spend/stats data
        try {
          const spendResponse = await this.httpRequest(`${this.litellmUrl}/spend/endpoints`);
          if (spendResponse.ok) {
            healthData.details.spend = spendResponse.data;
          }
        } catch (e) {
          // Spend API may require auth
        }
      } else {
        healthData.status = 'degraded';
      }
    } catch (error) {
      healthData.status = 'error';
      healthData.error = error.message;
    }
    return healthData;
  }

  /**
   * Check Ollama service
   */
  async checkOllamaService(service, healthData, startTime) {
    try {
      // Check tags endpoint for models
      const tagsResponse = await this.httpRequest(`${this.ollamaUrl}/api/tags`);
      healthData.responseTime = Date.now() - startTime;
      
      if (tagsResponse.ok) {
        healthData.status = 'healthy';
        healthData.details.models = tagsResponse.data?.models?.length || 0;
        healthData.details.modelList = tagsResponse.data?.models?.map(m => m.name) || [];
      } else {
        healthData.status = 'degraded';
      }
    } catch (error) {
      healthData.status = 'error';
      healthData.error = error.message;
    }
    return healthData;
  }

  /**
   * Make HTTP request
   */
  async httpRequest(url) {
    return new Promise((resolve, reject) => {
      const isHttps = url.startsWith('https');
      const lib = isHttps ? https : http;
      
      lib.get(url, { timeout: this.timeout }, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            resolve({ ok: res.statusCode < 400, status: res.statusCode, data: jsonData });
          } catch (e) {
            resolve({ ok: res.statusCode < 400, status: res.statusCode, text: data });
          }
        });
      }).on('error', reject);
    });
  }

  /**
   * Make TCP connection
   */
  async tcpConnect(host, port) {
    return new Promise((resolve, reject) => {
      const net = require('net');
      const socket = new net.Socket();
      
      socket.setTimeout(this.timeout);
      socket.on('connect', () => {
        socket.destroy();
        resolve();
      });
      socket.on('error', reject);
      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error('Connection timeout'));
      });
      
      socket.connect(parseInt(port), host);
    });
  }

  /**
   * Parse Prometheus-format metrics
   */
  parsePrometheusMetrics(text) {
    const metrics = {};
    const lines = text.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('#') || !line.trim()) continue;
      
      const match = line.match(/^(\w+)\s+([\d.]+)$/);
      if (match) {
        metrics[match[1]] = parseFloat(match[2]);
      }
    }
    
    return metrics;
  }

  /**
   * Get default service list
   */
  getDefaultServices() {
    return [
      { id: 'litellm', name: 'LiteLLM Gateway', type: 'litellm', url: 'http://litellm:4000' },
      { id: 'postgres', name: 'PostgreSQL', type: 'postgres', host: 'postgres', port: 5432, user: 'heretek', database: 'heretek' },
      { id: 'redis', name: 'Redis', type: 'redis', host: 'redis', port: 6379 },
      { id: 'ollama', name: 'Ollama', type: 'ollama', url: 'http://ollama:11434' },
      { id: 'langfuse', name: 'Langfuse', type: 'langfuse', url: 'http://langfuse:3000' },
      { id: 'gateway', name: 'OpenClaw Gateway', type: 'http', url: 'http://localhost:18789', healthUrl: 'http://localhost:18789/health' }
    ];
  }
}

module.exports = ServiceCollector;
