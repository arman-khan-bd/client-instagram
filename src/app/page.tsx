"use client";

import React from "react";
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

import { CheckCircle2, UserPlus, MessageSquare, Send, Bookmark, Info, X } from "lucide-react";

function AppContent() {
  const { currentUser, activeTab, toasts, removeToast } = useApp();

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
      <div className="flex w-full h-full relative">
        {/* Left Desktop Sidebar */}
        <Sidebar />

        {/* Center/Right Dynamic Tab Content */}
        <main className="flex-1 h-full flex flex-col relative pb-[60px] sm:pb-0">
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
