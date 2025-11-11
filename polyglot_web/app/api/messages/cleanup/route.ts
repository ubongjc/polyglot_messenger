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
    // SECURITY FIX (HIGH-002): Make CRON_SECRET required
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      throw new Error('CRON_SECRET environment variable is required');
    }

    const authHeader = request.headers.get('authorization');

    if (authHeader !== `Bearer ${cronSecret}`) {
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

// SECURITY FIX (MEDIUM-003): Remove GET method to prevent CSRF
// GET method removed - use POST only with proper authentication
