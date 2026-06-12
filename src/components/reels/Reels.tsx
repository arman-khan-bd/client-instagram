"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useApp, MockPost } from "../AppContext";
import { Heart, MessageCircle, Send, MoreHorizontal, Music, Play, Pause, Volume2, VolumeX, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../../lib/api";
import { REACTIONS } from "../feed/PostCard";
import ReactionsModal from "../modals/ReactionsModal";

const MOCK_REEL_VIDEOS = [
  "https://assets.mixkit.co/videos/preview/mixkit-girl-in-neon-sign-in-night-city-43019-large.mp4",
  "https://assets.mixkit.co/videos/preview/mixkit-forest-stream-in-the-sunlight-529-large.mp4",
  "https://assets.mixkit.co/videos/preview/mixkit-waves-in-the-ocean-1427-large.mp4",
  "https://assets.mixkit.co/videos/preview/mixkit-tree-with-yellow-flowers-in-the-wind-3343-large.mp4"
];

export default function Reels() {
  const { 
    posts, 
    likedPosts, 
    toggleLike, 
    toggleFollow, 
    followStates, 
    addComment,
    pendingComments,
    currentUser
  } = useApp();

  const [autoScroll, setAutoScroll] = useState(true);
  const [activeVideoIdx, setActiveVideoIdx] = useState(0);
  const [showMenuId, setShowMenuId] = useState<number | null>(null);
  const [muted, setMuted] = useState(true);
  
  // Track play/pause state for each video card locally
  const [isPlaying, setIsPlaying] = useState<Record<number, boolean>>({});

  // Comments drawer local states
  const [drawerPost, setDrawerPost] = useState<MockPost | null>(null);
  const [newCommentText, setNewCommentText] = useState("");

  // Reactions state for reels
  const [reelsReactions, setReelsReactions] = useState<Record<number, { type: string; list: any[] }>>({});
  const [hoveredReelIdx, setHoveredReelIdx] = useState<number | null>(null);
  const [showPickerForReelId, setShowPickerForReelId] = useState<number | null>(null);
  
  // Reactors modal
  const [reactorPostId, setReactorPostId] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Record<number, HTMLVideoElement | null>>({});

  // Filter and flat-map all video/reels posts
  const reelsList = React.useMemo(() => {
    const dbReels: any[] = [];
    
    posts.forEach((p) => {
      const isVideo = (url: string) =>
        typeof url === "string" &&
        (url.match(/\.(mp4|mov|webm)/i) || url.includes("/video/upload/"));

      const videoUrls = (p.imgs && p.imgs.length > 0)
        ? p.imgs.filter(isVideo)
        : (p.img && isVideo(p.img) ? [p.img] : []);

      if (videoUrls.length > 0) {
        videoUrls.forEach((videoUrl, vIdx) => {
          dbReels.push({
            ...p,
            id: p.id * 1000 + vIdx, // Unique key for Reels
            originalPostId: p.id,
            img: videoUrl, // Overwrite media source
            isReel: true,
            mediaType: "video" as const,
          });
        });
      } else if (p.isReel || p.mediaType === "video") {
        dbReels.push({
          ...p,
          originalPostId: p.id
        });
      }
    });

    if (dbReels.length > 0) return dbReels;

    // Fallback Mock Reels
    return posts.slice(0, 4).map((p, idx) => ({
      ...p,
      id: p.id * 1000 + 99,
      originalPostId: p.id,
      isReel: true,
      mediaType: "video" as const,
      img: MOCK_REEL_VIDEOS[idx % MOCK_REEL_VIDEOS.length],
    }));
  }, [posts]);

  // Fetch reactions on mount/change
  useEffect(() => {
    reelsList.forEach((reel) => {
      const origId = reel.originalPostId || reel.id;
      api.getPostReaction(origId).then((activeReaction) => {
        api.getPostReactionsDetails(origId).then((details) => {
          setReelsReactions((prev) => ({
            ...prev,
            [reel.id]: {
              type: (activeReaction as string) || "",
              list: (details as any[]) || []
            }
          }));
        }).catch(() => {});
      }).catch(() => {});
    });
  }, [reelsList]);

  // Handle active video autoplay when in view
  useEffect(() => {
    const observerOptions = {
      root: containerRef.current,
      threshold: 0.6,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const idx = Number(entry.target.getAttribute("data-idx"));
        const video = videoRefs.current[idx];
        if (!video) return;

        if (entry.isIntersecting) {
          setActiveVideoIdx(idx);
          video.play().catch(() => {});
          setIsPlaying((prev) => ({ ...prev, [idx]: true }));
        } else {
          video.pause();
          video.currentTime = 0;
          setIsPlaying((prev) => ({ ...prev, [idx]: false }));
        }
      });
    }, observerOptions);

    const cards = containerRef.current?.querySelectorAll("[data-reel-card]");
    cards?.forEach((card) => observer.observe(card));

    return () => {
      cards?.forEach((card) => observer.unobserve(card));
    };
  }, [reelsList]);

  // Click to Play/Pause (Auto-unmute on play click)
  const togglePlayPause = (idx: number) => {
    const video = videoRefs.current[idx];
    if (!video) return;

    if (video.paused) {
      video.play().catch(() => {});
      setIsPlaying((prev) => ({ ...prev, [idx]: true }));
      setMuted(false); // Auto-unmute on play button click
    } else {
      video.pause();
      setIsPlaying((prev) => ({ ...prev, [idx]: false }));
    }
  };

  // Auto Scroll after reel ends
  const handleVideoEnded = (idx: number) => {
    if (!autoScroll) return;

    const cards = containerRef.current?.querySelectorAll("[data-reel-card]");
    if (cards && idx < cards.length - 1) {
      const nextCard = cards[idx + 1];
      nextCard.scrollIntoView({ behavior: "smooth" });
    }
  };

  const copyReelLink = (post: MockPost) => {
    const origId = post.originalPostId || post.id;
    navigator.clipboard.writeText(window.location.origin + `/reel/${origId}`);
  };

  // Commit reaction (reels reaction system)
  const handleReact = (reelId: number, originalPostId: number, type: string) => {
    setShowPickerForReelId(null);
    const currentReelReact = reelsReactions[reelId];
    const prevType = currentReelReact?.type || "";
    const isTogglingOff = prevType === type;
    const nextType = isTogglingOff ? "" : type;

    // Optimistic Update
    setReelsReactions((prev) => {
      const currentList = prev[reelId]?.list || [];
      const filtered = currentList.filter((r) => r.userId !== currentUser?.id);
      const updatedList = isTogglingOff 
        ? filtered 
        : [...filtered, { type, userId: currentUser?.id, user: { id: currentUser?.id, username: currentUser?.name, avatarUrl: currentUser?.img } }];

      return {
        ...prev,
        [reelId]: {
          type: nextType,
          list: updatedList
        }
      };
    });

    api.reactToPost(originalPostId, type)
      .then((result) => {
        const finalReaction = result.reaction || "";
        api.getPostReactionsDetails(originalPostId).then((details) => {
          setReelsReactions((prev) => ({
            ...prev,
            [reelId]: {
              type: finalReaction,
              list: details || []
            }
          }));
        });
      })
      .catch((err) => {
        console.error("Reel reaction failed:", err);
      });
  };

  // Submit new comment inside drawer
  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!drawerPost || !newCommentText.trim()) return;

    const origId = drawerPost.originalPostId || drawerPost.id;
    addComment(origId, newCommentText.trim());
    setNewCommentText("");
  };

  return (
    <div className="flex-1 bg-black h-full w-full relative flex items-center justify-center">
      {/* Floating Glassmorphic Auto-Scroll Toggle */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 select-none flex items-center gap-2.5 px-4.5 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-lg transition hover:bg-white/15">
        <span className="text-[12px] font-bold tracking-wide text-white/95">Auto Scroll</span>
        <button
          onClick={() => setAutoScroll(!autoScroll)}
          className={`w-9 h-5 rounded-full relative transition-colors ${
            autoScroll ? "bg-white" : "bg-white/30"
          }`}
        >
          <div
            className={`w-3.5 h-3.5 rounded-full bg-black absolute top-[3px] transition-all ${
              autoScroll ? "left-[18px]" : "left-[4px]"
            }`}
          />
        </button>
      </div>

      {/* Floating Volume Indicator Toggle */}
      <button
        onClick={() => setMuted(!muted)}
        className="absolute top-4 right-4 z-30 w-9 h-9 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/15 transition shadow-lg"
      >
        {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
      </button>

      {/* Scrollable Reels Container */}
      <div
        ref={containerRef}
        className="w-full h-full md:max-w-[420px] md:h-[calc(100vh-20px)] md:rounded-2xl md:border md:border-zinc-800 overflow-y-auto snap-y snap-mandatory scrollbar-none custom-scroll relative bg-zinc-950"
      >
        {reelsList.map((post, idx) => {
          const origId = post.originalPostId || post.id;
          const isFollowing = !!followStates[post.user.id];
          const active = activeVideoIdx === idx;
          const playing = isPlaying[idx];

          const activeReaction = reelsReactions[post.id]?.type || "";
          const reactionsList = reelsReactions[post.id]?.list || [];
          
          const matchingReaction = REACTIONS.find((r) => r.type === activeReaction);

          return (
            <div
              key={`reel-${post.id}`}
              data-idx={idx}
              data-reel-card
              className="w-full h-full snap-start snap-always relative flex items-center justify-center overflow-hidden select-none bg-black"
              style={{ height: "100%" }}
            >
              {/* Video Element */}
              <video
                ref={(el) => {
                  videoRefs.current[idx] = el;
                }}
                src={post.img}
                loop={!autoScroll}
                muted={muted}
                playsInline
                onClick={() => togglePlayPause(idx)}
                onEnded={() => handleVideoEnded(idx)}
                className="w-full h-full object-cover cursor-pointer"
              />

              {/* Centered Play/Pause Overlay Animation */}
              {!playing && (
                <div
                  onClick={() => togglePlayPause(idx)}
                  className="absolute inset-0 flex items-center justify-center bg-black/25 cursor-pointer z-10"
                >
                  <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white animate-pulse">
                    <Play size={28} fill="currentColor" className="ml-1" />
                  </div>
                </div>
              )}

              {/* Dark Bottom Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30 pointer-events-none z-10" />

              {/* Reels Sidebar (Right Action Panel) */}
              <div className="absolute right-3.5 bottom-24 flex flex-col gap-5 items-center z-20 text-white select-none">
                {/* React Button & Picker */}
                <div className="relative">
                  <button
                    onClick={() => handleReact(post.id, origId, activeReaction ? activeReaction : "love")}
                    onMouseEnter={() => setShowPickerForReelId(post.id)}
                    className={`flex flex-col items-center gap-1 cursor-pointer hover:scale-110 active:scale-90 transition ${
                      activeReaction ? "text-red-500" : "text-white"
                    }`}
                  >
                    {matchingReaction ? (
                      <span className="text-[26px] leading-none">{matchingReaction.emoji}</span>
                    ) : (
                      <Heart size={26} fill="none" />
                    )}
                    <span className="text-[11px] font-bold shadow-md">
                      {reactionsList.length}
                    </span>
                  </button>

                  {/* Reaction Picker on hover */}
                  <AnimatePresence>
                    {showPickerForReelId === post.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.7, x: -160 }}
                        animate={{ opacity: 1, scale: 1, x: -160 }}
                        exit={{ opacity: 0, scale: 0.7 }}
                        onMouseLeave={() => setShowPickerForReelId(null)}
                        className="absolute bottom-12 left-1/2 flex items-center gap-1 bg-[#111]/95 backdrop-blur-xl border border-white/10 rounded-full px-2.5 py-1.5 shadow-2xl z-50 select-none"
                      >
                        {REACTIONS.map((r, rIdx) => (
                          <button
                            key={r.type}
                            onClick={() => handleReact(post.id, origId, r.type)}
                            className="text-[22px] hover:scale-130 transition cursor-pointer p-0.5"
                          >
                            {r.emoji}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Comment Drawer Trigger */}
                <button
                  onClick={() => setDrawerPost(post)}
                  className="flex flex-col items-center gap-1 cursor-pointer hover:scale-110 active:scale-90 transition"
                >
                  <MessageCircle size={26} />
                  <span className="text-[11px] font-bold shadow-md">
                    {(post.comments?.length || 0) + (pendingComments[origId]?.length || 0)}
                  </span>
                </button>

                {/* Share */}
                <button
                  onClick={() => copyReelLink(post)}
                  className="flex flex-col items-center gap-1 cursor-pointer hover:scale-110 active:scale-90 transition"
                >
                  <Send size={26} />
                  <span className="text-[11px] font-bold shadow-md">Share</span>
                </button>

                {/* Menu options */}
                <button
                  onClick={() => setShowMenuId(showMenuId === post.id ? null : post.id)}
                  className="flex flex-col items-center gap-1 cursor-pointer hover:scale-110 active:scale-90 transition p-1 bg-black/20 hover:bg-black/40 rounded-full"
                >
                  <MoreHorizontal size={24} />
                </button>
              </div>

              {/* Reels Info Details (Bottom Left) */}
              <div className="absolute left-4.5 bottom-6 max-w-[calc(100%-75px)] z-20 text-white select-none">
                {/* User Info Row */}
                <div className="flex items-center gap-3 mb-2.5">
                  <img
                    src={post.user.img}
                    alt={post.user.name}
                    className="w-9 h-9 rounded-full border border-white/40 object-cover"
                  />
                  <span className="font-bold text-[14px] drop-shadow-md truncate">{post.user.name}</span>
                  {post.user.verified && <span className="text-insta-blue text-xs">✓</span>}
                  
                  <button
                    onClick={() => toggleFollow(post.user.id)}
                    className={`px-3.5 py-1 rounded-full text-[11px] font-bold cursor-pointer transition select-none ${
                      isFollowing
                        ? "border border-white/30 bg-transparent hover:bg-white/10"
                        : "bg-white text-black hover:bg-zinc-200"
                    }`}
                  >
                    {isFollowing ? "Following" : "Follow"}
                  </button>
                </div>

                {/* Caption Details */}
                <p className="text-[13px] leading-relaxed line-clamp-3 mb-3.5 select-text drop-shadow-sm font-medium">
                  {post.caption}
                </p>

                {/* Audio Vinyl Indicator */}
                <div className="flex items-center gap-2.5 text-[11px] text-white/95">
                  <div className="w-8 h-8 rounded-full bg-[#111] border border-white/20 flex items-center justify-center animate-spin-slow shadow-lg">
                    <Music size={13} className="text-white" />
                  </div>
                  <span className="truncate font-semibold drop-shadow-sm">Original audio · {post.user.name}</span>
                </div>
              </div>

              {/* Three-Dot Option Menu Overlay */}
              {showMenuId === post.id && (
                <div
                  onClick={() => setShowMenuId(null)}
                  className="absolute inset-0 bg-black/60 z-40 flex items-center justify-center p-6 backdrop-blur-sm transition-all"
                >
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-[280px] bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col text-center text-sm shadow-2xl scale-100"
                  >
                    <button
                      onClick={() => setShowMenuId(null)}
                      className="py-3.5 text-red-500 font-bold border-b border-zinc-800 hover:bg-zinc-800 transition cursor-pointer"
                    >
                      Report
                    </button>
                    <button
                      onClick={() => setShowMenuId(null)}
                      className="py-3.5 font-semibold border-b border-zinc-800 hover:bg-zinc-800 transition cursor-pointer"
                    >
                      Not Interested
                    </button>
                    <button
                      onClick={() => { setShowMenuId(null); copyReelLink(post); }}
                      className="py-3.5 font-semibold border-b border-zinc-800 hover:bg-zinc-800 transition cursor-pointer"
                    >
                      Copy Link
                    </button>
                    <button
                      onClick={() => setShowMenuId(null)}
                      className="py-3.5 text-zinc-400 hover:bg-zinc-800 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Custom Sliding Comments Drawer (Bottom Sheet) */}
      <AnimatePresence>
        {drawerPost && (() => {
          const origId = drawerPost.originalPostId || drawerPost.id;
          const dbComments = drawerPost.comments || [];
          const localComments = pendingComments[origId] || [];
          const mergedComments = [...dbComments, ...localComments];

          const reactionsData = reelsReactions[drawerPost.id] || { type: "", list: [] };

          return (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                onClick={() => setDrawerPost(null)}
                className="fixed inset-0 bg-black z-[120]"
              />
              {/* Drawer Content */}
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 220 }}
                className="fixed bottom-0 left-0 right-0 h-[65vh] bg-zinc-950 border-t border-zinc-850 rounded-t-3xl z-[130] flex flex-col overflow-hidden text-white"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-900">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-[16px]">Comments</span>
                    <button 
                      onClick={() => {
                        setReactorPostId(origId);
                      }}
                      className="text-[12px] bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 px-3 py-1 rounded-full text-zinc-300 transition"
                    >
                      Reactions: {reactionsData.list.length}
                    </button>
                  </div>
                  <button
                    onClick={() => setDrawerPost(null)}
                    className="p-1 hover:bg-zinc-900 rounded-full transition text-zinc-400 hover:text-white"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Comments List */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scroll">
                  {mergedComments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-500 py-10 text-sm">
                      <span>No comments yet.</span>
                      <span>Start the conversation!</span>
                    </div>
                  ) : (
                    mergedComments.map((comment, cIdx) => (
                      <div key={`c-${comment.id || cIdx}`} className="flex items-start gap-3">
                        <img
                          src={comment.user?.img || "https://i.pravatar.cc/80?img=1"}
                          alt={comment.user?.name || "user"}
                          className="w-8 h-8 rounded-full object-cover shrink-0 border border-zinc-900"
                        />
                        <div className="flex-1 text-[13px] leading-relaxed">
                          <span className="font-bold text-white mr-1.5">{comment.user?.name}</span>
                          <span className="text-zinc-200 select-text">{comment.text}</span>
                          <div className="text-[10px] text-zinc-500 mt-1">{comment.time || "now"}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Comment Form */}
                <form onSubmit={handleCommentSubmit} className="p-4 bg-zinc-950 border-t border-zinc-900 flex gap-2">
                  <input
                    type="text"
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-2 text-sm text-white outline-none focus:border-zinc-700 transition"
                  />
                  <button
                    type="submit"
                    disabled={!newCommentText.trim()}
                    className="px-5 bg-white text-black font-semibold rounded-full text-sm hover:bg-zinc-200 disabled:opacity-50 transition"
                  >
                    Post
                  </button>
                </form>
              </motion.div>
            </>
          );
        })()}
      </AnimatePresence>

      {/* Reactions Detail Dialog */}
      {reactorPostId !== null && (
        <ReactionsModal
          isOpen={true}
          onClose={() => setReactorPostId(null)}
          postId={reactorPostId}
        />
      )}
    </div>
  );
}
