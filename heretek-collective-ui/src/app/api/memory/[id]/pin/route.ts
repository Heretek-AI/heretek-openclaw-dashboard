import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333'
    const apiKey = process.env.QDRANT_API_KEY
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (apiKey) headers['api-key'] = apiKey

    const response = await fetch(`${qdrantUrl}/collections/swarm_memories/points`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        points: [{ id: params.id, payload: { pinned: true } }],
      }),
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Vector DB unavailable', status: response.status },
        { status: 502 }
      )
    }

    return NextResponse.json({ success: true, message: `Memory ${params.id} pinned` })
  } catch (error) {
    console.error('Failed to pin memory:', error)
    return NextResponse.json(
      { error: 'Vector DB unavailable' },
      { status: 503 }
    )
  }
}
