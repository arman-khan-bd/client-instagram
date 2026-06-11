"use client";

import React from "react";
import { useApp } from "../AppContext";
import { Home, Search, Film, MessageCircle } from "lucide-react";

export default function BottomNav() {
  const { activeTab, setActiveTab, setViewingUserId, currentUser, chats } = useApp();

  const unreadMessages = chats.reduce((acc, c) => acc + c.unread, 0);

  const handleNav = (tab: string) => {
    if (tab === "profile") {
      setViewingUserId(null); // Show self profile
    }
    setActiveTab(tab);
  };

  return (
    <nav className="sm:hidden flex bg-[#111] border-t border-[#222] fixed bottom-0 left-0 right-0 py-2 px-1 select-none z-50 justify-around items-center">
      <button
        onClick={() => handleNav("home")}
        className={`flex flex-col items-center p-2 rounded-xl transition ${
          activeTab === "home" ? "text-white" : "text-[#a8a8a8]"
        }`}
      >
        <Home size={24} />
      </button>

      <button
        onClick={() => handleNav("search")}
        className={`flex flex-col items-center p-2 rounded-xl transition ${
          activeTab === "search" ? "text-white" : "text-[#a8a8a8]"
        }`}
      >
        <Search size={24} />
      </button>

      <button
        onClick={() => handleNav("reels")}
        className={`flex flex-col items-center p-2 rounded-xl transition ${
          activeTab === "reels" ? "text-white" : "text-[#a8a8a8]"
        }`}
      >
        <Film size={24} />
      </button>

      <button
        onClick={() => handleNav("messages")}
        className={`flex flex-col items-center p-2 rounded-xl transition relative ${
          activeTab === "messages" ? "text-white" : "text-[#a8a8a8]"
        }`}
      >
        <MessageCircle size={24} />
        {unreadMessages > 0 && (
          <span className="absolute top-1 right-1 bg-[#e74c3c] text-white text-[9px] font-bold w-4.5 h-4.5 rounded-full flex items-center justify-center">
            {unreadMessages}
          </span>
        )}
      </button>

      <button
        onClick={() => handleNav("profile")}
        className={`flex flex-col items-center p-2 rounded-xl transition`}
      >
        <img
          src={currentUser?.img || "https://i.pravatar.cc/150?img=1"}
          className={`w-6 h-6 rounded-full object-cover border ${
            activeTab === "profile" ? "border-white" : "border-transparent"
          }`}
          alt="profile"
        />
      </button>
    </nav>
  );
}
