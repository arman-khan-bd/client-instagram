"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useApp } from "../AppContext";
import StoriesBar from "./StoriesBar";
import PostCard from "./PostCard";
import RightSidebar from "./RightSidebar";

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
              posts.slice(0, visibleCount).map((post) => (
                <div
                  key={post.id}
                  className="w-full mb-4"
                >
                  <PostCard post={post} />
                </div>
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
