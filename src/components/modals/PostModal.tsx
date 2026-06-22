"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useApp } from "../AppContext";
import { X, Heart, MessageCircle, Send, Bookmark, Play, Volume2, VolumeX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../../lib/api";
import { REACTIONS } from "../feed/PostCard";
import ReactionsModal from "./ReactionsModal";
import Hls from "hls.js";

function ModalVideo({ src, poster, postId }: { src: string; poster?: string; postId: number }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false); // Auto unmute in dialog

  useEffect(() => {
    // Mute feed videos when modal video starts
    window.dispatchEvent(new CustomEvent("feedMuteChange", { detail: true }));
    // Dispatch play event to pause feed videos
    window.dispatchEvent(new CustomEvent("feedVideoPlay", { detail: { src: "modal" } }));
  }, []);

  const streamSrc = useMemo(() => {
    if (!src) return "";
    const cleanUrl = src.trim();
    if (cleanUrl.includes("res.cloudinary.com") && (cleanUrl.includes("/video/upload/") || cleanUrl.match(/\.(mp4|mov|webm)$/i))) {
      let hlsUrl = cleanUrl.replace(/\.(mp4|mov|webm)$/i, ".m3u8");
      if (!hlsUrl.includes("/sp_auto")) {
        hlsUrl = hlsUrl.replace("/video/upload/", "/video/upload/sp_auto/");
      }
      return hlsUrl;
    }
    return cleanUrl;
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;

    if (streamSrc.endsWith(".m3u8")) {
      if (Hls.isSupported()) {
        hls = new Hls({
          maxMaxBufferLength: 10,
          autoStartLoad: true,
        });
        hls.loadSource(streamSrc);
        hls.attachMedia(video);
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = streamSrc;
      } else {
        video.src = src;
      }
    } else {
      video.src = src;
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [src, streamSrc]);

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    const savedTime = localStorage.getItem(`video_time_${postId}`);
    if (savedTime) {
      try {
        const data = JSON.parse(savedTime);
        video.currentTime = data.time;
      } catch (err) {
        const parsed = parseFloat(savedTime);
        if (!isNaN(parsed) && parsed > 0) {
          video.currentTime = parsed;
        }
      }
    }
    video.play().catch(() => {});
  };

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  return (
    <div className="relative w-full h-full bg-black cursor-pointer" onClick={handlePlayPause}>
      <video
        ref={videoRef}
        poster={poster}
        className="w-full h-full object-contain"
        playsInline
        muted={muted}
        loop
        autoPlay
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={(e) => {
          const video = e.currentTarget;
          if (video.currentTime > 0) {
            localStorage.setItem(`video_time_${postId}`, JSON.stringify({ time: video.currentTime, savedAt: Date.now() }));
          }
        }}
      />
      
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/25 pointer-events-none z-10">
          <div className="w-16 h-16 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20">
            <Play size={28} className="text-white ml-1" fill="white" />
          </div>
        </div>
      )}

      <button
        onClick={(e) => {
          e.stopPropagation();
          setMuted(!muted);
        }}
        className="absolute bottom-3 right-3 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 transition z-10"
      >
        {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
      </button>
    </div>
  );
}

type ReactionType = typeof REACTIONS[number]["type"] | null;

interface DbComment {
  id: number;
  text: string;
  createdAt: string;
  likeCount: number;
  isLiked: boolean;
  parentId?: number;
  user: { id: string; username: string; fullName?: string; avatarUrl?: string };
}

export default function PostModal() {
  const {
    activePostId, setActivePostId,
    posts, likedPosts, savedPosts,
    toggleLike,
    setViewingUserId, setActiveTab,
    showToast, pendingComments, clearPendingComments,
    addComment,
  } = useApp();

  const [commentText, setCommentText]         = useState("");
  const [dbComments, setDbComments]           = useState<DbComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [currentReaction, setCurrentReaction] = useState<ReactionType>(null);
  const [reactionsList, setReactionsList]     = useState<{ type: string; userId: string }[]>([]);
  const [showReactionsModal, setShowReactionsModal] = useState(false);

  const commentsEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLInputElement>(null);

  const handleUserClick = (username: string) => {
    setViewingUserId(username);
    setActiveTab("profile", username);
    setActivePostId(null);
  };

  const formatCaption = (text: string) => {
    if (!text) return "";
    return text.split(/(\s+)/).map((part, i) => {
      if (part.startsWith("#")) {
        return <span key={i} className="text-[#3897f0] cursor-pointer hover:underline">{part}</span>;
      }
      if (part.startsWith("@") && part.length > 1) {
        const cleanName = part.substring(1).replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
        return (
          <span
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              handleUserClick(cleanName);
            }}
            className="text-insta-blue font-semibold cursor-pointer hover:underline"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const [fetchedPost, setFetchedPost] = useState<any | null>(null);
  const [loadingPost, setLoadingPost] = useState(false);

  const activePost = useMemo(() => {
    const fromFeed = posts.find((p) => p.id === activePostId);
    if (fromFeed) return fromFeed;
    return fetchedPost;
  }, [posts, activePostId, fetchedPost]);

  const [replyingTo, setReplyingTo] = useState<DbComment | null>(null);

  // Load comments + reaction details when drawer opens
  useEffect(() => {
    if (!activePostId) {
      setDbComments([]);
      setCurrentReaction(null);
      setReactionsList([]);
      setReplyingTo(null);
      setFetchedPost(null);
      return;
    }

    const fromFeed = posts.find((p) => p.id === activePostId);
    if (fromFeed && fromFeed.originalPostId) {
      setActivePostId(fromFeed.originalPostId);
      return;
    }



    if (!fromFeed) {
      setLoadingPost(true);
      api.getPost(activePostId)
        .then((dbPost) => {
          if (dbPost.originalPostId) {
            setActivePostId(dbPost.originalPostId);
            return;
          }
          const rawOriginalPost = Array.isArray(dbPost.originalPost) ? dbPost.originalPost[0] : dbPost.originalPost;
          const isShared = !!(dbPost.originalPostId && rawOriginalPost && rawOriginalPost.id);
          const targetPostForMedia = isShared ? rawOriginalPost : dbPost;
          const mediaList: string[] = Array.isArray(targetPostForMedia.mediaUrls) && targetPostForMedia.mediaUrls.length > 0
            ? targetPostForMedia.mediaUrls.map((m: any) => (typeof m === "string" ? m : m?.url)).filter(Boolean)
            : [];
          const thumbnailUrls: string[] = Array.isArray(targetPostForMedia.mediaUrls) && targetPostForMedia.mediaUrls.length > 0
            ? targetPostForMedia.mediaUrls.map((m: any) => (typeof m === "string" ? "" : m?.thumbnailUrl || "")).filter(Boolean)
            : [];
          const isGradient =
            typeof targetPostForMedia.thumbnailUrl === "string" &&
            (targetPostForMedia.thumbnailUrl.startsWith("linear-gradient") || targetPostForMedia.thumbnailUrl.startsWith("radial-gradient"));
          const isTextOnly = isGradient;
          const isVideo = !isTextOnly && mediaList.some(
            (m) =>
              typeof m === "string" &&
              (m.endsWith(".mp4") ||
                m.endsWith(".mov") ||
                m.endsWith(".webm") ||
                m.includes("/video/upload/"))
          );
          const bgGradient = isTextOnly ? targetPostForMedia.thumbnailUrl : undefined;
          const img = isTextOnly ? "" : (targetPostForMedia.thumbnailUrl || mediaList[0] || "");
          const filterVal = targetPostForMedia.masterUrl && targetPostForMedia.masterUrl !== "none" ? targetPostForMedia.masterUrl : undefined;

          // Map originalPost relation
          const originalPostMapped = isShared ? (() => {
            const origIsTextOnly = typeof rawOriginalPost.thumbnailUrl === "string" && (rawOriginalPost.thumbnailUrl.startsWith("linear-gradient") || rawOriginalPost.thumbnailUrl.startsWith("radial-gradient"));
            const origIsVideo = rawOriginalPost.mediaUrls?.some((m: any) => (typeof m === 'string' ? m : m.url)?.match(/\.(mp4|mov|webm)/i)) || false;
            return {
              id: rawOriginalPost.id,
              user: {
                id: rawOriginalPost.user?.id || 0,
                name: rawOriginalPost.user?.username || "user",
                full: rawOriginalPost.user?.fullName || "User",
                img: rawOriginalPost.user?.avatarUrl || "https://i.pravatar.cc/150?img=1",
                followers: 0,
                following: 0,
                bio: "",
                verified: rawOriginalPost.user?.isVerified || false,
              },
              img: rawOriginalPost.thumbnailUrl || (rawOriginalPost.mediaUrls?.[0]?.url || rawOriginalPost.mediaUrls?.[0] || ""),
              imgs: rawOriginalPost.mediaUrls?.map((m: any) => typeof m === 'string' ? m : m.url) || [],
              caption: rawOriginalPost.caption || "",
              likes: 0,
              comments: [],
              time: "",
              hasStory: false,
              location: rawOriginalPost.location || "",
              isTextOnly: origIsTextOnly,
              mediaType: origIsVideo ? "video" : (origIsTextOnly ? "text" : "image")
            };
          })() : undefined;

          setFetchedPost({
            id: dbPost.id,
            user: {
              id: dbPost.user?.id || 0,
              name: dbPost.user?.username || "unknown",
              full: dbPost.user?.fullName || dbPost.user?.username || "User",
              img: dbPost.user?.avatarUrl || "https://i.pravatar.cc/80?img=1",
              followers: 0,
              following: 0,
              bio: "",
              verified: dbPost.user?.isVerified || false,
            },
            img,
            imgs: isTextOnly ? [] : mediaList,
            thumbnailUrls: isTextOnly ? [] : thumbnailUrls,
            caption: dbPost.caption || "",
            likes: dbPost._count?.likes ?? 0,
            comments: [],
            time: dbPost.createdAt ? new Date(dbPost.createdAt).toLocaleDateString() : "recently",
            hasStory: false,
            location: dbPost.location || "",
            filter: filterVal,
            bgGradient,
            isTextOnly,
            isReel: isVideo,
            mediaType: isTextOnly ? "text" : (isVideo ? "video" : "image"),
            originalPostId: dbPost.originalPostId,
            originalPost: originalPostMapped,
          });
        })
        .catch((err) => {
          console.error("Failed to fetch active post details:", err);
          showToast("Failed to load post details", "info");
        })
        .finally(() => {
          setLoadingPost(false);
        });
    }

    setLoadingComments(true);
    const timer = setTimeout(() => {
      setLoadingComments(false);
    }, 3000);

    Promise.all([
      api.getComments(activePostId).catch((err) => {
        console.warn("Failed to get comments:", err);
        return [];
      }),
      api.getPostReaction(activePostId).catch((err) => {
        console.warn("Failed to get reaction:", err);
        return null;
      }),
      api.getPostReactionsDetails(activePostId).catch((err) => {
        console.warn("Failed to get reactions details:", err);
        return [];
      }),
    ])
      .then(([comments, reaction, reactionsDetails]) => {
        clearTimeout(timer);
        setDbComments((comments || []) as DbComment[]);
        if (reaction) setCurrentReaction(reaction as ReactionType);
        else setCurrentReaction(null);
        setReactionsList((reactionsDetails || []) as any[]);
        clearPendingComments(activePostId);
      })
      .catch((err) => {
        console.error("Promise.all comments load error:", err);
      })
      .finally(() => setLoadingComments(false));

    return () => clearTimeout(timer);
  }, [activePostId, clearPendingComments, posts, showToast]);

  // Auto-scroll to newest comment
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [dbComments.length]);

  const commitReaction = useCallback(
    async (type: string) => {
      if (!activePostId) return;
      try {
        const result = await api.reactToPost(activePostId, type);
        if (result.reaction === null) {
          setCurrentReaction(null);
          toggleLike(activePostId as unknown as number);
        } else {
          setCurrentReaction(result.reaction as ReactionType);
          toggleLike(activePostId as unknown as number);
        }
        api.getPostReactionsDetails(activePostId).then((list) => {
          setReactionsList(list as any[]);
        }).catch(() => {});
      } catch {
        showToast("Log in to react", "info");
      }
    },
    [activePostId, toggleLike, showToast]
  );

  const allComments = (() => {
    const pending = activePostId ? (pendingComments[activePostId] || []) : [];
    const pendingAsDb: DbComment[] = pending.map((c) => ({
      id: c.id,
      text: c.text,
      createdAt: new Date().toISOString(),
      likeCount: 0,
      isLiked: false,
      user: {
        id: String(c.user.id),
        username: c.user.name,
        fullName: c.user.name,
        avatarUrl: c.user.img,
      },
    }));
    const dbTexts = new Set(dbComments.map((c) => c.text));
    const uniquePending = pendingAsDb.filter((c) => !dbTexts.has(c.text));
    return [...dbComments, ...uniquePending];
  })();

  const parentComments = useMemo(() => {
    return allComments.filter((c) => !c.parentId);
  }, [allComments]);

  const repliesMap = useMemo(() => {
    const map: Record<number, DbComment[]> = {};
    allComments.forEach((c) => {
      if (c.parentId) {
        if (!map[c.parentId]) map[c.parentId] = [];
        map[c.parentId].push(c);
      }
    });
    return map;
  }, [allComments]);

  if (!activePost) {
    if (loadingPost) {
      return (
        <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center">
          <div className="text-white">Loading post...</div>
        </div>
      );
    }
    return null;
  }

  const handleClose = () => setActivePostId(null);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    const text = commentText.trim();
    setCommentText("");
    const parentId = replyingTo?.id || undefined;
    setReplyingTo(null);

    try {
      const newComment = await api.addComment(activePost.id, text, { parentId });
      setDbComments((prev) => [...prev, newComment as DbComment]);
      addComment(activePost.id, text);
    } catch {
      showToast("Log in to comment", "info");
    }
  };

  const handleCommentLike = async (commentId: number) => {
    try {
      await api.likeComment(commentId);
      setDbComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? { ...c, isLiked: !c.isLiked, likeCount: c.likeCount + (c.isLiked ? -1 : 1) }
            : c
        )
      );
    } catch {
      showToast("Log in to like", "info");
    }
  };

  return (
    <AnimatePresence>
      {activePostId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Instagram Style 2-Column Dialog Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-[935px] h-[90vh] md:h-[80vh] bg-[var(--surface)] border border-[var(--border)] rounded-2xl md:rounded-3xl z-[210] flex flex-col md:flex-row overflow-hidden text-[var(--text)] shadow-2xl"
          >
            {/* Close button inside modal (for mobile view top header) */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 z-50 p-1.5 bg-black/60 hover:bg-black rounded-full border border-[var(--border)] transition text-zinc-400 hover:text-white md:hidden"
            >
              <X size={18} />
            </button>

            {/* Left Column: Visual Media Display with pull down gesture to close */}
            <motion.div
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0.1, bottom: 0.8 }}
              onDragEnd={(e, info) => {
                if (info.offset.y > 100) {
                  handleClose();
                }
              }}
              className="w-full md:w-[60%] h-[40%] md:h-full bg-black flex items-center justify-center relative select-none border-b md:border-b-0 md:border-r border-[var(--border)] shrink-0 cursor-grab active:cursor-grabbing"
            >
              {activePost.isTextOnly ? (
                <div
                  className="w-full h-full flex items-center justify-center p-8 text-center font-bold text-white leading-relaxed break-words"
                  style={{
                    background: activePost.bgGradient || "linear-gradient(135deg,#FF8A00,#FF2E93,#9E00FF)",
                    fontSize: "clamp(16px, 4vw, 24px)",
                    textShadow: "0 2px 10px rgba(0,0,0,0.3)"
                  }}
                >
                  {activePost.caption}
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  {(() => {
                    const mediaList = activePost.imgs && activePost.imgs.length > 0 ? activePost.imgs : [activePost.img];
                    const currentMediaUrl = mediaList[0] || "";
                    const isVideo = typeof currentMediaUrl === "string" && (
                      currentMediaUrl.match(/\.(mp4|mov|webm)/i) || currentMediaUrl.includes("/video/upload/")
                    );
 
                    if (isVideo) {
                      return (
                        <ModalVideo src={currentMediaUrl} poster={activePost.img || undefined} postId={activePost.id} />
                      );
                    }
                    return (
                      <img
                        src={currentMediaUrl}
                        alt="Post media"
                        className="w-full h-full object-contain"
                      />
                    );
                  })()}
                </div>
              )}
            </motion.div>

            {/* Right Column: Profile Header & Comments List Section */}
            <div className="flex-1 flex flex-col h-[60%] md:h-full min-w-0 bg-[var(--bg)]">
              {/* Header: User Profile Info */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] shrink-0 select-none">
                <div className="flex items-center gap-3">
                  <img
                    src={activePost.user?.img || "https://i.pravatar.cc/80?img=1"}
                    className="w-8 h-8 rounded-full object-cover border border-[var(--border)]"
                    alt={activePost.user?.name}
                  />
                  <div className="flex flex-col">
                    <span
                      onClick={() => handleUserClick(activePost.user?.name)}
                      className="text-xs font-bold text-[var(--text)] hover:underline cursor-pointer flex items-center gap-1.5"
                    >
                      {activePost.user?.name}
                      {activePost.user?.verified && <span className="verified-badge" />}
                    </span>
                    {activePost.location && (
                      <span className="text-[10px] text-[var(--text2)]">{activePost.location}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowReactionsModal(true)}
                    className="text-[10px] bg-[var(--surface2)] border border-[var(--border)] hover:bg-[var(--surface3)] px-3 py-1.5 rounded-full text-[var(--text2)] transition"
                  >
                    Reactions: {reactionsList.length}
                  </button>
                  <button
                    onClick={handleClose}
                    className="hidden md:flex p-1.5 hover:bg-[var(--surface3)] rounded-full border border-[var(--border)] transition text-[var(--text2)] hover:text-[var(--text)]"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Caption (rendered as the first comment) */}
              {activePost.caption && !activePost.isTextOnly && (
                <div className="px-5 py-3.5 border-b border-[var(--border)] bg-[var(--surface2)]/20 flex gap-3 items-start shrink-0 select-none">
                  <img
                    src={activePost.user?.img || "https://i.pravatar.cc/80?img=1"}
                    className="w-8 h-8 rounded-full object-cover border border-[var(--border)] shrink-0"
                    alt=""
                  />
                  <div className="text-[13px] leading-relaxed break-words text-[var(--text)]">
                    <span className="font-bold mr-1.5 text-[var(--text)]">{activePost.user?.name}</span>
                    {formatCaption(activePost.caption)}
                  </div>
                </div>
              )}

              {/* Original Post reference card for shared posts */}
              {activePost.originalPost && activePost.originalPost.id && (
                <div className="px-5 py-3 border-b border-[var(--border)] bg-black/[0.03] dark:bg-white/[0.03] flex flex-col gap-2 shrink-0 select-none">
                  <div className="text-[11px] font-bold text-[var(--text3)] uppercase tracking-wider flex items-center gap-1">
                    🔄 Shared a post
                  </div>
                  <div 
                    onClick={() => setActivePostId(activePost.originalPost!.id)}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface2)] cursor-pointer transition duration-200"
                  >
                    <img
                      src={activePost.originalPost.user.img}
                      className="w-7 h-7 rounded-full object-cover border border-[var(--border)]"
                      alt=""
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-bold text-[var(--text)] truncate flex items-center gap-1">
                        {activePost.originalPost.user.name}
                        {activePost.originalPost.user.verified && <span className="verified-badge w-3 h-3" />}
                      </div>
                      <div className="text-[11px] text-[var(--text2)] truncate">
                        {activePost.originalPost.caption || "View original post"}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Comments list (Scrollable Section) */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scroll">
                {loadingComments && dbComments.length === 0 && (activePost.commentsCount ?? 0) > 0 ? (
                  <div className="text-center text-[12px] text-[var(--text3)] py-8 animate-pulse">
                    Loading comments…
                  </div>
                ) : parentComments.length === 0 ? (
                  <div className="text-center text-[12px] text-[var(--text3)] py-10 select-none">
                    not comment
                  </div>
                ) : (
                  parentComments.map((c, cIdx) => {
                    const userAny = c.user as any;
                    const username = userAny?.username || userAny?.name || "user";
                    const avatarUrl = userAny?.avatarUrl || userAny?.img || `https://i.pravatar.cc/80?u=${userAny?.id || cIdx}`;
                    const displayTime = (() => {
                      if (!c.createdAt) return "now";
                      const date = new Date(c.createdAt);
                      if (isNaN(date.getTime())) return c.createdAt;
                      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    })();
                    const replies = repliesMap[c.id] || [];

                    return (
                      <div key={c.id || cIdx} className="space-y-3 select-none">
                        {/* Parent Comment */}
                        <div className="flex gap-3 items-start">
                          <img
                            src={avatarUrl}
                            className="w-8 h-8 rounded-full object-cover border border-[var(--border)] shrink-0 cursor-pointer"
                            alt={username}
                            onClick={() => handleUserClick(username)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] leading-relaxed break-words text-[var(--text)]">
                              <span
                                className="font-bold mr-1.5 text-[var(--text)] cursor-pointer hover:underline"
                                onClick={() => handleUserClick(username)}
                              >
                                {username}
                              </span>
                              {c.text}
                            </div>
                            <div className="flex items-center gap-3.5 mt-1 text-[10px] text-[var(--text2)]">
                              <span>{displayTime}</span>
                              {c.likeCount > 0 && <span>{c.likeCount} likes</span>}
                              <button
                                onClick={() => setReplyingTo(c)}
                                className="font-bold text-[var(--text3)] hover:text-[var(--text)] cursor-pointer"
                              >
                                Reply
                              </button>
                              <button
                                onClick={() => handleCommentLike(c.id)}
                                className="ml-auto hover:scale-115 active:scale-90 transition cursor-pointer text-[11px] text-[var(--text3)]"
                              >
                                {c.isLiked ? "❤️" : "🤍"}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Nested Replies */}
                        {replies.length > 0 && (
                          <div className="pl-11 space-y-3 border-l border-[var(--border)] ml-4">
                            {replies.map((reply, rIdx) => {
                              const repUser = reply.user as any;
                              const repUsername = repUser?.username || repUser?.name || "user";
                              const repAvatar = repUser?.avatarUrl || repUser?.img || `https://i.pravatar.cc/80?u=${repUser?.id || rIdx}`;
                              const repTime = (() => {
                                if (!reply.createdAt) return "now";
                                const date = new Date(reply.createdAt);
                                if (isNaN(date.getTime())) return reply.createdAt;
                                return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                              })();

                              return (
                                <div key={reply.id || rIdx} className="flex gap-2.5 items-start">
                                  <img
                                    src={repAvatar}
                                    className="w-6 h-6 rounded-full object-cover border border-[var(--border)] shrink-0 cursor-pointer"
                                    alt={repUsername}
                                    onClick={() => handleUserClick(repUsername)}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="text-[12.5px] leading-relaxed break-words text-[var(--text2)]">
                                      <span
                                        className="font-bold mr-1.5 text-[var(--text)] cursor-pointer hover:underline"
                                        onClick={() => handleUserClick(repUsername)}
                                      >
                                        {repUsername}
                                      </span>
                                      {reply.text}
                                    </div>
                                    <div className="flex items-center gap-3.5 mt-1 text-[9.5px] text-[var(--text3)]">
                                      <span>{repTime}</span>
                                      {reply.likeCount > 0 && <span>{reply.likeCount} likes</span>}
                                      <button
                                        onClick={() => setReplyingTo(c)} // Reply to parent comment
                                        className="font-bold text-[var(--text3)] hover:text-[var(--text)] cursor-pointer"
                                      >
                                        Reply
                                      </button>
                                      <button
                                        onClick={() => handleCommentLike(reply.id)}
                                        className="ml-auto hover:scale-115 active:scale-90 transition cursor-pointer text-[10px] text-[var(--text3)]"
                                      >
                                        {reply.isLiked ? "❤️" : "🤍"}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={commentsEndRef} />
              </div>

              {/* Replying To Bar */}
              {replyingTo && (
                <div className="px-5 py-1.5 bg-[var(--surface2)] border-t border-[var(--border)] flex items-center justify-between text-[11px] text-[var(--text2)] shrink-0 select-none">
                  <span>Replying to @{replyingTo.user?.username || (replyingTo.user as any)?.name || "user"}</span>
                  <button type="button" onClick={() => setReplyingTo(null)} className="text-[var(--text)] hover:underline font-semibold">
                    Cancel
                  </button>
                </div>
              )}

              {/* Comment Form */}
              <form
                onSubmit={handlePostComment}
                className="p-4 bg-[var(--surface)] border-t border-[var(--border)] flex gap-2 shrink-0 select-none"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 bg-[var(--surface2)] border border-[var(--border)] rounded-full px-4 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--text2)] transition"
                />
                <button
                  type="submit"
                  disabled={!commentText.trim()}
                  className="px-5 bg-[var(--text)] text-[var(--bg)] font-semibold rounded-full text-sm hover:opacity-90 disabled:opacity-50 transition"
                >
                  Post
                </button>
              </form>
            </div>
          </motion.div>

          <ReactionsModal
            isOpen={showReactionsModal}
            onClose={() => setShowReactionsModal(false)}
            postId={activePost.id}
          />
        </div>
      )}
    </AnimatePresence>
  );
}
