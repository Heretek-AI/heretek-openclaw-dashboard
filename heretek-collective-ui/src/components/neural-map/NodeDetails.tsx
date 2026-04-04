'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAgentStore } from '@/store/agentStore'

interface NodeDetailsProps {
  nodeId: string
  onClose: () => void
}

export default function NodeDetails({ nodeId, onClose }: NodeDetailsProps) {
  const { agents, updateAgent } = useAgentStore()
  const agent = agents.find((a) => a.id === nodeId)

  if (!agent) return null

  return (
    <div className="absolute top-4 right-4 z-20 w-80">
      <Card className="cyber-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-mono text-cyan-400">{agent.name}</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>

        <div className="space-y-3 text-sm font-mono">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Status:</span>
            <Badge
              variant={
                agent.status === 'online' ? 'success' :
                agent.status === 'debating' ? 'warning' :
                agent.status === 'offline' ? 'danger' : 'default'
              }
            >
              {agent.status}
            </Badge>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-400">Model:</span>
            <span className="text-cyan-100">{agent.model}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-400">Memory:</span>
            <span className="text-cyan-100">{agent.memoryUsage || 'N/A'}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-400">Last Active:</span>
            <span className="text-cyan-100">{agent.lastActive || 'N/A'}</span>
          </div>

          {agent.websocketReadyState !== undefined && (
            <div className="flex justify-between">
              <span className="text-gray-400">WebSocket:</span>
              <span className="text-cyan-100">
                {agent.websocketReadyState === 1 ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-cyan-900/30 flex gap-2">
          <Button variant="primary" size="sm" className="flex-1">
            View Logs
          </Button>
          <Button variant="secondary" size="sm" className="flex-1">
            Configure
          </Button>
        </div>
      </Card>
    </div>
  )
}
