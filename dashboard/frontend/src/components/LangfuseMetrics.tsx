import React from 'react';
import { Activity, TrendingUp, DollarSign, Clock } from 'lucide-react';
import type { HealthData } from '../hooks/useHealthData';

interface LangfuseMetricsProps {
  data: HealthData;
}

export function LangfuseMetrics({ data }: LangfuseMetricsProps) {
  // Placeholder for Langfuse metrics display
  // In production, this would fetch data from Langfuse API
  const langfuseService = data.services.find(s => s.id === 'langfuse');
  
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Langfuse Observability</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5 text-primary" />
            <h3 className="font-medium">Status</h3>
          </div>
          <div className={`text-2xl font-bold capitalize ${
            langfuseService?.status === 'healthy' ? 'text-green-500' : 'text-red-500'
          }`}>
            {langfuseService?.status || 'Unknown'}
          </div>
        </div>

        <div className="p-4 rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h3 className="font-medium">Traces</h3>
          </div>
          <div className="text-2xl font-bold">
            {langfuseService?.details?.totalTraces || 'N/A'}
          </div>
        </div>

        <div className="p-4 rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-primary" />
            <h3 className="font-medium">Response Time</h3>
          </div>
          <div className="text-2xl font-bold">
            {langfuseService?.responseTime || 'N/A'}ms
          </div>
        </div>

        <div className="p-4 rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-primary" />
            <h3 className="font-medium">Cost Tracking</h3>
          </div>
          <div className="text-2xl font-bold">
            Via LiteLLM
          </div>
        </div>
      </div>

      <div className="p-4 rounded-lg border border-border">
        <h3 className="font-medium mb-2">Langfuse Dashboard</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Access the full Langfuse dashboard for detailed trace analysis, cost tracking, and LLM observability.
        </p>
        <a
          href="http://localhost:3000"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Open Langfuse
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </div>
  );
}
