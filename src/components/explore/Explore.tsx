"use client";

import React, { useMemo } from "react";
import { useApp } from "../AppContext";
import { Heart, MessageCircle } from "lucide-react";

export default function Explore() {
  const { posts, setActivePostId } = useApp();

  // Create a randomized/shuffled grid list from posts
  const explorePosts = useMemo(() => {
    // Generate enough seeds matching length of IMG_SEEDS (25)
    return Array.from({ length: 25 }, (_, i) => {
      const post = posts[i % posts.length];
      if (!post) return null;
      // create a pseudo-random seed to vary images slightly
      const seed = 10 + i * 15;
      const height = i % 5 === 0 ? 800 : 400;
      return {
        ...post,
        uniqueId: `${post.id}-explore-${i}`,
        img: `https://picsum.photos/seed/${seed}/400/${height}`,
        isTall: i % 5 === 0,
        mockLikes: Math.floor(Math.random() * 9000) + 100,
        mockCommentsCount: Math.floor(Math.random() * 500) + 10,
      };
    }).filter(Boolean);
  }, [posts]);

  return (
    <div className="flex-1 overflow-y-auto h-full w-full custom-scroll text-white select-none">
      <div className="max-w-[900px] mx-auto px-4 py-8">
        <h2 className="text-[18px] font-bold mb-6">Explore</h2>
        
        {/* Explore Grid */}
        <div className="grid grid-cols-3 gap-1 md:gap-2 auto-rows-fr">
          {explorePosts.map((item, i) => {
            if (!item) return null;
            return (
              <div
                key={item.uniqueId}
                onClick={() => setActivePostId(item.id)}
                className={`relative aspect-square overflow-hidden cursor-pointer group select-none ${
                  item.isTall ? "row-span-2 aspect-auto h-full" : ""
                }`}
              >
                <img
                  src={item.img}
                  alt="Explore"
                  className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                  loading="lazy"
                />

                {/* Overlay stats */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition duration-200 flex items-center justify-center gap-6 text-[14px] font-bold text-white">
                  <span className="flex items-center gap-1.5">
                    <Heart size={18} fill="currentColor" />
                    {item.mockLikes >= 1000 ? (item.mockLikes / 1000).toFixed(1) + "K" : item.mockLikes}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MessageCircle size={18} fill="currentColor" />
                    {item.mockCommentsCount}
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
