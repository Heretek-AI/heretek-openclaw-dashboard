import React from 'react';
import { Cpu, HardDrive, MemoryStick, Network } from 'lucide-react';
import type { ResourceMetrics } from '../hooks/useHealthData';

interface ResourceGraphsProps {
  resources: ResourceMetrics;
}

export function ResourceGraphs({ resources }: ResourceGraphsProps) {
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Resource Usage</h2>
      
      {/* System Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CPU */}
        <div className="p-4 rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-3">
            <Cpu className="w-5 h-5 text-primary" />
            <h3 className="font-medium">CPU</h3>
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-bold">{formatPercent(resources.cpu.system.usage)}</div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${Math.min(resources.cpu.system.usage, 100)}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              {resources.cpu.system.cores} cores | {resources.cpu.system.model}
            </div>
          </div>
        </div>

        {/* Memory */}
        <div className="p-4 rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-3">
            <MemoryStick className="w-5 h-5 text-primary" />
            <h3 className="font-medium">Memory</h3>
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-bold">{formatPercent(resources.memory.system.usage)}</div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${Math.min(resources.memory.system.usage, 100)}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              {formatBytes(resources.memory.system.used)} / {formatBytes(resources.memory.system.total)}
            </div>
          </div>
        </div>

        {/* Disk */}
        <div className="p-4 rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-3">
            <HardDrive className="w-5 h-5 text-primary" />
            <h3 className="font-medium">Disk</h3>
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-bold">{formatPercent(resources.disk.system.usage)}</div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  resources.disk.system.usage > 90 ? 'bg-red-500' :
                  resources.disk.system.usage > 80 ? 'bg-yellow-500' : 'bg-primary'
                }`}
                style={{ width: `${Math.min(resources.disk.system.usage, 100)}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              {formatBytes(resources.disk.system.used)} / {formatBytes(resources.disk.system.total)}
            </div>
          </div>
        </div>

        {/* Network */}
        <div className="p-4 rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-3">
            <Network className="w-5 h-5 text-primary" />
            <h3 className="font-medium">Network</h3>
          </div>
          <div className="space-y-2">
            <div className="text-sm">
              <div className="flex justify-between">
                <span className="text-green-500">↓ RX</span>
                <span>{formatBytes(resources.network.system.rxBytes)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-500">↑ TX</span>
                <span>{formatBytes(resources.network.system.txBytes)}</span>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              {resources.network.system.interfaces.length} interfaces
            </div>
          </div>
        </div>
      </div>

      {/* Per-Core CPU Usage */}
      {resources.cpu.system.perCore.length > 0 && (
        <div className="p-4 rounded-lg border border-border">
          <h3 className="font-medium mb-3">Per-Core CPU Usage</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
            {resources.cpu.system.perCore.map((core) => (
              <div key={core.name} className="text-center">
                <div className="text-xs text-muted-foreground mb-1">{core.name}</div>
                <div className="w-full bg-muted rounded-full h-3">
                  <div
                    className="bg-primary h-3 rounded-full transition-all"
                    style={{ width: `${Math.min(core.usage, 100)}%` }}
                  />
                </div>
                <div className="text-xs mt-1">{formatPercent(core.usage)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Container Resources */}
      {resources.containers && resources.containers.length > 0 && (
        <div className="p-4 rounded-lg border border-border">
          <h3 className="font-medium mb-3">Container Resources</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3">Container</th>
                  <th className="text-left py-2 px-3">CPU</th>
                  <th className="text-left py-2 px-3">Memory</th>
                  <th className="text-left py-2 px-3">Network</th>
                </tr>
              </thead>
              <tbody>
                {resources.containers.map((container) => (
                  <tr key={container.id} className="border-b border-border/50">
                    <td className="py-2 px-3 font-medium">{container.name}</td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{ width: `${Math.min(container.cpuUsage, 100)}%` }}
                          />
                        </div>
                        <span>{container.cpuUsage.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{ width: `${Math.min(container.memoryUsage.percent, 100)}%` }}
                          />
                        </div>
                        <span>{container.memoryUsage.percent.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-muted-foreground">
                      ↓ {formatBytes(container.networkIO.rx)} / ↑ {formatBytes(container.networkIO.tx)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Disk Partitions */}
      {resources.disk.system.partitions && resources.disk.system.partitions.length > 0 && (
        <div className="p-4 rounded-lg border border-border">
          <h3 className="font-medium mb-3">Disk Partitions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {resources.disk.system.partitions.slice(0, 6).map((partition) => (
              <div key={partition.mount} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{partition.mount}</span>
                  <span className={partition.usage > 80 ? 'text-yellow-500' : 'text-muted-foreground'}>
                    {formatPercent(partition.usage)}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      partition.usage > 90 ? 'bg-red-500' :
                      partition.usage > 80 ? 'bg-yellow-500' : 'bg-primary'
                    }`}
                    style={{ width: `${Math.min(partition.usage, 100)}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  {partition.used} / {partition.size}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
