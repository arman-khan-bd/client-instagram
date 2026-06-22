import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    if (!q) {
      return NextResponse.json({ users: [], images: [] });
    }

    const [usersRes, imagesRes] = await Promise.all([
      supabase
        .from('User')
        .select('id, username, fullName, avatarUrl, isVerified')
        .or(`username.ilike.%${q}%,fullName.ilike.%${q}%`)
        .limit(20),
      supabase
        .from('ImageAnalysis')
        .select(`
          id,
          mediaUrl,
          description,
          styleTags,
          textFound,
          createdAt,
          userId,
          user:User!ImageAnalysis_userId_fkey(id, username, avatarUrl, isVerified)
        `)
        .or(`description.ilike.%${q}%,textFound.ilike.%${q}%`)
        .limit(20)
    ]);

    if (usersRes.error) throw usersRes.error;
    if (imagesRes.error) throw imagesRes.error;

    return NextResponse.json({
      users: usersRes.data || [],
      images: imagesRes.data || []
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
