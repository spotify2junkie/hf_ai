import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')

    if (!date) {
      return NextResponse.json(
        { success: false, error: 'Date parameter is required' },
        { status: 400 }
      )
    }

    // Proxy the request to our backend
    const backendUrl = `${BACKEND_URL}/api/papers?date=${encodeURIComponent(date)}`

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Add timeout
      signal: AbortSignal.timeout(30000), // 30 seconds
    })

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`)
    }

    const data = await response.json()

    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400', // Cache for 5 minutes
      },
    })

  } catch (error) {
    console.error('API Error:', error)

    // Handle different types of errors
    if (error instanceof Error) {
      if (error.name === 'TimeoutError') {
        return NextResponse.json(
          { success: false, error: 'Request timeout - backend may be slow' },
          { status: 504 }
        )
      }

      if (error.message.includes('ECONNREFUSED')) {
        return NextResponse.json(
          { success: false, error: 'Backend server is not running' },
          { status: 503 }
        )
      }
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch papers from backend' },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}