import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username') || '';
    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    const { data: user, error: userError } = await supabase
      .from('User')
      .select('id, username, fullName, bio, avatarUrl, isVerified')
      .eq('username', username)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const [postsCountRes, followersCountRes, followingCountRes, postsRes] = await Promise.all([
      supabase.from('Post').select('id', { count: 'exact', head: true }).eq('userId', user.id),
      supabase.from('Follow').select('id', { count: 'exact', head: true }).eq('followingId', user.id),
      supabase.from('Follow').select('id', { count: 'exact', head: true }).eq('followerId', user.id),
      supabase.from('Post')
        .select(`
          id, 
          thumbnailUrl, 
          mobileUrl, 
          mediaUrls, 
          caption,
          isPrivate,
          privacy,
          privacyCustomUser,
          likesCount:Like(count),
          commentsCount:Comment(count)
        `)
        .eq('userId', user.id)
        .order('createdAt', { ascending: false })
        .limit(30)
    ]);

    const posts = postsRes.data || [];
    const postsWithCounts = posts.map((p: any) => {
      const likesCount = p.likesCount?.[0]?.count ?? 0;
      const commentsCount = p.commentsCount?.[0]?.count ?? 0;
      return {
        id: p.id,
        thumbnailUrl: p.thumbnailUrl,
        mobileUrl: p.mobileUrl,
        mediaUrls: p.mediaUrls,
        caption: p.caption,
        isPrivate: p.isPrivate,
        privacy: p.privacy,
        privacyCustomUser: p.privacyCustomUser,
        _count: {
          likes: likesCount,
          comments: commentsCount,
        }
      };
    });

    return NextResponse.json({
      ...user,
      _count: {
        posts: postsCountRes.count || 0,
        followers: followersCountRes.count || 0,
        following: followingCountRes.count || 0,
      },
      posts: postsWithCounts
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
