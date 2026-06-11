"use client";

import React from "react";
import { useApp } from "../AppContext";

export default function StoriesBar() {
  const { users, setStoryViewerIndex } = useApp();

  const handleAddStory = () => {
    // Quietly ignore or handle locally
  };

  return (
    <div className="bg-[#111] border border-[#222] rounded-2xl p-4.5 mb-5 select-none w-full">
      <div className="flex gap-4 overflow-x-auto no-scrollbar pb-1">
        {/* Add Story Button */}
        <div className="flex flex-col items-center gap-1.5 cursor-pointer shrink-0" onClick={handleAddStory}>
          <div className="w-[60px] h-[60px] rounded-full bg-[#1a1a1a] border-2 border-dashed border-[#333] flex items-center justify-center text-xl font-bold text-gray-300 hover:text-white transition">
            ➕
          </div>
          <span className="text-[11px] text-[#a8a8a8] text-center max-w-[64px] truncate">
            Add story
          </span>
        </div>

        {/* User Stories */}
        {users.map((u, i) => (
          <div
            key={u.id}
            onClick={() => setStoryViewerIndex(i)}
            className="flex flex-col items-center gap-1.5 cursor-pointer shrink-0"
          >
            <div
              className={`w-[60px] h-[60px] rounded-full p-[2px] ${
                i > 2
                  ? "bg-[#2a2a2a]"
                  : "bg-[linear-gradient(45deg,#f09433_0%,#e6683c_25%,#dc2743_50%,#cc2366_75%,#bc1888_100%)]"
              }`}
            >
              <img
                className="w-full h-full rounded-full border-2 border-[#111] object-cover"
                src={u.img}
                alt={u.name}
              />
            </div>
            <span className="text-[11px] text-[#a8a8a8] text-center max-w-[64px] truncate">
              {u.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
