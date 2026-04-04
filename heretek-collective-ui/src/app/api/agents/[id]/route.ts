import { NextRequest, NextResponse } from 'next/server'

// Mock agent data
const mockAgents = [
  {
    id: 'agent-001',
    name: 'Oracle',
    status: 'online' as const,
    model: 'gpt-4-turbo',
    memoryUsage: '256 MB',
    lastActive: new Date().toISOString(),
  },
  {
    id: 'agent-002',
    name: 'Scribe',
    status: 'idle' as const,
    model: 'claude-3-opus',
    memoryUsage: '128 MB',
    lastActive: new Date().toISOString(),
  },
  {
    id: 'agent-003',
    name: 'Architect',
    status: 'debating' as const,
    model: 'gpt-4-turbo',
    memoryUsage: '384 MB',
    lastActive: new Date().toISOString(),
  },
]

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const agent = mockAgents.find((a) => a.id === params.id)
    
    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      )
    }
    
    // TODO: Replace with actual Gateway API call
    // const response = await fetch(`${process.env.GATEWAY_URL}/agents/${params.id}`, {
    //   headers: { 'Authorization': `Bearer ${process.env.GATEWAY_API_KEY}` }
    // })
    
    return NextResponse.json({ agent })
  } catch (error) {
    console.error('Failed to fetch agent:', error)
    return NextResponse.json(
      { error: 'Failed to fetch agent' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    
    // TODO: Replace with actual Gateway API call to update agent config
    console.log('Updating agent:', params.id, body)
    
    return NextResponse.json({
      success: true,
      message: 'Agent updated successfully',
    })
  } catch (error) {
    console.error('Failed to update agent:', error)
    return NextResponse.json(
      { error: 'Failed to update agent' },
      { status: 500 }
    )
  }
}
