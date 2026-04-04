import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

export interface Memory {
  id: string
  content: string
  type: 'episodic' | 'semantic' | 'shared'
  embedding?: number[]
  metadata?: Record<string, any>
  createdAt: string
  updatedAt?: string
  pinned: boolean
  score?: number
}

interface MemoryStats {
  totalMemories: number
  episodicCount: number
  semanticCount: number
  sharedCount: number
  vectorSize: string
}

interface MemoryState {
  memories: Memory[]
  results: Memory[]
  isLoading: boolean
  error: string | null
  stats: MemoryStats | null
  
  // Actions
  searchMemory: (query: string, type: 'episodic' | 'semantic' | 'shared') => Promise<void>
  fetchStats: () => Promise<void>
  pinMemory: (id: string) => Promise<void>
  deleteMemory: (id: string) => Promise<void>
  clearResults: () => void
}

export const useMemoryStore = create<MemoryState>()(
  subscribeWithSelector((set, get) => ({
    memories: [],
    results: [],
    isLoading: false,
    error: null,
    stats: null,

    searchMemory: async (query, type) => {
      set({ isLoading: true, error: null })
      try {
        const res = await fetch('/api/memory/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, type }),
        })
        if (!res.ok) throw new Error('Search failed')
        const data = await res.json()
        set({ results: data.memories, isLoading: false })
      } catch (err) {
        set({ 
          error: err instanceof Error ? err.message : 'Search failed', 
          isLoading: false 
        })
      }
    },

    fetchStats: async () => {
      try {
        const res = await fetch('/api/memory/stats')
        if (!res.ok) throw new Error('Failed to fetch stats')
        const data = await res.json()
        set({ stats: data })
      } catch (err) {
        console.error('Failed to fetch memory stats:', err)
      }
    },

    pinMemory: async (id) => {
      const res = await fetch(`/api/memory/${id}/pin`, { method: 'POST' })
      if (!res.ok) throw new Error('Pin failed')
      set((state) => ({
        memories: state.memories.map((m) => 
          m.id === id ? { ...m, pinned: true } : m
        ),
      }))
    },

    deleteMemory: async (id) => {
      const res = await fetch(`/api/memory/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      set((state) => ({
        memories: state.memories.filter((m) => m.id !== id),
        results: state.results.filter((m) => m.id !== id),
      }))
    },

    clearResults: () => set({ results: [] }),
  }))
)
