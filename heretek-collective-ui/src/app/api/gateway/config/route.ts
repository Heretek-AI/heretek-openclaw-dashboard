import { NextRequest, NextResponse } from 'next/server'

/**
 * Gateway Configuration API
 * 
 * Provides access to OpenClaw Gateway configuration settings.
 * Supports reading and updating gateway, A2A, and memory configurations.
 */

// Gateway service URL
const getGatewayUrl = () => process.env.GATEWAY_URL || 'http://localhost:18789'

/**
 * GET /api/gateway/config
 * 
 * Fetches current gateway configuration from the OpenClaw Gateway service.
 */
export async function GET(request: NextRequest) {
  try {
    const gatewayUrl = getGatewayUrl()
    const apiKey = process.env.GATEWAY_API_KEY
    
    // Fetch actual config from Gateway
    const response = await fetch(`${gatewayUrl}/config`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      // If gateway is not available, return cached/default config
      if (response.status === 503 || response.status === 502) {
        const defaultConfig = {
          gateway: {
            port: parseInt(process.env.GATEWAY_PORT || '18789'),
            host: process.env.GATEWAY_HOST || '0.0.0.0',
            maxAgents: parseInt(process.env.GATEWAY_MAX_AGENTS || '10'),
            deliberationTimeout: parseInt(process.env.GATEWAY_DELIBERATION_TIMEOUT || '30000'),
          },
          a2a: {
            enabled: process.env.A2A_ENABLED !== 'false',
            broadcastDelay: parseInt(process.env.A2A_BROADCAST_DELAY || '1000'),
            maxRetries: parseInt(process.env.A2A_MAX_RETRIES || '3'),
          },
          memory: {
            provider: process.env.MEMORY_PROVIDER || 'qdrant',
            embeddingModel: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
            vectorSize: parseInt(process.env.VECTOR_SIZE || '1536'),
          },
        }
        
        return NextResponse.json({ 
          config: defaultConfig,
          source: 'default',
          warning: 'Gateway unavailable, returning default configuration',
        })
      }
      
      throw new Error(`Gateway returned ${response.status}: ${response.statusText}`)
    }
    
    const config = await response.json()
    
    return NextResponse.json({ 
      config,
      source: 'gateway',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Failed to fetch gateway config:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch gateway config',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/gateway/config
 * 
 * Updates gateway configuration settings.
 * Requires valid API key authentication.
 */
export async function PUT(request: NextRequest) {
  try {
    let body: unknown
    try {
      body = await request.json()
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    // Validate body is an object
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Request body must be a JSON object' },
        { status: 400 }
      )
    }

    const gatewayUrl = getGatewayUrl()
    const apiKey = process.env.GATEWAY_API_KEY
    
    // Validate required configuration sections
    const configBody = body as Record<string, unknown>
    if (!configBody.gateway && !configBody.a2a && !configBody.memory) {
      return NextResponse.json(
        { error: 'Configuration must include at least one section: gateway, a2a, or memory' },
        { status: 400 }
      )
    }
    
    // Send config update to Gateway
    const response = await fetch(`${gatewayUrl}/config`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(configBody),
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Gateway returned ${response.status}`)
    }
    
    const result = await response.json()
    
    return NextResponse.json({
      success: true,
      message: 'Gateway configuration updated successfully',
      config: result.config,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Failed to update gateway config:', error)
    return NextResponse.json(
      { 
        error: 'Failed to update gateway config',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
