"use client";

import React, { useState } from "react";
import { useApp } from "../AppContext";
import { X, Link2, Send, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ShareModal() {
  const { sharePostId, setSharePostId, chats, showToast, createPost } = useApp();
  const [copied, setCopied] = useState(false);
  const [sentTo, setSentTo] = useState<number | null>(null);
  const [shareComment, setShareComment] = useState("");
  const [sharingToProfile, setSharingToProfile] = useState(false);

  if (!sharePostId) return null;

  const postUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/p/${sharePostId}`
      : `/p/${sharePostId}`;

  const handleClose = () => {
    setSharePostId(null);
    setCopied(false);
    setSentTo(null);
    setShareComment("");
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      setCopied(true);
      showToast("Link copied! 📋", "share");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast("Could not copy link", "info");
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Check this out on AuraGram", url: postUrl });
      } catch {}
    } else {
      handleCopyLink();
    }
  };

  const handleSendToDm = (chatId: number, name: string) => {
    setSentTo(chatId);
    showToast(`Sent to ${name} 📤`, "message");
    setTimeout(() => {
      setSentTo(null);
    }, 1500);
  };

  const handleShareToProfile = async () => {
    setSharingToProfile(true);
    try {
      await createPost([], shareComment, {
        originalPostId: sharePostId
      });
      handleClose();
    } catch (err) {
      console.error(err);
      showToast("Failed to share post", "info");
    } finally {
      setSharingToProfile(false);
    }
  };

  return (
    <AnimatePresence>
      {sharePostId && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[300]"
          />

          {/* Centered Modal Content Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: "-50%", y: "-40%" }}
            animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
            exit={{ opacity: 0, scale: 0.9, x: "-50%", y: "-40%" }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className="fixed top-1/2 left-1/2 z-[301] bg-[var(--surface2)] border border-[var(--border)] rounded-3xl pb-6 max-w-[460px] w-[92%] flex flex-col text-[var(--text)] shadow-2xl overflow-y-auto max-h-[85vh] no-scrollbar"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 shrink-0 border-b border-[var(--border)]">
              <h3 className="text-[15px] font-bold text-[var(--text)]">Share</h3>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-full hover:bg-[var(--surface3)] transition text-[var(--text2)] hover:text-[var(--text)] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Share to Profile (Facebook style) */}
            <div className="px-5 py-4 border-b border-[var(--border)] shrink-0">
              <p className="text-[11px] text-[var(--text3)] font-semibold uppercase tracking-wider mb-2.5">
                Share to Profile
              </p>
              <div className="flex flex-col gap-2.5 bg-[var(--surface3)] rounded-xl p-3 border border-[var(--border)]">
                <textarea
                  value={shareComment}
                  onChange={(e) => setShareComment(e.target.value)}
                  placeholder="Write a caption..."
                  rows={2}
                  className="w-full bg-transparent text-[13px] text-[var(--text)] outline-none border-none resize-none placeholder-[var(--text3)] leading-relaxed"
                />
                <button
                  onClick={handleShareToProfile}
                  disabled={sharingToProfile}
                  className="w-full py-2 bg-insta-blue hover:bg-insta-blue/95 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  {sharingToProfile ? "Sharing..." : "Share to profile"}
                </button>
              </div>
            </div>

            {/* DM Contacts Row */}
            <div className="px-5 py-4 shrink-0">
              <p className="text-[11px] text-[var(--text3)] font-semibold uppercase tracking-wider mb-3">
                Send to
              </p>
              <div className="flex gap-4 overflow-x-auto pb-1 no-scrollbar">
                {chats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => handleSendToDm(chat.id, chat.user.name)}
                    className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer"
                  >
                    <div className="relative">
                      <img
                        src={chat.user.img}
                        className="w-13 h-13 rounded-full object-cover border-2 border-transparent group-hover:border-[#FF2E93] transition"
                        alt={chat.user.name}
                      />
                      {sentTo === chat.id && (
                        <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                          <Check size={20} className="text-[#FF2E93]" />
                        </div>
                      )}
                      {chat.online && (
                        <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[var(--bg)]" />
                      )}
                    </div>
                    <span className="text-[11px] text-[var(--text2)] group-hover:text-[var(--text)] transition max-w-[55px] truncate">
                      {chat.user.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Copy Link Section */}
            <div className="px-5 pb-2 shrink-0 border-t border-[var(--border)] pt-4">
              <p className="text-[11px] text-[var(--text3)] font-semibold uppercase tracking-wider mb-3">
                Link
              </p>
              <div className="flex items-center gap-2 bg-[var(--surface3)] rounded-xl p-3 border border-[var(--border)]">
                <Link2 size={15} className="text-[var(--text3)] shrink-0" />
                <span className="flex-1 text-[12px] text-[var(--text2)] truncate">{postUrl}</span>
                <button
                  onClick={handleCopyLink}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition cursor-pointer ${
                    copied
                      ? "bg-green-500/10 text-green-400 border border-green-500/30"
                      : "bg-insta-blue/10 text-insta-blue hover:bg-insta-blue/20 border border-insta-blue/20"
                  }`}
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            {/* More Share Options */}
            <div className="px-5 pb-2 pt-4 flex gap-3 shrink-0">
              <button
                onClick={handleNativeShare}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[#FF8A00] via-[#FF2E93] to-[#9E00FF] rounded-xl text-[13px] font-bold text-white cursor-pointer hover:opacity-95 active:scale-[0.98] transition"
              >
                <Send size={16} />
                Share via…
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
