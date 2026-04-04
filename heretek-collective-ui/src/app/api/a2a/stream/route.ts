import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const encoder = new TextEncoder()

export async function GET(request: NextRequest) {
  const gatewayUrl = process.env.GATEWAY_URL || 'ws://localhost:18789'
  const apiKey = process.env.GATEWAY_API_KEY

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const headers: Record<string, string> = {}
        if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`

        const gatewayHttp = gatewayUrl.replace(/^ws/, 'http')
        // SKEP-08 FIX: Add server-side timeout (5 minutes) in addition to client abort signal
        const timeoutSignal = AbortSignal.timeout(300000)
        const abortController = new AbortController()
        
        // Combine client signal and server timeout
        request.signal.addEventListener('abort', () => abortController.abort())
        timeoutSignal.addEventListener('abort', () => abortController.abort())
        
        const response = await fetch(`${gatewayHttp}/a2a/stream`, {
          headers,
          signal: abortController.signal,
        })

        if (!response.ok || !response.body) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Gateway stream unavailable' })}\n\n`))
          controller.close()
          return
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          controller.enqueue(value)
        }

        controller.close()
      } catch (error) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Stream ended' })}\n\n`))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
