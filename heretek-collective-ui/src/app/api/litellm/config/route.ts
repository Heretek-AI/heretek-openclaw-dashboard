import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const litellmUrl = process.env.LITELLM_URL || 'http://localhost:4000'
    const apiKey = process.env.LITELLM_MASTER_KEY

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`

    const response = await fetch(`${litellmUrl}/config`, {
      headers,
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'LiteLLM unavailable', status: response.status },
        { status: 502 }
      )
    }

    const config = await response.json()
    return NextResponse.json({ config })
  } catch (error) {
    console.error('Failed to fetch LiteLLM config:', error)
    return NextResponse.json(
      { error: 'LiteLLM service unavailable', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 503 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const litellmUrl = process.env.LITELLM_URL || 'http://localhost:4000'
    const apiKey = process.env.LITELLM_MASTER_KEY

    if (!apiKey) {
      return NextResponse.json({ error: 'LITELLM_MASTER_KEY not configured' }, { status: 500 })
    }

    const response = await fetch(`${litellmUrl}/config`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'LiteLLM config update failed', status: response.status },
        { status: 502 }
      )
    }

    const result = await response.json()
    return NextResponse.json({ success: true, config: result })
  } catch (error) {
    console.error('Failed to update LiteLLM config:', error)
    return NextResponse.json(
      { error: 'LiteLLM service unavailable' },
      { status: 503 }
    )
  }
}
