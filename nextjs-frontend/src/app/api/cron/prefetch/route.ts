import { NextResponse } from 'next/server';

/**
 * Cron job endpoint for Vercel Cron
 * Triggers the backend prefetch endpoint daily
 * Called by Vercel Cron at midnight UTC
 */
export async function GET(request: Request) {
  // Verify request is from Vercel Cron
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const backendUrl = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL;

  if (!backendUrl) {
    return NextResponse.json(
      { error: 'Backend URL not configured' },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      `${backendUrl}/api/admin/prefetch/trigger`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // 5 minute timeout for prefetch operation
        signal: AbortSignal.timeout(300000),
      }
    );

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      backend_response: data,
    });
  } catch (error) {
    console.error('Prefetch cron job failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
