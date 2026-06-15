import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function GET(request: Request) {
  try {
    const { data: posts, error } = await supabase
      .from('Post')
      .select(`
        id,
        thumbnailUrl,
        mobileUrl,
        mediaUrls,
        caption,
        likesCount:Like(count),
        commentsCount:Comment(count)
      `)
      .order('createdAt', { ascending: false })
      .limit(30);

    if (error) throw error;

    const formatted = (posts || []).map((p: any) => {
      const likesCount = p.likesCount?.[0]?.count ?? 0;
      const commentsCount = p.commentsCount?.[0]?.count ?? 0;
      return {
        id: p.id,
        thumbnailUrl: p.thumbnailUrl,
        mobileUrl: p.mobileUrl,
        mediaUrls: p.mediaUrls,
        caption: p.caption,
        likes: likesCount,
        comments: commentsCount,
      };
    });

    return NextResponse.json(formatted);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
