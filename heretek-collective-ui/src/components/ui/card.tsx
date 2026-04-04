import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  title?: string
  description?: string
  header?: React.ReactNode
  footer?: React.ReactNode
}

export function Card({
  children,
  className = '',
  title,
  description,
  header,
  footer,
}: CardProps) {
  return (
    <div className={`cyber-card ${className}`}>
      {header && <div className="border-b border-cyan-900/30 px-4 py-3">{header}</div>}
      
      {(title || description) && (
        <div className="px-4 py-3 border-b border-cyan-900/30">
          {title && <h3 className="text-lg font-mono text-cyan-400">{title}</h3>}
          {description && <p className="text-sm text-gray-400 mt-1">{description}</p>}
        </div>
      )}
      
      <div className="p-4">
        {children}
      </div>
      
      {footer && <div className="border-t border-cyan-900/30 px-4 py-3">{footer}</div>}
    </div>
  )
}
