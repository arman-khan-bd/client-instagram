"use client";

import React, { useState, useRef, useEffect } from "react";
import { useApp } from "../AppContext";
import { X, Upload, Music, Smile, Type, Tag, Palette, Sparkles, SmilePlus, Plus } from "lucide-react";

interface Sticker {
  id: string;
  emoji: string;
  x: number;
  y: number;
}

interface TextOverlay {
  id: string;
  text: string;
  color: string;
  x: number;
  y: number;
}

interface TagOverlay {
  id: string;
  username: string;
  x: number;
  y: number;
}

const PRESET_AUDIOS = [
  { name: "Lofi Sunset Chill", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
  { name: "Summer Tropical Beats", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
  { name: "Cyberpunk Synthwave", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
  { name: "Cozy Cafe Acoustic", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" },
  { name: "Deep Focus Ambient", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3" },
];

const FILTERS = [
  { name: "Normal", class: "", style: {} },
  { name: "Vintage Sepia", class: "", style: { filter: "sepia(0.8) contrast(1.2) brightness(0.9)" } },
  { name: "Grayscale Noir", class: "", style: { filter: "grayscale(1) contrast(1.4)" } },
  { name: "Warm Sun", class: "", style: { filter: "saturate(1.5) sepia(0.15) contrast(1.05)" } },
  { name: "Cool Breeze", class: "", style: { filter: "hue-rotate(15deg) saturate(1.1) brightness(1.05)" } },
  { name: "Retro Haze", class: "", style: { filter: "contrast(0.9) brightness(1.1) sepia(0.1)" } },
];

const FEELINGS = [
  "😊 Happy",
  "🚀 Excited",
  "😴 Tired",
  "🍕 Hungry",
  "🎧 Listening",
  "✈️ Traveling",
  "🔥 Inspired",
  "🍿 Chilling",
];

const EMOJI_STICKERS = ["😂", "😍", "🔥", "🙌", "💯", "✨", "🌈", "⚡", "🎉", "❤️", "👍", "🤔", "👀", "🌟"];

export default function StoryCreateModal() {
  const { showStoryCreate, setShowStoryCreate, createStory, showToast } = useApp();
  
  // File upload preview
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [caption, setCaption] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  
  // Interactive Editor States
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [texts, setTexts] = useState<TextOverlay[]>([]);
  const [tags, setTags] = useState<TagOverlay[]>([]);
  const [activeFilter, setActiveFilter] = useState(FILTERS[0]);
  const [selectedFeeling, setSelectedFeeling] = useState<string>("");

  // Toolbar Selection States
  const [activeTool, setActiveTool] = useState<"none" | "sticker" | "text" | "tag">("none");
  const [selectedEmoji, setSelectedEmoji] = useState("");
  const [currentText, setCurrentText] = useState("");
  const [currentTextColor, setCurrentTextColor] = useState("#ffffff");
  const [currentTag, setCurrentTag] = useState("");

  // Audio States
  const [audioSourceType, setAudioSourceType] = useState<"none" | "preset" | "upload">("none");
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number | null>(null);
  const [customAudioFile, setCustomAudioFile] = useState<File | null>(null);
  const [customAudioName, setCustomAudioName] = useState("");

  // Sidebar Tab States
  const [activeTab, setActiveTab] = useState<"editor" | "audio" | "filter" | "settings">("editor");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  if (!showStoryCreate) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
    }
  };

  const handleAudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setCustomAudioFile(selected);
      setCustomAudioName(selected.name);
      setAudioSourceType("upload");
      showToast("Audio track uploaded!", "success");
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreviewUrl("");
    setCaption("");
    setStickers([]);
    setTexts([]);
    setTags([]);
    setActiveFilter(FILTERS[0]);
    setSelectedFeeling("");
    setActiveTool("none");
    setAudioSourceType("none");
    setSelectedPresetIndex(null);
    setCustomAudioFile(null);
    setCustomAudioName("");
    setIsUploading(false);
    setShowStoryCreate(false);
  };

  const handlePreviewClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    if (activeTool === "sticker" && selectedEmoji) {
      setStickers((prev) => [...prev, { id: String(Date.now()), emoji: selectedEmoji, x, y }]);
      setActiveTool("none");
      showToast("Sticker placed!", "success");
    } else if (activeTool === "text" && currentText.trim()) {
      setTexts((prev) => [...prev, { id: String(Date.now()), text: currentText.trim(), color: currentTextColor, x, y }]);
      setCurrentText("");
      setActiveTool("none");
      showToast("Text placed!", "success");
    } else if (activeTool === "tag" && currentTag.trim()) {
      let t = currentTag.trim();
      if (!t.startsWith("@")) t = "@" + t;
      setTags((prev) => [...prev, { id: String(Date.now()), username: t, x, y }]);
      setCurrentTag("");
      setActiveTool("none");
      showToast("User tag placed!", "success");
    }
  };

  const removeSticker = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setStickers((prev) => prev.filter((s) => s.id !== id));
  };

  const removeText = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTexts((prev) => prev.filter((t) => t.id !== id));
  };

  const removeTag = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTags((prev) => prev.filter((t) => t.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    try {
      setIsUploading(true);

      const metadata = {
        stickers,
        texts,
        tags,
        feeling: selectedFeeling,
        filterClass: activeFilter.name,
      };

      const opts: any = {
        caption,
        metadata,
      };

      if (audioSourceType === "preset" && selectedPresetIndex !== null) {
        opts.audioUrl = PRESET_AUDIOS[selectedPresetIndex].url;
        opts.musicName = PRESET_AUDIOS[selectedPresetIndex].name;
      } else if (audioSourceType === "upload" && customAudioFile) {
        opts.audioFile = customAudioFile;
        opts.musicName = customAudioName;
      }

      await createStory(file, opts);
      handleClose();
    } catch (err) {
      console.error(err);
      showToast("Failed to create story", "info");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[200] flex items-center justify-center p-4 select-none">
      <div className="bg-zinc-950 border border-zinc-900 rounded-3xl w-full max-w-[850px] overflow-hidden flex flex-col md:flex-row text-white h-[90vh] md:h-[750px] shadow-2xl">
        
        {/* Left Side: Editor Viewport */}
        <div className="flex-1 bg-zinc-900 flex flex-col items-center justify-center relative border-r border-zinc-900/60 p-4 min-h-[350px] md:min-h-0">
          <div className="flex items-center justify-between w-full p-2 absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest pl-2">Viewport Preview</span>
            {previewUrl && (
              <button
                type="button"
                onClick={() => { setFile(null); setPreviewUrl(""); }}
                className="bg-black/50 hover:bg-black/80 text-white p-1.5 rounded-full backdrop-blur-sm transition mr-2"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {previewUrl ? (
            <div 
              onClick={handlePreviewClick}
              className={`relative aspect-[9/16] h-[90%] max-h-[500px] bg-black rounded-2xl overflow-hidden border border-zinc-800 shadow-lg cursor-crosshair group`}
            >
              {/* Media Element with filter applied */}
              {file?.type.startsWith("video") ? (
                <video
                  src={previewUrl}
                  muted
                  playsInline
                  autoPlay
                  loop
                  style={activeFilter.style}
                  className="w-full h-full object-contain"
                />
              ) : (
                <img
                  src={previewUrl}
                  alt="Story preview"
                  style={activeFilter.style}
                  className="w-full h-full object-contain"
                />
              )}

              {/* Dynamic Overlays Rendering */}
              {stickers.map((s) => (
                <div 
                  key={s.id} 
                  style={{ left: `${s.x}%`, top: `${s.y}%` }} 
                  className="absolute -translate-x-1/2 -translate-y-1/2 text-[38px] drop-shadow-lg z-20 group/overlay select-none cursor-pointer"
                >
                  <span>{s.emoji}</span>
                  <button 
                    onClick={(e) => removeSticker(s.id, e)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover/overlay:opacity-100 transition shadow"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}

              {texts.map((t) => (
                <div 
                  key={t.id} 
                  style={{ left: `${t.x}%`, top: `${t.y}%`, color: t.color }} 
                  className="absolute -translate-x-1/2 -translate-y-1/2 font-extrabold text-[18px] bg-black/60 px-3 py-1 rounded-lg drop-shadow-md z-20 group/overlay text-center whitespace-nowrap"
                >
                  {t.text}
                  <button 
                    onClick={(e) => removeText(t.id, e)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover/overlay:opacity-100 transition shadow"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}

              {tags.map((tg) => (
                <div 
                  key={tg.id} 
                  style={{ left: `${tg.x}%`, top: `${tg.y}%` }} 
                  className="absolute -translate-x-1/2 -translate-y-1/2 font-bold text-[13px] bg-sky-500/90 text-white px-2.5 py-1 rounded-full border border-sky-400 drop-shadow-md z-20 group/overlay text-center whitespace-nowrap tracking-wide"
                >
                  {tg.username}
                  <button 
                    onClick={(e) => removeTag(tg.id, e)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover/overlay:opacity-100 transition shadow"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}

              {/* Mood Overlay Badge */}
              {selectedFeeling && (
                <div className="absolute top-4 left-4 bg-zinc-950/80 backdrop-blur border border-white/10 px-3 py-1 rounded-full text-xs font-bold z-20 shadow flex items-center gap-1.5 animate-pulse">
                  <span>Feeling:</span>
                  <span>{selectedFeeling}</span>
                </div>
              )}

              {/* Music overlay Badge */}
              {(audioSourceType !== "none") && (
                <div className="absolute bottom-4 left-4 right-4 bg-zinc-950/85 backdrop-blur border border-white/10 p-2 rounded-xl text-[10px] font-bold z-20 flex items-center gap-2 text-zinc-300">
                  <Music size={12} className="text-white animate-spin" />
                  <span className="truncate">Playing Background Music: {audioSourceType === "preset" ? PRESET_AUDIOS[selectedPresetIndex!].name : customAudioName}</span>
                </div>
              )}

              {/* Tool instructions */}
              {activeTool !== "none" && (
                <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px] flex items-center justify-center pointer-events-none p-4 text-center z-30">
                  <span className="bg-black/90 border border-zinc-800 text-white text-xs px-4 py-2 rounded-full font-bold">
                    Click anywhere on the preview to place your {activeTool}!
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-3 cursor-pointer text-zinc-500 hover:text-zinc-300 transition p-6 text-center select-none"
            >
              <div className="w-16 h-16 rounded-full bg-zinc-950 border border-zinc-900 flex items-center justify-center hover:scale-105 transition">
                <Upload size={28} />
              </div>
              <div>
                <p className="font-semibold text-sm text-zinc-300">Upload photo or video</p>
                <p className="text-xs text-zinc-600 mt-1">Recommended: 9:16 aspect ratio</p>
              </div>
            </div>
          )}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*,video/*"
            className="hidden"
          />
        </div>

        {/* Right Side: Tabbed Settings Sidebar */}
        <div className="w-full md:w-[360px] bg-zinc-950 flex flex-col overflow-hidden h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4.5 border-b border-zinc-900">
            <h2 className="text-[16px] font-extrabold tracking-wide text-gradient-instagram">Create Story</h2>
            <button
              onClick={handleClose}
              className="text-zinc-400 hover:text-white p-1 hover:bg-zinc-900 rounded-full transition"
            >
              <X size={18} />
            </button>
          </div>

          {/* Tab Selection */}
          <div className="flex border-b border-zinc-900/60 text-xs text-zinc-400 select-none">
            <button
              onClick={() => setActiveTab("editor")}
              className={`flex-1 py-3 text-center border-b-2 font-bold transition ${activeTab === "editor" ? "border-white text-white" : "border-transparent hover:text-white"}`}
            >
              Overlays
            </button>
            <button
              onClick={() => setActiveTab("audio")}
              className={`flex-1 py-3 text-center border-b-2 font-bold transition ${activeTab === "audio" ? "border-white text-white" : "border-transparent hover:text-white"}`}
            >
              Audio
            </button>
            <button
              onClick={() => setActiveTab("filter")}
              className={`flex-1 py-3 text-center border-b-2 font-bold transition ${activeTab === "filter" ? "border-white text-white" : "border-transparent hover:text-white"}`}
            >
              Filter / Mood
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`flex-1 py-3 text-center border-b-2 font-bold transition ${activeTab === "settings" ? "border-white text-white" : "border-transparent hover:text-white"}`}
            >
              Post
            </button>
          </div>

          {/* Sidebar Tab Panels */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scroll text-sm">
            {activeTab === "editor" && (
              <div className="space-y-5">
                {/* 1. Emoji Stickers Picker */}
                <div className="space-y-2.5">
                  <label className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider block">
                    Emoji Stickers
                  </label>
                  <div className="grid grid-cols-7 gap-2.5">
                    {EMOJI_STICKERS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          setSelectedEmoji(emoji);
                          setActiveTool("sticker");
                        }}
                        className={`text-[24px] hover:scale-125 transition cursor-pointer p-1 rounded-xl bg-zinc-900 border ${activeTool === "sticker" && selectedEmoji === emoji ? "border-white" : "border-zinc-800/60"}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Text Overlay Input */}
                <div className="space-y-3 pt-3 border-t border-zinc-900">
                  <label className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider block">
                    Add Text Overlay
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={currentText}
                      onChange={(e) => setCurrentText(e.target.value)}
                      placeholder="Type text overlay..."
                      className="flex-1 bg-zinc-900 border border-zinc-850 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-zinc-700"
                    />
                    <input
                      type="color"
                      value={currentTextColor}
                      onChange={(e) => setCurrentTextColor(e.target.value)}
                      className="w-8 h-8 rounded-xl bg-transparent border-none outline-none cursor-pointer"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={!currentText.trim() || !previewUrl}
                    onClick={() => setActiveTool("text")}
                    className="w-full py-2 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Type size={12} />
                    Place Text
                  </button>
                </div>

                {/* 3. User Tag Input */}
                <div className="space-y-3 pt-3 border-t border-zinc-900">
                  <label className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider block">
                    Tag User
                  </label>
                  <input
                    type="text"
                    value={currentTag}
                    onChange={(e) => setCurrentTag(e.target.value)}
                    placeholder="@username"
                    className="w-full bg-zinc-900 border border-zinc-850 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-zinc-700"
                  />
                  <button
                    type="button"
                    disabled={!currentTag.trim() || !previewUrl}
                    onClick={() => setActiveTool("tag")}
                    className="w-full py-2 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Tag size={12} />
                    Place User Tag
                  </button>
                </div>
              </div>
            )}

            {activeTab === "audio" && (
              <div className="space-y-4">
                {/* Custom Audio Upload */}
                <div className="space-y-2">
                  <label className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider block">
                    Upload Custom Audio Track
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => audioInputRef.current?.click()}
                      className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                    >
                      <Upload size={12} />
                      Choose Audio File
                    </button>
                    {customAudioName && (
                      <span className="text-xs text-zinc-400 truncate max-w-[150px]">
                        {customAudioName}
                      </span>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={audioInputRef}
                    onChange={handleAudioFileChange}
                    accept="audio/*"
                    className="hidden"
                  />
                </div>

                {/* Preset Audio Selectors */}
                <div className="space-y-2.5 pt-3 border-t border-zinc-900">
                  <label className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider block">
                    Select Soundtrack Presets
                  </label>
                  <div className="space-y-2">
                    {PRESET_AUDIOS.map((track, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setAudioSourceType("preset");
                          setSelectedPresetIndex(idx);
                          setCustomAudioFile(null);
                          setCustomAudioName("");
                        }}
                        className={`w-full p-3 rounded-xl border text-left text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
                          audioSourceType === "preset" && selectedPresetIndex === idx
                            ? "bg-white text-black border-white"
                            : "bg-zinc-900 text-zinc-300 border-zinc-800/80 hover:bg-zinc-850"
                        }`}
                      >
                        <span className="truncate">{track.name}</span>
                        <Music size={12} />
                      </button>
                    ))}
                  </div>
                </div>

                {(audioSourceType !== "none") && (
                  <button
                    type="button"
                    onClick={() => {
                      setAudioSourceType("none");
                      setSelectedPresetIndex(null);
                      setCustomAudioFile(null);
                      setCustomAudioName("");
                    }}
                    className="w-full py-2 bg-red-950/20 text-red-400 hover:bg-red-950/40 border border-red-900/40 text-xs font-bold rounded-xl transition"
                  >
                    Remove Selected Music
                  </button>
                )}
              </div>
            )}

            {activeTab === "filter" && (
              <div className="space-y-5">
                {/* 1. Visual Filters */}
                <div className="space-y-2.5">
                  <label className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider block">
                    Visual Filters
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {FILTERS.map((f, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveFilter(f)}
                        className={`p-3 rounded-xl border text-xs font-bold text-center transition cursor-pointer ${
                          activeFilter.name === f.name
                            ? "bg-white text-black border-white"
                            : "bg-zinc-900 text-zinc-300 border-zinc-800/80 hover:bg-zinc-850"
                        }`}
                      >
                        {f.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Mood / Status Selector */}
                <div className="space-y-2.5 pt-3 border-t border-zinc-900">
                  <label className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider block">
                    Select Mood / Status
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {FEELINGS.map((feel) => (
                      <button
                        key={feel}
                        type="button"
                        onClick={() => setSelectedFeeling(feel === selectedFeeling ? "" : feel)}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold text-center transition cursor-pointer ${
                          selectedFeeling === feel
                            ? "bg-white text-black border-white"
                            : "bg-zinc-900 text-zinc-300 border-zinc-800/85 hover:bg-zinc-850"
                        }`}
                      >
                        {feel}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "settings" && (
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider block mb-1.5">
                    Story Caption
                  </label>
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Write a caption (optional)..."
                    rows={4}
                    maxLength={200}
                    className="w-full bg-zinc-900 border border-zinc-850 rounded-xl p-3 text-xs focus:border-zinc-700 outline-none resize-none placeholder-zinc-600 text-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Submit Action Block */}
          <div className="p-4 bg-zinc-950 border-t border-zinc-900">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!file || isUploading}
              className="w-full py-3 bg-white text-black font-extrabold rounded-xl hover:bg-zinc-200 transition disabled:opacity-55 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-xs uppercase tracking-wider shadow"
            >
              {isUploading ? "Sharing to Story..." : "Share Story ✨"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
