import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { calculateExpiresAt, validateExpiresInSeconds } from '@/lib/message-features';

type RouteParams = {
  params: Promise<{ threadId: string }>;
};

const createMessageSchema = z.object({
  ciphertext: z.string().min(1),
  iv: z.string().min(1),
  sourceLang: z.string().default('en'),
  // Disappearing messages
  expiresInSeconds: z.number().int().positive().optional(),
  // One-time view
  isOneTimeView: z.boolean().optional(),
  // Voice messages
  isVoiceMessage: z.boolean().optional(),
  originalAudioUrl: z.string().url().optional(),
  audioDurationMs: z.number().int().positive().optional(),
});

/**
 * @openapi
 * /api/threads/{threadId}/messages:
 *   post:
 *     summary: Send a message
 *     description: Create a new message in a thread (encrypted)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ciphertext:
 *                 type: string
 *               iv:
 *                 type: string
 *               sourceLang:
 *                 type: string
 */
export async function POST(
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

    // Verify user is participant
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

    const body = await request.json();
    const validation = createMessageSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const {
      ciphertext,
      iv,
      sourceLang,
      expiresInSeconds,
      isOneTimeView,
      isVoiceMessage,
      originalAudioUrl,
      audioDurationMs,
    } = validation.data;

    // Validate disappearing message duration if provided
    if (expiresInSeconds !== undefined && !validateExpiresInSeconds(expiresInSeconds)) {
      return NextResponse.json(
        { error: 'Invalid expiresInSeconds value. Must be between 1 and 604800 (7 days)' },
        { status: 400 }
      );
    }

    // Calculate expiration timestamp
    const expiresAt = expiresInSeconds ? calculateExpiresAt(expiresInSeconds) : undefined;

    // Create message
    const message = await prisma.message.create({
      data: {
        threadId,
        senderId: user.id,
        ciphertext,
        iv,
        sourceLang,
        // Disappearing messages
        expiresAt,
        expiresInSeconds,
        // One-time view
        isOneTimeView: isOneTimeView ?? false,
        // Voice messages
        isVoiceMessage: isVoiceMessage ?? false,
        originalAudioUrl,
        audioDurationMs,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
          },
        },
      },
    });

    // Update thread's updatedAt timestamp
    await prisma.thread.update({
      where: { id: threadId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error('Error creating message:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
