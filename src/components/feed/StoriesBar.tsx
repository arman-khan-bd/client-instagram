"use client";

import React from "react";
import { useApp } from "../AppContext";

export default function StoriesBar() {
  const { storyGroups, setStoryViewerIndex, setShowStoryCreate, currentUser } = useApp();

  const handleAddStory = () => {
    setShowStoryCreate(true);
  };

  // Find if user has their own story in the groups
  const myGroupIndex = currentUser ? storyGroups.findIndex(g => g.userId === currentUser.id) : -1;
  const hasMyStory = myGroupIndex !== -1;

  return (
    <div className="bg-[#111] border border-[#222] rounded-2xl p-4.5 mb-5 select-none w-full">
      <div className="flex gap-4 overflow-x-auto no-scrollbar pb-1">
        {/* Add Story Button (Always Visible) */}
        <div className="flex flex-col items-center gap-1.5 shrink-0">
          <div className="relative">
            <div
              onClick={handleAddStory}
              className="w-[60px] h-[60px] rounded-full bg-[#1a1a1a] border-2 border-dashed border-[#333] flex items-center justify-center text-xl font-bold text-gray-300 hover:text-white transition cursor-pointer"
            >
              ➕
            </div>
            <div
              onClick={handleAddStory}
              className="absolute bottom-0 right-0 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white border-2 border-[#111] font-bold text-xs cursor-pointer select-none"
            >
              +
            </div>
          </div>
          <span className="text-[11px] text-[#a8a8a8] text-center max-w-[64px] truncate">
            Add story
          </span>
        </div>

        {/* Your Story (Only visible if you have active stories) */}
        {hasMyStory && (
          <div
            onClick={() => setStoryViewerIndex(myGroupIndex)}
            className="flex flex-col items-center gap-1.5 cursor-pointer shrink-0"
          >
            <div className="w-[60px] h-[60px] rounded-full p-[2px] bg-[linear-gradient(45deg,#f09433_0%,#e6683c_25%,#dc2743_50%,#cc2366_75%,#bc1888_100%)]">
              <img
                className="w-full h-full rounded-full border-2 border-[#111] object-cover"
                src={currentUser?.img || "https://i.pravatar.cc/150?img=1"}
                alt="Your story"
              />
            </div>
            <span className="text-[11px] text-[#a8a8a8] text-center max-w-[64px] truncate">
              Your story
            </span>
          </div>
        )}

        {/* Other User Stories */}
        {storyGroups.map((group, idx) => {
          // Skip if it's the current user's story (already handled above)
          if (currentUser && group.userId === currentUser.id) return null;

          return (
            <div
              key={group.userId}
              onClick={() => setStoryViewerIndex(idx)}
              className="flex flex-col items-center gap-1.5 cursor-pointer shrink-0"
            >
              <div className="w-[60px] h-[60px] rounded-full p-[2px] bg-[linear-gradient(45deg,#f09433_0%,#e6683c_25%,#dc2743_50%,#cc2366_75%,#bc1888_100%)]">
                <img
                  className="w-full h-full rounded-full border-2 border-[#111] object-cover"
                  src={group.avatarUrl}
                  alt={group.username}
                />
              </div>
              <span className="text-[11px] text-[#a8a8a8] text-center max-w-[64px] truncate">
                {group.username}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
