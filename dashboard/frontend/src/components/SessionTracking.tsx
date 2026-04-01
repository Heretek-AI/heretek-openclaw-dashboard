import React from 'react';
import { Users, Clock, Activity } from 'lucide-react';
import type { HealthData } from '../hooks/useHealthData';

interface SessionTrackingProps {
  data: HealthData;
}

export function SessionTracking({ data }: SessionTrackingProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Session Tracking</h2>
      <div className="p-8 text-center text-muted-foreground border border-border rounded-lg">
        <Users className="w-12 h-12 mx-auto mb-2 text-primary" />
        <p>Session tracking data coming soon</p>
        <p className="text-sm mt-2">Monitor active sessions, session duration, and user activity</p>
      </div>
    </div>
  );
}
