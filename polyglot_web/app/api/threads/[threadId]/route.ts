import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

type RouteParams = {
  params: Promise<{ threadId: string }>;
};

/**
 * @openapi
 * /api/threads/{threadId}:
 *   get:
 *     summary: Get thread details
 *     description: Get a specific thread with messages
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: threadId
 *         required: true
 *         schema:
 *           type: string
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { userId: clerkId } = await auth();
    const { threadId } = await params;

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get thread and verify user is a participant
    const thread = await prisma.thread.findFirst({
      where: {
        id: threadId,
        participants: {
          some: {
            userId: user.id,
          },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                imageUrl: true,
              },
            },
          },
        },
        messages: {
          where: {
            deletedAt: null,
          },
          orderBy: {
            createdAt: 'asc',
          },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
              },
            },
            translations: true,
          },
        },
      },
    });

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    // Update last read timestamp
    await prisma.threadParticipant.updateMany({
      where: {
        threadId,
        userId: user.id,
      },
      data: {
        lastRead: new Date(),
      },
    });

    return NextResponse.json(thread);
  } catch (error) {
    console.error('Error fetching thread:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * @openapi
 * /api/threads/{threadId}:
 *   delete:
 *     summary: Delete thread (leave)
 *     description: Remove current user from thread
 *     security:
 *       - BearerAuth: []
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { userId: clerkId } = await auth();
    const { threadId } = await params;

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // SECURITY FIX (CRITICAL-001): Verify user is a participant before deletion
    const participant = await prisma.threadParticipant.findFirst({
      where: {
        threadId,
        userId: user.id,
      },
    });

    if (!participant) {
      return NextResponse.json(
        { error: 'Not a participant in this thread' },
        { status: 403 }
      );
    }

    // Remove user from thread participants
    await prisma.threadParticipant.delete({
      where: {
        id: participant.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting thread:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
