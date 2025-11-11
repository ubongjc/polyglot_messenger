/**
 * Individual Contact Management
 * GET /api/contacts/:contactId - Get contact details
 * PUT /api/contacts/:contactId - Update contact (accept/reject/block/set nickname)
 * DELETE /api/contacts/:contactId - Delete contact
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

type RouteParams = {
  params: Promise<{ contactId: string }>;
};

const updateContactSchema = z.object({
  status: z.enum(['ACCEPTED', 'REJECTED', 'BLOCKED']).optional(),
  nickname: z.string().max(50).optional(),
});

/**
 * GET /api/contacts/:contactId
 * Get specific contact details
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { userId: clerkId } = await auth();
    const { contactId } = await params;

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

    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
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
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Verify user is part of this contact
    if (contact.initiatorId !== user.id && contact.receiverId !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to view this contact' },
        { status: 403 }
      );
    }

    return NextResponse.json(contact);
  } catch (error) {
    console.error('Error fetching contact:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/contacts/:contactId
 * Update contact (accept/reject/block request, set nickname)
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { userId: clerkId } = await auth();
    const { contactId } = await params;

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

    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Verify user is part of this contact
    if (contact.initiatorId !== user.id && contact.receiverId !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to modify this contact' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = updateContactSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { status, nickname } = validation.data;

    // Status changes can only be done by the receiver for PENDING requests
    if (status && contact.status === 'PENDING') {
      if (contact.receiverId !== user.id) {
        return NextResponse.json(
          { error: 'Only the receiver can accept/reject contact requests' },
          { status: 403 }
        );
      }

      // Update contact status
      const updatedContact = await prisma.contact.update({
        where: { id: contactId },
        data: {
          status,
          acceptedAt: status === 'ACCEPTED' ? new Date() : null,
          updatedAt: new Date(),
        },
        include: {
          initiator: {
            select: {
              id: true,
              username: true,
              name: true,
              imageUrl: true,
            },
          },
          receiver: {
            select: {
              id: true,
              username: true,
              name: true,
              imageUrl: true,
            },
          },
        },
      });

      return NextResponse.json(updatedContact);
    }

    // Nickname can be set by either party
    if (nickname !== undefined) {
      const updatedContact = await prisma.contact.update({
        where: { id: contactId },
        data: {
          nickname,
          updatedAt: new Date(),
        },
        include: {
          initiator: {
            select: {
              id: true,
              username: true,
              name: true,
              imageUrl: true,
            },
          },
          receiver: {
            select: {
              id: true,
              username: true,
              name: true,
              imageUrl: true,
            },
          },
        },
      });

      return NextResponse.json(updatedContact);
    }

    // BLOCKED status can be set by either party at any time
    if (status === 'BLOCKED') {
      const updatedContact = await prisma.contact.update({
        where: { id: contactId },
        data: {
          status: 'BLOCKED',
          updatedAt: new Date(),
        },
        include: {
          initiator: {
            select: {
              id: true,
              username: true,
              name: true,
              imageUrl: true,
            },
          },
          receiver: {
            select: {
              id: true,
              username: true,
              name: true,
              imageUrl: true,
            },
          },
        },
      });

      return NextResponse.json(updatedContact);
    }

    return NextResponse.json(
      { error: 'No valid updates provided' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating contact:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/contacts/:contactId
 * Delete/remove a contact
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { userId: clerkId } = await auth();
    const { contactId } = await params;

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

    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Verify user is part of this contact
    if (contact.initiatorId !== user.id && contact.receiverId !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to delete this contact' },
        { status: 403 }
      );
    }

    await prisma.contact.delete({
      where: { id: contactId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting contact:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
