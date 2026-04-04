'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useMemoryStore } from '@/store/memoryStore'
import FilterBar from './FilterBar'
import MemoryStats from './MemoryStats'
import MemoryResults from './MemoryResults'

type MemoryType = 'episodic' | 'semantic' | 'shared'

export default function MemorySearch() {
  const [query, setQuery] = useState('')
  const [memoryType, setMemoryType] = useState<MemoryType>('semantic')
  const { searchMemory, isLoading, results, fetchStats } = useMemoryStore()

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return
    await searchMemory(query, memoryType)
  }, [query, memoryType, searchMemory])

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSearch()
      }
    },
    [handleSearch]
  )

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <Card title="🧠 Memory Deep Search" description="Search collective memory">
        {/* Search Input */}
        <div className="flex gap-4 mb-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Search collective memory..."
            className="flex-1 cyber-input"
          />
          <Button
            onClick={handleSearch}
            disabled={isLoading || !query.trim()}
          >
            {isLoading ? 'Searching...' : 'Search'}
          </Button>
        </div>

        {/* Filters */}
        <FilterBar
          currentType={memoryType}
          onChange={setMemoryType}
        />
      </Card>

      {/* Memory Stats */}
      <MemoryStats />

      {/* Results */}
      {isLoading ? (
        <Card>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </Card>
      ) : results.length > 0 ? (
        <MemoryResults results={results} />
      ) : null}
    </div>
  )
}
