import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

export interface Agent {
  id: string
  name: string
  status: 'online' | 'offline' | 'debating' | 'idle'
  model: string
  memoryUsage?: string
  lastActive?: string
  websocketReadyState?: number
  timeSinceLastSeenMs?: number
}

interface AgentState {
  agents: Agent[]
  isLoading: boolean
  error: string | null
  lastUpdated: Date | null
  
  // Actions
  fetchAgents: () => Promise<void>
  setAgents: (agents: Agent[]) => void
  updateAgent: (id: string, updates: Partial<Agent>) => void
  deployAgent: (id: string) => Promise<void>
}

export const useAgentStore = create<AgentState>()(
  subscribeWithSelector((set, get) => ({
    agents: [],
    isLoading: false,
    error: null,
    lastUpdated: null,

    fetchAgents: async () => {
      set({ isLoading: true, error: null })
      try {
        const res = await fetch('/api/agents')
        if (!res.ok) throw new Error('Failed to fetch agents')
        const data = await res.json()
        set({ agents: data.agents, isLoading: false, lastUpdated: new Date() })
      } catch (err) {
        set({ 
          error: err instanceof Error ? err.message : 'Unknown error', 
          isLoading: false 
        })
      }
    },

    setAgents: (agents) => set({ agents, lastUpdated: new Date() }),

    updateAgent: (id, updates) => {
      set((state) => ({
        agents: state.agents.map((a) => (a.id === id ? { ...a, ...updates } : a)),
        lastUpdated: new Date(),
      }))
    },

    deployAgent: async (id) => {
      const res = await fetch(`/api/agents/${id}/deploy`, { method: 'POST' })
      if (!res.ok) throw new Error('Deploy failed')
    },
  }))
)
