import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

export interface A2AMessage {
  traceId: string
  from: string
  to?: string
  type: string
  content: any
  timestamp: string
  latency?: number
  status?: 'pending' | 'processing' | 'completed' | 'failed'
}

interface A2AState {
  a2aMessages: A2AMessage[]
  isConnected: boolean
  isLoading: boolean
  error: string | null
  eventSource: EventSource | null
  
  // Actions
  subscribeToStream: (es: EventSource) => void
  unsubscribeFromStream: () => void
  addMessage: (message: A2AMessage) => void
  broadcastToCollective: (message: string) => Promise<void>
  clearMessages: () => void
}

export const useA2AStore = create<A2AState>()(
  subscribeWithSelector((set, get) => ({
    a2aMessages: [],
    isConnected: false,
    isLoading: false,
    error: null,
    eventSource: null,

    subscribeToStream: (es) => {
      set({ eventSource: es, isConnected: true, error: null })
      
      es.onmessage = (event) => {
        try {
          const message: A2AMessage = JSON.parse(event.data)
          set((state) => ({
            a2aMessages: [...state.a2aMessages.slice(-99), message], // Keep last 100
          }))
        } catch (err) {
          console.error('Failed to parse A2A message:', err)
        }
      }
      
      es.onerror = () => {
        set({ isConnected: false, error: 'Connection lost' })
      }
    },

    unsubscribeFromStream: () => {
      const { eventSource } = get()
      if (eventSource) {
        eventSource.close()
      }
      set({ eventSource: null, isConnected: false })
    },

    addMessage: (message) => {
      set((state) => ({
        a2aMessages: [...state.a2aMessages.slice(-99), message],
      }))
    },

    broadcastToCollective: async (message) => {
      set({ isLoading: true })
      try {
        const res = await fetch('/api/a2a/broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message }),
        })
        if (!res.ok) throw new Error('Broadcast failed')
        set({ isLoading: false })
      } catch (err) {
        set({ 
          error: err instanceof Error ? err.message : 'Broadcast failed',
          isLoading: false 
        })
      }
    },

    clearMessages: () => set({ a2aMessages: [] }),
  }))
)
