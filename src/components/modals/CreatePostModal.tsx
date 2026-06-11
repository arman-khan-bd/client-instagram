"use client";

import React, { useState, useRef } from "react";
import { useApp } from "../AppContext";
import { Upload, X, MapPin, Tag, Smile, Music, Globe, Palette, ChevronLeft, ChevronRight } from "lucide-react";

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

const BG_GRADIENTS = [
  { name: "Sunset", value: "linear-gradient(45deg, #FF8A00, #FF2E93, #9E00FF)" },
  { name: "Ocean Breeze", value: "linear-gradient(135deg, #02AAB0 0%, #00CDAC 100%)" },
  { name: "Neon Glow", value: "linear-gradient(135deg, #F107A3 0%, #7B2FF7 100%)" },
  { name: "Dark Nebula", value: "linear-gradient(135deg, #0F2027 0%, #203A43 50%, #2C5364 100%)" },
  { name: "Lime Energy", value: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)" },
];

export default function CreatePostModal() {
  const { showCreatePostModal, setShowCreatePostModal, createPost, showToast } = useApp();
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [activePreviewIdx, setActivePreviewIdx] = useState(0);
  const [caption, setCaption] = useState("");
  const [isSharing, setIsSharing] = useState(false);
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

  // Text gradient background posting
  const [selectedBgIdx, setSelectedBgIdx] = useState<number | null>(null);

  // Facebook-style toolbar panel visibility
  const [activePanel, setActivePanel] = useState<"location" | "tag" | "feeling" | "music" | "audience" | "color" | null>(null);

  if (!showCreatePostModal) return null;

  const handleClose = () => {
    setShowCreatePostModal(false);
    setImagePreviews([]);
    setSelectedFiles([]);
    setActivePreviewIdx(0);
    setCaption("");
    setSelectedFilter("none");
    setLocation("");
    setUserTags([]);
    setFeeling("");
    setMusic("");
    setSelectedBgIdx(null);
    setActivePanel(null);
    setPostType("post");
    setIsSharing(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      const urls: string[] = newFiles.map((f) => URL.createObjectURL(f));
      setImagePreviews((prev) => [...prev, ...urls]);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
      setSelectedBgIdx(null); // Disable color BG if files added
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      const urls: string[] = newFiles.map((f) => URL.createObjectURL(f));
      setImagePreviews((prev) => [...prev, ...urls]);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
      setSelectedBgIdx(null); // Disable color BG if files added
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

  const handleRemovePreview = (idxToRemove: number) => {
    setImagePreviews((prev) => {
      const updated = prev.filter((_, i) => i !== idxToRemove);
      if (activePreviewIdx >= updated.length) {
        setActivePreviewIdx(Math.max(0, updated.length - 1));
      }
      return updated;
    });
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idxToRemove));
  };

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if text-only bg post
    const isTextOnly = selectedBgIdx !== null && imagePreviews.length === 0;

    if (!isTextOnly && imagePreviews.length === 0) {
      showToast("Please upload an image or select a color background!", "info");
      return;
    }

    if (isTextOnly && !caption.trim()) {
      showToast("Please write a message for your colored background post!", "info");
      return;
    }

    setIsSharing(true);
    try {
      if (isTextOnly) {
        await createPost([], caption, {
          bgGradient: BG_GRADIENTS[selectedBgIdx!].value,
          isTextOnly: true,
          location,
          feelings: feeling,
          tags: userTags,
          music: music ? `${music} 🎶` : undefined,
        });
      } else {
        await createPost(selectedFiles, caption, {
          filter: selectedFilter,
          location,
          feelings: feeling,
          tags: userTags,
          music: music ? `${music} 🎶` : undefined,
        });
      }
      handleClose();
    } catch {
      setIsSharing(false);
    }
  };

  const togglePanel = (panel: typeof activePanel) => {
    setActivePanel((prev) => (prev === panel ? null : panel));
  };

  // Preview is text-only if background gradient is selected and no images are uploaded
  const isTextOnlyPost = selectedBgIdx !== null && imagePreviews.length === 0;

  return (
    <div
      onClick={handleClose}
      className="fixed inset-0 bg-black/75 z-[200] flex items-center justify-center p-4 text-white select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#111] border border-[#2a2a2a] rounded-2xl w-full max-w-[550px] max-h-[90vh] overflow-y-auto overflow-x-hidden shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#222] sticky top-0 bg-[#111] z-30">
          <button
            onClick={handleClose}
            className="text-white hover:text-gray-300 text-[14px] cursor-pointer"
          >
            Cancel
          </button>
          <h3 className="font-bold text-[15px]">Create {postType}</h3>
          <button
            onClick={handleShare}
            disabled={isSharing || (imagePreviews.length === 0 && selectedBgIdx === null)}
            className="text-insta-blue hover:text-white font-bold text-[14px] cursor-pointer disabled:opacity-40 disabled:cursor-default transition-opacity"
          >
            {isSharing ? "Sharing…" : "Share"}
          </button>
        </div>

        {/* Content Body */}
        <div className="flex flex-col">
          {imagePreviews.length > 0 || isTextOnlyPost ? (
            <form onSubmit={handleShare} className="flex flex-col">
              {/* Media Preview Container */}
              <div className="aspect-square bg-black overflow-hidden relative border-b border-[#222]">
                {isTextOnlyPost ? (
                  /* Color BG preview box */
                  <div
                    className="w-full h-full flex items-center justify-center p-8 text-center text-[19px] font-semibold font-sans break-words text-white select-text leading-relaxed"
                    style={{ background: BG_GRADIENTS[selectedBgIdx!].value }}
                  >
                    {caption || "Your text will appear here..."}
                  </div>
                ) : (
                  /* Standard Image Preview with carousel */
                  <div className="relative w-full h-full">
                    <img
                      src={imagePreviews[activePreviewIdx]}
                      alt="Post preview"
                      className="w-full h-full object-cover transition-all duration-300"
                      style={{ filter: selectedFilter }}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePreview(activePreviewIdx)}
                      className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 rounded-full p-1.5 transition text-white z-10"
                      title="Remove this image"
                    >
                      <X size={16} />
                    </button>

                    {/* Carousel Navigation */}
                    {imagePreviews.length > 1 && (
                      <>
                        {activePreviewIdx > 0 && (
                          <button
                            type="button"
                            onClick={() => setActivePreviewIdx((prev) => prev - 1)}
                            className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 rounded-full p-1.5 z-10 transition text-white border-none cursor-pointer"
                          >
                            <ChevronLeft size={16} />
                          </button>
                        )}
                        {activePreviewIdx < imagePreviews.length - 1 && (
                          <button
                            type="button"
                            onClick={() => setActivePreviewIdx((prev) => prev + 1)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 rounded-full p-1.5 z-10 transition text-white border-none cursor-pointer"
                          >
                            <ChevronRight size={16} />
                          </button>
                        )}

                        {/* Pagination Indicator */}
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 px-2.5 py-1 rounded-full text-[10px] text-gray-300 z-10">
                          {activePreviewIdx + 1} / {imagePreviews.length}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Photos Filters Carousel (Only if showing images) */}
              {!isTextOnlyPost && imagePreviews.length > 0 && (
                <div className="p-4 bg-[#161616] border-b border-[#222]">
                  <p className="text-[11px] font-semibold text-gray-400 mb-2.5 select-none">
                    Apply Filter:
                  </p>
                  <div className="flex gap-3 overflow-x-auto pb-1.5 scrollbar-thin">
                    {FILTERS.map((f) => (
                      <button
                        key={f.name}
                        type="button"
                        onClick={() => setSelectedFilter(f.filter)}
                        className={`flex flex-col items-center gap-1 cursor-pointer shrink-0 transition-all duration-200 ${
                          selectedFilter === f.filter ? "scale-105" : "opacity-75 hover:opacity-100"
                        }`}
                      >
                        <div className="w-[56px] h-[56px] rounded-lg overflow-hidden border border-white/[0.08] relative">
                          <img
                            src={imagePreviews[activePreviewIdx]}
                            alt={f.name}
                            className="w-full h-full object-cover"
                            style={{ filter: f.filter }}
                          />
                          {selectedFilter === f.filter && (
                            <div className="absolute inset-0 bg-[#FF2E93]/20 border border-[#FF2E93] rounded-lg" />
                          )}
                        </div>
                        <span className="text-[9px] font-medium text-gray-400">
                          {f.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Rich Form Details */}
              <div className="p-4.5 flex flex-col gap-4">
                {/* Post Type Selector */}
                <div className="flex bg-[#1a1a1a] p-1 rounded-xl border border-white/[0.05]">
                  <button
                    type="button"
                    onClick={() => setPostType("post")}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition ${
                      postType === "post" ? "bg-white text-black shadow-sm" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Post 📸
                  </button>
                  <button
                    type="button"
                    onClick={() => setPostType("reel")}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition ${
                      postType === "reel" ? "bg-white text-black shadow-sm" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Reel 🎥
                  </button>
                </div>

                {/* Caption textbox */}
                <div>
                  <textarea
                    placeholder={isTextOnlyPost ? "Write something on your gradient post..." : "Write a caption..."}
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    maxLength={2200}
                    className="w-full bg-transparent border-none text-[13.5px] text-white outline-none placeholder-[#555] h-20 resize-none"
                  />
                  <div className="flex items-center justify-between mt-1">
                    {/* Emoji list shortcuts */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => appendEmoji(emoji)}
                          className="text-[13px] hover:scale-125 transition cursor-pointer"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                    <div className="text-[10px] text-[#555]">
                      {caption.length} / 2,200
                    </div>
                  </div>
                </div>

                {/* Facebook-style icon panel toggles */}
                <div className="border-t border-[#222] pt-3 flex items-center justify-between">
                  <span className="text-[11.5px] text-gray-400 font-semibold select-none">
                    Add to your post
                  </span>
                  
                  <div className="flex items-center gap-1 relative">
                    {/* Location Toggle Icon */}
                    <div className="group relative">
                      <button
                        type="button"
                        onClick={() => togglePanel("location")}
                        className={`p-2 rounded-lg cursor-pointer hover:bg-[#222] transition ${
                          activePanel === "location" ? "bg-insta-blue/10 text-insta-blue" : "text-gray-300"
                        }`}
                      >
                        <MapPin size={17} />
                      </button>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-black text-[9.5px] font-bold rounded shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition whitespace-nowrap z-50">
                        Add Location
                      </div>
                    </div>

                    {/* Tag Users Icon */}
                    <div className="group relative">
                      <button
                        type="button"
                        onClick={() => togglePanel("tag")}
                        className={`p-2 rounded-lg cursor-pointer hover:bg-[#222] transition ${
                          activePanel === "tag" ? "bg-[#FF8A00]/10 text-[#FF8A00]" : "text-gray-300"
                        }`}
                      >
                        <Tag size={17} />
                      </button>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-black text-[9.5px] font-bold rounded shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition whitespace-nowrap z-50">
                        Tag Friends
                      </div>
                    </div>

                    {/* Feelings Icon */}
                    <div className="group relative">
                      <button
                        type="button"
                        onClick={() => togglePanel("feeling")}
                        className={`p-2 rounded-lg cursor-pointer hover:bg-[#222] transition ${
                          activePanel === "feeling" ? "bg-[#9E00FF]/10 text-[#9E00FF]" : "text-gray-300"
                        }`}
                      >
                        <Smile size={17} />
                      </button>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-black text-[9.5px] font-bold rounded shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition whitespace-nowrap z-50">
                        Feelings / Activity
                      </div>
                    </div>

                    {/* Music Icon */}
                    <div className="group relative">
                      <button
                        type="button"
                        onClick={() => togglePanel("music")}
                        className={`p-2 rounded-lg cursor-pointer hover:bg-[#222] transition ${
                          activePanel === "music" ? "bg-[#FF2E93]/10 text-[#FF2E93]" : "text-gray-300"
                        }`}
                      >
                        <Music size={17} />
                      </button>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-black text-[9.5px] font-bold rounded shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition whitespace-nowrap z-50">
                        Add Music
                      </div>
                    </div>

                    {/* Audience Selector Icon */}
                    <div className="group relative">
                      <button
                        type="button"
                        onClick={() => togglePanel("audience")}
                        className={`p-2 rounded-lg cursor-pointer hover:bg-[#222] transition ${
                          activePanel === "audience" ? "bg-[#34A853]/10 text-[#34A853]" : "text-gray-300"
                        }`}
                      >
                        <Globe size={17} />
                      </button>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-black text-[9.5px] font-bold rounded shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition whitespace-nowrap z-50">
                        Audience Settings
                      </div>
                    </div>

                    {/* Palette (Color BG Selector) Icon */}
                    <div className="group relative">
                      <button
                        type="button"
                        disabled={imagePreviews.length > 0}
                        onClick={() => togglePanel("color")}
                        className={`p-2 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed ${
                          imagePreviews.length > 0 ? "" : "hover:bg-[#222] cursor-pointer"
                        } ${
                          activePanel === "color" || selectedBgIdx !== null ? "bg-[#E0A96D]/10 text-[#E0A96D]" : "text-gray-300"
                        }`}
                      >
                        <Palette size={17} />
                      </button>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-black text-[9.5px] font-bold rounded shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition whitespace-nowrap z-50">
                        Post Backgrounds
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sub Panels sliding drawer based on activePanel */}
                {activePanel === "location" && (
                  <div className="bg-[#181818] p-3 rounded-xl border border-white/[0.04] flex flex-col gap-2 animate-fadeIn">
                    <input
                      type="text"
                      placeholder="Add a location..."
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3.5 py-2 text-[12px] text-white outline-none focus:border-insta-blue/50"
                    />
                    <div className="flex gap-1.5 flex-wrap mt-1">
                      {SUGGESTED_LOCATIONS.map((loc) => (
                        <button
                          key={loc}
                          type="button"
                          onClick={() => setLocation(loc)}
                          className="text-[9.5px] bg-[#111] border border-white/[0.04] hover:bg-[#222] text-gray-300 px-2.5 py-1 rounded-full transition cursor-pointer"
                        >
                          {loc}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activePanel === "tag" && (
                  <div className="bg-[#181818] p-3 rounded-xl border border-white/[0.04] flex flex-col gap-2 animate-fadeIn">
                    <input
                      type="text"
                      placeholder="Type username and press Enter..."
                      value={userTagInput}
                      onChange={(e) => setUserTagInput(e.target.value)}
                      onKeyDown={handleAddTag}
                      className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3.5 py-2 text-[12px] text-white outline-none focus:border-[#FF8A00]/50"
                    />
                    {userTags.length > 0 && (
                      <div className="flex gap-1.5 flex-wrap mt-1">
                        {userTags.map((tag) => (
                          <span
                            key={tag}
                            className="flex items-center gap-1.5 text-[10.5px] bg-[#FF8A00]/10 border border-[#FF8A00]/30 text-[#FF8A00] pl-2.5 pr-1 py-0.5 rounded-full"
                          >
                            @{tag}
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(tag)}
                              className="hover:text-white cursor-pointer"
                            >
                              <X size={10} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activePanel === "feeling" && (
                  <div className="bg-[#181818] p-3 rounded-xl border border-white/[0.04] flex flex-col gap-2 animate-fadeIn">
                    <select
                      value={feeling}
                      onChange={(e) => setFeeling(e.target.value)}
                      className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3.5 py-2 text-[12px] text-white outline-none focus:border-[#9E00FF]/50"
                    >
                      <option value="">-- Select feeling/activity --</option>
                      {FEELINGS.map((feel) => (
                        <option key={feel.value} value={feel.value}>
                          {feel.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {activePanel === "music" && (
                  <div className="bg-[#181818] p-3 rounded-xl border border-white/[0.04] flex flex-col gap-2 animate-fadeIn">
                    <select
                      value={music}
                      onChange={(e) => setMusic(e.target.value)}
                      className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3.5 py-2 text-[12px] text-white outline-none"
                    >
                      <option value="">No Music 🔇</option>
                      <option value="Lofi Summer">Lofi Summer 🏖️</option>
                      <option value="Synthwave Ride">Synthwave Ride 🚗</option>
                      <option value="Jazz Café">Jazz Café ☕</option>
                      <option value="Club Bass">Club Bass ⚡</option>
                    </select>
                  </div>
                )}

                {activePanel === "audience" && (
                  <div className="bg-[#181818] p-3 rounded-xl border border-white/[0.04] flex flex-col gap-2 animate-fadeIn">
                    <select
                      value={audience}
                      onChange={(e) => setAudience(e.target.value)}
                      className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3.5 py-2 text-[12px] text-white outline-none"
                    >
                      <option value="Public">Public 🌎</option>
                      <option value="Friends">Friends 👥</option>
                      <option value="Close Friends">Close Friends ⭐️</option>
                    </select>
                  </div>
                )}

                {activePanel === "color" && imagePreviews.length === 0 && (
                  <div className="bg-[#181818] p-3 rounded-xl border border-white/[0.04] flex flex-col gap-2 animate-fadeIn">
                    <p className="text-[10px] font-semibold text-gray-400 select-none">
                      Select Gradient Background:
                    </p>
                    <div className="flex gap-2 flex-wrap mt-1">
                      {/* None / Reset circle */}
                      <button
                        type="button"
                        onClick={() => setSelectedBgIdx(null)}
                        className={`w-8 h-8 rounded-full border-2 cursor-pointer transition ${
                          selectedBgIdx === null ? "border-white" : "border-transparent"
                        } bg-[#111] flex items-center justify-center`}
                      >
                        ❌
                      </button>

                      {BG_GRADIENTS.map((bg, idx) => (
                        <button
                          key={bg.name}
                          type="button"
                          onClick={() => setSelectedBgIdx(idx)}
                          className={`w-8 h-8 rounded-full border-2 cursor-pointer transition hover:scale-105 ${
                            selectedBgIdx === idx ? "border-white" : "border-transparent"
                          }`}
                          style={{ background: bg.value }}
                          title={bg.name}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </form>
          ) : (
            /* Drag and Drop Zone & Empty State Color BG helper */
            <div className="flex flex-col">
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
                  multiple
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

              {/* Quick Background select circles on landing upload state */}
              <div className="p-4 border-t border-[#222] bg-[#141414] flex flex-col gap-2.5">
                <p className="text-[11px] font-semibold text-gray-400 select-none">
                  Or write a text post with a colored background:
                </p>
                <div className="flex gap-2 flex-wrap">
                  {BG_GRADIENTS.map((bg, idx) => (
                    <button
                      key={bg.name}
                      type="button"
                      onClick={() => {
                        setSelectedBgIdx(idx);
                        setActivePanel("color");
                      }}
                      className="w-7 h-7 rounded-full cursor-pointer hover:scale-105 transition"
                      style={{ background: bg.value }}
                      title={bg.name}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
