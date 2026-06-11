"use client";

import React from "react";
import { useApp } from "../AppContext";
import { Home, Search, Compass, Film, MessageCircle, Heart, PlusSquare, Menu, LogOut } from "lucide-react";

export default function Sidebar() {
  const {
    activeTab,
    setActiveTab,
    viewingUserId,
    setViewingUserId,
    setShowCreatePostModal,
    doLogout,
    currentUser,
    notifications,
    chats,
  } = useApp();

  const unreadNotifs = notifications.filter((n) => n.unread).length;
  // Calculate total unread messages
  const unreadMessages = chats.reduce((acc, c) => acc + c.unread, 0);

  const handleNav = (tab: string) => {
    if (tab === "profile") {
      setViewingUserId(null); // Show self profile
    }
    setActiveTab(tab);
  };

  return (
    <aside className="hidden sm:flex flex-col bg-[var(--surface)] backdrop-blur-xl border-r border-[var(--border)] h-screen sticky top-0 py-6 px-3 lg:w-[240px] md:w-[76px] w-[70px] transition-all z-50 text-[var(--text)]">
      {/* Logo */}
      <div
        onClick={() => handleNav("home")}
        className="cursor-pointer mb-8 px-3 font-semibold text-2xl tracking-wide select-none"
      >
        <span className="hidden lg:inline text-gradient-instagram font-['Pacifico',cursive] text-2xl">
          Instagram
        </span>
        <span className="lg:hidden block text-xl text-center">📸</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-1">
        <button
          onClick={() => handleNav("home")}
          className={`flex items-center gap-4 p-3 rounded-xl hover:bg-[#1a1a1a] transition text-left w-full ${
            activeTab === "home" ? "bg-[#1a1a1a] font-bold text-white" : "text-[#a8a8a8] hover:text-white"
          }`}
        >
          <Home size={22} className="min-w-[22px]" />
          <span className="hidden lg:inline text-[15px]">Home</span>
        </button>

        <button
          onClick={() => handleNav("search")}
          className={`flex items-center gap-4 p-3 rounded-xl hover:bg-[#1a1a1a] transition text-left w-full ${
            activeTab === "search" ? "bg-[#1a1a1a] font-bold text-white" : "text-[#a8a8a8] hover:text-white"
          }`}
        >
          <Search size={22} className="min-w-[22px]" />
          <span className="hidden lg:inline text-[15px]">Search</span>
        </button>

        <button
          onClick={() => handleNav("explore")}
          className={`flex items-center gap-4 p-3 rounded-xl hover:bg-[#1a1a1a] transition text-left w-full ${
            activeTab === "explore" ? "bg-[#1a1a1a] font-bold text-white" : "text-[#a8a8a8] hover:text-white"
          }`}
        >
          <Compass size={22} className="min-w-[22px]" />
          <span className="hidden lg:inline text-[15px]">Explore</span>
        </button>

        <button
          onClick={() => handleNav("reels")}
          className={`flex items-center gap-4 p-3 rounded-xl hover:bg-[#1a1a1a] transition text-left w-full ${
            activeTab === "reels" ? "bg-[#1a1a1a] font-bold text-white" : "text-[#a8a8a8] hover:text-white"
          }`}
        >
          <Film size={22} className="min-w-[22px]" />
          <span className="hidden lg:inline text-[15px]">Reels</span>
        </button>

        <button
          onClick={() => handleNav("messages")}
          className={`flex items-center gap-4 p-3 rounded-xl hover:bg-[#1a1a1a] transition text-left w-full relative ${
            activeTab === "messages" ? "bg-[#1a1a1a] font-bold text-white" : "text-[#a8a8a8] hover:text-white"
          }`}
        >
          <div className="relative">
            <MessageCircle size={22} className="min-w-[22px]" />
            {unreadMessages > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-[#e74c3c] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {unreadMessages}
              </span>
            )}
          </div>
          <span className="hidden lg:inline text-[15px]">Messages</span>
        </button>

        <button
          onClick={() => handleNav("notifications")}
          className={`flex items-center gap-4 p-3 rounded-xl hover:bg-[#1a1a1a] transition text-left w-full relative ${
            activeTab === "notifications" ? "bg-[#1a1a1a] font-bold text-white" : "text-[#a8a8a8] hover:text-white"
          }`}
        >
          <div className="relative">
            <Heart size={22} className="min-w-[22px]" />
            {unreadNotifs > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-[#e74c3c] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {unreadNotifs}
              </span>
            )}
          </div>
          <span className="hidden lg:inline text-[15px]">Notifications</span>
        </button>

        <button
          onClick={() => setShowCreatePostModal(true)}
          className="flex items-center gap-4 p-3 rounded-xl hover:bg-[#1a1a1a] transition text-left w-full text-[#a8a8a8] hover:text-white"
        >
          <PlusSquare size={22} className="min-w-[22px]" />
          <span className="hidden lg:inline text-[15px]">Create</span>
        </button>

        <div className="h-[1px] bg-[#222] my-2 mx-1" />

        <button
          onClick={() => handleNav("profile")}
          className={`flex items-center gap-4 p-3 rounded-xl hover:bg-[#1a1a1a] transition text-left w-full ${
            activeTab === "profile" && viewingUserId === null
              ? "bg-[#1a1a1a] font-bold text-white"
              : "text-[#a8a8a8] hover:text-white"
          }`}
        >
          <img
            src={currentUser?.img || "https://i.pravatar.cc/150?img=1"}
            className={`w-6 h-6 rounded-full object-cover border ${
              activeTab === "profile" && viewingUserId === null ? "border-white" : "border-transparent"
            }`}
            alt="me"
          />
          <span className="hidden lg:inline text-[15px]">Profile</span>
        </button>
      </nav>

      {/* Sidebar bottom */}
      <div className="flex flex-col gap-1 mt-auto">
        <div className="h-[1px] bg-[#222] my-2 mx-1" />
        <button
          onClick={() => handleNav("profile")}
          className="flex items-center gap-4 p-3 rounded-xl hover:bg-[#1a1a1a] transition text-left w-full text-[#a8a8a8] hover:text-white"
        >
          <Menu size={22} className="min-w-[22px]" />
          <span className="hidden lg:inline text-[15px]">More</span>
        </button>
        <button
          onClick={doLogout}
          className="flex items-center gap-4 p-3 rounded-xl hover:bg-red-950/20 hover:text-red-400 transition text-left w-full text-red-500/80"
        >
          <LogOut size={22} className="min-w-[22px]" />
          <span className="hidden lg:inline text-[15px]">Log Out</span>
        </button>
      </div>
    </aside>
  );
}
