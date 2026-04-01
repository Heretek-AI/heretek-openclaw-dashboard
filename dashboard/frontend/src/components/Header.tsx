import React from 'react';
import { Activity, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import type { HealthData } from '../hooks/useHealthData';

interface HeaderProps {
  data: HealthData | null;
  loading: boolean;
  connected: boolean;
  onRefresh: () => void;
}

export function Header({ data, loading, connected, onRefresh }: HeaderProps) {
  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Activity className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">OpenClaw Health Dashboard</h1>
              <p className="text-sm text-muted-foreground">Heretek OpenClaw Monitoring System</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Connection Status */}
            <div className="flex items-center gap-2 text-sm">
              {connected ? (
                <>
                  <Wifi className="w-4 h-4 text-green-500" />
                  <span className="text-green-500">Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-yellow-500" />
                  <span className="text-yellow-500">Polling</span>
                </>
              )}
            </div>

            {/* Last Updated */}
            {data && (
              <div className="text-sm text-muted-foreground">
                Last updated: {new Date(data.timestamp).toLocaleTimeString()}
              </div>
            )}

            {/* Refresh Button */}
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Status Bar */}
        {data && (
          <div className="mt-4 flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span className="text-muted-foreground">Healthy: {data.summary.healthyAgents}/{data.summary.totalAgents} agents</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span className="text-muted-foreground">Services: {data.summary.healthyServices}/{data.summary.totalServices}</span>
            </div>
            {data.summary.criticalAlerts > 0 && (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                <span className="text-red-500">{data.summary.criticalAlerts} critical</span>
              </div>
            )}
            {data.summary.warningAlerts > 0 && (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                <span className="text-yellow-500">{data.summary.warningAlerts} warning</span>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
