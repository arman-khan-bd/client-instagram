"use client";

import React, { useEffect, useState, useRef } from "react";
import { useApp } from "../AppContext";
import { X, Trash2, Send } from "lucide-react";
import { api } from "../../lib/api";

interface EmojiParticle {
  id: number;
  emoji: string;
  left: number;
  rotate: number;
  duration: number;
}

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
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const groupIndex = storyViewerIndex ?? 0;
  const currentGroup = storyGroups[groupIndex];
  const safeActiveStoryIndex = activeStoryIndex >= (currentGroup?.stories.length ?? 0) ? 0 : activeStoryIndex;
  const activeStory = currentGroup?.stories[safeActiveStoryIndex];

  // Reset active story index when group changes
  useEffect(() => {
    setActiveStoryIndex(0);
    setProgress(0);
    setReplyText("");
  }, [storyViewerIndex]);

  // Story Timer handler
  useEffect(() => {
    if (storyViewerIndex === null || !currentGroup || isPaused) return;

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
  }, [storyViewerIndex, isPaused, groupIndex, activeStoryIndex, currentGroup]);

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
      if (currentGroup?.userId && currentUser?.id && currentGroup.userId !== currentUser.id) {
        await api.sendMessage(currentGroup.userId, `Replied to your story: "${text}" 📸`);
      }
    } catch (err) {
      console.error("Failed to send story reply:", err);
    }
  };

  const triggerReaction = async (emoji: string) => {
    // Generate floating emoji particles
    const newParticles: EmojiParticle[] = Array.from({ length: 15 }).map((_, i) => ({
      id: Date.now() + i + Math.random(),
      emoji,
      left: Math.random() * 80 + 10,
      rotate: Math.random() * 60 - 30,
      duration: Math.random() * 1.5 + 1.2,
    }));

    setParticles((prev) => [...prev, ...newParticles]);

    // Clean up particles
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => !newParticles.find((np) => np.id === p.id)));
    }, 3000);

    try {
      if (currentGroup?.userId && currentUser?.id && currentGroup.userId !== currentUser.id) {
        await api.sendMessage(currentGroup.userId, `Reacted ${emoji} to your story 📸`);
      }
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

  const facebookReactions = ["👍", "❤️", "😂", "😮", "😢", "😡"];

  return (
    <div className="fixed inset-0 bg-black z-[200] flex items-center justify-center select-none text-white">
      {/* Dynamic Keyframes injected locally */}
      <style>{`
        @keyframes float-emoji {
          0% {
            transform: translateY(100vh) scale(0.6);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-10vh) scale(1.6) rotate(var(--rotate-angle));
            opacity: 0;
          }
        }
        .floating-emoji {
          position: absolute;
          bottom: 0;
          pointer-events: none;
          z-index: 50;
          animation: float-emoji var(--duration) ease-out forwards;
          font-size: 28px;
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

        {/* Top Segment Bars for current group stories */}
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
            <span className="font-bold text-[14px] drop-shadow-md">{currentGroup.username}</span>
            <span className="text-[12px] text-white/80 drop-shadow-md">
              {getTimeString(activeStory.createdAt)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {currentUser && currentUser.id === activeStory.userId && (
              <button
                onClick={handleDelete}
                className="text-white hover:text-red-400 p-1 cursor-pointer bg-black/20 hover:bg-black/40 rounded-full transition"
                title="Delete Story"
              >
                <Trash2 size={18} />
              </button>
            )}
            <button
              onClick={handleClose}
              className="text-white hover:text-gray-300 p-1 cursor-pointer bg-black/20 hover:bg-black/40 rounded-full transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Story content / Media viewer */}
        <div 
          className="flex-1 relative flex items-center justify-center overflow-hidden"
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
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={activeStory.mediaUrl}
              alt="Story content"
              className="w-full h-full object-cover"
            />
          )}

          {/* Caption Overlay */}
          {activeStory.caption && (
            <div className="absolute bottom-20 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-center">
              <p className="text-[15px] font-medium text-white drop-shadow-md leading-relaxed px-4">
                {activeStory.caption}
              </p>
            </div>
          )}

          {/* Left/Right click targets */}
          <div
            onClick={handlePrev}
            className="absolute left-0 top-0 bottom-0 w-[40%] cursor-pointer z-20"
            title="Previous Story"
          />
          <div
            onClick={handleNext}
            className="absolute right-0 top-0 bottom-0 w-[40%] cursor-pointer z-20"
            title="Next Story"
          />
        </div>

        {/* Facebook-like Story reactions & reply panel */}
        <div className="bg-black/90 p-4 flex flex-col gap-3.5 z-30 select-none border-t border-zinc-900 backdrop-blur-md">
          {/* Reaction Emojis Panel (Facebook Style) */}
          <div 
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            className="flex items-center justify-around px-2 py-1 bg-zinc-900/50 rounded-full border border-zinc-800/60 backdrop-blur-sm"
          >
            {facebookReactions.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => triggerReaction(emoji)}
                className="text-[26px] hover:scale-130 active:scale-95 transition-transform duration-200 cursor-pointer p-1"
                title={`React with ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Message input field */}
          <form onSubmit={handleReplySubmit} className="flex items-center gap-3">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={`Reply to ${currentGroup.username}…`}
              onFocus={() => setIsPaused(true)}
              onBlur={() => {
                // Keep paused momentarily so form submit has time to execute
                setTimeout(() => setIsPaused(false), 200);
              }}
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-full px-4.5 py-2.5 text-[14px] text-white outline-none focus:border-zinc-700 placeholder-white/50 transition"
            />
            <button
              type="submit"
              disabled={!replyText.trim()}
              className="w-10 h-10 rounded-full bg-white hover:bg-zinc-200 text-black flex items-center justify-center transition disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer shrink-0"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
