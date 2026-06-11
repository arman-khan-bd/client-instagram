"use client";

import React, { useState, useEffect, useRef } from "react";
import { useApp, MockPost } from "../AppContext";
import { Heart, MessageCircle, Send, MoreHorizontal, Music, Play, Pause, Volume2, VolumeX } from "lucide-react";

const MOCK_REEL_VIDEOS = [
  "https://assets.mixkit.co/videos/preview/mixkit-girl-in-neon-sign-in-night-city-43019-large.mp4",
  "https://assets.mixkit.co/videos/preview/mixkit-forest-stream-in-the-sunlight-529-large.mp4",
  "https://assets.mixkit.co/videos/preview/mixkit-waves-in-the-ocean-1427-large.mp4",
  "https://assets.mixkit.co/videos/preview/mixkit-tree-with-yellow-flowers-in-the-wind-3343-large.mp4"
];

export default function Reels() {
  const { posts, likedPosts, toggleLike, toggleFollow, followStates, setActivePostId, showToast } = useApp();
  const [autoScroll, setAutoScroll] = useState(true);
  const [activeVideoIdx, setActiveVideoIdx] = useState(0);
  const [showMenuId, setShowMenuId] = useState<number | null>(null);
  const [muted, setMuted] = useState(true);
  
  // Track play/pause state for each video card locally
  const [isPlaying, setIsPlaying] = useState<Record<number, boolean>>({});

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Record<number, HTMLVideoElement | null>>({});

  // Filter or resolve reels posts
  const reelsList = React.useMemo(() => {
    const dbReels = posts.filter((p) => p.isReel || p.mediaType === "video");
    if (dbReels.length > 0) return dbReels;

    // Fall back to first few posts but attach mock video URLs
    return posts.slice(0, 4).map((p, idx) => ({
      ...p,
      isReel: true,
      mediaType: "video" as const,
      img: MOCK_REEL_VIDEOS[idx % MOCK_REEL_VIDEOS.length],
    }));
  }, [posts]);

  // Handle active video autoplay when in view
  useEffect(() => {
    const observerOptions = {
      root: containerRef.current,
      threshold: 0.6, // Active if 60% in view
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

    // Observe each reel card
    const cards = containerRef.current?.querySelectorAll("[data-reel-card]");
    cards?.forEach((card) => observer.observe(card));

    return () => {
      cards?.forEach((card) => observer.unobserve(card));
    };
  }, [reelsList]);

  // Click to Play/Pause
  const togglePlayPause = (idx: number) => {
    const video = videoRefs.current[idx];
    if (!video) return;

    if (video.paused) {
      video.play().catch(() => {});
      setIsPlaying((prev) => ({ ...prev, [idx]: true }));
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
    navigator.clipboard.writeText(window.location.origin + `/reel/${post.id}`);
    showToast("Reel link copied! 📋", "share");
  };

  return (
    <div className="flex-1 bg-black h-full w-full relative flex items-center justify-center">
      {/* Floating Glassmorphic Auto-Scroll Toggle */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 select-none flex items-center gap-2.5 px-4.5 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-lg transition hover:bg-white/15">
        <span className="text-[12px] font-bold tracking-wide text-white/95">Auto Scroll</span>
        <button
          onClick={() => {
            setAutoScroll(!autoScroll);
            showToast(autoScroll ? "Auto scroll disabled" : "Auto scroll enabled! 🔄");
          }}
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
        onClick={() => {
          setMuted(!muted);
          showToast(muted ? "Sound ON 🔊" : "Muted 🔇");
        }}
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
          const isLiked = !!likedPosts[post.id];
          const isFollowing = !!followStates[post.user.id];
          const active = activeVideoIdx === idx;
          const playing = isPlaying[idx];

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
                src={post.img} // Holds video stream url in resolved list
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
                {/* Like / React */}
                <button
                  onClick={() => toggleLike(post.id)}
                  className={`flex flex-col items-center gap-1 cursor-pointer hover:scale-110 active:scale-90 transition ${
                    isLiked ? "text-red-500" : "text-white"
                  }`}
                >
                  <Heart size={26} fill={isLiked ? "currentColor" : "none"} />
                  <span className="text-[11px] font-bold shadow-md">
                    {post.likes + (isLiked ? 1 : 0)}
                  </span>
                </button>

                {/* Comment */}
                <button
                  onClick={() => setActivePostId(post.id)}
                  className="flex flex-col items-center gap-1 cursor-pointer hover:scale-110 active:scale-90 transition"
                >
                  <MessageCircle size={26} />
                  <span className="text-[11px] font-bold shadow-md">{post.comments.length}</span>
                </button>

                {/* Share */}
                <button
                  onClick={() => copyReelLink(post)}
                  className="flex flex-col items-center gap-1 cursor-pointer hover:scale-110 active:scale-90 transition"
                >
                  <Send size={26} />
                  <span className="text-[11px] font-bold shadow-md">Share</span>
                </button>

                {/* More options (Three dots) */}
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

                {/* Audio Rotation Vinyl Indicator */}
                <div className="flex items-center gap-2.5 text-[11px] text-white/95">
                  <div className="w-8 h-8 rounded-full bg-[#111] border border-white/20 flex items-center justify-center animate-spin-slow shadow-lg">
                    <Music size={13} className="text-white" />
                  </div>
                  <span className="truncate font-semibold drop-shadow-sm">Original audio · {post.user.name}</span>
                </div>
              </div>

              {/* Inline Three-Dot Action Menu Overlay */}
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
                      onClick={() => { setShowMenuId(null); showToast("Reel reported! 🛡️"); }}
                      className="py-3.5 text-red-500 font-bold border-b border-zinc-800 hover:bg-zinc-800 transition cursor-pointer"
                    >
                      Report
                    </button>
                    <button
                      onClick={() => { setShowMenuId(null); showToast("Reel marked as not interested"); }}
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
    </div>
  );
}
