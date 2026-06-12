"use client";

import React, { useState } from "react";
import { useApp } from "../AppContext";
import { X, Link2, Send, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ShareModal() {
  const { sharePostId, setSharePostId, chats, showToast } = useApp();
  const [copied, setCopied] = useState(false);
  const [sentTo, setSentTo] = useState<number | null>(null);

  if (!sharePostId) return null;

  const postUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/p/${sharePostId}`
      : `/p/${sharePostId}`;

  const handleClose = () => {
    setSharePostId(null);
    setCopied(false);
    setSentTo(null);
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300]"
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            className="fixed bottom-0 left-0 right-0 z-[301] bg-[#111] border-t border-[#2a2a2a] rounded-t-3xl pb-safe-or-6 max-h-[75vh] flex flex-col"
          >
            {/* Handle */}
            <div className="w-10 h-1 bg-[#333] rounded-full mx-auto mt-3 mb-1 shrink-0" />

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 shrink-0 border-b border-[#1e1e1e]">
              <h3 className="text-[15px] font-bold text-white">Share</h3>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-full hover:bg-[#222] transition text-[#a8a8a8] hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* DM Contacts Row */}
            <div className="px-4 py-4 shrink-0">
              <p className="text-[11px] text-[#666] font-semibold uppercase tracking-wider mb-3">
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
                        className="w-14 h-14 rounded-full object-cover border-2 border-transparent group-hover:border-[#FF2E93] transition"
                        alt={chat.user.name}
                      />
                      {sentTo === chat.id && (
                        <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                          <Check size={22} className="text-[#FF2E93]" />
                        </div>
                      )}
                      {chat.online && (
                        <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#111]" />
                      )}
                    </div>
                    <span className="text-[11px] text-[#a8a8a8] group-hover:text-white transition max-w-[60px] truncate">
                      {chat.user.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Copy Link Section */}
            <div className="px-4 pb-2 shrink-0 border-t border-[#1e1e1e] pt-4">
              <p className="text-[11px] text-[#666] font-semibold uppercase tracking-wider mb-3">
                Link
              </p>
              <div className="flex items-center gap-2 bg-[#1a1a1a] rounded-xl p-3 border border-[#2a2a2a]">
                <Link2 size={15} className="text-[#a8a8a8] shrink-0" />
                <span className="flex-1 text-[12px] text-[#666] truncate">{postUrl}</span>
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
            <div className="px-4 pb-6 pt-3 flex gap-3 shrink-0">
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
