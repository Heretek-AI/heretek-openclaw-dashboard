'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'

type MemoryType = 'episodic' | 'semantic' | 'shared'

interface FilterBarProps {
  currentType: MemoryType
  onChange: (type: MemoryType) => void
}

export default function FilterBar({ currentType, onChange }: FilterBarProps) {
  const types: { type: MemoryType; label: string; icon: string }[] = [
    { type: 'episodic', label: 'Episodic', icon: '📅' },
    { type: 'semantic', label: 'Semantic', icon: '🧠' },
    { type: 'shared', label: 'Shared', icon: '🌐' },
  ]

  return (
    <div className="flex gap-2">
      {types.map(({ type, label, icon }) => (
        <button
          key={type}
          onClick={() => onChange(type)}
          className={`
            px-4 py-2 rounded-lg font-mono text-sm transition-all
            ${currentType === type
              ? 'bg-cyan-600 text-white border border-cyan-500/50 cyber-glow'
              : 'bg-gray-900 text-gray-400 border border-cyan-900/30 hover:border-cyan-500/30 hover:text-cyan-100'
            }
          `}
        >
          <span className="mr-2">{icon}</span>
          {label}
        </button>
      ))}
    </div>
  )
}
