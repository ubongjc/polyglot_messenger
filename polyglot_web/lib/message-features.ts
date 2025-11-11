/**
 * Message Features Utilities
 * Handles disappearing messages, one-time view, and voice messages
 */

import { prisma } from './prisma';

export interface DisappearingMessageOptions {
  expiresInSeconds: number; // Duration in seconds (60, 3600, 86400, etc.)
}

export interface OneTimeViewOptions {
  isOneTimeView: boolean;
}

export interface VoiceMessageOptions {
  isVoiceMessage: boolean;
  originalAudioUrl?: string;
  audioDurationMs?: number;
}

/**
 * Calculate expiration timestamp for disappearing messages
 */
export function calculateExpiresAt(expiresInSeconds: number): Date {
  const now = new Date();
  return new Date(now.getTime() + expiresInSeconds * 1000);
}

/**
 * Mark a message as viewed by a user (for one-time view messages)
 * Returns true if this is the first view (message should be deleted)
 */
export async function markMessageAsViewed(
  messageId: string,
  userId: string
): Promise<{ isFirstView: boolean; shouldDelete: boolean }> {
  // Check if message is one-time view
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: {
      isOneTimeView: true,
      viewedAt: true,
      senderId: true,
      messageViews: {
        where: { userId },
      },
    },
  });

  if (!message) {
    throw new Error('Message not found');
  }

  // Don't track views for sender
  if (message.senderId === userId) {
    return { isFirstView: false, shouldDelete: false };
  }

  // Not a one-time view message
  if (!message.isOneTimeView) {
    return { isFirstView: false, shouldDelete: false };
  }

  // Already viewed by this user
  if (message.messageViews.length > 0) {
    return { isFirstView: false, shouldDelete: false };
  }

  // First view - mark it
  const isFirstViewEver = !message.viewedAt;

  await prisma.$transaction([
    // Record this user's view
    prisma.messageView.create({
      data: {
        messageId,
        userId,
      },
    }),
    // If this is the very first view, set viewedAt timestamp
    ...(isFirstViewEver
      ? [
          prisma.message.update({
            where: { id: messageId },
            data: { viewedAt: new Date() },
          }),
        ]
      : []),
  ]);

  return {
    isFirstView: isFirstViewEver,
    shouldDelete: isFirstViewEver, // Delete on first view
  };
}

/**
 * Delete expired and one-time viewed messages
 * Should be run as a cron job
 */
export async function cleanupExpiredMessages(): Promise<{
  expiredCount: number;
  oneTimeViewCount: number;
}> {
  const now = new Date();

  // Delete expired disappearing messages
  const expiredResult = await prisma.message.updateMany({
    where: {
      expiresAt: {
        lte: now,
      },
      deletedAt: null,
    },
    data: {
      deletedAt: now,
    },
  });

  // Delete one-time view messages that were viewed more than 5 minutes ago
  // (gives time for client to display "message deleted" state)
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  const oneTimeViewResult = await prisma.message.updateMany({
    where: {
      isOneTimeView: true,
      viewedAt: {
        lte: fiveMinutesAgo,
      },
      deletedAt: null,
    },
    data: {
      deletedAt: now,
    },
  });

  return {
    expiredCount: expiredResult.count,
    oneTimeViewCount: oneTimeViewResult.count,
  };
}

/**
 * Check if a message has expired
 */
export function isMessageExpired(message: {
  expiresAt: Date | null;
  deletedAt: Date | null;
}): boolean {
  if (message.deletedAt) return true;
  if (!message.expiresAt) return false;
  return new Date() > message.expiresAt;
}

/**
 * Check if a message should be hidden from a user (one-time view already seen)
 */
export async function shouldHideMessage(
  messageId: string,
  userId: string,
  message?: {
    isOneTimeView: boolean;
    senderId: string;
    deletedAt: Date | null;
  }
): Promise<boolean> {
  // If message is deleted, hide it
  if (message?.deletedAt) return true;

  // If not a one-time view, don't hide
  if (!message?.isOneTimeView) return false;

  // Don't hide from sender
  if (message.senderId === userId) return false;

  // Check if user has already viewed it
  const view = await prisma.messageView.findUnique({
    where: {
      messageId_userId: {
        messageId,
        userId,
      },
    },
  });

  return view !== null;
}

/**
 * Validate disappearing message duration
 */
export function validateExpiresInSeconds(seconds: number): boolean {
  // Common durations: 1 min, 5 min, 1 hour, 1 day, 1 week
  const validDurations = [
    60, // 1 minute
    300, // 5 minutes
    3600, // 1 hour
    86400, // 24 hours
    604800, // 7 days
  ];

  return validDurations.includes(seconds) || (seconds > 0 && seconds <= 604800);
}
