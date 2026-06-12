"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useApp } from "../AppContext";
import StoriesBar from "./StoriesBar";
import PostCard from "./PostCard";
import RightSidebar from "./RightSidebar";

export default function Feed() {
  const { posts } = useApp();
  const [visibleCount, setVisibleCount] = useState(8);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [feedPage, setFeedPage] = useState(0);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Load more posts as user scrolls near the end
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || isLoadingMore || feedPage >= 3) return;

    const scrollTop = container.scrollTop;
    const clientHeight = container.clientHeight;
    const scrollHeight = container.scrollHeight;

    if (scrollTop + clientHeight >= scrollHeight - 200) {
      setIsLoadingMore(true);
      setTimeout(() => {
        setVisibleCount((prev) => Math.min(prev + 4, posts.length));
        setFeedPage((prev) => prev + 1);
        setIsLoadingMore(false);
      }, 800);
    }
  }, [isLoadingMore, feedPage, posts.length]);

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
      style={{ scrollSnapType: "y mandatory", scrollBehavior: "smooth" }}
    >
      <div className="max-w-[900px] mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-[500px_260px] justify-center gap-8">
        {/* Left Feed */}
        <div className="flex flex-col items-center w-full max-w-[500px] mx-auto">
          {/* Stories — not snapped */}
          <div className="w-full mb-4">
            <StoriesBar />
          </div>

          {/* Posts list — each card snaps */}
          <div className="w-full flex flex-col items-center">
            {posts.slice(0, visibleCount).map((post) => (
              <div
                key={post.id}
                style={{ scrollSnapAlign: "start", scrollMarginTop: "16px" }}
                className="w-full"
              >
                <PostCard post={post} />
              </div>
            ))}
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
