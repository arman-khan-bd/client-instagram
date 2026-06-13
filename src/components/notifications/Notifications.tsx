"use client";

import React from "react";
import { useApp, MockNotification } from "../AppContext";
import { api } from "../../lib/api";

export default function Notifications() {
  const {
    notifications,
    setNotifications,
    followStates,
    toggleFollow,
    setActivePostId,
    setViewingUserId,
    setActiveTab,
    storyGroups,
    setStoryViewerIndex,
  } = useApp();

  const handleNotificationClick = async (item: MockNotification) => {
    // Mark as read in local state
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, unread: false } : n))
    );
    try {
      await api.markNotificationRead(item.id);
    } catch (err) {
      console.error("Failed to mark notification read in database:", err);
    }

    if (item.postId) {
      setActivePostId(item.postId);
    } else if (item.storyId) {
      const storyIdx = storyGroups.findIndex((g) => g.stories.some((s) => s.id === item.storyId));
      if (storyIdx !== -1) {
        setStoryViewerIndex(storyIdx);
      }
    }
  };

  const handleUserClick = (username: string) => {
    setViewingUserId(username);
    setActiveTab("profile", username);
  };

  const renderNotifItem = (item: MockNotification) => {
    const isFollowing = !!followStates[item.user.id];

    return (
      <div
        key={`notif-${item.id}`}
        onClick={() => handleNotificationClick(item)}
        className={`flex items-center gap-3.5 px-4.5 py-3.5 hover:bg-[#1a1a1a]/40 transition cursor-pointer select-none ${
          item.unread ? "bg-insta-blue/5 border-l-2 border-insta-blue" : ""
        }`}
      >
        <img
          src={item.user.img}
          alt={item.user.name}
          className="w-11 h-11 rounded-full object-cover border border-[#222]"
          onClick={(e) => {
            e.stopPropagation();
            handleUserClick(item.user.name);
          }}
        />
        
        <div className="flex-1 text-[13px] leading-relaxed">
          <strong
            className="hover:underline cursor-pointer mr-1"
            onClick={(e) => {
              e.stopPropagation();
              handleUserClick(item.user.name);
            }}
          >
            {item.user.name}
          </strong>
          {item.text} <span className="text-[#666] text-[11px] ml-1">{item.time}</span>
        </div>

        {item.type === "follow" && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFollow(item.user.id);
            }}
            className={`px-4.5 py-1.5 rounded-lg text-[12px] font-bold cursor-pointer transition ${
              isFollowing
                ? "bg-transparent border border-[#2a2a2a] text-white hover:bg-[#1a1a1a]"
                : "bg-insta-blue hover:bg-insta-blue/90 text-white"
            }`}
          >
            {isFollowing ? "Following" : "Follow"}
          </button>
        )}

        {item.img && item.type !== "follow" && (
          item.isVideoStory ? (
            <video
              src={item.img}
              className="w-11 h-11 rounded-lg object-cover cursor-pointer shrink-0 border border-[#222] hover:opacity-85 transition bg-zinc-900"
              muted
              playsInline
              onClick={(e) => {
                e.stopPropagation();
                if (item.storyId) {
                  const storyIdx = storyGroups.findIndex((g) => g.stories.some((s) => s.id === item.storyId));
                  if (storyIdx !== -1) setStoryViewerIndex(storyIdx);
                }
              }}
            />
          ) : (
            <img
              src={item.img}
              alt="Preview"
              className="w-11 h-11 rounded-lg object-cover cursor-pointer shrink-0 border border-[#222] hover:opacity-85 transition"
              onClick={(e) => {
                e.stopPropagation();
                if (item.postId) {
                  setActivePostId(item.postId);
                } else if (item.storyId) {
                  const storyIdx = storyGroups.findIndex((g) => g.stories.some((s) => s.id === item.storyId));
                  if (storyIdx !== -1) setStoryViewerIndex(storyIdx);
                }
              }}
            />
          )
        )}
      </div>
    );
  };

  // Group notifications dynamically by date
  const todayNotifs: MockNotification[] = [];
  const weekNotifs: MockNotification[] = [];
  const monthNotifs: MockNotification[] = [];

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const oneWeekAgo = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);

  notifications.forEach((item) => {
    const itemDate = item.createdAt ? new Date(item.createdAt) : new Date();
    if (itemDate >= startOfToday) {
      todayNotifs.push(item);
    } else if (itemDate >= oneWeekAgo) {
      weekNotifs.push(item);
    } else {
      monthNotifs.push(item);
    }
  });

  return (
    <div className="flex-1 overflow-y-auto h-full w-full custom-scroll text-white select-none">
      <div className="max-w-[600px] mx-auto py-8">
        <h2 className="text-[18px] font-bold px-4.5 mb-6">Notifications</h2>

        {/* Today */}
        {todayNotifs.length > 0 && (
          <div className="mb-6">
            <h3 className="text-[13px] font-bold text-[#a8a8a8] px-4.5 mb-2.5">Today</h3>
            <div className="flex flex-col border-y border-[#222] bg-[#111] divide-y divide-[#222]/60 rounded-xl overflow-hidden">
              {todayNotifs.map(renderNotifItem)}
            </div>
          </div>
        )}

        {/* This Week */}
        {weekNotifs.length > 0 && (
          <div className="mb-6">
            <h3 className="text-[13px] font-bold text-[#a8a8a8] px-4.5 mb-2.5">This Week</h3>
            <div className="flex flex-col border-y border-[#222] bg-[#111] divide-y divide-[#222]/60 rounded-xl overflow-hidden">
              {weekNotifs.map(renderNotifItem)}
            </div>
          </div>
        )}

        {/* This Month */}
        {monthNotifs.length > 0 && (
          <div className="mb-6">
            <h3 className="text-[13px] font-bold text-[#a8a8a8] px-4.5 mb-2.5">This Month</h3>
            <div className="flex flex-col border-y border-[#222] bg-[#111] divide-y divide-[#222]/60 rounded-xl overflow-hidden">
              {monthNotifs.map(renderNotifItem)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
