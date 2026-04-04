import { NextRequest, NextResponse } from 'next/server'

/**
 * Input Validation Schema for Agent APIs
 * Prevents injection attacks and ensures type safety
 */

// Maximum allowed string lengths
const MAX_NAME_LENGTH = 100
const MAX_MODEL_LENGTH = 100
const MAX_ID_LENGTH = 100

// Valid agent statuses
const VALID_AGENT_STATUSES = ['online', 'offline', 'idle', 'busy', 'debating', 'error'] as const
type AgentStatus = typeof VALID_AGENT_STATUSES[number]

// Valid agent roles
const VALID_AGENT_ROLES = [
  'orchestrator', 'triad', 'interrogator', 'scout', 
  'guardian', 'artisan', 'visionary', 'diplomat', 'archivist'
] as const
type AgentRole = typeof VALID_AGENT_ROLES[number]

// Dangerous patterns for injection prevention
const DANGEROUS_PATTERNS = [
  /\$\s*where/i,
  /\$\s*gt/i,
  /\$\s*lt/i,
  /\$\s*regex/i,
  /javascript\s*:/i,
  /<\s*script/i,
  /on\w+\s*=/i,
  /union\s+select/i,
  /;\s*drop\s+table/i,
]

/**
 * Validate agent name
 */
function validateAgentName(name: unknown): { valid: boolean; error?: string; value?: string } {
  if (!name) {
    return { valid: false, error: 'Agent name is required' }
  }

  if (typeof name !== 'string') {
    return { valid: false, error: 'Agent name must be a string' }
  }

  const trimmedName = name.trim()

  if (trimmedName.length === 0) {
    return { valid: false, error: 'Agent name cannot be empty' }
  }

  if (trimmedName.length > MAX_NAME_LENGTH) {
    return { 
      valid: false, 
      error: `Agent name exceeds maximum length of ${MAX_NAME_LENGTH} characters` 
    }
  }

  // Only allow alphanumeric, spaces, hyphens, and underscores
  if (!/^[a-zA-Z0-9\s\-_]+$/.test(trimmedName)) {
    return { 
      valid: false, 
      error: 'Agent name can only contain letters, numbers, spaces, hyphens, and underscores' 
    }
  }

  // Check for dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(trimmedName)) {
      return { 
        valid: false, 
        error: 'Agent name contains invalid content' 
      }
    }
  }

  return { valid: true, value: trimmedName }
}

/**
 * Validate agent model
 */
function validateAgentModel(model: unknown): { valid: boolean; error?: string; value?: string } {
  if (!model) {
    return { valid: false, error: 'Model is required' }
  }

  if (typeof model !== 'string') {
    return { valid: false, error: 'Model must be a string' }
  }

  const trimmedModel = model.trim()

  if (trimmedModel.length === 0) {
    return { valid: false, error: 'Model cannot be empty' }
  }

  if (trimmedModel.length > MAX_MODEL_LENGTH) {
    return { 
      valid: false, 
      error: `Model exceeds maximum length of ${MAX_MODEL_LENGTH} characters` 
    }
  }

  // Check for dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(trimmedModel)) {
      return { 
        valid: false, 
        error: 'Model contains invalid content' 
      }
    }
  }

  return { valid: true, value: trimmedModel }
}

/**
 * Validate agent status
 */
function validateAgentStatus(status: unknown): { valid: boolean; error?: string; value?: AgentStatus } {
  if (!status) {
    return { valid: true } // Optional field
  }

  if (typeof status !== 'string') {
    return { valid: false, error: 'Status must be a string' }
  }

  const validStatus = VALID_AGENT_STATUSES.find(s => s === status)
  
  if (!validStatus) {
    return { 
      valid: false, 
      error: `Invalid status. Must be one of: ${VALID_AGENT_STATUSES.join(', ')}` 
    }
  }

  return { valid: true, value: validStatus }
}

/**
 * Validate agent role
 */
function validateAgentRole(role: unknown): { valid: boolean; error?: string; value?: AgentRole } {
  if (!role) {
    return { valid: true } // Optional field
  }

  if (typeof role !== 'string') {
    return { valid: false, error: 'Role must be a string' }
  }

  const validRole = VALID_AGENT_ROLES.find(r => r === role)
  
  if (!validRole) {
    return { 
      valid: false, 
      error: `Invalid role. Must be one of: ${VALID_AGENT_ROLES.join(', ')}` 
    }
  }

  return { valid: true, value: validRole }
}

/**
 * Validate agent ID
 */
function validateAgentId(id: unknown): { valid: boolean; error?: string; value?: string } {
  if (!id) {
    return { valid: false, error: 'Agent ID is required' }
  }

  if (typeof id !== 'string') {
    return { valid: false, error: 'Agent ID must be a string' }
  }

  const trimmedId = id.trim()

  if (trimmedId.length === 0) {
    return { valid: false, error: 'Agent ID cannot be empty' }
  }

  if (trimmedId.length > MAX_ID_LENGTH) {
    return { 
      valid: false, 
      error: `Agent ID exceeds maximum length of ${MAX_ID_LENGTH} characters` 
    }
  }

  // Only allow alphanumeric, hyphens, and underscores
  if (!/^[a-zA-Z0-9\-_]+$/.test(trimmedId)) {
    return { 
      valid: false, 
      error: 'Agent ID can only contain letters, numbers, hyphens, and underscores' 
    }
  }

  return { valid: true, value: trimmedId }
}

// Mock agent data - replace with actual Gateway API calls
const mockAgents = [
  {
    id: 'agent-001',
    name: 'Oracle',
    status: 'online' as const,
    model: 'gpt-4-turbo',
    memoryUsage: '256 MB',
    lastActive: new Date().toISOString(),
    websocketReadyState: 1,
  },
  {
    id: 'agent-002',
    name: 'Scribe',
    status: 'idle' as const,
    model: 'claude-3-opus',
    memoryUsage: '128 MB',
    lastActive: new Date().toISOString(),
    websocketReadyState: 1,
  },
  {
    id: 'agent-003',
    name: 'Architect',
    status: 'debating' as const,
    model: 'gpt-4-turbo',
    memoryUsage: '384 MB',
    lastActive: new Date().toISOString(),
    websocketReadyState: 1,
  },
]

export async function GET(request: NextRequest) {
  try {
    // TODO: Replace with actual Gateway API call
    // const response = await fetch(`${process.env.GATEWAY_URL}/agents`, {
    //   headers: { 'Authorization': `Bearer ${process.env.GATEWAY_API_KEY}` }
    // })
    
    return NextResponse.json({
      agents: mockAgents,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Failed to fetch agents:', error)
    return NextResponse.json(
      { error: 'Failed to fetch agents' },
      { status: 500 }
    )
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

    const { name, model, role } = body as Record<string, unknown>

    // Validate agent name
    const nameValidation = validateAgentName(name)
    if (!nameValidation.valid) {
      return NextResponse.json(
        { error: nameValidation.error },
        { status: 400 }
      )
    }

    // Validate agent model
    const modelValidation = validateAgentModel(model)
    if (!modelValidation.valid) {
      return NextResponse.json(
        { error: modelValidation.error },
        { status: 400 }
      )
    }

    // Validate agent role (optional)
    const roleValidation = validateAgentRole(role)
    if (!roleValidation.valid) {
      return NextResponse.json(
        { error: roleValidation.error },
        { status: 400 }
      )
    }

    // TODO: Replace with actual Gateway API call to deploy agent
    console.log('Deploying agent:', { 
      name: nameValidation.value, 
      model: modelValidation.value,
      role: roleValidation.value 
    })
    
    return NextResponse.json({
      success: true,
      message: 'Agent deployment initiated',
      agent: {
        name: nameValidation.value,
        model: modelValidation.value,
        role: roleValidation.value || null,
      },
    })
  } catch (error) {
    console.error('Failed to deploy agent:', error)
    return NextResponse.json(
      { error: 'Failed to deploy agent' },
      { status: 500 }
    )
  }
}
