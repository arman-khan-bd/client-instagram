"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useApp } from "../AppContext";
import { Search as SearchIcon, Heart, MessageCircle } from "lucide-react";
import { api } from "../../lib/api";

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
            {searching && (
              <div className="text-center py-4 text-xs text-[#a8a8a8] animate-pulse">
                Searching AuraGram...
              </div>
            )}
            
            {!searching && dbUsers.length === 0 ? (
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
                {item.mediaType === "video" ? (
                  <video
                    src={item.img}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={item.img || "https://picsum.photos/400/400"}
                    alt="Explore"
                    className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                )}
                {item.mediaType === "video" && (
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
