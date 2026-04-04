'use client'

import React from 'react'
import Header from '@/components/layout/Header'
import Sidebar from '@/components/layout/Sidebar'
import Footer from '@/components/layout/Footer'
import A2AStream from '@/components/a2a-monitor/A2AStream'
import CommandLine from '@/components/command-line/CommandLine'

export default function A2APage() {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6 cyber-grid">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="mb-6">
              <h1 className="text-3xl font-mono text-cyan-400 text-glow mb-2">
                💬 A2A Monitor
              </h1>
              <p className="text-gray-400 font-mono text-sm">
                Live stream of inter-agent "internal monologue"
              </p>
            </div>
            
            <A2AStream />
            
            <CommandLine />
          </div>
        </main>
      </div>
      <Footer />
    </div>
  )
}
