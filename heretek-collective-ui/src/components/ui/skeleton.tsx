import React from 'react'

interface SkeletonProps {
  className?: string
  width?: string | number
  height?: string | number
}

export function Skeleton({
  className = '',
  width,
  height,
}: SkeletonProps) {
  const style: React.CSSProperties = {
    width,
    height,
  }

  return (
    <div
      className={`
        animate-pulse bg-gray-800 rounded
        ${className}
      `}
      style={style}
    />
  )
}
