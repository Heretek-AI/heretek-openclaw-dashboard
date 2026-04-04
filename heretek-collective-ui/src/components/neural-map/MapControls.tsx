'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { useNeuralMapStore } from '@/store/neuralMapStore'

export default function MapControls() {
  const { 
    showThoughtStack, 
    showA2AEdges, 
    toggleThoughtStack, 
    toggleA2AEdges,
    resetView 
  } = useNeuralMapStore()

  return (
    <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
      <div className="cyber-card p-2 flex flex-col gap-2">
        <Button
          variant={showThoughtStack ? 'primary' : 'secondary'}
          size="sm"
          onClick={toggleThoughtStack}
          title="Toggle Thought Stack"
        >
          🧠
        </Button>
        <Button
          variant={showA2AEdges ? 'primary' : 'secondary'}
          size="sm"
          onClick={toggleA2AEdges}
          title="Toggle A2A Edges"
        >
          🔗
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={resetView}
          title="Reset View"
        >
          🎯
        </Button>
      </div>
    </div>
  )
}
