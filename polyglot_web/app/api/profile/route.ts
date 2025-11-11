/**
 * User Profile Management
 * GET /api/profile - Get current user's profile
 * PUT /api/profile - Update current user's profile
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .optional(),
  bio: z.string().max(500).optional(),
  phoneNumber: z.string().max(20).optional(),
  imageUrl: z.string().url().optional(),
  isPublic: z.boolean().optional(),
});

/**
 * GET /api/profile
 * Get current user's profile
 */
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        bio: true,
        phoneNumber: true,
        imageUrl: true,
        role: true,
        isPublic: true,
        lastSeenAt: true,
        isOnline: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/profile
 * Update current user's profile
 */
export async function PUT(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true, username: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const validation = updateProfileSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { username, ...otherFields } = validation.data;

    // Check if username is taken (if changed)
    if (username && username !== user.username) {
      const existingUser = await prisma.user.findUnique({
        where: { username },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: 'Username already taken' },
          { status: 409 }
        );
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        username,
        ...otherFields,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        bio: true,
        phoneNumber: true,
        imageUrl: true,
        role: true,
        isPublic: true,
        lastSeenAt: true,
        isOnline: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
