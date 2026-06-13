"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "../AppContext";
import { api } from "../../lib/api";

interface SuggestedUser {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string;
  isVerified: boolean;
}

export default function RightSidebar() {
  const {
    currentUser,
    followStates,
    toggleFollow,
    setViewingUserId,
    setActiveTab,
    showToast,
  } = useApp();

  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);

  useEffect(() => {
    api.getSuggestedUsers(5)
      .then((data: any) => {
        setSuggestedUsers(data || []);
      })
      .catch((err) => {
        console.error("Failed to load suggestions:", err);
      });
  }, []);

  const handleSelfProfileClick = () => {
    setViewingUserId(null); // Show self profile
    setActiveTab("profile");
  };

  const handleUserClick = (username: string) => {
    setViewingUserId(username);
    setActiveTab("profile", username);
  };

  return (
    <div className="hidden lg:block w-[260px] shrink-0 text-white select-none">
      {/* Current User Card */}
      <div className="flex items-center gap-3 mb-6.5">
        <img
          src={currentUser?.img || "https://i.pravatar.cc/150?img=1"}
          alt="me"
          className="w-12 h-12 rounded-full object-cover border border-[#222] cursor-pointer"
          onClick={handleSelfProfileClick}
        />
        <div className="flex-1 min-w-0">
          <div
            onClick={handleSelfProfileClick}
            className="text-[14px] font-bold cursor-pointer hover:underline truncate"
          >
            {currentUser?.name || "alex_dev"}
          </div>
          <div className="text-[12px] text-[#a8a8a8] truncate">
            {currentUser?.full || "Alex Developer"}
          </div>
        </div>
        <button
          onClick={() => {}}
          className="text-[#3897f0] font-semibold text-[12px] hover:text-white transition cursor-pointer"
        >
          Switch
        </button>
      </div>

      {/* Suggestions Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-[13px] font-bold text-[#a8a8a8]">Suggested for you</span>
        <button
          onClick={() => setActiveTab("search")}
          className="text-[12px] font-bold text-[#f5f5f5] hover:text-[#a8a8a8] transition cursor-pointer"
        >
          See all
        </button>
      </div>

      {/* Suggested Users List */}
      <div className="flex flex-col gap-3.5 mb-6">
        {suggestedUsers.map((u) => {
          const isFollowing = !!followStates[u.id];
          return (
            <div key={u.id} className="flex items-center gap-2.5">
              <img
                src={u.avatarUrl || `https://i.pravatar.cc/150?u=${u.id}`}
                className="w-[38px] h-[38px] rounded-full object-cover cursor-pointer border border-[#222]"
                alt={u.username}
                onClick={() => handleUserClick(u.username)}
              />
              <div className="flex-1 min-w-0">
                <div
                  onClick={() => handleUserClick(u.username)}
                  className="text-[13px] font-semibold cursor-pointer hover:underline truncate flex items-center gap-1"
                >
                  {u.username}
                  {u.isVerified && <span className="verified-badge" title="Verified" />}
                </div>
                <div className="text-[11px] text-[#a8a8a8] truncate">
                  {u.fullName || u.username}
                </div>
              </div>
              <button
                onClick={() => toggleFollow(u.id)}
                className={`text-[12px] font-bold cursor-pointer transition ${
                  isFollowing ? "text-[#a8a8a8] hover:text-white" : "text-[#3897f0] hover:text-white"
                }`}
              >
                {isFollowing ? "Following" : "Follow"}
              </button>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="text-[10px] text-[#666] leading-relaxed select-text">
        <a href="#" className="hover:underline">About</a> ·{" "}
        <a href="#" className="hover:underline">Help</a> ·{" "}
        <a href="#" className="hover:underline">Press</a> ·{" "}
        <a href="#" className="hover:underline">API</a> ·{" "}
        <a href="#" className="hover:underline">Jobs</a> ·{" "}
        <a href="#" className="hover:underline">Privacy</a> ·{" "}
        <a href="#" className="hover:underline">Terms</a>
        <br />
        <span className="mt-2.5 block">© 2026 INSTAGRAM FROM META</span>
      </div>
    </div>
  );
}
