import { NextResponse } from 'next/server';
import { Client } from 'pg';

const schemaStatements = [
  // ── Post Column Updates ──
  `ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "isAdult" BOOLEAN DEFAULT FALSE`,
  `ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "isAdultUnmarked" BOOLEAN DEFAULT FALSE`,
  `ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "isPrivate" BOOLEAN DEFAULT FALSE`,
  `ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "category" TEXT DEFAULT 'personal'`,
  
  // ── VerificationRequest Table ──
  `CREATE TABLE IF NOT EXISTS "VerificationRequest" (
    "id"          SERIAL      PRIMARY KEY,
    "userId"      UUID        NOT NULL UNIQUE CONSTRAINT "VerificationRequest_userId_fkey" REFERENCES "User"("id") ON DELETE CASCADE,
    "status"      TEXT        NOT NULL DEFAULT 'pending',
    "reason"      TEXT,
    "createdAt"   TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt"   TIMESTAMPTZ DEFAULT NOW()
  )`
];

const rlsStatements = [
  `ALTER TABLE "VerificationRequest"     ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "VerificationRequest"     FORCE ROW LEVEL SECURITY`,
  `DROP POLICY IF EXISTS "VerificationRequest: select" ON "VerificationRequest"`,
  `DROP POLICY IF EXISTS "VerificationRequest: insert" ON "VerificationRequest"`,
  `DROP POLICY IF EXISTS "VerificationRequest: admin all" ON "VerificationRequest"`,
  `CREATE POLICY "VerificationRequest: select" ON "VerificationRequest" FOR SELECT USING (auth.uid() = "userId" OR EXISTS (SELECT 1 FROM "User" WHERE id = auth.uid() AND role = 'admin'))`,
  `CREATE POLICY "VerificationRequest: insert" ON "VerificationRequest" FOR INSERT WITH CHECK (auth.uid() = "userId")`,
  `CREATE POLICY "VerificationRequest: admin all" ON "VerificationRequest" FOR ALL USING (EXISTS (SELECT 1 FROM "User" WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM "User" WHERE id = auth.uid() AND role = 'admin'))`,
];

export async function GET() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    return NextResponse.json({ error: 'Database connection string not configured' }, { status: 500 });
  }

  const client = new Client({ connectionString });
  try {
    await client.connect();
    
    let schemaOk = 0;
    for (const stmt of schemaStatements) {
      await client.query(stmt);
      schemaOk++;
    }

    let rlsOk = 0;
    for (const stmt of rlsStatements) {
      await client.query(stmt);
      rlsOk++;
    }

    return NextResponse.json({ 
      success: true, 
      message: `Migration complete. Applied ${schemaOk} schema updates and ${rlsOk} RLS statements.` 
    });
  } catch (err: any) {
    console.error('Migration error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    await client.end();
  }
}
