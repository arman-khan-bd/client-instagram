import { supabase } from './supabase';
import { validateUsernameAndFullName } from './nameValidator';

class ApiClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') localStorage.setItem('token', token);
  }
  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('token');
      return this.token;
    }
    return null;
  }
  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      supabase.auth.signOut();
    }
  }

  // Auth
  async signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}` : undefined,
      }
    });
    if (error) throw error;
    return data;
  }

  async register(data: { username: string; email: string; password: string; fullName: string }) {
    // 1. Validate username and fullName terms
    const validation = validateUsernameAndFullName(data.username, data.fullName);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    // 2. Check if username is already taken
    const { data: existingUser } = await supabase
      .from('User')
      .select('id')
      .eq('username', data.username.trim().toLowerCase())
      .maybeSingle();

    if (existingUser) {
      throw new Error('Username is already taken.');
    }

    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        // Store username + fullName in user_metadata so onAuthStateChange can use them
        data: { username: data.username, full_name: data.fullName },
      },
    });
    if (error) throw new Error(error.message);
    // User table insert is handled by onAuthStateChange once the session is established
    return authData;
  }

  async login(data: { email: string; password: string }) {
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    if (error) throw new Error(error.message);
    if (!authData.user) throw new Error('Login failed. Please try again.');
    const token = authData.session?.access_token || '';
    if (token) this.setToken(token);
    // User table upsert + state update handled by onAuthStateChange
    return authData;
  }

  async getMe() {
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) throw new Error('Not authenticated');

    const { data: user, error: dbError } = await supabase
      .from('User')
      .select('id, username, email, fullName, bio, avatarUrl, isVerified')
      .eq('id', authUser.id)
      .single();

    if (dbError || !user) throw new Error('User profile not found');

    const { count: postsCount } = await supabase.from('Post').select('id', { count: 'exact', head: true }).eq('userId', authUser.id);
    const { count: followersCount } = await supabase.from('Follow').select('id', { count: 'exact', head: true }).eq('followingId', authUser.id);
    const { count: followingCount } = await supabase.from('Follow').select('id', { count: 'exact', head: true }).eq('followerId', authUser.id);

    return {
      ...user,
      _count: {
        posts: postsCount || 0,
        followers: followersCount || 0,
        following: followingCount || 0,
      }
    };
  }

  // Posts
  async getFeed(page = 1, limit = 10) {
    const res = await fetch(`/api/feed?page=${page}&limit=${limit}`);
    if (!res.ok) throw new Error("Failed to fetch feed API");
    const { posts, page: returnedPage } = await res.json();

    const { data: { user: authUser } } = await supabase.auth.getUser();

    const postsWithDetails = await Promise.all((posts || []).map(async (p: any) => {
      let isLiked = false;
      if (authUser) {
        const { data: likeRecord } = await supabase
          .from('Like')
          .select('id')
          .eq('userId', authUser.id)
          .eq('postId', p.id)
          .maybeSingle();
        isLiked = !!likeRecord;
      }
      return {
        ...p,
        isLiked
      };
    }));

    return { posts: postsWithDetails, page: returnedPage };
  }

  async createPost(data: {
    caption: string;
    location?: string;
    files?: File[];
    bgGradient?: string;
    isTextOnly?: boolean;
    filter?: string;
    thumbnailDataUrl?: string; // base64 data URL for video thumbnail frame
    thumbnailDataUrls?: Record<number, string>; // base64 data URLs for multiple video thumbnail frames
  }) {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) throw new Error('Not authenticated');

    let mediaUrls: any[] = [];
    let thumbnailUrl = '';

    if (data.isTextOnly && data.bgGradient) {
      thumbnailUrl = data.bgGradient;
    } else if (data.files && data.files.length > 0) {
      mediaUrls = await Promise.all(
        data.files.map(async (file, idx) => {
          const isVideo = file.type.startsWith('video/');
          const uploadData = new FormData();
          uploadData.append('file', file);
          uploadData.append('upload_preset', 'auragram');

          // Use the correct Cloudinary endpoint: video/upload for videos, image/upload for images
          const cloudinaryEndpoint = isVideo
            ? 'https://api.cloudinary.com/v1_1/dj7pg5slk/video/upload'
            : 'https://api.cloudinary.com/v1_1/dj7pg5slk/image/upload';

          const res = await fetch(cloudinaryEndpoint, {
            method: 'POST',
            body: uploadData,
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error?.message || `${isVideo ? 'Video' : 'Image'} upload to Cloudinary failed`);
          }

          const { secure_url } = await res.json();

          // Upload custom thumbnail for this specific video if selected
          let fileThumbnailUrl = '';
          const customThumbDataUrl = data.thumbnailDataUrls?.[idx] || (idx === 0 ? data.thumbnailDataUrl : undefined);
          if (isVideo && customThumbDataUrl) {
            try {
              const thumbRes = await fetch(customThumbDataUrl);
              const blob = await thumbRes.blob();
              const thumbForm = new FormData();
              thumbForm.append('file', blob, `thumbnail_${idx}.jpg`);
              thumbForm.append('upload_preset', 'auragram');
              const clRes = await fetch('https://api.cloudinary.com/v1_1/dj7pg5slk/image/upload', {
                method: 'POST',
                body: thumbForm,
              });
              if (clRes.ok) {
                const thumbData = await clRes.json();
                fileThumbnailUrl = thumbData.secure_url;
              }
            } catch (e) {
              console.warn(`Upload of thumbnail for video ${idx} failed:`, e);
            }
          }

          return { 
            url: secure_url, 
            type: isVideo ? 'video' : 'image',
            thumbnailUrl: fileThumbnailUrl || undefined
          };
        })
      );
      thumbnailUrl = mediaUrls[0]?.thumbnailUrl || mediaUrls[0]?.url || '';
    }

    const { data: post, error: dbError } = await supabase
      .from('Post')
      .insert({
        caption: data.caption || '',
        location: data.location || null,
        mediaUrls: mediaUrls,
        thumbnailUrl: thumbnailUrl,
        mobileUrl: thumbnailUrl,
        masterUrl: data.filter || 'none',
        userId: authUser.id,
      })
      .select(`
        *,
        user:User!Post_userId_fkey(id, username, avatarUrl, isVerified)
      `)
      .single();

    if (dbError || !post) throw new Error(dbError?.message || 'Failed to create post');

    // Invalidate Redis feed cache
    await fetch("/api/feed/clear", { method: "POST" }).catch(() => {});

    return {
      ...post,
      _count: { likes: 0, comments: 0 }
    };
  }

  async flagPostNSFW(postId: number | string, isAdult: boolean, isAdultUnmarked: boolean = false) {
    const { error } = await supabase
      .from('Post')
      .update({ isAdult, isAdultUnmarked })
      .eq('id', postId);
    if (error) throw error;
    // Invalidate Redis feed cache
    await fetch("/api/feed/clear", { method: "POST" }).catch(() => {});
    return { success: true };
  }

  async likePost(postId: string | number) {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) throw new Error('Not authenticated');

    const { data: existing } = await supabase
      .from('Like')
      .select('id')
      .eq('userId', authUser.id)
      .eq('postId', postId)
      .maybeSingle();

    if (existing) {
      await supabase.from('Like').delete().eq('id', existing.id);
      // Also remove any reaction
      await supabase.from('Reaction').delete().eq('userId', authUser.id).eq('postId', postId);
      return { liked: false };
    } else {
      await supabase.from('Like').insert({ userId: authUser.id, postId });

      const { data: post } = await supabase.from('Post').select('userId').eq('id', postId).single();
      if (post && post.userId !== authUser.id) {
        await this.createNotification({
          type: 'like',
          receiverId: post.userId,
          postId: Number(postId),
          text: 'liked your photo.'
        });
      }

      return { liked: true };
    }
  }

  // React to a post with Facebook-style reactions
  async reactToPost(postId: string | number, reactionType: string) {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) throw new Error('Not authenticated');

    const { data: existing } = await supabase
      .from('Reaction')
      .select('id, type')
      .eq('userId', authUser.id)
      .eq('postId', postId)
      .maybeSingle();

    if (existing) {
      if (existing.type === reactionType) {
        // Remove reaction + remove like
        await supabase.from('Reaction').delete().eq('id', existing.id);
        await supabase.from('Like').delete().eq('userId', authUser.id).eq('postId', postId);
        return { reaction: null };
      } else {
        // Change reaction type
        await supabase.from('Reaction').update({ type: reactionType }).eq('id', existing.id);

        const { data: post } = await supabase.from('Post').select('userId').eq('id', postId).single();
        if (post && post.userId !== authUser.id) {
          await this.createNotification({
            type: 'like',
            receiverId: post.userId,
            postId: Number(postId),
            text: `reacted with ${reactionType} to your post.`
          });
        }

        return { reaction: reactionType };
      }
    } else {
      // New reaction — also add a Like entry
      await supabase.from('Reaction').insert({ userId: authUser.id, postId, type: reactionType });
      await supabase.from('Like').upsert({ userId: authUser.id, postId }, { onConflict: 'userId,postId' });

      const { data: post } = await supabase.from('Post').select('userId').eq('id', postId).single();
      if (post && post.userId !== authUser.id) {
        await this.createNotification({
          type: 'like',
          receiverId: post.userId,
          postId: Number(postId),
          text: `reacted with ${reactionType} to your post.`
        });
      }

      return { reaction: reactionType };
    }
  }

  async getPostReaction(postId: string | number) {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return null;
    const { data } = await supabase.from('Reaction').select('type')
      .eq('userId', authUser.id).eq('postId', postId).maybeSingle();
    return data?.type || null;
  }

  async getPostReactionsDetails(postId: string | number) {
    const { data, error } = await supabase
      .from('Reaction')
      .select(`
        id,
        type,
        userId,
        createdAt,
        user:User!Reaction_userId_fkey(id, username, fullName, avatarUrl)
      `)
      .eq('postId', postId)
      .order('createdAt', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getComments(postId: string | number) {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const { data: comments, error } = await supabase
      .from('Comment')
      .select(`
        *,
        user:User!Comment_userId_fkey(id, username, fullName, avatarUrl)
      `)
      .eq('postId', postId)
      .order('createdAt', { ascending: true });

    if (error) throw error;

    const enriched = await Promise.all((comments || []).map(async (c: any) => {
      const { count: likeCount } = await supabase
        .from('CommentLike').select('id', { count: 'exact', head: true }).eq('commentId', c.id);
      let isLiked = false;
      if (authUser) {
        const { data: likeRec } = await supabase.from('CommentLike').select('id')
          .eq('userId', authUser.id).eq('commentId', c.id).maybeSingle();
        isLiked = !!likeRec;
      }
      return { ...c, likeCount: likeCount || 0, isLiked };
    }));

    return enriched;
  }

  async addComment(postId: string | number, text: string, options?: { parentId?: number; imageUrl?: string; emoji?: string }) {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) throw new Error('Not authenticated');

    const insertData: any = { text, userId: authUser.id, postId };
    if (options?.parentId) insertData.parentId = options.parentId;
    if (options?.imageUrl) insertData.imageUrl = options.imageUrl;
    if (options?.emoji) insertData.emoji = options.emoji;

    const { data: comment, error } = await supabase
      .from('Comment')
      .insert(insertData)
      .select(`
        *,
        user:User!Comment_userId_fkey(id, username, avatarUrl)
      `)
      .single();

    if (error) throw error;

    // Create notification
    const { data: post } = await supabase.from('Post').select('userId').eq('id', postId).single();
    if (post && post.userId !== authUser.id) {
      await this.createNotification({
        type: 'comment',
        receiverId: post.userId,
        postId: Number(postId),
        text: `commented: "${text.substring(0, 40)}${text.length > 40 ? '...' : ''}"`
      });
    }

    if (options?.parentId) {
      const { data: parentComment } = await supabase
        .from('Comment')
        .select('userId')
        .eq('id', options.parentId)
        .single();
      if (parentComment && parentComment.userId !== authUser.id && parentComment.userId !== post?.userId) {
        await this.createNotification({
          type: 'reply',
          receiverId: parentComment.userId,
          postId: Number(postId),
          text: `replied to your comment: "${text.substring(0, 40)}${text.length > 40 ? '...' : ''}"`
        });
      }
    }

    return comment;
  }

  // Comment Likes
  async likeComment(commentId: number) {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) throw new Error('Not authenticated');

    const { data: existing } = await supabase
      .from('CommentLike')
      .select('id')
      .eq('userId', authUser.id)
      .eq('commentId', commentId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase.from('CommentLike').delete().eq('id', existing.id);
      if (error) throw error;
      return { liked: false };
    } else {
      const { error } = await supabase.from('CommentLike').insert({ userId: authUser.id, commentId });
      if (error) throw error;
      return { liked: true };
    }
  }

  // Share Post
  async sharePost(postId: number | string, sharedTo: string = 'external') {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const userId = authUser?.id || null;

    const { data, error } = await supabase
      .from('Share')
      .insert({ userId, postId, sharedTo })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Toggle Save Post
  async toggleSavePost(postId: number | string) {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) throw new Error('Not authenticated');

    const { data: existing } = await supabase
      .from('Save')
      .select('id')
      .eq('userId', authUser.id)
      .eq('postId', postId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase.from('Save').delete().eq('id', existing.id);
      if (error) throw error;
      return { saved: false };
    } else {
      const { error } = await supabase.from('Save').insert({ userId: authUser.id, postId });
      if (error) throw error;

      const { data: post } = await supabase.from('Post').select('userId').eq('id', postId).single();
      if (post && post.userId !== authUser.id) {
        await this.createNotification({
          type: 'save',
          receiverId: post.userId,
          postId: Number(postId),
          text: 'saved your post.'
        });
      }

      return { saved: true };
    }
  }

  // Get Saved Posts
  async getSavedPosts() {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) throw new Error('Not authenticated');

    const { data: saves, error } = await supabase
      .from('Save')
      .select(`
        id,
        post:Post!Save_postId_fkey(
          *,
          user:User!Post_userId_fkey(id, username, avatarUrl, isVerified)
        )
      `)
      .eq('userId', authUser.id)
      .order('createdAt', { ascending: false });

    if (error) throw error;
    return (saves || []).map((s: any) => s.post).filter(Boolean);
  }

  // Users
  async searchUsers(q: string) {
    if (!q) return [];
    const { data: users, error } = await supabase
      .from('User')
      .select('id, username, fullName, avatarUrl, isVerified')
      .or(`username.ilike.%${q}%,fullName.ilike.%${q}%`)
      .limit(20);

    if (error) throw error;
    return users || [];
  }

  async getSuggestedUsers(limit = 5) {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    
    let query = supabase
      .from('User')
      .select('id, username, fullName, avatarUrl, isVerified')
      .limit(limit * 2);
      
    if (authUser) {
      query = query.neq('id', authUser.id);
    }
    
    const { data: users, error } = await query;
    if (error) throw error;
    
    if (authUser && users) {
      const enriched = await Promise.all(users.map(async (u: any) => {
        const { data: followRecord } = await supabase
          .from('Follow')
          .select('id')
          .eq('followerId', authUser.id)
          .eq('followingId', u.id)
          .maybeSingle();
        return { ...u, isFollowing: !!followRecord };
      }));
      return enriched.filter((u: any) => !u.isFollowing).slice(0, limit);
    }
    
    return (users || []).slice(0, limit);
  }

  async getProfile(username: string) {
    const { data: user, error: userError } = await supabase
      .from('User')
      .select('id, username, fullName, bio, avatarUrl, isVerified')
      .eq('username', username)
      .single();

    if (userError || !user) throw new Error('User not found');

    const { count: postsCount } = await supabase.from('Post').select('id', { count: 'exact', head: true }).eq('userId', user.id);
    const { count: followersCount } = await supabase.from('Follow').select('id', { count: 'exact', head: true }).eq('followingId', user.id);
    const { count: followingCount } = await supabase.from('Follow').select('id', { count: 'exact', head: true }).eq('followerId', user.id);

    const { data: posts } = await supabase
      .from('Post')
      .select('id, thumbnailUrl, mobileUrl, mediaUrls, caption')
      .eq('userId', user.id)
      .order('createdAt', { ascending: false })
      .limit(30);

    const postsWithCounts = await Promise.all((posts || []).map(async (p: any) => {
      const { count: likesCount } = await supabase.from('Like').select('id', { count: 'exact', head: true }).eq('postId', p.id);
      const { count: commentsCount } = await supabase.from('Comment').select('id', { count: 'exact', head: true }).eq('postId', p.id);
      return {
        ...p,
        _count: {
          likes: likesCount || 0,
          comments: commentsCount || 0,
        }
      };
    }));

    const { data: { user: authUser } } = await supabase.auth.getUser();
    let isFollowing = false;
    let followsMe = false;
    if (authUser) {
      const { data: followRecord } = await supabase
        .from('Follow')
        .select('id')
        .eq('followerId', authUser.id)
        .eq('followingId', user.id)
        .maybeSingle();
      isFollowing = !!followRecord;

      const { data: followsMeRecord } = await supabase
        .from('Follow')
        .select('id')
        .eq('followerId', user.id)
        .eq('followingId', authUser.id)
        .maybeSingle();
      followsMe = !!followsMeRecord;
    }

    return {
      ...user,
      _count: {
        posts: postsCount || 0,
        followers: followersCount || 0,
        following: followingCount || 0,
      },
      posts: postsWithCounts,
      isFollowing,
      followsMe,
    };
  }

  async toggleFollow(userId: string) {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) throw new Error('Not authenticated');
    if (authUser.id === userId) throw new Error('Cannot follow yourself');

    const { data: existing } = await supabase
      .from('Follow')
      .select('id')
      .eq('followerId', authUser.id)
      .eq('followingId', userId)
      .maybeSingle();

    if (existing) {
      await supabase.from('Follow').delete().eq('id', existing.id);
      return { following: false };
    } else {
      await supabase.from('Follow').insert({ followerId: authUser.id, followingId: userId });

      await this.createNotification({
        type: 'follow',
        receiverId: userId,
        text: 'started following you.'
      });

      return { following: true };
    }
  }

  // Messages & Conversations API
  async getConversations() {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) throw new Error('Not authenticated');

    const { data: participations, error: partError } = await supabase
      .from('ConversationParticipant')
      .select('conversationId')
      .eq('userId', authUser.id);

    if (partError) throw partError;
    const conversationIds = (participations || []).map((p: any) => p.conversationId);
    if (conversationIds.length === 0) return [];

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
    (lastMessages || []).forEach((msg: any) => {
      if (!lastMsgMap.has(msg.conversationId)) {
        lastMsgMap.set(msg.conversationId, msg);
      }
    });

    return (conversations || []).map((conv: any) => {
      const lastMsg = lastMsgMap.get(conv.id);
      return {
        ...conv,
        lastMessage: lastMsg || null,
        participants: (conv.participants || []).map((p: any) => p.user).filter(Boolean)
      };
    });
  }

  async getMessages(conversationId: number) {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) throw new Error('Not authenticated');

    const { data: messages, error } = await supabase
      .from('Message')
      .select(`
        *,
        sender:User!Message_senderId_fkey(id, username, avatarUrl)
      `)
      .eq('conversationId', conversationId)
      .or(`expiresAt.is.null,expiresAt.gt.${new Date().toISOString()}`)
      .order('createdAt', { ascending: true });

    if (error) throw error;

    // Mark as read asynchronously
    supabase
      .from('Message')
      .update({ status: 'READ' })
      .eq('conversationId', conversationId)
      .neq('senderId', authUser.id)
      .neq('status', 'READ')
      .then();

    return messages || [];
  }

  async sendMessage(options: { conversationId: number; text?: string; mediaUrl?: string; mediaType?: string; replyToId?: number; expiresAt?: string }) {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) throw new Error('Not authenticated');

    const { data: message, error } = await supabase
      .from('Message')
      .insert({
        conversationId: options.conversationId,
        senderId: authUser.id,
        text: options.text || null,
        mediaUrl: options.mediaUrl || null,
        mediaType: options.mediaType || null,
        replyToId: options.replyToId || null,
        reactions: {},
        expiresAt: options.expiresAt || null,
      })
      .select(`
        *,
        sender:User!Message_senderId_fkey(id, username, avatarUrl)
      `)
      .single();

    if (error) throw error;
    return message;
  }

  async createConversation(options: { name?: string; avatarUrl?: string; isGroup?: boolean; participantIds: string[] }) {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) throw new Error('Not authenticated');

    const isGroup = options.isGroup || false;
    const allParticipantIds = Array.from(new Set([authUser.id, ...options.participantIds]));

    if (!isGroup && allParticipantIds.length === 2) {
      // 1-on-1 DM: Check if one already exists
      const { data: myPartics } = await supabase
        .from('ConversationParticipant')
        .select('conversationId')
        .eq('userId', authUser.id);
      
      const myConvIds = (myPartics || []).map((p: any) => p.conversationId);
      
      if (myConvIds.length > 0) {
        const { data: candidates } = await supabase
          .from('Conversation')
          .select(`
            id,
            isGroup,
            participants:ConversationParticipant(userId)
          `)
          .in('id', myConvIds)
          .eq('isGroup', false);

        const existingDm = (candidates || []).find((c: any) => {
          const pIds = c.participants.map((p: any) => p.userId);
          return pIds.length === 2 && pIds.includes(allParticipantIds[1]);
        });

        if (existingDm) {
          const { data: conv } = await supabase
            .from('Conversation')
            .select(`
              *,
              participants:ConversationParticipant(
                user:User(id, username, fullName, avatarUrl)
              )
            `)
            .eq('id', existingDm.id)
            .single();

          if (conv) {
            return {
              ...conv,
              participants: (conv.participants || []).map((p: any) => p.user).filter(Boolean)
            };
          }
        }
      }
    }

    // Otherwise, create a new conversation
    const { data: conversation, error: convError } = await supabase
      .from('Conversation')
      .insert({
        name: options.name || null,
        avatarUrl: options.avatarUrl || null,
        isGroup,
        createdBy: authUser.id
      })
      .select()
      .single();

    if (convError) throw convError;

    const participantRows = allParticipantIds.map(userId => ({
      conversationId: conversation.id,
      userId
    }));

    const { error: partError } = await supabase
      .from('ConversationParticipant')
      .insert(participantRows);

    if (partError) throw partError;

    const { data: fullConversation, error: fetchError } = await supabase
      .from('Conversation')
      .select(`
        *,
        participants:ConversationParticipant(
          user:User(id, username, fullName, avatarUrl)
        )
      `)
      .eq('id', conversation.id)
      .single();

    if (fetchError) throw fetchError;
    return {
      ...fullConversation,
      participants: (fullConversation.participants || []).map((p: any) => p.user).filter(Boolean)
    };
  }

  async editMessage(messageId: number, text: string) {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) throw new Error('Not authenticated');

    const { data: message, error } = await supabase
      .from('Message')
      .update({ text, isEdited: true })
      .eq('id', messageId)
      .eq('senderId', authUser.id)
      .select(`
        *,
        sender:User!Message_senderId_fkey(id, username, avatarUrl)
      `)
      .single();

    if (error) throw error;
    return message;
  }

  async deleteMessage(messageId: number) {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('Message')
      .delete()
      .eq('id', messageId)
      .eq('senderId', authUser.id);

    if (error) throw error;
    return true;
  }

  async reactToMessage(messageId: number, emoji: string) {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) throw new Error('Not authenticated');

    const { data: msg, error: fetchErr } = await supabase
      .from('Message')
      .select('reactions')
      .eq('id', messageId)
      .single();

    if (fetchErr) throw fetchErr;

    const reactions = { ...(msg.reactions || {}) };
    if (reactions[authUser.id] === emoji) {
      delete reactions[authUser.id];
    } else {
      reactions[authUser.id] = emoji;
    }

    const { data: updatedMsg, error: updateErr } = await supabase
      .from('Message')
      .update({ reactions })
      .eq('id', messageId)
      .select(`
        *,
        sender:User!Message_senderId_fkey(id, username, avatarUrl)
      `)
      .single();

    if (updateErr) throw updateErr;
    return updatedMsg;
  }

  async uploadMessageMedia(file: File) {
    const isVideo = file.type.startsWith('video/');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'auragram');

    const uploadUrl = isVideo
      ? 'https://api.cloudinary.com/v1_1/dj7pg5slk/video/upload'
      : 'https://api.cloudinary.com/v1_1/dj7pg5slk/image/upload';

    const res = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });

    const cloudData = await res.json();
    if (!cloudData.secure_url) throw new Error('File upload failed');
    return {
      url: cloudData.secure_url,
      type: isVideo ? 'video' : 'image'
    };
  }

  // ── Stories ──────────────────────────────────────────────────────────────────
  async getStories() {
    const { data, error } = await supabase
      .from('Story')
      .select('*, user:User(id, username, fullName, avatarUrl)')
      .gt('expiresAt', new Date().toISOString())
      .order('createdAt', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  }

  async createStory(file: File, options?: { caption?: string; bgColor?: string; audioUrl?: string; musicName?: string; metadata?: any; audioFile?: File }) {
    // Upload media file to Cloudinary
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'auragram');
    formData.append('folder', 'auragram/stories');

    const isVideo = file.type.startsWith('video/');
    const cloudinaryEndpoint = isVideo
      ? 'https://api.cloudinary.com/v1_1/dj7pg5slk/video/upload'
      : 'https://api.cloudinary.com/v1_1/dj7pg5slk/image/upload';

    const cloudRes = await fetch(cloudinaryEndpoint, {
      method: 'POST',
      body: formData,
    });
    const cloudData = await cloudRes.json();
    if (!cloudData.secure_url) throw new Error('Story upload failed');

    // Upload custom audio file if provided
    let audioUrl = options?.audioUrl || '';
    if (options?.audioFile) {
      const audioFormData = new FormData();
      audioFormData.append('file', options.audioFile);
      audioFormData.append('upload_preset', 'auragram');
      audioFormData.append('folder', 'auragram/stories/audio');

      const cloudAudioRes = await fetch('https://api.cloudinary.com/v1_1/dj7pg5slk/video/upload', {
        method: 'POST',
        body: audioFormData,
      });
      const cloudAudioData = await cloudAudioRes.json();
      if (cloudAudioData.secure_url) {
        audioUrl = cloudAudioData.secure_url;
      }
    }

    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('Story')
      .insert({
        userId: authUser.id,
        mediaUrl: cloudData.secure_url,
        mediaType: file.type.startsWith('video') ? 'video' : 'image',
        caption: options?.caption || '',
        bgColor: options?.bgColor || '',
        audioUrl,
        musicName: options?.musicName || '',
        metadata: options?.metadata || {},
      })
      .select('*, user:User(id, username, fullName, avatarUrl)')
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async deleteStory(storyId: number) {
    const { error } = await supabase.from('Story').delete().eq('id', storyId);
    if (error) throw new Error(error.message);
  }

  async recordStoryInteraction(storyId: number, type: 'view' | 'like' | 'message' | 'reaction', value?: string) {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return null;

    if (type === 'view' || type === 'like') {
      const { data: existing } = await supabase
        .from('StoryInteraction')
        .select('id')
        .eq('storyId', storyId)
        .eq('userId', authUser.id)
        .eq('type', type)
        .maybeSingle();

      if (existing) {
        if (type === 'like') {
          await supabase.from('StoryInteraction').delete().eq('id', existing.id);
          return { status: 'unliked' };
        }
        return { status: 'already_exists' };
      }
    }

    const { data, error } = await supabase
      .from('StoryInteraction')
      .insert({
        storyId,
        userId: authUser.id,
        type,
        value: value || '',
      })
      .select()
      .single();

    if (error) throw error;

    // Create notification
    const { data: story } = await supabase.from('Story').select('userId').eq('id', storyId).single();
    if (story && story.userId !== authUser.id) {
      let text = '';
      let nType = 'story_view';
      if (type === 'view') {
        text = 'viewed your story.';
        nType = 'story_view';
      } else if (type === 'like') {
        text = 'liked your story.';
        nType = 'like';
      } else if (type === 'reaction') {
        text = `reacted to your story: ${value || ''}`;
        nType = 'story_reaction';
      } else if (type === 'message') {
        text = `replied to your story: "${value || ''}"`;
        nType = 'reply';
      }

      if (text) {
        await this.createNotification({
          type: nType,
          receiverId: story.userId,
          storyId,
          text
        });
      }
    }

    return data;
  }

  async getStoryInteractions(storyId: number) {
    const { data, error } = await supabase
      .from('StoryInteraction')
      .select(`
        *,
        user:User!StoryInteraction_userId_fkey(id, username, avatarUrl)
      `)
      .eq('storyId', storyId)
      .order('createdAt', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async updateProfile(data: { fullName?: string; username?: string; bio?: string; avatarUrl?: string }) {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) throw new Error('Not authenticated');

    let usernameToValidate = data.username;
    let fullNameToValidate = data.fullName;

    if (usernameToValidate !== undefined || fullNameToValidate !== undefined) {
      // Fetch current profile to validate the combination
      const { data: currentProfile } = await supabase
        .from('User')
        .select('username, fullName')
        .eq('id', authUser.id)
        .single();
      
      const checkUsername = usernameToValidate !== undefined ? usernameToValidate : (currentProfile?.username || '');
      const checkFullName = fullNameToValidate !== undefined ? fullNameToValidate : (currentProfile?.fullName || '');

      const validation = validateUsernameAndFullName(checkUsername, checkFullName);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      // Check duplicate username if username is being changed
      if (usernameToValidate !== undefined && usernameToValidate.trim().toLowerCase() !== currentProfile?.username?.toLowerCase()) {
        const { data: existingUser } = await supabase
          .from('User')
          .select('id')
          .eq('username', usernameToValidate.trim().toLowerCase())
          .maybeSingle();
        
        if (existingUser) {
          throw new Error('Username is already taken.');
        }
      }
    }

    const { data: updatedUser, error } = await supabase
      .from('User')
      .update({
        fullName: data.fullName,
        username: data.username,
        bio: data.bio,
        avatarUrl: data.avatarUrl,
      })
      .eq('id', authUser.id)
      .select()
      .single();

    if (error) throw error;
    return updatedUser;
  }

  async getPost(postId: number | string) {
    const { data: post, error } = await supabase
      .from('Post')
      .select('*, user:User!Post_userId_fkey(id, username, fullName, avatarUrl, isVerified)')
      .eq('id', Number(postId))
      .single();

    if (error || !post) throw new Error(error?.message || 'Post not found');

    const { count: likesCount } = await supabase.from('Like').select('id', { count: 'exact', head: true }).eq('postId', post.id);

    const { data: { user: authUser } } = await supabase.auth.getUser();
    let isLiked = false;
    if (authUser) {
      const { data: likeRecord } = await supabase
        .from('Like')
        .select('id')
        .eq('userId', authUser.id)
        .eq('postId', post.id)
        .maybeSingle();
      isLiked = !!likeRecord;
    }

    return {
      ...post,
      isLiked,
      _count: {
        likes: likesCount || 0,
      }
    };
  }

  async getFollowingList() {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return [];

    const { data: followings, error } = await supabase
      .from('Follow')
      .select('followingId, User:User!Follow_followingId_fkey(id, username, fullName, avatarUrl, isVerified)')
      .eq('followerId', authUser.id);

    if (error) throw error;
    return (followings || []).map((f: any) => f.User).filter(Boolean);
  }

  async getFollowersList(userId: string) {
    const { data, error } = await supabase
      .from('Follow')
      .select('followerId, User:User!Follow_followerId_fkey(id, username, fullName, avatarUrl, isVerified)')
      .eq('followingId', userId);

    if (error) throw error;
    return (data || []).map((f: any) => f.User).filter(Boolean);
  }

  async getFollowingListForUser(userId: string) {
    const { data, error } = await supabase
      .from('Follow')
      .select('followingId, User:User!Follow_followingId_fkey(id, username, fullName, avatarUrl, isVerified)')
      .eq('followerId', userId);

    if (error) throw error;
    return (data || []).map((f: any) => f.User).filter(Boolean);
  }

  async createNotification(data: { type: string; receiverId: string; postId?: number; storyId?: number; text?: string }) {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return null;
    if (authUser.id === data.receiverId) return null;

    const { data: notif, error } = await supabase
      .from('Notification')
      .insert({
        type: data.type,
        notifierId: authUser.id,
        receiverId: data.receiverId,
        postId: data.postId || null,
        storyId: data.storyId || null,
        text: data.text || '',
        unread: true,
      })
      .select()
      .single();

    if (error) {
      console.warn("Failed to create notification:", error.message);
      return null;
    }
    return notif;
  }

  async getNotifications() {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return [];

    const { data, error } = await supabase
      .from('Notification')
      .select(`
        *,
        notifier:User!Notification_notifierId_fkey(id, username, fullName, avatarUrl),
        post:Post!Notification_postId_fkey(id, thumbnailUrl, mobileUrl, mediaUrls),
        story:Story!Notification_storyId_fkey(id, mediaUrl)
      `)
      .eq('receiverId', authUser.id)
      .order('createdAt', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async markNotificationRead(id: number) {
    const { error } = await supabase
      .from('Notification')
      .update({ unread: false })
      .eq('id', id);
    if (error) throw error;
  }

  // ── Administrative Dashboard and Reporting Methods ──
  async getAllUsers() {
    const { data, error } = await supabase
      .from('User')
      .select('*')
      .order('createdAt', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async deleteUser(userId: string) {
    const { error } = await supabase
      .from('User')
      .delete()
      .eq('id', userId);
    if (error) throw error;
  }

  async updateUserVerified(userId: string, isVerified: boolean) {
    const { error } = await supabase
      .from('User')
      .update({ isVerified })
      .eq('id', userId);
    if (error) throw error;
  }

  async getAllPosts() {
    const { data, error } = await supabase
      .from('Post')
      .select('*, User:User!Post_userId_fkey(id, username, fullName, avatarUrl)')
      .order('createdAt', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async deletePost(postId: number) {
    const { error } = await supabase
      .from('Post')
      .delete()
      .eq('id', postId);
    if (error) throw error;
  }

  async getAllComments() {
    const { data, error } = await supabase
      .from('Comment')
      .select('*, User:User!Comment_userId_fkey(id, username, fullName, avatarUrl), Post:Post!Comment_postId_fkey(id, caption)')
      .order('createdAt', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async deleteComment(commentId: number) {
    const { error } = await supabase
      .from('Comment')
      .delete()
      .eq('id', commentId);
    if (error) throw error;
  }

  async getReports() {
    const { data, error } = await supabase
      .from('Report')
      .select(`
        *,
        reporter:User!Report_reporterId_fkey(id, username, fullName, avatarUrl),
        post:Post!Report_postId_fkey(id, mediaUrls, caption, userId, User:User!Post_userId_fkey(id, username)),
        comment:Comment!Report_commentId_fkey(id, text, userId, User:User!Comment_userId_fkey(id, username))
      `)
      .order('createdAt', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async createReport(data: { postId?: number; commentId?: number; reason: string }) {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) throw new Error("Must be logged in to file a report");

    const { data: report, error } = await supabase
      .from('Report')
      .insert({
        reporterId: authUser.id,
        postId: data.postId || null,
        commentId: data.commentId || null,
        reason: data.reason,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;
    return report;
  }

  async updateReportStatus(reportId: number, status: string) {
    const { error } = await supabase
      .from('Report')
      .update({ status })
      .eq('id', reportId);
    if (error) throw error;
  }
}

export const api = new ApiClient();
