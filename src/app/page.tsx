"use client";

import React, { useState } from "react";
import { AppProvider, useApp } from "../components/AppContext";
import AuthScreen from "../components/auth/AuthScreen";
import Sidebar from "../components/layout/Sidebar";
import BottomNav from "../components/layout/BottomNav";
import Feed from "../components/feed/Feed";
import Search from "../components/search/Search";
import Explore from "../components/explore/Explore";
import Reels from "../components/reels/Reels";
import Messages from "../components/messages/Messages";
import Notifications from "../components/notifications/Notifications";
import Profile from "../components/profile/Profile";

// Modals
import StoryViewerModal from "../components/modals/StoryViewerModal";
import PostModal from "../components/modals/PostModal";
import EditProfileModal from "../components/modals/EditProfileModal";
import FollowersModal from "../components/modals/FollowersModal";
import CreatePostModal from "../components/modals/CreatePostModal";
import StoryCreateModal from "../components/modals/StoryCreateModal";
import ShareModal from "../components/modals/ShareModal";

import { CheckCircle2, UserPlus, MessageSquare, Send, Bookmark, Info, X, Menu, PlusSquare, Heart, Home as HomeIcon, Search as SearchIcon, Compass, Film, LogOut, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function AppContent() {
  const {
    currentUser,
    activeTab,
    setActiveTab,
    toasts,
    removeToast,
    notifications,
    setShowCreatePostModal,
    setViewingUserId,
    doLogout,
  } = useApp();
  const [showDrawer, setShowDrawer] = useState(false);
  const unreadNotifs = notifications.filter((n) => n.unread).length;

  // Show Auth Screen if no user logged in
  if (!currentUser) {
    return <AuthScreen />;
  }

  // Render active tab view
  const renderActiveView = () => {
    switch (activeTab) {
      case "home":
        return <Feed />;
      case "search":
        return <Search />;
      case "explore":
        return <Explore />;
      case "reels":
        return <Reels />;
      case "messages":
        return <Messages />;
      case "notifications":
        return <Notifications />;
      case "profile":
        return <Profile />;
      default:
        return <Feed />;
    }
  };

  const getToastIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle2 size={18} className="text-[#58d68d]" />;
      case "follow":
        return <UserPlus size={18} className="text-[#3897f0]" />;
      case "comment":
        return <MessageSquare size={18} className="text-[#bc1888]" />;
      case "share":
        return <Send size={18} className="text-[#F77737]" />;
      case "save":
        return <Bookmark size={18} className="text-[#f1c40f]" />;
      case "message":
        return <MessageSquare size={18} className="text-[#E1306C]" />;
      default:
        return <Info size={18} className="text-[#a8a8a8]" />;
    }
  };

  return (
    <div className="flex h-screen w-screen bg-black overflow-hidden relative font-sans">
      {/* Top Header Mobile */}
      <header className="sm:hidden flex items-center justify-between h-[54px] bg-black border-b border-zinc-900 fixed top-0 left-0 right-0 px-4 z-[90] select-none text-white">
        <button onClick={() => setShowDrawer(true)} className="p-1 hover:text-gray-300">
          <Menu size={22} />
        </button>
        <span onClick={() => { setViewingUserId(null); setActiveTab("home"); }} className="text-gradient-instagram font-bold text-lg cursor-pointer">
          AuraGram
        </span>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowCreatePostModal(true)} className="p-1 hover:text-gray-300">
            <PlusSquare size={22} />
          </button>
          <button onClick={() => setActiveTab("notifications")} className="p-1 hover:text-gray-300 relative">
            <Heart size={22} />
            {unreadNotifs > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">
                {unreadNotifs}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Left Menu Drawer (Mobile) */}
      <AnimatePresence>
        {showDrawer && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDrawer(false)}
              className="fixed inset-0 bg-black z-[140] sm:hidden"
            />
            {/* Drawer Body */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.25 }}
              className="fixed top-0 bottom-0 left-0 w-[260px] bg-zinc-950 border-r border-zinc-900 z-[150] p-5 flex flex-col gap-6 text-white sm:hidden select-none"
            >
              <div className="flex items-center justify-between">
                <span className="text-gradient-instagram font-bold text-xl">AuraGram</span>
                <button onClick={() => setShowDrawer(false)} className="p-1 text-zinc-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <nav className="flex flex-col gap-2.5">
                {[
                  { name: "Home", tab: "home", icon: <HomeIcon size={20} /> },
                  { name: "Search", tab: "search", icon: <SearchIcon size={20} /> },
                  { name: "Explore", tab: "explore", icon: <Compass size={20} /> },
                  { name: "Reels", tab: "reels", icon: <Film size={20} /> },
                  { name: "Messages", tab: "messages", icon: <MessageSquare size={20} /> },
                  { name: "Notifications", tab: "notifications", icon: <Heart size={20} /> },
                  { name: "Profile", tab: "profile", icon: <User size={20} /> },
                ].map((item) => (
                  <button
                    key={item.name}
                    onClick={() => {
                      if (item.tab === "profile") setViewingUserId(null);
                      setActiveTab(item.tab);
                      setShowDrawer(false);
                    }}
                    className={`flex items-center gap-4 p-3 rounded-xl hover:bg-[#1a1a1a] transition text-left text-sm ${
                      activeTab === item.tab ? "bg-[#1a1a1a] font-bold text-white" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {item.icon}
                    <span>{item.name}</span>
                  </button>
                ))}
              </nav>

              <div className="mt-auto flex flex-col gap-2">
                <div className="h-[1px] bg-zinc-800 my-2" />
                <button
                  onClick={() => { doLogout(); setShowDrawer(false); }}
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-red-950/20 text-red-500 text-sm font-semibold transition w-full text-left"
                >
                  <LogOut size={20} />
                  <span>Log Out</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex w-full h-full relative">
        {/* Left Desktop Sidebar */}
        <Sidebar />

        {/* Center/Right Dynamic Tab Content */}
        <main className="flex-1 h-full flex flex-col relative pt-[54px] sm:pt-0 pb-[60px] sm:pb-0">
          {renderActiveView()}
        </main>

        {/* Mobile Bottom Navigation */}
        <BottomNav />
      </div>

      {/* Global Overlay Modals */}
      <StoryViewerModal />
      <PostModal />
      <EditProfileModal />
      <FollowersModal />
      <CreatePostModal />
      <StoryCreateModal />
      <ShareModal />

      {/* Unique Glassmorphic Toast Notifications Container */}
      <div className="fixed top-4 right-4 md:right-6 left-4 md:left-auto z-[9999] flex flex-col gap-3 max-w-sm w-full md:w-[350px] pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="flex bg-[#121212]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] overflow-hidden pointer-events-auto select-none animate-heart-pop relative w-full border-l-0"
          >
            {/* Left Brand Gradient Stripe */}
            <div className="bg-gradient-to-b from-[#f09433] via-[#dc2743] to-[#bc1888] w-[4.5px] shrink-0" />
            
            <div className="flex-1 flex items-start gap-3.5 p-4 pr-9">
              <div className="shrink-0 mt-0.5 select-none">
                {getToastIcon(toast.type)}
              </div>
              <div className="flex-1 text-[13px] leading-relaxed text-white font-medium select-text">
                {toast.text}
              </div>
            </div>
            
            {/* Close button */}
            <button
              onClick={() => removeToast(toast.id)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition cursor-pointer p-1"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
