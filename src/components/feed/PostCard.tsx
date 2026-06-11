"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useApp, MockPost } from "../AppContext";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../../lib/api";

// ── Facebook-style reactions ──────────────────────────────────────────────────
export const REACTIONS = [
  { type: "like",    emoji: "👍", label: "Like",    color: "#0095f6" },
  { type: "love",    emoji: "❤️", label: "Love",    color: "#ff3d5a" },
  { type: "haha",    emoji: "😂", label: "Haha",    color: "#f5a623" },
  { type: "wow",     emoji: "😮", label: "Wow",     color: "#f5a623" },
  { type: "sad",     emoji: "😢", label: "Sad",     color: "#f5a623" },
  { type: "angry",   emoji: "😡", label: "Angry",   color: "#e05a00" },
] as const;

type ReactionType = typeof REACTIONS[number]["type"] | null;

function getReactionForPost(reaction: ReactionType) {
  if (!reaction) return null;
  return REACTIONS.find(r => r.type === reaction) || null;
}

// ── Reaction Picker ───────────────────────────────────────────────────────────
function ReactionPicker({
  onSelect,
  visible,
}: {
  onSelect: (type: string) => void;
  visible: boolean;
}) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.7, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.7, y: 8 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="absolute bottom-[calc(100%+8px)] left-0 flex items-center gap-1 bg-[#1a1a1a] border border-[#333] rounded-full px-3 py-2 shadow-2xl z-50 select-none"
          onMouseLeave={() => {}} // stays visible while inside
        >
          {REACTIONS.map((r) => (
            <motion.button
              key={r.type}
              whileHover={{ scale: 1.4, y: -4 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 500, damping: 20 }}
              title={r.label}
              onClick={(e) => { e.stopPropagation(); onSelect(r.type); }}
              className="text-[26px] leading-none cursor-pointer hover:drop-shadow-glow transition-all"
            >
              {r.emoji}
            </motion.button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface PostCardProps {
  post: MockPost;
}

export default function PostCard({ post }: PostCardProps) {
  const {
    likedPosts,
    savedPosts,
    toggleLike,
    toggleSave,
    toggleFollow,
    addComment,
    setViewingUserId,
    setActiveTab,
    setActivePostId,
    showToast,
  } = useApp();

  const [commentText, setCommentText] = useState("");
  const [showHeartPop, setShowHeartPop] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [activeImgIndex, setActiveImgIndex] = useState(0);

  // Reaction state
  const [currentReaction, setCurrentReaction] = useState<ReactionType>(null);
  const [showReactions, setShowReactions] = useState(false);
  const [heartPopEmoji, setHeartPopEmoji] = useState("❤️");
  const reactionBtnRef = useRef<HTMLButtonElement>(null);
  const reactionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideReactionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Long-press state for image
  const [showImgReactions, setShowImgReactions] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isLiked = !!likedPosts[post.id] || !!currentReaction;
  const isSaved = savedPosts.has(post.id);
  const reactionInfo = getReactionForPost(currentReaction);

  // Load user's existing reaction on mount
  useEffect(() => {
    api.getPostReaction(post.id).then((r) => {
      if (r) setCurrentReaction(r as ReactionType);
    }).catch(() => {});
  }, [post.id]);

  // ── Double-click like ──────────────────────────────────────────────────────
  const handleDoubleTap = useCallback(() => {
    setShowHeartPop(true);
    setHeartPopEmoji("❤️");
    setTimeout(() => setShowHeartPop(false), 900);
    if (!isLiked) {
      handleReaction("love");
    }
  }, [isLiked]);

  // ── Reaction selection ─────────────────────────────────────────────────────
  const handleReaction = useCallback(async (type: string) => {
    setShowReactions(false);
    setShowImgReactions(false);
    try {
      const result = await api.reactToPost(post.id, type);
      if (result.reaction === null) {
        setCurrentReaction(null);
        toggleLike(post.id); // un-like
      } else {
        setCurrentReaction(result.reaction as ReactionType);
        if (!isLiked) toggleLike(post.id); // ensure liked
      }
      const r = REACTIONS.find(r => r.type === type);
      if (r) showToast(`Reacted with ${r.label} ${r.emoji}`, "notification");
    } catch {
      showToast("Must be logged in to react", "info");
    }
  }, [post.id, isLiked, toggleLike, showToast]);

  const handleSimpleLike = useCallback(async () => {
    if (currentReaction || isLiked) {
      // toggle off
      try {
        await api.reactToPost(post.id, currentReaction || "like");
      } catch {}
      setCurrentReaction(null);
      toggleLike(post.id);
    } else {
      await handleReaction("like");
    }
  }, [currentReaction, isLiked, post.id, handleReaction, toggleLike]);

  // ── Hover to show reactions (desktop) ─────────────────────────────────────
  const handleLikeMouseEnter = () => {
    reactionTimerRef.current = setTimeout(() => setShowReactions(true), 400);
  };
  const handleLikeMouseLeave = () => {
    if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
    hideReactionTimerRef.current = setTimeout(() => setShowReactions(false), 300);
  };
  const handlePickerMouseEnter = () => {
    if (hideReactionTimerRef.current) clearTimeout(hideReactionTimerRef.current);
  };
  const handlePickerMouseLeave = () => {
    hideReactionTimerRef.current = setTimeout(() => setShowReactions(false), 200);
  };

  // ── Long-press on image ────────────────────────────────────────────────────
  const handleImagePointerDown = (e: React.PointerEvent) => {
    longPressTimerRef.current = setTimeout(() => {
      setShowImgReactions(true);
    }, 550);
  };
  const handleImagePointerUp = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
  };
  const handleImagePointerCancel = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const handlePostComment = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commentText.trim()) return;
    addComment(post.id, commentText);
    setCommentText("");
  };

  const handleUserClick = (userId: number) => {
    setViewingUserId(userId);
    setActiveTab("profile");
  };

  const formatCaption = (text: string) => {
    const parts = text.split(/(\s+)/);
    return parts.map((part, index) => {
      if (part.startsWith("#")) {
        return (
          <span key={index} className="text-[#3897f0] cursor-pointer hover:underline">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const formatLikes = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(1) + "K";
    return n.toString();
  };

  // Prevent image context-menu on long press
  const preventContextMenu = (e: React.MouseEvent) => e.preventDefault();

  return (
    <div className="bg-[var(--surface)] backdrop-blur-md border border-[var(--border)] rounded-[24px] mb-6 overflow-hidden w-full text-white shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
      {/* Header */}
      <div className="flex items-center gap-3 p-3.5 select-none">
        <img
          src={post.user.img}
          className={`w-[38px] h-[38px] rounded-full object-cover cursor-pointer ${
            post.hasStory ? "p-[2px] bg-[linear-gradient(45deg,#f09433,#e6683c,#dc2743,#bc1888)]" : "border border-[#222]"
          }`}
          alt={post.user.name}
          onClick={() => handleUserClick(post.user.id)}
        />
        <div className="flex-1">
          <div className="flex items-center gap-1">
            <span
              onClick={() => handleUserClick(post.user.id)}
              className="text-[14px] font-semibold cursor-pointer hover:underline flex items-center"
            >
              {post.user.name}
              {post.user.verified && (
                <span className="text-[#3897f0] ml-1 text-[11px]" title="Verified">✓</span>
              )}
            </span>
          </div>
          <div className="text-[11px] text-[#a8a8a8]">{post.location}</div>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="text-[#a8a8a8] hover:text-white p-1 cursor-pointer"
          >
            <MoreHorizontal size={18} />
          </button>
          <AnimatePresence>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.1 }}
                  className="absolute right-0 mt-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl w-40 shadow-xl overflow-hidden z-50 text-[13px]"
                >
                  <div onClick={() => setShowMenu(false)} className="p-3 text-red-500 hover:bg-[#222] cursor-pointer">🚩 Report</div>
                  <div onClick={() => setShowMenu(false)} className="p-3 hover:bg-[#222] cursor-pointer border-t border-[#222]">🚫 Not interested</div>
                  <div onClick={() => { toggleFollow(post.user.id); setShowMenu(false); }} className="p-3 hover:bg-[#222] cursor-pointer border-t border-[#222]">➕ Follow</div>
                  <div onClick={() => { showToast("Link copied! 📋", "share"); setShowMenu(false); }} className="p-3 hover:bg-[#222] cursor-pointer border-t border-[#222]">🔗 Copy link</div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Post Media ─────────────────────────────────────────────────────── */}
      <div
        className="relative aspect-square overflow-hidden cursor-pointer select-none"
        onDoubleClick={handleDoubleTap}
        onClick={() => {
          if (!showImgReactions) setActivePostId(post.id);
        }}
        onPointerDown={handleImagePointerDown}
        onPointerUp={handleImagePointerUp}
        onPointerCancel={handleImagePointerCancel}
        onPointerLeave={handleImagePointerCancel}
        onContextMenu={preventContextMenu}
      >
        {post.isTextOnly ? (
          <div
            className="w-full h-full flex items-center justify-center p-8 text-center font-semibold font-sans break-words text-white select-text leading-relaxed"
            style={{
              background: post.bgGradient || "linear-gradient(45deg,#FF8A00,#FF2E93,#9E00FF)",
              fontSize: "clamp(16px, 4vw, 26px)",
            }}
          >
            {post.caption}
          </div>
        ) : (
          <div className="relative w-full h-full">
            <img
              src={post.imgs && post.imgs.length > 0 ? post.imgs[activeImgIndex] : post.img}
              className="w-full h-full object-cover transition-all duration-300"
              style={{ filter: post.filter || "none" }}
              alt="post content"
              draggable={false}
            />
            {/* Carousel nav */}
            {post.imgs && post.imgs.length > 1 && (
              <>
                {activeImgIndex > 0 && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setActiveImgIndex(p => p - 1); }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 rounded-full p-1.5 z-20 transition text-white border-none cursor-pointer"
                  >
                    <ChevronLeft size={16} />
                  </button>
                )}
                {activeImgIndex < post.imgs.length - 1 && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setActiveImgIndex(p => p + 1); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 rounded-full p-1.5 z-20 transition text-white border-none cursor-pointer"
                  >
                    <ChevronRight size={16} />
                  </button>
                )}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
                  {post.imgs.map((_, idx) => (
                    <div
                      key={idx}
                      className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
                        idx === activeImgIndex ? "bg-white scale-125" : "bg-white/40"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Heart Pop Overlay */}
        <AnimatePresence>
          {showHeartPop && (
            <motion.div
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: [0.3, 1.3, 1], opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.45 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none drop-shadow-2xl z-30 text-[90px]"
            >
              {heartPopEmoji}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Long-press Image Reaction Picker */}
        <AnimatePresence>
          {showImgReactions && (
            <>
              <div
                className="absolute inset-0 z-30"
                onClick={(e) => { e.stopPropagation(); setShowImgReactions(false); }}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.7, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.7, y: 10 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-[#111]/90 backdrop-blur-xl border border-[#333] rounded-full px-4 py-2.5 shadow-2xl z-40 select-none"
                onClick={(e) => e.stopPropagation()}
              >
                {REACTIONS.map((r) => (
                  <motion.button
                    key={r.type}
                    whileHover={{ scale: 1.45, y: -6 }}
                    whileTap={{ scale: 0.9 }}
                    title={r.label}
                    onClick={(e) => { e.stopPropagation(); handleReaction(r.type); }}
                    className="text-[28px] leading-none cursor-pointer transition-all"
                  >
                    {r.emoji}
                  </motion.button>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* ── Post Actions ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3.5 p-3.5 pb-1 select-none">
        {/* Like / Reaction button */}
        <div
          className="relative"
          onMouseEnter={handleLikeMouseEnter}
          onMouseLeave={handleLikeMouseLeave}
        >
          <button
            ref={reactionBtnRef}
            onClick={handleSimpleLike}
            className={`cursor-pointer transition hover:scale-105 active:scale-95 flex items-center gap-1 text-[13px] font-semibold ${
              currentReaction ? "" : isLiked ? "text-red-500" : "text-white"
            }`}
            style={{ color: reactionInfo?.color }}
          >
            {currentReaction ? (
              <span className="text-[22px] leading-none">{reactionInfo?.emoji}</span>
            ) : (
              <Heart size={24} fill={isLiked ? "currentColor" : "none"} className={isLiked ? "text-red-500" : ""} />
            )}
          </button>

          {/* Hover reaction picker */}
          <div onMouseEnter={handlePickerMouseEnter} onMouseLeave={handlePickerMouseLeave}>
            <ReactionPicker visible={showReactions} onSelect={handleReaction} />
          </div>
        </div>

        <button
          onClick={() => setActivePostId(post.id)}
          className="text-white cursor-pointer hover:scale-105 active:scale-95 transition"
        >
          <MessageCircle size={24} />
        </button>

        <button
          onClick={() => showToast("Link copied! 📋", "share")}
          className="text-white cursor-pointer hover:scale-105 active:scale-95 transition"
        >
          <Send size={24} />
        </button>

        <button
          onClick={() => toggleSave(post.id)}
          className={`ml-auto cursor-pointer transition hover:scale-105 active:scale-95 ${
            isSaved ? "text-white fill-white" : "text-white"
          }`}
        >
          <Bookmark size={24} fill={isSaved ? "currentColor" : "none"} />
        </button>
      </div>

      {/* Likes */}
      <div className="px-3.5 py-1 text-[13px] font-semibold select-none">
        {formatLikes(post.likes)} likes
      </div>

      {/* Caption */}
      <div className="px-3.5 py-1 text-[13px] leading-relaxed">
        <span
          onClick={() => handleUserClick(post.user.id)}
          className="font-bold mr-2 cursor-pointer hover:underline"
        >
          {post.user.name}
        </span>
        {!post.isTextOnly && formatCaption(post.caption)}
      </div>

      {/* Comments Link */}
      {post.comments.length > 0 && (
        <div
          onClick={() => setActivePostId(post.id)}
          className="px-3.5 py-1 text-[12px] text-[#a8a8a8] cursor-pointer hover:text-white transition"
        >
          View all {post.comments.length} comments
        </div>
      )}

      {/* View post link for zero comments */}
      {post.comments.length === 0 && (
        <div
          onClick={() => setActivePostId(post.id)}
          className="px-3.5 py-0.5 text-[12px] text-[#555] cursor-pointer hover:text-[#a8a8a8] transition"
        >
          View post ›
        </div>
      )}

      {/* Time */}
      <div className="px-3.5 py-1 pb-3.5 text-[11px] text-[#666] uppercase tracking-wider select-none">
        {post.time} · AURAGRAM
      </div>

      {/* Comment Input */}
      <form onSubmit={handlePostComment} className="border-t border-[var(--border)] flex items-center p-3.5 gap-3 bg-black/15">
        <span
          style={{ fontSize: "20px", cursor: "pointer" }}
          onClick={() => setCommentText((prev) => prev + "😊")}
        >
          😊
        </span>
        <input
          type="text"
          placeholder="Add a comment…"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          className="flex-1 bg-transparent border-none text-[13px] text-white outline-none placeholder-[#666]"
        />
        <button
          type="submit"
          disabled={!commentText.trim()}
          className="text-[#3897f0] font-bold text-[13px] disabled:opacity-40 disabled:cursor-default"
        >
          Post
        </button>
      </form>
    </div>
  );
}
