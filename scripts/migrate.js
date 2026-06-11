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

-- ── Message ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Message" (
  "id"         SERIAL      PRIMARY KEY,
  "senderId"   UUID        NOT NULL CONSTRAINT "Message_senderId_fkey"   REFERENCES "User"("id") ON DELETE CASCADE,
  "receiverId" UUID        NOT NULL CONSTRAINT "Message_receiverId_fkey" REFERENCES "User"("id") ON DELETE CASCADE,
  "text"       TEXT        NOT NULL,
  "status"     TEXT        DEFAULT 'SENT',
  "createdAt"  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Reaction ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Reaction" (
  "id"        SERIAL      PRIMARY KEY,
  "userId"    UUID        NOT NULL CONSTRAINT "Reaction_userId_fkey" REFERENCES "User"("id") ON DELETE CASCADE,
  "postId"    INTEGER     NOT NULL CONSTRAINT "Reaction_postId_fkey" REFERENCES "Post"("id") ON DELETE CASCADE,
  "type"      TEXT        NOT NULL DEFAULT 'like',
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT "Reaction_userId_postId_key" UNIQUE ("userId", "postId")
);
`;

// ─────────────────────────────────────────────────────────────────────────────
// ROW LEVEL SECURITY
// Each statement is run independently so an "already exists" error on a policy
// doesn't abort the whole migration.
// ─────────────────────────────────────────────────────────────────────────────
const rlsStatements = [

  // ── Enable RLS on every table ──────────────────────────────────────────────
  `ALTER TABLE "User"        ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "Post"        ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "Like"        ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "Comment"     ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "CommentLike" ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "Share"       ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "Save"        ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "Follow"      ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "Message"     ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "Reaction"    ENABLE ROW LEVEL SECURITY`,

  // ── Force RLS even for table owners / superusers (extra safety) ────────────
  `ALTER TABLE "User"        FORCE ROW LEVEL SECURITY`,
  `ALTER TABLE "Post"        FORCE ROW LEVEL SECURITY`,
  `ALTER TABLE "Like"        FORCE ROW LEVEL SECURITY`,
  `ALTER TABLE "Comment"     FORCE ROW LEVEL SECURITY`,
  `ALTER TABLE "CommentLike" FORCE ROW LEVEL SECURITY`,
  `ALTER TABLE "Share"       FORCE ROW LEVEL SECURITY`,
  `ALTER TABLE "Save"        FORCE ROW LEVEL SECURITY`,
  `ALTER TABLE "Follow"      FORCE ROW LEVEL SECURITY`,
  `ALTER TABLE "Message"     FORCE ROW LEVEL SECURITY`,
  `ALTER TABLE "Reaction"    FORCE ROW LEVEL SECURITY`,

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
  // Message table
  //   • Only the sender or receiver can read their messages
  //   • Authenticated users can send a message
  //   • Only the sender can delete (unsend)
  //   • Receiver can update status (mark as READ)
  // ════════════════════════════════════════════════════════════════════════════
  `DROP POLICY IF EXISTS "Message: participant read"    ON "Message"`,
  `DROP POLICY IF EXISTS "Message: auth insert"         ON "Message"`,
  `DROP POLICY IF EXISTS "Message: sender delete"       ON "Message"`,
  `DROP POLICY IF EXISTS "Message: receiver status upd" ON "Message"`,

  `CREATE POLICY "Message: participant read"
     ON "Message" FOR SELECT
     USING (auth.uid() = "senderId" OR auth.uid() = "receiverId")`,

  `CREATE POLICY "Message: auth insert"
     ON "Message" FOR INSERT
     WITH CHECK (auth.uid() = "senderId")`,

  `CREATE POLICY "Message: sender delete"
     ON "Message" FOR DELETE
     USING (auth.uid() = "senderId")`,

  `CREATE POLICY "Message: receiver status upd"
     ON "Message" FOR UPDATE
     USING  (auth.uid() = "receiverId")
     WITH CHECK (auth.uid() = "receiverId")`,

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
