"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useApp } from "../AppContext";
import { Upload, X, MapPin, Tag, Smile, Music, Globe, Palette, ChevronLeft, ChevronRight, Video, Image, Film } from "lucide-react";
import { scanFileForAdultContent } from "../../lib/nsfwDetector";
import { supabase } from "../../lib/supabase";

// ── VideoThumbnailPicker ──────────────────────────────────────────────────────
interface VideoThumbnailPickerProps {
  videoSrc: string; // object URL for the video file
  onSelect: (dataUrl: string) => void;
  selectedIdx: number | null;
  onSelectIdx: (idx: number) => void;
  frames: string[]; // dataURLs
  onFramesReady: (frames: string[]) => void;
}

function VideoThumbnailPicker({ videoSrc, onSelect, selectedIdx, onSelectIdx, frames, onFramesReady }: VideoThumbnailPickerProps) {
  const extracting = frames.length === 0;

  useEffect(() => {
    if (!videoSrc || frames.length > 0) return;
    const video = document.createElement("video");
    video.src = videoSrc;
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.preload = "auto";

    const FRAME_COUNT = 6;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const results: string[] = [];

    video.onloadedmetadata = async () => {
      const duration = video.duration;
      canvas.width = 160;
      canvas.height = 160;

      for (let i = 0; i < FRAME_COUNT; i++) {
        const t = (i / (FRAME_COUNT - 1)) * (duration - 0.1);
        await new Promise<void>((resolve) => {
          video.currentTime = t;
          const handler = () => {
            try {
              if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                results.push(canvas.toDataURL("image/jpeg", 0.85));
              }
            } catch {}
            video.removeEventListener("seeked", handler);
            resolve();
          };
          video.addEventListener("seeked", handler, { once: true });
        });
      }
      onFramesReady(results);
      if (results.length > 0) { onSelectIdx(0); onSelect(results[0]); }
    };
  }, [videoSrc]);

  return (
    <div className="px-3 py-3 border-t border-[#1e1e1e]">
      <p className="text-[11px] font-semibold text-[#a8a8a8] uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <Film size={12} className="text-[#FF2E93]" /> Choose thumbnail
      </p>
      {extracting ? (
        <div className="flex gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-14 h-14 rounded-lg bg-[#1a1a1a] animate-pulse shrink-0" />
          ))}
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {frames.map((frame, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { onSelectIdx(i); onSelect(frame); }}
              className={`w-14 h-14 rounded-lg overflow-hidden shrink-0 border-2 transition cursor-pointer ${
                selectedIdx === i
                  ? "border-[#FF2E93] ring-2 ring-[#FF2E93]/30"
                  : "border-transparent hover:border-white/40"
              }`}
            >
              <img src={frame} alt={`frame ${i}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


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

const VIDEO_MAX_DURATION = 5 * 60; // 5 minutes in seconds
const VIDEO_MAX_SIZE = 10 * 1024 * 1024; // 10MB in bytes

export default function CreatePostModal() {
  const { showCreatePostModal, setShowCreatePostModal, createPost, showToast, users } = useApp();
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileTypes, setFileTypes] = useState<("image" | "video")[]>([]);
  const [activePreviewIdx, setActivePreviewIdx] = useState(0);
  const [caption, setCaption] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanningUrls, setScanningUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Suggestions states for @ tagging
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionSearch, setSuggestionSearch] = useState("");
  const [suggestionStartIndex, setSuggestionStartIndex] = useState(-1);

  // Warm up NSFW model when modal becomes visible
  useEffect(() => {
    if (showCreatePostModal) {
      import("../../lib/nsfwDetector")
        .then((m) => m.getOrLoadNSFWModel())
        .catch((err) => console.error("Error preloading NSFW model:", err));
    }
  }, [showCreatePostModal]);

  // Thumbnail picker states for multiple videos
  const [videoThumbnails, setVideoThumbnails] = useState<Record<number, { dataUrl: string; idx: number; frames: string[] }>>({});

  // Advanced metadata fields
  const [selectedFilter, setSelectedFilter] = useState("none");
  const [location, setLocation] = useState("");
  const [userTagInput, setUserTagInput] = useState("");
  const [userTags, setUserTags] = useState<string[]>([]);
  const [feeling, setFeeling] = useState("");
  const [audience, setAudience] = useState("Public");
  const [music, setMusic] = useState("");
  // postType is auto-detected: video = reel, image/text = post

  // Text gradient background posting
  const [selectedBgIdx, setSelectedBgIdx] = useState<number | null>(null);

  // Facebook-style toolbar panel visibility
  const [activePanel, setActivePanel] = useState<"location" | "tag" | "feeling" | "music" | "audience" | "color" | null>(null);

  // Derive postType from files: any video => reel, else post
  const isReel = fileTypes.some((t) => t === "video");

  const handleClose = () => {
    setShowCreatePostModal(false);
    setImagePreviews([]);
    setSelectedFiles([]);
    setFileTypes([]);
    setActivePreviewIdx(0);
    setCaption("");
    setSelectedFilter("none");
    setLocation("");
    setUserTags([]);
    setFeeling("");
    setMusic("");
    setSelectedBgIdx(null);
    setActivePanel(null);
    setIsSharing(false);
    setVideoThumbnails({});
    setIsScanning(false);
    setScanningUrls([]);
    setShowSuggestions(false);
    setSuggestionStartIndex(-1);
    setSuggestionSearch("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validateAndAddFiles = async (rawFiles: File[]) => {
    // Prepare temporary preview URLs and metadata for valid files
    const filesToAdd: { file: File; url: string; type: "image" | "video" }[] = [];
    
    for (const file of rawFiles) {
      const isVideo = file.type.startsWith("video/");

      // File size check for videos
      if (isVideo && file.size > VIDEO_MAX_SIZE) {
        showToast(`"${file.name}" exceeds 10MB limit. Please compress the video.`, "info");
        continue;
      }

      filesToAdd.push({
        file,
        url: URL.createObjectURL(file),
        type: isVideo ? "video" : "image"
      });
    }

    if (filesToAdd.length === 0) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Capture the initial length of previews before appending
    const initialPreviewsLength = imagePreviews.length;

    // Check duration for videos
    const finalFilesToAdd: typeof filesToAdd = [];
    for (const item of filesToAdd) {
      if (item.type === "video") {
        const duration = await new Promise<number>((resolve) => {
          const vid = document.createElement("video");
          vid.preload = "metadata";
          vid.onloadedmetadata = () => { resolve(vid.duration); };
          vid.onerror = () => { resolve(0); };
          vid.src = item.url;
        });

        if (duration > VIDEO_MAX_DURATION) {
          showToast(`"${item.file.name}" exceeds 5-minute limit (${Math.floor(duration / 60)}m ${Math.floor(duration % 60)}s).`, "info");
          continue;
        }
      }
      finalFilesToAdd.push(item);
    }

    if (finalFilesToAdd.length > 0) {
      const urls = finalFilesToAdd.map((f) => f.url);
      const files = finalFilesToAdd.map((f) => f.file);
      const types = finalFilesToAdd.map((f) => f.type);

      setImagePreviews((prev) => [...prev, ...urls]);
      setSelectedFiles((prev) => [...prev, ...files]);
      setFileTypes((prev) => [...prev, ...types]);
      setSelectedBgIdx(null);
      setActivePreviewIdx(initialPreviewsLength);
    }

    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndAddFiles(Array.from(files));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      validateAndAddFiles(Array.from(files));
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
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleCaptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setCaption(val);

    const caretPos = e.target.selectionStart;
    const textBeforeCaret = val.slice(0, caretPos);
    const lastWordMatch = textBeforeCaret.match(/@(\w*)$/);

    if (lastWordMatch) {
      const searchWord = lastWordMatch[1];
      const startIndex = lastWordMatch.index!;
      setSuggestionSearch(searchWord);
      setSuggestionStartIndex(startIndex);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const [dbSuggestions, setDbSuggestions] = useState<any[]>([]);

  useEffect(() => {
    if (!showSuggestions) {
      setDbSuggestions([]);
      return;
    }

    const query = suggestionSearch.trim();
    const delayDebounce = setTimeout(async () => {
      try {
        let dbQuery = supabase
          .from("User")
          .select("id, username, fullName, avatarUrl, isVerified")
          .limit(10);

        if (query) {
          dbQuery = dbQuery.or(`username.ilike.%${query}%,fullName.ilike.%${query}%`);
        }

        const { data, error } = await dbQuery;
        if (!error && data) {
          setDbSuggestions(
            data.map((u) => ({
              id: u.id,
              name: u.username,
              full: u.fullName,
              img: u.avatarUrl || "https://i.pravatar.cc/150?img=1",
              verified: u.isVerified,
            }))
          );
        }
      } catch (err) {
        console.error("Failed to query suggestions:", err);
      }
    }, 200);

    return () => clearTimeout(delayDebounce);
  }, [suggestionSearch, showSuggestions]);

  const selectSuggestion = (username: string) => {
    if (suggestionStartIndex === -1) return;
    const val = caption;
    const textBeforeMention = val.slice(0, suggestionStartIndex);
    const caretPos = textareaRef.current?.selectionStart || val.length;
    const textAfterMention = val.slice(caretPos);

    const newCaption = `${textBeforeMention}@${username} ${textAfterMention}`;
    setCaption(newCaption);
    setShowSuggestions(false);
    setSuggestionStartIndex(-1);
    setSuggestionSearch("");

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newCursorPos = textBeforeMention.length + username.length + 2; // +2 for @ and space
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 50);
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
    setFileTypes((prev) => prev.filter((_, i) => i !== idxToRemove));
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
        const thumbnailDataUrls: Record<number, string> = {};
        Object.entries(videoThumbnails).forEach(([k, v]) => {
          if (v.dataUrl) {
            thumbnailDataUrls[Number(k)] = v.dataUrl;
          }
        });

        await createPost(selectedFiles, caption, {
          filter: selectedFilter,
          location,
          feelings: feeling,
          tags: userTags,
          music: music ? `${music} 🎶` : undefined,
          thumbnailDataUrls,
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

  if (!showCreatePostModal) return null;

  return (
    <div
      onClick={handleClose}
      className="fixed inset-0 bg-black/75 z-[200] flex items-center justify-center p-4 text-white select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#111] border border-[#2a2a2a] rounded-2xl w-full max-w-[550px] max-h-[90vh] overflow-y-auto overflow-x-hidden shadow-2xl flex flex-col relative"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#222] sticky top-0 bg-[#111] z-30">
          <button
            onClick={handleClose}
            className="text-white hover:text-gray-300 text-[14px] cursor-pointer"
          >
            Cancel
          </button>
          <h3 className="font-bold text-[15px] flex items-center gap-1.5">
            {isReel ? <Video size={15} className="text-[#FF2E93]" /> : <Image size={15} className="text-insta-blue" />}
            {isReel ? "Create Reel" : "Create Post"}
          </h3>
          <button
            onClick={handleShare}
            disabled={isSharing || (imagePreviews.length === 0 && selectedBgIdx === null) || isScanning}
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
                  /* Color BG preview box with inline writing */
                  <div
                    className="w-full h-full flex items-center justify-center p-8 text-center text-[19px] font-semibold font-sans break-words text-white select-text leading-relaxed relative"
                    style={{ background: BG_GRADIENTS[selectedBgIdx!].value }}
                  >
                    <textarea
                      ref={textareaRef}
                      placeholder="Your text will appear here..."
                      value={caption}
                      onChange={handleCaptionChange}
                      maxLength={2200}
                      className="w-full h-full bg-transparent border-none outline-none resize-none text-center text-white placeholder-white/60 font-semibold focus:ring-0 leading-relaxed font-sans flex items-center justify-center pt-24 no-scrollbar"
                      style={{ height: '80%' }}
                    />
                    {/* Inline suggestions list overlay for text-only post */}
                    {showSuggestions && dbSuggestions.length > 0 && (
                      <div className="absolute left-4 right-4 bottom-4 bg-[#18181b]/95 backdrop-blur-xl border border-white/[0.08] rounded-xl max-h-[160px] overflow-y-auto shadow-2xl z-[100] custom-scroll p-1 flex flex-col gap-0.5 text-left">
                        {dbSuggestions.map((u) => (
                          <button
                            key={`preview-suggest-${u.id}`}
                            type="button"
                            onClick={() => selectSuggestion(u.name)}
                            className="flex items-center gap-3 w-full p-2 hover:bg-white/[0.06] rounded-lg transition text-left cursor-pointer shrink-0"
                          >
                            <img
                              src={u.img}
                              alt={u.name}
                              className="w-7 h-7 rounded-full object-cover border border-white/[0.05]"
                            />
                            <div className="flex flex-col min-w-0">
                              <span className="text-[12px] font-bold text-white truncate flex items-center gap-1">
                                {u.name}
                                {u.verified && <span className="verified-badge w-3 h-3" />}
                              </span>
                              <span className="text-[10px] text-gray-400 truncate">{u.full}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Standard Image/Video Preview with carousel */
                  <div className="relative w-full h-full">
                    {fileTypes[activePreviewIdx] === "video" ? (
                      <video
                        src={imagePreviews[activePreviewIdx]}
                        className="w-full h-full object-cover transition-all duration-300"
                        controls={!scanningUrls.includes(imagePreviews[activePreviewIdx])}
                        playsInline
                        muted
                      />
                    ) : (
                      <img
                        src={imagePreviews[activePreviewIdx]}
                        alt="Post preview"
                        className="w-full h-full object-cover transition-all duration-300"
                        style={{ filter: selectedFilter }}
                      />
                    )}
                    
                    {/* Image-Specific Safety Scanner Overlay */}
                    {scanningUrls.includes(imagePreviews[activePreviewIdx]) && (
                      <div className="absolute inset-0 bg-black/70 backdrop-blur-md z-20 flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
                        <div className="w-12 h-12 border-4 border-t-insta-blue border-white/20 rounded-full animate-spin mb-4" />
                        <h4 className="text-[16px] font-bold text-white mb-2">Running Safety Scanner</h4>
                        <p className="text-[12px] text-gray-300 max-w-[240px] leading-relaxed">
                          Checking your content for safety. Please wait.
                        </p>
                        <p className="text-[10px] text-[#ff4a4a] mt-4 font-semibold max-w-[220px]">
                          ⚠️ WARNING: Uploading adult or nude content will result in an automatic account ban.
                        </p>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => handleRemovePreview(activePreviewIdx)}
                      className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 rounded-full p-1.5 transition text-white z-10"
                      title="Remove this file"
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

              {/* Video Thumbnail Picker — only shown when current preview is a video */}
              {!isTextOnlyPost && imagePreviews.length > 0 && fileTypes[activePreviewIdx] === "video" && (
                <VideoThumbnailPicker
                  videoSrc={imagePreviews[activePreviewIdx]}
                  frames={videoThumbnails[activePreviewIdx]?.frames || []}
                  onFramesReady={(frames) => {
                    setVideoThumbnails((prev) => ({
                      ...prev,
                      [activePreviewIdx]: {
                        ...(prev[activePreviewIdx] || { dataUrl: "", idx: 0 }),
                        frames,
                      },
                    }));
                  }}
                  selectedIdx={videoThumbnails[activePreviewIdx]?.idx ?? null}
                  onSelectIdx={(idx) => {
                    setVideoThumbnails((prev) => ({
                      ...prev,
                      [activePreviewIdx]: {
                        ...(prev[activePreviewIdx] || { dataUrl: "", frames: [] }),
                        idx,
                      },
                    }));
                  }}
                  onSelect={(dataUrl) => {
                    setVideoThumbnails((prev) => ({
                      ...prev,
                      [activePreviewIdx]: {
                        ...(prev[activePreviewIdx] || { idx: 0, frames: [] }),
                        dataUrl,
                      },
                    }));
                  }}
                />
              )}

              {/* Photos Filters Carousel (Only if showing images, not videos) */}
              {!isTextOnlyPost && imagePreviews.length > 0 && fileTypes[activePreviewIdx] !== "video" && (
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

              {/* Video info banner */}
              {!isTextOnlyPost && imagePreviews.length > 0 && fileTypes[activePreviewIdx] === "video" && (
                <div className="px-4 py-2.5 bg-[#161616] border-b border-[#222] flex items-center gap-2 text-[11px] text-[#FF2E93]">
                  <Video size={13} />
                  <span>Reel · Max 5 min · Max 10 MB</span>
                </div>
              )}

              {/* Rich Form Details */}
              <div className="p-4.5 flex flex-col gap-4">
                {/* Auto-detected type badge */}
                <div className="flex items-center gap-1.5">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold ${
                    isReel ? "bg-[#FF2E93]/10 text-[#FF2E93] border border-[#FF2E93]/30" : "bg-insta-blue/10 text-insta-blue border border-insta-blue/30"
                  }`}>
                    {isReel ? <><Video size={11} /> Reel</> : <><Image size={11} /> Post</>}
                  </span>
                  <span className="text-[10px] text-gray-500">{isReel ? "Video detected — will be posted as a Reel" : "Will be posted as a Photo Post"}</span>
                </div>

                <div className="relative">
                  {!isTextOnlyPost && (
                    <textarea
                      ref={textareaRef}
                      placeholder="Write a caption..."
                      value={caption}
                      onChange={handleCaptionChange}
                      maxLength={2200}
                      className="w-full bg-transparent border-none text-[13.5px] text-white outline-none placeholder-[#555] h-20 resize-none"
                    />
                  )}

                  {/* Suggestions list overlay */}
                  {!isTextOnlyPost && showSuggestions && dbSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 bottom-full mb-2 bg-[#18181b]/95 backdrop-blur-xl border border-white/[0.08] rounded-xl max-h-[160px] overflow-y-auto shadow-2xl z-[100] custom-scroll p-1 flex flex-col gap-0.5">
                      {dbSuggestions.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => selectSuggestion(u.name)}
                          className="flex items-center gap-3 w-full p-2 hover:bg-white/[0.06] rounded-lg transition text-left cursor-pointer shrink-0"
                        >
                          <img
                            src={u.img}
                            alt={u.name}
                            className="w-7 h-7 rounded-full object-cover border border-white/[0.05]"
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="text-[12px] font-bold text-white truncate flex items-center gap-1">
                              {u.name}
                              {u.verified && <span className="verified-badge w-3 h-3" />}
                            </span>
                            <span className="text-[10px] text-gray-400 truncate">{u.full}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

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
                  accept="image/*,video/mp4,video/webm,video/quicktime,video/mov"
                  multiple
                  className="hidden"
                />
                <Upload size={56} className="text-[#a8a8a8] group-hover:scale-105 transition duration-300" />
                <span className="text-[18px] text-gray-300 group-hover:text-white transition">
                  Drag photos and videos here
                </span>
                <div className="flex flex-col items-center gap-1">
                  <button
                    type="button"
                    className="mt-2 px-5 py-2.5 rounded-lg bg-insta-blue hover:bg-insta-blue/95 font-bold text-[13px] active:scale-95 transition"
                  >
                    Select from computer
                  </button>
                  <p className="text-[10px] text-gray-500 mt-1">Videos: max 5 min · max 10 MB</p>
                </div>
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
