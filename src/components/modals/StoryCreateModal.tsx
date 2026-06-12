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
  bgStyle: "transparent" | "white" | "black";
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
  
  // File upload state
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [caption, setCaption] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  
  // Placed Overlays States
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [texts, setTexts] = useState<TextOverlay[]>([]);
  const [tags, setTags] = useState<TagOverlay[]>([]);
  const [activeFilter, setActiveFilter] = useState(FILTERS[0]);
  const [selectedFeeling, setSelectedFeeling] = useState<string>("");

  // Audio configuration
  const [audioSourceType, setAudioSourceType] = useState<"none" | "preset" | "upload">("none");
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number | null>(null);
  const [customAudioFile, setCustomAudioFile] = useState<File | null>(null);
  const [customAudioName, setCustomAudioName] = useState("");
  const [audioCardPos, setAudioCardPos] = useState({ x: 50, y: 80 });
  const [audioCardShape, setAudioCardShape] = useState<"card" | "list" | "transparent" | "icon" | "remove">("card");

  // Floating Popover UI states
  const [showTextCreator, setShowTextCreator] = useState(false);
  const [showStickerCreator, setShowStickerCreator] = useState(false);
  const [showTagCreator, setShowTagCreator] = useState(false);
  const [showMusicCreator, setShowMusicCreator] = useState(false);
  const [showFilterSelector, setShowFilterSelector] = useState(false);
  const [showMoodSelector, setShowMoodSelector] = useState(false);
  const [showCaptionSelector, setShowCaptionSelector] = useState(false);

  // Text inputs
  const [inputText, setInputText] = useState("");
  const [inputTextColor, setInputTextColor] = useState("#ffffff");
  const [inputTag, setInputTag] = useState("");

  // Dragging States
  const [draggedItem, setDraggedItem] = useState<{ id: string; type: "sticker" | "text" | "tag" | "audio" } | null>(null);
  const pointerStartPos = useRef({ x: 0, y: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

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
      setAudioCardPos({ x: 50, y: 80 });
      setAudioCardShape("card");
      setShowMusicCreator(false);
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
    setAudioSourceType("none");
    setSelectedPresetIndex(null);
    setCustomAudioFile(null);
    setCustomAudioName("");
    setAudioCardShape("card");
    setIsUploading(false);
    setShowStoryCreate(false);
  };

  // Drag Handlers
  const handlePointerDown = (id: string, type: "sticker" | "text" | "tag" | "audio", e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDraggedItem({ id, type });
    pointerStartPos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggedItem || !viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    if (draggedItem.type === "sticker") {
      setStickers((prev) => prev.map((s) => (s.id === draggedItem.id ? { ...s, x, y } : s)));
    } else if (draggedItem.type === "text") {
      setTexts((prev) => prev.map((t) => (t.id === draggedItem.id ? { ...t, x, y } : t)));
    } else if (draggedItem.type === "tag") {
      setTags((prev) => prev.map((t) => (t.id === draggedItem.id ? { ...t, x, y } : t)));
    } else if (draggedItem.type === "audio") {
      setAudioCardPos({ x, y });
    }
  };

  const handlePointerUp = (id: string, type: "sticker" | "text" | "tag" | "audio", e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.releasePointerCapture(e.pointerId);
    setDraggedItem(null);

    // Differentiate drag vs click (distance < 6px)
    const dist = Math.hypot(e.clientX - pointerStartPos.current.x, e.clientY - pointerStartPos.current.y);
    if (dist < 6) {
      if (type === "text") {
        // Cycle text bg: transparent -> white -> black
        setTexts((prev) =>
          prev.map((t) => {
            if (t.id === id) {
              const nextStyle =
                t.bgStyle === "transparent" ? "white" : t.bgStyle === "white" ? "black" : "transparent";
              return { ...t, bgStyle: nextStyle };
            }
            return t;
          })
        );
      } else if (type === "audio") {
        // Cycle audio card shape: card -> list -> transparent -> icon -> remove
        setAudioCardShape((prev) => {
          switch (prev) {
            case "card": return "list";
            case "list": return "transparent";
            case "transparent": return "icon";
            case "icon": return "remove";
            default: return "card";
          }
        });
      }
    }
  };

  const handleTextDoubleClick = (id: string, text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newText = prompt("Edit text overlay:", text);
    if (newText !== null && newText.trim() !== "") {
      setTexts((prev) => prev.map((t) => (t.id === id ? { ...t, text: newText.trim() } : t)));
      showToast("Text updated!", "success");
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
        audioCardPos,
        audioCardShape,
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

  const musicName = audioSourceType === "preset" && selectedPresetIndex !== null ? PRESET_AUDIOS[selectedPresetIndex].name : customAudioName;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[200] flex items-center justify-center p-4 select-none animate-fade-in">
      <div className="bg-zinc-950 border border-zinc-900 rounded-3xl w-auto max-w-[420px] aspect-[9/16] overflow-hidden flex flex-col text-white h-[90vh] max-h-[750px] shadow-2xl relative animate-scale-up">
        
        {/* Left Side: Drag-and-Drop Viewport Editor */}
        <div className="w-full h-full bg-zinc-900 flex flex-col items-center justify-center relative p-0 overflow-hidden">
          
          {previewUrl ? (
            <div 
              ref={viewportRef}
              onPointerMove={handlePointerMove}
              className="relative w-full h-full bg-black overflow-hidden shadow-lg group"
            >
              {/* Media Preview Container */}
              {file?.type.startsWith("video") ? (
                <video
                  src={previewUrl}
                  muted
                  playsInline
                  autoPlay
                  loop
                  style={activeFilter.style}
                  className="w-full h-full object-cover pointer-events-none"
                />
              ) : (
                <img
                  src={previewUrl}
                  alt="Story preview"
                  style={activeFilter.style}
                  className="w-full h-full object-cover pointer-events-none"
                />
              )}

              {/* Top Left Close Button */}
              <div className="absolute top-4 left-4 z-40">
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center border border-white/10 transition shadow hover:scale-105 active:scale-95"
                  title="Close"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Top Right Overlay Buttons (Facebook-style Toolbar) */}
              <div className="absolute top-4 right-4 flex flex-col gap-2.5 z-40">
                <button
                  type="button"
                  onClick={() => setShowTextCreator(true)}
                  className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center border border-white/10 transition shadow hover:scale-105 active:scale-95"
                  title="Add Text"
                >
                  <Type size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setShowMusicCreator(true)}
                  className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center border border-white/10 transition shadow hover:scale-105 active:scale-95"
                  title="Add Music"
                >
                  <Music size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setShowTagCreator(true)}
                  className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center border border-white/10 transition shadow hover:scale-105 active:scale-95"
                  title="Tag User"
                >
                  <Tag size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setShowStickerCreator(true)}
                  className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center border border-white/10 transition shadow hover:scale-105 active:scale-95"
                  title="Add Emoji Sticker"
                >
                  <Smile size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setShowFilterSelector(true)}
                  className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center border border-white/10 transition shadow hover:scale-105 active:scale-95"
                  title="Visual Filters"
                >
                  <Palette size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setShowMoodSelector(true)}
                  className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center border border-white/10 transition shadow hover:scale-105 active:scale-95"
                  title="Mood Status"
                >
                  <Sparkles size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setShowCaptionSelector(true)}
                  className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center border border-white/10 transition shadow hover:scale-105 active:scale-95"
                  title="Add Caption"
                >
                  <SmilePlus size={16} />
                </button>
              </div>

              {/* Draggable Emojis Overlays */}
              {stickers.map((s) => (
                <div 
                  key={s.id} 
                  style={{ left: `${s.x}%`, top: `${s.y}%` }} 
                  onPointerDown={(e) => handlePointerDown(s.id, "sticker", e)}
                  onPointerUp={(e) => handlePointerUp(s.id, "sticker", e)}
                  className="absolute -translate-x-1/2 -translate-y-1/2 text-[38px] drop-shadow-lg z-20 group/overlay select-none cursor-grab active:cursor-grabbing touch-none"
                >
                  <span>{s.emoji}</span>
                  <button 
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => removeSticker(s.id, e)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover/overlay:opacity-100 transition shadow cursor-pointer"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}

              {/* Draggable Custom Texts Overlays */}
              {texts.map((t) => {
                const getStyle = () => {
                  if (t.bgStyle === "white") {
                    return { color: "#000000", backgroundColor: "#ffffff" };
                  }
                  if (t.bgStyle === "black") {
                    return { color: "#ffffff", backgroundColor: "#000000" };
                  }
                  return { color: t.color, backgroundColor: "transparent", textShadow: "0 2px 4px rgba(0,0,0,0.8)" };
                };

                return (
                  <div 
                    key={t.id} 
                    style={{ left: `${t.x}%`, top: `${t.y}%`, ...getStyle() }} 
                    onPointerDown={(e) => handlePointerDown(t.id, "text", e)}
                    onPointerUp={(e) => handlePointerUp(t.id, "text", e)}
                    onDoubleClick={(e) => handleTextDoubleClick(t.id, t.text, e)}
                    className="absolute -translate-x-1/2 -translate-y-1/2 font-extrabold text-[17px] px-3 py-1 rounded-lg z-20 group/overlay text-center whitespace-nowrap cursor-grab active:cursor-grabbing select-none touch-none"
                  >
                    {t.text}
                    <button 
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => removeText(t.id, e)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover/overlay:opacity-100 transition shadow cursor-pointer"
                    >
                      <X size={10} />
                    </button>
                  </div>
                );
              })}

              {/* Draggable User Tags Overlays */}
              {tags.map((tg) => (
                <div 
                  key={tg.id} 
                  style={{ left: `${tg.x}%`, top: `${tg.y}%` }} 
                  onPointerDown={(e) => handlePointerDown(tg.id, "tag", e)}
                  onPointerUp={(e) => handlePointerUp(tg.id, "tag", e)}
                  className="absolute -translate-x-1/2 -translate-y-1/2 font-bold text-[13px] bg-sky-500/90 text-white px-2.5 py-1 rounded-full border border-sky-400 drop-shadow-md z-20 group/overlay text-center whitespace-nowrap cursor-grab active:cursor-grabbing select-none touch-none"
                >
                  {tg.username}
                  <button 
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => removeTag(tg.id, e)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover/overlay:opacity-100 transition shadow cursor-pointer"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}

              {/* Draggable Audio Card Overlay */}
              {(audioSourceType !== "none") && (
                <div
                  style={{ left: `${audioCardPos.x}%`, top: `${audioCardPos.y}%` }}
                  onPointerDown={(e) => handlePointerDown("audio", "audio", e)}
                  onPointerUp={(e) => handlePointerUp("audio", "audio", e)}
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-grab active:cursor-grabbing select-none touch-none"
                >
                  {audioCardShape === "card" && (
                    <div className="bg-black/80 border border-zinc-800 p-2.5 rounded-xl flex items-center gap-2 max-w-[180px] shadow-lg">
                      <Music size={13} className="text-pink-500 animate-pulse" />
                      <span className="text-[11px] truncate font-bold text-white">{musicName}</span>
                    </div>
                  )}
                  {audioCardShape === "list" && (
                    <div className="bg-zinc-950/70 py-1 px-3 rounded-full flex items-center gap-1.5 shadow text-[10px] font-semibold border border-white/10 text-white">
                      <Music size={9} className="text-white" />
                      <span className="truncate max-w-[100px]">{musicName}</span>
                    </div>
                  )}
                  {audioCardShape === "transparent" && (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-white drop-shadow-md bg-transparent">
                      <Music size={10} className="text-pink-400" />
                      <span className="truncate max-w-[120px]">{musicName}</span>
                    </div>
                  )}
                  {audioCardShape === "icon" && (
                    <div className="w-8 h-8 rounded-full bg-pink-500 flex items-center justify-center text-white shadow-lg">
                      <Music size={12} className="animate-spin" />
                    </div>
                  )}
                  {audioCardShape === "remove" && (
                    <button 
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); setAudioSourceType("none"); }} 
                      className="bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1 shadow cursor-pointer"
                    >
                      <X size={10} /> Remove Audio
                    </button>
                  )}
                </div>
              )}

              {/* Mood Overlay Badge */}
              {selectedFeeling && (
                <div className="absolute top-4 left-16 bg-zinc-950/80 backdrop-blur border border-white/10 px-3 py-1 rounded-full text-[10px] font-bold z-20 shadow flex items-center gap-1.5 animate-pulse">
                  <span>{selectedFeeling}</span>
                </div>
              )}

              {/* Bottom Left Privacy Button */}
              <div className="absolute bottom-4 left-4 z-40">
                <button
                  type="button"
                  onClick={() => showToast("Story privacy: Friends Only 🔒", "info")}
                  className="px-3.5 py-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center gap-1 border border-white/10 transition shadow hover:scale-105 active:scale-95 text-[11px] font-extrabold"
                >
                  🔒 Friends
                </button>
              </div>

              {/* Bottom Right Share Button */}
              <div className="absolute bottom-4 right-4 z-40">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isUploading}
                  className="px-4.5 py-2 rounded-full bg-insta-blue hover:bg-insta-blue/90 text-white flex items-center gap-1 transition shadow hover:scale-105 active:scale-95 text-[11px] font-extrabold uppercase tracking-wide disabled:opacity-50"
                >
                  {isUploading ? "Sharing..." : "Share Story ✨"}
                </button>
              </div>

            </div>
          ) : (
            <div className="flex flex-col items-center justify-center w-full h-full relative">
              {/* Close button for upload screen */}
              <div className="absolute top-4 left-4 z-40">
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center border border-white/10 transition shadow hover:scale-105 active:scale-95"
                  title="Close"
                >
                  <X size={16} />
                </button>
              </div>

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

      </div>

      {/* Floating Creators Popovers (Facebook Style) */}
      
      {/* 1. Text Creator Popover */}
      {showTextCreator && (
        <div className="fixed inset-0 bg-black/85 z-[250] flex flex-col items-center justify-center p-4 animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-[400px] p-5 flex flex-col gap-4 text-white shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm tracking-wider uppercase text-zinc-400">Add Custom Text</h3>
              <button onClick={() => setShowTextCreator(false)} className="p-1 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition">
                <X size={16} />
              </button>
            </div>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type your story text here..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-zinc-700"
              autoFocus
            />
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-zinc-400 font-bold">Text Color:</span>
              <input
                type="color"
                value={inputTextColor}
                onChange={(e) => setInputTextColor(e.target.value)}
                className="w-8 h-8 rounded-xl bg-transparent border-none outline-none cursor-pointer"
              />
            </div>
            <button
              type="button"
              disabled={!inputText.trim()}
              onClick={() => {
                setTexts((prev) => [...prev, { id: String(Date.now()), text: inputText.trim(), color: inputTextColor, bgStyle: "transparent", x: 50, y: 50 }]);
                setInputText("");
                setShowTextCreator(false);
                showToast("Text added! Drag to reposition.", "success");
              }}
              className="w-full py-2.5 bg-white text-black font-extrabold rounded-xl hover:bg-zinc-200 transition disabled:opacity-40"
            >
              Add to Story
            </button>
          </div>
        </div>
      )}

      {/* 2. Emoji Sticker Selector */}
      {showStickerCreator && (
        <div className="fixed inset-0 bg-black/85 z-[250] flex flex-col items-center justify-center p-4 animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-[400px] p-5 flex flex-col gap-4 text-white shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm tracking-wider uppercase text-zinc-400">Choose Emoji Sticker</h3>
              <button onClick={() => setShowStickerCreator(false)} className="p-1 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-5 gap-3.5 max-h-[200px] overflow-y-auto p-1 custom-scroll">
              {EMOJI_STICKERS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    setStickers((prev) => [...prev, { id: String(Date.now()), emoji, x: 50, y: 50 }]);
                    setShowStickerCreator(false);
                    showToast("Sticker added! Drag to reposition.", "success");
                  }}
                  className="text-[32px] hover:scale-125 transition cursor-pointer p-1.5 rounded-xl bg-zinc-955 border border-zinc-800/80 flex items-center justify-center"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. User Tag Creator */}
      {showTagCreator && (
        <div className="fixed inset-0 bg-black/85 z-[250] flex flex-col items-center justify-center p-4 animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-[400px] p-5 flex flex-col gap-4 text-white shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm tracking-wider uppercase text-zinc-400">Mention User</h3>
              <button onClick={() => setShowTagCreator(false)} className="p-1 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition">
                <X size={16} />
              </button>
            </div>
            <input
              type="text"
              value={inputTag}
              onChange={(e) => setInputTag(e.target.value)}
              placeholder="e.g. alex_dev"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-zinc-700"
              autoFocus
            />
            <button
              type="button"
              disabled={!inputTag.trim()}
              onClick={() => {
                let tag = inputTag.trim();
                if (!tag.startsWith("@")) tag = "@" + tag;
                setTags((prev) => [...prev, { id: String(Date.now()), username: tag, x: 50, y: 50 }]);
                setInputTag("");
                setShowTagCreator(false);
                showToast("Tag added! Drag to reposition.", "success");
              }}
              className="w-full py-2.5 bg-white text-black font-extrabold rounded-xl hover:bg-zinc-200 transition disabled:opacity-40"
            >
              Add to Story
            </button>
          </div>
        </div>
      )}

      {/* 4. Music Soundtrack Selector */}
      {showMusicCreator && (
        <div className="fixed inset-0 bg-black/85 z-[250] flex flex-col items-center justify-center p-4 animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-[400px] p-5 flex flex-col gap-4 text-white shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm tracking-wider uppercase text-zinc-400">Choose Soundtrack</h3>
              <button onClick={() => setShowMusicCreator(false)} className="p-1 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition">
                <X size={16} />
              </button>
            </div>

            {/* Custom Track Upload */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">
                Upload Custom Audio
              </label>
              <button
                type="button"
                onClick={() => audioInputRef.current?.click()}
                className="w-full py-2 bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <Upload size={12} /> Choose MP3 File
              </button>
              <input
                type="file"
                ref={audioInputRef}
                onChange={handleAudioFileChange}
                accept="audio/*"
                className="hidden"
              />
            </div>

            {/* Presets List */}
            <div className="space-y-1.5 pt-2 border-t border-zinc-850">
              <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">
                Select Soundtrack Presets
              </label>
              <div className="space-y-2 max-h-[160px] overflow-y-auto p-0.5 custom-scroll">
                {PRESET_AUDIOS.map((track, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setAudioSourceType("preset");
                      setSelectedPresetIndex(idx);
                      setCustomAudioFile(null);
                      setCustomAudioName("");
                      setAudioCardPos({ x: 50, y: 80 });
                      setAudioCardShape("card");
                      setShowMusicCreator(false);
                    }}
                    className={`w-full p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
                      audioSourceType === "preset" && selectedPresetIndex === idx
                        ? "bg-white text-black border-white"
                        : "bg-zinc-950 text-zinc-300 border-zinc-850 hover:bg-zinc-900"
                    }`}
                  >
                    <span className="truncate">{track.name}</span>
                    <Music size={11} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Filter Selector Popover */}
      {showFilterSelector && (
        <div className="fixed inset-0 bg-black/85 z-[250] flex flex-col items-center justify-center p-4 animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-[400px] p-5 flex flex-col gap-4 text-white shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm tracking-wider uppercase text-zinc-400">Visual Filters</h3>
              <button onClick={() => setShowFilterSelector(false)} className="p-1 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {FILTERS.map((f, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setActiveFilter(f);
                    setShowFilterSelector(false);
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-bold text-center transition cursor-pointer ${
                    activeFilter.name === f.name
                      ? "bg-white text-black border-white"
                      : "bg-zinc-950 text-zinc-300 border-zinc-850 hover:bg-zinc-900"
                  }`}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 6. Mood Selector Popover */}
      {showMoodSelector && (
        <div className="fixed inset-0 bg-black/85 z-[250] flex flex-col items-center justify-center p-4 animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-[400px] p-5 flex flex-col gap-4 text-white shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm tracking-wider uppercase text-zinc-400">Mood Status</h3>
              <button onClick={() => setShowMoodSelector(false)} className="p-1 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto custom-scroll p-1">
              {FEELINGS.map((feel) => (
                <button
                  key={feel}
                  type="button"
                  onClick={() => {
                    setSelectedFeeling(feel === selectedFeeling ? "" : feel);
                    setShowMoodSelector(false);
                  }}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold text-center transition cursor-pointer ${
                    selectedFeeling === feel
                      ? "bg-white text-black border-white"
                      : "bg-zinc-955 text-zinc-300 border-zinc-850 hover:bg-zinc-900"
                  }`}
                >
                  {feel}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 7. Caption Selector Popover */}
      {showCaptionSelector && (
        <div className="fixed inset-0 bg-black/85 z-[250] flex flex-col items-center justify-center p-4 animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-[400px] p-5 flex flex-col gap-4 text-white shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm tracking-wider uppercase text-zinc-400">Add Caption</h3>
              <button onClick={() => setShowCaptionSelector(false)} className="p-1 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition">
                <X size={16} />
              </button>
            </div>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a caption (optional)..."
              rows={3}
              maxLength={200}
              className="w-full bg-zinc-950 border border-zinc-855 rounded-xl p-3 text-xs focus:border-zinc-700 outline-none resize-none placeholder-zinc-650 text-white"
            />
            <button
              type="button"
              onClick={() => setShowCaptionSelector(false)}
              className="w-full py-2.5 bg-white text-black font-extrabold rounded-xl hover:bg-zinc-200 transition"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
