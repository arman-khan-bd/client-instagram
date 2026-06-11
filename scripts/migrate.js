const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Simple .env parser to get connection details outside Next.js process
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
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
  console.error("Error: DIRECT_URL or DATABASE_URL not found in environment or .env file.");
  process.exit(1);
}

const client = new Client({
  connectionString,
});

const schemaSql = `
-- Create User table
CREATE TABLE IF NOT EXISTS "User" (
  "id" UUID PRIMARY KEY,
  "username" TEXT UNIQUE NOT NULL,
  "email" TEXT UNIQUE NOT NULL,
  "passwordHash" TEXT,
  "fullName" TEXT,
  "bio" TEXT DEFAULT 'Welcome to my profile! ✨',
  "avatarUrl" TEXT,
  "isVerified" BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Create Post table
CREATE TABLE IF NOT EXISTS "Post" (
  "id" SERIAL PRIMARY KEY,
  "userId" UUID NOT NULL CONSTRAINT "Post_userId_fkey" REFERENCES "User"("id") ON DELETE CASCADE,
  "caption" TEXT,
  "location" TEXT,
  "mediaUrls" JSONB DEFAULT '[]'::jsonb,
  "thumbnailUrl" TEXT,
  "mobileUrl" TEXT,
  "masterUrl" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Create Like table
CREATE TABLE IF NOT EXISTS "Like" (
  "id" SERIAL PRIMARY KEY,
  "userId" UUID NOT NULL CONSTRAINT "Like_userId_fkey" REFERENCES "User"("id") ON DELETE CASCADE,
  "postId" INTEGER NOT NULL CONSTRAINT "Like_postId_fkey" REFERENCES "Post"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT "Like_userId_postId_key" UNIQUE ("userId", "postId")
);

-- Create Comment table
CREATE TABLE IF NOT EXISTS "Comment" (
  "id" SERIAL PRIMARY KEY,
  "userId" UUID NOT NULL CONSTRAINT "Comment_userId_fkey" REFERENCES "User"("id") ON DELETE CASCADE,
  "postId" INTEGER NOT NULL CONSTRAINT "Comment_postId_fkey" REFERENCES "Post"("id") ON DELETE CASCADE,
  "text" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Create Follow table
CREATE TABLE IF NOT EXISTS "Follow" (
  "id" SERIAL PRIMARY KEY,
  "followerId" UUID NOT NULL CONSTRAINT "Follow_followerId_fkey" REFERENCES "User"("id") ON DELETE CASCADE,
  "followingId" UUID NOT NULL CONSTRAINT "Follow_followingId_fkey" REFERENCES "User"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT "Follow_followerId_followingId_key" UNIQUE ("followerId", "followingId")
);

-- Create Message table
CREATE TABLE IF NOT EXISTS "Message" (
  "id" SERIAL PRIMARY KEY,
  "senderId" UUID NOT NULL CONSTRAINT "Message_senderId_fkey" REFERENCES "User"("id") ON DELETE CASCADE,
  "receiverId" UUID NOT NULL CONSTRAINT "Message_receiverId_fkey" REFERENCES "User"("id") ON DELETE CASCADE,
  "text" TEXT NOT NULL,
  "status" TEXT DEFAULT 'SENT',
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);
`;

async function runMigrations() {
  console.log("Connecting to Supabase Database to apply migrations...");
  try {
    await client.connect();
    console.log("Connected successfully. Running migration queries...");
    await client.query(schemaSql);
    console.log("Migrations applied successfully! Database schema is up to date.");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
