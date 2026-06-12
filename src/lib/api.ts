import { supabase } from './supabase';

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
        return { reaction: reactionType };
      }
    } else {
      // New reaction — also add a Like entry
      await supabase.from('Reaction').insert({ userId: authUser.id, postId, type: reactionType });
      await supabase.from('Like').upsert({ userId: authUser.id, postId }, { onConflict: 'userId,postId' });
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
      .select('id, thumbnailUrl, mobileUrl')
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
      return { following: true };
    }
  }

  // Messages
  async getConversations() {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) throw new Error('Not authenticated');

    const { data: messages, error } = await supabase
      .from('Message')
      .select(`
        id, text, senderId, receiverId, status, createdAt,
        sender:User!Message_senderId_fkey(id, username, avatarUrl),
        receiver:User!Message_receiverId_fkey(id, username, avatarUrl)
      `)
      .or(`senderId.eq.${authUser.id},receiverId.eq.${authUser.id}`)
      .order('createdAt', { ascending: false });

    if (error) throw error;

    const conversationMap = new Map<string, any>();
    (messages || []).forEach((msg: any) => {
      const otherId = msg.senderId === authUser.id ? msg.receiverId : msg.senderId;
      if (!conversationMap.has(otherId)) conversationMap.set(otherId, msg);
    });
    return Array.from(conversationMap.values());
  }

  async getMessages(partnerId: string) {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) throw new Error('Not authenticated');

    const { data: messages, error } = await supabase
      .from('Message')
      .select(`
        id, text, senderId, receiverId, status, createdAt,
        sender:User!Message_senderId_fkey(id, username, avatarUrl)
      `)
      .or(`and(senderId.eq.${authUser.id},receiverId.eq.${partnerId}),and(senderId.eq.${partnerId},receiverId.eq.${authUser.id})`)
      .order('createdAt', { ascending: true });

    if (error) throw error;

    // Mark as read asynchronously
    supabase
      .from('Message')
      .update({ status: 'READ' })
      .eq('senderId', partnerId)
      .eq('receiverId', authUser.id)
      .neq('status', 'READ')
      .then();

    return messages || [];
  }

  async sendMessage(receiverId: string, text: string) {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) throw new Error('Not authenticated');

    const { data: message, error } = await supabase
      .from('Message')
      .insert({ senderId: authUser.id, receiverId, text })
      .select(`
        id, text, senderId, receiverId, status, createdAt,
        sender:User!Message_senderId_fkey(id, username, avatarUrl)
      `)
      .single();

    if (error) throw error;
    return message;
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

  async createStory(file: File, options?: { caption?: string; bgColor?: string }) {
    // Upload to Cloudinary
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'auragram');
    formData.append('folder', 'auragram/stories');

    const cloudRes = await fetch('https://api.cloudinary.com/v1_1/dj7pg5slk/image/upload', {
      method: 'POST',
      body: formData,
    });
    const cloudData = await cloudRes.json();
    if (!cloudData.secure_url) throw new Error('Story upload failed');

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

  async updateProfile(data: { fullName?: string; username?: string; bio?: string; avatarUrl?: string }) {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) throw new Error('Not authenticated');

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
}

export const api = new ApiClient();
