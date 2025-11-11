# Migration Guide

## Database Migration

To apply the database migration for the new features (disappearing messages, one-time view, voice messages):

```bash
cd polyglot_web

# Ensure you have a DATABASE_URL in .env
# Example: DATABASE_URL="postgresql://user:password@localhost:5432/polyglot_messenger"

# Apply the migration
npx prisma migrate deploy

# Or for development (generates Prisma client)
npx prisma migrate dev

# Generate Prisma client after migration
npx prisma generate
```

## Migration Details

**Migration Name**: `20251111140300_add_disappearing_one_time_voice_messages`

**Changes**:
- Added `Message` fields for disappearing messages:
  - `expiresAt` (DateTime, nullable)
  - `expiresInSeconds` (Int, nullable)

- Added `Message` fields for one-time view:
  - `isOneTimeView` (Boolean, default false)
  - `viewedAt` (DateTime, nullable)

- Added `Message` fields for voice messages:
  - `isVoiceMessage` (Boolean, default false)
  - `originalAudioUrl` (String, nullable)
  - `audioDurationMs` (Int, nullable)

- Created new `MessageView` table:
  - Tracks which users have viewed one-time messages
  - Unique constraint on (messageId, userId)

**Indexes Added**:
- `Message.expiresAt` - for efficient cleanup queries
- `Message(isOneTimeView, viewedAt)` - compound index for one-time view cleanup
- `MessageView.messageId` - for fast view lookups
- `MessageView.userId` - for user view history

## Rollback

If you need to rollback:

```bash
npx prisma migrate resolve --rolled-back 20251111140300_add_disappearing_one_time_voice_messages
```

Note: This will mark the migration as rolled back but won't undo database changes. You'll need to manually revert the schema.

## Post-Migration Setup

1. **Set up cron job** for message cleanup:
   ```bash
   # Add to crontab (every 5 minutes)
   */5 * * * * curl -X POST http://your-api-url/api/messages/cleanup \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```

2. **Update environment variables**:
   - Add `CRON_SECRET` to secure the cleanup endpoint

3. **Test the migration**:
   - Send a disappearing message
   - Send a one-time view message
   - Record a voice message
   - Verify database entries are correct
