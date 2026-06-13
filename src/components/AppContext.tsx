"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "../lib/api";
import { supabase } from "../lib/supabase";
import { scanFileForAdultContent } from "../lib/nsfwDetector";

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
  thumbnailUrls?: string[];
  caption: string;
  likes: number;
  comments: MockComment[];
  time: string;
  hasStory: boolean;
  location: string;
  filter?: string;
  bgGradient?: string;
  isTextOnly?: boolean;
  isReel?: boolean;
  mediaType?: "image" | "video" | "text";
  originalPostId?: number;
  isAdult?: boolean;
  isAdultUnmarked?: boolean;
}

export interface MockMessage {
  id?: number;
  mine: boolean;
  senderId?: string;
  sender?: { id: string; username: string; fullName: string; avatarUrl: string };
  text: string;
  time: string;
  reel?: boolean;
  mediaUrl?: string;
  mediaType?: string;
  replyToId?: number;
  replyTo?: { id: number; text: string; senderName: string };
  reactions?: Record<string, string>;
  isEdited?: boolean;
  expiresAt?: string;
}

export interface MockChatSession {
  id: number;
  isGroup: boolean;
  name?: string;
  avatarUrl?: string;
  createdBy?: string;
  user: MockUser;
  participants: { id: string; username: string; fullName: string; avatarUrl: string }[];
  preview: string;
  time: string;
  unread: number;
  online: boolean;
}

export interface MockNotification {
  id: number;
  type: string;
  user: MockUser;
  text: string;
  time: string;
  img?: string;
  unread: boolean;
  postId?: number;
  storyId?: number;
  createdAt?: string;
  isVideoStory?: boolean;
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
  bgColor?: string;
  expiresAt: string;
  createdAt: string;
  audioUrl?: string;
  musicName?: string;
  metadata?: any;
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
  setActiveTab: (tab: string, customViewingUserId?: string | number | null) => void;
  currentUser: { id: string; name: string; img: string; full: string; bio: string; web: string; gender: string } | null;
  doLogin: (email: string, pass: string) => Promise<void>;
  doRegister: (data: { username: string; email: string; pass: string; fullName: string }) => Promise<void>;
  doLoginWithGoogle: () => Promise<void>;
  doLogout: () => void;
  activeChatId: number | null;
  setActiveChatId: (id: number | null) => void;

  // Viewing other users profiles
  viewingUserId: string | number | null;
  setViewingUserId: (id: string | number | null) => void;

  // State arrays
  users: MockUser[];
  posts: MockPost[];
  setPosts: React.Dispatch<React.SetStateAction<MockPost[]>>;
  isFeedLoaded: boolean;
  chats: MockChatSession[];
  setChats: React.Dispatch<React.SetStateAction<MockChatSession[]>>;
  chatMessages: Record<number, MockMessage[]>;
  notifications: MockNotification[];
  setNotifications: React.Dispatch<React.SetStateAction<MockNotification[]>>;

  // User Actions States
  likedPosts: Record<number, boolean>;
  savedPosts: Set<number>;
  followStates: Record<string | number, boolean>;

  // Pending (optimistic) comments — keyed by postId
  pendingComments: Record<number, MockComment[]>;

  // Interaction handlers
  toggleLike: (postId: number) => void;
  toggleSave: (postId: number) => void;
  toggleFollow: (userId: string | number) => void;
  addComment: (postId: number, text: string) => void;
  clearPendingComments: (postId: number) => void;
  sendMessage: (chatId: number, text?: string, options?: { mediaUrl?: string; mediaType?: string; replyToId?: number; duration?: number }) => void;
  sendEmojiMessage: (chatId: number, emoji: string) => void;
  loadMessages: (conversationId: number) => Promise<void>;
  editMessage: (messageId: number, text: string) => Promise<void>;
  deleteMessage: (messageId: number) => Promise<void>;
  reactToMessage: (messageId: number, emoji: string) => Promise<void>;
  createConversation: (options: { name?: string; avatarUrl?: string; isGroup?: boolean; participantIds: string[] }) => Promise<any>;
  createPost: (files: File[], caption: string, options?: { location?: string; filter?: string; feelings?: string; tags?: string[]; music?: string; bgGradient?: string; isTextOnly?: boolean; thumbnailDataUrl?: string; thumbnailDataUrls?: Record<number, string> }) => Promise<void>;
  saveProfileChanges: (data: { name: string; username: string; web: string; bio: string; gender: string; avatarUrl?: string }) => Promise<void>;

  // Share dialog
  sharePostId: number | null;
  setSharePostId: (id: number | null) => void;

  // Report dialog
  reportPostId: number | null;
  setReportPostId: (id: number | null) => void;

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
  followersModal: { open: boolean; type: "followers" | "following"; userId: string | number } | null;
  setFollowersModal: (data: { open: boolean; type: "followers" | "following"; userId: string | number } | null) => void;

  // Stories
  storyGroups: StoryGroup[];
  loadStories: () => Promise<void>;
  createStory: (file: File, opts?: { caption?: string; bgColor?: string; audioUrl?: string; musicName?: string; metadata?: any; audioFile?: File }) => Promise<void>;
  loadNotifications: () => Promise<void>;

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

// Map URL pathname → tab name
const PATHNAME_TO_TAB: Record<string, string> = {
  "/": "home",
  "/search": "search",
  "/explore": "explore",
  "/reels": "reels",
  "/messages": "messages",
  "/notifications": "notifications",
  "/profile": "profile",
  "/admin": "admin",
};
const TAB_TO_PATHNAME: Record<string, string> = {
  home: "/",
  search: "/search",
  explore: "/explore",
  reels: "/reels",
  messages: "/messages",
  notifications: "/notifications",
  profile: "/profile",
  admin: "/admin",
};

// Cache variables outside the React lifecycle to persist across route transitions
let globalCachedPosts: MockPost[] | null = null;
let globalLastFetchTime = 0;
const FETCH_CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache TTL

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();

  // Derive initial tab from URL
  const [activeTab, setActiveTabState] = useState<string>(() => {
    if (pathname.startsWith("/reels/r/")) {
      return "reels";
    }
    if (pathname.startsWith("/profile/") && pathname !== "/profile") {
      return "profile";
    }
    return PATHNAME_TO_TAB[pathname] || "home";
  });
  const [currentUser, setCurrentUser] = useState<AppContextType["currentUser"]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("insta_me");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return null;
        }
      }
    }
    return null;
  });
  const [viewingUserId, setViewingUserId] = useState<string | number | null>(null);
  const [activeChatId, setActiveChatId] = useState<number | null>(null);

  // Clear all video watch durations on reload / mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("video_time_")) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((key) => localStorage.removeItem(key));
      } catch (e) {
        console.error("Error clearing video durations on reload:", e);
      }
    }
  }, []);

  // Sync activeTab when pathname changes externally (back/forward)
  useEffect(() => {
    const isProfileUser = pathname.startsWith("/profile/") && pathname !== "/profile";
    const tab = pathname.startsWith("/reels/r/") 
      ? "reels" 
      : isProfileUser 
        ? "profile" 
        : (PATHNAME_TO_TAB[pathname] || "home");
    setActiveTabState(tab);

    if (pathname.startsWith("/reels/r/")) {
      const parts = pathname.split("/");
      const id = parts[parts.length - 1];
      if (id) {
        localStorage.setItem("activeReelId", id);
      }
    } else if (isProfileUser) {
      const parts = pathname.split("/");
      const username = decodeURIComponent(parts[parts.length - 1]);
      setViewingUserId(username);
    } else if (pathname === "/profile") {
      if (currentUser?.name) {
        router.replace(`/profile/${currentUser.name}`);
      } else {
        setViewingUserId(null);
      }
    }
  }, [pathname, currentUser, router]);

  // setActiveTab pushes to router AND updates local state
  const setActiveTab = useCallback((tab: string, customViewingUserId?: string | number | null) => {
    setActiveTabState(tab);
    let target = TAB_TO_PATHNAME[tab] || "/";
    const vId = customViewingUserId !== undefined ? customViewingUserId : viewingUserId;
    if (tab === "profile") {
      const username = vId || currentUser?.name;
      if (username) {
        target = `/profile/${username}`;
      }
    }
    if (pathname !== target && !(tab === "reels" && pathname.startsWith("/reels/r/"))) {
      router.push(target);
    }
  }, [router, pathname, viewingUserId, currentUser]);

  // Core Arrays
  const [posts, setPosts] = useState<MockPost[]>([]);
  const [isFeedLoaded, setIsFeedLoaded] = useState<boolean>(false);
  const [chats, setChats] = useState<MockChatSession[]>([]);
  const [chatMessages, setChatMessages] = useState<Record<number, MockMessage[]>>({});
  const [notifications, setNotifications] = useState<MockNotification[]>([]);

  // Pending (optimistic) comments — bridge between feed inline comment and PostModal
  const [pendingComments, setPendingComments] = useState<Record<number, MockComment[]>>({});

  // Share dialog
  const [sharePostId, setSharePostId] = useState<number | null>(null);

  // Report dialog
  const [reportPostId, setReportPostId] = useState<number | null>(null);

  // User states
  const [likedPosts, setLikedPosts] = useState<Record<number, boolean>>({});
  const [savedPosts, setSavedPosts] = useState<Set<number>>(new Set());
  const [followStates, setFollowStates] = useState<Record<string | number, boolean>>({});

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

  // Dynamic document title update based on active tab/viewing user
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (activeTab === "home") {
      document.title = "AuraGram";
    } else if (activeTab === "reels") {
      if (pathname.startsWith("/reels/r/")) {
        const parts = pathname.split("/");
        const id = parts[parts.length - 1];
        const post = posts.find(p => p.id.toString() === id);
        if (post) {
          document.title = `Reel by @${post.user.name} • AuraGram`;
        } else {
          document.title = "Watch Reels • AuraGram";
        }
      } else {
        document.title = "Reels • AuraGram";
      }
    } else if (activeTab === "explore") {
      document.title = "Explore • AuraGram";
    } else if (activeTab === "search") {
      document.title = "Search • AuraGram";
    } else if (activeTab === "messages") {
      document.title = "Inbox • Chats";
    } else if (activeTab === "notifications") {
      document.title = "Notifications • AuraGram";
    } else if (activeTab === "profile") {
      if (viewingUserId) {
        document.title = `@${viewingUserId} • AuraGram photos and videos`;
      } else if (currentUser) {
        document.title = `@${currentUser.name} • AuraGram photos and videos`;
      } else {
        document.title = "Profile • AuraGram";
      }
    } else if (activeTab === "admin") {
      document.title = "Admin Panel • AuraGram Dashboard";
    } else {
      document.title = "AuraGram";
    }
  }, [activeTab, viewingUserId, pathname, posts, currentUser]);

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

  const loadChats = async () => {
    if (!currentUser) return;
    try {
      const convs = await api.getConversations();
      const mappedChats: MockChatSession[] = convs.map((conv: any) => {
        let otherUser = conv.participants.find((p: any) => p.id !== currentUser.id);
        if (!otherUser && conv.participants.length > 0) {
          otherUser = conv.participants[0];
        }
        
        const userObj: MockUser = {
          id: otherUser?.id || "0",
          name: conv.isGroup ? (conv.name || "Group Chat") : (otherUser?.username || "unknown"),
          full: conv.isGroup ? "Group Conversation" : (otherUser?.fullName || "User"),
          img: conv.isGroup 
            ? (conv.avatarUrl || "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=120&h=120&fit=crop") 
            : (otherUser?.avatarUrl || "https://i.pravatar.cc/80?img=1"),
          followers: 0,
          following: 0,
          bio: "",
          verified: false
        };

        const lastMsg = conv.lastMessage;
        let previewText = "";
        if (lastMsg) {
          if (lastMsg.mediaUrl) {
            previewText = lastMsg.mediaType === "video" ? "📹 Shared a video" : "📷 Shared a photo";
          } else {
            previewText = lastMsg.text || "";
          }
        }

        const relativeTime = lastMsg?.createdAt
          ? new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : "";

        return {
          id: conv.id,
          isGroup: conv.isGroup,
          name: conv.name,
          avatarUrl: conv.avatarUrl,
          createdBy: conv.createdBy,
          user: userObj,
          participants: conv.participants || [],
          preview: previewText || "No messages yet",
          time: relativeTime,
          unread: conv.unreadCount || 0,
          online: conv.isGroup ? false : true
        };
      });
      setChats(mappedChats);
    } catch (err) {
      console.error("Failed to load conversations:", err);
    }
  };

  const loadMessages = async (conversationId: number) => {
    try {
      const dbMsgs = await api.getMessages(conversationId);
      const mapped: MockMessage[] = dbMsgs.map((msg: any) => {
        let replyObj = undefined;
        if (msg.replyToId) {
          const parentMsg = dbMsgs.find((m: any) => m.id === msg.replyToId);
          if (parentMsg) {
            replyObj = {
              id: parentMsg.id,
              text: parentMsg.text || (parentMsg.mediaUrl ? "Shared media" : ""),
              senderName: parentMsg.senderId === currentUser?.id ? "You" : (parentMsg.sender?.username || "user")
            };
          }
        }

        const relativeTime = msg.createdAt
          ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : "now";

        return {
          id: msg.id,
          mine: msg.senderId === currentUser?.id,
          senderId: msg.senderId,
          sender: msg.sender,
          text: msg.text || "",
          mediaUrl: msg.mediaUrl,
          mediaType: msg.mediaType,
          replyToId: msg.replyToId,
          replyTo: replyObj,
          reactions: msg.reactions || {},
          isEdited: msg.isEdited,
          time: relativeTime
        };
      });

      setChatMessages((prev) => ({
        ...prev,
        [conversationId]: mapped
      }));
    } catch (err) {
      console.error("Failed to load messages for conversation:", conversationId, err);
    }
  };

  const loadNotifications = async () => {
    try {
      const dbNotifs = await api.getNotifications();
      const mapped = dbNotifs.map((n: any) => {
        const relativeTime = n.createdAt
          ? new Date(n.createdAt).toLocaleDateString()
          : "recently";

        const notifier = n.notifier || {};
        const mockUser: MockUser = {
          id: notifier.id || "0",
          name: notifier.username || "unknown",
          full: notifier.fullName || notifier.username || "User",
          img: notifier.avatarUrl || "https://i.pravatar.cc/80?img=1",
          followers: 0,
          following: 0,
          bio: "",
          verified: false,
        };

        let imgUrl = undefined;
        let isVideoStory = false;
        if (n.post) {
          const mediaList: string[] = Array.isArray(n.post.mediaUrls) && n.post.mediaUrls.length > 0
            ? n.post.mediaUrls.map((m: any) => (typeof m === "string" ? m : m?.url)).filter(Boolean)
            : [];
          imgUrl = n.post.thumbnailUrl || mediaList[0] || undefined;
        } else if (n.story) {
          imgUrl = n.story.mediaUrl || undefined;
          isVideoStory = n.story.mediaType === "video";
        }

        return {
          id: n.id,
          type: n.type,
          user: mockUser,
          text: n.text || "",
          time: relativeTime,
          img: imgUrl,
          unread: n.unread,
          postId: n.postId || undefined,
          storyId: n.storyId || undefined,
          createdAt: n.createdAt,
          isVideoStory,
        };
      });
      setNotifications(mapped);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  };

  // Load saved posts, followings, and notifications
  useEffect(() => {
    if (!currentUser) {
      setSavedPosts(new Set());
      setFollowStates({});
      setNotifications([]);
      return;
    }

    api.getSavedPosts()
      .then((savedList) => {
        const savedIds = new Set(savedList.map((p: any) => p.id));
        setSavedPosts(savedIds);
      })
      .catch((err) => {
        console.error("Failed to load saved posts:", err);
      });

    api.getFollowingList()
      .then((followingList) => {
        const states: Record<string | number, boolean> = {};
        followingList.forEach((u: any) => {
          states[u.id] = true;
          states[u.username] = true;
        });
        setFollowStates(states);
      })
      .catch((err) => {
        console.error("Failed to load following list:", err);
      });

    loadNotifications();

    // Set up periodic polling fallback every 8 seconds to ensure updates are fetched
    const pollInterval = setInterval(() => {
      loadNotifications();
    }, 8000);

    // Set up Supabase Realtime channel subscription for instant updates on Notification insertions or updates
    const channel = supabase
      .channel(`public:Notification:${currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'Notification',
          filter: `receiverId=eq.${currentUser.id}`,
        },
        (payload) => {
          console.log("Realtime notification update received:", payload);
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  // Refetch notifications when user clicks on/switches to the notifications tab
  useEffect(() => {
    if (currentUser && activeTab === "notifications") {
      loadNotifications();
    }
  }, [activeTab, currentUser]);

  // Load and subscribe to real-time chat & message updates
  useEffect(() => {
    if (!currentUser) {
      setChats([]);
      setChatMessages({});
      return;
    }

    loadChats();

    // Subscribe to Message changes (new/edited/deleted messages)
    const messageChannel = supabase
      .channel('public:Message-live')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'Message'
        },
        (payload) => {
          console.log("Realtime message change received:", payload);
          loadChats();

          const newMsg = payload.new as any;
          const oldMsg = payload.old as any;
          const convId = newMsg?.conversationId || oldMsg?.conversationId;
          
          if (convId) {
            loadMessages(convId);
          }
        }
      )
      .subscribe();

    // Subscribe to Conversation & Participant changes (new group created, etc)
    const chatSyncChannel = supabase
      .channel('public:chat-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Conversation' },
        () => loadChats()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ConversationParticipant' },
        () => loadChats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(chatSyncChannel);
    };
  }, [currentUser]);

  const createStory = async (file: File, opts?: { caption?: string; bgColor?: string; audioUrl?: string; musicName?: string; metadata?: any; audioFile?: File }) => {
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
      const now = Date.now();
      if (globalCachedPosts && (now - globalLastFetchTime < FETCH_CACHE_TTL)) {
        setPosts(globalCachedPosts);
        loadStories();
        return;
      }

      try {
        loadStories();

        const { posts: dbPosts } = await api.getFeed(1, 20);
        const mapped: MockPost[] = dbPosts.map((p: any) => {
          // Build media URL list
          const mediaList: string[] = Array.isArray(p.mediaUrls) && p.mediaUrls.length > 0
            ? p.mediaUrls.map((m: any) => (typeof m === "string" ? m : m?.url)).filter(Boolean)
            : [];

          const thumbnailUrls: string[] = Array.isArray(p.mediaUrls) && p.mediaUrls.length > 0
            ? p.mediaUrls.map((m: any) => (typeof m === "string" ? "" : m?.thumbnailUrl || "")).filter(Boolean)
            : [];

          // A text-only post: thumbnailUrl stores the CSS gradient string
          // Use gradient detection as the canonical signal — no real image/video has a gradient thumbnailUrl
          const isGradient =
            typeof p.thumbnailUrl === "string" &&
            (p.thumbnailUrl.startsWith("linear-gradient") || p.thumbnailUrl.startsWith("radial-gradient"));
          const isTextOnly = isGradient;

          const isVideo = !isTextOnly && mediaList.some(
            (m) =>
              typeof m === "string" &&
              (m.endsWith(".mp4") ||
                m.endsWith(".mov") ||
                m.endsWith(".webm") ||
                m.includes("/video/upload/"))
          );

          const bgGradient  = isTextOnly ? p.thumbnailUrl : undefined;
          const img         = isTextOnly ? "" : (p.thumbnailUrl || mediaList[0] || "");
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
            thumbnailUrls: isTextOnly ? [] : thumbnailUrls,
            caption: p.caption || "",
            likes: p._count?.likes ?? 0,
            comments: [],
            time: p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "recently",
            hasStory: false,
            location: p.location || "",
            filter: filterVal,
            bgGradient,
            isTextOnly,
            isReel: isVideo,
            mediaType: isTextOnly ? "text" : (isVideo ? "video" : "image"),
            isAdult: p.isAdult || false,
            isAdultUnmarked: p.isAdultUnmarked || false,
          };
        });

        globalCachedPosts = mapped;
        globalLastFetchTime = Date.now();
        setPosts(mapped);
      } catch (err) {
        console.error("Failed to load feed:", err);
      } finally {
        setIsFeedLoaded(true);
      }
    };
    
    if (globalCachedPosts && (Date.now() - globalLastFetchTime < FETCH_CACHE_TTL)) {
      setIsFeedLoaded(true);
    }
    
    loadFeed();


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
              // Sanitize: only alphanumeric, dots, underscores
              let username = rawUsername.replace(/[^a-zA-Z0-9_.]/g, '_').toLowerCase();
              const fullName  = (meta.full_name as string) || (meta.fullName as string) || username;
              const avatarUrl = (meta.avatar_url as string) || (meta.picture as string) || '';

              // Try to load existing profile first (fastest path)
              let { data: dbUser } = await supabase
                .from('User')
                .select('id, username, fullName, bio, avatarUrl, isVerified')
                .eq('id', session.user.id)
                .maybeSingle();

              // If not found, upsert a new profile (handles duplicate username conflicts gracefully)
              if (!dbUser) {
                // Check if username is already taken by another user, and suffix if needed
                const { data: existingUser } = await supabase
                  .from('User')
                  .select('id')
                  .eq('username', username)
                  .neq('id', session.user.id)
                  .maybeSingle();
                if (existingUser) {
                  username = `${username}_${Math.floor(Math.random() * 9000 + 1000)}`;
                }

                const { data: newUser, error: insertErr } = await supabase
                  .from('User')
                  .upsert({
                    id: session.user.id,
                    username,
                    email: session.user.email || '',
                    fullName,
                    avatarUrl,
                    passwordHash: '',
                    bio: 'Welcome to AuraGram! ✨',
                    isVerified: false,
                  }, { onConflict: 'id' })
                  .select('id, username, fullName, bio, avatarUrl, isVerified')
                  .maybeSingle();

                if (insertErr) {
                  console.error('User upsert error:', insertErr);
                  // Last resort: try to fetch again in case of race condition
                  const { data: retryUser } = await supabase
                    .from('User')
                    .select('id, username, fullName, bio, avatarUrl, isVerified')
                    .eq('id', session.user.id)
                    .maybeSingle();
                  dbUser = retryUser;
                } else {
                  dbUser = newUser;
                }
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
                // Only redirect to home on explicit sign-in (not on token refresh or initial session restore)
                if (event === 'SIGNED_IN') {
                  setActiveTab('home');
                }
              } else {
                console.error('Could not load or create User profile for:', session.user.id);
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
    // Toast notifications disabled
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
    api.clearToken();
    setCurrentUser(null);
    setViewingUserId(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('insta_me');
      localStorage.removeItem('token');
    }
    setActiveTabState('home');
    router.push('/');
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

  const toggleSave = async (postId: number) => {
    // Optimistic UI update
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

    try {
      await api.toggleSavePost(postId);
    } catch (err: any) {
      // Rollback
      setSavedPosts((prev) => {
        const next = new Set(prev);
        if (next.has(postId)) {
          next.delete(postId);
        } else {
          next.add(postId);
        }
        return next;
      });
      showToast(err.message || "Failed to save post", "info");
    }
  };

  const toggleFollow = (userId: string | number) => {
    setFollowStates((prev) => {
      const isFollowing = !prev[userId];
      showToast(isFollowing ? "Following! 🎉" : "Unfollowed", "follow");
      api.toggleFollow(userId.toString()).catch(console.error);
      const next = { ...prev, [userId]: isFollowing };
      next[userId.toString()] = isFollowing;
      return next;
    });
  };

  const addComment = (postId: number, text: string) => {
    if (!text.trim()) return;
    const newComment: MockComment = {
      id: Date.now(),
      user: { id: 0, name: currentUser?.name || "alex_dev", img: currentUser?.img || "https://i.pravatar.cc/80?img=1" },
      text: text,
      time: "now",
      liked: false,
    };
    // Update post.comments in feed
    setPosts((prevPosts) =>
      prevPosts.map((p) => {
        if (p.id === postId) {
          return { ...p, comments: [...p.comments, newComment] };
        }
        return p;
      })
    );
    // Also push to pendingComments so PostModal can pick it up immediately
    setPendingComments((prev) => ({
      ...prev,
      [postId]: [...(prev[postId] || []), newComment],
    }));
    showToast("Comment posted!", "comment");
  };

  // Called by PostModal after it loads fresh DB comments, so we don't show duplicates
  const clearPendingComments = useCallback((postId: number) => {
    setPendingComments((prev) => {
      const next = { ...prev };
      delete next[postId];
      return next;
    });
  }, []);

  const sendMessage = async (chatId: number, text?: string, options?: { mediaUrl?: string; mediaType?: string; replyToId?: number; duration?: number }) => {
    if (!text?.trim() && !options?.mediaUrl) return;
    try {
      const expiresAt = options?.duration
        ? new Date(Date.now() + options.duration * 1000).toISOString()
        : undefined;

      await api.sendMessage({
        conversationId: chatId,
        text: text || undefined,
        mediaUrl: options?.mediaUrl,
        mediaType: options?.mediaType,
        replyToId: options?.replyToId,
        expiresAt
      });
      await loadMessages(chatId);
      await loadChats();
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const sendEmojiMessage = (chatId: number, emoji: string) => {
    sendMessage(chatId, emoji);
  };

  const editMessage = async (messageId: number, text: string) => {
    try {
      await api.editMessage(messageId, text);
    } catch (err) {
      console.error("Error editing message:", err);
    }
  };

  const deleteMessage = async (messageId: number) => {
    try {
      await api.deleteMessage(messageId);
    } catch (err) {
      console.error("Error deleting message:", err);
    }
  };

  const reactToMessage = async (messageId: number, emoji: string) => {
    try {
      await api.reactToMessage(messageId, emoji);
    } catch (err) {
      console.error("Error reacting to message:", err);
    }
  };

  const createConversation = async (options: { name?: string; avatarUrl?: string; isGroup?: boolean; participantIds: string[] }) => {
    try {
      const conv = await api.createConversation(options);
      await loadChats();
      return conv;
    } catch (err) {
      console.error("Error creating conversation:", err);
      throw err;
    }
  };

  const createPost = async (
    files: File[],
    caption: string,
    options?: { location?: string; filter?: string; feelings?: string; tags?: string[]; music?: string; bgGradient?: string; isTextOnly?: boolean; thumbnailDataUrl?: string; thumbnailDataUrls?: Record<number, string> }
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
        thumbnailDataUrl: options?.thumbnailDataUrl,
        thumbnailDataUrls: options?.thumbnailDataUrls,
      });

      const mediaUrls = Array.isArray(dbPost.mediaUrls) && dbPost.mediaUrls.length > 0
        ? dbPost.mediaUrls.map((m: any) => (typeof m === 'string' ? m : m.url))
        : (dbPost.thumbnailUrl ? [dbPost.thumbnailUrl] : []);

      const thumbnailUrls = Array.isArray(dbPost.mediaUrls) && dbPost.mediaUrls.length > 0
        ? dbPost.mediaUrls.map((m: any) => (typeof m === 'string' ? '' : m.thumbnailUrl || ''))
        : [];

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
        thumbnailUrls,
        caption: finalCaption || "New post! 📸",
        likes: 0,
        comments: [],
        time: "just now",
        hasStory: false,
        location: options?.location || "",
        filter: options?.filter,
        bgGradient: options?.bgGradient,
        isTextOnly: options?.isTextOnly || false,
        isReel: mediaUrls.some(
          (m: string) =>
            m.endsWith(".mp4") ||
            m.endsWith(".mov") ||
            m.endsWith(".webm") ||
            m.includes("/video/upload/")
        ),
        mediaType: options?.isTextOnly
          ? "text"
          : mediaUrls.some(
              (m: string) =>
                m.endsWith(".mp4") ||
                m.endsWith(".mov") ||
                m.endsWith(".webm") ||
                m.includes("/video/upload/")
            )
          ? "video"
          : "image",
      };
      setPosts((prev) => [newPost, ...prev]);
      globalCachedPosts = null;
      globalLastFetchTime = 0;
      showToast("Post shared! 🎉", "success");

      // Run background NSFW/adult check on the files
      if (files.length > 0) {
        (async () => {
          try {
            console.log("Background NSFW check started for post:", dbPost.id);
            let containsAdult = false;
            for (const file of files) {
              const scan = await scanFileForAdultContent(file);
              if (scan.isAdult) {
                containsAdult = true;
                break;
              }
            }
            if (containsAdult) {
              console.log(`NSFW content detected in post ${dbPost.id}! Updating DB...`);
              await api.flagPostNSFW(dbPost.id, true);
              setPosts((current) =>
                current.map((p) => (p.id === dbPost.id ? { ...p, isAdult: true } : p))
              );
            }
          } catch (err) {
            console.error("Background NSFW check failed:", err);
          }
        })();
      }
    } catch (err: any) {
      console.error("Create post error:", err);
      showToast(err.message || "Failed to share post", "info");
    }
  };

  const saveProfileChanges = async (data: { name: string; username: string; web: string; bio: string; gender: string; avatarUrl?: string }) => {
    if (!currentUser) return;
    try {
      showToast("Updating profile... ⚡", "info");
      await api.updateProfile({
        fullName: data.name,
        username: data.username,
        bio: data.bio,
        avatarUrl: data.avatarUrl,
      });

      const updated = {
        ...currentUser,
        full: data.name,
        name: data.username,
        web: data.web,
        bio: data.bio,
        gender: data.gender,
        img: data.avatarUrl || currentUser.img,
      };
      setCurrentUser(updated);
      if (typeof window !== "undefined") {
        localStorage.setItem("insta_me", JSON.stringify(updated));
      }
      showToast("Profile saved! ✅", "success");
    } catch (err: any) {
      console.error("Failed to save profile changes:", err);
      showToast(err.message || "Failed to update profile", "info");
      throw err;
    }
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
        activeChatId,
        setActiveChatId,
        viewingUserId,
        setViewingUserId,
        users: MOCK_USERS,
        posts,
        setPosts,
        isFeedLoaded,
        chats,
        setChats,
        chatMessages,
        notifications,
        setNotifications,
        likedPosts,
        savedPosts,
        followStates,
        pendingComments,
        toggleLike,
        toggleSave,
        toggleFollow,
        addComment,
        clearPendingComments,
        sendMessage,
        sendEmojiMessage,
        loadMessages,
        editMessage,
        deleteMessage,
        reactToMessage,
        createConversation,
        createPost,
        saveProfileChanges,
        sharePostId,
        setSharePostId,
        reportPostId,
        setReportPostId,
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
        loadNotifications,
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
