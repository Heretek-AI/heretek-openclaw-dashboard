import React from 'react';
import { Activity } from 'lucide-react';
import type { HealthData } from '../hooks/useHealthData';

interface DeliberationTrackingProps {
  data: HealthData;
}

export function DeliberationTracking({ data }: DeliberationTrackingProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Deliberation Tracking</h2>
      <div className="p-8 text-center text-muted-foreground border border-border rounded-lg">
        <Activity className="w-12 h-12 mx-auto mb-2 text-primary" />
        <p>Deliberation tracking coming soon</p>
        <p className="text-sm mt-2">Monitor triad deliberations, consensus building, and decision history</p>
      </div>
    </div>
  );
}
