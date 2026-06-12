import { NextResponse } from "next/server";
import { redisCache } from "../../../../lib/redis";

export async function POST() {
  try {
    await redisCache.clearFeedCache();
    return NextResponse.json({ success: true, message: "Feed cache cleared successfully" });
  } catch (err: any) {
    console.error("Clear Feed Cache error:", err);
    return NextResponse.json({ error: err.message || "Failed to clear feed cache" }, { status: 500 });
  }
}
