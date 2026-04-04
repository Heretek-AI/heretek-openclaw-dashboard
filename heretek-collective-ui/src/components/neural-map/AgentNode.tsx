'use client'

import React, { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { Badge } from '@/components/ui/badge'

const statusColors: Record<string, string> = {
  online: 'bg-green-500',
  offline: 'bg-red-500',
  debating: 'bg-yellow-500',
  idle: 'bg-gray-500',
}

function AgentNode({ data, selected }: NodeProps) {
  return (
    <div
      className={`
        px-4 py-3 rounded-lg border-2 
        ${selected ? 'border-cyan-400 shadow-lg shadow-cyan-500/50' : 'border-cyan-800'}
        bg-gray-900/90 backdrop-blur-sm
        min-w-[180px]
      `}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-cyan-600 !border-cyan-400"
      />

      {/* Agent Name */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-cyan-400 font-bold">{data.label}</span>
        <Badge
          className={`
            ${statusColors[data.status as keyof typeof statusColors] || statusColors.idle}
            text-white text-xs px-2 py-0.5 rounded-full
          `}
        >
          {data.status}
        </Badge>
      </div>

      {/* Model */}
      <div className="text-xs text-gray-400 font-mono mb-1">
        {data.model}
      </div>

      {/* Memory Usage */}
      <div className="text-xs text-gray-400 font-mono">
        Memory: {data.memoryUsage || 'N/A'}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-cyan-600 !border-cyan-400"
      />
    </div>
  )
}

export default memo(AgentNode)
