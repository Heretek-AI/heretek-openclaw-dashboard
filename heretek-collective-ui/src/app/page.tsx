'use client'

import React from 'react'
import Header from '@/components/layout/Header'
import Sidebar from '@/components/layout/Sidebar'
import Footer from '@/components/layout/Footer'
import NeuralMap from '@/components/neural-map/NeuralMap'

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6 cyber-grid">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="mb-6">
              <h1 className="text-3xl font-mono text-cyan-400 text-glow mb-2">
                🦞 Heretek Collective
              </h1>
              <p className="text-gray-400 font-mono text-sm">
                Neural Map — Real-time Agent Topology & A2A Communications
              </p>
            </div>
            
            <NeuralMap />
          </div>
        </main>
      </div>
      <Footer />
    </div>
  )
}
