"use client";

import React, { useState } from "react";
import { useApp, MockPost } from "../AppContext";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

  const isLiked = !!likedPosts[post.id];
  const isSaved = savedPosts.has(post.id);

  const handleDoubleTap = () => {
    setShowHeartPop(true);
    setTimeout(() => setShowHeartPop(false), 800);
    if (!isLiked) {
      toggleLike(post.id);
    }
  };

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
          <span
            key={index}
            className="text-[#3897f0] cursor-pointer hover:underline"
          >
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
                <span className="text-[#3897f0] ml-1 text-[11px]" title="Verified">
                  ✓
                </span>
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
                  <div
                    onClick={() => {
                      // Quietly handle reporting
                      setShowMenu(false);
                    }}
                    className="p-3 text-red-500 hover:bg-[#222] cursor-pointer"
                  >
                    🚩 Report
                  </div>
                  <div
                    onClick={() => {
                      // Quietly handle hide post
                      setShowMenu(false);
                    }}
                    className="p-3 hover:bg-[#222] cursor-pointer border-t border-[#222]"
                  >
                    🚫 Not interested
                  </div>
                  <div
                    onClick={() => {
                      // Trigger context toggleFollow quietly (it shows follow toast itself)
                      toggleFollow(post.user.id);
                      setShowMenu(false);
                    }}
                    className="p-3 hover:bg-[#222] cursor-pointer border-t border-[#222]"
                  >
                    ➕ Follow
                  </div>
                  <div
                    onClick={() => {
                      showToast("Link copied! 📋", "share");
                      setShowMenu(false);
                    }}
                    className="p-3 hover:bg-[#222] cursor-pointer border-t border-[#222]"
                  >
                    🔗 Copy link
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Post Image Container */}
      <div
        className="relative aspect-square overflow-hidden cursor-pointer select-none"
        onDoubleClick={handleDoubleTap}
      >
        <img src={post.img} className="w-full h-full object-cover" alt="post" />
        
        {/* Heart Pop Overlay */}
        <AnimatePresence>
          {showHeartPop && (
            <motion.div
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: [0.3, 1.2, 1], opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.45 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none text-red-500 drop-shadow-2xl z-10"
            >
              <Heart size={90} fill="currentColor" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Post Actions */}
      <div className="flex items-center gap-3.5 p-3.5 pb-1 select-none">
        <button
          onClick={() => toggleLike(post.id)}
          className={`cursor-pointer transition hover:scale-105 active:scale-95 ${
            isLiked ? "text-red-500 fill-red-500 animate-heart-pop" : "text-white"
          }`}
        >
          <Heart size={24} fill={isLiked ? "currentColor" : "none"} />
        </button>

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
      <div
        className="px-3.5 py-1 text-[13px] font-semibold select-none"
      >
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
        {formatCaption(post.caption)}
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

      {/* Time */}
      <div className="px-3.5 py-1 pb-3.5 text-[11px] text-[#666] uppercase tracking-wider select-none">
        {post.time} ago · AURAGRAM
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
