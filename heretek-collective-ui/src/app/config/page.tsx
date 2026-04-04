'use client'

import React, { useEffect, useState } from 'react'
import Header from '@/components/layout/Header'
import Sidebar from '@/components/layout/Sidebar'
import Footer from '@/components/layout/Footer'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

interface GatewayHealth {
  status: string
  uptime: number
  services: Record<string, { status: string; responseTime: number }>
}

interface LiteLLMMetrics {
  spend: { today: number; week: number; month: number }
  tokens: { total: number; prompt: number; completion: number }
  requests: { total: number; success: number; failed: number }
}

export default function ConfigPage() {
  const [gatewayHealth, setGatewayHealth] = useState<GatewayHealth | null>(null)
  const [litellmMetrics, setLiteLLMMetrics] = useState<LiteLLMMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [healthRes, metricsRes] = await Promise.all([
          fetch('/api/gateway/health'),
          fetch('/api/litellm/metrics'),
        ])
        
        const health = await healthRes.json()
        const metrics = await metricsRes.json()
        
        setGatewayHealth(health)
        setLiteLLMMetrics(metrics)
      } catch (error) {
        console.error('Failed to fetch config data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-auto p-6">
            <div className="space-y-6">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </main>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6 cyber-grid">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="mb-6">
              <h1 className="text-3xl font-mono text-cyan-400 text-glow mb-2">
                ⚙️ Configuration
              </h1>
              <p className="text-gray-400 font-mono text-sm">
                Gateway & LiteLLM configuration and metrics
              </p>
            </div>
            
            {/* Gateway Health */}
            <Card title="Gateway Health" description="Core service status">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {gatewayHealth && Object.entries(gatewayHealth.services).map(([service, data]) => (
                  <div key={service} className="p-4 rounded-lg bg-gray-950/50 border border-cyan-900/30">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`w-2 h-2 rounded-full ${data.status === 'up' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                      <span className="text-sm font-mono text-cyan-100 capitalize">{service}</span>
                    </div>
                    <div className="text-xs text-gray-500 font-mono">
                      {data.responseTime}ms
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* LiteLLM Metrics */}
            <Card title="LiteLLM Metrics" description="Cost and usage statistics">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {litellmMetrics && (
                  <>
                    <div className="p-4 rounded-lg bg-gray-950/50 border border-cyan-900/30">
                      <div className="text-xs text-gray-500 font-mono mb-1">Today's Spend</div>
                      <div className="text-2xl font-mono text-cyan-400">${litellmMetrics.spend.today.toFixed(2)}</div>
                    </div>
                    <div className="p-4 rounded-lg bg-gray-950/50 border border-cyan-900/30">
                      <div className="text-xs text-gray-500 font-mono mb-1">Total Tokens</div>
                      <div className="text-2xl font-mono text-cyan-400">{(litellmMetrics.tokens.total / 1000).toFixed(0)}K</div>
                    </div>
                    <div className="p-4 rounded-lg bg-gray-950/50 border border-cyan-900/30">
                      <div className="text-xs text-gray-500 font-mono mb-1">Requests</div>
                      <div className="text-2xl font-mono text-cyan-400">{litellmMetrics.requests.total}</div>
                    </div>
                    <div className="p-4 rounded-lg bg-gray-950/50 border border-cyan-900/30">
                      <div className="text-xs text-gray-500 font-mono mb-1">Success Rate</div>
                      <div className="text-2xl font-mono text-cyan-400">
                        {((litellmMetrics.requests.success / litellmMetrics.requests.total) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </>
                )}
              </div>
            </Card>
          </div>
        </main>
      </div>
      <Footer />
    </div>
  )
}
