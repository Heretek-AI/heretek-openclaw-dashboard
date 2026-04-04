import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333'
    const apiKey = process.env.QDRANT_API_KEY
    const headers: Record<string, string> = {}
    if (apiKey) headers['api-key'] = apiKey

    const response = await fetch(`${qdrantUrl}/collections/swarm_memories/points/${params.id}`, {
      headers,
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Vector DB unavailable', status: response.status },
        { status: 502 }
      )
    }

    const data = await response.json()
    return NextResponse.json({ memory: data.result })
  } catch (error) {
    console.error('Failed to fetch memory:', error)
    return NextResponse.json(
      { error: 'Vector DB unavailable', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 503 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333'
    const apiKey = process.env.QDRANT_API_KEY
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (apiKey) headers['api-key'] = apiKey

    const response = await fetch(`${qdrantUrl}/collections/swarm_memories/points/delete`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ points: [params.id] }),
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Vector DB delete failed', status: response.status },
        { status: 502 }
      )
    }

    return NextResponse.json({ success: true, message: `Memory ${params.id} deleted` })
  } catch (error) {
    console.error('Failed to delete memory:', error)
    return NextResponse.json(
      { error: 'Vector DB unavailable' },
      { status: 503 }
    )
  }
}
