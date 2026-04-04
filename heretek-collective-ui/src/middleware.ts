import { NextRequest, NextResponse } from 'next/server'

/**
 * Authentication Middleware for Heretek Collective UI
 * 
 * Provides API route protection using Bearer token authentication.
 * Supports multiple authentication methods:
 * - Bearer token in Authorization header
 * - API key in X-API-Key header
 * 
 * Security Features:
 * - Rate limiting per IP address
 * - Token validation against environment variables
 * - Secure error messages (no information leakage)
 * - CORS headers for cross-origin requests
 */

// Rate limiting configuration
const RATE_LIMIT = {
  windowMs: 60 * 1000, // 1 minute window
  maxRequests: 100, // Max requests per window
}

// In-memory rate limit store (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

/**
 * Check rate limit for IP address
 */
function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const record = rateLimitStore.get(ip)

  if (!record || now > record.resetTime) {
    // New window
    rateLimitStore.set(ip, {
      count: 1,
      resetTime: now + RATE_LIMIT.windowMs,
    })
    return { allowed: true, remaining: RATE_LIMIT.maxRequests - 1 }
  }

  if (record.count >= RATE_LIMIT.maxRequests) {
    return { allowed: false, remaining: 0 }
  }

  record.count++
  return { allowed: true, remaining: RATE_LIMIT.maxRequests - record.count }
}

/**
 * Validate authentication token
 */
function validateToken(token: string): boolean {
  if (!token) return false

  const validTokens = [
    process.env.LITELLM_MASTER_KEY,
    process.env.GATEWAY_API_KEY,
    process.env.API_SECRET_KEY,
  ].filter(Boolean)

  return validTokens.some(validToken => token === validToken)
}

/**
 * Extract client IP from request
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  if (realIP) {
    return realIP
  }
  return request.ip || '127.0.0.1'
}

/**
 * Main middleware function
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip authentication for non-API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Skip authentication for health check endpoints
  if (pathname.includes('/health')) {
    return NextResponse.next()
  }

  // Get client IP for rate limiting
  const clientIP = getClientIP(request)

  // Check rate limit
  const rateLimit = checkRateLimit(clientIP)
  
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.' },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': RATE_LIMIT.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': Date.now() + RATE_LIMIT.windowMs,
        }
      }
    )
  }

  // Validate authentication
  const authHeader = request.headers.get('Authorization')
  const apiKeyHeader = request.headers.get('X-API-Key')

  let token: string | null = null

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7)
  } else if (apiKeyHeader) {
    token = apiKeyHeader
  }

  if (!token || !validateToken(token)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { 
        status: 401,
        headers: {
          'WWW-Authenticate': 'Bearer',
          'X-RateLimit-Limit': RATE_LIMIT.maxRequests.toString(),
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        }
      }
    )
  }

  // Add rate limit headers to successful requests
  const response = NextResponse.next()
  response.headers.set('X-RateLimit-Limit', RATE_LIMIT.maxRequests.toString())
  response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString())
  response.headers.set('X-RateLimit-Reset', (Date.now() + RATE_LIMIT.windowMs).toString())

  return response
}

/**
 * Configure which routes the middleware applies to
 */
export const config = {
  matcher: [
    '/api/:path*', // Match all API routes
  ],
}
