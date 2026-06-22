"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { useApp } from "../AppContext";
import { Search as SearchIcon, Heart, MessageCircle, Film, Layers, Camera, Type } from "lucide-react";
import { api } from "../../lib/api";

// Helper: derive a thumbnail URL from any Cloudinary video URL
function getCloudinaryVideoThumbnail(videoUrl: string): string {
  // Pattern 1: /video/upload/ → insert transformation before public_id
  if (videoUrl.includes("/video/upload/")) {
    return videoUrl.replace("/video/upload/", "/video/upload/c_fill,w_400,h_400,so_1.0/") + ".jpg";
  }
  // Pattern 2: other cloudinary URLs that include /upload/ (e.g. raw)
  if (videoUrl.includes("cloudinary.com") && videoUrl.includes("/upload/")) {
    // Replace resource type segment (image/video/raw) with video if possible
    return videoUrl.replace(/\/upload\//, "/video/upload/c_fill,w_400,h_400,so_1.0/") + ".jpg";
  }
  return "";
}

// Canvas capture fallback for video files without static thumbnails
export function VideoThumbnailCard({ videoUrl, thumbnailUrl }: { videoUrl: string; thumbnailUrl?: string }) {
  const [imgSrc, setImgSrc] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoUrl && !thumbnailUrl) {
      return;
    }

    // If a static thumbnail image already exists (precompiled), use it directly
    if (thumbnailUrl && !thumbnailUrl.includes("/video/") && !thumbnailUrl.endsWith(".mp4") && !thumbnailUrl.endsWith(".webm") && !thumbnailUrl.endsWith(".mov")) {
      setImgSrc(thumbnailUrl);
      return;
    }

    // Auto-generate Cloudinary thumbnail from the video URL if it's a Cloudinary video
    if (videoUrl && videoUrl.includes("cloudinary.com")) {
      const thumbUrl = getCloudinaryVideoThumbnail(videoUrl);
      if (thumbUrl) {
        setImgSrc(thumbUrl);
        return;
      }
    }

    // If thumbnailUrl itself is also a Cloudinary video, derive thumbnail from it
    if (thumbnailUrl && thumbnailUrl.includes("cloudinary.com")) {
      const thumbUrl = getCloudinaryVideoThumbnail(thumbnailUrl);
      if (thumbUrl) {
        setImgSrc(thumbUrl);
        return;
      }
    }

    // Fallback: HTML5 Video Canvas frame capture for local/direct video paths
    if (!videoUrl) return;

    const video = document.createElement("video");
    video.src = videoUrl;
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    
    const onSeeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 400;
        canvas.height = video.videoHeight || 400;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
          setImgSrc(dataUrl);
        }
      } catch (err) {
        console.warn("Failed to generate video thumbnail with canvas:", err);
      } finally {
        video.removeEventListener("seeked", onSeeked);
      }
    };

    const onLoadedMetadata = () => {
      const duration = video.duration;
      // Seek to 25% or 1s into the video based on duration to get a good frame
      const targetTime = isFinite(duration) && duration > 0 ? Math.min(1.5, duration * 0.25) : 0.5;
      video.currentTime = targetTime;
    };

    const onError = () => {
      // Silently fail — the img onError will show the placeholder
    };

    video.addEventListener("seeked", onSeeked);
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("error", onError);
    video.load();

    return () => {
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("error", onError);
    };
  }, [videoUrl, thumbnailUrl]);

  return (
    <img
      src={imgSrc || ""}
      alt="Video thumbnail"
      className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
      loading="lazy"
      style={imgSrc ? {} : { background: "linear-gradient(135deg,#1a1a2e,#16213e)" }}
      onError={(e) => {
        // If Cloudinary thumbnail URL 404s, try canvas fallback or show gradient
        const src = e.currentTarget.src;
        if (src && src.includes("cloudinary.com") && src.includes(".jpg") && videoUrl) {
          // Cloudinary thumbnail failed — clear src and let background show
          e.currentTarget.removeAttribute("src");
          e.currentTarget.style.background = "linear-gradient(135deg,#1a1a2e,#16213e)";
        } else {
          e.currentTarget.style.background = "linear-gradient(135deg,#1a1a2e,#16213e)";
          e.currentTarget.removeAttribute("src");
        }
      }}
    />
  );
}

export default function Search() {
  const { posts, setViewingUserId, setActiveTab, setActivePostId } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [dbUsers, setDbUsers] = useState<any[]>([]);
  const [dbImages, setDbImages] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const categories = [
    { id: "all", label: "All" },
    { id: "people", label: "People" },
    { id: "images", label: "AI Images" },
    { id: "tags", label: "Tags" },
    { id: "places", label: "Places" },
  ];

  // Debounced search trigger for Supabase Users and Image Metadata
  useEffect(() => {
    if (!searchQuery.trim()) {
      setDbUsers([]);
      setDbImages([]);
      return;
    }

    setSearching(true);
    const delayDebounce = setTimeout(() => {
      api.searchGlobal(searchQuery)
        .then((res) => {
          setDbUsers(res.users || []);
          setDbImages(res.images || []);
          api.logSearch(searchQuery);
        })
        .catch((err) => {
          console.error("Failed to query database search:", err);
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
    <div className="flex-1 overflow-y-auto h-full w-full custom-scroll text-[var(--text)] select-none">
      <div className="max-w-[900px] mx-auto px-4 py-8">
        
        {/* Search Input */}
        <div className="relative mb-5">
          <SearchIcon size={18} className="absolute left-4.5 top-1/2 -translate-y-1/2 text-[var(--text3)]" />
          <input
            type="text"
            placeholder="Search username, name, or image description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-xl pl-12 pr-4.5 py-3.5 text-[14px] text-[var(--text)] outline-none focus:border-[#3897f0] transition-colors"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar pb-1.5">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.id)}
              className={`px-4.5 py-1.5 rounded-full text-[13px] font-semibold transition cursor-pointer shrink-0 border border-[var(--border)] ${
                activeCategory === cat.id
                  ? "bg-[var(--text)] text-[var(--bg)]"
                  : "bg-[var(--surface2)] text-[var(--text2)] hover:bg-[var(--surface3)]"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Results / Explore Grid */}
        {searchQuery.trim() !== "" ? (
          <div className="flex flex-col gap-6">
            {searching ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={`search-skeleton-${i}`} className="flex items-center gap-3.5 p-3 animate-pulse">
                    <div className="w-11 h-11 rounded-full bg-[var(--surface2)] shrink-0" />
                    <div className="flex-1 flex flex-col gap-2">
                      <div className="h-4 w-24 bg-[var(--surface2)] rounded-md" />
                      <div className="h-3 w-36 bg-[var(--surface2)] rounded-md" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {/* Users Section */}
                {(activeCategory === "all" || activeCategory === "people") && (
                  <div className="flex flex-col gap-1.5">
                    {dbUsers.length > 0 && (
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Accounts</h3>
                    )}
                    {dbUsers.length > 0 ? (
                      dbUsers.map((u) => (
                        <div
                          key={u.id}
                          onClick={() => handleUserClick(u.id)}
                          className="flex items-center gap-3.5 p-3 rounded-xl hover:bg-[var(--surface2)] cursor-pointer transition select-none animate-fade-in"
                        >
                          <img
                            src={u.avatarUrl || "https://i.pravatar.cc/150?img=1"}
                            alt={u.username}
                            className="w-11 h-11 rounded-full object-cover border border-[var(--border)]"
                          />
                          <div>
                            <div className="text-[14px] font-semibold flex items-center gap-1.5">
                              {u.username}
                              {u.isVerified && <span className="verified-badge" title="Verified" />}
                            </div>
                            <div className="text-[12px] text-[var(--text2)]">
                              {u.fullName}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      activeCategory === "people" && (
                        <div className="text-center py-12 text-[var(--text2)] text-[14px]">
                          No accounts found for "{searchQuery}"
                        </div>
                      )
                    )}
                  </div>
                )}

                {/* Analyzed Images Section */}
                {(activeCategory === "all" || activeCategory === "images") && (
                  <div className="flex flex-col gap-1.5">
                    {dbImages.length > 0 && (
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">AI Analyzed Images</h3>
                    )}
                    {dbImages.length > 0 ? (
                      <div className="grid grid-cols-3 gap-1 md:gap-2 auto-rows-fr">
                        {dbImages.map((img) => (
                          <div
                            key={img.id}
                            className="relative aspect-square overflow-hidden cursor-pointer group bg-[var(--surface2)] border border-[var(--border)] rounded-xl"
                          >
                            {img.mediaUrl ? (
                              <img
                                src={img.mediaUrl}
                                alt={img.description}
                                className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-gradient-to-r from-zinc-800 to-zinc-950 text-white font-semibold text-[10px] sm:text-xs">
                                🖼️ No Image Link
                              </div>
                            )}

                            {/* Media Overlay */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition duration-200 p-3 flex flex-col justify-end text-xs text-white">
                              <p className="font-semibold line-clamp-2">"{img.description}"</p>
                              {img.textFound && (
                                <p className="text-[10px] text-green-400 mt-1 truncate">📝 {img.textFound}</p>
                              )}
                              {img.user && (
                                <p className="text-[9px] text-gray-400 mt-1">By @{img.user.username}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      activeCategory === "images" && (
                        <div className="text-center py-12 text-[var(--text2)] text-[14px]">
                          No analyzed images found matching "{searchQuery}"
                        </div>
                      )
                    )}
                  </div>
                )}
              </>
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
                {item.isTextOnly ? (
                  <div
                    style={{ background: item.bgGradient || "linear-gradient(45deg, #12c2e9, #c471ed, #f64f59)" }}
                    className="w-full h-full flex items-center justify-center p-3 text-center font-bold text-[10px] sm:text-xs md:text-sm break-words text-white select-none"
                  >
                    <span className="line-clamp-4 px-1">{item.caption}</span>
                  </div>
                ) : item.mediaType === "video" || item.isReel ? (
                  <div className="w-full h-full relative bg-[var(--surface2)]">
                    <VideoThumbnailCard
                      videoUrl={item.imgs?.[0] || item.img || ""}
                      thumbnailUrl={item.thumbnailUrls?.[0] || undefined}
                    />
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
                {/* Media Indicator Overlay (Top Right) */}
                <div className="absolute top-2 right-2 z-10 text-white drop-shadow-md opacity-90">
                  {item.mediaType === "video" || item.isReel ? (
                    <Film size={16} className="fill-white/10" />
                  ) : item.isTextOnly ? (
                    <Type size={16} />
                  ) : (item.imgs && item.imgs.length > 1) ? (
                    <Layers size={16} className="rotate-90" />
                  ) : (
                    <Camera size={16} />
                  )}
                </div>
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition duration-200 flex items-center justify-center gap-6 text-[14px] font-bold text-white">
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
