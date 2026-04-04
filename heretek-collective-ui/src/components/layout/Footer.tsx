'use client'

import React from 'react'

export default function Footer() {
  return (
    <footer className="cyber-border border-t rounded-none px-6 py-3 flex items-center justify-between text-xs font-mono">
      <div className="flex items-center gap-4">
        <span className="text-gray-500">
          Heretek OpenClaw v6.0
        </span>
        <span className="text-gray-600">|</span>
        <span className="text-gray-500">
          The thought that never ends
        </span>
      </div>
      
      <div className="flex items-center gap-4 text-gray-500">
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          System Online
        </span>
        <span className="text-gray-600">|</span>
        <span>
          Last Sync: {new Date().toLocaleTimeString()}
        </span>
      </div>
    </footer>
  )
}
