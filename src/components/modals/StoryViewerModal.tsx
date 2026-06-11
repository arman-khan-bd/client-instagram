"use client";

import React, { useEffect, useState, useRef } from "react";
import { useApp } from "../AppContext";
import { X } from "lucide-react";

export default function StoryViewerModal() {
  const { storyViewerIndex, setStoryViewerIndex, users, showToast } = useApp();
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const activeIndex = storyViewerIndex ?? 0;
  const activeUser = users[activeIndex];

  // Story Timer handler
  useEffect(() => {
    if (storyViewerIndex === null || isPaused) return;

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
  }, [storyViewerIndex, isPaused, activeIndex]);

  if (storyViewerIndex === null || !activeUser) return null;

  const handleNext = () => {
    if (activeIndex < users.length - 1) {
      setStoryViewerIndex(activeIndex + 1);
      setProgress(0);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (activeIndex > 0) {
      setStoryViewerIndex(activeIndex - 1);
      setProgress(0);
    } else {
      setProgress(0);
    }
  };

  const handleClose = () => {
    setStoryViewerIndex(null);
    setProgress(0);
  };

  const handleReplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    showToast("Story reply sent! ✉️");
    handleClose();
  };

  return (
    <div className="fixed inset-0 bg-black z-[200] flex items-center justify-center select-none text-white">
      <div className="relative w-full max-w-[420px] h-screen flex flex-col justify-between bg-zinc-950">
        
        {/* Top Segment Bars */}
        <div className="absolute top-3 left-0 right-0 z-30 px-3 flex gap-1">
          {users.map((_, idx) => {
            let width = "0%";
            if (idx < activeIndex) width = "100%";
            if (idx === activeIndex) width = `${progress}%`;

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
        <div className="absolute top-7 left-0 right-0 z-30 px-3 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent pb-6 select-none">
          <div className="flex items-center gap-2.5">
            <img
              src={activeUser.img}
              alt={activeUser.name}
              className="w-9 h-9 rounded-full object-cover border border-white"
            />
            <span className="font-bold text-[14px]">{activeUser.name}</span>
            <span className="text-[12px] text-white/70">
              {Math.floor(Math.random() * 5) + 1}h ago
            </span>
          </div>
          <button
            onClick={handleClose}
            className="text-white hover:text-gray-300 p-1 cursor-pointer bg-black/20 hover:bg-black/40 rounded-full transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Story content / Image click navigation target */}
        <div className="flex-1 relative flex items-center justify-center overflow-hidden">
          {/* Main Visual */}
          <img
            src={`https://picsum.photos/seed/s${activeIndex * 7}/420/740`}
            alt="Story content"
            className="w-full h-full object-cover"
          />

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
        <div className="p-3 bg-black flex items-center gap-3.5 z-30 select-none">
          <form onSubmit={handleReplySubmit} className="flex-1 flex items-center gap-3">
            <input
              type="text"
              placeholder={`Reply to ${activeUser.name}…`}
              onFocus={() => setIsPaused(true)}
              onBlur={() => setIsPaused(false)}
              className="flex-1 bg-transparent border border-white/50 rounded-full px-4.5 py-2.5 text-[14px] text-white outline-none focus:border-white placeholder-white/60 transition"
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
