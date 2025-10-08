import { NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export async function GET() {
  try {
    // Check backend health
    const response = await fetch(`${BACKEND_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000), // 5 seconds timeout
    })

    if (!response.ok) {
      throw new Error(`Backend health check failed: ${response.status}`)
    }

    const backendHealth = await response.json()

    return NextResponse.json({
      status: 'OK',
      frontend: 'healthy',
      backend: backendHealth.status || 'unknown',
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    console.error('Health check failed:', error)

    return NextResponse.json(
      {
        status: 'ERROR',
        frontend: 'healthy',
        backend: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}