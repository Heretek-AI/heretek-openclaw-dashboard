import { NextRequest, NextResponse } from 'next/server'

// Disable static generation for this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

const encoder = new TextEncoder()

export async function GET(request: NextRequest) {
  try {
    // Create a readable stream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        // Mock A2A messages - replace with actual WebSocket/Gateway stream
        const mockMessages = [
          {
            traceId: 'trace-001',
            from: 'agent-001',
            to: 'agent-002',
            type: 'query',
            content: { message: 'What is the current budget status?' },
            timestamp: new Date().toISOString(),
            latency: 45,
          },
          {
            traceId: 'trace-002',
            from: 'agent-002',
            to: 'agent-003',
            type: 'response',
            content: { message: 'Budget utilization at 67%' },
            timestamp: new Date().toISOString(),
            latency: 32,
          },
          {
            traceId: 'trace-003',
            from: 'agent-003',
            to: 'agent-001',
            type: 'decision',
            content: { message: 'Initiating cost optimization' },
            timestamp: new Date().toISOString(),
            latency: 28,
          },
        ]

        // Send messages periodically
        for (const message of mockMessages) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(message)}\n\n`)
          )
          await new Promise((resolve) => setTimeout(resolve, 2000))
        }

        // Keep connection open
        const keepAlive = setInterval(() => {
          controller.enqueue(encoder.encode(': keep-alive\n\n'))
        }, 30000)

        // Cleanup on close
        request.signal.addEventListener('abort', () => {
          clearInterval(keepAlive)
          controller.close()
        })
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Failed to create A2A stream:', error)
    return NextResponse.json(
      { error: 'Failed to create A2A stream' },
      { status: 500 }
    )
  }
}
