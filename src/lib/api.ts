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
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });
    if (authError || !authData.user) throw new Error(authError?.message || 'Signup failed');

    // Create user record in User table
    const { data: user, error: dbError } = await supabase
      .from('User')
      .insert({
        id: authData.user.id,
        username: data.username,
        email: data.email,
        passwordHash: '',
        fullName: data.fullName,
      })
      .select('id, username, email, fullName, avatarUrl, createdAt')
      .single();

    if (dbError || !user) throw new Error(dbError?.message || 'Profile creation failed');

    const token = authData.session?.access_token || '';
    if (token) this.setToken(token);
    return { user, token };
  }

  async login(data: { email: string; password: string }) {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    if (authError || !authData.user) throw new Error(authError?.message || 'Invalid credentials');

    // Retrieve database profile using the Supabase user ID
    let { data: user, error: dbError } = await supabase
      .from('User')
      .select('id, username, email, fullName, bio, avatarUrl')
      .eq('id', authData.user.id)
      .single();

    if (dbError || !user) {
      // Fallback user creation if missing from DB
      const { data: newUser, error: createError } = await supabase
        .from('User')
        .insert({
          id: authData.user.id,
          username: data.email.split('@')[0] || `user_${Date.now()}`,
          email: data.email,
          passwordHash: '',
          fullName: data.email.split('@')[0] || 'User',
          bio: 'Welcome to my profile! ✨',
        })
        .select('id, username, email, fullName, bio, avatarUrl')
        .single();

      if (createError || !newUser) throw new Error(createError?.message || 'Login profile sync failed');
      user = newUser;
    }

    const token = authData.session?.access_token || '';
    if (token) this.setToken(token);
    return { user, token };
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
    const skip = (page - 1) * limit;
    const { data: posts, error } = await supabase
      .from('Post')
      .select(`
        *,
        user:User!Post_userId_fkey(id, username, avatarUrl, isVerified)
      `)
      .order('createdAt', { ascending: false })
      .range(skip, skip + limit - 1);

    if (error) throw error;

    const { data: { user: authUser } } = await supabase.auth.getUser();

    const postsWithDetails = await Promise.all((posts || []).map(async (p: any) => {
      const { count: likesCount } = await supabase.from('Like').select('id', { count: 'exact', head: true }).eq('postId', p.id);
      const { count: commentsCount } = await supabase.from('Comment').select('id', { count: 'exact', head: true }).eq('postId', p.id);
      
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
        isLiked,
        _count: {
          likes: likesCount || 0,
          comments: commentsCount || 0,
        }
      };
    }));

    return { posts: postsWithDetails, page };
  }

  async createPost(formData: FormData) {
    const caption = formData.get('caption') as string;
    const location = formData.get('location') as string;
    const file = formData.get('image') as File;

    if (!file) throw new Error('Image is required');

    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) throw new Error('Not authenticated');

    // Upload file to Cloudinary via Next.js API Route
    const uploadData = new FormData();
    uploadData.append('file', file);

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: uploadData,
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Image upload to Cloudinary failed');
    }

    const { url: publicUrl } = await res.json();

    const { data: post, error: dbError } = await supabase
      .from('Post')
      .insert({
        caption: caption || '',
        location: location || null,
        mediaUrls: [{ url: publicUrl, type: 'image' }],
        thumbnailUrl: publicUrl,
        mobileUrl: publicUrl,
        masterUrl: publicUrl,
        userId: authUser.id,
      })
      .select(`
        *,
        user:User!Post_userId_fkey(id, username, avatarUrl, isVerified)
      `)
      .single();

    if (dbError || !post) throw new Error(dbError?.message || 'Failed to create post');

    return {
      ...post,
      _count: { likes: 0, comments: 0 }
    };
  }

  async likePost(postId: string) {
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
      return { liked: false };
    } else {
      await supabase.from('Like').insert({ userId: authUser.id, postId });
      return { liked: true };
    }
  }

  async getComments(postId: string) {
    const { data: comments, error } = await supabase
      .from('Comment')
      .select(`
        *,
        user:User!Comment_userId_fkey(id, username, avatarUrl)
      `)
      .eq('postId', postId)
      .order('createdAt', { ascending: true });

    if (error) throw error;
    return comments || [];
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
    if (authUser) {
      const { data: followRecord } = await supabase
        .from('Follow')
        .select('id')
        .eq('followerId', authUser.id)
        .eq('followingId', user.id)
        .maybeSingle();
      isFollowing = !!followRecord;
    }

    return {
      ...user,
      _count: {
        posts: postsCount || 0,
        followers: followersCount || 0,
        following: followingCount || 0,
      },
      posts: postsWithCounts,
      isFollowing
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
}

export const api = new ApiClient();
