"use client";

import React, { useEffect, useState } from "react";
import { useApp } from "../AppContext";
import { X } from "lucide-react";
import { api } from "../../lib/api";
import { REACTIONS } from "../feed/PostCard";

interface ReactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: number | string;
}

interface ReactionDetail {
  id: number;
  type: string;
  userId: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    fullName: string;
    avatarUrl: string;
  };
}

export default function ReactionsModal({ isOpen, onClose, postId }: ReactionsModalProps) {
  const { followStates, toggleFollow, currentUser, setViewingUserId, setActiveTab } = useApp();
  const [reactions, setReactions] = useState<ReactionDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTabLocal] = useState<string>("all");

  useEffect(() => {
    if (isOpen && postId) {
      setLoading(true);
      api.getPostReactionsDetails(postId)
        .then((data: any) => {
          setReactions(data || []);
        })
        .catch((err) => {
          console.error("Failed to load reaction details:", err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, postId]);

  if (!isOpen) return null;

  // Group reactions by type
  const reactionCounts: Record<string, number> = {};
  reactions.forEach((r) => {
    reactionCounts[r.type] = (reactionCounts[r.type] || 0) + 1;
  });

  const uniqueTypes = Object.keys(reactionCounts).sort(
    (a, b) => reactionCounts[b] - reactionCounts[a]
  );

  const filteredReactions = activeTab === "all"
    ? reactions
    : reactions.filter((r) => r.type === activeTab);

  const getEmoji = (type: string) => {
    return REACTIONS.find((r) => r.type === type)?.emoji || "❤️";
  };

  const handleUserClick = (userId: string) => {
    setViewingUserId(userId);
    setActiveTab("profile");
    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/75 z-[250] flex items-center justify-center p-4 text-white select-none backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#111] border border-[#2a2a2a] rounded-2xl w-full max-w-[440px] overflow-hidden shadow-2xl flex flex-col h-[500px]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#222]">
          <div className="w-6" />
          <h3 className="font-bold text-[16px]">Reactions</h3>
          <button
            onClick={onClose}
            className="text-[#a8a8a8] hover:text-white transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto border-b border-[#222] px-3 py-2 custom-scroll shrink-0">
          <button
            onClick={() => setActiveTabLocal("all")}
            className={`px-3 py-1.5 rounded-full text-[13px] font-semibold transition shrink-0 cursor-pointer ${
              activeTab === "all"
                ? "bg-white text-black"
                : "bg-zinc-900 text-zinc-400 hover:text-white"
            }`}
          >
            All {reactions.length}
          </button>
          {uniqueTypes.map((type) => {
            const emoji = getEmoji(type);
            const count = reactionCounts[type];
            return (
              <button
                key={type}
                onClick={() => setActiveTabLocal(type)}
                className={`px-3 py-1.5 rounded-full text-[13px] font-semibold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  activeTab === type
                    ? "bg-white text-black"
                    : "bg-zinc-900 text-zinc-400 hover:text-white"
                }`}
              >
                <span>{emoji}</span>
                <span>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Users List */}
        <div className="p-4 flex-1 overflow-y-auto custom-scroll flex flex-col gap-4">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-zinc-500 text-[14px]">
              Loading reactions...
            </div>
          ) : filteredReactions.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-zinc-500 text-[14px]">
              No reactions yet.
            </div>
          ) : (
            filteredReactions.map((r) => {
              const u = r.user;
              if (!u) return null;
              const isFollowing = !!followStates[u.id];
              const isSelf = currentUser?.id === u.id;
              const emoji = getEmoji(r.type);

              return (
                <div key={r.id} className="flex items-center gap-3.5">
                  <div className="relative">
                    <img
                      src={u.avatarUrl || "https://i.pravatar.cc/80?img=1"}
                      alt={u.username}
                      onClick={() => handleUserClick(u.id)}
                      className="w-[42px] h-[42px] rounded-full object-cover border border-[#222] cursor-pointer"
                    />
                    <div className="absolute -bottom-1 -right-1 bg-zinc-950 border border-zinc-800 rounded-full w-[18px] h-[18px] flex items-center justify-center text-[11px] leading-none shadow-md">
                      {emoji}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div
                      onClick={() => handleUserClick(u.id)}
                      className="text-[13.5px] font-semibold hover:underline cursor-pointer truncate"
                    >
                      {u.username}
                    </div>
                    <div className="text-[11.5px] text-[#a8a8a8] truncate">
                      {u.fullName || u.username}
                    </div>
                  </div>

                  {!isSelf && (
                    <button
                      onClick={() => toggleFollow(u.id)}
                      className={`text-[12px] font-bold px-3.5 py-1.5 rounded-lg border transition cursor-pointer ${
                        isFollowing
                          ? "border-[#2a2a2a] text-white hover:bg-[#1a1a1a]"
                          : "bg-[#3897f0] hover:bg-[#3897f0]/95 border-transparent text-white"
                      }`}
                    >
                      {isFollowing ? "Following" : "Follow"}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
