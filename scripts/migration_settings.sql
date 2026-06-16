-- Create settings columns on User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "private_profile" BOOLEAN DEFAULT FALSE;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "private_stories" BOOLEAN DEFAULT FALSE;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "private_reels" BOOLEAN DEFAULT FALSE;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "private_days" BOOLEAN DEFAULT FALSE;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "theme" TEXT DEFAULT 'dark';

-- Add RLS updates for privacy policy
DROP POLICY IF EXISTS "Post: privacy selection" ON "Post";
CREATE POLICY "Post: privacy selection" ON "Post" FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM "User" u
    WHERE u.id = "Post"."userId"
    AND (
      u."private_profile" = FALSE
      OR u.id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM "Follow" f
        WHERE f."followerId" = auth.uid() AND f."followingId" = u.id
      )
    )
  )
);

DROP POLICY IF EXISTS "Story: privacy selection" ON "Story";
CREATE POLICY "Story: privacy selection" ON "Story" FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM "User" u
    WHERE u.id = "Story"."userId"
    AND (
      (u."private_profile" = FALSE AND u."private_stories" = FALSE)
      OR u.id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM "Follow" f
        WHERE f."followerId" = auth.uid() AND f."followingId" = u.id
      )
    )
  )
);
