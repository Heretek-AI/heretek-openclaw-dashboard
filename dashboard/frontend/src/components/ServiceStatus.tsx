import React from 'react';
import { Server, Database, Cache, Activity, AlertCircle } from 'lucide-react';
import type { ServiceHealth } from '../hooks/useHealthData';

interface ServiceStatusProps {
  services: ServiceHealth[];
}

export function ServiceStatus({ services }: ServiceStatusProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-500 bg-green-500/20 border-green-500/50';
      case 'degraded':
        return 'text-yellow-500 bg-yellow-500/20 border-yellow-500/50';
      case 'error':
        return 'text-red-500 bg-red-500/20 border-red-500/50';
      default:
        return 'text-gray-500 bg-gray-500/20 border-gray-500/50';
    }
  };

  const getServiceIcon = (type: string) => {
    switch (type) {
      case 'postgres':
        return <Database className="w-6 h-6" />;
      case 'redis':
        return <Cache className="w-6 h-6" />;
      case 'litellm':
      case 'http':
        return <Server className="w-6 h-6" />;
      default:
        return <Activity className="w-6 h-6" />;
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Service Status</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((service) => (
          <div
            key={service.id}
            className={`p-4 rounded-lg border card-hover ${getStatusColor(service.status)}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-background/50">
                  {getServiceIcon(service.type)}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{service.name}</h3>
                  <p className="text-xs text-muted-foreground capitalize">{service.type}</p>
                </div>
              </div>
              <span className="px-2 py-1 rounded-full text-xs font-medium capitalize">
                {service.status}
              </span>
            </div>

            <div className="space-y-2 text-sm">
              {service.responseTime !== null && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Activity className="w-3 h-3" />
                  <span>Response: {service.responseTime}ms</span>
                </div>
              )}

              {service.details && Object.entries(service.details).map(([key, value]) => (
                <div key={key} className="text-muted-foreground">
                  {key}: {String(value)}
                </div>
              ))}

              {service.error && (
                <div className="flex items-center gap-2 text-red-400 text-xs mt-2">
                  <AlertCircle className="w-3 h-3" />
                  <span>{service.error}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
