'use client'

import React, { useEffect, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { useA2AStore } from '@/store/a2aStore'
import EnvelopeViewer from './EnvelopeViewer'

export default function A2AStream() {
  const { a2aMessages, subscribeToStream, unsubscribeFromStream } = useA2AStore()
  const streamRef = useRef<EventSource | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Connect to SSE stream
    const eventSource = new EventSource('/api/a2a/stream')
    subscribeToStream(eventSource)

    return () => {
      unsubscribeFromStream()
      eventSource.close()
    }
  }, [subscribeToStream, unsubscribeFromStream])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [a2aMessages])

  return (
    <Card title="Internal Monologue — Live">
      <div className="h-[600px] overflow-hidden flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm text-gray-400 font-mono">Connected</span>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto space-y-2 font-mono text-sm">
          {a2aMessages.map((msg, index) => (
            <EnvelopeViewer key={`${msg.traceId}-${index}`} envelope={msg} />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>
    </Card>
  )
}
