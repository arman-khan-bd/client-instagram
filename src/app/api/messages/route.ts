import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

// GET: Fetch conversations or messages for a specific conversation
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

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    // If conversationId is provided, fetch messages inside it
    if (conversationId) {
      const { data: messages, error } = await supabase
        .from('Message')
        .select(`
          *,
          sender:User!Message_senderId_fkey(id, username, avatarUrl)
        `)
        .eq('conversationId', Number(conversationId))
        .order('createdAt', { ascending: true });

      if (error) throw error;
      return NextResponse.json(messages || []);
    }

    // Otherwise, fetch all conversations for the user
    const { data: participations, error: partError } = await supabase
      .from('ConversationParticipant')
      .select('conversationId')
      .eq('userId', user.id);

    if (partError) throw partError;
    const conversationIds = (participations || []).map((p: any) => p.conversationId);
    if (conversationIds.length === 0) return NextResponse.json([]);

    const { data: conversations, error: convError } = await supabase
      .from('Conversation')
      .select(`
        *,
        participants:ConversationParticipant(
          user:User(id, username, fullName, avatarUrl)
        )
      `)
      .in('id', conversationIds);

    if (convError) throw convError;

    const { data: lastMessages, error: msgError } = await supabase
      .from('Message')
      .select('*')
      .in('conversationId', conversationIds)
      .order('createdAt', { ascending: false });

    if (msgError) throw msgError;

    const lastMsgMap = new Map<number, any>();
    const unreadCountMap = new Map<number, number>();
    (lastMessages || []).forEach((msg: any) => {
      if (!lastMsgMap.has(msg.conversationId)) {
        lastMsgMap.set(msg.conversationId, msg);
      }
      if (msg.senderId !== user.id && msg.status !== 'READ') {
        const count = unreadCountMap.get(msg.conversationId) || 0;
        unreadCountMap.set(msg.conversationId, count + 1);
      }
    });

    const enriched = (conversations || []).map((conv: any) => {
      const lastMsg = lastMsgMap.get(conv.id);
      const unreadCount = unreadCountMap.get(conv.id) || 0;
      return {
        ...conv,
        lastMessage: lastMsg || null,
        unreadCount,
        participants: (conv.participants || []).map((p: any) => p.user).filter(Boolean)
      };
    });

    return NextResponse.json(enriched);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Send a message
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

    const { conversationId, text, receiverId } = await request.json();

    let finalConvId = conversationId;

    // If conversationId is not provided, check if a conversation exists or create one with receiverId
    if (!finalConvId && receiverId) {
      // Find matching conversation with receiver
      const { data: myConvs } = await supabase
        .from('ConversationParticipant')
        .select('conversationId')
        .eq('userId', user.id);

      const myConvIds = (myConvs || []).map(c => c.conversationId);

      const { data: sharedConvs } = await supabase
        .from('ConversationParticipant')
        .select('conversationId')
        .in('conversationId', myConvIds)
        .eq('userId', receiverId)
        .maybeSingle();

      if (sharedConvs) {
        finalConvId = sharedConvs.conversationId;
      } else {
        // Create new conversation
        const { data: newConv, error: createError } = await supabase
          .from('Conversation')
          .insert({})
          .select()
          .single();

        if (createError) throw createError;
        finalConvId = newConv.id;

        // Add participants
        await supabase.from('ConversationParticipant').insert([
          { conversationId: finalConvId, userId: user.id },
          { conversationId: finalConvId, userId: receiverId }
        ]);
      }
    }

    if (!finalConvId) {
      return NextResponse.json({ error: 'Conversation or receiver ID is required' }, { status: 400 });
    }

    const { data: message, error } = await supabase
      .from('Message')
      .insert({
        conversationId: finalConvId,
        senderId: user.id,
        text: text || null,
        reactions: {},
        status: 'SENT'
      })
      .select(`
        *,
        sender:User!Message_senderId_fkey(id, username, avatarUrl)
      `)
      .single();

    if (error) throw error;
    return NextResponse.json(message);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
