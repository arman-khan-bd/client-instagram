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

interface AppContextType {
  // Navigation & Auth
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: { name: string; img: string; full: string; bio: string; web: string; gender: string } | null;
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
  createPost: (imgSrc: string, caption: string, options?: { location?: string; filter?: string; feelings?: string; tags?: string[]; music?: string; imgs?: string[]; bgGradient?: string; isTextOnly?: boolean }) => void;
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
  followersModal: { open: boolean; type: "followers" | "following"; userId: number } | null;
  setFollowersModal: (data: { open: boolean; type: "followers" | "following"; userId: number } | null) => void;

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

const IMG_SEEDS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200, 210, 220, 230, 240, 250];
const CAPTIONS = [
  "Golden hour never gets old 🌅 #photography #sunset #golden",
  "Exploring the city one frame at a time 📸 #streetphotography",
  "Life is better with good food and good vibes 🍜 #foodie",
  "Adventure is out there waiting ✈️ #travel #explore",
  "Creating something beautiful every day 🎨 #art #design",
  "This view though 😍 #nature #views #blessed",
  "Weekend vibes only 🙌 #weekend #chill",
  "Chasing light and good moments 📷 #photography",
  "Urban jungle stories 🏙️ #urban #city #street",
  "Making memories that last forever 💫 #memories #life",
];
const COMMENTS_DATA = [
  "Absolutely stunning! 😍", "Love this so much! ❤️", "Goals! 🙌", "Where is this?!",
  "You never miss 🔥", "The lighting is perfect", "This is art 🎨", "Wow amazing shot!",
  "Totally vibing with this", "Peak aesthetic ✨", "🤩🤩🤩", "Need this on my wall",
  "Incredible content as always!", "This feed is everything", "Fire 🔥",
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
  const [followersModal, setFollowersModal] = useState<AppContextType["followersModal"]>(null);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Init Data on start
  useEffect(() => {
    // Generate initial posts
    const initialPosts: MockPost[] = IMG_SEEDS.map((seed, i) => {
      const user = MOCK_USERS[i % MOCK_USERS.length];
      const likes = Math.floor(Math.random() * 9800) + 100;
      return {
        id: i + 1,
        user,
        img: `https://picsum.photos/seed/${seed}/600/600`,
        caption: CAPTIONS[i % CAPTIONS.length],
        likes,
        comments: Array.from({ length: Math.floor(Math.random() * 8) + 2 }, (_, j) => ({
          id: j + 1,
          user: MOCK_USERS[(i + j + 1) % MOCK_USERS.length],
          text: COMMENTS_DATA[(i + j) % COMMENTS_DATA.length],
          time: `${Math.floor(Math.random() * 59) + 1}m`,
          liked: false,
        })),
        time: `${Math.floor(Math.random() * 23) + 1}h`,
        hasStory: Math.random() > 0.5,
        location: ["New York", "Paris", "Tokyo", "London", "Sydney", "Bali"][i % 6],
      };
    });
    setPosts(initialPosts);

    // Generate notifications
    const initialNotifications: MockNotification[] = [
      { id: 1, type: "like", user: MOCK_USERS[0], text: "liked your photo.", time: "2m", img: initialPosts[0]?.img, unread: true },
      { id: 2, type: "comment", user: MOCK_USERS[1], text: 'commented: "This is fire 🔥"', time: "15m", img: initialPosts[1]?.img, unread: true },
      { id: 3, type: "follow", user: MOCK_USERS[2], text: "started following you.", time: "1h", unread: true },
      { id: 4, type: "like", user: MOCK_USERS[3], text: "liked your reel.", time: "2h", img: initialPosts[2]?.img, unread: true },
      { id: 5, type: "mention", user: MOCK_USERS[4], text: "mentioned you in a comment.", time: "3h", img: initialPosts[3]?.img, unread: true },
      { id: 6, type: "follow", user: MOCK_USERS[5], text: "started following you.", time: "1d", unread: false },
      { id: 7, type: "like", user: MOCK_USERS[6], text: "and 48 others liked your photo.", time: "2d", img: initialPosts[4]?.img, unread: false },
      { id: 8, type: "tag", user: MOCK_USERS[7], text: "tagged you in a post.", time: "3d", img: initialPosts[5]?.img, unread: false },
      { id: 9, type: "follow", user: MOCK_USERS[0], text: "and others you may know joined Instagram.", time: "1w", unread: false },
      { id: 10, type: "like", user: MOCK_USERS[1], text: "liked your story.", time: "1w", img: initialPosts[6]?.img, unread: false },
    ];
    setNotifications(initialNotifications);

    // Auto load current user and listen for OAuth redirects
    const initAuth = () => {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          try {
            let { data: dbUser, error: dbError } = await supabase
              .from('User')
              .select('id, username, fullName, bio, avatarUrl, isVerified')
              .eq('id', session.user.id)
              .single();

            if (dbError || !dbUser) {
              const baseUsername = session.user.email?.split('@')[0] || `user_${Date.now()}`;
              const { data: newUser, error: createError } = await supabase
                .from('User')
                .insert({
                  id: session.user.id,
                  username: baseUsername,
                  email: session.user.email || '',
                  passwordHash: '',
                  fullName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
                  avatarUrl: session.user.user_metadata?.avatar_url || '',
                  bio: 'Welcome to AuraGram! ✨',
                })
                .select('id, username, fullName, bio, avatarUrl, isVerified')
                .single();

              if (!createError) {
                dbUser = newUser;
              }
            }

            if (dbUser) {
              const user = {
                name: dbUser.username,
                img: dbUser.avatarUrl || "https://i.pravatar.cc/150?img=1",
                full: dbUser.fullName,
                bio: dbUser.bio || "Welcome to AuraGram! ✨",
                web: "",
                gender: "Prefer not to say",
              };
              setCurrentUser(user);
              if (typeof window !== "undefined") {
                localStorage.setItem("insta_me", JSON.stringify(user));
                localStorage.setItem("token", session.access_token);
              }
            }
          } catch (err) {
            console.error("Init auth error:", err);
          }
        } else {
          setCurrentUser(null);
          if (typeof window !== "undefined") {
            localStorage.removeItem("insta_me");
            localStorage.removeItem("token");
          }
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    };
    const unsubscribeAuth = initAuth();
    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
    };
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

  // Auth operations
  const doLogin = async (email: string, pass: string) => {
    try {
      const data = await api.login({ email, password: pass });
      api.setToken(data.token);
      
      const user = {
        name: data.user.username,
        img: data.user.avatarUrl || `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 50) + 1}`,
        full: data.user.fullName,
        bio: data.user.bio || "Welcome to my profile! ✨",
        web: "",
        gender: "Prefer not to say",
      };
      
      setCurrentUser(user);
      if (typeof window !== "undefined") {
        localStorage.setItem("insta_me", JSON.stringify(user));
      }
      setActiveTab("home");
      showToast("Welcome back! 👋", "info");
    } catch (err: any) {
      showToast(err.message || "Login failed", "info");
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
      
      if (result.token) {
        api.setToken(result.token);
      }
      
      const user = {
        name: result.user.username,
        img: result.user.avatarUrl || `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 50) + 1}`,
        full: result.user.fullName,
        bio: result.user.bio || "Welcome to my profile! ✨",
        web: "",
        gender: "Prefer not to say",
      };
      
      setCurrentUser(user);
      if (typeof window !== "undefined") {
        localStorage.setItem("insta_me", JSON.stringify(user));
      }
      setActiveTab("home");
      showToast("Account created! 🎉", "success");
    } catch (err: any) {
      showToast(err.message || "Registration failed", "info");
    }
  };

  const doLoginWithGoogle = async () => {
    try {
      await api.signInWithGoogle();
    } catch (err: any) {
      showToast(err.message || "Google Sign-In failed", "info");
    }
  };

  const doLogout = () => {
    api.clearToken();
    setCurrentUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("insta_me");
    }
    showToast("Logged out successfully", "info");
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

  const createPost = (
    imgSrc: string,
    caption: string,
    options?: { location?: string; filter?: string; feelings?: string; tags?: string[]; music?: string; imgs?: string[]; bgGradient?: string; isTextOnly?: boolean }
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
    const newPost: MockPost = {
      id: posts.length + 1,
      user: {
        id: 0,
        name: currentUser?.name || "alex_dev",
        full: currentUser?.full || "Alex Developer",
        img: currentUser?.img || "https://i.pravatar.cc/150?img=1",
        followers: 1200,
        following: 400,
        bio: currentUser?.bio || "",
        verified: false,
      },
      img: imgSrc || "https://picsum.photos/seed/default/600/600",
      imgs: options?.imgs || (imgSrc ? [imgSrc] : []),
      caption: finalCaption || "New post! 📸",
      likes: 0,
      comments: [],
      time: "just now",
      hasStory: false,
      location: options?.location || "Aura Space 🌌",
      filter: options?.filter || "none",
      bgGradient: options?.bgGradient,
      isTextOnly: options?.isTextOnly || false,
    };
    setPosts((prev) => [newPost, ...prev]);
    showToast("Post shared! 🎉", "success");
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
