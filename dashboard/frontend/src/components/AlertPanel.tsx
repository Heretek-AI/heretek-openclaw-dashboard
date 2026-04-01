import React from 'react';
import { AlertTriangle, Bell, CheckCircle, XCircle, Clock, Filter } from 'lucide-react';
import type { Alert } from '../hooks/useHealthData';

interface AlertPanelProps {
  alerts: Alert[];
  onAcknowledge: (alertId: string) => void;
  onDismiss: (alertId: string) => void;
}

export function AlertPanel({ alerts, onAcknowledge, onDismiss }: AlertPanelProps) {
  const [filter, setFilter] = React.useState<'all' | 'critical' | 'warning' | 'info'>('all');

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-500 bg-red-500/20 border-red-500/50';
      case 'warning':
        return 'text-yellow-500 bg-yellow-500/20 border-yellow-500/50';
      case 'info':
        return 'text-blue-500 bg-blue-500/20 border-blue-500/50';
      default:
        return 'text-gray-500 bg-gray-500/20 border-gray-500/50';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'agent':
        return '🤖';
      case 'service':
        return '🖥️';
      case 'resource':
        return '📊';
      case 'langfuse':
        return '📈';
      case 'litellm':
        return '🌐';
      case 'session':
        return '👥';
      default:
        return '📋';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleString();
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'all') return true;
    return alert.severity === filter;
  });

  const alertCounts = {
    all: alerts.length,
    critical: alerts.filter(a => a.severity === 'critical').length,
    warning: alerts.filter(a => a.severity === 'warning').length,
    info: alerts.filter(a => a.severity === 'info').length,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Alerts
        </h2>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="bg-background border border-border rounded-md px-2 py-1 text-sm"
          >
            <option value="all">All ({alertCounts.all})</option>
            <option value="critical">Critical ({alertCounts.critical})</option>
            <option value="warning">Warning ({alertCounts.warning})</option>
            <option value="info">Info ({alertCounts.info})</option>
          </select>
        </div>
      </div>

      {filteredAlerts.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground border border-border rounded-lg">
          <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
          <p>No alerts to display</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-lg border alert-slide-in ${getSeverityColor(alert.severity)}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{getCategoryIcon(alert.category)}</span>
                    <span className="font-semibold">{alert.title}</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium capitalize bg-background/50">
                      {alert.severity}
                    </span>
                    <span className="text-xs text-muted-foreground">{alert.category}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{alert.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(alert.timestamp)}
                    </span>
                    {alert.agent && <span>Agent: {alert.agent}</span>}
                    {alert.service && <span>Service: {alert.service}</span>}
                    {alert.acknowledged && (
                      <span className="flex items-center gap-1 text-green-500">
                        <CheckCircle className="w-3 h-3" />
                        Acknowledged
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!alert.acknowledged && !alert.dismissed && (
                    <>
                      <button
                        onClick={() => onAcknowledge(alert.id)}
                        className="p-1.5 rounded-md hover:bg-background/50 transition-colors"
                        title="Acknowledge"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDismiss(alert.id)}
                        className="p-1.5 rounded-md hover:bg-background/50 transition-colors"
                        title="Dismiss"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {alert.dismissed && (
                    <span className="text-xs text-muted-foreground">Dismissed</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
