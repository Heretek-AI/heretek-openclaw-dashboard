import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const gatewayUrl = process.env.GATEWAY_URL || 'http://localhost:18789'
    const apiKey = process.env.GATEWAY_API_KEY
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`

    const response = await fetch(`${gatewayUrl.replace(/^ws/, 'http')}/v1/agents/${params.id}/deploy`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'deploy' }),
      signal: AbortSignal.timeout(30000),
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Deploy failed', status: response.status },
        { status: 502 }
      )
    }

    const result = await response.json()
    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to deploy agent:', error)
    return NextResponse.json(
      { error: 'Gateway unavailable', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 503 }
    )
  }
}
