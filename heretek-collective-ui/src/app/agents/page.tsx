'use client'

import React, { useEffect } from 'react'
import Header from '@/components/layout/Header'
import Sidebar from '@/components/layout/Sidebar'
import Footer from '@/components/layout/Footer'
import AgentList from '@/components/agent-manager/AgentList'
import SkillStore from '@/components/agent-manager/SkillStore'
import { useAgentStore } from '@/store/agentStore'

export default function AgentsPage() {
  const { fetchAgents, agents } = useAgentStore()

  useEffect(() => {
    fetchAgents()
  }, [fetchAgents])

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6 cyber-grid">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="mb-6">
              <h1 className="text-3xl font-mono text-cyan-400 text-glow mb-2">
                🤖 Agent Manager
              </h1>
              <p className="text-gray-400 font-mono text-sm">
                Deploy, configure, and manage agents and skills
              </p>
            </div>
            
            <AgentList />
            
            <div className="mt-8">
              <SkillStore />
            </div>
          </div>
        </main>
      </div>
      <Footer />
    </div>
  )
}
