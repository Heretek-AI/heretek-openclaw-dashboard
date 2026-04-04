'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { useMemoryStore } from '@/store/memoryStore'

export default function MemoryStats() {
  const { stats } = useMemoryStore()

  if (!stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="cyber-card p-4 animate-pulse">
            <div className="h-4 w-20 bg-gray-800 rounded mb-2" />
            <div className="h-8 w-16 bg-gray-800 rounded" />
          </div>
        ))}
      </div>
    )
  }

  const statCards = [
    { label: 'Total Memories', value: stats.totalMemories, icon: '💾' },
    { label: 'Episodic', value: stats.episodicCount, icon: '📅' },
    { label: 'Semantic', value: stats.semanticCount, icon: '🧠' },
    { label: 'Shared', value: stats.sharedCount, icon: '🌐' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statCards.map(({ label, value, icon }) => (
        <div key={label} className="cyber-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">{icon}</span>
            <span className="text-xs text-gray-500 font-mono">{label}</span>
          </div>
          <div className="text-2xl font-mono text-cyan-400 text-glow">
            {value.toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  )
}
