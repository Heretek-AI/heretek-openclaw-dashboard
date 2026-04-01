import React from 'react';
import { DollarSign, TrendingUp, Clock, Activity, AlertTriangle, CheckCircle } from 'lucide-react';
import { 
  useLiteLLMData, 
  formatCurrency, 
  formatTokens, 
  formatLatency,
  getBudgetStatusColor 
} from '../hooks/useLiteLLMData';

interface LiteLLMMetricsProps {
  pollInterval?: number;
}

export function LiteLLMMetrics({ pollInterval }: LiteLLMMetricsProps) {
  const { data, isLoading, error, lastUpdated, refresh } = useLiteLLMData(pollInterval);

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3 text-muted-foreground">Loading LiteLLM metrics...</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-4 rounded-lg border border-red-500 bg-red-50 dark:bg-red-900/20">
        <div className="flex items-center gap-2 text-red-500">
          <AlertTriangle className="w-5 h-5" />
          <span className="font-medium">Failed to load LiteLLM metrics</span>
        </div>
        <p className="text-sm text-red-400 mt-2">{error}</p>
        <button
          onClick={refresh}
          className="mt-3 px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
        >
          Retry
        </button>
      </div>
    );
  }

  const spend = data?.spend || { total: 0, today: 0, thisWeek: 0, thisMonth: 0 };
  const tokens = data?.tokens || { total: 0, input: 0, output: 0 };
  const latency = data?.latency || { p50: 0, p95: 0, p99: 0 };
  const requests = data?.requests || { total: 0, successful: 0, failed: 0 };
  const budgets = data?.budgets || { alerts: [] };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">LiteLLM Gateway Metrics</h2>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'Never'}</span>
          <button
            onClick={refresh}
            className="px-2 py-1 text-xs bg-primary/10 text-primary rounded hover:bg-primary/20"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Spend Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={DollarSign}
          title="Today's Spend"
          value={formatCurrency(spend.today)}
          trend={spend.today > 0 ? 'positive' : 'neutral'}
        />
        <MetricCard
          icon={DollarSign}
          title="This Week"
          value={formatCurrency(spend.thisWeek)}
          trend="neutral"
        />
        <MetricCard
          icon={DollarSign}
          title="This Month"
          value={formatCurrency(spend.thisMonth)}
          trend="neutral"
        />
        <MetricCard
          icon={TrendingUp}
          title="Total Tokens"
          value={formatTokens(tokens.total)}
          subValue={`${formatTokens(tokens.input)} in / ${formatTokens(tokens.output)} out`}
          trend="neutral"
        />
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-primary" />
            <h3 className="font-medium">Latency Percentiles</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">P50</span>
              <span className="font-mono">{formatLatency(latency.p50)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">P95</span>
              <span className="font-mono">{formatLatency(latency.p95)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">P99</span>
              <span className="font-mono">{formatLatency(latency.p99)}</span>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-5 h-5 text-primary" />
            <h3 className="font-medium">Request Statistics</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="font-mono">{requests.total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-green-500">
              <span className="text-sm">Successful</span>
              <span className="font-mono">{requests.successful.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-red-500">
              <span className="text-sm">Failed</span>
              <span className="font-mono">{requests.failed.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-primary" />
            <h3 className="font-medium">Gateway Health</h3>
          </div>
          <div className={`text-2xl font-bold capitalize ${
            data?.health?.status === 'healthy' ? 'text-green-500' : 'text-red-500'
          }`}>
            {data?.health?.status || 'Unknown'}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Success Rate: {requests.total > 0 
              ? ((requests.successful / requests.total) * 100).toFixed(1) 
              : 0}%
          </p>
        </div>
      </div>

      {/* Budget Alerts */}
      {budgets.alerts && budgets.alerts.length > 0 && (
        <div className="p-4 rounded-lg border border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
          <div className="flex items-center gap-2 mb-3 text-yellow-600 dark:text-yellow-400">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="font-medium">Budget Alerts</h3>
          </div>
          <ul className="space-y-2">
            {budgets.alerts.map((alert, index) => (
              <li key={index} className="text-sm">
                <span className={`font-medium ${
                  alert.severity === 'critical' ? 'text-red-500' : 'text-yellow-500'
                }`}>
                  [{alert.severity.toUpperCase()}]
                </span>
                {' '}{alert.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Budget Utilization */}
      {budgets.totalBudget > 0 && (
        <div className="p-4 rounded-lg border border-border">
          <h3 className="font-medium mb-3">Overall Budget Utilization</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  budgets.utilizationPercent >= 100 ? 'bg-red-500' :
                  budgets.utilizationPercent >= 80 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(budgets.utilizationPercent, 100)}%` }}
              />
            </div>
            <span className="font-mono font-medium">
              {formatCurrency(budgets.totalSpent)} / {formatCurrency(budgets.totalBudget)}
              {' '}({budgets.utilizationPercent.toFixed(1)}%)
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

interface MetricCardProps {
  icon: React.ElementType;
  title: string;
  value: string;
  subValue?: string;
  trend?: 'positive' | 'negative' | 'neutral';
}

function MetricCard({ icon: Icon, title, value, subValue, trend = 'neutral' }: MetricCardProps) {
  return (
    <div className="p-4 rounded-lg border border-border">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-5 h-5 text-primary" />
        <h3 className="font-medium">{title}</h3>
      </div>
      <div className={`text-2xl font-bold ${
        trend === 'positive' ? 'text-green-500' :
        trend === 'negative' ? 'text-red-500' : ''
      }`}>
        {value}
      </div>
      {subValue && (
        <p className="text-sm text-muted-foreground mt-1">{subValue}</p>
      )}
    </div>
  );
}
