import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message } = body

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const gatewayUrl = process.env.GATEWAY_URL || 'http://localhost:18789'
    const apiKey = process.env.GATEWAY_API_KEY
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`

    const response = await fetch(`${gatewayUrl.replace(/^ws/, 'http')}/a2a/broadcast`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ message, target: 'all_agents' }),
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Gateway broadcast failed', status: response.status },
        { status: 502 }
      )
    }

    const result = await response.json()
    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to broadcast:', error)
    return NextResponse.json(
      { error: 'Gateway unavailable', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 503 }
    )
  }
}
