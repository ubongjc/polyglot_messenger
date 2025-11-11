/**
 * Mark message as viewed (for one-time view messages)
 * POST /api/messages/:messageId/view
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { markMessageAsViewed } from '@/lib/message-features';

export async function POST(
  request: NextRequest,
  { params }: { params: { messageId: string } }
) {
  try {
    // Check authentication
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { messageId } = params;

    // Verify user has access to this message (is participant in the thread)
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: {
        thread: {
          select: {
            participants: {
              where: { userId: user.id },
            },
          },
        },
      },
    });

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (message.thread.participants.length === 0) {
      return NextResponse.json(
        { error: 'Not a participant in this thread' },
        { status: 403 }
      );
    }

    // Mark as viewed
    const result = await markMessageAsViewed(messageId, user.id);

    return NextResponse.json({
      success: true,
      isFirstView: result.isFirstView,
      shouldDelete: result.shouldDelete,
    });
  } catch (error) {
    console.error('Error marking message as viewed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
