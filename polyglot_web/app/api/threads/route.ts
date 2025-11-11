import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// SECURITY FIX (HIGH-010): Validate participant IDs as CUIDs
const createThreadSchema = z.object({
  participantUserIds: z.array(z.string().cuid()).min(1, 'At least one participant required'),
});

/**
 * @openapi
 * /api/threads:
 *   get:
 *     summary: List user's threads
 *     description: Get all threads for the authenticated user
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: List of threads
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 threads:
 *                   type: array
 *                 total:
 *                   type: integer
 */
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get threads where user is a participant
    const [threads, total] = await Promise.all([
      prisma.thread.findMany({
        where: {
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
            take: 1,
            orderBy: {
              createdAt: 'desc',
            },
            select: {
              id: true,
              ciphertext: true,
              iv: true,
              sourceLang: true,
              createdAt: true,
              sender: {
                select: {
                  id: true,
                  name: true,
                  imageUrl: true,
                },
              },
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      prisma.thread.count({
        where: {
          participants: {
            some: {
              userId: user.id,
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      threads,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching threads:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * @openapi
 * /api/threads:
 *   post:
 *     summary: Create a new thread
 *     description: Create a new conversation thread
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               participantUserIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Thread created
 *       400:
 *         description: Invalid request
 */
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const validation = createThreadSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { participantUserIds } = validation.data;

    // Ensure current user is included in participants
    const allParticipantIds = Array.from(
      new Set([user.id, ...participantUserIds])
    );

    // Verify all participants exist
    const participants = await prisma.user.findMany({
      where: {
        id: {
          in: allParticipantIds,
        },
      },
    });

    if (participants.length !== allParticipantIds.length) {
      return NextResponse.json(
        { error: 'One or more participants not found' },
        { status: 400 }
      );
    }

    // Create thread with participants
    const thread = await prisma.thread.create({
      data: {
        participants: {
          create: allParticipantIds.map((participantId) => ({
            userId: participantId,
          })),
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
      },
    });

    return NextResponse.json(thread, { status: 201 });
  } catch (error) {
    console.error('Error creating thread:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
