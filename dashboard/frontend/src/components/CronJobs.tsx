import React from 'react';
import { Clock } from 'lucide-react';
import type { HealthData } from '../hooks/useHealthData';

interface CronJobsProps {
  data: HealthData;
}

export function CronJobs({ data }: CronJobsProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Cron Jobs</h2>
      <div className="p-8 text-center text-muted-foreground border border-border rounded-lg">
        <Clock className="w-12 h-12 mx-auto mb-2 text-primary" />
        <p>Cron job monitoring coming soon</p>
        <p className="text-sm mt-2">Track scheduled jobs, execution history, and failures</p>
      </div>
    </div>
  );
}
