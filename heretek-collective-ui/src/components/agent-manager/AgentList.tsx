'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useAgentStore } from '@/store/agentStore'

const statusColors: Record<string, 'success' | 'danger' | 'warning' | 'default'> = {
  online: 'success',
  offline: 'danger',
  debating: 'warning',
  idle: 'default',
}

export default function AgentList() {
  const { agents, isLoading, error, deployAgent } = useAgentStore()

  if (isLoading) {
    return (
      <Card title="Agent Registry" description="Loading agents...">
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card title="Agent Registry">
        <div className="text-red-400 font-mono text-sm">
          Error: {error}
        </div>
      </Card>
    )
  }

  return (
    <Card 
      title="Agent Registry" 
      description={`${agents.length} agents registered`}
    >
      <div className="space-y-3">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="flex items-center justify-between p-4 rounded-lg bg-gray-950/50 border border-cyan-900/30 hover:border-cyan-500/30 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center">
                <span className="text-xl">🤖</span>
              </div>
              <div>
                <h4 className="font-mono text-cyan-100">{agent.name}</h4>
                <p className="text-xs text-gray-500 font-mono">{agent.model}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Badge variant={statusColors[agent.status] || 'default'}>
                {agent.status}
              </Badge>
              
              <div className="text-xs text-gray-500 font-mono text-right">
                <div>Memory: {agent.memoryUsage || 'N/A'}</div>
                <div>Last: {agent.lastActive || 'N/A'}</div>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => deployAgent(agent.id)}
                disabled={agent.status === 'online'}
              >
                {agent.status === 'online' ? 'Running' : 'Deploy'}
              </Button>
            </div>
          </div>
        ))}

        {agents.length === 0 && (
          <div className="text-center py-8 text-gray-500 font-mono">
            No agents registered. Deploy your first agent to get started.
          </div>
        )}
      </div>
    </Card>
  )
}
