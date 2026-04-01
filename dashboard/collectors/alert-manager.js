/**
 * Heretek OpenClaw Health Check Dashboard - Alert Manager
 * 
 * Manages alert thresholds and notifications for the health dashboard
 * 
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');

class AlertManager {
  constructor(options = {}) {
    this.alerts = [];
    this.thresholds = {
      budget_warning: 80,
      budget_critical: 100,
      latency_warning: 5000,
      latency_critical: 10000,
      error_rate_warning: 5,
      error_rate_critical: 10
    };
    this.initialized = false;
  }

  /**
   * Initialize the alert manager
   */
  async initialize() {
    // Load custom thresholds from config if available
    const configPath = path.join(__dirname, '../config/alert-rules.yaml');
    if (fs.existsSync(configPath)) {
      try {
        const yaml = require('js-yaml');
        const config = yaml.load(fs.readFileSync(configPath, 'utf8'));
        if (config?.alerts?.thresholds) {
          this.thresholds = { ...this.thresholds, ...config.alerts.thresholds };
        }
      } catch (error) {
        console.log('[AlertManager] Using default thresholds');
      }
    }
    this.initialized = true;
    console.log('[AlertManager] Initialized with thresholds:', this.thresholds);
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    this.initialized = false;
    this.alerts = [];
  }

  /**
   * Get current alerts
   */
  async getAlerts() {
    return this.alerts.filter(a => !a.acknowledged && !a.dismissed);
  }

  /**
   * Check for alerts based on health data
   */
  async checkAlerts(healthData) {
    const newAlerts = [];

    // Check service health
    if (healthData.services) {
      for (const service of healthData.services) {
        if (service.status === 'error' || service.status === 'unhealthy') {
          newAlerts.push({
            id: `service-${service.id}-${Date.now()}`,
            type: 'service',
            severity: 'critical',
            title: `Service ${service.name} is ${service.status}`,
            message: service.error || `Service ${service.name} is not responding`,
            timestamp: new Date().toISOString(),
            source: service.id
          });
        }
      }
    }

    // Check resource usage
    if (healthData.resources) {
      const { cpu, memory, disk } = healthData.resources;
      
      if (cpu?.system?.usage > 90) {
        newAlerts.push({
          id: `cpu-high-${Date.now()}`,
          type: 'resource',
          severity: 'critical',
          title: 'High CPU Usage',
          message: `CPU usage is ${cpu.system.usage.toFixed(1)}%`,
          timestamp: new Date().toISOString(),
          source: 'system'
        });
      } else if (cpu?.system?.usage > 70) {
        newAlerts.push({
          id: `cpu-warning-${Date.now()}`,
          type: 'resource',
          severity: 'warning',
          title: 'Elevated CPU Usage',
          message: `CPU usage is ${cpu.system.usage.toFixed(1)}%`,
          timestamp: new Date().toISOString(),
          source: 'system'
        });
      }

      if (memory?.system?.usage > 90) {
        newAlerts.push({
          id: `memory-high-${Date.now()}`,
          type: 'resource',
          severity: 'critical',
          title: 'High Memory Usage',
          message: `Memory usage is ${memory.system.usage.toFixed(1)}%`,
          timestamp: new Date().toISOString(),
          source: 'system'
        });
      } else if (memory?.system?.usage > 70) {
        newAlerts.push({
          id: `memory-warning-${Date.now()}`,
          type: 'resource',
          severity: 'warning',
          title: 'Elevated Memory Usage',
          message: `Memory usage is ${memory.system.usage.toFixed(1)}%`,
          timestamp: new Date().toISOString(),
          source: 'system'
        });
      }
    }

    // Add new alerts to the list (keep last 100)
    this.alerts = [...newAlerts, ...this.alerts].slice(0, 100);

    return newAlerts;
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = new Date().toISOString();
      return { success: true, alert };
    }
    return { success: false, error: 'Alert not found' };
  }

  /**
   * Dismiss an alert
   */
  async dismissAlert(alertId) {
    const alertIndex = this.alerts.findIndex(a => a.id === alertId);
    if (alertIndex !== -1) {
      const alert = this.alerts[alertIndex];
      alert.dismissed = true;
      alert.dismissedAt = new Date().toISOString();
      return { success: true, alert };
    }
    return { success: false, error: 'Alert not found' };
  }

  /**
   * Update alert thresholds
   */
  async updateThresholds(newThresholds) {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    return { success: true, thresholds: this.thresholds };
  }

  /**
   * Get current thresholds
   */
  getThresholds() {
    return this.thresholds;
  }

  /**
   * Clear all alerts
   */
  async clearAlerts() {
    this.alerts = [];
  }

  /**
   * Get alert statistics
   */
  getStats() {
    const active = this.alerts.filter(a => !a.acknowledged && !a.dismissed).length;
    const acknowledged = this.alerts.filter(a => a.acknowledged && !a.dismissed).length;
    const dismissed = this.alerts.filter(a => a.dismissed).length;
    const critical = this.alerts.filter(a => a.severity === 'critical' && !a.dismissed).length;
    const warning = this.alerts.filter(a => a.severity === 'warning' && !a.dismissed).length;

    return {
      total: this.alerts.length,
      active,
      acknowledged,
      dismissed,
      critical,
      warning
    };
  }
}

module.exports = AlertManager;
