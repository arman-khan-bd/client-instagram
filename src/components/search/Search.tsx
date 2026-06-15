"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { useApp } from "../AppContext";
import { Search as SearchIcon, Heart, MessageCircle } from "lucide-react";
import { api } from "../../lib/api";

// Canvas capture fallback for video files without static thumbnails
export function VideoThumbnailCard({ videoUrl, thumbnailUrl }: { videoUrl: string; thumbnailUrl?: string }) {
  const [imgSrc, setImgSrc] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // If a static thumbnail already exists (precompiled), use it
    if (thumbnailUrl) {
      setImgSrc(thumbnailUrl);
      return;
    }

    // Cloudinary video thumbnail transformations helper
    if (videoUrl.includes("cloudinary.com")) {
      const randomOffset = (Math.random() * 5 + 0.5).toFixed(1);
      const transformed = videoUrl.replace("/video/upload/", `/video/upload/c_fill,w_400,h_400,so_${randomOffset}/`) + ".jpg";
      setImgSrc(transformed);
      return;
    }

    // Fallback: HTML5 Video Canvas frame capture logic for local/direct video paths
    const video = document.createElement("video");
    video.src = videoUrl;
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    
    const onSeeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 320;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg");
          setImgSrc(dataUrl);
        }
      } catch (err) {
        console.warn("Failed to generate video thumbnail with canvas:", err);
      } finally {
        video.removeEventListener("seeked", onSeeked);
      }
    };

    const onLoadedMetadata = () => {
      const duration = video.duration || 10;
      const randomTime = 0.2 + Math.random() * Math.min(duration - 0.5, 5);
      video.currentTime = randomTime;
    };

    video.addEventListener("seeked", onSeeked);
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.load();

    return () => {
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
    };
  }, [videoUrl, thumbnailUrl]);

  return (
    <img
      src={imgSrc || "/placeholder-video.jpg"}
      alt="Video thumbnail"
      className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
      loading="lazy"
      onError={(e) => {
        // Fallback placeholder if extraction fails completely
        e.currentTarget.src = "https://picsum.photos/seed/videothumb/400/400";
      }}
    />
  );
}

export default function Search() {
  const { posts, setViewingUserId, setActiveTab, setActivePostId } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [dbUsers, setDbUsers] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const categories = [
    { id: "all", label: "All" },
    { id: "people", label: "People" },
    { id: "tags", label: "Tags" },
    { id: "places", label: "Places" },
  ];

  // Debounced search trigger for Supabase Users table
  useEffect(() => {
    if (!searchQuery.trim()) {
      setDbUsers([]);
      return;
    }

    setSearching(true);
    const delayDebounce = setTimeout(() => {
      api.searchUsers(searchQuery)
        .then((res) => {
          setDbUsers(res);
        })
        .catch((err) => {
          console.error("Failed to query database users:", err);
        })
        .finally(() => {
          setSearching(false);
        });
    }, 280);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const handleCategoryClick = (catId: string) => {
    setActiveCategory(catId);
  };

  const exploreGridPosts = useMemo(() => {
    // Show real database posts in the explore grid
    return posts.slice(0, 15).map((post, i) => {
      return {
        ...post,
        uniqueId: `${post.id}-search-${i}`,
      };
    });
  }, [posts]);

  const handleUserClick = (userId: string | number) => {
    setViewingUserId(userId);
    setActiveTab("profile");
  };

  return (
    <div className="flex-1 overflow-y-auto h-full w-full custom-scroll text-white select-none">
      <div className="max-w-[900px] mx-auto px-4 py-8">
        
        {/* Search Input */}
        <div className="relative mb-5">
          <SearchIcon size={18} className="absolute left-4.5 top-1/2 -translate-y-1/2 text-[#666]" />
          <input
            type="text"
            placeholder="Search username or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#111] border border-[#222] rounded-xl pl-12 pr-4.5 py-3.5 text-[14px] text-white outline-none focus:border-[#3897f0] transition-colors"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar pb-1.5">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.id)}
              className={`px-4.5 py-1.5 rounded-full text-[13px] font-semibold transition cursor-pointer shrink-0 border border-[#222] ${
                activeCategory === cat.id
                  ? "bg-white text-black"
                  : "bg-[#111] text-[#a8a8a8] hover:bg-[#1a1a1a]"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Results / Explore Grid */}
        {searchQuery.trim() !== "" ? (
          <div className="flex flex-col gap-1.5">
            {searching ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={`search-skeleton-${i}`} className="flex items-center gap-3.5 p-3 animate-pulse">
                    <div className="w-11 h-11 rounded-full bg-zinc-800 shrink-0" />
                    <div className="flex-1 flex flex-col gap-2">
                      <div className="h-4 w-24 bg-zinc-800 rounded-md" />
                      <div className="h-3 w-36 bg-zinc-800 rounded-md" />
                    </div>
                  </div>
                ))}
              </div>
            ) : dbUsers.length === 0 ? (
              <div className="text-center py-12 text-[#a8a8a8] text-[14px]">
                No accounts found for "{searchQuery}"
              </div>
            ) : (
              dbUsers.map((u) => (
                <div
                  key={u.id}
                  onClick={() => handleUserClick(u.id)}
                  className="flex items-center gap-3.5 p-3 rounded-xl hover:bg-[#111] cursor-pointer transition select-none animate-fade-in"
                >
                  <img
                    src={u.avatarUrl || "https://i.pravatar.cc/150?img=1"}
                    alt={u.username}
                    className="w-11 h-11 rounded-full object-cover border border-[#222]"
                  />
                  <div>
                    <div className="text-[14px] font-semibold flex items-center gap-1.5">
                      {u.username}
                      {u.isVerified && <span className="verified-badge" title="Verified" />}
                    </div>
                    <div className="text-[12px] text-[#a8a8a8]">
                      {u.fullName}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* Real Database Feed Explore Grid */
          <div className="grid grid-cols-3 gap-1 md:gap-2 auto-rows-fr">
            {exploreGridPosts.map((item) => (
              <div
                key={item.uniqueId}
                onClick={() => setActivePostId(item.id)}
                className="relative aspect-square overflow-hidden cursor-pointer group animate-fade-in"
              >
                {item.mediaType === "video" || item.isReel ? (
                  <div className="w-full h-full relative bg-zinc-900">
                    <VideoThumbnailCard videoUrl={item.img || item.imgs?.[0] || ""} thumbnailUrl={item.thumbnailUrls?.[0]} />
                  </div>
                ) : (
                  <img
                    src={
                      typeof item.img === "string" && item.img.includes("cloudinary.com")
                        ? item.img.replace("/image/upload/", "/image/upload/c_fill,w_400,h_400/")
                        : (item.img || "https://picsum.photos/400/400")
                    }
                    alt="Explore"
                    className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                )}
                {(item.mediaType === "video" || item.isReel) && (
                  <span className="absolute top-2 right-2 text-sm z-10">🎬</span>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition duration-200 flex items-center justify-center gap-6 text-[14px] font-bold">
                  <span className="flex items-center gap-1.5">
                    <Heart size={18} fill="currentColor" />
                    {item.likes}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MessageCircle size={18} fill="currentColor" />
                    {item.comments.length}
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
