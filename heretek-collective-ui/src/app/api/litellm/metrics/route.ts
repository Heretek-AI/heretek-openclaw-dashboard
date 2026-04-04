import { NextRequest, NextResponse } from 'next/server'

/**
 * LiteLLM Metrics API
 * 
 * Fetches usage metrics, spending data, and performance statistics from LiteLLM.
 * Provides real-time insights into LLM usage across all agents.
 */

// LiteLLM service URL
const getLiteLLMUrl = () => process.env.LITELLM_URL || 'http://localhost:4000'

// Metrics cache (in-memory, use Redis in production)
let metricsCache: { data: unknown; timestamp: number } | null = null
const CACHE_TTL = 30000 // 30 seconds

/**
 * GET /api/litellm/metrics
 * 
 * Fetches LiteLLM metrics including:
 * - Spending data (today, week, month)
 * - Token usage (prompt, completion, total)
 * - Latency percentiles (p50, p95, p99)
 * - Request statistics (total, success, failed, success rate)
 * - Model breakdown (requests and cost per model)
 * 
 * Query Parameters:
 * - period: 'today' | 'week' | 'month' | 'all' (default: 'all')
 * - cache: 'true' | 'false' (default: 'true') - Use cached data
 */
export async function GET(request: NextRequest) {
  try {
    const litellmUrl = getLiteLLMUrl()
    const masterKey = process.env.LITELLM_MASTER_KEY
    
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'all'
    const useCache = searchParams.get('cache') !== 'false'
    
    // Return cached data if available and valid
    if (useCache && metricsCache && Date.now() - metricsCache.timestamp < CACHE_TTL) {
      return NextResponse.json({
        ...metricsCache.data,
        cached: true,
        cacheAge: Date.now() - metricsCache.timestamp,
      })
    }
    
    // Fetch actual metrics from LiteLLM
    const response = await fetch(`${litellmUrl}/spend/calculate`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${masterKey}`,
        'Content-Type': 'application/json',
      },
    })
    
    // If LiteLLM spend endpoint is not available, try alternative endpoints
    if (!response.ok) {
      // Try to get metrics from LiteLLM's info endpoint
      const infoResponse = await fetch(`${litellmUrl}/info`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${masterKey}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (infoResponse.ok) {
        const infoData = await infoResponse.json()
        
        // Transform LiteLLM info into metrics format
        const metrics = {
          spend: {
            today: infoData.spend?.today || 0,
            week: infoData.spend?.week || 0,
            month: infoData.spend?.month || 0,
            currency: 'USD',
          },
          tokens: {
            total: infoData.usage?.total_tokens || 0,
            prompt: infoData.usage?.prompt_tokens || 0,
            completion: infoData.usage?.completion_tokens || 0,
          },
          latency: {
            p50: infoData.latency?.p50 || 0,
            p95: infoData.latency?.p95 || 0,
            p99: infoData.latency?.p99 || 0,
          },
          requests: {
            total: infoData.requests?.total || 0,
            success: infoData.requests?.success || 0,
            failed: infoData.requests?.failed || 0,
            successRate: infoData.requests?.success_rate || 0,
          },
          models: infoData.models?.map((m: Record<string, unknown>) => ({
            name: m.model_name || 'unknown',
            requests: m.num_requests || 0,
            cost: m.total_spend || 0,
          })) || [],
        }
        
        metricsCache = { data: metrics, timestamp: Date.now() }
        
        return NextResponse.json({
          ...metrics,
          period,
          cached: false,
          timestamp: new Date().toISOString(),
        })
      }
      
      throw new Error(`LiteLLM returned ${response.status}: ${response.statusText}`)
    }
    
    const spendData = await response.json()
    
    // Transform spend data into metrics format
    const metrics = {
      spend: {
        today: spendData.spend?.today || spendData.today || 0,
        week: spendData.spend?.week || spendData.week || 0,
        month: spendData.spend?.month || spendData.month || 0,
        currency: 'USD',
      },
      tokens: {
        total: spendData.total_tokens || 0,
        prompt: spendData.prompt_tokens || 0,
        completion: spendData.completion_tokens || 0,
      },
      latency: {
        p50: spendData.p50_latency || 0,
        p95: spendData.p95_latency || 0,
        p99: spendData.p99_latency || 0,
      },
      requests: {
        total: spendData.total_requests || 0,
        success: spendData.successful_requests || 0,
        failed: spendData.failed_requests || 0,
        successRate: spendData.success_rate || 0,
      },
      models: spendData.models || [],
    }
    
    // Cache the metrics
    metricsCache = { data: metrics, timestamp: Date.now() }
    
    return NextResponse.json({
      ...metrics,
      period,
      cached: false,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Failed to fetch LiteLLM metrics:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch LiteLLM metrics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
