"use client";

import React, { useState, useMemo } from "react";
import { useApp } from "../AppContext";
import { Search as SearchIcon, Heart, MessageCircle } from "lucide-react";

export default function Search() {
  const { users, posts, setViewingUserId, setActiveTab, setActivePostId } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const categories = [
    { id: "all", label: "All" },
    { id: "people", label: "People" },
    { id: "tags", label: "Tags" },
    { id: "places", label: "Places" },
    { id: "audio", label: "Audio" },
  ];

  const handleCategoryClick = (catId: string) => {
    setActiveCategory(catId);
  };

  // Filter matching users
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return users.filter(
      (u) => u.name.toLowerCase().includes(q) || u.full.toLowerCase().includes(q)
    );
  }, [searchQuery, users]);

  // Explore posts for search view
  const exploreGridPosts = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const post = posts[i % posts.length];
      if (!post) return null;
      const seed = 50 + i * 20;
      return {
        ...post,
        uniqueId: `${post.id}-search-${i}`,
        img: `https://picsum.photos/seed/${seed}/400/400`,
        likesCount: Math.floor(Math.random() * 8000) + 100,
        commentsCount: Math.floor(Math.random() * 300) + 5,
      };
    }).filter(Boolean);
  }, [posts]);

  const handleUserClick = (userId: number) => {
    setViewingUserId(userId);
    setActiveTab("profile");
  };

  return (
    <div className="flex-1 overflow-y-auto h-full w-full custom-scroll text-white select-none">
      <div className="max-w-[900px] mx-auto px-4 py-8">
        {/* Search Input wrapper */}
        <div className="relative mb-5">
          <SearchIcon size={18} className="absolute left-4.5 top-1/2 -translate-y-1/2 text-[#666]" />
          <input
            type="text"
            placeholder="Search"
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

        {/* Search Results / Explore grid conditional */}
        {searchQuery.trim() !== "" ? (
          <div className="flex flex-col gap-1.5">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-[#a8a8a8] text-[14px]">
                No results for "{searchQuery}"
              </div>
            ) : (
              filteredUsers.map((u) => (
                <div
                  key={u.id}
                  onClick={() => handleUserClick(u.id)}
                  className="flex items-center gap-3.5 p-3 rounded-xl hover:bg-[#111] cursor-pointer transition select-none"
                >
                  <img
                    src={u.img}
                    alt={u.name}
                    className="w-11 h-11 rounded-full object-cover border border-[#222]"
                  />
                  <div>
                    <div className="text-[14px] font-semibold flex items-center gap-1.5">
                      {u.name}
                      {u.verified && <span className="text-[#3897f0] text-[12px]">✓</span>}
                    </div>
                    <div className="text-[12px] text-[#a8a8a8]">
                      {u.full} · {(u.followers / 1000).toFixed(0)}k followers
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* Default Explore Grid */
          <div className="grid grid-cols-3 gap-1 md:gap-2 auto-rows-fr">
            {exploreGridPosts.map((item) => {
              if (!item) return null;
              return (
                <div
                  key={item.uniqueId}
                  onClick={() => setActivePostId(item.id)}
                  className="relative aspect-square overflow-hidden cursor-pointer group"
                >
                  <img
                    src={item.img}
                    alt="Explore"
                    className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition duration-200 flex items-center justify-center gap-6 text-[14px] font-bold">
                    <span className="flex items-center gap-1.5">
                      <Heart size={18} fill="currentColor" />
                      {item.likesCount >= 1000 ? (item.likesCount / 1000).toFixed(1) + "K" : item.likesCount}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MessageCircle size={18} fill="currentColor" />
                      {item.commentsCount}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
