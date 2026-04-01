import React from 'react';
import { Activity } from 'lucide-react';
import type { HealthData } from '../hooks/useHealthData';

interface SkillPluginTrackerProps {
  data: HealthData;
}

export function SkillPluginTracker({ data }: SkillPluginTrackerProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Skills & Plugins</h2>
      <div className="p-8 text-center text-muted-foreground border border-border rounded-lg">
        <Activity className="w-12 h-12 mx-auto mb-2 text-primary" />
        <p>Skill and plugin tracking coming soon</p>
        <p className="text-sm mt-2">Track which agents use which skills, plugins, and MCP servers</p>
      </div>
    </div>
  );
}
