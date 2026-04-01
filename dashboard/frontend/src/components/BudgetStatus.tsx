import React, { useMemo } from 'react';
import { Wallet, AlertTriangle, TrendingDown, Shield } from 'lucide-react';
import { 
  useLiteLLMData, 
  formatCurrency, 
  getBudgetStatusColor 
} from '../hooks/useLiteLLMData';

interface BudgetStatusProps {
  pollInterval?: number;
}

export function BudgetStatus({ pollInterval }: BudgetStatusProps) {
  const { data } = useLiteLLMData(pollInterval);

  const budgetStatus = useMemo(() => {
    return data?.budgets || {
      budgets: [],
      alerts: [],
      totalBudget: 0,
      totalSpent: 0,
      utilizationPercent: 0
    };
  }, [data?.budgets]);

  const healthyBudgets = budgetStatus.budgets.filter(b => b.status === 'healthy').length;
  const warningBudgets = budgetStatus.budgets.filter(b => b.status === 'warning').length;
  const exceededBudgets = budgetStatus.budgets.filter(b => b.status === 'exceeded').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Budget Status</h2>
        <Wallet className="w-5 h-5 text-primary" />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-5 h-5 text-primary" />
            <h3 className="font-medium">Total Budget</h3>
          </div>
          <div className="text-2xl font-bold">
            {formatCurrency(budgetStatus.totalBudget)}
          </div>
        </div>

        <div className="p-4 rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-5 h-5 text-red-500" />
            <h3 className="font-medium">Total Spent</h3>
          </div>
          <div className="text-2xl font-bold text-red-500">
            {formatCurrency(budgetStatus.totalSpent)}
          </div>
        </div>

        <div className="p-4 rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-green-500" />
            <h3 className="font-medium">Healthy</h3>
          </div>
          <div className="text-2xl font-bold text-green-500">
            {healthyBudgets}
          </div>
        </div>

        <div className="p-4 rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            <h3 className="font-medium">At Risk</h3>
          </div>
          <div className="text-2xl font-bold text-yellow-500">
            {warningBudgets + exceededBudgets}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {warningBudgets} warning, {exceededBudgets} exceeded
          </p>
        </div>
      </div>

      {/* Overall Utilization */}
      {budgetStatus.totalBudget > 0 && (
        <div className="p-4 rounded-lg border border-border">
          <h3 className="font-medium mb-3">Overall Budget Utilization</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  budgetStatus.utilizationPercent >= 100 ? 'bg-red-500' :
                  budgetStatus.utilizationPercent >= 80 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(budgetStatus.utilizationPercent, 100)}%` }}
              />
            </div>
            <span className="font-mono font-medium min-w-[80px] text-right">
              {budgetStatus.utilizationPercent.toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between mt-2 text-sm text-muted-foreground">
            <span>Remaining: {formatCurrency(budgetStatus.totalBudget - budgetStatus.totalSpent)}</span>
            <span>Spent: {formatCurrency(budgetStatus.totalSpent)}</span>
          </div>
        </div>
      )}

      {/* Individual Budgets */}
      <div className="p-4 rounded-lg border border-border">
        <h3 className="font-medium mb-4">Budget Details</h3>
        
        {budgetStatus.budgets.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No budgets configured
          </p>
        ) : (
          <div className="space-y-4">
            {budgetStatus.budgets.map((budget, index) => (
              <div key={index} className="p-3 rounded border border-border/50">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium">
                      {budget.key || budget.user || 'Unnamed Budget'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {budget.key ? 'API Key' : 'User'} budget
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getBudgetStatusColor(budget.status)}`}>
                    {budget.status.toUpperCase()}
                  </span>
                </div>
                
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">
                    {formatCurrency(budget.spent)} / {formatCurrency(budget.maxBudget)}
                  </span>
                  <span className="text-sm font-mono">
                    {budget.utilization.toFixed(1)}%
                  </span>
                </div>
                
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      budget.status === 'exceeded' ? 'bg-red-500' :
                      budget.status === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(budget.utilization, 100)}%` }}
                  />
                </div>
                
                {budget.remaining > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Remaining: {formatCurrency(budget.remaining)}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Alerts Section */}
      {budgetStatus.alerts && budgetStatus.alerts.length > 0 && (
        <div className="p-4 rounded-lg border border-red-500/50 bg-red-50 dark:bg-red-900/10">
          <div className="flex items-center gap-2 mb-3 text-red-600 dark:text-red-400">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="font-medium">Active Alerts</h3>
          </div>
          <ul className="space-y-2">
            {budgetStatus.alerts.map((alert, index) => (
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
    </div>
  );
}
