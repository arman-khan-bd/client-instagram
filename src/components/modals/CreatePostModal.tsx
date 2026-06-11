"use client";

import React, { useState, useRef } from "react";
import { useApp } from "../AppContext";
import { Upload, X, MapPin, Tag, Smile, Music, Globe, Share2 } from "lucide-react";

const EMOJIS = ["😊", "😂", "❤️", "🔥", "👍", "😭", "😍", "✨", "🎉", "🚀", "💀", "👀"];
const SUGGESTED_LOCATIONS = ["New York, USA", "Tokyo, Japan", "Paris, France", "London, UK", "Aura Space 🌌", "Silicon Valley, CA"];

const FEELINGS = [
  { label: "😊 Happy", value: "Feeling happy 😊" },
  { label: "😢 Sad", value: "Feeling sad 😢" },
  { label: "🤩 Excited", value: "Feeling excited 🤩" },
  { label: "😌 Blessed", value: "Feeling blessed 😌" },
  { label: "🍕 Eating", value: "Eating food 🍕" },
  { label: "✈️ Traveling", value: "Traveling ✈️" },
  { label: "🎮 Gaming", value: "Gaming 🎮" },
];

const FILTERS = [
  { name: "Normal", filter: "none" },
  { name: "Clarendon", filter: "contrast(1.2) saturate(1.35) hue-rotate(-10deg)" },
  { name: "Valencia", filter: "sepia(0.25) contrast(0.9) saturate(1.2) hue-rotate(5deg)" },
  { name: "Ludwig", filter: "contrast(1.1) brightness(1.05) saturate(1.1)" },
  { name: "Juno", filter: "saturate(1.4) contrast(1.1) hue-rotate(-5deg)" },
  { name: "Vintage", filter: "sepia(0.6) contrast(1.1) brightness(0.95)" },
  { name: "Mono", filter: "grayscale(1) contrast(1.2)" },
  { name: "Cool Aura", filter: "hue-rotate(45deg) saturate(1.5) contrast(1.1)" },
];

export default function CreatePostModal() {
  const { showCreatePostModal, setShowCreatePostModal, createPost } = useApp();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Advanced metadata fields
  const [selectedFilter, setSelectedFilter] = useState("none");
  const [location, setLocation] = useState("");
  const [userTagInput, setUserTagInput] = useState("");
  const [userTags, setUserTags] = useState<string[]>([]);
  const [feeling, setFeeling] = useState("");
  const [audience, setAudience] = useState("Public");
  const [music, setMusic] = useState("");
  const [postType, setPostType] = useState<"post" | "reel">("post");

  // Cross posting
  const [shareFacebook, setShareFacebook] = useState(false);
  const [shareTikTok, setShareTikTok] = useState(false);
  const [shareOK, setShareOK] = useState(false);

  if (!showCreatePostModal) return null;

  const handleClose = () => {
    setShowCreatePostModal(false);
    setImagePreview(null);
    setCaption("");
    setSelectedFilter("none");
    setLocation("");
    setUserTags([]);
    setFeeling("");
    setMusic("");
    setShareFacebook(false);
    setShareTikTok(false);
    setShareOK(false);
    setPostType("post");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  };

  const handleSelectClick = () => {
    fileInputRef.current?.click();
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && userTagInput.trim()) {
      e.preventDefault();
      const cleaned = userTagInput.replace("@", "").trim();
      if (cleaned && !userTags.includes(cleaned)) {
        setUserTags((prev) => [...prev, cleaned]);
      }
      setUserTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setUserTags((prev) => prev.filter((t) => t !== tag));
  };

  const appendEmoji = (emoji: string) => {
    setCaption((prev) => prev + emoji);
  };

  const handleShare = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imagePreview) return;

    createPost(imagePreview, caption, {
      location,
      filter: selectedFilter,
      feelings: feeling,
      tags: userTags,
      music: music ? `${music} 🎶` : undefined,
    });
    handleClose();
  };

  return (
    <div
      onClick={handleClose}
      className="fixed inset-0 bg-black/75 z-[200] flex items-center justify-center p-4 text-white select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#111] border border-[#2a2a2a] rounded-2xl w-full max-w-[650px] max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#222] sticky top-0 bg-[#111] z-10">
          <button
            onClick={handleClose}
            className="text-white hover:text-gray-300 text-[14px] cursor-pointer"
          >
            Cancel
          </button>
          <h3 className="font-bold text-[15px]">Create new {postType}</h3>
          <button
            onClick={handleShare}
            disabled={!imagePreview}
            className="text-insta-blue hover:text-white font-bold text-[14px] cursor-pointer disabled:opacity-40 disabled:cursor-default"
          >
            Share
          </button>
        </div>

        {/* Content Body */}
        <div className="flex flex-col">
          {imagePreview ? (
            <form onSubmit={handleShare} className="flex flex-col">
              {/* Selected Preview with filter applied */}
              <div className="aspect-square bg-black overflow-hidden relative border-b border-[#222]">
                <img
                  src={imagePreview}
                  alt="Post preview"
                  className="w-full h-full object-cover transition-all duration-300"
                  style={{ filter: selectedFilter }}
                />
                <button
                  type="button"
                  onClick={() => setImagePreview(null)}
                  className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 rounded-full p-1.5 transition text-white"
                  title="Remove image"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Photos Filters Carousel */}
              <div className="p-4 bg-[#161616] border-b border-[#222]">
                <p className="text-[12px] font-semibold text-gray-400 mb-3 select-none">
                  Apply Filter:
                </p>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                  {FILTERS.map((f) => (
                    <button
                      key={f.name}
                      type="button"
                      onClick={() => setSelectedFilter(f.filter)}
                      className={`flex flex-col items-center gap-1.5 cursor-pointer shrink-0 transition-all duration-200 ${
                        selectedFilter === f.filter ? "scale-105" : "opacity-75 hover:opacity-100"
                      }`}
                    >
                      <div className="w-[64px] h-[64px] rounded-lg overflow-hidden border-2 border-white/[0.08] relative">
                        <img
                          src={imagePreview}
                          alt={f.name}
                          className="w-full h-full object-cover"
                          style={{ filter: f.filter }}
                        />
                        {selectedFilter === f.filter && (
                          <div className="absolute inset-0 bg-[#FF2E93]/20 border border-[#FF2E93] rounded-lg" />
                        )}
                      </div>
                      <span className="text-[10px] font-medium text-gray-300">
                        {f.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Rich Form Details */}
              <div className="p-5 flex flex-col gap-5">
                {/* Post Type Selector */}
                <div className="flex bg-[#1a1a1a] p-1 rounded-xl border border-white/[0.05]">
                  <button
                    type="button"
                    onClick={() => setPostType("post")}
                    className={`flex-1 py-1.5 rounded-lg text-[12px] font-bold cursor-pointer transition ${
                      postType === "post" ? "bg-white text-black shadow-sm" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Post 📸
                  </button>
                  <button
                    type="button"
                    onClick={() => setPostType("reel")}
                    className={`flex-1 py-1.5 rounded-lg text-[12px] font-bold cursor-pointer transition ${
                      postType === "reel" ? "bg-white text-black shadow-sm" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Reel 🎥
                  </button>
                </div>

                {/* Caption textarea */}
                <div>
                  <textarea
                    placeholder="Write a caption..."
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    maxLength={2200}
                    className="w-full bg-transparent border-none text-[14px] text-white outline-none placeholder-[#555] h-24 resize-none"
                  />
                  <div className="flex items-center justify-between mt-1">
                    {/* Emoji drawer list */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => appendEmoji(emoji)}
                          className="text-[14px] hover:scale-125 transition cursor-pointer"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                    <div className="text-[11px] text-[#555]">
                      {caption.length} / 2,200
                    </div>
                  </div>
                </div>

                {/* Location adding */}
                <div className="flex flex-col gap-2 border-t border-[#222] pt-4">
                  <div className="flex items-center gap-2 text-gray-300 text-[13px] font-semibold">
                    <MapPin size={16} className="text-insta-blue" />
                    <span>Add Location</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Search/type a location..."
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-[13px] text-white outline-none focus:border-insta-blue/50"
                  />
                  <div className="flex gap-2 flex-wrap mt-1">
                    {SUGGESTED_LOCATIONS.map((loc) => (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => setLocation(loc)}
                        className="text-[10px] bg-[#1a1a1a] border border-white/[0.05] hover:bg-[#222] text-gray-300 px-2.5 py-1 rounded-full transition cursor-pointer"
                      >
                        {loc}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tag Users */}
                <div className="flex flex-col gap-2 border-t border-[#222] pt-4">
                  <div className="flex items-center gap-2 text-gray-300 text-[13px] font-semibold">
                    <Tag size={16} className="text-[#FF8A00]" />
                    <span>Tag Users</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Type username and press Enter..."
                    value={userTagInput}
                    onChange={(e) => setUserTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-[13px] text-white outline-none focus:border-[#FF8A00]/50"
                  />
                  {userTags.length > 0 && (
                    <div className="flex gap-2 flex-wrap mt-1">
                      {userTags.map((tag) => (
                        <span
                          key={tag}
                          className="flex items-center gap-1.5 text-[11px] bg-[#FF8A00]/10 border border-[#FF8A00]/30 text-[#FF8A00] pl-3 pr-1.5 py-1 rounded-full"
                        >
                          @{tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="hover:text-white cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Feelings / Activities */}
                <div className="flex flex-col gap-2 border-t border-[#222] pt-4">
                  <div className="flex items-center gap-2 text-gray-300 text-[13px] font-semibold">
                    <Smile size={16} className="text-[#9E00FF]" />
                    <span>Feeling/Activity</span>
                  </div>
                  <select
                    value={feeling}
                    onChange={(e) => setFeeling(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-[13px] text-white outline-none focus:border-[#9E00FF]/50"
                  >
                    <option value="">-- How are you feeling? --</option>
                    {FEELINGS.map((feel) => (
                      <option key={feel.value} value={feel.value}>
                        {feel.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Advanced: Audience & Music Settings */}
                <div className="grid grid-cols-2 gap-4 border-t border-[#222] pt-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-gray-300 text-[13px] font-semibold">
                      <Globe size={16} className="text-[#34A853]" />
                      <span>Audience</span>
                    </div>
                    <select
                      value={audience}
                      onChange={(e) => setAudience(e.target.value)}
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-[12px] text-white outline-none"
                    >
                      <option value="Public">Public 🌎</option>
                      <option value="Friends">Friends 👥</option>
                      <option value="Close Friends">Close Friends ⭐️</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-gray-300 text-[13px] font-semibold">
                      <Music size={16} className="text-[#FF2E93]" />
                      <span>Add Music</span>
                    </div>
                    <select
                      value={music}
                      onChange={(e) => setMusic(e.target.value)}
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-[12px] text-white outline-none"
                    >
                      <option value="">No Music 🔇</option>
                      <option value="Lofi Summer">Lofi Summer 🏖️</option>
                      <option value="Synthwave Ride">Synthwave Ride 🚗</option>
                      <option value="Jazz Café">Jazz Café ☕</option>
                      <option value="Club Bass">Club Bass ⚡</option>
                    </select>
                  </div>
                </div>

                {/* Cross-posting options (Instagram, Facebook, TikTok, OK.ru) */}
                <div className="flex flex-col gap-3.5 border-t border-[#222] pt-4.5 pb-2">
                  <div className="flex items-center gap-2 text-gray-300 text-[13px] font-semibold">
                    <Share2 size={16} className="text-[#FF2E93]" />
                    <span>Cross-post to other networks</span>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    {/* Facebook cross-post */}
                    <label className="flex items-center justify-between p-3 bg-[#1a1a1a] rounded-xl border border-white/[0.02] cursor-pointer">
                      <div className="flex items-center gap-3">
                        <span className="text-[13px]">Share to Facebook</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={shareFacebook}
                        onChange={(e) => setShareFacebook(e.target.checked)}
                        className="w-4 h-4 accent-insta-blue cursor-pointer"
                      />
                    </label>

                    {/* TikTok cross-post */}
                    <label className="flex items-center justify-between p-3 bg-[#1a1a1a] rounded-xl border border-white/[0.02] cursor-pointer">
                      <div className="flex items-center gap-3">
                        <span className="text-[13px]">Share to TikTok</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={shareTikTok}
                        onChange={(e) => setShareTikTok(e.target.checked)}
                        className="w-4 h-4 accent-insta-blue cursor-pointer"
                      />
                    </label>

                    {/* OK.ru cross-post */}
                    <label className="flex items-center justify-between p-3 bg-[#1a1a1a] rounded-xl border border-white/[0.02] cursor-pointer">
                      <div className="flex items-center gap-3">
                        <span className="text-[13px]">Share to OK.ru (Odnoklassniki) 🇷🇺</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={shareOK}
                        onChange={(e) => setShareOK(e.target.checked)}
                        className="w-4 h-4 accent-insta-blue cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </form>
          ) : (
            /* Drag and Drop Zone */
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={handleSelectClick}
              className="py-24 px-6 flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-[#1a1a1a]/30 transition group select-none"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              <Upload size={56} className="text-[#a8a8a8] group-hover:scale-105 transition duration-300" />
              <span className="text-[18px] text-gray-300 group-hover:text-white transition">
                Drag photos and videos here
              </span>
              <button
                type="button"
                className="mt-2 px-5 py-2.5 rounded-lg bg-insta-blue hover:bg-insta-blue/95 font-bold text-[13px] active:scale-95 transition"
              >
                Select from computer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
