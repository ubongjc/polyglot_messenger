/**
 * User Search and Discovery
 * GET /api/users/search?q=query&limit=10&offset=0
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/users/search
 * Search for users by username, name, or email
 */
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: 'Query must be at least 2 characters' },
        { status: 400 }
      );
    }

    // Search users by username, name, or email
    // Only show public users and exclude current user
    const users = await prisma.user.findMany({
      where: {
        AND: [
          {
            id: {
              not: currentUser.id, // Exclude current user
            },
          },
          {
            isPublic: true, // Only show public profiles
          },
          {
            OR: [
              {
                username: {
                  contains: query,
                  mode: 'insensitive',
                },
              },
              {
                name: {
                  contains: query,
                  mode: 'insensitive',
                },
              },
              {
                email: {
                  contains: query,
                  mode: 'insensitive',
                },
              },
            ],
          },
        ],
      },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        imageUrl: true,
        bio: true,
        lastSeenAt: true,
        isOnline: true,
      },
      take: limit,
      skip: offset,
      orderBy: [
        { isOnline: 'desc' }, // Online users first
        { lastSeenAt: 'desc' }, // Then by last seen
      ],
    });

    // Get total count for pagination
    const total = await prisma.user.count({
      where: {
        AND: [
          {
            id: {
              not: currentUser.id,
            },
          },
          {
            isPublic: true,
          },
          {
            OR: [
              {
                username: {
                  contains: query,
                  mode: 'insensitive',
                },
              },
              {
                name: {
                  contains: query,
                  mode: 'insensitive',
                },
              },
              {
                email: {
                  contains: query,
                  mode: 'insensitive',
                },
              },
            ],
          },
        ],
      },
    });

    return NextResponse.json({
      users,
      total,
      limit,
      offset,
      hasMore: offset + users.length < total,
    });
  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
