/**
 * Contact Management
 * GET /api/contacts - Get user's contacts
 * POST /api/contacts - Add new contact (send friend request)
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createContactSchema = z.object({
  userId: z.string().cuid(),
  nickname: z.string().max(50).optional(),
});

/**
 * GET /api/contacts
 * Get all contacts for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status'); // Filter by status (PENDING, ACCEPTED, BLOCKED)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get contacts where user is either initiator or receiver
    const contacts = await prisma.contact.findMany({
      where: {
        AND: [
          {
            OR: [
              { initiatorId: user.id },
              { receiverId: user.id },
            ],
          },
          status ? { status: status as any } : {},
        ],
      },
      include: {
        initiator: {
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
            imageUrl: true,
            bio: true,
            isOnline: true,
            lastSeenAt: true,
          },
        },
        receiver: {
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
            imageUrl: true,
            bio: true,
            isOnline: true,
            lastSeenAt: true,
          },
        },
      },
      take: limit,
      skip: offset,
      orderBy: [
        { status: 'asc' }, // PENDING first, then ACCEPTED
        { updatedAt: 'desc' },
      ],
    });

    // Transform to show the "other" user in the contact
    const transformedContacts = contacts.map((contact) => {
      const isInitiator = contact.initiatorId === user.id;
      const otherUser = isInitiator ? contact.receiver : contact.initiator;

      return {
        id: contact.id,
        user: otherUser,
        nickname: contact.nickname,
        status: contact.status,
        isInitiator,
        createdAt: contact.createdAt,
        acceptedAt: contact.acceptedAt,
      };
    });

    const total = await prisma.contact.count({
      where: {
        AND: [
          {
            OR: [
              { initiatorId: user.id },
              { receiverId: user.id },
            ],
          },
          status ? { status: status as any } : {},
        ],
      },
    });

    return NextResponse.json({
      contacts: transformedContacts,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/contacts
 * Send a contact/friend request
 */
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const validation = createContactSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { userId: targetUserId, nickname } = validation.data;

    // Can't add yourself
    if (targetUserId === user.id) {
      return NextResponse.json(
        { error: 'Cannot add yourself as contact' },
        { status: 400 }
      );
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, isPublic: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Target user not found' },
        { status: 404 }
      );
    }

    if (!targetUser.isPublic) {
      return NextResponse.json(
        { error: 'User has disabled contact requests' },
        { status: 403 }
      );
    }

    // Check if contact already exists (either direction)
    const existingContact = await prisma.contact.findFirst({
      where: {
        OR: [
          { initiatorId: user.id, receiverId: targetUserId },
          { initiatorId: targetUserId, receiverId: user.id },
        ],
      },
    });

    if (existingContact) {
      return NextResponse.json(
        { error: 'Contact already exists', contact: existingContact },
        { status: 409 }
      );
    }

    // Create contact request
    const contact = await prisma.contact.create({
      data: {
        initiatorId: user.id,
        receiverId: targetUserId,
        nickname,
        status: 'PENDING',
      },
      include: {
        initiator: {
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
            imageUrl: true,
          },
        },
        receiver: {
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
            imageUrl: true,
          },
        },
      },
    });

    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    console.error('Error creating contact:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
