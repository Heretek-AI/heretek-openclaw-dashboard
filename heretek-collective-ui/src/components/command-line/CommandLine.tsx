'use client'

import React, { useState, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useA2AStore } from '@/store/a2aStore'

export default function CommandLine() {
  const [input, setInput] = useState('')
  const [isBroadcasting, setIsBroadcasting] = useState(false)
  const { broadcastToCollective } = useA2AStore()

  const handleBroadcast = useCallback(async () => {
    if (!input.trim()) return
    setIsBroadcasting(true)
    try {
      await broadcastToCollective(input)
      setInput('')
    } finally {
      setIsBroadcasting(false)
    }
  }, [input, broadcastToCollective])

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleBroadcast()
      }
    },
    [handleBroadcast]
  )

  return (
    <Card
      title="📢 Collective Broadcast"
      description="Send a message to the Global Workspace. The Triad will deliberate and respond autonomously."
    >
      {/* Input */}
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder="Type your broadcast message... (Enter to send)"
        rows={4}
        className="w-full cyber-input resize-none mb-4"
      />

      {/* Send Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleBroadcast}
          disabled={isBroadcasting || !input.trim()}
          className="flex items-center gap-2"
        >
          {isBroadcasting ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Broadcasting...
            </>
          ) : (
            <>
              🦞 Broadcast to Collective
            </>
          )}
        </Button>
      </div>
    </Card>
  )
}
