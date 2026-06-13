"use client";

import React, { useMemo } from "react";
import { useApp } from "../AppContext";
import { Heart, MessageCircle, Film, Layers } from "lucide-react";

import { VideoThumbnailCard } from "../search/Search";

export default function Explore() {
  const { posts, setActivePostId } = useApp();

  const explorePosts = useMemo(() => {
    if (posts.length === 0) return [];

    // Ensure we have at least 24 items for a full premium grid
    const count = Math.max(posts.length, 24);
    return Array.from({ length: count }, (_, i) => {
      const post = posts[i % posts.length];
      if (!post) return null;

      // Define grid properties for Instagram-style dense layout
      const isTall = i % 10 === 2 || i % 10 === 5;
      
      const seed = 100 + i * 27;
      const height = isTall ? 600 : 300;
      const fallbackImg = `https://picsum.photos/seed/${seed}/400/${height}`;
      
      const likesCount = post.likes ?? (Math.floor(Math.random() * 800) + 50);
      const commentsCount = post.comments?.length ?? (Math.floor(Math.random() * 80) + 5);

      return {
        ...post,
        uniqueId: `${post.id}-explore-${i}`,
        img: post.isTextOnly ? "" : (post.img || fallbackImg),
        isTall,
        likesCount,
        commentsCount,
      };
    }).filter(Boolean);
  }, [posts]);

  return (
    <div className="flex-1 overflow-y-auto h-full w-full custom-scroll text-white select-none bg-black">
      <div className="max-w-[935px] mx-auto px-4 py-6 sm:py-8">
        <h2 className="text-[20px] font-bold mb-6 tracking-wide text-gray-100 hidden sm:block">Explore</h2>
        
        {/* Explore Grid */}
        <div className="grid grid-cols-3 grid-flow-dense gap-1 md:gap-2 auto-rows-[110px] sm:auto-rows-[160px] md:auto-rows-[220px]">
          {explorePosts.map((item, i) => {
            if (!item) return null;

            const hasMultipleImages = item.imgs && item.imgs.length > 1;
            const isVideo = item.isReel || item.mediaType === "video";

            return (
              <div
                key={item.uniqueId}
                onClick={() => setActivePostId(item.id)}
                className={`relative overflow-hidden cursor-pointer group select-none rounded-sm sm:rounded-md border border-[#111] ${
                  item.isTall ? "row-span-2" : ""
                }`}
              >
                {/* Visual Content */}
                {item.isTextOnly ? (
                  <div
                    style={{ background: item.bgGradient || "linear-gradient(45deg, #12c2e9, #c471ed, #f64f59)" }}
                    className="w-full h-full flex items-center justify-center p-3 text-center font-bold text-[10px] sm:text-xs md:text-sm break-words text-white select-none"
                  >
                    <span className="line-clamp-4 px-1">{item.caption}</span>
                  </div>
                ) : isVideo ? (
                  <div className="w-full h-full relative bg-zinc-900">
                    <VideoThumbnailCard videoUrl={item.img || item.imgs?.[0] || ""} thumbnailUrl={item.thumbnailUrls?.[0]} />
                    {/* Play symbol/Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                  </div>
                ) : (
                  <img
                    src={
                      typeof item.img === "string" && item.img.includes("cloudinary.com")
                        ? item.img.replace("/image/upload/", `/image/upload/c_fill,w_${item.isTall ? "600,h_800" : "400,h_400"}/`)
                        : item.img
                    }
                    alt="Explore item"
                    className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                )}

                {/* Media Indicator Overlay (Top Right) */}
                {!item.isTextOnly && (
                  <div className="absolute top-2 right-2 z-10 text-white drop-shadow-md opacity-90">
                    {isVideo ? (
                      <Film size={16} className="fill-white/10" />
                    ) : hasMultipleImages ? (
                      <Layers size={16} className="rotate-90" />
                    ) : null}
                  </div>
                )}

                {/* Hover stats overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition duration-200 flex items-center justify-center gap-4 sm:gap-6 text-xs sm:text-sm md:text-base font-bold text-white z-20">
                  <span className="flex items-center gap-1.5 hover:scale-110 transition">
                    <Heart size={18} className="fill-white" />
                    {item.likesCount >= 1000 ? (item.likesCount / 1000).toFixed(1) + "K" : item.likesCount}
                  </span>
                  <span className="flex items-center gap-1.5 hover:scale-110 transition">
                    <MessageCircle size={18} className="fill-white" />
                    {item.commentsCount}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
