import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

// GET: Fetch active stories
export async function GET(request: Request) {
  try {
    const now = new Date().toISOString();
    const { data: stories, error } = await supabase
      .from('Story')
      .select(`
        *,
        user:User!Story_userId_fkey(id, username, avatarUrl, isVerified)
      `)
      .gt('expiresAt', now)
      .order('createdAt', { ascending: false });

    if (error) throw error;
    return NextResponse.json(stories || []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Create a story
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

    const { mediaUrl, caption } = await request.json();
    if (!mediaUrl) {
      return NextResponse.json({ error: 'Media URL is required' }, { status: 400 });
    }

    // Set expiry to 24 hours from now
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { data: story, error: dbError } = await supabase
      .from('Story')
      .insert({
        mediaUrl,
        mediaType: 'image',
        expiresAt,
        caption: caption || '',
        userId: user.id,
      })
      .select(`
        *,
        user:User!Story_userId_fkey(id, username, avatarUrl, isVerified)
      `)
      .single();

    if (dbError || !story) {
      return NextResponse.json({ error: dbError?.message || 'Failed to create story' }, { status: 400 });
    }

    return NextResponse.json(story);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
