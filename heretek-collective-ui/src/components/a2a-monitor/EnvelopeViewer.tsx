'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { A2AMessage } from '@/store/a2aStore'

interface EnvelopeViewerProps {
  envelope: A2AMessage
}

const typeColors: Record<string, 'info' | 'success' | 'warning' | 'danger'> = {
  query: 'info',
  response: 'success',
  decision: 'warning',
  error: 'danger',
}

export default function EnvelopeViewer({ envelope }: EnvelopeViewerProps) {
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  return (
    <div className="p-3 rounded-lg bg-gray-950/80 border border-cyan-900/30 hover:border-cyan-500/30 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Badge variant={typeColors[envelope.type] || 'info'}>
            {envelope.type}
          </Badge>
          <span className="text-xs text-gray-500 font-mono">
            {envelope.traceId}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500 font-mono">
          <span>{formatTime(envelope.timestamp)}</span>
          {envelope.latency && (
            <span className="text-cyan-400">{envelope.latency}ms</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs font-mono mb-2">
        <span className="text-cyan-400">{envelope.from}</span>
        <span className="text-gray-600">→</span>
        <span className="text-cyan-400">{envelope.to || 'broadcast'}</span>
      </div>

      <div className="text-sm text-cyan-100 font-mono bg-gray-900/50 rounded p-2 overflow-x-auto">
        {typeof envelope.content === 'string'
          ? envelope.content
          : JSON.stringify(envelope.content, null, 2)}
      </div>
    </div>
  )
}
