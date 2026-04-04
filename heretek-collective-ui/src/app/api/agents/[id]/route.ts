import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const gatewayUrl = process.env.GATEWAY_URL || 'http://localhost:18789'
    const apiKey = process.env.GATEWAY_API_KEY
    const headers: Record<string, string> = {}
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`

    const response = await fetch(`${gatewayUrl.replace(/^ws/, 'http')}/v1/agents/${params.id}`, {
      headers,
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Agent not found', status: response.status },
        { status: response.status === 404 ? 404 : 502 }
      )
    }

    const data = await response.json()
    return NextResponse.json({ agent: data.agent || data })
  } catch (error) {
    console.error('Failed to fetch agent:', error)
    return NextResponse.json(
      { error: 'Gateway unavailable', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 503 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const gatewayUrl = process.env.GATEWAY_URL || 'http://localhost:18789'
    const apiKey = process.env.GATEWAY_API_KEY
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`

    const response = await fetch(`${gatewayUrl.replace(/^ws/, 'http')}/v1/agents/${params.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Agent update failed', status: response.status },
        { status: 502 }
      )
    }

    const result = await response.json()
    return NextResponse.json({ success: true, agent: result })
  } catch (error) {
    console.error('Failed to update agent:', error)
    return NextResponse.json(
      { error: 'Gateway unavailable' },
      { status: 503 }
    )
  }
}
