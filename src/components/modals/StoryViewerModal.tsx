"use client";

import React, { useEffect, useState, useRef } from "react";
import { useApp } from "../AppContext";
import { X, Trash2, Send, Heart, Eye, Music, Award, MessageSquare } from "lucide-react";
import { api } from "../../lib/api";

interface EmojiParticle {
  id: number;
  emoji: string;
  left: number;
  rotate: number;
  duration: number;
}

const FILTERS = [
  { name: "Normal", class: "", style: {} },
  { name: "Vintage Sepia", class: "", style: { filter: "sepia(0.8) contrast(1.2) brightness(0.9)" } },
  { name: "Grayscale Noir", class: "", style: { filter: "grayscale(1) contrast(1.4)" } },
  { name: "Warm Sun", class: "", style: { filter: "saturate(1.5) sepia(0.15) contrast(1.05)" } },
  { name: "Cool Breeze", class: "", style: { filter: "hue-rotate(15deg) saturate(1.1) brightness(1.05)" } },
  { name: "Retro Haze", class: "", style: { filter: "contrast(0.9) brightness(1.1) sepia(0.1)" } },
];

export default function StoryViewerModal() {
  const {
    storyViewerIndex,
    setStoryViewerIndex,
    storyGroups,
    currentUser,
    loadStories,
    showToast,
  } = useApp();

  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [particles, setParticles] = useState<EmojiParticle[]>([]);
  
  // Creator analytics panel
  const [interactions, setInteractions] = useState<any[]>([]);
  const [loadingInteractions, setLoadingInteractions] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const groupIndex = storyViewerIndex ?? 0;
  const currentGroup = storyGroups[groupIndex];
  const safeActiveStoryIndex = activeStoryIndex >= (currentGroup?.stories.length ?? 0) ? 0 : activeStoryIndex;
  const activeStory = currentGroup?.stories[safeActiveStoryIndex];

  // Reset active story index when group changes
  useEffect(() => {
    setActiveStoryIndex(0);
    setProgress(0);
    setReplyText("");
    setShowAnalytics(false);
  }, [storyViewerIndex]);

  // Load interactions for the creator
  const loadInteractions = () => {
    if (!activeStory || !currentUser || currentUser.id !== activeStory.userId) {
      setInteractions([]);
      return;
    }
    setLoadingInteractions(true);
    api.getStoryInteractions(activeStory.id)
      .then((data) => {
        setInteractions(data || []);
      })
      .catch((err) => console.warn("Interactions load error:", err))
      .finally(() => setLoadingInteractions(false));
  };

  useEffect(() => {
    loadInteractions();
  }, [activeStory?.id, currentUser?.id]);

  // Record visit/view interaction
  useEffect(() => {
    if (!activeStory || !currentUser) return;
    if (activeStory.userId === currentUser.id) return;
    api.recordStoryInteraction(activeStory.id, 'view')
      .then(() => {
        loadInteractions();
      })
      .catch(() => {});
  }, [activeStory?.id, currentUser?.id]);

  // Background Audio Handler
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (activeStory?.audioUrl) {
      audio.src = activeStory.audioUrl;
      audio.load();
      if (!isPaused) {
        audio.play().catch(() => {});
      }
    } else {
      audio.src = "";
    }
  }, [activeStory?.audioUrl, safeActiveStoryIndex]);

  // Pause audio when isPaused changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPaused) {
      audio.pause();
    } else if (activeStory?.audioUrl && audio.paused) {
      audio.play().catch(() => {});
    }
  }, [isPaused, activeStory?.audioUrl]);

  // Story Timer handler
  useEffect(() => {
    if (storyViewerIndex === null || !currentGroup || isPaused || showAnalytics) return;

    setProgress(0);
    const duration = 5000; // 5 seconds per story
    const intervalTime = 50; // update every 50ms
    const step = (intervalTime / duration) * 100;

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + step;
      });
    }, intervalTime);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [storyViewerIndex, isPaused, groupIndex, activeStoryIndex, currentGroup, showAnalytics]);

  if (storyViewerIndex === null || !currentGroup || !activeStory) return null;

  const handleNext = () => {
    if (activeStoryIndex < currentGroup.stories.length - 1) {
      setActiveStoryIndex((prev) => prev + 1);
      setProgress(0);
    } else if (groupIndex < storyGroups.length - 1) {
      setStoryViewerIndex(groupIndex + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (activeStoryIndex > 0) {
      setActiveStoryIndex((prev) => prev - 1);
      setProgress(0);
    } else if (groupIndex > 0) {
      const prevGroup = storyGroups[groupIndex - 1];
      setStoryViewerIndex(groupIndex - 1);
      setTimeout(() => {
        setActiveStoryIndex(prevGroup.stories.length - 1);
      }, 0);
    } else {
      setProgress(0);
    }
  };

  const handleClose = () => {
    setStoryViewerIndex(null);
    setProgress(0);
    setActiveStoryIndex(0);
    setReplyText("");
    setParticles([]);
    setShowAnalytics(false);
  };

  const handleDelete = async () => {
    if (!activeStory) return;
    try {
      setIsPaused(true);
      if (confirm("Delete this story?")) {
        await api.deleteStory(activeStory.id);
        showToast("Story deleted! 🗑️", "success");
        await loadStories();
        if (currentGroup.stories.length <= 1) {
          handleClose();
        } else {
          if (activeStoryIndex >= currentGroup.stories.length - 1) {
            setActiveStoryIndex(activeStoryIndex - 1);
          } else {
            setProgress(0);
          }
        }
      }
    } catch (err: any) {
      showToast(err.message || "Failed to delete story", "info");
    } finally {
      setIsPaused(false);
    }
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    const text = replyText;
    setReplyText("");
    setIsPaused(false);
    showToast("Story reply sent! ✉️", "success");

    try {
      await api.recordStoryInteraction(activeStory.id, 'message', text);
      if (currentGroup?.userId && currentUser?.id && currentGroup.userId !== currentUser.id) {
        const conv = await api.createConversation({ isGroup: false, participantIds: [currentGroup.userId] });
        await api.sendMessage({ conversationId: conv.id, text: `Replied to your story: "${text}" 📸` });
      }
      loadInteractions();
    } catch (err) {
      console.error("Failed to send story reply:", err);
    }
  };

  const handleLikeToggle = async () => {
    try {
      const result = await api.recordStoryInteraction(activeStory.id, 'like');
      if (result && (result as any).status === 'unliked') {
        showToast("Story unliked 🤍", "info");
      } else {
        showToast("Story liked ❤️", "success");
      }
      loadInteractions();
    } catch (err) {
      console.error("Failed to toggle story like:", err);
    }
  };

  const triggerReaction = async (emoji: string) => {
    const newParticles: EmojiParticle[] = Array.from({ length: 15 }).map((_, i) => ({
      id: Date.now() + i + Math.random(),
      emoji,
      left: Math.random() * 80 + 10,
      rotate: Math.random() * 60 - 30,
      duration: Math.random() * 1.5 + 1.2,
    }));

    setParticles((prev) => [...prev, ...newParticles]);

    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => !newParticles.find((np) => np.id === p.id)));
    }, 3000);

    try {
      await api.recordStoryInteraction(activeStory.id, 'reaction', emoji);
      if (currentGroup?.userId && currentUser?.id && currentGroup.userId !== currentUser.id) {
        const conv = await api.createConversation({ isGroup: false, participantIds: [currentGroup.userId] });
        await api.sendMessage({ conversationId: conv.id, text: `Reacted ${emoji} to your story 📸` });
      }
      loadInteractions();
    } catch (err) {
      console.error("Failed to send story reaction:", err);
    }
  };

  const getTimeString = (createdAt: string) => {
    try {
      const diffMs = Date.now() - new Date(createdAt).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${Math.floor(diffHours / 24)}d ago`;
    } catch {
      return "recently";
    }
  };

  // Extract filter styles from metadata
  const getFilterStyle = () => {
    if (!activeStory.metadata) return {};
    const meta = typeof activeStory.metadata === 'string' ? JSON.parse(activeStory.metadata) : activeStory.metadata;
    const filterClass = meta.filterClass || "";
    const found = FILTERS.find(f => f.name === filterClass);
    return found ? found.style : {};
  };

  const facebookReactions = ["👍", "❤️", "😂", "😮", "😢", "😡"];

  // Compute viewer states
  const viewerList = interactions.filter((item) => item.type === "view");
  const likeList = interactions.filter((item) => item.type === "like");
  const hasUserLiked = currentUser && interactions.some((item) => item.type === "like" && item.userId === currentUser.id);

  return (
    <div className="fixed inset-0 bg-black z-[200] flex items-center justify-center select-none text-white">
      {/* Background Audio soundtrack */}
      <audio ref={audioRef} loop className="hidden" />

      {/* Floating Emojis Animation Styles */}
      <style>{`
        @keyframes float-emoji {
          0% {
            transform: translateY(10vh) scale(0.6);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 0.9;
          }
          100% {
            transform: translateY(-105vh) scale(1.6) rotate(var(--rotate-angle));
            opacity: 0;
          }
        }
        .floating-emoji {
          position: absolute;
          bottom: 0;
          pointer-events: none;
          z-index: 50;
          animation: float-emoji var(--duration) ease-out forwards;
          font-size: 32px;
        }
      `}</style>

      <div className="relative w-full max-w-[420px] h-screen flex flex-col justify-between bg-zinc-950 overflow-hidden">
        {/* Floating Emojis Container */}
        {particles.map((p) => (
          <div
            key={p.id}
            className="floating-emoji"
            style={{
              left: `${p.left}%`,
              "--rotate-angle": `${p.rotate}deg`,
              "--duration": `${p.duration}s`,
            } as any}
          >
            {p.emoji}
          </div>
        ))}

        {/* Top Segment Bars */}
        <div className="absolute top-3 left-0 right-0 z-30 px-3 flex gap-1">
          {currentGroup.stories.map((_, idx) => {
            let width = "0%";
            if (idx < safeActiveStoryIndex) width = "100%";
            if (idx === safeActiveStoryIndex) width = `${progress}%`;

            return (
              <div key={`story-seg-${idx}`} className="flex-1 h-[2.5px] bg-white/30 rounded-full overflow-hidden">
                <div
                  style={{ width }}
                  className="h-full bg-white transition-all duration-75 ease-linear"
                />
              </div>
            );
          })}
        </div>

        {/* Story Header */}
        <div className="absolute top-7 left-0 right-0 z-30 px-3 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent pb-8 select-none">
          <div className="flex items-center gap-2.5">
            <img
              src={currentGroup.avatarUrl}
              alt={currentGroup.username}
              className="w-9 h-9 rounded-full object-cover border border-white/40"
            />
            <div className="flex flex-col">
              <span className="font-bold text-[14px] drop-shadow-md">{currentGroup.username}</span>
              {activeStory.musicName && (
                <span className="text-[10px] text-zinc-300 flex items-center gap-1 mt-0.5 truncate max-w-[150px]">
                  <Music size={9} className="animate-spin" /> {activeStory.musicName}
                </span>
              )}
            </div>
            <span className="text-[12px] text-white/80 drop-shadow-md">
              {getTimeString(activeStory.createdAt)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {currentUser && currentUser.id === activeStory.userId && (
              <>
                <button
                  onClick={() => {
                    setIsPaused(true);
                    setShowAnalytics(true);
                  }}
                  className="text-white hover:text-zinc-300 p-1 bg-black/20 hover:bg-black/40 rounded-full transition cursor-pointer flex items-center justify-center"
                  title="Story Views & Analytics"
                >
                  <Eye size={18} />
                </button>
                <button
                  onClick={handleDelete}
                  className="text-white hover:text-red-400 p-1 cursor-pointer bg-black/20 hover:bg-black/40 rounded-full transition"
                  title="Delete Story"
                >
                  <Trash2 size={18} />
                </button>
              </>
            )}
            <button
              onClick={handleClose}
              className="text-white hover:text-gray-300 p-1 cursor-pointer bg-black/20 hover:bg-black/40 rounded-full transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Story Content Viewport */}
        <div 
          className="flex-1 relative flex items-center justify-center overflow-hidden bg-black"
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
          onTouchCancel={() => setIsPaused(false)}
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {activeStory.mediaType === "video" ? (
            <video
              src={activeStory.mediaUrl}
              autoPlay
              muted
              playsInline
              loop
              style={getFilterStyle()}
              className="w-full h-full object-contain"
            />
          ) : (
            <img
              src={activeStory.mediaUrl}
              alt="Story content"
              style={getFilterStyle()}
              className="w-full h-full object-contain"
            />
          )}

          {/* Dynamic Metadata Stickers / Texts Overlays */}
          {activeStory.metadata && (() => {
            const meta = typeof activeStory.metadata === 'string' ? JSON.parse(activeStory.metadata) : activeStory.metadata;
            const stickers = meta.stickers || [];
            const texts = meta.texts || [];
            const tags = meta.tags || [];
            const feeling = meta.feeling || "";

            return (
              <>
                {stickers.map((s: any, idx: number) => (
                  <div 
                    key={`s-${idx}`} 
                    style={{ left: `${s.x}%`, top: `${s.y}%` }} 
                    className="absolute -translate-x-1/2 -translate-y-1/2 text-[36px] drop-shadow-md z-20 pointer-events-none select-none"
                  >
                    {s.emoji}
                  </div>
                ))}
                {texts.map((t: any, idx: number) => {
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
                      key={`t-${idx}`} 
                      style={{ left: `${t.x}%`, top: `${t.y}%`, ...getStyle() }} 
                      className="absolute -translate-x-1/2 -translate-y-1/2 font-extrabold text-[15px] px-2.5 py-0.5 rounded-lg drop-shadow-md z-20 pointer-events-none select-none text-center whitespace-nowrap"
                    >
                      {t.text}
                    </div>
                  );
                })}
                {tags.map((tg: any, idx: number) => (
                  <div 
                    key={`tg-${idx}`} 
                    style={{ left: `${tg.x}%`, top: `${tg.y}%` }} 
                    className="absolute -translate-x-1/2 -translate-y-1/2 font-bold text-[11px] bg-sky-500/90 text-white px-2 py-0.5 rounded-full border border-sky-400 drop-shadow-md z-20 pointer-events-none select-none text-center whitespace-nowrap"
                  >
                    {tg.username}
                  </div>
                ))}
                {activeStory.audioUrl && (() => {
                  const pos = meta?.audioCardPos || { x: 50, y: 80 };
                  const shape = meta?.audioCardShape || "card";
                  const musicName = activeStory.musicName || "Soundtrack";

                  return (
                    <div 
                      style={{ left: `${pos.x}%`, top: `${pos.y}%` }} 
                      className="absolute -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none select-none"
                    >
                      {shape === "card" && (
                        <div className="bg-black/80 border border-zinc-800 p-2.5 rounded-xl flex items-center gap-2 max-w-[180px] shadow-lg">
                          <Music size={13} className="text-pink-500 animate-pulse" />
                          <span className="text-[11px] truncate font-bold text-white">{musicName}</span>
                        </div>
                      )}
                      {shape === "list" && (
                        <div className="bg-zinc-950/70 py-1 px-3 rounded-full flex items-center gap-1.5 shadow text-[10px] font-semibold border border-white/10 text-white">
                          <Music size={9} className="text-white" />
                          <span className="truncate max-w-[100px]">{musicName}</span>
                        </div>
                      )}
                      {shape === "transparent" && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-white drop-shadow-md bg-transparent">
                          <Music size={10} className="text-pink-400" />
                          <span className="truncate max-w-[120px]">{musicName}</span>
                        </div>
                      )}
                      {shape === "icon" && (
                        <div className="w-8 h-8 rounded-full bg-pink-500 flex items-center justify-center text-white shadow-lg">
                          <Music size={12} className="animate-spin" />
                        </div>
                      )}
                    </div>
                  );
                })()}
                {feeling && (
                  <div className="absolute top-20 left-4 bg-zinc-950/75 border border-white/10 px-2.5 py-0.5 rounded-full text-[10px] font-bold z-20 shadow">
                    Feeling {feeling}
                  </div>
                )}
              </>
            );
          })()}

          {/* Caption Overlay */}
          {activeStory.caption && (
            <div className="absolute bottom-20 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-center">
              <p className="text-[14px] font-medium text-white drop-shadow-md leading-relaxed px-4">
                {activeStory.caption}
              </p>
            </div>
          )}

          {/* Left/Right click targets */}
          <div
            onClick={handlePrev}
            className="absolute left-0 top-0 bottom-0 w-[30%] cursor-pointer z-20"
            title="Previous Story"
          />
          <div
            onClick={handleNext}
            className="absolute right-0 top-0 bottom-0 w-[30%] cursor-pointer z-20"
            title="Next Story"
          />
        </div>

        {/* Facebook-like Story reactions & reply panel */}
        <div className="bg-black/90 p-4 flex flex-col gap-3 z-30 select-none border-t border-zinc-900 backdrop-blur-md">
          {/* Reaction Emojis Panel (Facebook Style) */}
          <div 
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            className="flex items-center justify-around px-2 py-1 bg-zinc-900/50 rounded-full border border-zinc-850/60 backdrop-blur-sm"
          >
            {facebookReactions.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => triggerReaction(emoji)}
                className="text-[24px] hover:scale-130 active:scale-95 transition-transform duration-200 cursor-pointer p-1"
                title={`React with ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Message input field */}
          <form onSubmit={handleReplySubmit} className="flex items-center gap-2.5">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={`Reply to ${currentGroup.username}…`}
              onFocus={() => setIsPaused(true)}
              onBlur={() => {
                setTimeout(() => setIsPaused(false), 200);
              }}
              className="flex-1 bg-zinc-900 border border-zinc-850 rounded-full px-4 py-2.5 text-[13px] text-white outline-none focus:border-zinc-700 placeholder-white/40 transition"
            />
            {currentUser && (
              <button
                type="button"
                onClick={handleLikeToggle}
                className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center hover:scale-105 active:scale-95 transition cursor-pointer text-white shrink-0"
              >
                <Heart size={16} fill={hasUserLiked ? "red" : "transparent"} className={hasUserLiked ? "text-red-500 scale-110" : "text-white"} />
              </button>
            )}
            <button
              type="submit"
              disabled={!replyText.trim()}
              className="w-10 h-10 rounded-full bg-white hover:bg-zinc-200 text-black flex items-center justify-center transition disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer shrink-0"
            >
              <Send size={15} />
            </button>
          </form>
        </div>

        {/* Creator Analytics Panel Sheet (Only Creator can see) */}
        {showAnalytics && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[100] flex flex-col justify-end">
            <div className="bg-zinc-950 border-t border-zinc-900 rounded-t-3xl max-h-[60vh] flex flex-col overflow-hidden animate-slide-up text-white select-text">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-900 shrink-0">
                <div className="flex items-center gap-2 font-extrabold text-[15px]">
                  <Award size={18} className="text-amber-500" />
                  <span>Story Activity & Analytics</span>
                </div>
                <button
                  onClick={() => {
                    setShowAnalytics(false);
                    setIsPaused(false);
                  }}
                  className="p-1.5 hover:bg-zinc-900 rounded-full transition text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Data list */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scroll text-sm">
                <div className="grid grid-cols-2 gap-3 text-center mb-2">
                  <div className="bg-zinc-900/40 p-3 rounded-2xl border border-zinc-900">
                    <div className="text-zinc-500 text-xs font-semibold">Total Views</div>
                    <div className="text-xl font-black mt-1 text-white">{viewerList.length}</div>
                  </div>
                  <div className="bg-zinc-900/40 p-3 rounded-2xl border border-zinc-900">
                    <div className="text-zinc-500 text-xs font-semibold">Total Likes</div>
                    <div className="text-xl font-black mt-1 text-red-500">{likeList.length}</div>
                  </div>
                </div>

                <div className="h-[1px] bg-zinc-900 my-2" />

                <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">
                  Visits & Reactions
                </label>

                {loadingInteractions ? (
                  <div className="text-center py-6 text-zinc-600 text-xs animate-pulse">
                    Loading analytics data...
                  </div>
                ) : interactions.length === 0 ? (
                  <div className="text-center py-8 text-zinc-600 text-xs">
                    No story interactions yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {interactions.map((item, idx) => {
                      const user = item.user;
                      const avatar = user?.avatarUrl || `https://i.pravatar.cc/80?u=${user?.id || idx}`;
                      const username = user?.username || "anonymous";

                      return (
                        <div key={item.id || idx} className="flex items-center justify-between bg-zinc-900/20 p-2.5 rounded-xl border border-zinc-900/60">
                          <div className="flex items-center gap-3">
                            <img
                              src={avatar}
                              alt={username}
                              className="w-8 h-8 rounded-full object-cover border border-[#222]"
                            />
                            <div className="flex flex-col">
                              <span className="font-bold text-xs text-white">{username}</span>
                              <span className="text-[10px] text-zinc-500">
                                {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>

                          <div className="text-xs font-semibold px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 flex items-center gap-1.5">
                            {item.type === "view" && (
                              <>
                                <Eye size={11} />
                                <span>Viewed</span>
                              </>
                            )}
                            {item.type === "like" && (
                              <>
                                <Heart size={11} className="text-red-500" fill="red" />
                                <span className="text-red-400">Liked</span>
                              </>
                            )}
                            {item.type === "reaction" && (
                              <>
                                <span>Reacted</span>
                                <span className="text-[14px]">{item.value}</span>
                              </>
                            )}
                            {item.type === "message" && (
                              <>
                                <MessageSquare size={11} className="text-sky-400" />
                                <span className="text-sky-400 truncate max-w-[100px]" title={item.value}>
                                  "{item.value}"
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
