import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

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

    const { userId: followingId } = await request.json();
    if (!followingId) {
      return NextResponse.json({ error: 'User ID to follow/unfollow is required' }, { status: 400 });
    }

    if (user.id === followingId) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });
    }

    // Check if already following
    const { data: existing } = await supabase
      .from('Follow')
      .select('id')
      .eq('followerId', user.id)
      .eq('followingId', followingId)
      .maybeSingle();

    if (existing) {
      // Unfollow
      const { error } = await supabase.from('Follow').delete().eq('id', existing.id);
      if (error) throw error;
      return NextResponse.json({ following: false });
    } else {
      // Follow
      const { error } = await supabase.from('Follow').insert({ followerId: user.id, followingId });
      if (error) throw error;

      // Create notification
      await supabase.from('Notification').insert({
        type: 'follow',
        senderId: user.id,
        receiverId: followingId,
        text: 'started following you.',
        read: false
      }).catch(err => console.error('Failed to create follow notification:', err));

      return NextResponse.json({ following: true });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
