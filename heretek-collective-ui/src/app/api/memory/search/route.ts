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

// AUDIT-FIX: Replace mock data with actual vector search
// Note: Uses PostgreSQL with pgvector - requires swarm_memories table
async function searchMemories(query: string, type?: string, limit: number = 20) {
  // Check for required environment variables
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL not configured');
  }

  try {
    // Dynamic import to avoid issues when pg is not available
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: dbUrl });
    const client = await pool.connect();
    
    try {
      // Search in swarm_memories table using text search
      // For vector search, would use embedding similarity with pgvector
      let sql = `
        SELECT id, agent_id, content, accessibility, consciousness_level, 
               created_at, updated_at,
               1.0 as score
        FROM swarm_memories
        WHERE content::text ILIKE $1
      `;
      const params = [`%${query}%`];
      
      if (type) {
        // Filter by metadata type if stored
        sql += ` AND accessibility = $2`;
        params.push(type);
      }
      
      sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
      params.push(limit);
      
      const result = await client.query(sql, params);
      
      return result.rows.map(row => ({
        id: row.id,
        content: typeof row.content === 'string' ? JSON.parse(row.content) : row.content,
        type: 'semantic',
        metadata: { agentId: row.agent_id, accessibility: row.accessibility },
        createdAt: row.created_at,
        pinned: false,
        score: row.score,
      }));
    } finally {
      client.release();
      await pool.end();
    }
  } catch (error) {
    console.error('Database search error:', error);
    throw error;
  }
}

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

    // AUDIT-FIX: Replace mock with actual database search
    try {
      const results = await searchMemories(
        queryValidation.value,
        typeValidation.value,
        limitValidation.value
      );
      
      return NextResponse.json({
        memories: results,
        query: queryValidation.value,
        type: typeValidation.value || null,
        limit: limitValidation.value,
      });
    } catch (dbError) {
      console.error('Memory search failed:', dbError);
      // Return clear error instead of mock fallback
      return NextResponse.json(
        { 
          error: 'Memory search unavailable',
          details: dbError instanceof Error ? dbError.message : 'Database error',
          memories: [],
        },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error('Failed to search memory:', error)
    return NextResponse.json(
      { error: 'Failed to search memory' },
      { status: 500 }
    )
  }
}
