"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { api } from "../lib/api";
import { supabase } from "../lib/supabase";

// Types
export interface MockUser {
  id: number;
  name: string;
  full: string;
  img: string;
  followers: number;
  following: number;
  bio: string;
  verified: boolean;
}

export interface MockComment {
  id: number;
  user: { id: number; name: string; img: string };
  text: string;
  time: string;
  liked: boolean;
}

export interface MockPost {
  id: number;
  user: MockUser;
  img: string;
  imgs?: string[];
  caption: string;
  likes: number;
  comments: MockComment[];
  time: string;
  hasStory: boolean;
  location: string;
  filter?: string;
  bgGradient?: string;
  isTextOnly?: boolean;
}

export interface MockMessage {
  mine: boolean;
  text: string;
  time: string;
  reel?: boolean;
}

export interface MockChatSession {
  id: number;
  user: MockUser;
  preview: string;
  time: string;
  unread: number;
  online: boolean;
}

export interface MockNotification {
  id: number;
  type: "like" | "comment" | "follow" | "mention" | "tag";
  user: MockUser;
  text: string;
  time: string;
  img?: string;
  unread: boolean;
}

export interface ToastMessage {
  id: string;
  text: string;
  type: "notification" | "success" | "follow" | "comment" | "share" | "save" | "message" | "info";
}

export interface DbStory {
  id: number;
  userId: string;
  mediaUrl: string;
  mediaType: string;
  caption: string;
  bgColor: string;
  expiresAt: string;
  createdAt: string;
  user: { id: string; username: string; fullName: string; avatarUrl: string };
}

export interface StoryGroup {
  userId: string;
  username: string;
  avatarUrl: string;
  stories: DbStory[];
}

interface AppContextType {
  // Navigation & Auth
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: { id: string; name: string; img: string; full: string; bio: string; web: string; gender: string } | null;
  doLogin: (email: string, pass: string) => Promise<void>;
  doRegister: (data: { username: string; email: string; pass: string; fullName: string }) => Promise<void>;
  doLoginWithGoogle: () => Promise<void>;
  doLogout: () => void;

  // Viewing other users profiles
  viewingUserId: number | null;
  setViewingUserId: (id: number | null) => void;

  // State arrays
  users: MockUser[];
  posts: MockPost[];
  setPosts: React.Dispatch<React.SetStateAction<MockPost[]>>;
  chats: MockChatSession[];
  setChats: React.Dispatch<React.SetStateAction<MockChatSession[]>>;
  chatMessages: Record<number, MockMessage[]>;
  notifications: MockNotification[];
  setNotifications: React.Dispatch<React.SetStateAction<MockNotification[]>>;

  // User Actions States
  likedPosts: Record<number, boolean>;
  savedPosts: Set<number>;
  followStates: Record<number, boolean>;

  // Interaction handlers
  toggleLike: (postId: number) => void;
  toggleSave: (postId: number) => void;
  toggleFollow: (userId: number) => void;
  addComment: (postId: number, text: string) => void;
  sendMessage: (chatId: number, text: string) => void;
  sendEmojiMessage: (chatId: number, emoji: string) => void;
  createPost: (files: File[], caption: string, options?: { location?: string; filter?: string; feelings?: string; tags?: string[]; music?: string; bgGradient?: string; isTextOnly?: boolean }) => Promise<void>;
  saveProfileChanges: (data: { name: string; username: string; web: string; bio: string; gender: string }) => void;

  // Modals state
  storyViewerIndex: number | null;
  setStoryViewerIndex: (idx: number | null) => void;
  activePostId: number | null;
  setActivePostId: (id: number | null) => void;
  showEditProfileModal: boolean;
  setShowEditProfileModal: (show: boolean) => void;
  showCreatePostModal: boolean;
  setShowCreatePostModal: (show: boolean) => void;
  showStoryCreate: boolean;
  setShowStoryCreate: (show: boolean) => void;
  followersModal: { open: boolean; type: "followers" | "following"; userId: number } | null;
  setFollowersModal: (data: { open: boolean; type: "followers" | "following"; userId: number } | null) => void;

  // Stories
  storyGroups: StoryGroup[];
  loadStories: () => Promise<void>;
  createStory: (file: File, opts?: { caption?: string }) => Promise<void>;

  // Toast notifications
  toasts: ToastMessage[];
  showToast: (text: string, type?: ToastMessage["type"]) => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Initial Data constants
const MOCK_USERS: MockUser[] = [
  { id: 1, name: "jamie_photo", full: "Jamie Chen", img: "https://i.pravatar.cc/80?img=2", followers: 12400, following: 382, bio: "📸 Photographer", verified: false },
  { id: 2, name: "travel_mike", full: "Mike Rivers", img: "https://i.pravatar.cc/80?img=3", followers: 8900, following: 201, bio: "✈️ Wanderlust", verified: false },
  { id: 3, name: "natalia.g", full: "Natalia Garcia", img: "https://i.pravatar.cc/80?img=5", followers: 54200, following: 910, bio: "🎨 Artist", verified: true },
  { id: 4, name: "dev.world", full: "Dev World", img: "https://i.pravatar.cc/80?img=7", followers: 102000, following: 500, bio: "💻 Tech & Code", verified: true },
  { id: 5, name: "foodie_sara", full: "Sara Kim", img: "https://i.pravatar.cc/80?img=9", followers: 31000, following: 720, bio: "🍜 Food + Travel", verified: false },
  { id: 6, name: "urban.lens", full: "Chris Park", img: "https://i.pravatar.cc/80?img=12", followers: 7800, following: 430, bio: "🏙 City vibes", verified: false },
  { id: 7, name: "surfboard_jay", full: "Jay Thompson", img: "https://i.pravatar.cc/80?img=14", followers: 19400, following: 211, bio: "🏄 Surf & Skate", verified: false },
  { id: 8, name: "lily.art", full: "Lily Moss", img: "https://i.pravatar.cc/80?img=20", followers: 6200, following: 340, bio: "🌸 Art & Design", verified: false },
];



const INITIAL_DM_DATA = [
  { id: 1, user: MOCK_USERS[0], preview: "haha yes exactly 😂", time: "2m", unread: 2, online: true },
  { id: 2, user: MOCK_USERS[1], preview: "Thanks! See you then 👋", time: "15m", unread: 0, online: false },
  { id: 3, user: MOCK_USERS[2], preview: "Sent you a reel 🎬", time: "1h", unread: 1, online: true },
  { id: 4, user: MOCK_USERS[3], preview: "Love that shot!", time: "3h", unread: 0, online: false },
  { id: 5, user: MOCK_USERS[4], preview: "Can you collab? 🙌", time: "1d", unread: 0, online: true },
  { id: 6, user: MOCK_USERS[5], preview: "Miss you!", time: "2d", unread: 0, online: false },
];

const INITIAL_DM_MESSAGES: Record<number, MockMessage[]> = {
  1: [
    { mine: false, text: "Hey! Did you see that new filter?", time: "10:20 AM" },
    { mine: true, text: "Yes omg it is SO good 😍", time: "10:22 AM" },
    { mine: false, text: "Right?! I used it for my last reel", time: "10:24 AM" },
    { mine: true, text: "haha yes exactly 😂", time: "10:25 AM" },
  ],
  2: [
    { mine: false, text: "Hey are you free Saturday?", time: "Yesterday" },
    { mine: true, text: "Yeah I think so, what's up?", time: "Yesterday" },
    { mine: false, text: "Photowalk at golden gate! 📸", time: "Yesterday" },
    { mine: true, text: "Thanks! See you then 👋", time: "Yesterday" },
  ],
  3: [
    { mine: false, text: "", time: "2h ago", reel: true },
    { mine: true, text: "Wow this is sick! 🔥", time: "1h ago" },
    { mine: false, text: "Sent you a reel 🎬", time: "1h ago" },
  ],
  4: [
    { mine: false, text: "Your photo series is incredible", time: "3h ago" },
    { mine: true, text: "Thank you so much! 🙏", time: "3h ago" },
    { mine: false, text: "Love that shot!", time: "3h ago" },
  ],
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [activeTab, setActiveTab] = useState<string>("home");
  const [currentUser, setCurrentUser] = useState<AppContextType["currentUser"]>(null);
  const [viewingUserId, setViewingUserId] = useState<number | null>(null);

  // Core Arrays
  const [posts, setPosts] = useState<MockPost[]>([]);
  const [chats, setChats] = useState<MockChatSession[]>(INITIAL_DM_DATA);
  const [chatMessages, setChatMessages] = useState<Record<number, MockMessage[]>>(INITIAL_DM_MESSAGES);
  const [notifications, setNotifications] = useState<MockNotification[]>([]);

  // User states
  const [likedPosts, setLikedPosts] = useState<Record<number, boolean>>({});
  const [savedPosts, setSavedPosts] = useState<Set<number>>(new Set());
  const [followStates, setFollowStates] = useState<Record<number, boolean>>({});

  // Modals
  const [storyViewerIndex, setStoryViewerIndex] = useState<number | null>(null);
  const [activePostId, setActivePostId] = useState<number | null>(null);
  const [showEditProfileModal, setShowEditProfileModal] = useState<boolean>(false);
  const [showCreatePostModal, setShowCreatePostModal] = useState<boolean>(false);
  const [showStoryCreate, setShowStoryCreate] = useState<boolean>(false);
  const [followersModal, setFollowersModal] = useState<AppContextType["followersModal"]>(null);

  // Stories
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Stories helpers
  const loadStories = async () => {
    try {
      const dbStories = await api.getStories() as DbStory[];
      const groupsMap: Record<string, StoryGroup> = {};
      dbStories.forEach((story) => {
        const u = story.user;
        if (!u) return;
        if (!groupsMap[story.userId]) {
          groupsMap[story.userId] = {
            userId: story.userId,
            username: u.username,
            avatarUrl: u.avatarUrl || `https://i.pravatar.cc/150?u=${story.userId}`,
            stories: [],
          };
        }
        groupsMap[story.userId].stories.push(story);
      });
      setStoryGroups(Object.values(groupsMap));
    } catch (err) {
      console.error("Failed to load stories:", err);
    }
  };

  const createStory = async (file: File, opts?: { caption?: string }) => {
    try {
      showToast("Uploading story... ⚡", "info");
      await api.createStory(file, opts);
      showToast("Story shared! ✨", "success");
      await loadStories();
    } catch (err: any) {
      console.error("Failed to create story:", err);
      showToast(err.message || "Failed to create story", "info");
    }
  };

  // Init Data on start
  useEffect(() => {
    // Fetch posts from Supabase
    const loadFeed = async () => {
      try {
        loadStories();

        const { posts: dbPosts } = await api.getFeed(1, 20);
        const mapped: MockPost[] = dbPosts.map((p: any) => {
          // Build media URL list
          const mediaList: string[] = Array.isArray(p.mediaUrls) && p.mediaUrls.length > 0
            ? p.mediaUrls.map((m: any) => (typeof m === "string" ? m : m?.url)).filter(Boolean)
            : [];

          // A text-only post: no media, and thumbnailUrl stores the CSS gradient string
          const isTextOnly =
            mediaList.length === 0 &&
            typeof p.thumbnailUrl === "string" &&
            (p.thumbnailUrl.startsWith("linear-gradient") || p.thumbnailUrl.startsWith("radial-gradient"));

          const bgGradient  = isTextOnly ? p.thumbnailUrl : undefined;
          const img         = isTextOnly ? "" : (mediaList[0] || p.thumbnailUrl || "");
          const filterVal   = p.masterUrl && p.masterUrl !== "none" ? p.masterUrl : undefined;

          return {
            id: p.id,
            user: {
              id: p.user?.id || 0,
              name: p.user?.username || "unknown",
              full: p.user?.fullName || p.user?.username || "User",
              img: p.user?.avatarUrl || "https://i.pravatar.cc/80?img=1",
              followers: 0,
              following: 0,
              bio: "",
              verified: p.user?.isVerified || false,
            },
            img,
            imgs: isTextOnly ? [] : mediaList,
            caption: p.caption || "",
            likes: p._count?.likes ?? 0,
            comments: [],
            time: p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "recently",
            hasStory: false,
            location: p.location || "",
            filter: filterVal,
            bgGradient,
            isTextOnly,
          };
        });
        setPosts(mapped);
      } catch (err) {
        console.error("Failed to load feed:", err);
      }
    };
    loadFeed();


    // Generate notifications
    const initialNotifications: MockNotification[] = [
      { id: 1, type: "like", user: MOCK_USERS[0], text: "liked your photo.", time: "2m", unread: true },
      { id: 2, type: "comment", user: MOCK_USERS[1], text: 'commented: "This is fire 🔥"', time: "15m", unread: true },
      { id: 3, type: "follow", user: MOCK_USERS[2], text: "started following you.", time: "1h", unread: true },
      { id: 4, type: "like", user: MOCK_USERS[3], text: "liked your reel.", time: "2h", unread: true },
      { id: 5, type: "mention", user: MOCK_USERS[4], text: "mentioned you in a comment.", time: "3h", unread: true },
      { id: 6, type: "follow", user: MOCK_USERS[5], text: "started following you.", time: "1d", unread: false },
      { id: 7, type: "like", user: MOCK_USERS[6], text: "and 48 others liked your photo.", time: "2d", unread: false },
      { id: 8, type: "tag", user: MOCK_USERS[7], text: "tagged you in a post.", time: "3d", unread: false },
      { id: 9, type: "follow", user: MOCK_USERS[0], text: "and others you may know joined Instagram.", time: "1w", unread: false },
      { id: 10, type: "like", user: MOCK_USERS[1], text: "liked your story.", time: "1w", unread: false },
    ];
    setNotifications(initialNotifications);

    // Listen for auth state changes — this is the SINGLE source of truth for user state
    const initAuth = () => {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (session?.user) {
            try {
              const meta = session.user.user_metadata || {};
              // username preference: user_metadata → email prefix
              const rawUsername = (meta.username as string)
                || (meta.email as string)?.split('@')[0]
                || session.user.email?.split('@')[0]
                || `user_${Date.now()}`;
              const username = rawUsername.replace(/[^a-zA-Z0-9_.]/g, '_').toLowerCase();
              const fullName  = (meta.full_name as string) || (meta.fullName as string) || username;
              const avatarUrl = (meta.avatar_url as string) || (meta.picture as string) || '';

              // Try to load existing profile first (fastest path)
              let { data: dbUser } = await supabase
                .from('User')
                .select('id, username, fullName, bio, avatarUrl, isVerified')
                .eq('id', session.user.id)
                .maybeSingle();

              // If not found, insert a new profile
              if (!dbUser) {
                const { data: newUser } = await supabase
                  .from('User')
                  .insert({
                    id: session.user.id,
                    username,
                    email: session.user.email || '',
                    fullName,
                    avatarUrl,
                    passwordHash: '',
                    bio: 'Welcome to AuraGram! ✨',
                    isVerified: false,
                  })
                  .select('id, username, fullName, bio, avatarUrl, isVerified')
                  .maybeSingle();
                dbUser = newUser;
              }

              if (dbUser) {
                const user = {
                  id: dbUser.id,
                  name: dbUser.username,
                  img: dbUser.avatarUrl || `https://i.pravatar.cc/150?u=${session.user.id}`,
                  full: dbUser.fullName || dbUser.username,
                  bio: dbUser.bio || 'Welcome to AuraGram! ✨',
                  web: '',
                  gender: 'Prefer not to say',
                };
                setCurrentUser(user);
                if (typeof window !== 'undefined') {
                  localStorage.setItem('insta_me', JSON.stringify(user));
                  localStorage.setItem('token', session.access_token);
                }
                // Route to home after any sign-in
                if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                  setActiveTab('home');
                }
              }
            } catch (err) {
              console.error('onAuthStateChange error:', err);
            }
          } else {
            // Signed out
            setCurrentUser(null);
            if (typeof window !== 'undefined') {
              localStorage.removeItem('insta_me');
              localStorage.removeItem('token');
            }
          }
        }
      );
      return () => subscription.unsubscribe();
    };
    const unsubscribeAuth = initAuth();
    return () => { if (unsubscribeAuth) unsubscribeAuth(); };
  }, []);

  // Toasts helpers
  const showToast = (text: string, type: ToastMessage["type"] = "info") => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 2800);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Auth operations — only handle Supabase auth calls + toast/error
  // ALL state updates happen inside onAuthStateChange above
  const doLogin = async (email: string, pass: string) => {
    try {
      await api.login({ email, password: pass });
      showToast('Welcome back! 👋', 'info');
    } catch (err: any) {
      const msg = err.message || 'Login failed';
      showToast(msg, 'info');
      throw err; // re-throw so AuthScreen can stop spinner
    }
  };

  const doRegister = async (data: { username: string; email: string; pass: string; fullName: string }) => {
    try {
      const result = await api.register({
        username: data.username,
        email: data.email,
        password: data.pass,
        fullName: data.fullName,
      }) as any;
      if (result.session) {
        // Email confirmation disabled — session immediately available
        showToast('Account created! 🎉', 'success');
      } else {
        // Email confirmation required
        showToast('Check your email to confirm your account! 📧', 'info');
      }
    } catch (err: any) {
      const msg = err.message || 'Registration failed';
      showToast(msg, 'info');
      throw err;
    }
  };

  const doLoginWithGoogle = async () => {
    try {
      await api.signInWithGoogle();
    } catch (err: any) {
      showToast(err.message || 'Google Sign-In failed', 'info');
    }
  };

  const doLogout = () => {
    api.clearToken(); // calls supabase.auth.signOut() → onAuthStateChange fires
  };

  // Actions
  const toggleLike = (postId: number) => {
    setLikedPosts((prev) => {
      const isLiked = !prev[postId];
      // update feed post counts
      setPosts((currentPosts) =>
        currentPosts.map((p) => {
          if (p.id === postId) {
            return {
              ...p,
              likes: p.likes + (isLiked ? 1 : -1),
            };
          }
          return p;
        })
      );
      return { ...prev, [postId]: isLiked };
    });
  };

  const toggleSave = (postId: number) => {
    setSavedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
        showToast("Removed from saved collection", "save");
      } else {
        next.add(postId);
        showToast("Saved to collection 🔖", "save");
      }
      return next;
    });
  };

  const toggleFollow = (userId: number) => {
    setFollowStates((prev) => {
      const isFollowing = !prev[userId];
      showToast(isFollowing ? "Following! 🎉" : "Unfollowed", "follow");
      return { ...prev, [userId]: isFollowing };
    });
  };

  const addComment = (postId: number, text: string) => {
    if (!text.trim()) return;
    setPosts((prevPosts) =>
      prevPosts.map((p) => {
        if (p.id === postId) {
          const newComment: MockComment = {
            id: Date.now(),
            user: { id: 0, name: currentUser?.name || "alex_dev", img: currentUser?.img || "https://i.pravatar.cc/80?img=1" },
            text: text,
            time: "now",
            liked: false,
          };
          return {
            ...p,
            comments: [...p.comments, newComment],
          };
        }
        return p;
      })
    );
    showToast("Comment posted!", "comment");
  };

  const sendMessage = (chatId: number, text: string) => {
    if (!text.trim()) return;

    const newMsg: MockMessage = { mine: true, text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    
    // Update local messages history
    setChatMessages((prev) => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), newMsg],
    }));

    // Update conversation preview in sidebar list
    setChats((prevChats) =>
      prevChats.map((c) => {
        if (c.id === chatId) {
          return {
            ...c,
            preview: text,
            time: "now",
            unread: 0,
          };
        }
        return c;
      })
    );

    // Simulate timed auto-reply
    setTimeout(() => {
      const replies = [
        "That's awesome! 🙌",
        "Haha totally! 😂",
        "Let me get back to you soon on that.",
        "Nice, let's catch up this weekend! ☕",
        "Wow! 🔥",
        "👍💯",
      ];
      const randomReply = replies[Math.floor(Math.random() * replies.length)];
      const replyMsg: MockMessage = { mine: false, text: randomReply, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
      
      setChatMessages((prev) => ({
        ...prev,
        [chatId]: [...(prev[chatId] || []), replyMsg],
      }));

      let partnerName = "";
      setChats((prevChats) =>
        prevChats.map((c) => {
          if (c.id === chatId) {
            partnerName = c.user.name;
            return {
              ...c,
              preview: randomReply,
              time: "now",
            };
          }
          return c;
        })
      );

      // Trigger a new message toast if the reply is successful!
      if (partnerName) {
        showToast(`New message from ${partnerName}: ${randomReply}`, "message");
      }
    }, 1200 + Math.random() * 800);
  };

  const sendEmojiMessage = (chatId: number, emoji: string) => {
    sendMessage(chatId, emoji);
  };

  const createPost = async (
    files: File[],
    caption: string,
    options?: { location?: string; filter?: string; feelings?: string; tags?: string[]; music?: string; bgGradient?: string; isTextOnly?: boolean }
  ) => {
    let finalCaption = caption;
    if (options?.feelings) {
      finalCaption = `${options.feelings} — ${finalCaption}`;
    }
    if (options?.tags && options.tags.length > 0) {
      finalCaption = `${finalCaption}\n\nTags: ${options.tags.map((t) => `@${t}`).join(", ")}`;
    }
    if (options?.music) {
      finalCaption = `${finalCaption}\n\n🎵 Music: ${options.music}`;
    }

    try {
      showToast("Sharing your post… ✨", "info");
      const dbPost = await api.createPost({
        caption: finalCaption || "New post! 📸",
        location: options?.location,
        files: files.length > 0 ? files : undefined,
        bgGradient: options?.bgGradient,
        isTextOnly: options?.isTextOnly,
        filter: options?.filter,
      });

      const mediaUrls = Array.isArray(dbPost.mediaUrls) && dbPost.mediaUrls.length > 0
        ? dbPost.mediaUrls.map((m: any) => (typeof m === 'string' ? m : m.url))
        : (dbPost.thumbnailUrl ? [dbPost.thumbnailUrl] : []);

      const newPost: MockPost = {
        id: dbPost.id,
        user: {
          id: dbPost.user?.id || 0,
          name: dbPost.user?.username || currentUser?.name || "me",
          full: dbPost.user?.fullName || currentUser?.full || "Me",
          img: dbPost.user?.avatarUrl || currentUser?.img || "https://i.pravatar.cc/150?img=1",
          followers: 0,
          following: 0,
          bio: currentUser?.bio || "",
          verified: dbPost.user?.isVerified || false,
        },
        img: dbPost.thumbnailUrl || mediaUrls[0] || "",
        imgs: mediaUrls,
        caption: finalCaption || "New post! 📸",
        likes: 0,
        comments: [],
        time: "just now",
        hasStory: false,
        location: options?.location || "",
        filter: options?.filter,
        bgGradient: options?.bgGradient,
        isTextOnly: options?.isTextOnly || false,
      };
      setPosts((prev) => [newPost, ...prev]);
      showToast("Post shared! 🎉", "success");
    } catch (err: any) {
      console.error("Create post error:", err);
      showToast(err.message || "Failed to share post", "info");
    }
  };

  const saveProfileChanges = (data: { name: string; username: string; web: string; bio: string; gender: string }) => {
    if (!currentUser) return;
    const updated = {
      ...currentUser,
      full: data.name,
      name: data.username,
      web: data.web,
      bio: data.bio,
      gender: data.gender,
    };
    setCurrentUser(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("insta_me", JSON.stringify(updated));
    }
    showToast("Profile saved! ✅", "success");
  };

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        currentUser,
        doLogin,
        doRegister,
        doLoginWithGoogle,
        doLogout,
        viewingUserId,
        setViewingUserId,
        users: MOCK_USERS,
        posts,
        setPosts,
        chats,
        setChats,
        chatMessages,
        notifications,
        setNotifications,
        likedPosts,
        savedPosts,
        followStates,
        toggleLike,
        toggleSave,
        toggleFollow,
        addComment,
        sendMessage,
        sendEmojiMessage,
        createPost,
        saveProfileChanges,
        storyViewerIndex,
        setStoryViewerIndex,
        activePostId,
        setActivePostId,
        showEditProfileModal,
        setShowEditProfileModal,
        showCreatePostModal,
        setShowCreatePostModal,
        followersModal,
        setFollowersModal,
        showStoryCreate,
        setShowStoryCreate,
        storyGroups,
        loadStories,
        createStory,
        toasts,
        showToast,
        removeToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
