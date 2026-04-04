import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const gatewayUrl = process.env.GATEWAY_URL || 'http://localhost:18789'
    const apiKey = process.env.GATEWAY_API_KEY
    const headers: Record<string, string> = {}
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`

    const response = await fetch(`${gatewayUrl.replace(/^ws/, 'http')}/api/v1/skills/${params.id}`, {
      method: 'DELETE',
      headers,
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Skill uninstall failed', status: response.status },
        { status: 502 }
      )
    }

    return NextResponse.json({ success: true, message: `Skill ${params.id} uninstalled` })
  } catch (error) {
    console.error('Failed to uninstall skill:', error)
    return NextResponse.json(
      { error: 'Gateway unavailable' },
      { status: 503 }
    )
  }
}
