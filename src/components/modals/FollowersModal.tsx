"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "../AppContext";
import { X, Loader2 } from "lucide-react";
import { api } from "../../lib/api";

export default function FollowersModal() {
  const { followersModal, setFollowersModal, users, followStates, toggleFollow, setViewingUserId, setActiveTab } = useApp();
  const [modalUsers, setModalUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!followersModal || !followersModal.open || !followersModal.userId) return;

    const userIdStr = followersModal.userId.toString();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userIdStr);

    if (!isUuid) {
      // It's a mock user (number id). Show a subset of mock users
      const mockList = users.filter((u) => u.id !== followersModal.userId).map((u) => ({
        id: u.id,
        name: u.name,
        full: u.full,
        img: u.img,
        verified: u.verified
      }));
      setModalUsers(mockList);
      return;
    }

    setLoading(true);
    const fetchList = followersModal.type === "followers"
      ? api.getFollowersList(userIdStr)
      : api.getFollowingListForUser(userIdStr);

    fetchList
      .then((data) => {
        const mapped = data.map((u: any) => ({
          id: u.id,
          name: u.username,
          full: u.fullName || u.username,
          img: u.avatarUrl || "https://i.pravatar.cc/80?img=1",
          verified: u.isVerified || false
        }));
        setModalUsers(mapped);
      })
      .catch((err) => {
        console.error("Failed to fetch followers/following:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [followersModal?.open, followersModal?.type, followersModal?.userId, users]);

  if (!followersModal || !followersModal.open) return null;

  const handleClose = () => {
    setFollowersModal(null);
  };

  const handleUserClick = (userId: string | number) => {
    setViewingUserId(userId);
    setActiveTab("profile");
    handleClose();
  };

  return (
    <div
      onClick={handleClose}
      className="fixed inset-0 bg-black/75 z-[200] flex items-center justify-center p-4 text-white select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#111] border border-[#2a2a2a] rounded-2xl w-full max-w-[400px] overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#222]">
          <div className="w-6" /> {/* spacer */}
          <h3 className="font-bold text-[15px] capitalize">
            {followersModal.type}
          </h3>
          <button
            onClick={handleClose}
            className="text-[#a8a8a8] hover:text-white transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Users List */}
        <div className={`p-3.5 flex flex-col gap-3 max-h-[60vh] overflow-y-auto custom-scroll ${loading || modalUsers.length === 0 ? "justify-center items-center min-h-[155px]" : ""}`}>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400 gap-2">
              <Loader2 className="animate-spin text-insta-blue" size={24} />
              <span className="text-xs">Loading users...</span>
            </div>
          ) : modalUsers.length === 0 ? (
            <div className="text-center text-[#737373] text-[14px] py-8">
              No users found.
            </div>
          ) : (
            <div className="flex flex-col gap-3 w-full">
              {modalUsers.map((u) => {
                const isFollowing = !!followStates[u.id];
                return (
                  <div key={`follower-item-${u.id}`} className="flex items-center gap-3">
                    <img
                      src={u.img}
                      alt={u.name}
                      onClick={() => handleUserClick(u.id)}
                      className="w-10 h-10 rounded-full object-cover border border-[#222] cursor-pointer"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div
                        onClick={() => handleUserClick(u.id)}
                        className="text-[13px] font-semibold hover:underline cursor-pointer truncate flex items-center gap-1"
                      >
                        {u.name}
                        {u.verified && <span className="text-insta-blue text-[10px]">✓</span>}
                      </div>
                      <div className="text-[11px] text-[#a8a8a8] truncate">{u.full}</div>
                    </div>

                    <button
                      onClick={() => toggleFollow(u.id)}
                      className={`text-[12px] font-bold px-3.5 py-1.5 rounded-lg border transition cursor-pointer ${
                        isFollowing
                          ? "border-[#2a2a2a] text-white hover:bg-[#1a1a1a]"
                          : "bg-insta-blue hover:bg-insta-blue/95 border-transparent text-white"
                      }`}
                    >
                      {isFollowing ? "Following" : "Follow"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
