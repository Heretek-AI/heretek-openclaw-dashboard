import React, { useMemo } from 'react';
import { BarChart3, TrendingUp, Zap } from 'lucide-react';
import { useLiteLLMData, formatCurrency, formatTokens } from '../hooks/useLiteLLMData';

interface ModelUsageProps {
  pollInterval?: number;
}

interface ModelData {
  name: string;
  cost: number;
  percentage: number;
}

export function ModelUsage({ pollInterval }: ModelUsageProps) {
  const { data } = useLiteLLMData(pollInterval);

  const modelData: ModelData[] = useMemo(() => {
    if (!data?.costByModel) return [];
    
    const total = Object.values(data.costByModel).reduce((sum, val) => sum + val, 0);
    
    return Object.entries(data.costByModel)
      .map(([name, cost]) => ({
        name,
        cost,
        percentage: total > 0 ? (cost / total) * 100 : 0
      }))
      .sort((a, b) => b.cost - a.cost);
  }, [data?.costByModel]);

  const topModel = modelData[0];
  const totalCost = modelData.reduce((sum, m) => sum + m.cost, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Model Usage Analytics</h2>
        <BarChart3 className="w-5 h-5 text-primary" />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h3 className="font-medium">Total Spend</h3>
          </div>
          <div className="text-2xl font-bold">
            {formatCurrency(totalCost)}
          </div>
        </div>

        <div className="p-4 rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5 text-primary" />
            <h3 className="font-medium">Top Model</h3>
          </div>
          <div className="text-lg font-bold truncate" title={topModel?.name}>
            {topModel?.name || 'N/A'}
          </div>
          <p className="text-sm text-muted-foreground">
            {topModel?.percentage.toFixed(1)}% of total
          </p>
        </div>

        <div className="p-4 rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h3 className="font-medium">Active Models</h3>
          </div>
          <div className="text-2xl font-bold">
            {modelData.length}
          </div>
        </div>
      </div>

      {/* Model Cost Breakdown */}
      <div className="p-4 rounded-lg border border-border">
        <h3 className="font-medium mb-4">Cost by Model</h3>
        
        {modelData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No model usage data available
          </p>
        ) : (
          <div className="space-y-3">
            {modelData.map((model) => (
              <div key={model.name} className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{model.name}</span>
                  <span className="text-sm font-mono">
                    {formatCurrency(model.cost)} ({model.percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${model.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Token Usage by Model */}
      <div className="p-4 rounded-lg border border-border">
        <h3 className="font-medium mb-4">Token Usage Summary</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-sm text-muted-foreground">Total Tokens</p>
            <p className="text-xl font-bold font-mono">
              {formatTokens(data?.tokens.total || 0)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Input Tokens</p>
            <p className="text-xl font-bold font-mono text-blue-500">
              {formatTokens(data?.tokens.input || 0)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Output Tokens</p>
            <p className="text-xl font-bold font-mono text-green-500">
              {formatTokens(data?.tokens.output || 0)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
