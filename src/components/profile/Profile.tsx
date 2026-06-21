"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useApp, MockPost, MockUser } from "../AppContext";
import { Film, Grid, Bookmark, UserSquare, Heart, MessageCircle, Plus, GraduationCap, Briefcase, MapPin, Globe, Home, Star, List, X } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { api } from "../../lib/api";
import { VideoThumbnailCard } from "../search/Search";
import PostCard from "../feed/PostCard";

const profileCache: Record<string, { data: any; timestamp: number }> = {};
const PROFILE_CACHE_TTL = 30 * 1000; // 30 seconds cache

const mapDbPostToMockPost = (p: any): MockPost => {
  const rawOriginalPost = Array.isArray(p.originalPost) ? p.originalPost[0] : p.originalPost;
  const isShared = !!(p.originalPostId && rawOriginalPost && rawOriginalPost.id);
  const targetPost = isShared ? rawOriginalPost : p;

  const rawMediaUrls: any[] = Array.isArray(targetPost.mediaUrls) && targetPost.mediaUrls.length > 0 ? targetPost.mediaUrls : [];
  const mediaList: string[] = rawMediaUrls.map((m: any) => (typeof m === "string" ? m : m?.url)).filter(Boolean);
  const thumbnailUrls: string[] = rawMediaUrls.map((m: any) =>
    typeof m === "string" ? "" : (m?.thumbnailUrl || "")
  ).filter(Boolean);

  const isGradient =
    typeof targetPost.thumbnailUrl === "string" &&
    (targetPost.thumbnailUrl.startsWith("linear-gradient") || targetPost.thumbnailUrl.startsWith("radial-gradient"));
  const isTextOnly = isGradient;

  const isVideo = !isTextOnly && mediaList.some(
    (m) =>
      typeof m === "string" &&
      (m.endsWith(".mp4") ||
        m.endsWith(".mov") ||
        m.endsWith(".webm") ||
        m.includes("/video/upload/"))
  );

  const isVideoUrl = (url: string) =>
    url.endsWith(".mp4") || url.endsWith(".mov") || url.endsWith(".webm") || url.includes("/video/upload/");

  const bgGradient = isTextOnly ? targetPost.thumbnailUrl : undefined;
  let img = "";
  if (isTextOnly) {
    img = "";
  } else if (isVideo) {
    img = mediaList.find(isVideoUrl) || mediaList[0] || "";
  } else {
    img = targetPost.thumbnailUrl || mediaList[0] || "";
  }

  return {
    id: p.id,
    user: {
      id: p.user?.id || 0,
      name: p.user?.username || "unknown",
      full: p.user?.fullName || p.user?.username || "User",
      img: p.user?.avatarUrl || "https://i.pravatar.cc/80?img=1",
      followers: 0,
      following: 0,
      bio: "",
      verified: p.user?.isVerified || false,
    },
    img,
    videoUrl: isVideo ? img : undefined,
    videoThumbnailUrl: isVideo ? (thumbnailUrls[0] || undefined) : undefined,
    imgs: isTextOnly ? [] : mediaList,
    thumbnailUrls: isTextOnly ? [] : thumbnailUrls,
    caption: p.caption || "",
    likes: p._count?.likes ?? 0,
    comments: [],
    commentsCount: p._count?.comments ?? 0,
    time: p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "recently",
    hasStory: false,
    location: p.location || "",
    bgGradient,
    isTextOnly,
    isReel: isVideo,
    mediaType: isTextOnly ? "text" : (isVideo ? "video" : "image"),
    isAdult: p.isAdult || false,
    isAdultUnmarked: p.isAdultUnmarked || false,
    originalPostId: p.originalPostId,
    originalPost: isShared ? (() => {
      const origIsTextOnly = typeof rawOriginalPost.thumbnailUrl === "string" && (rawOriginalPost.thumbnailUrl.startsWith("linear-gradient") || rawOriginalPost.thumbnailUrl.startsWith("radial-gradient"));
      const origIsVideo = rawOriginalPost.mediaUrls?.some((m: any) => (typeof m === 'string' ? m : m.url)?.match(/\.(mp4|mov|webm)/i)) || false;
      return {
        id: rawOriginalPost.id,
        user: {
          id: rawOriginalPost.user?.id || 0,
          name: rawOriginalPost.user?.username || "user",
          full: rawOriginalPost.user?.fullName || "User",
          img: rawOriginalPost.user?.avatarUrl || "https://i.pravatar.cc/80?img=1",
          followers: 0,
          following: 0,
          bio: "",
          verified: rawOriginalPost.user?.isVerified || false,
        },
        img: rawOriginalPost.thumbnailUrl || rawOriginalPost.mediaUrls?.[0]?.url || "",
        videoUrl: origIsVideo ? (rawOriginalPost.thumbnailUrl || rawOriginalPost.mediaUrls?.[0]?.url || "") : undefined,
        videoThumbnailUrl: origIsVideo ? (rawOriginalPost.mediaUrls?.[0]?.thumbnailUrl || undefined) : undefined,
        imgs: rawOriginalPost.mediaUrls?.map((m: any) => typeof m === "string" ? m : m.url) || [],
        caption: rawOriginalPost.caption || "",
        likes: rawOriginalPost._count?.likes ?? 0,
        comments: [],
        time: rawOriginalPost.createdAt ? new Date(rawOriginalPost.createdAt).toLocaleDateString() : "recently",
        hasStory: false,
        location: rawOriginalPost.location || "",
        isTextOnly: origIsTextOnly,
        bgGradient: origIsTextOnly ? rawOriginalPost.thumbnailUrl : undefined,
        isReel: origIsVideo,
        mediaType: origIsTextOnly ? "text" : (origIsVideo ? "video" : "image"),
      };
    })() : undefined,
  };
};

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
    setShowCreatePostModal,
    storyGroups,
    setChats,
    showToast,
    setActiveChatId,
    createConversation,
  } = useApp();

  const [activeTabName, setActiveTabName] = useState<"posts" | "reels" | "saved" | "tagged" | "feed">("feed");
  const [dbProfile, setDbProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "feed" >(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("profile_view_mode");
      if (saved === "grid" || saved === "feed") return saved;
    }
    return "grid";
  });

  const handleSetViewMode = (mode: "grid" | "feed") => {
    setViewMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("profile_view_mode", mode);
    }
  };

  const isSelf = viewingUserId === null || 
    (currentUser && (
      viewingUserId === currentUser.id || 
      viewingUserId === currentUser.name || 
      viewingUserId.toString().toLowerCase() === currentUser.name.toLowerCase()
    ));

  const [showPhotosDialog, setShowPhotosDialog] = useState(false);
  const [photosDialogPage, setPhotosDialogPage] = useState(1);
  const PHOTOS_PER_PAGE = 12;

  const [verificationRequest, setVerificationRequest] = useState<any>(null);
  const [verificationLoading, setVerificationLoading] = useState(false);

  useEffect(() => {
    if (isSelf && currentUser?.id) {
      api.getVerificationRequest(currentUser.id)
        .then((req) => setVerificationRequest(req))
        .catch((err) => console.error("Error fetching verification request:", err));
    }
  }, [isSelf, currentUser?.id]);

  const handleRequestVerification = async () => {
    if (!currentUser?.id) return;
    const reason = prompt("Why should this profile be verified? (e.g. public figure, creator, business)");
    if (!reason || !reason.trim()) return;

    setVerificationLoading(true);
    try {
      const res = await api.createVerificationRequest(currentUser.id, reason.trim());
      setVerificationRequest(res);
      showToast("Verification request submitted successfully!", "success");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to submit verification request", "info");
    } finally {
      setVerificationLoading(false);
    }
  };

  // Determine which user profile reference to resolve first
  const profileUser = useMemo(() => {
    if (isSelf) {
      return {
        id: currentUser?.id || "0",
        name: currentUser?.name || "me",
        full: currentUser?.full || "Me",
        img: currentUser?.img || "https://i.pravatar.cc/150?img=1",
        followers: 0,
        following: 0,
        bio: currentUser?.bio || "",
        verified: false,
        web: currentUser?.web || "",
        coverPhoto: currentUser?.coverPhoto || "",
        education: currentUser?.education || "",
        work: currentUser?.work || "",
        city: currentUser?.city || "",
        country: currentUser?.country || "",
        hometown: currentUser?.hometown || "",
        phone: currentUser?.phone || "",
        hobbies: currentUser?.hobbies || "",
        interests: currentUser?.interests || "",
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
        web: dbProfile.website || "",
        coverPhoto: dbProfile.coverPhoto || "",
        education: dbProfile.education || "",
        work: dbProfile.work || "",
        city: dbProfile.city || "",
        country: dbProfile.country || "",
        hometown: dbProfile.hometown || "",
        phone: dbProfile.phone || "",
        hobbies: dbProfile.hobbies || "",
        interests: dbProfile.interests || "",
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
        followers: 0,
        following: 0,
        bio: postUser.bio || "",
        verified: postUser.verified || false,
        web: "",
        coverPhoto: "",
        education: "",
        work: "",
        city: "",
        country: "",
        hometown: "",
        phone: "",
        hobbies: "",
        interests: "",
      };
    }

    const found = users.find((u) => u.id === viewingUserId || u.name === viewingUserId);
    if (found) {
      return { ...found, id: found.id.toString(), web: "myport.io", coverPhoto: "", education: "", work: "", city: "", country: "", hometown: "", phone: "", hobbies: "", interests: "" };
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
        coverPhoto: "",
        education: "",
        work: "",
        city: "",
        country: "",
        hometown: "",
        phone: "",
        hobbies: "",
        interests: "",
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

    let active = true;

    // Check cache
    const cached = profileCache[profileUser.name];
    const now = Date.now();
    if (cached && (now - cached.timestamp < PROFILE_CACHE_TTL)) {
      setDbProfile(cached.data);
      setLoading(false);
      return;
    }
    
    // Background loading: do not set loading=true so page doesn't show loading spinner/skeleton
    // unless we don't even have basic user details.
    if (!dbProfile || dbProfile.username !== profileUser.name) {
      setDbProfile(null);
      setLoading(true);
    }
    
    setNotFound(false);
    api.getProfile(profileUser.name)
      .then((data) => {
        if (!active) return;
        profileCache[profileUser.name] = { data, timestamp: Date.now() };
        setDbProfile(data);
      })
      .catch((err) => {
        if (!active) return;
        console.error("Failed to load profile from database:", err);
        const isMockOrInFeed = users.some(u => u.name === profileUser.name) || posts.some(p => p.user.name === profileUser.name);
        if (!isMockOrInFeed) {
          setNotFound(true);
        }
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [profileUser?.name]);

  // Listen for profile-updated events dispatched by saveProfileChanges
  // to bust the cache and re-render the profile immediately.
  useEffect(() => {
    const handleProfileUpdated = (e: Event) => {
      const evt = e as CustomEvent<{ username: string }>;
      const updatedUsername = evt.detail?.username;
      // Clear cache for this username (new username) AND old username
      if (updatedUsername) {
        delete profileCache[updatedUsername];
      }
      if (profileUser?.name) {
        delete profileCache[profileUser.name];
      }
      // Force a re-fetch by resetting dbProfile
      setDbProfile(null);
    };

    window.addEventListener("profile-updated", handleProfileUpdated);
    return () => window.removeEventListener("profile-updated", handleProfileUpdated);
  }, [profileUser?.name]);

  // Handle follow / follow back
  const handleFollowToggle = async () => {
    if (!profileUser) return;
    try {
      const result = await api.toggleFollow(profileUser.id.toString());
      setDbProfile((prev: any) => {
        if (!prev) return prev;
        const isNowFollowing = result.following;
        const isNowRequested = result.requested;
        
        let followerChange = 0;
        if (isNowFollowing && !prev.isFollowing) {
          followerChange = 1;
        } else if (!isNowFollowing && prev.isFollowing) {
          followerChange = -1;
        }

        return {
          ...prev,
          isFollowing: isNowFollowing,
          isRequested: isNowRequested,
          _count: {
            ...prev._count,
            followers: prev._count.followers + followerChange,
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
    if (activeTabName === "feed") {
      return posts.filter(
        (p) =>
          p.user.id === profileUser.id ||
          p.user.id.toString() === profileUser.id.toString() ||
          p.user.name === profileUser.name
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
    if (profileUser && dbProfile?.posts && (activeTabName === "posts" || activeTabName === "reels" || activeTabName === "tagged" || activeTabName === "feed")) {
      const allMapped = dbProfile.posts.map(mapDbPostToMockPost);

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

  const uploadedPhotos = useMemo(() => {
    return profilePostsList.filter((p: any) => !p.isTextOnly && p.img);
  }, [profilePostsList]);

  const totalPages = Math.ceil(uploadedPhotos.length / PHOTOS_PER_PAGE);
  const currentPhotos = useMemo(() => {
    const start = (photosDialogPage - 1) * PHOTOS_PER_PAGE;
    return uploadedPhotos.slice(start, start + PHOTOS_PER_PAGE);
  }, [uploadedPhotos, photosDialogPage]);

  if (loading || !dbProfile) {
    return (
      <div className="flex-1 overflow-y-auto h-full w-full custom-scroll text-[var(--text)] select-none bg-[var(--bg)]">
        <div className="max-w-[900px] mx-auto px-4 py-8 animate-pulse">
          {/* Profile Header Skeleton */}
          <div className="flex gap-10 items-start mb-8">
            <div className="w-[90px] h-[90px] md:w-[140px] md:h-[140px] rounded-full bg-[var(--surface2)] shrink-0" />
            <div className="flex-1 flex flex-col gap-4">
              <div className="h-7 w-48 bg-[var(--surface2)] rounded-lg" />
              <div className="flex gap-6">
                <div className="h-5 w-16 bg-[var(--surface2)] rounded-md" />
                <div className="h-5 w-20 bg-[var(--surface2)] rounded-md" />
                <div className="h-5 w-20 bg-[var(--surface2)] rounded-md" />
              </div>
              <div className="flex flex-col gap-2 mt-2">
                <div className="h-4 w-32 bg-[var(--surface2)] rounded-md" />
                <div className="h-4 w-64 bg-[var(--surface2)] rounded-md" />
                <div className="h-4 w-40 bg-[var(--surface2)] rounded-md" />
              </div>
            </div>
          </div>

          <div className="border-t border-[var(--border)] my-6" />

          {/* Grid Skeleton */}
          <div className="grid grid-cols-3 gap-1 md:gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={`skeleton-grid-${i}`} className="aspect-square bg-[var(--surface2)] rounded-lg" />
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
    const isPrivate = dbProfile?.private_profile === true;
    const isFollowing = dbProfile?.isFollowing === true;
    if (isPrivate && !isSelf && !isFollowing) {
      showToast("This account is private. Follow to see their followers/following.", "info");
      return;
    }
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
    <div className="flex-1 overflow-y-auto h-full w-full custom-scroll text-[var(--text)] select-none">
      <div className="max-w-[900px] mx-auto">

        {/* ── Cover Photo ── */}
        <div className="relative h-[180px] md:h-[240px] bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] overflow-hidden">
          {profileUser.coverPhoto ? (
            <img
              src={profileUser.coverPhoto}
              alt="Cover"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full" style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)" }} />
          )}
          {/* Gradient overlay at bottom */}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent" />
        </div>

        <div className="px-4 pb-8">
          {/* ── Profile Header ── */}
          <div className="flex gap-5 items-end mb-5 -mt-10 relative z-10">
            {/* Avatar */}
            <div className="relative shrink-0 select-none">
              <div
                onClick={handleAvatarClick}
                className={`w-[90px] h-[90px] md:w-[120px] md:h-[120px] rounded-full p-[3px] cursor-pointer overflow-hidden flex items-center justify-center ${
                  hasStory
                    ? "bg-[linear-gradient(45deg,#f09433,#e6683c,#dc2743,#bc1888)]"
                    : "bg-[var(--surface2)]"
                } ring-4 ring-[var(--bg)]`}
              >
                <img
                  src={dbProfile?.avatarUrl || profileUser.img}
                  className="w-full h-full rounded-full object-cover border-2 border-[var(--bg)]"
                  alt="Profile"
                />
              </div>
              {isSelf && (
                <div
                  onClick={() => setShowStoryCreate(true)}
                  className="absolute bottom-1 right-1 bg-insta-blue border border-[var(--bg)] hover:bg-insta-blue/90 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs cursor-pointer active:scale-95 transition"
                  title="Create Day / Story"
                >
                  <Plus size={14} />
                </div>
              )}
            </div>

            {/* Name + Actions (desktop) */}
            <div className="flex-1 flex flex-col min-w-0 pb-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-[22px] font-light truncate drop-shadow-sm">{dbProfile?.username || profileUser.name}</h2>
                {(dbProfile?.isVerified || profileUser.verified) && (
                  <span className="verified-badge" title="Verified" />
                )}
              </div>
              <p className="text-[13px] text-[var(--text2)] truncate">{dbProfile?.fullName || profileUser.full}</p>
            </div>
          </div>

          {/* ── Actions Row ── */}
          <div className="flex items-center gap-2.5 flex-wrap mb-5">
            {isSelf ? (
              <>
                <button
                  onClick={() => setShowEditProfileModal(true)}
                  className="px-4 py-2 border border-[var(--border)] rounded-lg text-[13px] font-bold hover:bg-[var(--surface2)] transition cursor-pointer"
                >
                  Edit profile
                </button>
                <button
                  onClick={() => setShowStoryCreate(true)}
                  className="px-4 py-2 border border-[var(--border)] rounded-lg text-[13px] font-bold hover:bg-[var(--surface2)] transition cursor-pointer"
                >
                  Add Day
                </button>
                {!(dbProfile?.isVerified || currentUser?.isVerified) && (
                  <button
                    onClick={handleRequestVerification}
                    disabled={verificationLoading || (verificationRequest && verificationRequest.status === "pending")}
                    className={`px-4 py-2 rounded-lg text-[13px] font-bold transition cursor-pointer border ${
                      verificationRequest?.status === "pending"
                        ? "border-[var(--border)] text-zinc-500 bg-transparent cursor-not-allowed"
                        : "border-[#3897f0] bg-[#3897f0] text-white hover:bg-[#3897f0]/80"
                    }`}
                  >
                    {verificationLoading
                      ? "Submitting..."
                      : verificationRequest?.status === "pending"
                      ? "Verification Pending"
                      : verificationRequest?.status === "rejected"
                      ? "Re-request Verification"
                      : "Request Verification"}
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  onClick={handleFollowToggle}
                  className={`px-4.5 py-2 rounded-lg text-[13px] font-bold cursor-pointer transition ${
                    dbProfile?.isFollowing
                      ? "border border-[var(--border)] hover:bg-[var(--surface2)] text-[var(--text)]"
                      : dbProfile?.isRequested
                        ? "bg-zinc-700 hover:bg-zinc-600 text-white"
                        : "bg-insta-blue hover:bg-insta-blue/90 text-white"
                  }`}
                >
                  {dbProfile?.isFollowing ? "Following" : dbProfile?.isRequested ? "Requested" : dbProfile?.followsMe ? "Follow Back" : "Follow"}
                </button>
                <button
                  onClick={handleMessageUser}
                  className="px-4.5 py-2 border border-[var(--border)] rounded-lg text-[13px] font-bold hover:bg-[var(--surface2)] transition cursor-pointer"
                >
                  Message
                </button>
              </>
            )}
          </div>

          {/* ── Stats Row ── */}
          <div className="flex gap-7 mb-5 text-[14px]">
            <div>
              <span className="font-bold mr-1">{dbProfile?._count?.posts ?? tabPosts.length}</span>
              <span className="text-[var(--text2)]">posts</span>
            </div>
            <div onClick={() => handleOpenFollowers("followers")} className="cursor-pointer hover:opacity-80">
              <span className="font-bold mr-1">{dbProfile?._count?.followers ?? profileUser.followers}</span>
              <span className="text-[var(--text2)]">followers</span>
            </div>
            <div onClick={() => handleOpenFollowers("following")} className="cursor-pointer hover:opacity-80">
              <span className="font-bold mr-1">{dbProfile?._count?.following ?? profileUser.following}</span>
              <span className="text-[var(--text2)]">following</span>
            </div>
          </div>

          {/* ── Bio ── */}
          {(dbProfile?.bio || profileUser.bio) && (
            <div className="text-[14px] leading-relaxed select-text mb-4">
              <p className="whitespace-pre-line text-[var(--text)]">{dbProfile?.bio || profileUser.bio}</p>
            </div>
          )}

          {/* ── Website ── */}
          {profileUser.web && (
            <div className="mb-4">
              <a
                href={profileUser.web.startsWith("http") ? profileUser.web : `https://${profileUser.web}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-insta-blue hover:underline font-semibold text-[14px] select-all"
              >
                {profileUser.web}
              </a>
            </div>
          )}

          {/* ── About / Info Card ── */}
          {(
            profileUser.education ||
            profileUser.work ||
            profileUser.city ||
            profileUser.country ||
            profileUser.hometown ||
            profileUser.hobbies ||
            profileUser.interests
          ) && (
            <div className="mb-6 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 space-y-2.5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text3)] mb-3">About</p>

              {profileUser.work && (
                <div className="flex items-center gap-3 text-[13px]">
                  <Briefcase size={15} className="text-[var(--text3)] shrink-0" />
                  <span className="text-[var(--text)]">{profileUser.work}</span>
                </div>
              )}

              {profileUser.education && (
                <div className="flex items-center gap-3 text-[13px]">
                  <GraduationCap size={15} className="text-[var(--text3)] shrink-0" />
                  <span className="text-[var(--text)]">{profileUser.education}</span>
                </div>
              )}

              {(profileUser.city || profileUser.country) && (
                <div className="flex items-center gap-3 text-[13px]">
                  <MapPin size={15} className="text-[var(--text3)] shrink-0" />
                  <span className="text-[var(--text)]">
                    {[profileUser.city, profileUser.country].filter(Boolean).join(", ")}
                  </span>
                </div>
              )}

              {profileUser.hometown && (
                <div className="flex items-center gap-3 text-[13px]">
                  <Home size={15} className="text-[var(--text3)] shrink-0" />
                  <span className="text-[var(--text)]">From {profileUser.hometown}</span>
                </div>
              )}

              {profileUser.web && (
                <div className="flex items-center gap-3 text-[13px]">
                  <Globe size={15} className="text-[var(--text3)] shrink-0" />
                  <a
                    href={profileUser.web.startsWith("http") ? profileUser.web : `https://${profileUser.web}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-insta-blue hover:underline truncate"
                  >
                    {profileUser.web.replace(/^https?:\/\//, "")}
                  </a>
                </div>
              )}

              {(profileUser.hobbies || profileUser.interests) && (
                <div className="pt-2 border-t border-[var(--border)] mt-2">
                  {profileUser.hobbies && (
                    <div className="flex items-start gap-3 text-[13px] mt-2">
                      <Star size={15} className="text-[var(--text3)] shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[var(--text2)] text-[11px] uppercase tracking-wider block mb-1">Hobbies</span>
                        <span className="text-[var(--text)]">{profileUser.hobbies}</span>
                      </div>
                    </div>
                  )}
                  {profileUser.interests && (
                    <div className="flex items-start gap-3 text-[13px] mt-2">
                      <Heart size={15} className="text-[var(--text3)] shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[var(--text2)] text-[11px] uppercase tracking-wider block mb-1">Interests</span>
                        <span className="text-[var(--text)]">{profileUser.interests}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Highlights / Day List */}
          {activeStories.length > 0 && (
          <div className="flex gap-4 overflow-x-auto no-scrollbar py-4 border-t border-[var(--border)]">
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
                <div className="w-[64px] h-[64px] rounded-full border-2 border-insta-blue overflow-hidden p-[2px] hover:border-[var(--text)] transition bg-[var(--surface2)]">
                  {story.mediaType === "video" ? (
                    <video src={story.mediaUrl} className="w-full h-full rounded-full object-cover" muted />
                  ) : (
                    <img src={story.mediaUrl} alt="Day" className="w-full h-full rounded-full object-cover" />
                  )}
                </div>
                <span className="text-[11px] text-[var(--text2)] text-center max-w-[64px] truncate">
                  {story.caption || `Day ${idx + 1}`}
                </span>
              </div>
            ))}
            {isSelf && (
              <div
                onClick={() => setShowStoryCreate(true)}
                className="flex flex-col items-center gap-1.5 cursor-pointer shrink-0"
              >
                <div className="w-[64px] h-[64px] rounded-full border-2 border-dashed border-[var(--border)] flex items-center justify-center text-[28px] hover:border-[var(--text2)] text-[var(--text3)] hover:text-[var(--text)] transition bg-[var(--surface2)]">
                  ➕
                </div>
                <span className="text-[11px] text-[var(--text2)] text-center max-w-[64px] truncate">
                  Add Day
                </span>
              </div>
            )}
          </div>
          )}

          {/* Profile Tabs */}
          {dbProfile?.private_profile && !isSelf && !dbProfile?.isFollowing ? (
            <div className="flex flex-col items-center justify-center py-20 text-center select-none border-t border-[var(--border)] mt-6 animate-fade-in text-[var(--text)] w-full">
              <div className="w-20 h-20 rounded-full border-2 border-[var(--text2)] flex items-center justify-center mb-6">
                <span className="text-3xl">🔒</span>
              </div>
              <h2 className="text-lg font-bold mb-2">This Account is Private</h2>
              <p className="text-sm text-[var(--text2)] max-w-xs px-4">
                Follow this account to see their photos and videos.
              </p>
            </div>
          ) : (
            <>
              <div className="flex border-t border-[var(--border)] select-none text-[12px] uppercase font-bold tracking-widest mt-4">
          <button
            onClick={() => setActiveTabName("feed")}
            className={`flex-1 py-4 text-center cursor-pointer transition flex items-center justify-center gap-1.5 border-t-2 ${
              activeTabName === "feed" ? "border-[var(--text)] text-[var(--text)]" : "border-transparent text-[var(--text3)] hover:text-[var(--text)]"
            }`}
          >
            <List size={14} /> Feed
          </button>

          <button
            onClick={() => setActiveTabName("posts")}
            className={`flex-1 py-4 text-center cursor-pointer transition flex items-center justify-center gap-1.5 border-t-2 ${
              activeTabName === "posts" ? "border-[var(--text)] text-[var(--text)]" : "border-transparent text-[var(--text3)] hover:text-[var(--text)]"
            }`}
          >
            <Grid size={14} /> Posts
          </button>
          
          <button
            onClick={() => setActiveTabName("reels")}
            className={`flex-1 py-4 text-center cursor-pointer transition flex items-center justify-center gap-1.5 border-t-2 ${
              activeTabName === "reels" ? "border-[var(--text)] text-[var(--text)]" : "border-transparent text-[var(--text3)] hover:text-[var(--text)]"
            }`}
          >
            <Film size={14} /> Reels
          </button>

          {isSelf && (
            <button
              onClick={() => setActiveTabName("saved")}
              className={`flex-1 py-4 text-center cursor-pointer transition flex items-center justify-center gap-1.5 border-t-2 ${
                activeTabName === "saved" ? "border-[var(--text)] text-[var(--text)]" : "border-transparent text-[var(--text3)] hover:text-[var(--text)]"
              }`}
            >
              <Bookmark size={14} /> Saved
            </button>
          )}

          <button
            onClick={() => setActiveTabName("tagged")}
            className={`flex-1 py-4 text-center cursor-pointer transition flex items-center justify-center gap-1.5 border-t-2 ${
              activeTabName === "tagged" ? "border-[var(--text)] text-[var(--text)]" : "border-transparent text-[var(--text3)] hover:text-[var(--text)]"
            }`}
          >
            <UserSquare size={14} /> Tagged
          </button>
          </div>

          {/* View Mode Switcher */}
          {activeTabName !== "feed" && (
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2 mt-4 px-1 select-none">
              <span className="text-[13px] font-bold text-[var(--text2)] uppercase tracking-wider">
                {activeTabName === "posts" ? "Posts" : activeTabName}
              </span>
              <div className="flex items-center gap-1 bg-[var(--surface)] p-1 rounded-xl border border-[var(--border)]">
                <button
                  onClick={() => handleSetViewMode("grid")}
                  className={`p-1.5 rounded-lg transition duration-200 cursor-pointer ${
                    viewMode === "grid"
                      ? "bg-[var(--surface2)] text-[var(--text)] shadow-sm"
                      : "text-[var(--text3)] hover:text-[var(--text)]"
                  }`}
                  title="Grid View"
                >
                  <Grid size={16} />
                </button>
                <button
                  onClick={() => handleSetViewMode("feed")}
                  className={`p-1.5 rounded-lg transition duration-200 cursor-pointer ${
                    viewMode === "feed"
                      ? "bg-[var(--surface2)] text-[var(--text)] shadow-sm"
                      : "text-[var(--text3)] hover:text-[var(--text)]"
                  }`}
                  title="Feed View (Facebook Style)"
                >
                  <List size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Profile Content (Grid vs Feed) */}
          {viewMode === "feed" || activeTabName === "feed" ? (
            <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6 mt-4 items-start">
              {/* Left Column: Intro (Facebook-style About Sidebar) */}
              <div className="space-y-4 md:sticky md:top-4">
                {/* Intro Card */}
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 shadow-sm space-y-3">
                  <h3 className="text-base font-bold text-[var(--text)]">Intro</h3>
                  
                  {/* Bio */}
                  {(dbProfile?.bio || profileUser.bio) && (
                    <p className="text-[13px] text-[var(--text2)] whitespace-pre-line text-center bg-[var(--surface2)]/40 p-3 rounded-xl border border-[var(--border)]/50">
                      {dbProfile?.bio || profileUser.bio}
                    </p>
                  )}
                  
                  <div className="space-y-2.5 pt-2">
                    {profileUser.work ? (
                      <div className="flex items-center gap-3 text-[13px]">
                        <Briefcase size={16} className="text-[var(--text3)] shrink-0" />
                        <span className="text-[var(--text)]">
                          Works at <span className="font-semibold">{profileUser.work}</span>
                        </span>
                      </div>
                    ) : (
                      isSelf && (
                        <button onClick={() => setShowEditProfileModal(true)} className="w-full text-center py-1.5 text-xs font-semibold text-insta-blue hover:bg-[var(--surface2)] rounded-lg transition border border-dashed border-[var(--border)] cursor-pointer">
                          + Add Work
                        </button>
                      )
                    )}

                    {profileUser.education ? (
                      <div className="flex items-center gap-3 text-[13px]">
                        <GraduationCap size={16} className="text-[var(--text3)] shrink-0" />
                        <span className="text-[var(--text)]">
                          Studied at <span className="font-semibold">{profileUser.education}</span>
                        </span>
                      </div>
                    ) : (
                      isSelf && (
                        <button onClick={() => setShowEditProfileModal(true)} className="w-full text-center py-1.5 text-xs font-semibold text-insta-blue hover:bg-[var(--surface2)] rounded-lg transition border border-dashed border-[var(--border)] cursor-pointer">
                          + Add Education
                        </button>
                      )
                    )}

                    {profileUser.city || profileUser.country ? (
                      <div className="flex items-center gap-3 text-[13px]">
                        <MapPin size={16} className="text-[var(--text3)] shrink-0" />
                        <span className="text-[var(--text)]">
                          Lives in <span className="font-semibold">{[profileUser.city, profileUser.country].filter(Boolean).join(", ")}</span>
                        </span>
                      </div>
                    ) : (
                      isSelf && (
                        <button onClick={() => setShowEditProfileModal(true)} className="w-full text-center py-1.5 text-xs font-semibold text-insta-blue hover:bg-[var(--surface2)] rounded-lg transition border border-dashed border-[var(--border)] cursor-pointer">
                          + Add Location
                        </button>
                      )
                    )}

                    {profileUser.hometown && (
                      <div className="flex items-center gap-3 text-[13px]">
                        <Home size={16} className="text-[var(--text3)] shrink-0" />
                        <span className="text-[var(--text)]">
                          From <span className="font-semibold">{profileUser.hometown}</span>
                        </span>
                      </div>
                    )}

                    {profileUser.web && (
                      <div className="flex items-center gap-3 text-[13px]">
                        <Globe size={16} className="text-[var(--text3)] shrink-0" />
                        <a
                          href={profileUser.web.startsWith("http") ? profileUser.web : `https://${profileUser.web}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-insta-blue hover:underline font-semibold truncate max-w-[200px]"
                        >
                          {profileUser.web.replace(/^https?:\/\//, "")}
                        </a>
                      </div>
                    )}
                  </div>

                  {isSelf && (
                    <button
                      onClick={() => setShowEditProfileModal(true)}
                      className="w-full mt-3 py-2 bg-[var(--surface2)] hover:bg-[var(--surface2)]/80 text-[13px] font-bold rounded-xl transition cursor-pointer text-center text-[var(--text)] border border-[var(--border)]"
                    >
                      Edit Details
                    </button>
                  )}
                </div>

                {/* Photos Preview Card */}
                {uploadedPhotos.length > 0 && (
                  <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 shadow-sm space-y-3">
                    <div className="flex justify-between items-center">
                      <h3 className="text-base font-bold text-[var(--text)]">Photos</h3>
                      <button
                        onClick={() => {
                          setPhotosDialogPage(1);
                          setShowPhotosDialog(true);
                        }}
                        className="text-[12px] text-insta-blue hover:underline font-semibold cursor-pointer"
                      >
                        See All
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 rounded-xl overflow-hidden">
                      {uploadedPhotos.slice(0, 9).map((post: any, i: number) => (
                        <div
                          key={`sidebar-photo-${post.id}-${i}`}
                          onClick={() => setActivePostId(post.id)}
                          className="aspect-square bg-[var(--surface2)] cursor-pointer hover:opacity-90 transition relative overflow-hidden"
                        >
                          <img src={post.img} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Create Post Box & The Feed */}
              <div className="space-y-4">
                {/* Create Post Card (Facebook-style) */}
                {isSelf && (
                  <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 shadow-sm space-y-3">
                    <div className="flex gap-3 items-center pb-3 border-b border-[var(--border)]">
                      <img
                        src={dbProfile?.avatarUrl || profileUser.img}
                        className="w-10 h-10 rounded-full object-cover shrink-0"
                        alt="My avatar"
                      />
                      <button
                        onClick={() => setShowCreatePostModal(true)}
                        className="flex-1 bg-[var(--surface2)] hover:bg-[var(--surface2)]/85 text-[14px] text-[var(--text2)] text-left px-4 py-2.5 rounded-full transition duration-150 cursor-pointer"
                      >
                        What's on your mind, {profileUser.full.split(" ")[0]}?
                      </button>
                    </div>
                    <div className="flex justify-around text-[13px] font-semibold text-[var(--text2)] pt-1">
                      <button
                        onClick={() => setShowCreatePostModal(true)}
                        className="flex items-center gap-2 hover:bg-[var(--surface2)] px-4 py-2 rounded-xl transition cursor-pointer"
                      >
                        <span className="text-emerald-500 text-lg">📷</span> Photo/Video
                      </button>
                      <button
                        onClick={() => setShowCreatePostModal(true)}
                        className="flex items-center gap-2 hover:bg-[var(--surface2)] px-4 py-2 rounded-xl transition cursor-pointer"
                      >
                        <span className="text-yellow-500 text-lg">😊</span> Feeling/activity
                      </button>
                    </div>
                  </div>
                )}

                {/* Feed list of posts */}
                {profilePostsList.length === 0 ? (
                  <div className="text-center py-12 text-[var(--text2)] text-[14px] bg-[var(--surface)] border border-[var(--border)] rounded-2xl">
                    {activeTabName === "saved" ? "Save posts to see them here" : "No content yet"}
                  </div>
                ) : (
                  profilePostsList.map((post: any) => {
                    return (
                      <PostCard key={`feed-post-${post.id}`} post={post} />
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            /* Grid View (Standard Instagram style) */
            profilePostsList.length === 0 ? (
              <div className="text-center py-12 text-[var(--text2)] text-[14px]">
                {activeTabName === "saved" ? "Save posts to see them here" : "No content yet"}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1 md:gap-2 mt-4">
                {profilePostsList.map((post: any, i: number) => (
                  <div
                    key={`grid-post-${post.id}-${i}`}
                    onClick={() => setActivePostId(post.id)}
                    className="relative aspect-square overflow-hidden cursor-pointer group animate-fade-in rounded-lg bg-[var(--surface2)]"
                  >
                    {post.isTextOnly || post.bgGradient ? (
                      <div
                        style={{ background: post.bgGradient || "linear-gradient(135deg,#667eea,#764ba2)" }}
                        className="w-full h-full flex items-center justify-center p-4 text-center font-semibold text-xs md:text-sm break-words select-none text-white"
                      >
                        <span className="line-clamp-4">{post.caption}</span>
                      </div>
                    ) : (post.isReel || post.mediaType === "video" || (post.mediaUrls?.[0]?.type === "video") || post.videoUrl) ? (
                      <VideoThumbnailCard
                        videoUrl={post.videoUrl || post.img || post.mediaUrls?.[0]?.url || ""}
                        thumbnailUrl={post.videoThumbnailUrl || undefined}
                      />
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
            )
          )}
          </>
        )}
        </div>
      </div>
      {/* Photos Grid Dialog */}
      <AnimatePresence>
        {showPhotosDialog && (
          <div
            onClick={() => setShowPhotosDialog(false)}
            className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4 select-none animate-fade-in"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-[var(--surface2)] border border-[var(--border)] rounded-2xl w-full max-w-[500px] shadow-2xl overflow-hidden flex flex-col relative text-[var(--text)]"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-[var(--border)] shrink-0">
                <div className="w-5" />
                <h3 className="font-bold text-[15px] tracking-wider uppercase text-[var(--text2)]">All Photos</h3>
                <button
                  onClick={() => setShowPhotosDialog(false)}
                  className="p-1 hover:bg-[var(--surface3)] rounded-full transition text-[var(--text2)] hover:text-[var(--text)] cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Photos Grid */}
              <div className="p-4 flex-1 overflow-y-auto min-h-[300px] max-h-[60vh] custom-scroll">
                {uploadedPhotos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-[var(--text3)] text-xs">
                    No photos found
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {currentPhotos.map((post: any, idx: number) => (
                      <div
                        key={`dialog-photo-${post.id}-${idx}`}
                        onClick={() => {
                          setActivePostId(post.id);
                          setShowPhotosDialog(false);
                        }}
                        className="aspect-square bg-[var(--surface3)] rounded-lg overflow-hidden border border-[var(--border)] cursor-pointer hover:opacity-85 hover:scale-[1.02] transition duration-200"
                      >
                        <img src={post.img} alt="User media" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="p-4 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--text2)] shrink-0">
                  <button
                    disabled={photosDialogPage === 1}
                    onClick={() => setPhotosDialogPage((p) => Math.max(1, p - 1))}
                    className="px-3.5 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface3)] hover:text-[var(--text)] transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer font-bold"
                  >
                    Previous
                  </button>
                  <span className="font-semibold select-none">
                    Page {photosDialogPage} of {totalPages}
                  </span>
                  <button
                    disabled={photosDialogPage === totalPages}
                    onClick={() => setPhotosDialogPage((p) => Math.min(totalPages, p + 1))}
                    className="px-3.5 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface3)] hover:text-[var(--text)] transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer font-bold"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
