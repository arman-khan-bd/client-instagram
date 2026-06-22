import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";
import { redisCache } from "../../../lib/redis";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const skip = (page - 1) * limit;

    const authHeader = request.headers.get("Authorization");
    const token = authHeader ? authHeader.replace("Bearer ", "") : null;
    let authUser = null;
    if (token) {
      const { data: { user } } = await supabase.auth.getUser(token);
      authUser = user;
    }

    const cacheKey = authUser ? `feed:${authUser.id}:${page}:${limit}` : `feed:anon:${page}:${limit}`;

    // Try fetching from Redis Cache first
    const cachedData = await redisCache.get(cacheKey);
    if (cachedData) {
      return NextResponse.json(JSON.parse(cachedData));
    }

    // Cache Miss -> Fetch from Supabase
    const { data: posts, error } = await supabase
      .from("Post")
      .select(`
        *,
        user:User!Post_userId_fkey(id, username, avatarUrl, isVerified, private_profile),
        originalPost:originalPostId(
          *,
          user:User!Post_userId_fkey(id, username, avatarUrl, isVerified, private_profile)
        )
      `)
      .order("createdAt", { ascending: false })
      .range(skip, skip + limit - 1);

    if (error) throw error;

    let followingIds = new Set<string>();
    if (authUser) {
      const { data: follows } = await supabase
        .from('Follow')
        .select('followingId')
        .eq('followerId', authUser.id);
      if (follows) {
        follows.forEach((f: any) => followingIds.add(f.followingId));
      }
    }

    // Filter out posts from users with private profiles unless followed or own post
    const filteredPosts = (posts || []).filter((p: any) => {
      const author = p.user;
      if (!author) return false;
      if (authUser && author.id === authUser.id) return true;
      if (author.private_profile === true) {
        return followingIds.has(author.id);
      }
      return true;
    });

    // Fetch counts (likes & comments) for posts
    const postsWithDetails = await Promise.all(filteredPosts.map(async (p: any) => {
      const { count: likesCount } = await supabase
        .from("Like")
        .select("id", { count: "exact", head: true })
        .eq("postId", p.id);

      const { count: commentsCount } = await supabase
        .from("Comment")
        .select("id", { count: "exact", head: true })
        .eq("postId", p.id);

      return {
        ...p,
        _count: {
          likes: likesCount || 0,
          comments: commentsCount || 0,
        },
      };
    }));

    const responsePayload = { posts: postsWithDetails, page };

    // Cache in Redis for 30 seconds
    await redisCache.set(cacheKey, JSON.stringify(responsePayload), 30);

    return NextResponse.json(responsePayload);
  } catch (err: any) {
    console.error("Feed API Route error:", err);
    return NextResponse.json({ error: err.message || "Failed to load feed" }, { status: 500 });
  }
}
