import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function GET(request: Request) {
  try {
    const { data: posts, error } = await supabase
      .from('Post')
      .select(`
        *,
        user:User!Post_userId_fkey(id, username, avatarUrl, isVerified)
      `)
      .order('createdAt', { ascending: false })
      .limit(20);

    if (error) throw error;
    return NextResponse.json(posts || []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
