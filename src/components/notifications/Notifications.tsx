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
    followRequests,
    respondToFollowRequest,
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
        className={`flex items-center gap-3.5 px-4.5 py-3.5 hover:bg-[var(--surface3)]/40 transition cursor-pointer select-none ${
          item.unread ? "bg-insta-blue/5 border-l-2 border-insta-blue" : ""
        }`}
      >
        <img
          src={item.user.img}
          alt={item.user.name}
          className="w-11 h-11 rounded-full object-cover border border-[var(--border)]"
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
          {item.text} <span className="text-[var(--text3)] text-[11px] ml-1">{item.time}</span>
        </div>

        {item.type === "follow" && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFollow(item.user.id);
            }}
            className={`px-4.5 py-1.5 rounded-lg text-[12px] font-bold cursor-pointer transition ${
              isFollowing
                ? "bg-transparent border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface2)]"
                : "bg-insta-blue hover:bg-insta-blue/90 text-white"
            }`}
          >
            {isFollowing ? "Following" : "Follow"}
          </button>
        )}

        {item.img && item.type !== "follow" && (
          <div className="relative w-11 h-11 shrink-0 select-none">
            {item.isVideoStory ? (
              <>
                <video
                  src={item.img}
                  className="w-full h-full rounded-lg object-cover cursor-pointer border border-[var(--border)] hover:opacity-85 transition bg-[var(--surface2)]"
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
                <div className="absolute bottom-0.5 right-0.5 bg-black/70 text-white rounded p-0.5 pointer-events-none flex items-center justify-center text-[9px] w-4.5 h-4.5">
                  📹
                </div>
              </>
            ) : (
              <img
                src={item.img}
                alt="Preview"
                className="w-full h-full rounded-lg object-cover cursor-pointer border border-[var(--border)] hover:opacity-85 transition"
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
            )}
          </div>
        )}
      </div>
    );
  };

  // Group notifications dynamically by date (excluding follow_request type notifs, as they are handled in their own section)
  const todayNotifs: MockNotification[] = [];
  const weekNotifs: MockNotification[] = [];
  const monthNotifs: MockNotification[] = [];

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const oneWeekAgo = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);

  notifications
    .filter((n) => n.type !== "follow_request")
    .forEach((item) => {
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
    <div className="flex-1 overflow-y-auto h-full w-full custom-scroll text-[var(--text)] select-none bg-[var(--bg)]">
      <div className="max-w-[600px] mx-auto py-8">
        <h2 className="text-[18px] font-bold px-4.5 mb-6">Notifications</h2>

        {/* Follow Requests */}
        {followRequests.length > 0 && (
          <div className="mb-6">
            <h3 className="text-[13px] font-bold text-[var(--text2)] px-4.5 mb-2.5">Follow Requests</h3>
            <div className="flex flex-col border border-[var(--border)] bg-[var(--surface)] divide-y divide-[var(--border)]/60 rounded-xl overflow-hidden shadow-sm mx-4.5">
              {followRequests.map((req) => (
                <div
                  key={`follow-req-${req.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[var(--surface3)]/20 transition"
                >
                  <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleUserClick(req.user.name)}>
                    <img
                      src={req.user.img}
                      alt={req.user.name}
                      className="w-10 h-10 rounded-full object-cover border border-[var(--border)]"
                    />
                    <div className="text-[13px]">
                      <span className="font-bold hover:underline block">{req.user.name}</span>
                      <span className="text-[var(--text2)] block text-[11px] truncate max-w-[150px] sm:max-w-none">{req.user.full}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => respondToFollowRequest(req.id, "accept")}
                      className="px-3.5 py-1.5 bg-insta-blue hover:bg-insta-blue/90 text-white rounded-lg text-[12px] font-bold cursor-pointer transition"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => respondToFollowRequest(req.id, "decline")}
                      className="px-3.5 py-1.5 border border-[var(--border)] hover:bg-[var(--surface2)] text-[var(--text)] rounded-lg text-[12px] font-bold cursor-pointer transition"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Today */}
        {todayNotifs.length > 0 && (
          <div className="mb-6">
            <h3 className="text-[13px] font-bold text-[var(--text2)] px-4.5 mb-2.5">Today</h3>
            <div className="flex flex-col border-y border-[var(--border)] bg-[var(--surface)] divide-y divide-[var(--border)]/60 rounded-xl overflow-hidden">
              {todayNotifs.map(renderNotifItem)}
            </div>
          </div>
        )}

        {/* This Week */}
        {weekNotifs.length > 0 && (
          <div className="mb-6">
            <h3 className="text-[13px] font-bold text-[var(--text2)] px-4.5 mb-2.5">This Week</h3>
            <div className="flex flex-col border-y border-[var(--border)] bg-[var(--surface)] divide-y divide-[var(--border)]/60 rounded-xl overflow-hidden">
              {weekNotifs.map(renderNotifItem)}
            </div>
          </div>
        )}

        {/* This Month */}
        {monthNotifs.length > 0 && (
          <div className="mb-6">
            <h3 className="text-[13px] font-bold text-[var(--text2)] px-4.5 mb-2.5">This Month</h3>
            <div className="flex flex-col border-y border-[var(--border)] bg-[var(--surface)] divide-y divide-[var(--border)]/60 rounded-xl overflow-hidden">
              {monthNotifs.map(renderNotifItem)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
