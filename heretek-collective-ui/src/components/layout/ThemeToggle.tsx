'use client'

import React, { useState, useEffect } from 'react'

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    // Theme is always dark for cybernetic aesthetic
    setIsDark(true)
  }, [])

  return (
    <button
      className="p-2 rounded-lg border border-cyan-800 bg-gray-900/50 hover:bg-cyan-900/20 transition-colors"
      title="Theme (Dark mode only)"
    >
      <span className="text-lg">🌙</span>
    </button>
  )
}
