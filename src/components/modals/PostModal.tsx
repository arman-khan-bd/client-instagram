"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useApp } from "../AppContext";
import { X, Heart, MessageCircle, Send, Bookmark } from "lucide-react";
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
    toggleLike,
    setViewingUserId, setActiveTab,
    showToast, pendingComments, clearPendingComments,
  } = useApp();

  const [commentText, setCommentText]         = useState("");
  const [dbComments, setDbComments]           = useState<DbComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [currentReaction, setCurrentReaction] = useState<ReactionType>(null);
  const [reactionsList, setReactionsList]     = useState<{ type: string; userId: string }[]>([]);
  const [showReactionsModal, setShowReactionsModal] = useState(false);

  const commentsEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLInputElement>(null);

  const activePost = useMemo(
    () => posts.find((p) => p.id === activePostId),
    [posts, activePostId]
  );

  // Load comments + reaction details when drawer opens
  useEffect(() => {
    if (!activePostId) {
      setDbComments([]);
      setCurrentReaction(null);
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
        clearPendingComments(activePostId);
      })
      .catch(() => {})
      .finally(() => setLoadingComments(false));
  }, [activePostId, clearPendingComments]);

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

  if (!activePost) return null;

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

  const handleClose = () => setActivePostId(null);

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

  return (
    <AnimatePresence>
      {activePostId && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black z-[200]"
          />

          {/* Sliding Bottom Drawer (centered on desktop, full-width on mobile) */}
          <motion.div
            initial={{ y: "100%", x: "-50%" }}
            animate={{ y: 0, x: "-50%" }}
            exit={{ y: "100%", x: "-50%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[450px] h-[65vh] bg-zinc-950 border-t border-zinc-850 rounded-t-3xl z-[210] flex flex-col overflow-hidden text-white shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-900 shrink-0">
              <div className="flex items-center gap-3">
                <span className="font-bold text-[16px]">Comments</span>
                <button
                  onClick={() => setShowReactionsModal(true)}
                  className="text-[11px] bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 px-3 py-1 rounded-full text-zinc-300 transition"
                >
                  Reactions: {reactionsList.length}
                </button>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 hover:bg-zinc-900 rounded-full transition text-zinc-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Comments list */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scroll">
              {loadingComments && dbComments.length === 0 ? (
                <div className="text-center text-[12px] text-[#555] py-8 animate-pulse">
                  Loading comments…
                </div>
              ) : allComments.length === 0 ? (
                <div className="text-center text-[12px] text-zinc-500 py-10">
                  No comments yet.
                  <br />
                  <span className="text-zinc-600 text-[11px]">Start the conversation!</span>
                </div>
              ) : (
                allComments.map((c) => (
                  <div key={c.id} className="flex gap-3 items-start group">
                    <img
                      src={c.user?.avatarUrl || `https://i.pravatar.cc/80?u=${c.user.id}`}
                      className="w-8 h-8 rounded-full object-cover border border-[#222] shrink-0"
                      alt={c.user.username}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] leading-relaxed break-words text-zinc-200">
                        <span className="font-bold mr-1.5 text-white cursor-pointer hover:underline">
                          {c.user.username}
                        </span>
                        {c.text}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-zinc-500">
                        <span>{new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {c.likeCount > 0 && <span>{c.likeCount} likes</span>}
                        <button
                          onClick={() => handleCommentLike(c.id)}
                          className="ml-auto text-[11px] cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
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

            {/* Comment Form */}
            <form
              onSubmit={handlePostComment}
              className="p-4 bg-zinc-950 border-t border-zinc-900 flex gap-2 shrink-0"
            >
              <input
                ref={inputRef}
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-2 text-sm text-white outline-none focus:border-zinc-700 transition"
              />
              <button
                type="submit"
                disabled={!commentText.trim()}
                className="px-5 bg-white text-black font-semibold rounded-full text-sm hover:bg-zinc-200 disabled:opacity-50 transition"
              >
                Post
              </button>
            </form>
          </motion.div>

          <ReactionsModal
            isOpen={showReactionsModal}
            onClose={() => setShowReactionsModal(false)}
            postId={activePost.id}
          />
        </>
      )}
    </AnimatePresence>
  );
}
