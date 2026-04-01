/**
 * Heretek Control Dashboard - API Server
 * ==============================================================================
 * Express-based REST API server for the Heretek Control Dashboard.
 * Provides endpoints for agent status, triad state, consensus ledger,
 * consciousness metrics, and cost tracking.
 * 
 * Architecture:
 *   ┌─────────────────────────────────────────────────────────────────┐
 *   │                    API Server (Port 3001)                       │
 *   │                                                                  │
 *   │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
 *   │  │   Agent      │  │    Triad     │  │  Consensus   │          │
 *   │  │   Endpoints  │  │   Endpoints  │  │   Endpoints  │          │
 *   │  └──────────────┘  └──────────────┘  └──────────────┘          │
 *   │                                                                  │
 *   │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
 *   │  │  Consciousness│ │     Cost     │  │   Metrics    │          │
 *   │  │   Endpoints  │  │   Endpoints  │  │   Endpoints  │          │
 *   │  └──────────────┘  └──────────────┘  └──────────────┘          │
 *   │                                                                  │
 *   │                          │                                       │
 *   │                          ▼                                       │
 *   │            ┌─────────────────────────┐                         │
 *   │            │   Data Aggregator       │                         │
 *   │            └─────────────────────────┘                         │
 *   └─────────────────────────────────────────────────────────────────┘
 * 
 * Usage:
 *   const { ApiServer } = require('./src/server/api-server');
 *   const server = new ApiServer({ port: 3001 });
 *   await server.start();
 * 
 * @module api-server
 */

const http = require('http');
const EventEmitter = require('events');
const url = require('url');

/**
 * API Server Configuration
 * @typedef {Object} ApiServerConfig
 * @property {number} [port=3001] - Server port
 * @property {string} [host='0.0.0.0'] - Server host
 * @property {string} [gatewayUrl='http://localhost:18789'] - Gateway URL
 * @property {string} [observabilityPath] - Path to observability module
 * @property {boolean} [cors=true] - Enable CORS
 * @property {boolean} [debug=false] - Debug logging
 */

/**
 * Agent Status Data
 * @typedef {Object} AgentStatus
 * @property {string} agentId - Agent identifier
 * @property {'online'|'offline'|'degraded'} status - Agent status
 * @property {number} lastHeartbeat - Last heartbeat timestamp
 * @property {Object} [metrics] - Agent metrics
 * @property {number} [metrics.responseTime] - Response time in ms
 * @property {number} [metrics.tokenUsage] - Token count
 * @property {number} [metrics.cost] - Cost in USD
 */

/**
 * Triad State Data
 * @typedef {Object} TriadState
 * @property {string} sessionId - Session identifier
 * @property {string} proposalId - Proposal identifier
 * @property {Object} votes - Vote map {alpha: vote, beta: vote, charlie: vote}
 * @property {'approved'|'rejected'|'deferred'|'deliberating'} consensus - Consensus state
 * @property {Object} [consciousnessMetrics] - Consciousness metrics
 * @property {number} [deliberationTime] - Time spent deliberating in ms
 */

/**
 * Consensus Ledger Entry
 * @typedef {Object} ConsensusEntry
 * @property {string} id - Entry identifier
 * @property {string} sessionId - Session ID
 * @property {string} proposalId - Proposal ID
 * @property {'approved'|'rejected'|'deferred'} decision - Decision
 * @property {Object} voteCount - Vote counts
 * @property {number} timestamp - Decision timestamp
 * @property {boolean} [stewardOverride] - Steward override flag
 */

/**
 * API Server Class
 */
class ApiServer extends EventEmitter {
    /**
     * Create API server instance
     * @param {ApiServerConfig} config - Configuration
     */
    constructor(config = {}) {
        super();
        
        this.config = {
            port: config.port || process.env.DASHBOARD_PORT || 3001,
            host: config.host || process.env.DASHBOARD_HOST || '0.0.0.0',
            gatewayUrl: config.gatewayUrl || process.env.GATEWAY_URL || 'http://localhost:18789',
            observabilityPath: config.observabilityPath,
            cors: config.cors !== undefined ? config.cors : true,
            debug: config.debug !== undefined ? config.debug : false
        };

        // Internal state
        this.server = null;
        this.isRunning = false;
        
        // Data stores (in-memory, populated by data aggregator)
        this.agents = new Map();
        this.triadStates = new Map();
        this.consensusHistory = [];
        this.consciousnessMetrics = new Map();
        this.costData = {
            totalCost: 0,
            costByAgent: new Map(),
            costByModel: new Map(),
            tokenUsage: { total: 0, byAgent: new Map() }
        };

        // Route handlers
        this.routes = {
            'GET /api/agents': this.getAgents.bind(this),
            'GET /api/agents/:id': this.getAgent.bind(this),
            'GET /api/agents/:id/metrics': this.getAgentMetrics.bind(this),
            'GET /api/triad/current': this.getCurrentTriadState.bind(this),
            'GET /api/triad/history': this.getTriadHistory.bind(this),
            'GET /api/consensus': this.getConsensus.bind(this),
            'GET /api/metrics/summary': this.getMetricsSummary.bind(this),
            'GET /api/metrics/cost': this.getCostMetrics.bind(this),
            'GET /api/consciousness/:sessionId': this.getConsciousnessMetrics.bind(this),
            'GET /health': this.getHealth.bind(this),
            'GET /': this.getRoot.bind(this)
        };

        // Initialize observability integration if path provided
        if (this.config.observabilityPath) {
            this._initializeObservability();
        }
    }

    /**
     * Initialize observability module integration
     * @private
     */
    _initializeObservability() {
        try {
            const { DashboardSync } = require(this.config.observabilityPath);
            this.dashboardSync = DashboardSync.createInstance({
                dashboardUrl: `http://${this.config.host}:${this.config.port}`,
                enabled: true,
                debug: this.config.debug
            });

            // Listen for sync events
            this.dashboardSync.on('agent-health-sync', (health) => {
                this.agents.set(health.agentId, health);
                this.emit('agent-update', health);
            });

            this.dashboardSync.on('triad-state-sync', (state) => {
                this.triadStates.set(state.sessionId, state);
                this.emit('triad-update', state);
            });

            this.dashboardSync.on('cost-sync', (cost) => {
                this._updateCostData(cost);
                this.emit('cost-update', cost);
            });

            if (this.config.debug) {
                console.log('[ApiServer] Observability integration initialized');
            }
        } catch (error) {
            console.warn('[ApiServer] Failed to initialize observability:', error.message);
        }
    }

    /**
     * Update cost data from sync
     * @private
     * @param {Object} costData - Cost data
     */
    _updateCostData(costData) {
        this.costData.totalCost += costData.cost || 0;
        
        if (costData.agentId) {
            const currentAgentCost = this.costData.costByAgent.get(costData.agentId) || 0;
            this.costData.costByAgent.set(costData.agentId, currentAgentCost + costData.cost);
        }

        if (costData.model) {
            const currentModelCost = this.costData.costByModel.get(costData.model) || 0;
            this.costData.costByModel.set(costData.model, currentModelCost + costData.cost);
        }

        if (costData.tokenUsage) {
            this.costData.tokenUsage.total += costData.tokenUsage;
            if (costData.agentId) {
                const currentAgentTokens = this.costData.tokenUsage.byAgent.get(costData.agentId) || 0;
                this.costData.tokenUsage.byAgent.set(costData.agentId, currentAgentTokens + costData.tokenUsage);
            }
        }
    }

    /**
     * Start the API server
     * @returns {Promise<void>}
     */
    async start() {
        if (this.isRunning) {
            console.log('[ApiServer] Already running');
            return;
        }

        return new Promise((resolve, reject) => {
            try {
                this.server = http.createServer(this._handleRequest.bind(this));
                
                this.server.listen(this.config.port, this.config.host, (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    
                    this.isRunning = true;
                    console.log(`[ApiServer] Heretek Control Dashboard API running on http://${this.config.host}:${this.config.port}`);
                    console.log(`[ApiServer] Endpoints: /api/agents, /api/triad, /api/consensus, /api/metrics`);
                    
                    this.emit('started');
                    resolve();
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Stop the API server
     * @returns {Promise<void>}
     */
    async stop() {
        if (!this.isRunning) {
            return;
        }

        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => {
                    this.server = null;
                    this.isRunning = false;
                    console.log('[ApiServer] Server stopped');
                    this.emit('stopped');
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    /**
     * Handle HTTP requests
     * @private
     * @param {http.IncomingMessage} req - HTTP request
     * @param {http.ServerResponse} res - HTTP response
     */
    _handleRequest(req, res) {
        const parsedUrl = url.parse(req.url, true);
        const pathname = parsedUrl.pathname;
        const method = req.method;

        // CORS headers
        if (this.config.cors) {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        }

        // Handle OPTIONS for CORS preflight
        if (method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }

        // Find matching route
        let handler = null;
        let params = {};

        for (const [routePath, routeHandler] of Object.entries(this.routes)) {
            const [routeMethod, routePattern] = routePath.split(' ');
            
            if (method !== routeMethod) {
                continue;
            }

            const match = this._matchRoute(pathname, routePattern);
            if (match) {
                handler = routeHandler;
                params = match.params;
                break;
            }
        }

        if (handler) {
            // Parse JSON body for POST/PUT requests
            if (method === 'POST' || method === 'PUT') {
                let body = '';
                req.on('data', chunk => { body += chunk; });
                req.on('end', async () => {
                    try {
                        req.body = body ? JSON.parse(body) : {};
                        await handler(req, res, params);
                    } catch (error) {
                        this._sendError(res, error, 400);
                    }
                });
            } else {
                handler(req, res, params).catch(error => {
                    this._sendError(res, error, 500);
                });
            }
        } else {
            this._sendError(res, new Error('Not found'), 404);
        }
    }

    /**
     * Match URL against route pattern
     * @private
     * @param {string} pathname - Request pathname
     * @param {string} pattern - Route pattern
     * @returns {Object|null} Match result with params
     */
    _matchRoute(pathname, pattern) {
        const pathParts = pathname.split('/');
        const patternParts = pattern.split('/');

        if (pathParts.length !== patternParts.length) {
            return null;
        }

        const params = {};
        
        for (let i = 0; i < patternParts.length; i++) {
            const patternPart = patternParts[i];
            const pathPart = pathParts[i];

            if (patternPart.startsWith(':')) {
                // URL parameter
                params[patternPart.slice(1)] = pathPart;
            } else if (patternPart !== pathPart) {
                return null;
            }
        }

        return { params };
    }

    /**
     * Send JSON response
     * @private
     * @param {http.ServerResponse} res - HTTP response
     * @param {Object} data - Response data
     * @param {number} [status=200] - HTTP status code
     */
    _sendJson(res, data, status = 200) {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
    }

    /**
     * Send error response
     * @private
     * @param {http.ServerResponse} res - HTTP response
     * @param {Error} error - Error object
     * @param {number} [status=500] - HTTP status code
     */
    _sendError(res, error, status = 500) {
        this._sendJson(res, {
            error: error.message,
            status
        }, status);
    }

    // ==============================================================================
    // API Endpoint Handlers
    // ==============================================================================

    /**
     * GET /api/agents - List all agents with status
     * @private
     */
    async getAgents(req, res) {
        const agentsList = Array.from(this.agents.values());
        
        this._sendJson(res, {
            timestamp: new Date().toISOString(),
            totalAgents: agentsList.length,
            onlineCount: agentsList.filter(a => a.status === 'online').length,
            offlineCount: agentsList.filter(a => a.status === 'offline').length,
            agents: agentsList
        });
    }

    /**
     * GET /api/agents/:id - Single agent details
     * @private
     */
    async getAgent(req, res, params) {
        const agent = this.agents.get(params.id);
        
        if (!agent) {
            this._sendError(res, new Error(`Agent ${params.id} not found`), 404);
            return;
        }

        this._sendJson(res, {
            timestamp: new Date().toISOString(),
            agent
        });
    }

    /**
     * GET /api/agents/:id/metrics - Agent metrics
     * @private
     */
    async getAgentMetrics(req, res, params) {
        const agent = this.agents.get(params.id);
        
        if (!agent) {
            this._sendError(res, new Error(`Agent ${params.id} not found`), 404);
            return;
        }

        this._sendJson(res, {
            timestamp: new Date().toISOString(),
            agentId: params.id,
            metrics: agent.metrics || {},
            cost: this.costData.costByAgent.get(params.id) || 0,
            tokenUsage: this.costData.tokenUsage.byAgent.get(params.id) || 0
        });
    }

    /**
     * GET /api/triad/current - Current triad state
     * @private
     */
    async getCurrentTriadState(req, res) {
        // Return the most recent triad state
        const states = Array.from(this.triadStates.values());
        const currentState = states.length > 0 
            ? states.reduce((latest, current) => 
                  current.timestamp > latest.timestamp ? current : latest)
            : null;

        this._sendJson(res, {
            timestamp: new Date().toISOString(),
            triadState: currentState,
            activeSession: currentState?.sessionId || null
        });
    }

    /**
     * GET /api/triad/history - Triad deliberation history
     * @private
     */
    async getTriadHistory(req, res) {
        const history = Array.from(this.triadStates.values())
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        this._sendJson(res, {
            timestamp: new Date().toISOString(),
            history,
            count: history.length
        });
    }

    /**
     * GET /api/consensus - Consensus ledger entries
     * @private
     */
    async getConsensus(req, res) {
        this._sendJson(res, {
            timestamp: new Date().toISOString(),
            entries: this.consensusHistory,
            count: this.consensusHistory.length
        });
    }

    /**
     * GET /api/metrics/summary - System-wide metrics summary
     * @private
     */
    async getMetricsSummary(req, res) {
        const agentsList = Array.from(this.agents.values());
        const triadStatesList = Array.from(this.triadStates.values());

        this._sendJson(res, {
            timestamp: new Date().toISOString(),
            summary: {
                agents: {
                    total: agentsList.length,
                    online: agentsList.filter(a => a.status === 'online').length,
                    offline: agentsList.filter(a => a.status === 'offline').length
                },
                triad: {
                    activeSessions: triadStatesList.length,
                    deliberating: triadStatesList.filter(t => t.consensus === 'deliberating').length
                },
                consensus: {
                    totalDecisions: this.consensusHistory.length,
                    approved: this.consensusHistory.filter(c => c.decision === 'approved').length,
                    rejected: this.consensusHistory.filter(c => c.decision === 'rejected').length,
                    deferred: this.consensusHistory.filter(c => c.decision === 'deferred').length
                },
                cost: {
                    totalCost: this.costData.totalCost,
                    totalTokens: this.costData.tokenUsage.total
                }
            }
        });
    }

    /**
     * GET /api/metrics/cost - Cost breakdown by agent/model
     * @private
     */
    async getCostMetrics(req, res) {
        const costByAgent = {};
        for (const [agentId, cost] of this.costData.costByAgent) {
            costByAgent[agentId] = cost;
        }

        const costByModel = {};
        for (const [model, cost] of this.costData.costByModel) {
            costByModel[model] = cost;
        }

        const tokenUsageByAgent = {};
        for (const [agentId, tokens] of this.costData.tokenUsage.byAgent) {
            tokenUsageByAgent[agentId] = tokens;
        }

        this._sendJson(res, {
            timestamp: new Date().toISOString(),
            cost: {
                totalCost: this.costData.totalCost,
                costByAgent,
                costByModel
            },
            tokenUsage: {
                total: this.costData.tokenUsage.total,
                byAgent: tokenUsageByAgent
            }
        });
    }

    /**
     * GET /api/consciousness/:sessionId - Consciousness metrics for session
     * @private
     */
    async getConsciousnessMetrics(req, res, params) {
        const metrics = this.consciousnessMetrics.get(params.sessionId);

        if (!metrics) {
            this._sendError(res, new Error(`No consciousness metrics found for session ${params.sessionId}`), 404);
            return;
        }

        this._sendJson(res, {
            timestamp: new Date().toISOString(),
            sessionId: params.sessionId,
            metrics
        });
    }

    /**
     * GET /health - Health check
     * @private
     */
    async getHealth(req, res) {
        this._sendJson(res, {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            agents: this.agents.size,
            triadStates: this.triadStates.size,
            consensusEntries: this.consensusHistory.length
        });
    }

    /**
     * GET / - Root endpoint with API info
     * @private
     */
    async getRoot(req, res) {
        this._sendJson(res, {
            name: 'Heretek Control Dashboard API',
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            endpoints: [
                'GET /api/agents - List all agents',
                'GET /api/agents/:id - Get agent details',
                'GET /api/agents/:id/metrics - Get agent metrics',
                'GET /api/triad/current - Get current triad state',
                'GET /api/triad/history - Get triad history',
                'GET /api/consensus - Get consensus ledger',
                'GET /api/metrics/summary - Get metrics summary',
                'GET /api/metrics/cost - Get cost breakdown',
                'GET /api/consciousness/:sessionId - Get consciousness metrics',
                'GET /health - Health check',
                'WebSocket /ws - Real-time updates'
            ]
        });
    }

    // ==============================================================================
    // Data Update Methods (called by DataAggregator)
    // ==============================================================================

    /**
     * Update agent data
     * @param {AgentStatus} agentData - Agent data
     */
    updateAgent(agentData) {
        this.agents.set(agentData.agentId, agentData);
        this.emit('agent-update', agentData);
    }

    /**
     * Update triad state
     * @param {TriadState} triadData - Triad state data
     */
    updateTriadState(triadData) {
        this.triadStates.set(triadData.sessionId, triadData);
        this.emit('triad-update', triadData);
    }

    /**
     * Add consensus entry
     * @param {ConsensusEntry} entry - Consensus entry
     */
    addConsensusEntry(entry) {
        this.consensusHistory.push(entry);
        this.emit('consensus-update', entry);
    }

    /**
     * Update consciousness metrics
     * @param {string} sessionId - Session ID
     * @param {Object} metrics - Consciousness metrics
     */
    updateConsciousnessMetrics(sessionId, metrics) {
        this.consciousnessMetrics.set(sessionId, {
            ...metrics,
            timestamp: Date.now()
        });
        this.emit('consciousness-update', { sessionId, metrics });
    }

    /**
     * Get server status
     * @returns {Object} Server status
     */
    getStatus() {
        return {
            running: this.isRunning,
            port: this.config.port,
            host: this.config.host,
            agents: this.agents.size,
            triadStates: this.triadStates.size,
            consensusEntries: this.consensusHistory.length,
            uptime: process.uptime()
        };
    }
}

// ==============================================================================
// Exports
// ==============================================================================

module.exports = {
    ApiServer,
    
    /**
     * Create singleton instance
     * @param {ApiServerConfig} config - Configuration
     * @returns {ApiServer} Singleton instance
     */
    createInstance: (config) => {
        if (!global.heretekApiServerSingleton) {
            global.heretekApiServerSingleton = new ApiServer(config);
        }
        return global.heretekApiServerSingleton;
    }
};
