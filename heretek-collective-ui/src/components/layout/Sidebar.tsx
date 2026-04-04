'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/', label: 'Neural Map', icon: '🧠' },
  { href: '/agents', label: 'Agent Manager', icon: '🤖' },
  { href: '/memory', label: 'Memory Search', icon: '💾' },
  { href: '/a2a', label: 'A2A Monitor', icon: '💬' },
  { href: '/config', label: 'Configuration', icon: '⚙️' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 cyber-border border-r-t rounded-none p-4 flex flex-col">
      <nav className="space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-lg font-mono text-sm
                transition-all duration-200
                ${isActive 
                  ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 cyber-glow' 
                  : 'text-gray-400 hover:text-cyan-100 hover:bg-cyan-900/20'
                }
              `}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto pt-6 border-t border-cyan-900/30">
        <div className="text-xs font-mono text-gray-500 space-y-2">
          <div className="flex justify-between">
            <span>Agents:</span>
            <span className="text-cyan-400">3 Active</span>
          </div>
          <div className="flex justify-between">
            <span>Memory:</span>
            <span className="text-cyan-400">2.4 GB</span>
          </div>
          <div className="flex justify-between">
            <span>Uptime:</span>
            <span className="text-cyan-400">14h 32m</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
