/**
 * Heretek Control Dashboard - WebSocket Server
 * ==============================================================================
 * WebSocket server for real-time dashboard updates.
 * Provides live streaming of agent status, triad deliberations,
 * consciousness metrics, and cost tracking updates.
 * 
 * Architecture:
 *   ┌─────────────────────────────────────────────────────────────────┐
 *   │              WebSocket Server (Port 3002)                       │
 *   │                                                                  │
 *   │  ┌──────────────────────────────────────────────────────┐      │
 *   │  │               Client Connections                      │      │
 *   │  │  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐     │      │
 *   │  │  │Browser │  │Mobile  │  │ Admin  │  │  CLI   │     │      │
 *   │  │  │Client  │  │Client  │  │Console │  │Client  │     │      │
 *   │  │  └────────┘  └────────┘  └────────┘  └────────┘     │      │
 *   │  └──────────────────────────────────────────────────────┘      │
 *   │                          │                                      │
 *   │         ┌────────────────┼────────────────┐                     │
 *   │         ▼                ▼                ▼                     │
 *   │  ┌────────────┐  ┌────────────┐  ┌────────────┐                │
 *   │  │   Agent    │  │   Triad    │  │  Cost      │                │
 *   │  │   Events   │  │   Events   │  │  Events    │                │
 *   │  └────────────┘  └────────────┘  └────────────┘                │
 *   │                                                                  │
 *   │  ┌──────────────────────────────────────────────────────┐      │
 *   │  │              Message Types                            │      │
 *   │  │  - agent-status    - triad-update    - cost-update   │      │
 *   │  │  - consensus       - consciousness   - alert         │      │
 *   │  └──────────────────────────────────────────────────────┘      │
 *   └─────────────────────────────────────────────────────────────────┘
 * 
 * Usage:
 *   const { WebSocketServer } = require('./src/server/websocket-server');
 *   const wsServer = new WebSocketServer({ port: 3002 });
 *   await wsServer.start();
 *   
 *   // Broadcast updates
 *   wsServer.broadcast({
 *     type: 'agent-status',
 *     data: { agentId: 'steward', status: 'online' }
 *   });
 * 
 * @module websocket-server
 */

const WebSocket = require('ws');
const http = require('http');
const EventEmitter = require('events');

/**
 * WebSocket Server Configuration
 * @typedef {Object} WebSocketServerConfig
 * @property {number} [port=3002] - Server port
 * @property {string} [host='0.0.0.0'] - Server host
 * @property {number} [heartbeatInterval=30000] - Heartbeat interval in ms
 * @property {boolean} [debug=false] - Debug logging
 */

/**
 * WebSocket Message
 * @typedef {Object} WebSocketMessage
 * @property {string} type - Message type
 * @property {Object} data - Message payload
 * @property {number} timestamp - Message timestamp
 */

/**
 * WebSocket Server Class
 */
class WebSocketServer extends EventEmitter {
    /**
     * Create WebSocket server instance
     * @param {WebSocketServerConfig} config - Configuration
     */
    constructor(config = {}) {
        super();
        
        this.config = {
            port: config.port || process.env.WS_PORT || 3002,
            host: config.host || process.env.WS_HOST || '0.0.0.0',
            heartbeatInterval: config.heartbeatInterval || 30000,
            debug: config.debug !== undefined ? config.debug : false
        };

        // Internal state
        this.server = null;
        this.wss = null;
        this.isRunning = false;
        this.clients = new Set();
        this.heartbeatTimer = null;
        this.messageQueue = new Map();

        // Statistics
        this.stats = {
            totalConnections: 0,
            totalMessages: 0,
            messagesByType: new Map()
        };
    }

    /**
     * Start the WebSocket server
     * @returns {Promise<void>}
     */
    async start() {
        if (this.isRunning) {
            console.log('[WebSocket] Already running');
            return;
        }

        return new Promise((resolve, reject) => {
            try {
                // Create HTTP server for potential upgrades
                this.server = http.createServer((req, res) => {
                    // Simple health check endpoint
                    if (req.url === '/health') {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            status: 'ok',
                            clients: this.clients.size,
                            timestamp: new Date().toISOString()
                        }));
                    } else {
                        res.writeHead(404);
                        res.end('Not found');
                    }
                });

                // Create WebSocket server
                this.wss = new WebSocket.Server({
                    server: this.server,
                    path: '/ws',
                    maxPayload: 1024 * 1024 // 1MB max message
                });

                this.wss.on('listening', () => {
                    this.isRunning = true;
                    console.log(`[WebSocket] Heretek Control Dashboard WebSocket running on ws://${this.config.host}:${this.config.port}/ws`);
                    this.emit('started');
                    resolve();
                });

                this.wss.on('error', reject);
                this.wss.on('connection', this._handleConnection.bind(this));

                this.server.listen(this.config.port, this.config.host);

                // Start heartbeat
                this._startHeartbeat();

            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Stop the WebSocket server
     * @returns {Promise<void>}
     */
    async stop() {
        if (!this.isRunning) {
            return;
        }

        return new Promise((resolve) => {
            // Stop heartbeat
            this._stopHeartbeat();

            // Close all client connections
            for (const client of this.clients) {
                client.close(1000, 'Server shutting down');
            }
            this.clients.clear();

            // Close WebSocket server
            if (this.wss) {
                this.wss.close(() => {
                    this.wss = null;
                });
            }

            // Close HTTP server
            if (this.server) {
                this.server.close(() => {
                    this.server = null;
                    this.isRunning = false;
                    console.log('[WebSocket] Server stopped');
                    this.emit('stopped');
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    /**
     * Handle new WebSocket connection
     * @private
     * @param {WebSocket} ws - WebSocket client
     * @param {http.IncomingMessage} req - HTTP request
     */
    _handleConnection(ws, req) {
        const clientId = this._generateClientId();
        const clientInfo = {
            id: clientId,
            connectedAt: Date.now(),
            address: req.socket.remoteAddress,
            isAlive: true
        };

        // Store client info
        ws.id = clientId;
        ws.clientInfo = clientInfo;
        ws.isAlive = true;

        // Add to clients set
        this.clients.add(ws);
        this.stats.totalConnections++;

        console.log(`[WebSocket] Client ${clientId} connected from ${clientInfo.address}`);
        this.emit('client-connected', clientInfo);

        // Send welcome message
        this._sendToClient(ws, {
            type: 'welcome',
            data: {
                clientId,
                serverTime: new Date().toISOString(),
                serverVersion: '1.0.0'
            }
        });

        // Send initial state snapshot
        this._sendInitialState(ws);

        // Handle incoming messages
        ws.on('message', (data) => {
            this._handleClientMessage(ws, data);
        });

        // Handle pong (heartbeat response)
        ws.on('pong', () => {
            ws.isAlive = true;
        });

        // Handle disconnection
        ws.on('close', (code, reason) => {
            this.clients.delete(ws);
            console.log(`[WebSocket] Client ${clientId} disconnected (${code})`);
            this.emit('client-disconnected', { clientId, code, reason: reason?.toString() });
        });

        // Handle errors
        ws.on('error', (error) => {
            console.error(`[WebSocket] Client ${clientId} error:`, error.message);
            this.emit('client-error', { clientId, error: error.message });
        });
    }

    /**
     * Handle message from client
     * @private
     * @param {WebSocket} ws - WebSocket client
     * @param {Buffer} data - Message data
     */
    _handleClientMessage(ws, data) {
        try {
            const message = JSON.parse(data.toString());
            
            if (this.config.debug) {
                console.log(`[WebSocket] Message from ${ws.id}:`, message.type);
            }

            switch (message.type) {
                case 'subscribe':
                    this._handleSubscribe(ws, message);
                    break;
                case 'unsubscribe':
                    this._handleUnsubscribe(ws, message);
                    break;
                case 'ping':
                    this._sendToClient(ws, {
                        type: 'pong',
                        data: { timestamp: Date.now() }
                    });
                    break;
                case 'get-state':
                    this._sendInitialState(ws);
                    break;
                default:
                    console.warn(`[WebSocket] Unknown message type from ${ws.id}:`, message.type);
            }

            // Update stats
            this.stats.totalMessages++;
            const count = this.stats.messagesByType.get(message.type) || 0;
            this.stats.messagesByType.set(message.type, count + 1);

        } catch (error) {
            console.error(`[WebSocket] Failed to parse message from ${ws.id}:`, error.message);
            this._sendToClient(ws, {
                type: 'error',
                data: { message: 'Invalid message format' }
            });
        }
    }

    /**
     * Handle subscription request
     * @private
     * @param {WebSocket} ws - WebSocket client
     * @param {Object} message - Subscription message
     */
    _handleSubscribe(ws, message) {
        const { channels } = message.data || {};
        
        if (channels && Array.isArray(channels)) {
            ws.subscriptions = new Set([...(ws.subscriptions || []), ...channels]);
            console.log(`[WebSocket] Client ${ws.id} subscribed to:`, channels);
        }

        this._sendToClient(ws, {
            type: 'subscribed',
            data: { channels: ws.subscriptions ? Array.from(ws.subscriptions) : [] }
        });
    }

    /**
     * Handle unsubscription request
     * @private
     * @param {WebSocket} ws - WebSocket client
     * @param {Object} message - Unsubscription message
     */
    _handleUnsubscribe(ws, message) {
        const { channels } = message.data || {};
        
        if (channels && Array.isArray(channels) && ws.subscriptions) {
            for (const channel of channels) {
                ws.subscriptions.delete(channel);
            }
            console.log(`[WebSocket] Client ${ws.id} unsubscribed from:`, channels);
        }

        this._sendToClient(ws, {
            type: 'unsubscribed',
            data: { channels: ws.subscriptions ? Array.from(ws.subscriptions) : [] }
        });
    }

    /**
     * Send initial state snapshot to client
     * @private
     * @param {WebSocket} ws - WebSocket client
     */
    _sendInitialState(ws) {
        // Get current state from API server if available
        const initialState = {
            type: 'initial-state',
            data: {
                timestamp: new Date().toISOString(),
                message: 'Initial state snapshot',
                // These would be populated from the API server or data aggregator
                agents: [],
                triadState: null,
                consensusCount: 0
            }
        };

        this._sendToClient(ws, initialState);
    }

    /**
     * Broadcast message to all connected clients
     * @param {Object} message - Message to broadcast
     * @param {string} [channel] - Optional channel filter
     */
    broadcast(message, channel) {
        const payload = JSON.stringify({
            ...message,
            timestamp: Date.now()
        });

        let sentCount = 0;
        for (const client of this.clients) {
            if (client.readyState === WebSocket.OPEN) {
                // Check channel subscription if specified
                if (channel && client.subscriptions && !client.subscriptions.has(channel)) {
                    continue;
                }

                try {
                    client.send(payload);
                    sentCount++;
                } catch (error) {
                    console.error(`[WebSocket] Broadcast error to ${client.id}:`, error.message);
                    this.clients.delete(client);
                }
            }
        }

        if (this.config.debug) {
            console.log(`[WebSocket] Broadcast '${message.type}' to ${sentCount} clients`);
        }

        this.emit('broadcast', { message, sentCount });
    }

    /**
     * Send message to specific client
     * @param {string} clientId - Client ID
     * @param {Object} message - Message to send
     * @returns {boolean} Success status
     */
    sendToClient(clientId, message) {
        for (const client of this.clients) {
            if (client.id === clientId && client.readyState === WebSocket.OPEN) {
                return this._sendToClient(client, message);
            }
        }
        return false;
    }

    /**
     * Send message to client (internal)
     * @private
     * @param {WebSocket} ws - WebSocket client
     * @param {Object} message - Message to send
     * @returns {boolean} Success status
     */
    _sendToClient(ws, message) {
        if (ws.readyState !== WebSocket.OPEN) {
            return false;
        }

        try {
            ws.send(JSON.stringify({
                ...message,
                timestamp: Date.now()
            }));
            return true;
        } catch (error) {
            console.error(`[WebSocket] Send error to ${ws.id}:`, error.message);
            return false;
        }
    }

    /**
     * Start heartbeat interval
     * @private
     */
    _startHeartbeat() {
        this.heartbeatTimer = setInterval(() => {
            let aliveCount = 0;
            
            for (const client of this.clients) {
                if (!client.isAlive) {
                    // Client didn't respond to ping - terminate
                    console.log(`[WebSocket] Terminating unresponsive client ${client.id}`);
                    client.terminate();
                    this.clients.delete(client);
                } else {
                    // Mark as not alive, send ping
                    client.isAlive = false;
                    client.ping();
                    aliveCount++;
                }
            }

            if (this.config.debug && aliveCount < this.clients.size) {
                console.log(`[WebSocket] Heartbeat: ${aliveCount}/${this.clients.size} clients alive`);
            }

            this.emit('heartbeat', { total: this.clients.size, alive: aliveCount });
        }, this.config.heartbeatInterval);
    }

    /**
     * Stop heartbeat interval
     * @private
     */
    _stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    /**
     * Generate unique client ID
     * @private
     * @returns {string} Unique client ID
     */
    _generateClientId() {
        return `ws-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }

    /**
     * Get connected client count
     * @returns {number} Number of connected clients
     */
    getClientCount() {
        return this.clients.size;
    }

    /**
     * Get server statistics
     * @returns {Object} Server statistics
     */
    getStats() {
        const messagesByType = {};
        for (const [type, count] of this.stats.messagesByType) {
            messagesByType[type] = count;
        }

        return {
            running: this.isRunning,
            port: this.config.port,
            connectedClients: this.clients.size,
            totalConnections: this.stats.totalConnections,
            totalMessages: this.stats.totalMessages,
            messagesByType,
            uptime: process.uptime()
        };
    }

    /**
     * Get list of connected clients
     * @returns {Array<Object>} Client information
     */
    getConnectedClients() {
        return Array.from(this.clients).map(client => ({
            id: client.id,
            connectedAt: client.clientInfo?.connectedAt,
            address: client.clientInfo?.address,
            subscriptions: client.subscriptions ? Array.from(client.subscriptions) : []
        }));
    }
}

// ==============================================================================
// Exports
// ==============================================================================

module.exports = {
    WebSocketServer,
    
    /**
     * Create singleton instance
     * @param {WebSocketServerConfig} config - Configuration
     * @returns {WebSocketServer} Singleton instance
     */
    createInstance: (config) => {
        if (!global.heretekWebSocketServerSingleton) {
            global.heretekWebSocketServerSingleton = new WebSocketServer(config);
        }
        return global.heretekWebSocketServerSingleton;
    }
};
