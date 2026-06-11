"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useApp } from "../AppContext";
import { X, Heart, MessageCircle, Send, Bookmark, MoreHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../../lib/api";
import { REACTIONS } from "../feed/PostCard";
import ReactionsModal from "./ReactionsModal";

type ReactionType = typeof REACTIONS[number]["type"] | null;

interface DbComment {
  id: number;
  text: string;
  createdAt: string;
  likeCount: number;
  isLiked: boolean;
  user: { id: string; username: string; fullName?: string; avatarUrl?: string };
}

export default function PostModal() {
  const {
    activePostId, setActivePostId,
    posts, likedPosts, savedPosts,
    toggleLike, toggleSave,
    setViewingUserId, setActiveTab,
    showToast,
  } = useApp();

  // ── ALL hooks must come before any early return ───────────────────────────
  const [commentText, setCommentText]         = useState("");
  const [dbComments, setDbComments]           = useState<DbComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [activeImgIdx, setActiveImgIdx]       = useState(0);
  const [currentReaction, setCurrentReaction] = useState<ReactionType>(null);
  const [showReactions, setShowReactions]     = useState(false);
  const [hovReactionIdx, setHovReactionIdx]   = useState<number | null>(null);
  const [reactionsList, setReactionsList] = useState<{ type: string; userId: string }[]>([]);
  const [showReactionsModal, setShowReactionsModal] = useState(false);

  const hoverShowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLInputElement>(null);

  const activePost = useMemo(
    () => posts.find((p) => p.id === activePostId),
    [posts, activePostId]
  );

  // Load comments + current reaction when post opens
  useEffect(() => {
    if (!activePostId) {
      setDbComments([]);
      setActiveImgIdx(0);
      setCurrentReaction(null);
      setShowReactions(false);
      setReactionsList([]);
      return;
    }
    setLoadingComments(true);
    Promise.all([
      api.getComments(activePostId),
      api.getPostReaction(activePostId),
      api.getPostReactionsDetails(activePostId),
    ])
      .then(([comments, reaction, reactionsDetails]) => {
        setDbComments(comments as DbComment[]);
        if (reaction) setCurrentReaction(reaction as ReactionType);
        else setCurrentReaction(null);
        setReactionsList(reactionsDetails as any[]);
      })
      .catch(() => {})
      .finally(() => setLoadingComments(false));
  }, [activePostId]);

  // Auto-scroll to newest comment
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [dbComments.length]);

  // commitReaction MUST be before early return — activePost.id accessed safely via optional chain
  const commitReaction = useCallback(
    async (type: string) => {
      if (!activePostId) return;
      setShowReactions(false);
      setHovReactionIdx(null);
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

  const getDisplayEmojis = () => {
    const counts: Record<string, number> = {};
    reactionsList.forEach((r) => {
      counts[r.type] = (counts[r.type] || 0) + 1;
    });

    const sortedTypes = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    const top2 = sortedTypes.slice(0, 2);
    const emojisToShow = [...top2];

    if (currentReaction && !top2.includes(currentReaction)) {
      emojisToShow.push(currentReaction);
    }

    return emojisToShow.map((type) => REACTIONS.find((r) => r.type === type)?.emoji).filter(Boolean);
  };

  // ── Early return after ALL hooks ──────────────────────────────────────────
  if (!activePost) return null;

  const isLiked      = !!likedPosts[activePost.id] || !!currentReaction;
  const isSaved      = savedPosts.has(activePost.id);
  const reactionInfo = currentReaction ? REACTIONS.find((r) => r.type === currentReaction) : null;

  const handleClose = () => setActivePostId(null);

  const handleUserClick = (userId: number | string) => {
    setViewingUserId(typeof userId === "string" ? 0 : userId);
    setActiveTab("profile");
    handleClose();
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    const text = commentText.trim();
    setCommentText("");
    try {
      const newComment = await api.addComment(activePost.id, text);
      setDbComments((prev) => [...prev, newComment as DbComment]);
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

  const handleSimpleLike = async () => {
    if (showReactions) return;
    if (currentReaction || isLiked) {
      try { await api.reactToPost(activePost.id, currentReaction ?? "love"); } catch {}
      setCurrentReaction(null);
      toggleLike(activePost.id);
    } else {
      await commitReaction("love");
    }
  };

  // Hover picker controls — hover shows, click commits (no commit on leave)
  const startShow = () => {
    if (hoverHideTimer.current) clearTimeout(hoverHideTimer.current);
    hoverShowTimer.current = setTimeout(() => setShowReactions(true), 320);
  };
  const startHide = () => {
    if (hoverShowTimer.current) clearTimeout(hoverShowTimer.current);
    hoverHideTimer.current = setTimeout(() => {
      setShowReactions(false);
      setHovReactionIdx(null);
    }, 220);
  };
  const cancelHide = () => {
    if (hoverHideTimer.current) clearTimeout(hoverHideTimer.current);
  };

  const formatCaption = (text: string) =>
    text.split(/(\s+)/).map((part, i) =>
      part.startsWith("#")
        ? <span key={i} className="text-[#3897f0] cursor-pointer hover:underline">{part}</span>
        : part
    );

  const formatTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return "just now";
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  };

  const images =
    activePost.imgs && activePost.imgs.length > 0
      ? activePost.imgs
      : activePost.img
      ? [activePost.img]
      : [];

  return (
    <div
      onClick={handleClose}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 text-white"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.16 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#111] border border-[#2a2a2a] rounded-2xl w-full max-w-[920px] h-[88vh] flex flex-col md:flex-row overflow-hidden shadow-2xl relative"
      >
        {/* Close */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 z-[220] bg-black/50 hover:bg-black/80 rounded-full p-1.5 transition cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* ── LEFT: media ─────────────────────────────────────────────────── */}
        <div className="flex-1 bg-black flex items-center justify-center overflow-hidden relative min-h-[40vh] md:min-h-0">
          {activePost.isTextOnly ? (
            <div
              className="w-full h-full flex items-center justify-center p-10 text-center font-bold leading-relaxed break-words"
              style={{
                background: activePost.bgGradient || "linear-gradient(135deg,#FF8A00,#FF2E93,#9E00FF)",
                fontSize: "clamp(20px, 4vw, 36px)",
                textShadow: "0 2px 16px rgba(0,0,0,0.4)",
              }}
            >
              {activePost.caption}
            </div>
          ) : (
            <>
              <img
                src={images[activeImgIdx] || ""}
                alt="post"
                className="w-full h-full object-contain max-h-[88vh]"
                style={{
                  filter: activePost.filter && activePost.filter !== "none"
                    ? activePost.filter
                    : undefined,
                }}
              />
              {images.length > 1 && (
                <>
                  {activeImgIdx > 0 && (
                    <button
                      onClick={() => setActiveImgIdx((p) => p - 1)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 rounded-full p-1.5 z-20 cursor-pointer"
                    >
                      <ChevronLeft size={18} />
                    </button>
                  )}
                  {activeImgIdx < images.length - 1 && (
                    <button
                      onClick={() => setActiveImgIdx((p) => p + 1)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 rounded-full p-1.5 z-20 cursor-pointer"
                    >
                      <ChevronRight size={18} />
                    </button>
                  )}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20 pointer-events-none">
                    {images.map((_, idx) => (
                      <div
                        key={idx}
                        className={`w-1.5 h-1.5 rounded-full transition-all ${
                          idx === activeImgIdx ? "bg-white scale-125" : "bg-white/40"
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* ── RIGHT: header + comments + actions ──────────────────────────── */}
        <div className="w-full md:w-[360px] shrink-0 flex flex-col h-full border-t md:border-t-0 md:border-l border-[#222] bg-[#0a0a0a]">

          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-[#222] shrink-0">
            <img
              src={activePost.user.img}
              className="w-9 h-9 rounded-full object-cover border border-[#222] cursor-pointer shrink-0"
              onClick={() => handleUserClick(activePost.user.id)}
              alt="user"
            />
            <div className="flex-1 min-w-0">
              <div
                onClick={() => handleUserClick(activePost.user.id)}
                className="font-bold text-[13.5px] hover:underline cursor-pointer truncate flex items-center gap-1"
              >
                {activePost.user.name}
                {activePost.user.verified && (
                  <span className="text-[#3897f0] text-[10px]">✓</span>
                )}
              </div>
              {activePost.location && (
                <div className="text-[11px] text-[#a8a8a8] truncate">{activePost.location}</div>
              )}
            </div>
            <button
              onClick={() => showToast("More options")}
              className="text-[#a8a8a8] hover:text-white p-1 cursor-pointer"
            >
              <MoreHorizontal size={18} />
            </button>
          </div>

          {/* Comments list */}
          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-4 min-h-0">
            {/* Caption */}
            <div className="flex gap-3 items-start">
              <img
                src={activePost.user.img}
                className="w-8 h-8 rounded-full object-cover border border-[#222] cursor-pointer shrink-0"
                onClick={() => handleUserClick(activePost.user.id)}
                alt="user"
              />
              <div className="text-[13px] leading-relaxed">
                <span
                  onClick={() => handleUserClick(activePost.user.id)}
                  className="font-bold hover:underline cursor-pointer mr-1.5"
                >
                  {activePost.user.name}
                </span>
                {activePost.isTextOnly ? (
                  <span className="text-[#a8a8a8] italic">Text post</span>
                ) : (
                  formatCaption(activePost.caption)
                )}
                <div className="text-[11px] text-[#555] mt-1">{activePost.time}</div>
              </div>
            </div>

            <div className="border-t border-[#1a1a1a]" />

            {/* DB comments */}
            {loadingComments ? (
              <div className="text-center text-[12px] text-[#555] py-6 animate-pulse">
                Loading comments…
              </div>
            ) : dbComments.length === 0 ? (
              <div className="text-center text-[12px] text-[#444] py-8">
                No comments yet.
                <br />
                <span className="text-[#666]">Be the first!</span>
              </div>
            ) : (
              dbComments.map((c) => (
                <div key={c.id} className="flex gap-3 items-start group">
                  <img
                    src={c.user.avatarUrl || `https://i.pravatar.cc/80?u=${c.user.id}`}
                    className="w-8 h-8 rounded-full object-cover border border-[#222] shrink-0"
                    alt={c.user.username}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] leading-relaxed break-words">
                      <span className="font-bold mr-1.5 cursor-pointer hover:underline">
                        {c.user.username}
                      </span>
                      {c.text}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-[#555]">
                      <span>{formatTime(c.createdAt)}</span>
                      {c.likeCount > 0 && <span>{c.likeCount} likes</span>}
                      <span className="cursor-pointer hover:text-white transition">Reply</span>
                      <button
                        onClick={() => handleCommentLike(c.id)}
                        className="ml-auto text-[13px] cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {c.isLiked ? "❤️" : "🤍"}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={commentsEndRef} />
          </div>

          {/* ── Actions ─────────────────────────────────────────────────────── */}
          <div className="p-4 border-t border-[#222] shrink-0">
            <div className="flex items-center gap-4 mb-2">

              {/* Like / reaction button */}
              <div
                className="relative"
                onMouseEnter={startShow}
                onMouseLeave={startHide}
              >
                <button
                  onClick={handleSimpleLike}
                  className="cursor-pointer transition hover:scale-110 active:scale-95"
                  style={{ color: reactionInfo?.color }}
                >
                  {currentReaction ? (
                    <span className="text-[22px] leading-none">{reactionInfo?.emoji}</span>
                  ) : (
                    <Heart
                      size={22}
                      fill={isLiked ? "currentColor" : "none"}
                      className={isLiked ? "text-red-500" : "text-white"}
                    />
                  )}
                </button>

                {/* Hover reaction picker — hover to show, click to react */}
                <AnimatePresence>
                  {showReactions && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.75, y: 6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.75, y: 6 }}
                      transition={{ type: "spring", stiffness: 420, damping: 26 }}
                      className="absolute bottom-[calc(100%+8px)] left-0 flex items-end gap-1 bg-[#111]/95 backdrop-blur-xl border border-white/10 rounded-full px-3 py-2 shadow-2xl z-50"
                      onMouseEnter={cancelHide}
                      onMouseLeave={startHide}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {REACTIONS.map((r, idx) => (
                        <motion.button
                          key={r.type}
                          animate={{
                            scale: hovReactionIdx === idx ? 1.5 : 1,
                            y: hovReactionIdx === idx ? -8 : 0,
                          }}
                          transition={{ type: "spring", stiffness: 480, damping: 22 }}
                          title={r.label}
                          onMouseEnter={() => setHovReactionIdx(idx)}
                          onMouseLeave={() => setHovReactionIdx(null)}
                          onClick={() => commitReaction(r.type)}
                          className="text-[24px] leading-none cursor-pointer relative"
                        >
                          {r.emoji}
                          {hovReactionIdx === idx && (
                            <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-white bg-black/75 rounded-full px-1.5 py-0.5 whitespace-nowrap pointer-events-none">
                              {r.label}
                            </span>
                          )}
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button
                onClick={() => inputRef.current?.focus()}
                className="text-white hover:scale-105 active:scale-95 transition cursor-pointer"
              >
                <MessageCircle size={22} />
              </button>

              <button
                onClick={() => showToast("Link copied! 📋", "share")}
                className="text-white hover:scale-105 active:scale-95 transition cursor-pointer"
              >
                <Send size={22} />
              </button>

              <button
                onClick={() => toggleSave(activePost.id)}
                className="ml-auto cursor-pointer transition hover:scale-105 active:scale-95 text-white"
              >
                <Bookmark size={22} fill={isSaved ? "currentColor" : "none"} />
              </button>
            </div>

            <div 
              onClick={() => setShowReactionsModal(true)}
              className="text-[13px] font-semibold text-white cursor-pointer hover:underline flex items-center gap-1.5 w-fit select-none"
            >
              <div className="flex items-center -space-x-1 mr-0.5">
                {getDisplayEmojis().map((emoji, i) => (
                  <span key={i} className="text-[14px] leading-none select-none">
                    {emoji}
                  </span>
                ))}
              </div>
              <span>{activePost.likes} {activePost.likes === 1 ? 'reaction' : 'reactions'}</span>
            </div>
          </div>

          {/* Comment input */}
          <form
            onSubmit={handlePostComment}
            className="border-t border-[#222] flex items-center px-4 py-3 gap-3 bg-[#111] shrink-0"
          >
            <span
              className="text-[18px] cursor-pointer"
              onClick={() => setCommentText((p) => p + "😊")}
            >
              😊
            </span>
            <input
              ref={inputRef}
              type="text"
              placeholder="Add a comment…"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="flex-1 bg-transparent border-none text-[13px] text-white outline-none placeholder-[#555]"
            />
            <button
              type="submit"
              disabled={!commentText.trim()}
              className="text-[#3897f0] font-bold text-[13px] disabled:opacity-35 disabled:cursor-default"
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
  );
}
