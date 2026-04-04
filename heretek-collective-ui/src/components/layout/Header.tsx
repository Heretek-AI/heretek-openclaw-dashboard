'use client'

import React from 'react'
import ThemeToggle from './ThemeToggle'

export default function Header() {
  return (
    <header className="cyber-border border-b-t rounded-none px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center">
          <span className="text-2xl">🦞</span>
        </div>
        <div>
          <h1 className="text-xl font-mono text-cyan-400 text-glow">
            HERETEK COLLECTIVE
          </h1>
          <p className="text-xs text-gray-500 font-mono">
            v6.0.0 — Neural Interface
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Status Indicators */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-gray-400">Gateway</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-gray-400">LiteLLM</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-gray-400">Qdrant</span>
          </div>
        </div>

        <ThemeToggle />
      </div>
    </header>
  )
}
