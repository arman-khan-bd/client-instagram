import { NextResponse } from 'next/server';
import { Client } from 'pg';

export async function POST(request: Request) {
  let dbClient: Client | null = null;
  try {
    const { channelId, sessionId, userId, isNewChannel } = await request.json();

    if (!channelId || !sessionId) {
      return NextResponse.json({ error: 'channelId and sessionId are required' }, { status: 400 });
    }

    const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
    if (!connectionString) {
      return NextResponse.json({ error: 'Database configuration missing on server.' }, { status: 500 });
    }

    dbClient = new Client({ connectionString });
    await dbClient.connect();

    // 1. Clean up old/inactive sessions (last active more than 30 seconds ago)
    await dbClient.query('DELETE FROM "TvActiveSession" WHERE "lastActiveAt" < NOW() - INTERVAL \'30 seconds\'');

    // 2. Upsert active session
    await dbClient.query(
      `INSERT INTO "TvActiveSession" ("sessionId", "channelId", "userId", "lastActiveAt")
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT ("sessionId") DO UPDATE 
       SET "channelId" = $2, "userId" = $3, "lastActiveAt" = NOW()`,
      [sessionId, Number(channelId), userId || null]
    );

    // 3. Log history if it is a new channel selection
    if (isNewChannel) {
      await dbClient.query(
        `INSERT INTO "TvViewingHistory" ("channelId", "userId", "sessionId", "viewedAt")
         VALUES ($1, $2, $3, NOW())`,
        [Number(channelId), userId || null, sessionId]
      );
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('TV heartbeat API error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  } finally {
    if (dbClient) {
      await dbClient.end();
    }
  }
}
