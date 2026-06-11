"use client";

import React, { useState, useMemo } from "react";
import { useApp, MockPost, MockUser } from "../AppContext";
import { Film, Grid, Bookmark, UserSquare, Heart, MessageCircle } from "lucide-react";

export default function Profile() {
  const {
    posts,
    users,
    currentUser,
    viewingUserId,
    setViewingUserId,
    followStates,
    toggleFollow,
    savedPosts,
    setActiveTab,
    setStoryViewerIndex,
    setActivePostId,
    setFollowersModal,
    setShowEditProfileModal,
    setChats,
    showToast,
  } = useApp();

  const [activeTabName, setActiveTabName] = useState<"posts" | "reels" | "saved" | "tagged">("posts");

  // Determine which user profile to display
  const profileUser = useMemo(() => {
    if (viewingUserId === null) {
      // Return current logged in user details
      return {
        id: 0,
        name: currentUser?.name || "alex_dev",
        full: currentUser?.full || "Alex Developer",
        img: currentUser?.img || "https://i.pravatar.cc/150?img=1",
        followers: 1200,
        following: 400,
        bio: currentUser?.bio || "📸 Capturing life, one frame at a time\n🌍 Based in SF · Travels everywhere",
        verified: false,
        web: currentUser?.web || "alexdev.io",
      };
    }
    // Return selected user details
    const found = users.find((u) => u.id === viewingUserId);
    return found ? { ...found, web: "myport.io" } : null;
  }, [viewingUserId, users, currentUser]);

  const isSelf = viewingUserId === null;
  const isFollowing = profileUser ? !!followStates[profileUser.id] : false;

  // Filter posts based on active tab
  const tabPosts = useMemo(() => {
    if (!profileUser) return [];

    if (activeTabName === "saved") {
      return posts.filter((p) => savedPosts.has(p.id));
    }
    if (activeTabName === "tagged") {
      return posts.slice(12, 18); // slice some dummy tagged posts
    }
    if (activeTabName === "reels") {
      return posts.filter((_, i) => i % 3 === 0); // dummy reels posts
    }
    // Default: posts
    if (isSelf) {
      // Show self mock posts
      return posts.filter((p) => p.user.id === 0);
    } else {
      // Show this user's posts
      return posts.filter((p) => p.user.id === profileUser.id);
    }
  }, [activeTabName, posts, profileUser, savedPosts, isSelf]);

  if (!profileUser) {
    return <div className="text-center p-12 text-white">User not found</div>;
  }

  // Pre-defined highlights data
  const highlights = [
    { name: "Travel", img: "https://picsum.photos/seed/h1/64/64" },
    { name: "Food", img: "https://picsum.photos/seed/h2/64/64" },
    { name: "Work", img: "https://picsum.photos/seed/h3/64/64" },
    { name: "Friends", img: "https://picsum.photos/seed/h4/64/64" },
    { name: "Sunsets", img: "https://picsum.photos/seed/h5/64/64" },
    { name: "Pets", img: "https://picsum.photos/seed/h6/64/64" },
  ];

  const handleMessageUser = () => {
    // Navigate to messages, check if conversation already exists, otherwise add it
    setChats((prevChats) => {
      const exists = prevChats.some((c) => c.user.id === profileUser.id);
      if (exists) return prevChats;

      // Add a new session at the top
      const newSession = {
        id: Date.now(),
        user: profileUser as unknown as MockUser,
        preview: "Start a conversation",
        time: "now",
        unread: 0,
        online: Math.random() > 0.5,
      };
      return [newSession, ...prevChats];
    });

    setActiveTab("messages");
  };

  const handleOpenFollowers = (type: "followers" | "following") => {
    setFollowersModal({
      open: true,
      type,
      userId: profileUser.id,
    });
  };

  return (
    <div className="flex-1 overflow-y-auto h-full w-full custom-scroll text-white select-none">
      <div className="max-w-[900px] mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="flex gap-10 items-start mb-8">
          <div className="relative shrink-0 select-none">
            <img
              src={profileUser.img}
              className={`w-[90px] h-[90px] md:w-[140px] md:h-[140px] rounded-full object-cover border-2 border-[#222] cursor-pointer ${
                isSelf ? "p-[3px] bg-[linear-gradient(45deg,#f09433,#e6683c,#dc2743,#bc1888)]" : ""
              }`}
              onClick={() => setStoryViewerIndex(0)}
              alt="Profile"
            />
            {isSelf && (
              <div
                onClick={() => {}}
                className="absolute bottom-1 right-1 bg-insta-blue border border-black hover:bg-insta-blue/90 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs cursor-pointer active:scale-95 transition"
              >
                ✏️
              </div>
            )}
          </div>

          <div className="flex-1 flex flex-col min-w-0">
            {/* Username Row */}
            <div className="flex items-center gap-3.5 flex-wrap mb-4 select-none">
              <h2 className="text-[22px] font-light truncate">{profileUser.name}</h2>
              {profileUser.verified && (
                <span className="text-insta-blue text-lg" title="Verified">
                  ✓
                </span>
              )}

              {isSelf ? (
                <>
                  <button
                    onClick={() => setShowEditProfileModal(true)}
                    className="px-4.5 py-1.5 border border-[#222] rounded-lg text-[13px] font-bold hover:bg-[#1a1a1a] transition cursor-pointer"
                  >
                    Edit profile
                  </button>
                  <button
                    onClick={() => {}}
                    className="px-4.5 py-1.5 border border-[#222] rounded-lg text-[13px] font-bold hover:bg-[#1a1a1a] transition cursor-pointer"
                  >
                    View archive
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => toggleFollow(profileUser.id)}
                    className={`px-4.5 py-1.5 rounded-lg text-[13px] font-bold cursor-pointer transition ${
                      isFollowing
                        ? "border border-[#222] hover:bg-[#111]"
                        : "bg-insta-blue hover:bg-insta-blue/90 text-white"
                    }`}
                  >
                    {isFollowing ? "Following" : "Follow"}
                  </button>
                  <button
                    onClick={handleMessageUser}
                    className="px-4.5 py-1.5 border border-[#222] rounded-lg text-[13px] font-bold hover:bg-[#1a1a1a] transition cursor-pointer"
                  >
                    Message
                  </button>
                  <button
                    onClick={() => {}}
                    className="px-3 py-1.5 border border-[#222] rounded-lg text-[13px] font-bold hover:bg-[#1a1a1a]"
                  >
                    ···
                  </button>
                </>
              )}
            </div>

            {/* Stats Row */}
            <div className="flex gap-7 mb-4 select-none text-[14px]">
              <div>
                <span className="font-bold mr-1">{isSelf ? posts.filter((p) => p.user.id === 0).length : 12}</span>
                <span className="text-[#a8a8a8]">posts</span>
              </div>
              <div onClick={() => handleOpenFollowers("followers")} className="cursor-pointer hover:opacity-80">
                <span className="font-bold mr-1">
                  {profileUser.followers >= 1000 ? (profileUser.followers / 1000).toFixed(1) + "k" : profileUser.followers}
                </span>
                <span className="text-[#a8a8a8]">followers</span>
              </div>
              <div onClick={() => handleOpenFollowers("following")} className="cursor-pointer hover:opacity-80">
                <span className="font-bold mr-1">{profileUser.following}</span>
                <span className="text-[#a8a8a8]">following</span>
              </div>
            </div>

            {/* Bio Row */}
            <div className="text-[14px] leading-relaxed select-text">
              <span className="font-bold block mb-0.5">{profileUser.full}</span>
              <p className="whitespace-pre-line text-gray-200">{profileUser.bio}</p>
              {profileUser.web && (
                <a
                  href={`https://${profileUser.web}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-insta-blue hover:underline font-semibold block mt-1 select-all"
                >
                  {profileUser.web}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Highlights List */}
        <div className="flex gap-4 overflow-x-auto no-scrollbar py-4 border-t border-[#222]/80">
          {highlights.map((h, idx) => (
            <div
              key={`highlight-${idx}`}
              onClick={() => setStoryViewerIndex(0)}
              className="flex flex-col items-center gap-1.5 cursor-pointer shrink-0"
            >
              <div className="w-[64px] h-[64px] rounded-full border-2 border-[#222] overflow-hidden p-[2px] hover:border-gray-500 transition">
                <img src={h.img} alt={h.name} className="w-full h-full rounded-full object-cover" />
              </div>
              <span className="text-[11px] text-[#a8a8a8] text-center max-w-[64px] truncate">
                {h.name}
              </span>
            </div>
          ))}
          {isSelf && (
            <div
              onClick={() => {}}
              className="flex flex-col items-center gap-1.5 cursor-pointer shrink-0"
            >
              <div className="w-[64px] h-[64px] rounded-full border-2 border-dashed border-[#222] flex items-center justify-center text-[28px] hover:border-gray-500 text-gray-400 hover:text-white transition">
                ➕
              </div>
              <span className="text-[11px] text-[#a8a8a8] text-center max-w-[64px] truncate">
                New
              </span>
            </div>
          )}
        </div>

        {/* Profile Tabs */}
        <div className="flex border-t border-[#222] select-none text-[12px] uppercase font-bold tracking-widest mt-4">
          <button
            onClick={() => setActiveTabName("posts")}
            className={`flex-1 py-4 text-center cursor-pointer transition flex items-center justify-center gap-1.5 border-t-2 ${
              activeTabName === "posts" ? "border-white text-white" : "border-transparent text-[#666] hover:text-white"
            }`}
          >
            <Grid size={14} /> Posts
          </button>
          
          <button
            onClick={() => setActiveTabName("reels")}
            className={`flex-1 py-4 text-center cursor-pointer transition flex items-center justify-center gap-1.5 border-t-2 ${
              activeTabName === "reels" ? "border-white text-white" : "border-transparent text-[#666] hover:text-white"
            }`}
          >
            <Film size={14} /> Reels
          </button>

          {isSelf && (
            <button
              onClick={() => setActiveTabName("saved")}
              className={`flex-1 py-4 text-center cursor-pointer transition flex items-center justify-center gap-1.5 border-t-2 ${
                activeTabName === "saved" ? "border-white text-white" : "border-transparent text-[#666] hover:text-white"
              }`}
            >
              <Bookmark size={14} /> Saved
            </button>
          )}

          <button
            onClick={() => setActiveTabName("tagged")}
            className={`flex-1 py-4 text-center cursor-pointer transition flex items-center justify-center gap-1.5 border-t-2 ${
              activeTabName === "tagged" ? "border-white text-white" : "border-transparent text-[#666] hover:text-white"
            }`}
          >
            <UserSquare size={14} /> Tagged
          </button>
        </div>

        {/* Profile Grid */}
        {tabPosts.length === 0 ? (
          <div className="text-center py-12 text-[#a8a8a8] text-[14px]">
            {activeTabName === "saved" ? "Save posts to see them here" : "No content yet"}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1 md:gap-2 mt-4">
            {tabPosts.map((post, i) => (
              <div
                key={`grid-post-${post.id}-${i}`}
                onClick={() => setActivePostId(post.id)}
                className="relative aspect-square overflow-hidden cursor-pointer group"
              >
                <img
                  src={post.img}
                  alt="Profile content"
                  className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                
                {/* Film Reels indicator */}
                {activeTabName === "reels" && (
                  <span className="absolute top-2 right-2 text-lg drop-shadow-md">🎬</span>
                )}

                {/* Overlays */}
                <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition duration-250 flex items-center justify-center gap-6 text-[14px] font-bold">
                  <span className="flex items-center gap-1.5">
                    <Heart size={18} fill="currentColor" />
                    {post.likes}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MessageCircle size={18} fill="currentColor" />
                    {post.comments.length}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
