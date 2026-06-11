"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { useApp } from "../AppContext";
import { X, Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from "lucide-react";

export default function PostModal() {
  const {
    activePostId,
    setActivePostId,
    posts,
    likedPosts,
    savedPosts,
    toggleLike,
    toggleSave,
    addComment,
    setViewingUserId,
    setActiveTab,
    showToast,
  } = useApp();

  const [commentText, setCommentText] = useState("");
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const activePost = useMemo(() => {
    return posts.find((p) => p.id === activePostId);
  }, [posts, activePostId]);

  // Scroll comments to bottom
  useEffect(() => {
    if (activePostId) {
      commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [activePost?.comments.length, activePostId]);

  if (!activePost) return null;

  const isLiked = !!likedPosts[activePost.id];
  const isSaved = savedPosts.has(activePost.id);

  const handleClose = () => {
    setActivePostId(null);
  };

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    addComment(activePost.id, commentText);
    setCommentText("");
  };

  const handleUserClick = (userId: number) => {
    setViewingUserId(userId);
    setActiveTab("profile");
    handleClose();
  };

  const formatCaption = (text: string) => {
    const parts = text.split(/(\s+)/);
    return parts.map((part, index) => {
      if (part.startsWith("#")) {
        return (
          <span
            key={index}
            onClick={() => showToast(`Hashtag click: ${part}`)}
            className="text-[#3897f0] cursor-pointer hover:underline"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div
      onClick={handleClose}
      className="fixed inset-0 bg-black/75 z-[200] flex items-center justify-center p-4 select-none text-white"
    >
      {/* Modal Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#111] border border-[#2a2a2a] rounded-2xl w-full max-w-[900px] h-[90vh] md:h-[80vh] flex flex-col md:flex-row overflow-hidden shadow-2xl relative"
      >
        {/* Close Button Mobile/Desktop */}
        <button
          onClick={handleClose}
          className="absolute right-4.5 top-4.5 z-[210] md:fixed md:right-7 md:top-7 bg-black/40 hover:bg-black/60 rounded-full p-1.5 transition"
        >
          <X size={20} />
        </button>

        {/* Left Side: Post Image */}
        <div className="flex-1 bg-black flex items-center justify-center overflow-hidden">
          <img
            src={activePost.img}
            alt="Detail view"
            className="w-full h-full object-cover max-h-[40vh] md:max-h-full"
          />
        </div>

        {/* Right Side: Header, Comments, Actions */}
        <div className="w-full md:w-[360px] flex flex-col shrink-0 h-full border-t md:border-t-0 md:border-l border-[#222] bg-[#0a0a0a]">
          
          {/* 1. Header */}
          <div className="flex items-center gap-3 p-4 border-b border-[#222] select-none">
            <img
              src={activePost.user.img}
              className="w-9 h-9 rounded-full object-cover border border-[#222] cursor-pointer"
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
              <div className="text-[11px] text-[#a8a8a8] truncate">{activePost.location}</div>
            </div>
            <button
              onClick={() => showToast("More options")}
              className="text-[#a8a8a8] hover:text-white p-1 cursor-pointer"
            >
              <MoreHorizontal size={18} />
            </button>
          </div>

          {/* 2. Comments List */}
          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-4.5 custom-scroll select-text">
            {/* Caption */}
            <div className="flex gap-3 items-start select-none">
              <img
                src={activePost.user.img}
                className="w-8.5 h-8.5 rounded-full object-cover border border-[#222] cursor-pointer"
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
                {formatCaption(activePost.caption)}
                <div className="text-[11px] text-[#666] mt-1.5">{activePost.time} ago</div>
              </div>
            </div>

            {/* User comments list */}
            {activePost.comments.map((comment, idx) => (
              <div key={`comment-${comment.id}-${idx}`} className="flex gap-3 items-start select-none">
                <img
                  src={comment.user.img}
                  className="w-8.5 h-8.5 rounded-full object-cover border border-[#222] cursor-pointer"
                  onClick={() => handleUserClick(comment.user.id)}
                  alt="user"
                />
                <div className="text-[13px] leading-relaxed flex-1">
                  <span
                    onClick={() => handleUserClick(comment.user.id)}
                    className="font-bold hover:underline cursor-pointer mr-1.5"
                  >
                    {comment.user.name}
                  </span>
                  {comment.text}
                  
                  <div className="flex items-center gap-3.5 text-[11px] text-[#666] mt-1.5">
                    <span>{comment.time}</span>
                    <span onClick={() => showToast("Reply sent")} className="cursor-pointer hover:text-white transition">
                      Reply
                    </span>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        showToast(comment.liked ? "Removed like" : "Comment liked!");
                        comment.liked = !comment.liked;
                      }}
                      className="cursor-pointer text-[12px] ml-auto"
                    >
                      {comment.liked ? "❤️" : "🤍"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            <div ref={commentsEndRef} />
          </div>

          {/* 3. Actions Panel */}
          <div className="p-4 border-t border-[#222]">
            <div className="flex items-center gap-4 mb-2.5 select-none">
              <button
                onClick={() => toggleLike(activePost.id)}
                className={`cursor-pointer transition hover:scale-105 active:scale-95 ${
                  isLiked ? "text-red-500 fill-red-500 animate-heart-pop" : "text-white"
                }`}
              >
                <Heart size={22} fill={isLiked ? "currentColor" : "none"} />
              </button>
              <button className="text-white hover:scale-105 active:scale-95 transition">
                <MessageCircle size={22} />
              </button>
              <button
                onClick={() => showToast("Link copied to clipboard! 📋")}
                className="text-white hover:scale-105 active:scale-95 transition"
              >
                <Send size={22} />
              </button>
              <button
                onClick={() => toggleSave(activePost.id)}
                className={`ml-auto cursor-pointer transition hover:scale-105 active:scale-95 ${
                  isSaved ? "text-white fill-white" : "text-white"
                }`}
              >
                <Bookmark size={22} fill={isSaved ? "currentColor" : "none"} />
              </button>
            </div>

            <div className="text-[13px] font-semibold mb-1 select-none">
              {activePost.likes + (isLiked ? 1 : 0)} likes
            </div>
          </div>

          {/* 4. Add Comment Form */}
          <form onSubmit={handlePostComment} className="border-t border-[#222] flex items-center p-4 gap-3 bg-[#111]">
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
      </div>
    </div>
  );
}
