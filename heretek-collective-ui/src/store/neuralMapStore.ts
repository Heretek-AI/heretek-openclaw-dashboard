import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

interface NeuralMapState {
  selectedNode: string | null
  zoom: number
  pan: { x: number; y: number }
  showThoughtStack: boolean
  showA2AEdges: boolean
  filterStatus: string[]
  
  // Actions
  setSelectedNode: (nodeId: string | null) => void
  setZoom: (zoom: number) => void
  setPan: (pan: { x: number; y: number }) => void
  toggleThoughtStack: () => void
  toggleA2AEdges: () => void
  toggleStatusFilter: (status: string) => void
  resetView: () => void
}

export const useNeuralMapStore = create<NeuralMapState>()(
  subscribeWithSelector((set) => ({
    selectedNode: null,
    zoom: 1,
    pan: { x: 0, y: 0 },
    showThoughtStack: true,
    showA2AEdges: true,
    filterStatus: [],

    setSelectedNode: (nodeId) => set({ selectedNode: nodeId }),
    
    setZoom: (zoom) => set({ zoom }),
    
    setPan: (pan) => set({ pan }),
    
    toggleThoughtStack: () => set((state) => ({ showThoughtStack: !state.showThoughtStack })),
    
    toggleA2AEdges: () => set((state) => ({ showA2AEdges: !state.showA2AEdges })),
    
    toggleStatusFilter: (status) => set((state) => ({
      filterStatus: state.filterStatus.includes(status)
        ? state.filterStatus.filter((s) => s !== status)
        : [...state.filterStatus, status]
    })),
    
    resetView: () => set({
      zoom: 1,
      pan: { x: 0, y: 0 },
      selectedNode: null,
    }),
  }))
)
