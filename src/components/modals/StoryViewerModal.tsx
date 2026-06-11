"use client";

import React, { useEffect, useState, useRef } from "react";
import { useApp } from "../AppContext";
import { X, Trash2 } from "lucide-react";
import { api } from "../../lib/api";

export default function StoryViewerModal() {
  const {
    storyViewerIndex,
    setStoryViewerIndex,
    storyGroups,
    currentUser,
    loadStories,
    showToast,
  } = useApp();

  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const groupIndex = storyViewerIndex ?? 0;
  const currentGroup = storyGroups[groupIndex];
  const activeStory = currentGroup?.stories[activeStoryIndex];

  // Reset active story index when group changes
  useEffect(() => {
    setActiveStoryIndex(0);
    setProgress(0);
  }, [storyViewerIndex]);

  // Story Timer handler
  useEffect(() => {
    if (storyViewerIndex === null || !currentGroup || isPaused) return;

    setProgress(0);
    const duration = 5000; // 5 seconds per story
    const intervalTime = 50; // update every 50ms
    const step = (intervalTime / duration) * 100;

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + step;
      });
    }, intervalTime);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [storyViewerIndex, isPaused, groupIndex, activeStoryIndex, currentGroup]);

  if (storyViewerIndex === null || !currentGroup || !activeStory) return null;

  const handleNext = () => {
    if (activeStoryIndex < currentGroup.stories.length - 1) {
      setActiveStoryIndex((prev) => prev + 1);
      setProgress(0);
    } else if (groupIndex < storyGroups.length - 1) {
      setStoryViewerIndex(groupIndex + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (activeStoryIndex > 0) {
      setActiveStoryIndex((prev) => prev - 1);
      setProgress(0);
    } else if (groupIndex > 0) {
      // Go to previous group, and start at its last story
      const prevGroup = storyGroups[groupIndex - 1];
      setStoryViewerIndex(groupIndex - 1);
      setTimeout(() => {
        setActiveStoryIndex(prevGroup.stories.length - 1);
      }, 0);
    } else {
      setProgress(0);
    }
  };

  const handleClose = () => {
    setStoryViewerIndex(null);
    setProgress(0);
    setActiveStoryIndex(0);
  };

  const handleDelete = async () => {
    if (!activeStory) return;
    try {
      setIsPaused(true);
      if (confirm("Delete this story?")) {
        await api.deleteStory(activeStory.id);
        showToast("Story deleted! 🗑️", "success");
        await loadStories();
        // If we deleted the only story in the group, close or move
        if (currentGroup.stories.length <= 1) {
          handleClose();
        } else {
          // Move to next story or adjust index
          if (activeStoryIndex >= currentGroup.stories.length - 1) {
            setActiveStoryIndex(activeStoryIndex - 1);
          } else {
            // Keep index but it will load the next story
            setProgress(0);
          }
        }
      }
    } catch (err: any) {
      showToast(err.message || "Failed to delete story", "info");
    } finally {
      setIsPaused(false);
    }
  };

  const handleReplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    showToast("Story reply sent! ✉️");
    handleClose();
  };

  // Format creation time
  const getTimeString = (createdAt: string) => {
    try {
      const diffMs = Date.now() - new Date(createdAt).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${Math.floor(diffHours / 24)}d ago`;
    } catch {
      return "recently";
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-[200] flex items-center justify-center select-none text-white">
      <div className="relative w-full max-w-[420px] h-screen flex flex-col justify-between bg-zinc-950">
        
        {/* Top Segment Bars for current group stories */}
        <div className="absolute top-3 left-0 right-0 z-30 px-3 flex gap-1">
          {currentGroup.stories.map((_, idx) => {
            let width = "0%";
            if (idx < activeStoryIndex) width = "100%";
            if (idx === activeStoryIndex) width = `${progress}%`;

            return (
              <div key={`story-seg-${idx}`} className="flex-1 h-[2.5px] bg-white/30 rounded-full overflow-hidden">
                <div
                  style={{ width }}
                  className="h-full bg-white transition-all duration-75 ease-linear"
                />
              </div>
            );
          })}
        </div>

        {/* Story Header */}
        <div className="absolute top-7 left-0 right-0 z-30 px-3 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent pb-8 select-none">
          <div className="flex items-center gap-2.5">
            <img
              src={currentGroup.avatarUrl}
              alt={currentGroup.username}
              className="w-9 h-9 rounded-full object-cover border border-white/40"
            />
            <span className="font-bold text-[14px] drop-shadow-md">{currentGroup.username}</span>
            <span className="text-[12px] text-white/80 drop-shadow-md">
              {getTimeString(activeStory.createdAt)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {currentUser && currentUser.id === activeStory.userId && (
              <button
                onClick={handleDelete}
                className="text-white hover:text-red-400 p-1 cursor-pointer bg-black/20 hover:bg-black/40 rounded-full transition"
                title="Delete Story"
              >
                <Trash2 size={18} />
              </button>
            )}
            <button
              onClick={handleClose}
              className="text-white hover:text-gray-300 p-1 cursor-pointer bg-black/20 hover:bg-black/40 rounded-full transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Story content / Media viewer */}
        <div className="flex-1 relative flex items-center justify-center overflow-hidden">
          {activeStory.mediaType === "video" ? (
            <video
              src={activeStory.mediaUrl}
              autoPlay
              muted
              playsInline
              loop
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={activeStory.mediaUrl}
              alt="Story content"
              className="w-full h-full object-cover"
            />
          )}

          {/* Caption Overlay */}
          {activeStory.caption && (
            <div className="absolute bottom-16 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-center">
              <p className="text-[15px] font-medium text-white drop-shadow-md leading-relaxed px-4">
                {activeStory.caption}
              </p>
            </div>
          )}

          {/* Left/Right click targets */}
          <div
            onClick={handlePrev}
            className="absolute left-0 top-0 bottom-0 w-[40%] cursor-pointer z-20"
            title="Previous Story"
          />
          <div
            onClick={handleNext}
            className="absolute right-0 top-0 bottom-0 w-[40%] cursor-pointer z-20"
            title="Next Story"
          />
        </div>

        {/* Input box */}
        <div className="p-3 bg-black flex items-center gap-3.5 z-30 select-none border-t border-zinc-900">
          <form onSubmit={handleReplySubmit} className="flex-1 flex items-center gap-3">
            <input
              type="text"
              placeholder={`Reply to ${currentGroup.username}…`}
              onFocus={() => setIsPaused(true)}
              onBlur={() => setIsPaused(false)}
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-full px-4.5 py-2.5 text-[14px] text-white outline-none focus:border-zinc-700 placeholder-white/50 transition"
            />
            <button
              type="button"
              onClick={() => showToast("❤️ reaction sent")}
              className="text-[22px] hover:scale-105 transition"
            >
              ❤️
            </button>
            <button
              type="button"
              onClick={() => showToast("🔥 reaction sent")}
              className="text-[22px] hover:scale-105 transition"
            >
              🔥
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
