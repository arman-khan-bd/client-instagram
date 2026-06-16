const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Simple .env parser to get connection details outside Next.js process
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.substring(1, value.length - 1);
      }
      process.env[key] = value;
    }
  });
}

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.warn("Warning: DIRECT_URL or DATABASE_URL not found in environment or .env file. Skipping database migrations during build.");
  process.exit(0);
}

const client = new Client({ connectionString });

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA
// ─────────────────────────────────────────────────────────────────────────────
const schemaSql = `
-- ── User ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "User" (
  "id"           UUID        PRIMARY KEY,
  "username"     TEXT        UNIQUE NOT NULL,
  "email"        TEXT        UNIQUE NOT NULL,
  "passwordHash" TEXT,
  "fullName"     TEXT,
  "bio"          TEXT        DEFAULT 'Welcome to my profile! ✨',
  "avatarUrl"    TEXT,
  "isVerified"   BOOLEAN     DEFAULT FALSE,
  "role"         TEXT        DEFAULT 'user',
  "createdAt"    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Post ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Post" (
  "id"           SERIAL      PRIMARY KEY,
  "userId"       UUID        NOT NULL CONSTRAINT "Post_userId_fkey" REFERENCES "User"("id") ON DELETE CASCADE,
  "caption"      TEXT,
  "location"     TEXT,
  "mediaUrls"    JSONB       DEFAULT '[]'::jsonb,
  "thumbnailUrl" TEXT,
  "mobileUrl"    TEXT,
  "masterUrl"    TEXT,
  "createdAt"    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Like ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Like" (
  "id"        SERIAL      PRIMARY KEY,
  "userId"    UUID        NOT NULL CONSTRAINT "Like_userId_fkey"  REFERENCES "User"("id") ON DELETE CASCADE,
  "postId"    INTEGER     NOT NULL CONSTRAINT "Like_postId_fkey"  REFERENCES "Post"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT "Like_userId_postId_key" UNIQUE ("userId", "postId")
);

-- ── Comment ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Comment" (
  "id"        SERIAL      PRIMARY KEY,
  "userId"    UUID        NOT NULL CONSTRAINT "Comment_userId_fkey" REFERENCES "User"("id") ON DELETE CASCADE,
  "postId"    INTEGER     NOT NULL CONSTRAINT "Comment_postId_fkey" REFERENCES "Post"("id") ON DELETE CASCADE,
  "text"      TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE "Comment" ALTER COLUMN "text" DROP NOT NULL;
ALTER TABLE "Comment" ADD COLUMN IF NOT EXISTS "parentId"  INTEGER CONSTRAINT "Comment_parentId_fkey" REFERENCES "Comment"("id") ON DELETE CASCADE;
ALTER TABLE "Comment" ADD COLUMN IF NOT EXISTS "imageUrl"  TEXT;
ALTER TABLE "Comment" ADD COLUMN IF NOT EXISTS "emoji"     TEXT;

-- ── CommentLike ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "CommentLike" (
  "id"        SERIAL      PRIMARY KEY,
  "userId"    UUID        NOT NULL CONSTRAINT "CommentLike_userId_fkey"    REFERENCES "User"("id")    ON DELETE CASCADE,
  "commentId" INTEGER     NOT NULL CONSTRAINT "CommentLike_commentId_fkey" REFERENCES "Comment"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT "CommentLike_userId_commentId_key" UNIQUE ("userId", "commentId")
);

-- ── Share ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Share" (
  "id"        SERIAL      PRIMARY KEY,
  "userId"    UUID        CONSTRAINT "Share_userId_fkey" REFERENCES "User"("id") ON DELETE CASCADE,
  "postId"    INTEGER     NOT NULL CONSTRAINT "Share_postId_fkey" REFERENCES "Post"("id") ON DELETE CASCADE,
  "sharedTo"  TEXT        DEFAULT 'external',
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- ── Save ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Save" (
  "id"        SERIAL      PRIMARY KEY,
  "userId"    UUID        NOT NULL CONSTRAINT "Save_userId_fkey"  REFERENCES "User"("id") ON DELETE CASCADE,
  "postId"    INTEGER     NOT NULL CONSTRAINT "Save_postId_fkey"  REFERENCES "Post"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT "Save_userId_postId_key" UNIQUE ("userId", "postId")
);

-- ── Follow ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Follow" (
  "id"          SERIAL      PRIMARY KEY,
  "followerId"  UUID        NOT NULL CONSTRAINT "Follow_followerId_fkey"  REFERENCES "User"("id") ON DELETE CASCADE,
  "followingId" UUID        NOT NULL CONSTRAINT "Follow_followingId_fkey" REFERENCES "User"("id") ON DELETE CASCADE,
  "createdAt"   TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT "Follow_followerId_followingId_key" UNIQUE ("followerId", "followingId")
);

-- ── Message (Cleanup old table) ──────────────────────────────────────────────
DROP TABLE IF EXISTS "Message" CASCADE;

-- ── Conversation ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Conversation" (
  "id"           SERIAL      PRIMARY KEY,
  "name"         TEXT,
  "avatarUrl"    TEXT,
  "isGroup"      BOOLEAN     DEFAULT FALSE,
  "createdBy"    UUID        CONSTRAINT "Conversation_createdBy_fkey" REFERENCES "User"("id") ON DELETE SET NULL,
  "createdAt"    TIMESTAMPTZ DEFAULT NOW()
);

-- ── ConversationParticipant ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ConversationParticipant" (
  "id"             SERIAL      PRIMARY KEY,
  "conversationId" INTEGER     NOT NULL CONSTRAINT "Participant_conversationId_fkey" REFERENCES "Conversation"("id") ON DELETE CASCADE,
  "userId"         UUID        NOT NULL CONSTRAINT "Participant_userId_fkey"         REFERENCES "User"("id")         ON DELETE CASCADE,
  "joinedAt"       TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT "Participant_conversationId_userId_key" UNIQUE ("conversationId", "userId")
);

-- ── Message ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Message" (
  "id"             SERIAL      PRIMARY KEY,
  "conversationId" INTEGER     NOT NULL CONSTRAINT "Message_conversationId_fkey" REFERENCES "Conversation"("id") ON DELETE CASCADE,
  "senderId"       UUID        NOT NULL CONSTRAINT "Message_senderId_fkey"       REFERENCES "User"("id")         ON DELETE CASCADE,
  "text"           TEXT,
  "mediaUrl"       TEXT,
  "mediaType"      TEXT,
  "replyToId"      INTEGER     CONSTRAINT "Message_replyToId_fkey"       REFERENCES "Message"("id")      ON DELETE SET NULL,
  "reactions"      JSONB       DEFAULT '{}'::jsonb,
  "isEdited"       BOOLEAN     DEFAULT FALSE,
  "status"         TEXT        DEFAULT 'SENT',
  "createdAt"      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Reaction ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Reaction" (
  "id"        SERIAL      PRIMARY KEY,
  "userId"    UUID        NOT NULL CONSTRAINT "Reaction_userId_fkey" REFERENCES "User"("id") ON DELETE CASCADE,
  "postId"    INTEGER     NOT NULL CONSTRAINT "Reaction_postId_fkey" REFERENCES "Post"("id") ON DELETE CASCADE,
  "type"      TEXT        NOT NULL DEFAULT 'love',
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT "Reaction_userId_postId_key" UNIQUE ("userId", "postId")
);

-- ── Story ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Story" (
  "id"        SERIAL      PRIMARY KEY,
  "userId"    UUID        NOT NULL CONSTRAINT "Story_userId_fkey" REFERENCES "User"("id") ON DELETE CASCADE,
  "mediaUrl"  TEXT        NOT NULL DEFAULT '',
  "mediaType" TEXT        NOT NULL DEFAULT 'image',
  "caption"   TEXT        DEFAULT '',
  "bgColor"   TEXT        DEFAULT '',
  "viewCount" INTEGER     DEFAULT 0,
  "expiresAt" TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- ── Auto-create User profile on auth signup ───────────────────────────────────
-- This trigger runs as SECURITY DEFINER (superuser), bypassing RLS,
-- so the row is always created even if the client session isn't ready yet.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _username  TEXT;
  _full_name TEXT;
BEGIN
  -- Extract from user_metadata (set by api.register) or fall back to email prefix
  _username  := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1),
    'user_' || substr(NEW.id::text, 1, 8)
  );
  _full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'fullName',
    _username
  );

  -- Upsert so re-runs are idempotent
  INSERT INTO "User" (
    "id", "username", "email", "fullName",
    "avatarUrl", "passwordHash", "bio", "isVerified", "createdAt"
  )
  VALUES (
    NEW.id,
    regexp_replace(_username, '[^a-zA-Z0-9_.]', '_', 'g'),
    COALESCE(NEW.email, ''),
    _full_name,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    '',
    'Welcome to AuraGram! ✨',
    FALSE,
    NOW()
  )
  ON CONFLICT ("id") DO NOTHING;

  RETURN NEW;
END;
$$;

-- Drop old trigger if exists, then recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ── Post Custom Updates ───────────────────────────────────────────────────────
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "isAdult" BOOLEAN DEFAULT FALSE;
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "isAdultUnmarked" BOOLEAN DEFAULT FALSE;
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "originalPostId" INTEGER CONSTRAINT "Post_originalPostId_fkey" REFERENCES "Post"("id") ON DELETE SET NULL;

-- ── Post Category update ──────────────────────────────────────────────────────
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "category" TEXT DEFAULT 'personal';

-- ── UserSearchHistory ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "UserSearchHistory" (
  "id"        SERIAL      PRIMARY KEY,
  "userId"    UUID        NOT NULL CONSTRAINT "SearchHistory_userId_fkey" REFERENCES "User"("id") ON DELETE CASCADE,
  "query"     TEXT        NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- ── VideoWatchLog ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "VideoWatchLog" (
  "id"        SERIAL      PRIMARY KEY,
  "userId"    UUID        NOT NULL CONSTRAINT "WatchLog_userId_fkey" REFERENCES "User"("id") ON DELETE CASCADE,
  "postId"    INTEGER     NOT NULL CONSTRAINT "WatchLog_postId_fkey" REFERENCES "Post"("id") ON DELETE CASCADE,
  "duration"  DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- ── VideoUnmuteLog ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "VideoUnmuteLog" (
  "id"        SERIAL      PRIMARY KEY,
  "userId"    UUID        NOT NULL CONSTRAINT "UnmuteLog_userId_fkey" REFERENCES "User"("id") ON DELETE CASCADE,
  "postId"    INTEGER     NOT NULL CONSTRAINT "UnmuteLog_postId_fkey" REFERENCES "Post"("id") ON DELETE CASCADE,
  "videoType" TEXT        NOT NULL DEFAULT 'feed',
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- ── Message Custom Updates ────────────────────────────────────────────────────
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMPTZ;

-- ── Story Custom Updates ──────────────────────────────────────────────────────
ALTER TABLE "Story" ADD COLUMN IF NOT EXISTS "audioUrl" TEXT;
ALTER TABLE "Story" ADD COLUMN IF NOT EXISTS "musicName" TEXT;
ALTER TABLE "Story" ADD COLUMN IF NOT EXISTS "metadata" JSONB DEFAULT '{}'::jsonb;

-- ── StoryInteraction ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "StoryInteraction" (
  "id"        SERIAL      PRIMARY KEY,
  "storyId"   INTEGER     NOT NULL CONSTRAINT "StoryInteraction_storyId_fkey" REFERENCES "Story"("id") ON DELETE CASCADE,
  "userId"    UUID        NOT NULL CONSTRAINT "StoryInteraction_userId_fkey" REFERENCES "User"("id") ON DELETE CASCADE,
  "type"      TEXT        NOT NULL, -- 'view', 'like', 'message', 'reaction'
  "value"     TEXT,                 -- emoji sticker / custom message / reaction
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- ── Notification ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Notification" (
  "id"           SERIAL      PRIMARY KEY,
  "type"         TEXT        NOT NULL,
  "notifierId"   UUID        NOT NULL CONSTRAINT "Notification_notifierId_fkey" REFERENCES "User"("id") ON DELETE CASCADE,
  "receiverId"   UUID        NOT NULL CONSTRAINT "Notification_receiverId_fkey" REFERENCES "User"("id") ON DELETE CASCADE,
  "postId"       INTEGER     CONSTRAINT "Notification_postId_fkey" REFERENCES "Post"("id") ON DELETE CASCADE,
  "storyId"      INTEGER     CONSTRAINT "Notification_storyId_fkey" REFERENCES "Story"("id") ON DELETE CASCADE,
  "text"         TEXT,
  "unread"       BOOLEAN     DEFAULT TRUE,
  "createdAt"    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Report ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Report" (
  "id"           SERIAL      PRIMARY KEY,
  "reporterId"   UUID        NOT NULL CONSTRAINT "Report_reporterId_fkey" REFERENCES "User"("id") ON DELETE CASCADE,
  "postId"       INTEGER     CONSTRAINT "Report_postId_fkey" REFERENCES "Post"("id") ON DELETE CASCADE,
  "commentId"    INTEGER     CONSTRAINT "Report_commentId_fkey" REFERENCES "Comment"("id") ON DELETE CASCADE,
  "reason"       TEXT        NOT NULL,
  "status"       TEXT        DEFAULT 'pending',
  "createdAt"    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Extended User Profile Fields ──────────────────────────────────────────────
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "education"   TEXT    DEFAULT '';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "work"        TEXT    DEFAULT '';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "city"        TEXT    DEFAULT '';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "country"     TEXT    DEFAULT '';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "hometown"    TEXT    DEFAULT '';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone"       TEXT    DEFAULT '';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "hobbies"     TEXT    DEFAULT '';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "interests"   TEXT    DEFAULT '';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "coverPhoto"  TEXT    DEFAULT '';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "website"     TEXT    DEFAULT '';

-- ── Settings and Privacy Fields ──
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "private_profile" BOOLEAN DEFAULT FALSE;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "private_stories" BOOLEAN DEFAULT FALSE;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "private_reels"   BOOLEAN DEFAULT FALSE;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "private_days"    BOOLEAN DEFAULT FALSE;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "theme"           TEXT    DEFAULT 'dark';

-- ── FollowRequest ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "FollowRequest" (
  "id"           SERIAL      PRIMARY KEY,
  "senderId"     UUID        NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "receiverId"   UUID        NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "createdAt"    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE("senderId", "receiverId")
);

-- ── TvChannel ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "TvChannel" (
  "id"           SERIAL      PRIMARY KEY,
  "name"         TEXT        NOT NULL,
  "url"          TEXT        NOT NULL,
  "category"     TEXT        DEFAULT 'General',
  "logoUrl"      TEXT        DEFAULT '',
  "createdAt"    TIMESTAMPTZ DEFAULT NOW()
);
`;

// ─────────────────────────────────────────────────────────────────────────────
// ROW LEVEL SECURITY
// Each statement is run independently so an "already exists" error on a policy
// doesn't abort the whole migration.
// ─────────────────────────────────────────────────────────────────────────────
const rlsStatements = [

  // ── Enable RLS on every table ──────────────────────────────────────────────
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" TEXT DEFAULT 'user'`,
  `UPDATE "User" SET "role" = 'admin' WHERE "email" ILIKE '%admin%' OR "username" ILIKE '%admin%'`,
  `ALTER TABLE "User"                    ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "Post"                    ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "Like"                    ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "Comment"                 ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "CommentLike"             ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "Share"                   ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "Save"                    ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "Follow"                  ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "Message"                 ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "Reaction"                ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "Notification"            ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "Report"                  ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "Conversation"            ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "ConversationParticipant" ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "UserSearchHistory"       ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "VideoWatchLog"           ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "VideoUnmuteLog"          ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "FollowRequest"           ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "TvChannel"               ENABLE ROW LEVEL SECURITY`,

  // ── Force RLS even for table owners / superusers (extra safety) ────────────
  `ALTER TABLE "User"                    FORCE ROW LEVEL SECURITY`,
  `ALTER TABLE "Post"                    FORCE ROW LEVEL SECURITY`,
  `ALTER TABLE "Like"                    FORCE ROW LEVEL SECURITY`,
  `ALTER TABLE "Comment"                 FORCE ROW LEVEL SECURITY`,
  `ALTER TABLE "CommentLike"             FORCE ROW LEVEL SECURITY`,
  `ALTER TABLE "Share"                   FORCE ROW LEVEL SECURITY`,
  `ALTER TABLE "Save"                    FORCE ROW LEVEL SECURITY`,
  `ALTER TABLE "Follow"                  FORCE ROW LEVEL SECURITY`,
  `ALTER TABLE "Message"                 FORCE ROW LEVEL SECURITY`,
  `ALTER TABLE "Reaction"                FORCE ROW LEVEL SECURITY`,
  `ALTER TABLE "Notification"            FORCE ROW LEVEL SECURITY`,
  `ALTER TABLE "Report"                  FORCE ROW LEVEL SECURITY`,
  `ALTER TABLE "Conversation"            FORCE ROW LEVEL SECURITY`,
  `ALTER TABLE "ConversationParticipant" FORCE ROW LEVEL SECURITY`,
  `ALTER TABLE "UserSearchHistory"       FORCE ROW LEVEL SECURITY`,
  `ALTER TABLE "VideoWatchLog"           FORCE ROW LEVEL SECURITY`,
  `ALTER TABLE "VideoUnmuteLog"          FORCE ROW LEVEL SECURITY`,
  `ALTER TABLE "FollowRequest"           FORCE ROW LEVEL SECURITY`,
  `ALTER TABLE "TvChannel"               FORCE ROW LEVEL SECURITY`,

  // ════════════════════════════════════════════════════════════════════════════
  // User table
  //   • Anyone (incl. anon) can read public profiles
  //   • Only the authenticated owner can update their own row
  //   • Supabase Auth trigger / service-role inserts the row on signup
  // ════════════════════════════════════════════════════════════════════════════
  `DROP POLICY IF EXISTS "User: public read"        ON "User"`,
  `DROP POLICY IF EXISTS "User: owner update"       ON "User"`,
  `DROP POLICY IF EXISTS "User: service role insert" ON "User"`,

  `CREATE POLICY "User: public read"
     ON "User" FOR SELECT
     USING (true)`,

  `CREATE POLICY "User: owner update"
     ON "User" FOR UPDATE
     USING  (auth.uid() = "id")
     WITH CHECK (auth.uid() = "id")`,

  // Allow authenticated users (and service role via migrate) to create a row
  // for themselves immediately after sign-up.
  `CREATE POLICY "User: self insert"
     ON "User" FOR INSERT
     WITH CHECK (auth.uid() = "id")`,

  // ════════════════════════════════════════════════════════════════════════════
  // Post table
  //   • Anyone can read posts
  //   • Only the post owner can create / update / delete
  // ════════════════════════════════════════════════════════════════════════════
  `DROP POLICY IF EXISTS "Post: public read"   ON "Post"`,
  `DROP POLICY IF EXISTS "Post: owner insert"  ON "Post"`,
  `DROP POLICY IF EXISTS "Post: owner update"  ON "Post"`,
  `DROP POLICY IF EXISTS "Post: owner delete"  ON "Post"`,

  `CREATE POLICY "Post: public read"
     ON "Post" FOR SELECT
     USING (true)`,

  `CREATE POLICY "Post: owner insert"
     ON "Post" FOR INSERT
     WITH CHECK (auth.uid() = "userId")`,

  `CREATE POLICY "Post: owner update"
     ON "Post" FOR UPDATE
     USING  (auth.uid() = "userId")
     WITH CHECK (auth.uid() = "userId")`,

  `CREATE POLICY "Post: owner delete"
     ON "Post" FOR DELETE
     USING (auth.uid() = "userId")`,

  // ════════════════════════════════════════════════════════════════════════════
  // Like table
  //   • Anyone can read likes (counts, check existence)
  //   • Only authenticated users can insert their own like
  //   • Only the like owner can delete
  // ════════════════════════════════════════════════════════════════════════════
  `DROP POLICY IF EXISTS "Like: public read"   ON "Like"`,
  `DROP POLICY IF EXISTS "Like: auth insert"   ON "Like"`,
  `DROP POLICY IF EXISTS "Like: owner delete"  ON "Like"`,

  `CREATE POLICY "Like: public read"
     ON "Like" FOR SELECT
     USING (true)`,

  `CREATE POLICY "Like: auth insert"
     ON "Like" FOR INSERT
     WITH CHECK (auth.uid() = "userId")`,

  `CREATE POLICY "Like: owner delete"
     ON "Like" FOR DELETE
     USING (auth.uid() = "userId")`,

  // ════════════════════════════════════════════════════════════════════════════
  // Comment table
  //   • Anyone can read comments
  //   • Authenticated users can insert their own comments
  //   • Only the comment owner can update or delete
  // ════════════════════════════════════════════════════════════════════════════
  `DROP POLICY IF EXISTS "Comment: public read"   ON "Comment"`,
  `DROP POLICY IF EXISTS "Comment: auth insert"   ON "Comment"`,
  `DROP POLICY IF EXISTS "Comment: owner update"  ON "Comment"`,
  `DROP POLICY IF EXISTS "Comment: owner delete"  ON "Comment"`,

  `CREATE POLICY "Comment: public read"
     ON "Comment" FOR SELECT
     USING (true)`,

  `CREATE POLICY "Comment: auth insert"
     ON "Comment" FOR INSERT
     WITH CHECK (auth.uid() = "userId")`,

  `CREATE POLICY "Comment: owner update"
     ON "Comment" FOR UPDATE
     USING  (auth.uid() = "userId")
     WITH CHECK (auth.uid() = "userId")`,

  `CREATE POLICY "Comment: owner delete"
     ON "Comment" FOR DELETE
     USING (auth.uid() = "userId")`,

  // ════════════════════════════════════════════════════════════════════════════
  // CommentLike table
  //   • Anyone can read (for like counts)
  //   • Authenticated users insert their own likes
  //   • Owner can delete
  // ════════════════════════════════════════════════════════════════════════════
  `DROP POLICY IF EXISTS "CommentLike: public read"  ON "CommentLike"`,
  `DROP POLICY IF EXISTS "CommentLike: auth insert"  ON "CommentLike"`,
  `DROP POLICY IF EXISTS "CommentLike: owner delete" ON "CommentLike"`,

  `CREATE POLICY "CommentLike: public read"
     ON "CommentLike" FOR SELECT
     USING (true)`,

  `CREATE POLICY "CommentLike: auth insert"
     ON "CommentLike" FOR INSERT
     WITH CHECK (auth.uid() = "userId")`,

  `CREATE POLICY "CommentLike: owner delete"
     ON "CommentLike" FOR DELETE
     USING (auth.uid() = "userId")`,

  // ════════════════════════════════════════════════════════════════════════════
  // Share table
  //   • Only the sharer can read their own shares
  //   • Authenticated users can record a share
  //   • Owner can delete
  // ════════════════════════════════════════════════════════════════════════════
  `DROP POLICY IF EXISTS "Share: owner read"   ON "Share"`,
  `DROP POLICY IF EXISTS "Share: auth insert"  ON "Share"`,
  `DROP POLICY IF EXISTS "Share: owner delete" ON "Share"`,

  `CREATE POLICY "Share: owner read"
     ON "Share" FOR SELECT
     USING (auth.uid() = "userId")`,

  `CREATE POLICY "Share: auth insert"
     ON "Share" FOR INSERT
     WITH CHECK (auth.uid() = "userId" OR "userId" IS NULL)`,

  `CREATE POLICY "Share: owner delete"
     ON "Share" FOR DELETE
     USING (auth.uid() = "userId")`,

  // ════════════════════════════════════════════════════════════════════════════
  // Save table
  //   • Only the saver can read their saved posts
  //   • Authenticated users insert their own saves
  //   • Owner can delete
  // ════════════════════════════════════════════════════════════════════════════
  `DROP POLICY IF EXISTS "Save: owner read"   ON "Save"`,
  `DROP POLICY IF EXISTS "Save: auth insert"  ON "Save"`,
  `DROP POLICY IF EXISTS "Save: owner delete" ON "Save"`,

  `CREATE POLICY "Save: owner read"
     ON "Save" FOR SELECT
     USING (auth.uid() = "userId")`,

  `CREATE POLICY "Save: auth insert"
     ON "Save" FOR INSERT
     WITH CHECK (auth.uid() = "userId")`,

  `CREATE POLICY "Save: owner delete"
     ON "Save" FOR DELETE
     USING (auth.uid() = "userId")`,

  // ════════════════════════════════════════════════════════════════════════════
  // Follow table
  //   • Anyone can read follow relationships (needed for follower counts)
  //   • Authenticated users can follow (insert their own row)
  //   • Only the follower can unfollow (delete)
  //   • No updates allowed (follow/unfollow is delete+insert)
  // ════════════════════════════════════════════════════════════════════════════
  `DROP POLICY IF EXISTS "Follow: public read"   ON "Follow"`,
  `DROP POLICY IF EXISTS "Follow: auth insert"   ON "Follow"`,
  `DROP POLICY IF EXISTS "Follow: owner delete"  ON "Follow"`,

  `CREATE POLICY "Follow: public read"
     ON "Follow" FOR SELECT
     USING (true)`,

  `CREATE POLICY "Follow: auth insert"
     ON "Follow" FOR INSERT
     WITH CHECK (auth.uid() = "followerId")`,

  `CREATE POLICY "Follow: owner delete"
     ON "Follow" FOR DELETE
     USING (auth.uid() = "followerId")`,

  // ════════════════════════════════════════════════════════════════════════════
  // Conversation, ConversationParticipant, and Message tables
  // ════════════════════════════════════════════════════════════════════════════
  `DROP POLICY IF EXISTS "Conversation: participant select" ON "Conversation"`,
  `DROP POLICY IF EXISTS "Conversation: auth insert" ON "Conversation"`,
  `DROP POLICY IF EXISTS "Conversation: participant update" ON "Conversation"`,
  `DROP POLICY IF EXISTS "ConversationParticipant: select" ON "ConversationParticipant"`,
  `DROP POLICY IF EXISTS "ConversationParticipant: insert" ON "ConversationParticipant"`,
  `DROP POLICY IF EXISTS "ConversationParticipant: delete" ON "ConversationParticipant"`,
  `DROP POLICY IF EXISTS "Message: participant select" ON "Message"`,
  `DROP POLICY IF EXISTS "Message: participant insert" ON "Message"`,
  `DROP POLICY IF EXISTS "Message: participant update" ON "Message"`,
  `DROP POLICY IF EXISTS "Message: sender delete" ON "Message"`,

  `CREATE POLICY "Conversation: participant select" ON "Conversation" FOR SELECT USING (
    "createdBy" = auth.uid() OR EXISTS (
      SELECT 1 FROM "ConversationParticipant" cp
      WHERE cp."conversationId" = id AND cp."userId" = auth.uid()
    )
  )`,
  `CREATE POLICY "Conversation: auth insert" ON "Conversation" FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  )`,
  `CREATE POLICY "Conversation: participant update" ON "Conversation" FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM "ConversationParticipant" cp
      WHERE cp."conversationId" = id AND cp."userId" = auth.uid()
    )
  )`,

  `CREATE POLICY "ConversationParticipant: select" ON "ConversationParticipant" FOR SELECT USING (
    auth.uid() IS NOT NULL
  )`,
  `CREATE POLICY "ConversationParticipant: insert" ON "ConversationParticipant" FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  )`,
  `CREATE POLICY "ConversationParticipant: delete" ON "ConversationParticipant" FOR DELETE USING (
    "userId" = auth.uid() OR EXISTS (
      SELECT 1 FROM "Conversation" c
      WHERE c.id = "conversationId" AND c."createdBy" = auth.uid()
    )
  )`,

  `CREATE POLICY "Message: participant select" ON "Message" FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "ConversationParticipant" cp
      WHERE cp."conversationId" = "conversationId" AND cp."userId" = auth.uid()
    )
  )`,
  `CREATE POLICY "Message: participant insert" ON "Message" FOR INSERT WITH CHECK (
    auth.uid() = "senderId" AND EXISTS (
      SELECT 1 FROM "ConversationParticipant" cp
      WHERE cp."conversationId" = "conversationId" AND cp."userId" = auth.uid()
    )
  )`,
  `CREATE POLICY "Message: participant update" ON "Message" FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM "ConversationParticipant" cp
      WHERE cp."conversationId" = "conversationId" AND cp."userId" = auth.uid()
    )
  )`,
  `CREATE POLICY "Message: sender delete" ON "Message" FOR DELETE USING (
    auth.uid() = "senderId"
  )`,

  // ════════════════════════════════════════════════════════════════════════════
  // Reaction table
  //   • Anyone can read reactions (needed for counts / display)
  //   • Authenticated users insert their own reaction
  //   • Owner can update (change reaction type) or delete (remove reaction)
  // ════════════════════════════════════════════════════════════════════════════
  `DROP POLICY IF EXISTS "Reaction: public read"   ON "Reaction"`,
  `DROP POLICY IF EXISTS "Reaction: auth insert"   ON "Reaction"`,
  `DROP POLICY IF EXISTS "Reaction: owner update"  ON "Reaction"`,
  `DROP POLICY IF EXISTS "Reaction: owner delete"  ON "Reaction"`,

  `CREATE POLICY "Reaction: public read"
     ON "Reaction" FOR SELECT
     USING (true)`,

  `CREATE POLICY "Reaction: auth insert"
     ON "Reaction" FOR INSERT
     WITH CHECK (auth.uid() = "userId")`,

  `CREATE POLICY "Reaction: owner update"
     ON "Reaction" FOR UPDATE
     USING  (auth.uid() = "userId")
     WITH CHECK (auth.uid() = "userId")`,

  `CREATE POLICY "Reaction: owner delete"
     ON "Reaction" FOR DELETE
     USING (auth.uid() = "userId")`,

  // ════════════════════════════════════════════════════════════════════════════
  // Story table
  //   • Authenticated users can read all non-expired stories
  //   • Only the story owner can insert / delete
  // ════════════════════════════════════════════════════════════════════════════
  `ALTER TABLE "Story" ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "Story" FORCE ROW LEVEL SECURITY`,

  `DROP POLICY IF EXISTS "Story: auth read"    ON "Story"`,
  `DROP POLICY IF EXISTS "Story: owner insert" ON "Story"`,
  `DROP POLICY IF EXISTS "Story: owner delete" ON "Story"`,

  `CREATE POLICY "Story: auth read"
     ON "Story" FOR SELECT
     USING (auth.uid() IS NOT NULL)`,

  `CREATE POLICY "Story: owner insert"
     ON "Story" FOR INSERT
     WITH CHECK (auth.uid() = "userId")`,

  `CREATE POLICY "Story: owner delete"
     ON "Story" FOR DELETE
     USING (auth.uid() = "userId")`,

  // ── StoryInteraction Table RLS ──────────────────────────────────────────────
  `ALTER TABLE "StoryInteraction" ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "StoryInteraction" FORCE ROW LEVEL SECURITY`,

  `DROP POLICY IF EXISTS "StoryInteraction: select" ON "StoryInteraction"`,
  `DROP POLICY IF EXISTS "StoryInteraction: insert" ON "StoryInteraction"`,

  `CREATE POLICY "StoryInteraction: select"
     ON "StoryInteraction" FOR SELECT
     USING ("userId" = auth.uid() OR EXISTS (SELECT 1 FROM "Story" WHERE "Story".id = "StoryInteraction"."storyId" AND "Story"."userId" = auth.uid()))`,

  `CREATE POLICY "StoryInteraction: insert"
     ON "StoryInteraction" FOR INSERT
     WITH CHECK (auth.uid() = "userId")`,

  // ── Notification Table RLS ──────────────────────────────────────────────────
  `DROP POLICY IF EXISTS "Notification: receiver read" ON "Notification"`,
  `DROP POLICY IF EXISTS "Notification: auth insert" ON "Notification"`,
  `DROP POLICY IF EXISTS "Notification: receiver update" ON "Notification"`,

  `CREATE POLICY "Notification: receiver read"
     ON "Notification" FOR SELECT
     USING (auth.uid() = "receiverId" OR auth.uid() = "notifierId")`,

  `CREATE POLICY "Notification: auth insert"
     ON "Notification" FOR INSERT
     WITH CHECK (auth.uid() = "notifierId")`,

  `CREATE POLICY "Notification: receiver update" ON "Notification" FOR UPDATE USING (auth.uid() = "receiverId") WITH CHECK (auth.uid() = "receiverId")`,

  // ── UserSearchHistory policies ──────────────────────────────────────────────
  `CREATE POLICY "SearchHistory: owner select" ON "UserSearchHistory" FOR SELECT USING (auth.uid() = "userId")`,
  `CREATE POLICY "SearchHistory: owner insert" ON "UserSearchHistory" FOR INSERT WITH CHECK (auth.uid() = "userId")`,
  `CREATE POLICY "SearchHistory: admin select" ON "UserSearchHistory" FOR SELECT USING (EXISTS (SELECT 1 FROM "User" WHERE id = auth.uid() AND role = 'admin'))`,

  // ── VideoWatchLog policies ──────────────────────────────────────────────────
  `CREATE POLICY "WatchLog: owner select" ON "VideoWatchLog" FOR SELECT USING (auth.uid() = "userId")`,
  `CREATE POLICY "WatchLog: owner insert" ON "VideoWatchLog" FOR INSERT WITH CHECK (auth.uid() = "userId")`,
  `CREATE POLICY "WatchLog: admin select" ON "VideoWatchLog" FOR SELECT USING (EXISTS (SELECT 1 FROM "User" WHERE id = auth.uid() AND role = 'admin'))`,

  // ── VideoUnmuteLog policies ─────────────────────────────────────────────────
  `CREATE POLICY "UnmuteLog: owner select" ON "VideoUnmuteLog" FOR SELECT USING (auth.uid() = "userId")`,
  `CREATE POLICY "UnmuteLog: owner insert" ON "VideoUnmuteLog" FOR INSERT WITH CHECK (auth.uid() = "userId")`,
  `CREATE POLICY "UnmuteLog: admin select" ON "VideoUnmuteLog" FOR SELECT USING (EXISTS (SELECT 1 FROM "User" WHERE id = auth.uid() AND role = 'admin'))`,

  // ── Report Table RLS ────────────────────────────────────────────────────────
  `DROP POLICY IF EXISTS "Report: select" ON "Report"`,
  `DROP POLICY IF EXISTS "Report: insert" ON "Report"`,
  `DROP POLICY IF EXISTS "Report: update" ON "Report"`,

  `CREATE POLICY "Report: select"
     ON "Report" FOR SELECT
     USING (true)`,

  `CREATE POLICY "Report: insert"
     ON "Report" FOR INSERT
     WITH CHECK (auth.uid() = "reporterId")`,

  `CREATE POLICY "Report: update"
     ON "Report" FOR UPDATE
     USING (true)
     WITH CHECK (true)`,

  // ── FollowRequest Table RLS ──
  `DROP POLICY IF EXISTS "FollowRequest: select" ON "FollowRequest"`,
  `DROP POLICY IF EXISTS "FollowRequest: insert" ON "FollowRequest"`,
  `DROP POLICY IF EXISTS "FollowRequest: delete" ON "FollowRequest"`,

  `CREATE POLICY "FollowRequest: select"
     ON "FollowRequest" FOR SELECT
     USING (auth.uid() = "senderId" OR auth.uid() = "receiverId")`,

  `CREATE POLICY "FollowRequest: insert"
     ON "FollowRequest" FOR INSERT
     WITH CHECK (auth.uid() = "senderId")`,

  `CREATE POLICY "FollowRequest: delete"
     ON "FollowRequest" FOR DELETE
     USING (auth.uid() = "senderId" OR auth.uid() = "receiverId")`,

  // ── TvChannel Table RLS ──
  `DROP POLICY IF EXISTS "TvChannel: public read" ON "TvChannel"`,
  `DROP POLICY IF EXISTS "TvChannel: admin all" ON "TvChannel"`,
  `CREATE POLICY "TvChannel: public read" ON "TvChannel" FOR SELECT USING (true)`,
  `CREATE POLICY "TvChannel: admin all" ON "TvChannel" FOR ALL USING (EXISTS (SELECT 1 FROM "User" WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM "User" WHERE id = auth.uid() AND role = 'admin'))`,

  // Enable supabase realtime for Message table
  `do $$
  begin
    if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
      create publication supabase_realtime;
    end if;
  exception
    when others then null;
  end;
  $$;`,
  `do $$
  begin
    alter publication supabase_realtime add table "Message";
  exception
    when others then null;
  end;
  $$;`,
  `do $$
  begin
    alter publication supabase_realtime add table "Notification";
  exception
    when others then null;
  end;
  $$;`,
  `do $$
  begin
    alter publication supabase_realtime add table "FollowRequest";
  exception
    when others then null;
  end;
  $$;`,
];

// ─────────────────────────────────────────────────────────────────────────────
async function runMigrations() {
  console.log('Connecting to Supabase Database to apply migrations...');
  try {
    await client.connect();
    console.log('Connected. Running schema migrations...');
    await client.query(schemaSql);
    console.log('Schema OK. Applying RLS policies...');

    let ok = 0, skipped = 0;
    for (const stmt of rlsStatements) {
      try {
        await client.query(stmt);
        ok++;
      } catch (err) {
        // Duplicate policy names are expected on re-runs; everything else is a real error.
        if (err.code === '42710' /* duplicate_object */ || err.message?.includes('already exists')) {
          skipped++;
        } else {
          console.error(`RLS statement failed:\n  ${stmt.trim().split('\n')[0]}...\n  Error: ${err.message}`);
        }
      }
    }

    console.log(`RLS: ${ok} applied, ${skipped} already existed.`);
    console.log('Migrations complete! ✅');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
