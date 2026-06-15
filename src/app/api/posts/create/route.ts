import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader ? authHeader.replace('Bearer ', '') : null;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { caption, location, mediaUrl } = await request.json();
    if (!mediaUrl) {
      return NextResponse.json({ error: 'Media URL is required' }, { status: 400 });
    }

    const mediaUrls = [{ url: mediaUrl, type: 'image' }];

    const { data: post, error: dbError } = await supabase
      .from('Post')
      .insert({
        caption: caption || '',
        location: location || null,
        mediaUrls: mediaUrls,
        thumbnailUrl: mediaUrl,
        mobileUrl: mediaUrl,
        masterUrl: 'none',
        userId: user.id,
      })
      .select(`
        *,
        user:User!Post_userId_fkey(id, username, avatarUrl, isVerified)
      `)
      .single();

    if (dbError || !post) {
      return NextResponse.json({ error: dbError?.message || 'Failed to create post' }, { status: 400 });
    }

    // Invalidate Redis cache
    await fetch(`${new URL(request.url).origin}/api/feed/clear`, { method: 'POST' }).catch(() => {});

    return NextResponse.json(post);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
