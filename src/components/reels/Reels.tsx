"use client";

import React from "react";
import { useApp } from "../AppContext";
import { Heart, MessageCircle, Send, MoreHorizontal, Music } from "lucide-react";

export default function Reels() {
  const { posts, likedPosts, toggleLike, toggleFollow, followStates, setActivePostId, showToast } = useApp();

  return (
    <div className="flex-1 bg-black overflow-y-auto h-full w-full snap-y snap-mandatory scrollbar-none custom-scroll">
      <div className="flex flex-col items-center">
        {posts.slice(0, 8).map((post) => {
          const isLiked = !!likedPosts[post.id];
          const isFollowing = !!followStates[post.user.id];

          return (
            <div
              key={`reel-${post.id}`}
              className="w-full max-w-[420px] h-full snap-start snap-always relative bg-black flex items-center justify-center overflow-hidden border-b border-zinc-900"
            >
              {/* Background Image / Media Simulation */}
              <img
                src={post.img}
                alt="Reel content"
                className="w-full h-full object-cover select-none pointer-events-none"
              />

              {/* Dark Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

              {/* Reels Sidebar (Right Actions) */}
              <div className="absolute right-4 bottom-28 flex flex-col gap-6 items-center z-10 select-none text-white">
                <button
                  onClick={() => toggleLike(post.id)}
                  className={`flex flex-col items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95 transition ${
                    isLiked ? "text-red-500" : "text-white"
                  }`}
                >
                  <Heart size={26} fill={isLiked ? "currentColor" : "none"} />
                  <span className="text-[12px] font-semibold">
                    {post.likes + (isLiked ? 1 : 0)}
                  </span>
                </button>

                <button
                  onClick={() => setActivePostId(post.id)}
                  className="flex flex-col items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95 transition"
                >
                  <MessageCircle size={26} />
                  <span className="text-[12px] font-semibold">{post.comments.length}</span>
                </button>

                <button
                  onClick={() => showToast("Link copied! 📋", "share")}
                  className="flex flex-col items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95 transition"
                >
                  <Send size={26} />
                  <span className="text-[12px] font-semibold">Share</span>
                </button>

                <button
                  onClick={() => {}}
                  className="flex flex-col items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95 transition"
                >
                  <MoreHorizontal size={26} />
                </button>
              </div>

              {/* Reels Info (Bottom Left details) */}
              <div className="absolute left-4 bottom-24 max-w-[calc(100%-80px)] z-10 text-white select-none">
                {/* User Row */}
                <div className="flex items-center gap-3.5 mb-2.5">
                  <img
                    src={post.user.img}
                    alt={post.user.name}
                    className="w-9 h-9 rounded-full border border-white/80 object-cover"
                  />
                  <span className="font-bold text-[14px]">{post.user.name}</span>
                  <button
                    onClick={() => toggleFollow(post.user.id)}
                    className="px-3.5 py-1 border border-white rounded-lg text-[12px] font-bold cursor-pointer bg-transparent hover:bg-white/10 active:scale-95 transition"
                  >
                    {isFollowing ? "Following" : "Follow"}
                  </button>
                </div>

                {/* Caption */}
                <p className="text-[13px] leading-relaxed line-clamp-2 mb-2 select-text">
                  {post.caption}
                </p>

                {/* Audio Info */}
                <div className="flex items-center gap-2 text-[12px]">
                  {/* Rotating Vinyl Audio Disc */}
                  <div className="w-8 h-8 rounded-full bg-[#1a1a1a] border border-white flex items-center justify-center animate-spin-slow">
                    <Music size={14} className="text-white" />
                  </div>
                  <span className="truncate">Original audio · {post.user.name}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
