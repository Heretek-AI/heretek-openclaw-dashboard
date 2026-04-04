'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Memory } from '@/store/memoryStore'

interface MemoryResultsProps {
  results: Memory[]
}

export default function MemoryResults({ results }: MemoryResultsProps) {
  const getTypeBadge = (type: Memory['type']) => {
    switch (type) {
      case 'episodic':
        return { variant: 'info' as const, icon: '📅' }
      case 'semantic':
        return { variant: 'success' as const, icon: '🧠' }
      case 'shared':
        return { variant: 'warning' as const, icon: '🌐' }
    }
  }

  return (
    <Card
      title="Search Results"
      description={`${results.length} memories found`}
    >
      <div className="space-y-3">
        {results.map((memory) => {
          const badge = getTypeBadge(memory.type)
          return (
            <div
              key={memory.id}
              className="p-4 rounded-lg bg-gray-950/50 border border-cyan-900/30 hover:border-cyan-500/30 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant={badge.variant}>
                    <span className="mr-1">{badge.icon}</span>
                    {memory.type}
                  </Badge>
                  {memory.pinned && (
                    <Badge variant="info">📌 Pinned</Badge>
                  )}
                </div>
                <div className="text-xs text-gray-500 font-mono">
                  Score: {((memory.score || 0) * 100).toFixed(1)}%
                </div>
              </div>

              <p className="text-cyan-100 font-mono text-sm mb-2 line-clamp-3">
                {memory.content}
              </p>

              <div className="flex items-center justify-between text-xs text-gray-500 font-mono">
                <span>
                  Created: {new Date(memory.createdAt).toLocaleString()}
                </span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm">
                    View
                  </Button>
                  <Button variant="ghost" size="sm">
                    {memory.pinned ? 'Unpin' : 'Pin'}
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
