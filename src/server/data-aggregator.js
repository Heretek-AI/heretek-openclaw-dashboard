/**
 * Heretek Control Dashboard - Data Aggregator
 * ==============================================================================
 * Central data aggregation service that collects metrics from various sources
 * including the observability layer, gateway, and cost tracking systems.
 * 
 * Architecture:
 *   ┌─────────────────────────────────────────────────────────────────┐
 *   │                    Data Aggregator                              │
 *   │                                                                  │
 *   │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
 *   │  │   Gateway    │  │  Observability│ │    Cost      │          │
 *   │  │   Collector  │  │   Collector   │ │   Collector  │          │
 *   │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
 *   │         │                 │                  │                   │
 *   │         └─────────────────┼──────────────────┘                   │
 *   │                           ▼                                      │
 *   │                  ┌────────────────┐                             │
 *   │                  │   Data Cache   │                             │
 *   │                  └───────┬────────┘                             │
 *   │                          │                                      │
 *   │         ┌────────────────┼────────────────┐                     │
 *   │         ▼                ▼                ▼                     │
 *   │  ┌────────────┐  ┌────────────┐  ┌────────────┐                │
 *   │  │    API     │  │ WebSocket  │  │   Event    │                │
 *   │  │  Server    │  │   Server   │  │  Emitters  │                │
 *   │  └────────────┘  └────────────┘  └────────────┘                │
 *   └─────────────────────────────────────────────────────────────────┘
 * 
 * Usage:
 *   const { DataAggregator } = require('./src/server/data-aggregator');
 *   const aggregator = new DataAggregator({
 *     gatewayUrl: 'http://localhost:18789',
 *     observabilityPath: '../heretek-openclaw-core/modules/observability'
 *   });
 *   await aggregator.start();
 * 
 * @module data-aggregator
 */

const http = require('http');
const EventEmitter = require('events');

/**
 * Data Aggregator Configuration
 * @typedef {Object} DataAggregatorConfig
 * @property {string} [gatewayUrl='http://localhost:18789'] - Gateway URL
 * @property {string} [observabilityPath] - Path to observability module
 * @property {number} [collectionInterval=5000] - Collection interval in ms
 * @property {boolean} [enabled=true] - Enable aggregation
 * @property {boolean} [debug=false] - Debug logging
 */

/**
 * Agent Metrics Data
 * @typedef {Object} AgentMetrics
 * @property {string} agentId - Agent identifier
 * @property {number} responseTime - Response time in ms
 * @property {number} tokenUsage - Token count
 * @property {number} cost - Cost in USD
 * @property {number} latency - Request latency
 * @property {number} successRate - Success rate percentage
 */

/**
 * Data Aggregator Class
 */
class DataAggregator extends EventEmitter {
    /**
     * Create data aggregator instance
     * @param {DataAggregatorConfig} config - Configuration
     */
    constructor(config = {}) {
        super();
        
        this.config = {
            gatewayUrl: config.gatewayUrl || process.env.GATEWAY_URL || 'http://localhost:18789',
            observabilityPath: config.observabilityPath,
            collectionInterval: config.collectionInterval || 5000,
            enabled: config.enabled !== undefined ? config.enabled : true,
            debug: config.debug !== undefined ? config.debug : false
        };

        // Internal state
        this.isRunning = false;
        this.collectionTimer = null;
        this.dashboardSync = null;

        // Cached data
        this.cache = {
            agents: new Map(),
            triadStates: new Map(),
            consensusHistory: [],
            consciousnessMetrics: new Map(),
            costData: {
                totalCost: 0,
                costByAgent: new Map(),
                costByModel: new Map(),
                tokenUsage: { total: 0, byAgent: new Map() }
            },
            systemMetrics: {
                cpu: 0,
                memory: 0,
                disk: 0
            },
            lastUpdated: null
        };

        // Collection statistics
        this.stats = {
            collectionsCount: 0,
            lastCollectionTime: null,
            lastCollectionDuration: 0,
            errorsCount: 0
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
                enabled: true,
                debug: this.config.debug
            });

            // Listen for sync events and update cache
            this.dashboardSync.on('agent-health-sync', (health) => {
                this.cache.agents.set(health.agentId, {
                    ...health,
                    lastUpdated: Date.now()
                });
                this.emit('agent-update', health);
            });

            this.dashboardSync.on('triad-state-sync', (state) => {
                this.cache.triadStates.set(state.sessionId, {
                    ...state,
                    lastUpdated: Date.now()
                });
                this.emit('triad-update', state);
            });

            this.dashboardSync.on('consciousness-metrics-sync', (metrics) => {
                const key = metrics.sessionId;
                this.cache.consciousnessMetrics.set(key, {
                    ...metrics,
                    lastUpdated: Date.now()
                });
                this.emit('consciousness-update', metrics);
            });

            this.dashboardSync.on('cost-sync', (costData) => {
                this._updateCostCache(costData);
                this.emit('cost-update', costData);
            });

            this.dashboardSync.on('consensus-recorded', (consensus) => {
                this.cache.consensusHistory.push({
                    ...consensus,
                    recordedAt: Date.now()
                });
                this.emit('consensus-update', consensus);
            });

            if (this.config.debug) {
                console.log('[DataAggregator] Observability integration initialized');
            }
        } catch (error) {
            console.warn('[DataAggregator] Failed to initialize observability:', error.message);
        }
    }

    /**
     * Update cost cache from sync data
     * @private
     * @param {Object} costData - Cost data
     */
    _updateCostCache(costData) {
        this.cache.costData.totalCost += costData.cost || 0;
        
        if (costData.agentId) {
            const currentAgentCost = this.cache.costData.costByAgent.get(costData.agentId) || 0;
            this.cache.costData.costByAgent.set(costData.agentId, currentAgentCost + costData.cost);
        }

        if (costData.model) {
            const currentModelCost = this.cache.costData.costByModel.get(costData.model) || 0;
            this.cache.costData.costByModel.set(costData.model, currentModelCost + costData.cost);
        }

        if (costData.tokenUsage) {
            this.cache.costData.tokenUsage.total += costData.tokenUsage;
            if (costData.agentId) {
                const currentAgentTokens = this.cache.costData.tokenUsage.byAgent.get(costData.agentId) || 0;
                this.cache.costData.tokenUsage.byAgent.set(costData.agentId, currentAgentTokens + costData.tokenUsage);
            }
        }
    }

    /**
     * Start the data aggregator
     * @returns {Promise<void>}
     */
    async start() {
        if (this.isRunning) {
            console.log('[DataAggregator] Already running');
            return;
        }

        // Initial data collection
        await this._collectAllData();

        // Start periodic collection
        if (this.config.collectionInterval > 0) {
            this.collectionTimer = setInterval(() => {
                this._collectAllData();
            }, this.config.collectionInterval);
        }

        this.isRunning = true;
        console.log(`[DataAggregator] Started - Collection interval: ${this.config.collectionInterval}ms`);
        this.emit('started');
    }

    /**
     * Stop the data aggregator
     * @returns {Promise<void>}
     */
    async stop() {
        if (!this.isRunning) {
            return;
        }

        if (this.collectionTimer) {
            clearInterval(this.collectionTimer);
            this.collectionTimer = null;
        }

        this.isRunning = false;
        console.log('[DataAggregator] Stopped');
        this.emit('stopped');
    }

    /**
     * Collect all data from sources
     * @private
     */
    async _collectAllData() {
        const startTime = Date.now();

        try {
            // Collect from multiple sources in parallel
            await Promise.all([
                this._collectGatewayData(),
                this._collectSystemMetrics()
            ]);

            // Update cache timestamp
            this.cache.lastUpdated = Date.now();

            // Update statistics
            this.stats.collectionsCount++;
            this.stats.lastCollectionTime = new Date().toISOString();
            this.stats.lastCollectionDuration = Date.now() - startTime;

            // Emit collection complete event
            this.emit('collection-complete', {
                timestamp: this.cache.lastUpdated,
                duration: this.stats.lastCollectionDuration,
                agentsCount: this.cache.agents.size,
                triadStatesCount: this.cache.triadStates.size
            });

            if (this.config.debug) {
                console.log(`[DataAggregator] Collection complete in ${this.stats.lastCollectionDuration}ms`);
            }

        } catch (error) {
            console.error('[DataAggregator] Collection error:', error.message);
            this.stats.errorsCount++;
            this.emit('collection-error', error);
        }
    }

    /**
     * Collect data from gateway
     * @private
     */
    async _collectGatewayData() {
        try {
            // Fetch agent status from gateway
            const agentStatus = await this._httpGet(`${this.config.gatewayUrl}/agent-status`);
            
            if (agentStatus && agentStatus.agents) {
                for (const agent of agentStatus.agents) {
                    this.cache.agents.set(agent.agentId, {
                        agentId: agent.agentId,
                        status: agent.status,
                        lastHeartbeat: new Date(agent.lastSeen).getTime(),
                        lastSeen: agent.lastSeen,
                        registeredAt: agent.registeredAt,
                        metadata: agent.metadata,
                        lastUpdated: Date.now()
                    });
                }
            }

            if (this.config.debug) {
                console.log(`[DataAggregator] Collected ${agentStatus?.agents?.length || 0} agents from gateway`);
            }

        } catch (error) {
            if (this.config.debug) {
                console.log('[DataAggregator] Gateway collection skipped:', error.message);
            }
        }
    }

    /**
     * Collect system metrics
     * @private
     */
    async _collectSystemMetrics() {
        try {
            // Get process memory usage
            const memUsage = process.memoryUsage();
            this.cache.systemMetrics.memory = Math.round(memUsage.heapUsed / 1024 / 1024); // MB

            // Simple CPU estimation (would need os module for accurate CPU)
            this.cache.systemMetrics.cpu = Math.round(loadavg() * 100) || 0;

            if (this.config.debug) {
                console.log(`[DataAggregator] System metrics: CPU ${this.cache.systemMetrics.cpu}%, Memory ${this.cache.systemMetrics.memory}MB`);
            }

        } catch (error) {
            if (this.config.debug) {
                console.log('[DataAggregator] System metrics collection error:', error.message);
            }
        }
    }

    /**
     * HTTP GET request helper
     * @private
     * @param {string} url - URL to fetch
     * @returns {Promise<Object>} Response data
     */
    async _httpGet(url) {
        return new Promise((resolve, reject) => {
            const parsedUrl = new URL(url);
            
            const options = {
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || 80,
                path: parsedUrl.pathname + parsedUrl.search,
                method: 'GET',
                timeout: 5000
            };

            const req = http.request(options, (res) => {
                let data = '';
                
                res.on('data', chunk => { data += chunk; });
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (error) {
                        resolve(data);
                    }
                });
            });

            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            req.end();
        });
    }

    // ==============================================================================
    // Data Access Methods
    // ==============================================================================

    /**
     * Get all agent data
     * @returns {Array<Object>} Agent data array
     */
    getAgents() {
        return Array.from(this.cache.agents.values());
    }

    /**
     * Get agent by ID
     * @param {string} agentId - Agent ID
     * @returns {Object|null} Agent data or null
     */
    getAgent(agentId) {
        return this.cache.agents.get(agentId) || null;
    }

    /**
     * Get all triad states
     * @returns {Array<Object>} Triad states array
     */
    getTriadStates() {
        return Array.from(this.cache.triadStates.values());
    }

    /**
     * Get current triad state
     * @returns {Object|null} Current triad state or null
     */
    getCurrentTriadState() {
        const states = this.getTriadStates();
        if (states.length === 0) return null;
        
        return states.reduce((latest, current) => 
            (current.timestamp || 0) > (latest.timestamp || 0) ? current : latest
        );
    }

    /**
     * Get consensus history
     * @returns {Array<Object>} Consensus history array
     */
    getConsensusHistory() {
        return this.cache.consensusHistory;
    }

    /**
     * Get consciousness metrics
     * @param {string} sessionId - Session ID
     * @returns {Object|null} Consciousness metrics or null
     */
    getConsciousnessMetrics(sessionId) {
        return this.cache.consciousnessMetrics.get(sessionId) || null;
    }

    /**
     * Get cost data
     * @returns {Object} Cost data
     */
    getCostData() {
        return { ...this.cache.costData };
    }

    /**
     * Get system metrics
     * @returns {Object} System metrics
     */
    getSystemMetrics() {
        return { ...this.cache.systemMetrics };
    }

    /**
     * Get complete dashboard state
     * @returns {Object} Complete dashboard state
     */
    getDashboardState() {
        return {
            timestamp: this.cache.lastUpdated,
            agents: this.getAgents(),
            triad: {
                states: this.getTriadStates(),
                current: this.getCurrentTriadState()
            },
            consensus: {
                history: this.getConsensusHistory(),
                count: this.cache.consensusHistory.length
            },
            consciousness: Array.from(this.cache.consciousnessMetrics.values()),
            cost: this.getCostData(),
            system: this.getSystemMetrics()
        };
    }

    /**
     * Get aggregator statistics
     * @returns {Object} Aggregator statistics
     */
    getStats() {
        return {
            running: this.isRunning,
            ...this.stats,
            cacheSize: {
                agents: this.cache.agents.size,
                triadStates: this.cache.triadStates.size,
                consciousnessMetrics: this.cache.consciousnessMetrics.size,
                consensusHistory: this.cache.consensusHistory.length
            }
        };
    }

    /**
     * Clear all cached data
     */
    clearCache() {
        this.cache.agents.clear();
        this.cache.triadStates.clear();
        this.cache.consciousnessMetrics.clear();
        this.cache.consensusHistory = [];
        this.cache.costData = {
            totalCost: 0,
            costByAgent: new Map(),
            costByModel: new Map(),
            tokenUsage: { total: 0, byAgent: new Map() }
        };
        this.emit('cache-cleared');
    }
}

/**
 * Simple load average approximation for Node.js
 * @returns {number} Load average
 */
function loadavg() {
    // Simple approximation - in production would use os.loadavg()
    return 0;
}

// ==============================================================================
// Exports
// ==============================================================================

module.exports = {
    DataAggregator,
    
    /**
     * Create singleton instance
     * @param {DataAggregatorConfig} config - Configuration
     * @returns {DataAggregator} Singleton instance
     */
    createInstance: (config) => {
        if (!global.heretekDataAggregatorSingleton) {
            global.heretekDataAggregatorSingleton = new DataAggregator(config);
        }
        return global.heretekDataAggregatorSingleton;
    }
};
