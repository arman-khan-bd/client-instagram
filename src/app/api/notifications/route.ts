import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function GET(request: Request) {
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

    const { data: notifications, error } = await supabase
      .from('Notification')
      .select(`
        *,
        sender:User!Notification_senderId_fkey(id, username, fullName, avatarUrl),
        post:Post(id, thumbnailUrl, mediaUrls),
        story:Story(id, mediaUrl, mediaType)
      `)
      .eq('receiverId', user.id)
      .order('createdAt', { ascending: false })
      .limit(50);

    if (error) throw error;
    return NextResponse.json(notifications || []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
