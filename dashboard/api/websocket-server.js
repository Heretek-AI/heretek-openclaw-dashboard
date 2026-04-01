/**
 * Heretek OpenClaw Health Check Dashboard - WebSocket Server
 * 
 * Dedicated WebSocket server for real-time health updates
 * 
 * @version 1.0.0
 */

const WebSocket = require('ws');
const EventEmitter = require('events');

/**
 * WebSocket Health Update Server
 */
class WebSocketHealthServer extends EventEmitter {
  constructor(options = {}) {
    super();
    this.port = options.port || 8081;
    this.host = options.host || '0.0.0.0';
    this.wss = null;
    this.clients = new Set();
    this.healthData = null;
  }

  /**
   * Start WebSocket server
   */
  async start() {
    return new Promise((resolve, reject) => {
      this.wss = new WebSocket.Server({
        port: this.port,
        host: this.host,
        path: '/health'
      });

      this.wss.on('listening', () => {
        console.log(`[WebSocket] Health WebSocket server running on ws://${this.host}:${this.port}/health`);
        resolve();
      });

      this.wss.on('error', reject);
      this.wss.on('connection', this.handleConnection.bind(this));
    });
  }

  /**
   * Stop WebSocket server
   */
  async stop() {
    return new Promise((resolve) => {
      if (this.wss) {
        this.clients.forEach(client => client.close());
        this.wss.close(resolve);
        console.log('[WebSocket] Server stopped');
      } else {
        resolve();
      }
    });
  }

  /**
   * Handle new WebSocket connection
   */
  handleConnection(ws, req) {
    const clientId = this.generateClientId();
    ws.id = clientId;
    ws.isAlive = true;

    console.log(`[WebSocket] Client ${clientId} connected from ${req.socket.remoteAddress}`);

    this.clients.add(ws);
    this.emit('client-connected', { clientId, address: req.socket.remoteAddress });

    // Send current health data if available
    if (this.healthData) {
      this.sendToClient(ws, {
        type: 'initial-data',
        data: this.healthData
      });
    }

    // Handle ping/pong for keepalive
    ws.on('pong', () => { ws.isAlive = true; });

    // Handle messages from client
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        this.handleClientMessage(ws, data);
      } catch (error) {
        console.error(`[WebSocket] Error parsing message from ${clientId}:`, error);
      }
    });

    // Handle disconnection
    ws.on('close', () => {
      this.clients.delete(ws);
      this.emit('client-disconnected', { clientId });
      console.log(`[WebSocket] Client ${clientId} disconnected`);
    });

    ws.on('error', (error) => {
      console.error(`[WebSocket] Error for client ${clientId}:`, error);
    });
  }

  /**
   * Handle message from client
   */
  handleClientMessage(ws, data) {
    switch (data.type) {
      case 'subscribe':
        this.emit('client-subscribed', { clientId: ws.id, subscriptions: data.subscriptions });
        break;
      case 'unsubscribe':
        this.emit('client-unsubscribed', { clientId: ws.id });
        break;
      case 'ping':
        this.sendToClient(ws, { type: 'pong', timestamp: Date.now() });
        break;
      default:
        console.warn(`[WebSocket] Unknown message type from ${ws.id}:`, data.type);
    }
  }

  /**
   * Update health data and broadcast to all clients
   */
  broadcastUpdate(healthData) {
    this.healthData = healthData;
    
    const message = {
      type: 'health-update',
      timestamp: new Date().toISOString(),
      data: healthData
    };

    this.broadcast(message);
  }

  /**
   * Broadcast alert to all clients
   */
  broadcastAlert(alert) {
    const message = {
      type: 'alert',
      timestamp: new Date().toISOString(),
      alert
    };

    this.broadcast(message);
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcast(message) {
    const data = JSON.stringify(message);
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  /**
   * Send message to specific client
   */
  sendToClient(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Get connected client count
   */
  getClientCount() {
    return this.clients.size;
  }

  /**
   * Generate unique client ID
   */
  generateClientId() {
    return `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start keepalive interval
   */
  startKeepalive(intervalMs = 30000) {
    this.keepaliveTimer = setInterval(() => {
      this.clients.forEach(ws => {
        if (!ws.isAlive) {
          this.clients.delete(ws);
          ws.terminate();
          return;
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, intervalMs);
  }

  /**
   * Stop keepalive interval
   */
  stopKeepalive() {
    if (this.keepaliveTimer) {
      clearInterval(this.keepaliveTimer);
      this.keepaliveTimer = null;
    }
  }
}

// Export for use as module
module.exports = WebSocketHealthServer;

// Run as standalone server
if (require.main === module) {
  const server = new WebSocketHealthServer({
    port: process.env.WEBSOCKET_PORT || 8081,
    host: process.env.WEBSOCKET_HOST || '0.0.0.0'
  });

  server.start().then(() => {
    server.startKeepalive();
    
    // Simulate health updates for testing
    setInterval(() => {
      server.broadcastUpdate({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        test: true
      });
    }, 5000);
  }).catch(console.error);

  process.on('SIGTERM', () => {
    server.stopKeepalive();
    server.stop();
  });
  process.on('SIGINT', () => {
    server.stopKeepalive();
    server.stop();
  });
}
