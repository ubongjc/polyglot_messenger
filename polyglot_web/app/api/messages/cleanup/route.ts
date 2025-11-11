/**
 * Cleanup expired and one-time viewed messages
 * POST /api/messages/cleanup
 *
 * This endpoint should be called by a cron job periodically
 * (e.g., every 5 minutes)
 */

import { NextRequest, NextResponse } from 'next/server';
import { cleanupExpiredMessages } from '@/lib/message-features';

export async function POST(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    // You can add a secret token check here if needed
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await cleanupExpiredMessages();

    return NextResponse.json({
      success: true,
      expiredCount: result.expiredCount,
      oneTimeViewCount: result.oneTimeViewCount,
      totalCleaned: result.expiredCount + result.oneTimeViewCount,
    });
  } catch (error) {
    console.error('Error cleaning up messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Allow GET for manual testing (remove in production)
export async function GET(request: NextRequest) {
  return POST(request);
}
