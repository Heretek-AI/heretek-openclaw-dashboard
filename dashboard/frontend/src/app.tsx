import React, { useState } from 'react';
import { useHealthData } from './hooks/useHealthData';
import { AgentStatus } from './components/AgentStatus';
import { ServiceStatus } from './components/ServiceStatus';
import { ResourceGraphs } from './components/ResourceGraphs';
import { AlertPanel } from './components/AlertPanel';
import { LangfuseMetrics } from './components/LangfuseMetrics';
import { SessionTracking } from './components/SessionTracking';
import { A2ACommunication } from './components/A2ACommunication';
import { CronJobs } from './components/CronJobs';
import { MemoryExplorer } from './components/MemoryExplorer';
import { DeliberationTracking } from './components/DeliberationTracking';
import { SkillPluginTracker } from './components/SkillPluginTracker';
import { Header } from './components/Header';
import { Activity, AlertTriangle, CheckCircle, Clock, RefreshCw, Server, Users } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'agents' | 'services' | 'resources' | 'alerts' | 'langfuse' | 'sessions' | 'a2a' | 'cron' | 'memory' | 'deliberation' | 'skills'>('overview');
  
  const { data, loading, error, connected, refresh, acknowledgeAlert, dismissAlert } = useHealthData({
    apiUrl: '/api/health',
    websocketUrl: `ws://${window.location.host}/ws`,
    refreshInterval: 5000,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'active':
        return 'text-green-500';
      case 'warning':
      case 'degraded':
      case 'idle':
        return 'text-yellow-500';
      case 'critical':
      case 'error':
      case 'offline':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'active':
        return 'bg-green-500/20 border-green-500/50';
      case 'warning':
      case 'degraded':
      case 'idle':
        return 'bg-yellow-500/20 border-yellow-500/50';
      case 'critical':
      case 'error':
      case 'offline':
        return 'bg-red-500/20 border-red-500/50';
      default:
        return 'bg-gray-500/20 border-gray-500/50';
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'agents', label: 'Agents', icon: Users },
    { id: 'services', label: 'Services', icon: Server },
    { id: 'resources', label: 'Resources', icon: Activity },
    { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
    { id: 'langfuse', label: 'Langfuse', icon: Activity },
    { id: 'sessions', label: 'Sessions', icon: Users },
    { id: 'a2a', label: 'A2A', icon: Activity },
    { id: 'cron', label: 'Cron Jobs', icon: Clock },
    { id: 'memory', label: 'Memory', icon: Activity },
    { id: 'deliberation', label: 'Deliberation', icon: Activity },
    { id: 'skills', label: 'Skills/Plugins', icon: Activity },
  ];

  if (error && !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Error Loading Dashboard</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header
        data={data}
        loading={loading}
        connected={connected}
        onRefresh={refresh}
      />

      {/* Navigation Tabs */}
      <nav className="border-b border-border bg-card">
        <div className="container mx-auto px-4">
          <div className="flex overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {loading && !data && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Loading health data...</span>
          </div>
        )}

        {activeTab === 'overview' && data && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className={`p-4 rounded-lg border ${getStatusBg(data.summary.overallStatus)}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Overall Status</p>
                    <p className="text-2xl font-bold capitalize">{data.summary.overallStatus}</p>
                  </div>
                  <CheckCircle className={`w-8 h-8 ${getStatusColor(data.summary.overallStatus)}`} />
                </div>
              </div>

              <div className="p-4 rounded-lg border border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Agents</p>
                    <p className="text-2xl font-bold">{data.summary.healthyAgents}/{data.summary.totalAgents}</p>
                  </div>
                  <Users className="w-8 h-8 text-primary" />
                </div>
              </div>

              <div className="p-4 rounded-lg border border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Services</p>
                    <p className="text-2xl font-bold">{data.summary.healthyServices}/{data.summary.totalServices}</p>
                  </div>
                  <Server className="w-8 h-8 text-primary" />
                </div>
              </div>

              <div className="p-4 rounded-lg border border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Alerts</p>
                    <p className="text-2xl font-bold">
                      <span className="text-red-500">{data.summary.criticalAlerts}</span>
                      <span className="text-muted-foreground"> / </span>
                      <span className="text-yellow-500">{data.summary.warningAlerts}</span>
                    </p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-yellow-500" />
                </div>
              </div>
            </div>

            {/* Agent Status Grid */}
            <AgentStatus agents={data.agents} />

            {/* Service Status Grid */}
            <ServiceStatus services={data.services} />

            {/* Resource Graphs */}
            <ResourceGraphs resources={data.resources} />

            {/* Recent Alerts */}
            <AlertPanel
              alerts={data.alerts.slice(0, 5)}
              onAcknowledge={acknowledgeAlert}
              onDismiss={dismissAlert}
            />
          </div>
        )}

        {activeTab === 'agents' && data && (
          <AgentStatus agents={data.agents} />
        )}

        {activeTab === 'services' && data && (
          <ServiceStatus services={data.services} />
        )}

        {activeTab === 'resources' && data && (
          <ResourceGraphs resources={data.resources} />
        )}

        {activeTab === 'alerts' && data && (
          <AlertPanel
            alerts={data.alerts}
            onAcknowledge={acknowledgeAlert}
            onDismiss={dismissAlert}
          />
        )}

        {activeTab === 'langfuse' && data && (
          <LangfuseMetrics data={data} />
        )}

        {activeTab === 'sessions' && data && (
          <SessionTracking data={data} />
        )}

        {activeTab === 'a2a' && data && (
          <A2ACommunication data={data} />
        )}

        {activeTab === 'cron' && data && (
          <CronJobs data={data} />
        )}

        {activeTab === 'memory' && data && (
          <MemoryExplorer data={data} />
        )}

        {activeTab === 'deliberation' && data && (
          <DeliberationTracking data={data} />
        )}

        {activeTab === 'skills' && data && (
          <SkillPluginTracker data={data} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-8 py-4">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Heretek OpenClaw Health Dashboard v1.0.0 | Last updated: {data?.timestamp ? new Date(data.timestamp).toLocaleString() : 'N/A'}</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
