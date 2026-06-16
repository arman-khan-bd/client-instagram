"use client";

import React from "react";
import { useApp } from "../AppContext";
import { Home, Search, Film, MessageCircle, ShieldAlert } from "lucide-react";

export default function BottomNav() {
  const { activeTab, setActiveTab, setViewingUserId, currentUser, chats, isFeedLoaded } = useApp();

  const unreadMessages = chats.reduce((acc, c) => acc + c.unread, 0);

  const handleNav = (tab: string) => {
    if (typeof window !== "undefined" && window.navigator && typeof window.navigator.vibrate === "function") {
      window.navigator.vibrate(12);
    }
    if (tab === "profile") {
      setViewingUserId(null); // Show self profile
      setActiveTab("profile", null);
    } else {
      setViewingUserId(null);
      setActiveTab(tab);
    }
  };

  return (
    <nav className="sm:hidden flex bg-[var(--surface)] border-t border-[var(--border)] fixed bottom-0 left-0 right-0 pt-2 pb-[calc(8px+env(safe-area-inset-bottom))] px-1 select-none z-50 justify-around items-center">

      {/* Top Loader Bar */}
      {!isFeedLoaded && (
        <div className="absolute top-0 left-0 right-0 h-[2.5px] overflow-hidden bg-[var(--surface2)]">
          <div className="h-full bg-gradient-to-r from-insta-blue via-violet-500 to-[#bc1888] animate-[loadingProgress_1.5s_infinite_ease-in-out]" style={{ width: "35%" }} />
        </div>
      )}
      <button
        onClick={() => handleNav("home")}
        className={`flex flex-col items-center p-2 rounded-xl transition ${
          activeTab === "home" ? "text-[var(--text)]" : "text-[var(--text2)]"
        }`}
      >
        <Home size={24} />
      </button>

      <button
        onClick={() => handleNav("search")}
        className={`flex flex-col items-center p-2 rounded-xl transition ${
          activeTab === "search" ? "text-[var(--text)]" : "text-[var(--text2)]"
        }`}
      >
        <Search size={24} />
      </button>

      <button
        onClick={() => handleNav("reels")}
        className={`flex flex-col items-center p-2 rounded-xl transition ${
          activeTab === "reels" ? "text-[var(--text)]" : "text-[var(--text2)]"
        }`}
      >
        <Film size={24} />
      </button>

      <button
        onClick={() => handleNav("messages")}
        className={`flex flex-col items-center p-2 rounded-xl transition relative ${
          activeTab === "messages" ? "text-[var(--text)]" : "text-[var(--text2)]"
        }`}
      >
        <MessageCircle size={24} />
        {unreadMessages > 0 && (
          <span className="absolute top-1 right-1 bg-[#e74c3c] text-white text-[9px] font-bold w-4.5 h-4.5 rounded-full flex items-center justify-center">
            {unreadMessages}
          </span>
        )}
      </button>

      {currentUser?.role === "admin" && (
        <button
          onClick={() => handleNav("admin")}
          className={`flex flex-col items-center p-2 rounded-xl transition ${
            activeTab === "admin" ? "text-[var(--text)]" : "text-[var(--text2)]"
          }`}
        >
          <ShieldAlert size={24} />
        </button>
      )}

      <button
        onClick={() => handleNav("profile")}
        className={`flex flex-col items-center p-2 rounded-xl transition`}
      >
        <img
          src={currentUser?.img || "https://i.pravatar.cc/150?img=1"}
          className={`w-6 h-6 rounded-full object-cover border ${
            activeTab === "profile" ? "border-[var(--text)]" : "border-transparent"
          }`}
          alt="profile"
        />
      </button>
    </nav>
  );
}
