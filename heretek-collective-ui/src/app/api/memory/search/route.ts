import { NextRequest, NextResponse } from 'next/server'

/**
 * Input Validation Schema for Memory Search API
 * Prevents NoSQL injection, XSS, and ensures type safety
 */

// Maximum allowed query length to prevent DoS
const MAX_QUERY_LENGTH = 1000
const MAX_LIMIT = 100
const DEFAULT_LIMIT = 20

// Valid memory types
const VALID_MEMORY_TYPES = ['episodic', 'semantic', 'shared', 'procedural'] as const
type MemoryType = typeof VALID_MEMORY_TYPES[number]

// Dangerous patterns that could indicate injection attacks
const DANGEROUS_PATTERNS = [
  /\$\s*where/i,      // MongoDB $where injection
  /\$\s*gt/i,         // MongoDB comparison operators
  /\$\s*lt/i,
  /\$\s*regex/i,      // Regex injection
  /javascript\s*:/i, // XSS via javascript: protocol
  /<\s*script/i,     // Script tag injection
  /on\w+\s*=/i,      // Event handler injection
  /union\s+select/i, // SQL injection
  /;\s*drop\s+table/i, // SQL injection
]

/**
 * Validate search query input
 */
function validateQuery(query: unknown): { valid: boolean; error?: string; value?: string } {
  if (!query) {
    return { valid: false, error: 'Query is required' }
  }

  if (typeof query !== 'string') {
    return { valid: false, error: 'Query must be a string' }
  }

  const trimmedQuery = query.trim()

  if (trimmedQuery.length === 0) {
    return { valid: false, error: 'Query cannot be empty' }
  }

  if (trimmedQuery.length > MAX_QUERY_LENGTH) {
    return { 
      valid: false, 
      error: `Query exceeds maximum length of ${MAX_QUERY_LENGTH} characters` 
    }
  }

  // Check for dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(trimmedQuery)) {
      return { 
        valid: false, 
        error: 'Query contains invalid or potentially dangerous content' 
      }
    }
  }

  return { valid: true, value: trimmedQuery }
}

/**
 * Validate memory type filter
 */
function validateMemoryType(type: unknown): { valid: boolean; error?: string; value?: MemoryType } {
  if (!type) {
    return { valid: true } // Type is optional
  }

  if (typeof type !== 'string') {
    return { valid: false, error: 'Type must be a string' }
  }

  const validType = VALID_MEMORY_TYPES.find(t => t === type)
  
  if (!validType) {
    return { 
      valid: false, 
      error: `Invalid memory type. Must be one of: ${VALID_MEMORY_TYPES.join(', ')}` 
    }
  }

  return { valid: true, value: validType }
}

/**
 * Validate limit parameter
 */
function validateLimit(limit: unknown): { valid: boolean; error?: string; value?: number } {
  if (!limit) {
    return { valid: true, value: DEFAULT_LIMIT } // Default limit
  }

  const numLimit = Number(limit)

  if (!Number.isInteger(numLimit)) {
    return { valid: false, error: 'Limit must be an integer' }
  }

  if (numLimit < 1) {
    return { valid: false, error: 'Limit must be at least 1' }
  }

  if (numLimit > MAX_LIMIT) {
    return { valid: false, error: `Limit cannot exceed ${MAX_LIMIT}` }
  }

  return { valid: true, value: numLimit }
}

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

    const { query, type, limit } = body as Record<string, unknown>

    // Validate query
    const queryValidation = validateQuery(query)
    if (!queryValidation.valid) {
      return NextResponse.json(
        { error: queryValidation.error },
        { status: 400 }
      )
    }

    // Validate type
    const typeValidation = validateMemoryType(type)
    if (!typeValidation.valid) {
      return NextResponse.json(
        { error: typeValidation.error },
        { status: 400 }
      )
    }

    // Validate limit
    const limitValidation = validateLimit(limit)
    if (!limitValidation.valid) {
      return NextResponse.json(
        { error: limitValidation.error },
        { status: 400 }
      )
    }

    // TODO: Replace with actual Qdrant/Pinecone vector search
    // const response = await fetch(`${process.env.VECTOR_DB_URL}/search`, {
    //   method: 'POST',
    //   headers: { 
    //     'Authorization': `Bearer ${process.env.VECTOR_DB_KEY}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({ query: queryValidation.value, type: typeValidation.value, limit: limitValidation.value })
    // })
    
    // Simulate search delay
    await new Promise((resolve) => setTimeout(resolve, 500))
    
    // Filter mock results by type
    let results = mockMemories
    if (typeValidation.value) {
      results = results.filter((m) => m.type === typeValidation.value)
    }
    
    // Simple text search simulation
    if (queryValidation.value) {
      results = results.filter((m) =>
        m.content.toLowerCase().includes(queryValidation.value.toLowerCase())
      )
    }
    
    // Apply limit
    results = results.slice(0, limitValidation.value)
    
    return NextResponse.json({
      memories: results,
      query: queryValidation.value,
      type: typeValidation.value || null,
      limit: limitValidation.value,
    })
  } catch (error) {
    console.error('Failed to search memory:', error)
    return NextResponse.json(
      { error: 'Failed to search memory' },
      { status: 500 }
    )
  }
}
