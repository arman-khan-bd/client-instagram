"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useApp, MockPost, MockUser } from "../AppContext";
import { Film, Grid, Bookmark, UserSquare, Heart, MessageCircle, Plus } from "lucide-react";
import { api } from "../../lib/api";

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
    setShowStoryCreate,
    storyGroups,
    setChats,
    showToast,
    setActiveChatId,
    createConversation,
  } = useApp();

  const [activeTabName, setActiveTabName] = useState<"posts" | "reels" | "saved" | "tagged">("posts");
  const [dbProfile, setDbProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const isSelf = viewingUserId === null || 
    (currentUser && (
      viewingUserId === currentUser.id || 
      viewingUserId === currentUser.name || 
      viewingUserId.toString().toLowerCase() === currentUser.name.toLowerCase()
    ));

  // Determine which user profile reference to resolve first
  const profileUser = useMemo(() => {
    if (isSelf) {
      return {
        id: currentUser?.id || "0",
        name: currentUser?.name || "me",
        full: currentUser?.full || "Me",
        img: currentUser?.img || "https://i.pravatar.cc/150?img=1",
        followers: 1240,
        following: 382,
        bio: currentUser?.bio || "Welcome to AuraGram! ✨",
        verified: false,
        web: currentUser?.web || "",
      };
    }

    if (dbProfile && (
      dbProfile.id === viewingUserId ||
      dbProfile.username === viewingUserId ||
      dbProfile.id.toString() === viewingUserId?.toString() ||
      dbProfile.username.toLowerCase() === viewingUserId?.toString().toLowerCase()
    )) {
      return {
        id: dbProfile.id,
        name: dbProfile.username,
        full: dbProfile.fullName || dbProfile.username,
        img: dbProfile.avatarUrl || "https://i.pravatar.cc/80?img=1",
        followers: dbProfile._count?.followers || 0,
        following: dbProfile._count?.following || 0,
        bio: dbProfile.bio || "",
        verified: dbProfile.isVerified || false,
        web: "",
      };
    }
    
    // Look in posts first to find real user info
    const postUser = posts.find(p => p.user.id === viewingUserId || p.user.name === viewingUserId)?.user;
    if (postUser) {
      return {
        id: postUser.id,
        name: postUser.name,
        full: postUser.full,
        img: postUser.img,
        followers: 4320,
        following: 512,
        bio: postUser.bio || "Capturing life's best moments! 📸",
        verified: postUser.verified || false,
        web: "",
      };
    }

    const found = users.find((u) => u.id === viewingUserId || u.name === viewingUserId);
    if (found) {
      return { ...found, id: found.id.toString(), web: "myport.io" };
    }

    // Fallback: If it's a string username, return a placeholder so we can query the DB.
    if (viewingUserId) {
      return {
        id: viewingUserId.toString(),
        name: viewingUserId.toString(),
        full: viewingUserId.toString(),
        img: "https://i.pravatar.cc/80?img=1",
        followers: 0,
        following: 0,
        bio: "",
        verified: false,
        web: "",
      };
    }

    return null;
  }, [viewingUserId, users, currentUser, posts, isSelf, dbProfile]);

  // Fetch real profile details from Supabase
  useEffect(() => {
    if (!profileUser?.name) {
      setDbProfile(null);
      return;
    }
    setDbProfile(null);
    setLoading(true);
    setNotFound(false);
    api.getProfile(profileUser.name)
      .then((data) => {
        setDbProfile(data);
      })
      .catch((err) => {
        console.error("Failed to load profile from database:", err);
        // If it's not a mock user or in feed, it's not found
        const isMockOrInFeed = users.some(u => u.name === profileUser.name) || posts.some(p => p.user.name === profileUser.name);
        if (!isMockOrInFeed) {
          setNotFound(true);
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [profileUser?.name, viewingUserId, users, posts]);

  // Handle follow / follow back
  const handleFollowToggle = async () => {
    if (!profileUser) return;
    try {
      const result = await api.toggleFollow(profileUser.id.toString());
      setDbProfile((prev: any) => {
        if (!prev) return prev;
        const isNowFollowing = result.following;
        return {
          ...prev,
          isFollowing: isNowFollowing,
          _count: {
            ...prev._count,
            followers: prev._count.followers + (isNowFollowing ? 1 : -1),
          }
        };
      });
      toggleFollow(profileUser.id);
    } catch (err: any) {
      showToast(err.message || "Failed to follow user", "info");
    }
  };

  // Filter posts based on active tab
  const tabPosts = useMemo(() => {
    if (!profileUser) return [];

    if (activeTabName === "saved") {
      return posts.filter((p) => savedPosts.has(p.id));
    }
    if (activeTabName === "tagged") {
      return posts.filter(
        (p) =>
          p.caption &&
          p.caption.toLowerCase().includes(`@${profileUser.name.toLowerCase()}`)
      );
    }
    if (activeTabName === "reels") {
      return posts.filter(
        (p) =>
          p.isReel &&
          (p.user.id === profileUser.id ||
            p.user.id.toString() === profileUser.id.toString() ||
            p.user.name === profileUser.name)
      );
    }

    // Default posts
    return posts.filter(
      (p) =>
        p.user.id === profileUser.id ||
        p.user.id.toString() === profileUser.id.toString() ||
        p.user.name === profileUser.name
    );
  }, [activeTabName, posts, profileUser, savedPosts]);

  // Map dbProfile posts or tabPosts fallback
  const profilePostsList = useMemo(() => {
    if (profileUser && dbProfile?.posts && (activeTabName === "posts" || activeTabName === "reels" || activeTabName === "tagged")) {
      const allMapped = dbProfile.posts.map((p: any) => {
        const mediaList: string[] = Array.isArray(p.mediaUrls) && p.mediaUrls.length > 0
          ? p.mediaUrls.map((m: any) => (typeof m === "string" ? m : m?.url)).filter(Boolean)
          : [];

        // Detect color/text posts by thumbnailUrl being a CSS gradient — this is the canonical signal
        // regardless of mediaUrls, since no real image/video has a gradient thumbnailUrl
        const isGradient =
          typeof p.thumbnailUrl === "string" &&
          (p.thumbnailUrl.startsWith("linear-gradient") || p.thumbnailUrl.startsWith("radial-gradient"));
        const isTextOnly = isGradient;

        const isVideo = !isTextOnly && mediaList.some(
          (m) =>
            typeof m === "string" &&
            (m.endsWith(".mp4") ||
              m.endsWith(".mov") ||
              m.endsWith(".webm") ||
              m.includes("/video/upload/"))
        );

        return {
          id: p.id,
          img: isTextOnly ? "" : (p.thumbnailUrl || p.mobileUrl || "https://picsum.photos/400/400"),
          isTextOnly,
          bgGradient: isTextOnly ? p.thumbnailUrl : undefined,
          caption: p.caption || "",
          likes: p._count?.likes ?? 0,
          comments: { length: p._count?.comments ?? 0 },
          isReel: isVideo,
        };
      });

      if (activeTabName === "reels") {
        return allMapped.filter((p: any) => p.isReel);
      }
      if (activeTabName === "tagged") {
        return allMapped.filter((p: any) =>
          p.caption &&
          p.caption.toLowerCase().includes(`@${profileUser.name.toLowerCase()}`)
        );
      }
      return allMapped;
    }
    return tabPosts;
  }, [dbProfile, tabPosts, activeTabName, profileUser]);

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto h-full w-full custom-scroll text-white select-none bg-black">
        <div className="max-w-[900px] mx-auto px-4 py-8 animate-pulse">
          {/* Profile Header Skeleton */}
          <div className="flex gap-10 items-start mb-8">
            <div className="w-[90px] h-[90px] md:w-[140px] md:h-[140px] rounded-full bg-zinc-800 shrink-0" />
            <div className="flex-1 flex flex-col gap-4">
              <div className="h-7 w-48 bg-zinc-800 rounded-lg" />
              <div className="flex gap-6">
                <div className="h-5 w-16 bg-zinc-800 rounded-md" />
                <div className="h-5 w-20 bg-zinc-800 rounded-md" />
                <div className="h-5 w-20 bg-zinc-800 rounded-md" />
              </div>
              <div className="flex flex-col gap-2 mt-2">
                <div className="h-4 w-32 bg-zinc-800 rounded-md" />
                <div className="h-4 w-64 bg-zinc-800 rounded-md" />
                <div className="h-4 w-40 bg-zinc-800 rounded-md" />
              </div>
            </div>
          </div>

          <div className="border-t border-[#222] my-6" />

          {/* Grid Skeleton */}
          <div className="grid grid-cols-3 gap-1 md:gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={`skeleton-grid-${i}`} className="aspect-square bg-zinc-900 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !profileUser) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-white p-12 select-none h-full w-full">
        <h2 className="text-xl font-bold mb-2">Sorry, this page isn't available.</h2>
        <p className="text-gray-400 text-sm text-center max-w-[400px]">
          The link you followed may be broken, or the page may have been removed. Go back to AuraGram.
        </p>
      </div>
    );
  }

  const userStoryGroup = storyGroups.find(g => g.userId.toString() === profileUser.id.toString());
  const activeStories = userStoryGroup?.stories || [];

  const handleMessageUser = async () => {
    try {
      const conv = await createConversation({
        isGroup: false,
        participantIds: [profileUser.id.toString()],
      });
      setActiveChatId(conv.id);
      setActiveTab("messages");
    } catch (err) {
      console.error("Failed to start conversation:", err);
      setActiveTab("messages");
    }
  };

  const handleOpenFollowers = (type: "followers" | "following") => {
    setFollowersModal({
      open: true,
      type,
      userId: profileUser.id,
    });
  };

  const handleAvatarClick = () => {
    // If has story, view it
    const storyIdx = storyGroups.findIndex(g => g.userId === profileUser.id);
    if (storyIdx !== -1) {
      setStoryViewerIndex(storyIdx);
    } else if (isSelf) {
      setShowStoryCreate(true);
    }
  };

  // Find if user has active story
  const hasStory = storyGroups.some(g => g.userId === profileUser.id);

  return (
    <div className="flex-1 overflow-y-auto h-full w-full custom-scroll text-white select-none">
      <div className="max-w-[900px] mx-auto px-4 py-8">
        
        {/* Profile Header */}
        <div className="flex gap-10 items-start mb-8">
          <div className="relative shrink-0 select-none">
            <div
              onClick={handleAvatarClick}
              className={`w-[90px] h-[90px] md:w-[140px] md:h-[140px] rounded-full p-[3px] cursor-pointer overflow-hidden flex items-center justify-center ${
                hasStory
                  ? "bg-[linear-gradient(45deg,#f09433,#e6683c,#dc2743,#bc1888)]"
                  : "bg-zinc-800"
              }`}
            >
              <img
                src={dbProfile?.avatarUrl || profileUser.img}
                className="w-full h-full rounded-full object-cover border-2 border-black"
                alt="Profile"
              />
            </div>
            {isSelf && (
              <div
                onClick={() => setShowStoryCreate(true)}
                className="absolute bottom-1 right-1 bg-insta-blue border border-black hover:bg-insta-blue/90 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs cursor-pointer active:scale-95 transition"
                title="Create Day / Story"
              >
                <Plus size={14} />
              </div>
            )}
          </div>

          <div className="flex-1 flex flex-col min-w-0">
            {/* Username Row */}
            <div className="flex items-center gap-3.5 flex-wrap mb-4 select-none">
              <h2 className="text-[22px] font-light truncate">{dbProfile?.username || profileUser.name}</h2>
              {(dbProfile?.isVerified || profileUser.verified) && (
                <span className="verified-badge" title="Verified" />
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
                    onClick={() => setShowStoryCreate(true)}
                    className="px-4.5 py-1.5 border border-[#222] rounded-lg text-[13px] font-bold hover:bg-[#1a1a1a] transition cursor-pointer"
                  >
                    Add Day
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleFollowToggle}
                    className={`px-4.5 py-1.5 rounded-lg text-[13px] font-bold cursor-pointer transition ${
                      dbProfile?.isFollowing
                        ? "border border-[#222] hover:bg-[#111] text-white"
                        : "bg-insta-blue hover:bg-insta-blue/90 text-white"
                    }`}
                  >
                    {dbProfile?.isFollowing ? "Following" : dbProfile?.followsMe ? "Follow Back" : "Follow"}
                  </button>
                  <button
                    onClick={handleMessageUser}
                    className="px-4.5 py-1.5 border border-[#222] rounded-lg text-[13px] font-bold hover:bg-[#1a1a1a] transition cursor-pointer"
                  >
                    Message
                  </button>
                </>
              )}
            </div>

            {/* Stats Row */}
            <div className="flex gap-7 mb-4 select-none text-[14px]">
              <div>
                <span className="font-bold mr-1">
                  {dbProfile?._count?.posts ?? tabPosts.length}
                </span>
                <span className="text-[#a8a8a8]">posts</span>
              </div>
              <div onClick={() => handleOpenFollowers("followers")} className="cursor-pointer hover:opacity-80">
                <span className="font-bold mr-1">
                  {dbProfile?._count?.followers ?? profileUser.followers}
                </span>
                <span className="text-[#a8a8a8]">followers</span>
              </div>
              <div onClick={() => handleOpenFollowers("following")} className="cursor-pointer hover:opacity-80">
                <span className="font-bold mr-1">
                  {dbProfile?._count?.following ?? profileUser.following}
                </span>
                <span className="text-[#a8a8a8]">following</span>
              </div>
            </div>

            {/* Bio Row */}
            <div className="text-[14px] leading-relaxed select-text">
              <span className="font-bold block mb-0.5">{dbProfile?.fullName || profileUser.full}</span>
              <p className="whitespace-pre-line text-gray-200">{dbProfile?.bio || profileUser.bio}</p>
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

        {/* Highlights / Day List */}
        {activeStories.length > 0 && (
          <div className="flex gap-4 overflow-x-auto no-scrollbar py-4 border-t border-[#222]/80">
            {activeStories.map((story, idx) => (
              <div
                key={`profile-story-${story.id}`}
                onClick={() => {
                  const storyGroupIdx = storyGroups.findIndex(g => g.userId.toString() === profileUser.id.toString());
                  if (storyGroupIdx !== -1) {
                    setStoryViewerIndex(storyGroupIdx);
                  }
                }}
                className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <div className="w-[64px] h-[64px] rounded-full border-2 border-insta-blue overflow-hidden p-[2px] hover:border-white transition bg-zinc-800">
                  {story.mediaType === "video" ? (
                    <video src={story.mediaUrl} className="w-full h-full rounded-full object-cover" muted />
                  ) : (
                    <img src={story.mediaUrl} alt="Day" className="w-full h-full rounded-full object-cover" />
                  )}
                </div>
                <span className="text-[11px] text-[#a8a8a8] text-center max-w-[64px] truncate">
                  {story.caption || `Day ${idx + 1}`}
                </span>
              </div>
            ))}
            {isSelf && (
              <div
                onClick={() => setShowStoryCreate(true)}
                className="flex flex-col items-center gap-1.5 cursor-pointer shrink-0"
              >
                <div className="w-[64px] h-[64px] rounded-full border-2 border-dashed border-[#222] flex items-center justify-center text-[28px] hover:border-gray-500 text-gray-400 hover:text-white transition">
                  ➕
                </div>
                <span className="text-[11px] text-[#a8a8a8] text-center max-w-[64px] truncate">
                  Add Day
                </span>
              </div>
            )}
          </div>
        )}

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
        {profilePostsList.length === 0 ? (
          <div className="text-center py-12 text-[#a8a8a8] text-[14px]">
            {activeTabName === "saved" ? "Save posts to see them here" : "No content yet"}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1 md:gap-2 mt-4">
            {profilePostsList.map((post: any, i: number) => (
              <div
                key={`grid-post-${post.id}-${i}`}
                onClick={() => setActivePostId(post.id)}
                className="relative aspect-square overflow-hidden cursor-pointer group animate-fade-in rounded-lg"
              >
                {post.isTextOnly || post.bgGradient ? (
                  <div
                    style={{ background: post.bgGradient || "linear-gradient(135deg,#667eea,#764ba2)" }}
                    className="w-full h-full flex items-center justify-center p-4 text-center font-semibold text-xs md:text-sm break-words select-none text-white"
                  >
                    <span className="line-clamp-4">{post.caption}</span>
                  </div>
                ) : (
                  <img
                    src={post.img}
                    alt="Profile content"
                    className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                    loading="lazy"
                    onError={(e) => {
                      const t = e.currentTarget;
                      t.style.display = "none";
                      const parent = t.parentElement;
                      if (parent) {
                        parent.style.background = "linear-gradient(135deg,#1a1a2e,#16213e)";
                      }
                    }}
                  />
                )}
                
                {(activeTabName === "reels" || post.isReel) && (
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
