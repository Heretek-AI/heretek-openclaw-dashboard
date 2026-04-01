/**
 * Heretek OpenClaw Health Check Dashboard - Agent Collector
 * 
 * Collects health data for all agents in the OpenClaw system
 * 
 * @version 1.0.0
 */

const http = require('http');
const https = require('https');

class AgentCollector {
  constructor(options = {}) {
    this.gatewayUrl = options.gatewayUrl || 'http://localhost:18789';
    this.timeout = options.timeout || 5000;
    this.agents = [];
    this.initialized = false;
  }

  /**
   * Initialize the collector
   */
  async initialize() {
    try {
      // Fetch agent list from Gateway
      this.agents = await this.fetchAgentList();
      this.initialized = true;
      console.log(`[AgentCollector] Initialized with ${this.agents.length} agents`);
    } catch (error) {
      console.error('[AgentCollector] Failed to initialize:', error.message);
      // Use default agent list as fallback
      this.agents = this.getDefaultAgents();
      this.initialized = true;
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    this.agents = [];
    this.initialized = false;
  }

  /**
   * Collect agent health data
   */
  async collect() {
    const agentHealth = [];

    for (const agent of this.agents) {
      try {
        const health = await this.getAgentHealth(agent);
        agentHealth.push(health);
      } catch (error) {
        agentHealth.push({
          id: agent.id,
          name: agent.name,
          role: agent.role,
          status: 'error',
          error: error.message,
          lastHeartbeat: null,
          currentTask: null,
          model: null,
          tokenUsage: { session: 0, daily: 0 }
        });
      }
    }

    return agentHealth;
  }

  /**
   * Get health data for a specific agent
   */
  async getAgentHealth(agent) {
    const timeout = this.timeout;

    const fetchWithTimeout = (url, options) => {
      return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        const req = protocol.get(url, options, (res) => {
          let data = '';
          res.on('data', chunk => { data += chunk; });
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              resolve({ raw: data });
            }
          });
        });
        req.on('error', reject);
        req.setTimeout(timeout, () => {
          req.destroy();
          reject(new Error('Request timeout'));
        });
      });
    };

    // Try to get agent health from Gateway
    try {
      const healthData = await fetchWithTimeout(
        `${this.gatewayUrl}/api/agents/${agent.id}/health`,
        { timeout }
      );

      return {
        id: agent.id,
        name: agent.name || healthData.name || agent.id,
        role: agent.role || healthData.role || 'unknown',
        emoji: agent.emoji || healthData.emoji || '🤖',
        status: this.mapStatus(healthData.status),
        lastHeartbeat: healthData.lastHeartbeat || healthData.last_heartbeat || null,
        heartbeatAge: this.calculateHeartbeatAge(healthData.lastHeartbeat || healthData.last_heartbeat),
        currentTask: healthData.currentTask || healthData.current_task || null,
        model: healthData.model || healthData.current_model || null,
        tokenUsage: {
          session: healthData.tokenUsage?.session || healthData.session_tokens || 0,
          daily: healthData.tokenUsage?.daily || healthData.daily_tokens || 0
        },
        memoryUsage: healthData.memoryUsage || healthData.memory_usage || null,
        uptime: healthData.uptime || null,
        error: healthData.error || null
      };
    } catch (error) {
      // If Gateway health endpoint fails, try WebSocket status
      return {
        id: agent.id,
        name: agent.name || agent.id,
        role: agent.role || 'unknown',
        emoji: agent.emoji || '🤖',
        status: 'unknown',
        lastHeartbeat: null,
        heartbeatAge: null,
        currentTask: null,
        model: null,
        tokenUsage: { session: 0, daily: 0 },
        error: error.message
      };
    }
  }

  /**
   * Map status from various formats to standard format
   */
  mapStatus(status) {
    if (!status) return 'unknown';
    
    const statusLower = status.toLowerCase();
    
    if (['active', 'online', 'running', 'ok', 'healthy'].includes(statusLower)) {
      return 'active';
    }
    if (['idle', 'waiting', 'standby'].includes(statusLower)) {
      return 'idle';
    }
    if (['busy', 'processing', 'working', 'task_running'].includes(statusLower)) {
      return 'busy';
    }
    if (['error', 'failed', 'down', 'unhealthy'].includes(statusLower)) {
      return 'error';
    }
    if (['offline', 'disconnected', 'stopped'].includes(statusLower)) {
      return 'offline';
    }
    
    return statusLower;
  }

  /**
   * Calculate heartbeat age in seconds
   */
  calculateHeartbeatAge(lastHeartbeat) {
    if (!lastHeartbeat) return null;
    
    const lastTime = new Date(lastHeartbeat);
    const now = new Date();
    const ageMs = now - lastTime;
    
    return Math.round(ageMs / 1000);
  }

  /**
   * Fetch agent list from Gateway
   */
  async fetchAgentList() {
    return new Promise((resolve, reject) => {
      http.get(`${this.gatewayUrl}/api/agents`, { timeout: this.timeout }, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try {
            const agents = JSON.parse(data);
            if (Array.isArray(agents)) {
              resolve(agents);
            } else if (agents.agents && Array.isArray(agents.agents)) {
              resolve(agents.agents);
            } else {
              resolve(this.getDefaultAgents());
            }
          } catch (e) {
            resolve(this.getDefaultAgents());
          }
        });
      }).on('error', reject);
    });
  }

  /**
   * Get default agent list (fallback)
   */
  getDefaultAgents() {
    return [
      { id: 'steward', name: 'Steward', role: 'Coordinator', emoji: '👨‍💼' },
      { id: 'alpha', name: 'Alpha', role: 'Triad Node A', emoji: '🔺' },
      { id: 'beta', name: 'Beta', role: 'Triad Node B', emoji: '🔷' },
      { id: 'charlie', name: 'Charlie', role: 'Triad Node C', emoji: '🔶' },
      { id: 'examiner', name: 'Examiner', role: 'Quality Assurance', emoji: '🔍' },
      { id: 'explorer', name: 'Explorer', role: 'Research', emoji: '🗺️' },
      { id: 'sentinel', name: 'Sentinel', role: 'Security', emoji: '🛡️' },
      { id: 'coder', name: 'Coder', role: 'Software Development', emoji: '👨‍💻' },
      { id: 'dreamer', name: 'Dreamer', role: 'Creative', emoji: '💭' },
      { id: 'empath', name: 'Empath', role: 'Emotional Intelligence', emoji: '💝' },
      { id: 'historian', name: 'Historian', role: 'Memory & Context', emoji: '📚' }
    ];
  }
}

module.exports = AgentCollector;
