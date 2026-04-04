'use client'

import React, { memo } from 'react'
import { EdgeProps, getBezierPath } from 'reactflow'

interface A2AEdgeData {
  traceId?: string
  messageType?: string
  latency?: number
}

function A2AEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  return (
    <>
      {/* Base path */}
      <path
        id={id}
        style={{
          ...style,
          stroke: '#06b6d4',
          strokeWidth: 2,
          fill: 'none',
        }}
        d={edgePath}
        markerEnd={markerEnd}
      />
      
      {/* Animated pulse */}
      <circle r="4" fill="#22d3ee">
        <animateMotion
          dur="1.5s"
          repeatCount="indefinite"
          path={edgePath}
        />
      </circle>

      {/* Latency tooltip on hover */}
      <title>
        {data?.messageType || 'A2A Message'}
        {'\n'}Trace: {data?.traceId || 'N/A'}
        {'\n'}Latency: {data?.latency || 'N/A'}ms
      </title>
    </>
  )
}

export default memo(A2AEdge)
