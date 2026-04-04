import { NextRequest, NextResponse } from 'next/server'

// Mock memory data
const mockMemories = [
  {
    id: 'mem-001',
    content: 'User asked about deployment strategies for microservices architecture',
    type: 'episodic' as const,
    metadata: { source: 'conversation', agent: 'Oracle' },
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    pinned: false,
    score: 0.95,
  },
  {
    id: 'mem-002',
    content: 'Python is a high-level programming language known for its simplicity',
    type: 'semantic' as const,
    metadata: { source: 'knowledge_base', topic: 'programming' },
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    pinned: true,
    score: 0.89,
  },
  {
    id: 'mem-003',
    content: 'Team decided to use PostgreSQL for persistent storage',
    type: 'shared' as const,
    metadata: { source: 'decision_log', project: 'OpenClaw' },
    createdAt: new Date(Date.now() - 259200000).toISOString(),
    pinned: false,
    score: 0.87,
  },
]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, type } = body
    
    // TODO: Replace with actual Qdrant/Pinecone vector search
    // const response = await fetch(`${process.env.VECTOR_DB_URL}/search`, {
    //   method: 'POST',
    //   headers: { 
    //     'Authorization': `Bearer ${process.env.VECTOR_DB_KEY}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({ query, type, limit: 20 })
    // })
    
    // Simulate search delay
    await new Promise((resolve) => setTimeout(resolve, 500))
    
    // Filter mock results by type
    let results = mockMemories
    if (type) {
      results = results.filter((m) => m.type === type)
    }
    
    // Simple text search simulation
    if (query) {
      results = results.filter((m) =>
        m.content.toLowerCase().includes(query.toLowerCase())
      )
    }
    
    return NextResponse.json({
      memories: results,
      query,
      type,
    })
  } catch (error) {
    console.error('Failed to search memory:', error)
    return NextResponse.json(
      { error: 'Failed to search memory' },
      { status: 500 }
    )
  }
}
