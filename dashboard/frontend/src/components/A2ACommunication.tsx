import React from 'react';
import { Activity } from 'lucide-react';
import type { HealthData } from '../hooks/useHealthData';

interface A2ACommunicationProps {
  data: HealthData;
}

export function A2ACommunication({ data }: A2ACommunicationProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">A2A Communication</h2>
      <div className="p-8 text-center text-muted-foreground border border-border rounded-lg">
        <Activity className="w-12 h-12 mx-auto mb-2 text-primary" />
        <p>A2A communication tracking coming soon</p>
        <p className="text-sm mt-2">Monitor agent-to-agent messages, deliberations, and consensus tracking</p>
      </div>
    </div>
  );
}
