"use client";

import React from "react";
import { useApp } from "../AppContext";
import { Home, Search, Compass, Film, MessageCircle, Heart, PlusSquare, Menu, LogOut, ShieldAlert, Settings as SettingsIcon, Tv } from "lucide-react";

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
      setActiveTab("profile", null);
    } else {
      setViewingUserId(null);
      setActiveTab(tab);
    }
  };

  return (
    <aside className="hidden sm:flex flex-col bg-[var(--surface)] backdrop-blur-xl border-r border-[var(--border)] h-screen sticky top-0 py-6 px-3 lg:w-[240px] md:w-[76px] w-[70px] transition-all z-50 text-[var(--text)] overflow-y-auto custom-scroll">
      {/* Logo */}
      <div
        onClick={() => handleNav("home")}
        className="cursor-pointer mb-8 px-3 font-bold text-[22px] tracking-tight select-none"
      >
        <span className="hidden lg:inline text-gradient-instagram font-sans">
          AuraGram
        </span>
        <span className="lg:hidden block text-xl text-center">✨</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-1">
        <button
          onClick={() => handleNav("home")}
          className={`flex items-center gap-4 p-3 rounded-xl hover:bg-[var(--surface2)] transition text-left w-full ${
            activeTab === "home" ? "bg-[var(--surface3)] font-bold text-[var(--text)]" : "text-[var(--text2)] hover:text-[var(--text)]"
          }`}
        >
          <Home size={22} className="min-w-[22px]" />
          <span className="hidden lg:inline text-[15px]">Home</span>
        </button>

        <button
          onClick={() => handleNav("search")}
          className={`flex items-center gap-4 p-3 rounded-xl hover:bg-[var(--surface2)] transition text-left w-full ${
            activeTab === "search" ? "bg-[var(--surface3)] font-bold text-[var(--text)]" : "text-[var(--text2)] hover:text-[var(--text)]"
          }`}
        >
          <Search size={22} className="min-w-[22px]" />
          <span className="hidden lg:inline text-[15px]">Search</span>
        </button>

        <button
          onClick={() => handleNav("explore")}
          className={`flex items-center gap-4 p-3 rounded-xl hover:bg-[var(--surface2)] transition text-left w-full ${
            activeTab === "explore" ? "bg-[var(--surface3)] font-bold text-[var(--text)]" : "text-[var(--text2)] hover:text-[var(--text)]"
          }`}
        >
          <Compass size={22} className="min-w-[22px]" />
          <span className="hidden lg:inline text-[15px]">Explore</span>
        </button>

        <button
          onClick={() => handleNav("reels")}
          className={`flex items-center gap-4 p-3 rounded-xl hover:bg-[var(--surface2)] transition text-left w-full ${
            activeTab === "reels" ? "bg-[var(--surface3)] font-bold text-[var(--text)]" : "text-[var(--text2)] hover:text-[var(--text)]"
          }`}
        >
          <Film size={22} className="min-w-[22px]" />
          <span className="hidden lg:inline text-[15px]">Reels</span>
        </button>

        <button
          onClick={() => handleNav("tv")}
          className={`flex items-center gap-4 p-3 rounded-xl hover:bg-[var(--surface2)] transition text-left w-full ${
            activeTab === "tv" ? "bg-[var(--surface3)] font-bold text-[var(--text)]" : "text-[var(--text2)] hover:text-[var(--text)]"
          }`}
        >
          <Tv size={22} className="min-w-[22px]" />
          <span className="hidden lg:inline text-[15px]">AuraTV</span>
        </button>

        <button
          onClick={() => handleNav("messages")}
          className={`flex items-center gap-4 p-3 rounded-xl hover:bg-[var(--surface2)] transition text-left w-full relative ${
            activeTab === "messages" ? "bg-[var(--surface3)] font-bold text-[var(--text)]" : "text-[var(--text2)] hover:text-[var(--text)]"
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
          className={`flex items-center gap-4 p-3 rounded-xl hover:bg-[var(--surface2)] transition text-left w-full relative ${
            activeTab === "notifications" ? "bg-[var(--surface3)] font-bold text-[var(--text)]" : "text-[var(--text2)] hover:text-[var(--text)]"
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
          className="flex items-center gap-4 p-3 rounded-xl hover:bg-[var(--surface2)] transition text-left w-full text-[var(--text2)] hover:text-[var(--text)]"
        >
          <PlusSquare size={22} className="min-w-[22px]" />
          <span className="hidden lg:inline text-[15px]">Create</span>
        </button>

        {currentUser?.role === "admin" && (
          <button
            onClick={() => handleNav("admin")}
            className={`flex items-center gap-4 p-3 rounded-xl hover:bg-[var(--surface2)] transition text-left w-full ${
              activeTab === "admin" ? "bg-[var(--surface3)] font-bold text-[var(--text)]" : "text-[var(--text2)] hover:text-[var(--text)]"
            }`}
          >
            <ShieldAlert size={22} className="min-w-[22px]" />
            <span className="hidden lg:inline text-[15px]">Admin</span>
          </button>
        )}

        <div className="h-[1px] bg-[var(--border)] my-2 mx-1" />

        <button
          onClick={() => handleNav("profile")}
          className={`flex items-center gap-4 p-3 rounded-xl hover:bg-[var(--surface2)] transition text-left w-full ${
            activeTab === "profile" && viewingUserId === null
              ? "bg-[var(--surface3)] font-bold text-[var(--text)]"
              : "text-[var(--text2)] hover:text-[var(--text)]"
          }`}
        >
          <img
            src={currentUser?.img || "https://i.pravatar.cc/150?img=1"}
            className={`w-6 h-6 rounded-full object-cover border ${
              activeTab === "profile" && viewingUserId === null ? "border-[var(--text)]" : "border-transparent"
            }`}
            alt="me"
          />
          <span className="hidden lg:inline text-[15px]">Profile</span>
        </button>
      </nav>

      {/* Sidebar bottom */}
      <div className="flex flex-col gap-1 mt-auto">
        <div className="h-[1px] bg-[var(--border)] my-2 mx-1" />
        <button
          onClick={() => handleNav("settings")}
          className={`flex items-center gap-4 p-3 rounded-xl hover:bg-[var(--surface2)] transition text-left w-full ${
            activeTab === "settings" ? "bg-[var(--surface3)] font-bold text-[var(--text)]" : "text-[var(--text2)] hover:text-[var(--text)]"
          }`}
        >
          <SettingsIcon size={22} className="min-w-[22px]" />
          <span className="hidden lg:inline text-[15px]">Settings</span>
        </button>
        <button
          onClick={() => handleNav("profile")}
          className="flex items-center gap-4 p-3 rounded-xl hover:bg-[var(--surface2)] transition text-left w-full text-[var(--text2)] hover:text-[var(--text)]"
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
