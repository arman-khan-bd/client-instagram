"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useApp } from "../AppContext";
import StoriesBar from "./StoriesBar";
import PostCard from "./PostCard";
import RightSidebar from "./RightSidebar";
import { api } from "../../lib/api";
import { X } from "lucide-react";

const PostSkeleton = () => (
  <div className="bg-[var(--surface)] border border-[var(--border)] backdrop-blur-md rounded-[24px] mb-6 p-4 w-full animate-pulse select-none">
    {/* Header Skeleton */}
    <div className="flex items-center gap-3 mb-4">
      <div className="w-[38px] h-[38px] rounded-full bg-zinc-800/40" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-zinc-800/40 rounded w-1/3" />
        <div className="h-2.5 bg-zinc-800/40 rounded w-1/4" />
      </div>
    </div>
    {/* Media Image Skeleton */}
    <div className="aspect-square bg-zinc-900/40 rounded-2xl mb-4 w-full" />
    {/* Actions Skeleton */}
    <div className="flex items-center gap-4 mb-4">
      <div className="w-6 h-6 bg-zinc-800/40 rounded-full" />
      <div className="w-6 h-6 bg-zinc-800/40 rounded-full" />
      <div className="w-6 h-6 bg-zinc-800/40 rounded-full" />
      <div className="w-6 h-6 bg-zinc-800/40 rounded-full ml-auto" />
    </div>
    {/* Likes Skeleton */}
    <div className="h-3 bg-zinc-800/40 rounded w-1/4 mb-3" />
    {/* Caption Skeleton */}
    <div className="space-y-2">
      <div className="h-3 bg-zinc-800/40 rounded w-5/6" />
      <div className="h-3 bg-zinc-800/40 rounded w-2/3" />
    </div>
  </div>
);

function PeopleYouMayKnow() {
  const { currentUser, followStates, toggleFollow, setViewingUserId, setActiveTab } = useApp();
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
  const [hiddenUsers, setHiddenUsers] = useState<string[]>([]);

  useEffect(() => {
    // Load hidden list from localStorage
    const saved = localStorage.getItem("pymk_hidden_users");
    if (saved) {
      try {
        setHiddenUsers(JSON.parse(saved));
      } catch {}
    }

    // Load suggested users
    api.getSuggestedUsers(15)
      .then((data) => {
        setSuggestedUsers(data || []);
      })
      .catch((err) => console.error(err));
  }, []);

  const handleHideUser = (userId: string) => {
    const updated = [...hiddenUsers, userId];
    setHiddenUsers(updated);
    localStorage.setItem("pymk_hidden_users", JSON.stringify(updated));
  };

  const handleUserClick = (username: string) => {
    setViewingUserId(username);
    setActiveTab("profile", username);
  };

  // Filter recommendations: not following, not self, not hidden
  const displayUsers = suggestedUsers.filter((u) => {
    const isFollowing = !!followStates[u.id];
    const isMe = currentUser && (String(currentUser.id) === String(u.id) || u.username === currentUser.name);
    const isHidden = hiddenUsers.includes(u.id);
    return !isFollowing && !isMe && !isHidden;
  });

  if (displayUsers.length === 0) return null;

  return (
    <div className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-[24px] p-5 mb-6 shadow-sm select-none">
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-extrabold text-[var(--text)] tracking-wide uppercase">People You May Know</span>
        </div>
      </div>

      {/* Horizontal Scroll Container */}
      <div className="flex gap-3.5 overflow-x-auto pb-2 custom-scroll scroll-smooth snap-x snap-mandatory">
        {displayUsers.map((u) => (
          <div 
            key={u.id}
            className="w-[145px] bg-[var(--surface2)] border border-[var(--border)] rounded-2xl p-3 flex flex-col items-center shrink-0 snap-start relative hover:border-[var(--text3)] transition duration-200"
          >
            {/* Top Right Close button as a quick don't know trigger */}
            <button
              onClick={() => handleHideUser(u.id)}
              className="absolute top-2 right-2 p-1 hover:bg-[var(--surface3)] rounded-full transition text-[var(--text3)] hover:text-[var(--text)]"
              title="Don't Know"
            >
              <X size={12} />
            </button>

            <img
              src={u.avatarUrl || `https://i.pravatar.cc/150?u=${u.id}`}
              alt={u.username}
              onClick={() => handleUserClick(u.username)}
              className="w-16 h-16 rounded-full object-cover border border-[var(--border)] cursor-pointer hover:scale-105 transition mt-2 mb-2"
            />

            <div className="w-full text-center mb-3 text-xs">
              <div 
                onClick={() => handleUserClick(u.username)}
                className="font-bold text-[var(--text)] truncate cursor-pointer hover:underline"
              >
                {u.username}
              </div>
              <div className="text-[10px] text-[var(--text2)] truncate">
                {u.fullName || u.username}
              </div>
            </div>

            <div className="w-full flex flex-col gap-1.5 mt-auto">
              <button
                onClick={() => toggleFollow(u.id)}
                className="w-full py-1.5 bg-insta-blue hover:bg-insta-blue/90 text-white font-extrabold text-[11px] rounded-lg transition"
              >
                Follow
              </button>
              <button
                onClick={() => handleHideUser(u.id)}
                className="w-full py-1.5 bg-[var(--surface3)] hover:bg-[var(--border)] text-[var(--text2)] font-semibold text-[11px] rounded-lg transition"
              >
                Don't Know
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Feed() {
  const { posts, isFeedLoaded } = useApp();
  const [visibleCount, setVisibleCount] = useState(3);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loading, setLoading] = useState(!isFeedLoaded && posts.length === 0);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Sync loading state with posts availability and load completion status
  useEffect(() => {
    if (isFeedLoaded || posts.length > 0) {
      setLoading(false);
    }
  }, [posts, isFeedLoaded]);

  // Load more posts as user scrolls near the end
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || isLoadingMore || visibleCount >= posts.length) return;

    const scrollTop = container.scrollTop;
    const clientHeight = container.clientHeight;
    const scrollHeight = container.scrollHeight;

    if (scrollTop + clientHeight >= scrollHeight - 200) {
      setIsLoadingMore(true);
      setTimeout(() => {
        setVisibleCount((prev) => Math.min(prev + 3, posts.length));
        setIsLoadingMore(false);
      }, 600);
    }
  }, [isLoadingMore, visibleCount, posts.length]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return (
    <div
      ref={scrollContainerRef}
      className="flex-1 overflow-y-auto h-full w-full no-scrollbar"
      style={{ scrollBehavior: "smooth" }}
    >
      <div className="max-w-[900px] mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-[500px_260px] justify-center gap-8">
        {/* Left Feed */}
        <div className="flex flex-col items-center w-full max-w-[500px] mx-auto">
          {/* Stories */}
          <div className="w-full mb-4">
            <StoriesBar />
          </div>

          {/* Posts list */}
          <div className="w-full flex flex-col items-center">
            {loading ? (
              <>
                <PostSkeleton />
                <PostSkeleton />
                <PostSkeleton />
              </>
            ) : posts.length === 0 ? (
              <div className="text-center text-zinc-500 py-12 text-sm select-none">
                No posts to show. Follow some users or create a post!
              </div>
            ) : (
              posts.slice(0, visibleCount).map((post, index) => (
                <React.Fragment key={post.id}>
                  <div className="w-full mb-4">
                    <PostCard post={post} />
                  </div>
                  {index === 9 || (posts.length < 10 && index === posts.length - 1) ? (
                    <PeopleYouMayKnow />
                  ) : null}
                </React.Fragment>
              ))
            )}
          </div>

          {/* Infinite Scroll Loader */}
          {isLoadingMore && (
            <div className="flex gap-1.5 items-center justify-center py-5 select-none">
              <span className="w-2.5 h-2.5 rounded-full bg-[#666] animate-[dotBounce_0.8s_infinite_0ms]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#666] animate-[dotBounce_0.8s_infinite_150ms]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#666] animate-[dotBounce_0.8s_infinite_300ms]" />
            </div>
          )}
        </div>

        {/* Right Sidebar Suggestions */}
        <div className="hidden lg:block">
          <div className="sticky top-8">
            <RightSidebar />
          </div>
        </div>
      </div>
    </div>
  );
}
