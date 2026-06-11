"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useApp, MockPost } from "../AppContext";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../../lib/api";
import ReactionsModal from "../modals/ReactionsModal";

// ── Reactions ─────────────────────────────────────────────────────────────────
export const REACTIONS = [
  { type: "love",  emoji: "❤️",  label: "Love",  color: "#ff3d5a" },
  { type: "hot",   emoji: "🔥",  label: "Hot",   color: "#ff6b35" },
  { type: "care",  emoji: "🤗",  label: "Care",  color: "#f5c518" },
  { type: "wow",   emoji: "😮",  label: "Wow",   color: "#f5a623" },
  { type: "haha",  emoji: "😂",  label: "Haha",  color: "#f5a623" },
  { type: "sad",   emoji: "😢",  label: "Sad",   color: "#5b9bd5" },
  { type: "angry", emoji: "😡",  label: "Angry", color: "#e05a00" },
  { type: "slap",  emoji: "🩴",  label: "Slap",  color: "#9b59b6" },
] as const;

type ReactionType = typeof REACTIONS[number]["type"] | null;

function getReactionInfo(reaction: ReactionType) {
  if (!reaction) return null;
  return REACTIONS.find((r) => r.type === reaction) ?? null;
}

// ── Inline Reaction Picker (used by both hover-on-button and long-press) ──────
interface ReactionPickerProps {
  visible: boolean;
  /** Element that anchors the picker above (used for hover) */
  anchorBottom?: boolean;
  hoveredIdx: number | null;
  onHover: (idx: number | null) => void;
  onSelect: (type: string) => void;
  onMouseLeave?: () => void;
}

function ReactionPicker({
  visible,
  anchorBottom = true,
  hoveredIdx,
  onHover,
  onSelect,
  onMouseLeave,
}: ReactionPickerProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.7, y: anchorBottom ? 6 : -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.7, y: anchorBottom ? 6 : -6 }}
          transition={{ type: "spring", stiffness: 420, damping: 26 }}
          onMouseLeave={onMouseLeave}
          className={`absolute ${
            anchorBottom ? "bottom-[calc(100%+8px)] left-0" : "bottom-4 left-1/2 -translate-x-1/2"
          } flex items-end gap-1 bg-[#111]/95 backdrop-blur-xl border border-white/10 rounded-full px-3 py-2 shadow-2xl z-50 select-none`}
          onClick={(e) => e.stopPropagation()}
        >
          {REACTIONS.map((r, idx) => (
            <motion.button
              key={r.type}
              animate={{ scale: hoveredIdx === idx ? 1.5 : 1, y: hoveredIdx === idx ? -10 : 0 }}
              transition={{ type: "spring", stiffness: 480, damping: 22 }}
              title={r.label}
              onMouseEnter={() => onHover(idx)}
              onPointerEnter={() => onHover(idx)}
              onClick={(e) => { e.stopPropagation(); onSelect(r.type); }}
              className="text-[26px] leading-none cursor-pointer relative"
            >
              {r.emoji}
              {hoveredIdx === idx && (
                <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-white bg-black/70 rounded-full px-1.5 py-0.5 whitespace-nowrap pointer-events-none">
                  {r.label}
                </span>
              )}
            </motion.button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
interface PostCardProps { post: MockPost }

export default function PostCard({ post }: PostCardProps) {
  const {
    savedPosts,
    toggleSave, toggleFollow,
    addComment, setViewingUserId, setActiveTab,
    setActivePostId, showToast,
  } = useApp();

  const [commentText, setCommentText] = useState("");
  const [showHeartPop, setShowHeartPop] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [activeImgIndex, setActiveImgIndex] = useState(0);

  // ── Reaction state ─────────────────────────────────────────────────────────
  const [currentReaction, setCurrentReaction] = useState<ReactionType>(null);
  const [hasReacted, setHasReacted] = useState(false);     // DB-confirmed reaction exists
  const [localLikes, setLocalLikes]   = useState(post.likes); // local like count, avoids broken toggleLike
  const [reactionsList, setReactionsList] = useState<{ type: string; userId: string }[]>([]);
  const [showReactionsModal, setShowReactionsModal] = useState(false);
  const { currentUser } = useApp();

  // Hover-on-button picker
  const [showHoverPicker, setShowHoverPicker] = useState(false);
  const [hoverPickerHovIdx, setHoverPickerHovIdx] = useState<number | null>(null);
  const hoverShowTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverHideTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Long-press on image picker
  const [showLongPicker, setShowLongPicker] = useState(false);
  const [longPickerHovIdx, setLongPickerHovIdx] = useState<number | null>(null);
  const longPressTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress     = useRef(false);

  // Double-click detection
  const lastTap         = useRef<number>(0);

  const isSaved     = savedPosts.has(post.id);
  const reactionInfo = getReactionInfo(currentReaction);

  // Load existing reaction from DB — also initialise hasReacted + like count + reactions details
  useEffect(() => {
    api.getPostReaction(post.id).then((r) => {
      if (r) {
        setCurrentReaction(r as ReactionType);
        setHasReacted(true);
      }
    }).catch(() => {});

    api.getPostReactionsDetails(post.id).then((list) => {
      setReactionsList(list as any[]);
    }).catch(() => {});
  }, [post.id]);

  // ── Shared: commit a reaction ──────────────────────────────────────────────
  const commitReaction = useCallback((type: string) => {
    setShowHoverPicker(false);
    setShowLongPicker(false);
    setHoverPickerHovIdx(null);
    setLongPickerHovIdx(null);

    // Save previous state for rollback
    const prevReaction = currentReaction;
    const prevHasReacted = hasReacted;
    const prevLocalLikes = localLikes;
    const prevReactionsList = reactionsList;

    // Instant/optimistic update
    const isTogglingOff = currentReaction === type;
    const currentUserId = currentUser?.id;

    if (isTogglingOff) {
      setCurrentReaction(null);
      setHasReacted(false);
      setLocalLikes((l) => Math.max(0, l - 1));
      if (currentUserId) {
        setReactionsList((prev) => prev.filter((r) => r.userId !== currentUserId));
      }
    } else {
      setCurrentReaction(type as ReactionType);
      setHasReacted(true);
      if (!prevHasReacted) {
        setLocalLikes((l) => l + 1);
      }
      if (currentUserId) {
        setReactionsList((prev) => {
          const filtered = prev.filter((r) => r.userId !== currentUserId);
          return [...filtered, { type, userId: currentUserId }];
        });
      }
      const r = REACTIONS.find((r) => r.type === type);
      if (r) showToast(`${r.emoji} ${r.label}`, "notification");
    }

    // Call API in the background
    api.reactToPost(post.id, type)
      .then((result) => {
        if (result.reaction === null) {
          setCurrentReaction(null);
          setHasReacted(false);
        } else {
          setCurrentReaction(result.reaction as ReactionType);
          setHasReacted(true);
        }
        api.getPostReactionsDetails(post.id).then((list) => {
          setReactionsList(list as any[]);
        }).catch(() => {});
      })
      .catch((err) => {
        console.error("Optimistic reaction commit failed, rolling back:", err);
        setCurrentReaction(prevReaction);
        setHasReacted(prevHasReacted);
        setLocalLikes(prevLocalLikes);
        setReactionsList(prevReactionsList);
        showToast("Log in to react", "info");
      });
  }, [post.id, currentReaction, hasReacted, localLikes, reactionsList, currentUser, showToast]);

  // ── Simple click on reaction button (no picker) ─────────────────────────────
  const handleSimpleLike = useCallback(() => {
    if (showHoverPicker) return; // picker open — let user pick from it
    commitReaction(currentReaction ?? "love"); // toggles if same, un-reacts if null
  }, [showHoverPicker, currentReaction, commitReaction]);

  // ── HOVER PICKER (desktop heart button): hover shows, click commits ─────────
  const startHoverShow = () => {
    if (hoverHideTimer.current) clearTimeout(hoverHideTimer.current);
    hoverShowTimer.current = setTimeout(() => setShowHoverPicker(true), 340);
  };
  const startHoverHide = () => {
    if (hoverShowTimer.current) clearTimeout(hoverShowTimer.current);
    // No auto-commit on leave — user must click a reaction
    hoverHideTimer.current = setTimeout(() => {
      setShowHoverPicker(false);
      setHoverPickerHovIdx(null);
    }, 220);
  };
  const cancelHoverHide = () => {
    if (hoverHideTimer.current) clearTimeout(hoverHideTimer.current);
  };

  // ── LONG-PRESS PICKER (image): hold shows, click reaction to commit ──────────
  const onImagePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      setShowLongPicker(true);
    }, 480);
  };

  const onImagePointerUp = (e: React.PointerEvent) => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    // If picker is open, just close it — user clicks a reaction emoji to commit
    if (showLongPicker) return;
    // Double-tap detection
    if (!isLongPress.current) {
      const now = Date.now();
      if (now - lastTap.current < 300) {
        setShowHeartPop(true);
        setTimeout(() => setShowHeartPop(false), 850);
        commitReaction("love"); // Force a "love" reaction on double-tap
        lastTap.current = 0;
      } else {
        lastTap.current = now;
      }
    }
  };

  const onImagePointerCancel = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    if (!showLongPicker) isLongPress.current = false;
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const handlePostComment = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commentText.trim()) return;
    addComment(post.id, commentText);
    setCommentText("");
  };

  const handleUserClick = (userId: number) => {
    setViewingUserId(userId);
    setActiveTab("profile");
  };

  const formatCaption = (text: string) =>
    text.split(/(\s+)/).map((part, i) =>
      part.startsWith("#")
        ? <span key={i} className="text-[#3897f0] cursor-pointer hover:underline">{part}</span>
        : part
    );

  const formatLikes = (n: number) =>
    n >= 1_000_000 ? (n / 1_000_000).toFixed(1) + "M"
    : n >= 1_000   ? (n / 1_000).toFixed(1) + "K"
    : n.toString();

  const getDisplayEmojis = () => {
    const counts: Record<string, number> = {};
    reactionsList.forEach((r) => {
      counts[r.type] = (counts[r.type] || 0) + 1;
    });

    const sortedTypes = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    const top2 = sortedTypes.slice(0, 2);
    const emojisToShow = [...top2];

    if (currentReaction && !top2.includes(currentReaction)) {
      emojisToShow.push(currentReaction);
    }

    return emojisToShow.map((type) => REACTIONS.find((r) => r.type === type)?.emoji).filter(Boolean);
  };

  return (
    <div className="bg-[var(--surface)] backdrop-blur-md border border-[var(--border)] rounded-[24px] mb-6 overflow-hidden w-full text-white shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 p-3.5 select-none">
        <img
          src={post.user.img}
          className={`w-[38px] h-[38px] rounded-full object-cover cursor-pointer ${
            post.hasStory
              ? "p-[2px] bg-[linear-gradient(45deg,#f09433,#e6683c,#dc2743,#bc1888)]"
              : "border border-[#222]"
          }`}
          alt={post.user.name}
          onClick={() => handleUserClick(post.user.id)}
        />
        <div className="flex-1">
          <span
            onClick={() => handleUserClick(post.user.id)}
            className="text-[14px] font-semibold cursor-pointer hover:underline flex items-center gap-1"
          >
            {post.user.name}
            {post.user.verified && <span className="text-[#3897f0] text-[11px]">✓</span>}
          </span>
          {post.location && <div className="text-[11px] text-[#a8a8a8]">{post.location}</div>}
        </div>

        {/* Context menu */}
        <div className="relative">
          <button onClick={() => setShowMenu(!showMenu)} className="text-[#a8a8a8] hover:text-white p-1 cursor-pointer">
            <MoreHorizontal size={18} />
          </button>
          <AnimatePresence>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.1 }}
                  className="absolute right-0 mt-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl w-40 shadow-xl overflow-hidden z-50 text-[13px]"
                >
                  <div onClick={() => setShowMenu(false)} className="p-3 text-red-500 hover:bg-[#222] cursor-pointer">🚩 Report</div>
                  <div onClick={() => setShowMenu(false)} className="p-3 hover:bg-[#222] cursor-pointer border-t border-[#222]">🚫 Not interested</div>
                  <div onClick={() => { toggleFollow(post.user.id); setShowMenu(false); }} className="p-3 hover:bg-[#222] cursor-pointer border-t border-[#222]">➕ Follow</div>
                  <div onClick={() => { showToast("Link copied! 📋", "share"); setShowMenu(false); }} className="p-3 hover:bg-[#222] cursor-pointer border-t border-[#222]">🔗 Copy link</div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Post Media ─────────────────────────────────────────────────────── */}
      <div
        className="relative aspect-square overflow-hidden select-none"
        style={{ cursor: showLongPicker ? "default" : "default" }}
        onPointerDown={onImagePointerDown}
        onPointerUp={onImagePointerUp}
        onPointerCancel={onImagePointerCancel}
        onPointerLeave={onImagePointerCancel}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* ── Color / Text-only post ──────────────────────────────────────── */}
        {post.isTextOnly ? (
          <div
            className="w-full h-full flex items-center justify-center p-10 text-center font-bold text-white leading-relaxed break-words"
            style={{
              background: post.bgGradient || "linear-gradient(135deg,#FF8A00,#FF2E93,#9E00FF)",
              fontSize: "clamp(18px, 5vw, 30px)",
              textShadow: "0 2px 12px rgba(0,0,0,0.35)",
            }}
          >
            {post.caption}
          </div>
        ) : (
          /* ── Image carousel ──────────────────────────────────────────── */
          <div className="relative w-full h-full">
            <img
              src={post.imgs && post.imgs.length > 0 ? post.imgs[activeImgIndex] : post.img}
              className="w-full h-full object-cover transition-all duration-300"
              style={{ filter: post.filter && post.filter !== "none" ? post.filter : undefined }}
              alt="post"
              draggable={false}
            />
            {post.imgs && post.imgs.length > 1 && (
              <>
                {activeImgIndex > 0 && (
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); setActiveImgIndex((p) => p - 1); }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 rounded-full p-1.5 z-20 text-white border-none cursor-pointer"
                  >
                    <ChevronLeft size={16} />
                  </button>
                )}
                {activeImgIndex < post.imgs.length - 1 && (
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); setActiveImgIndex((p) => p + 1); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 rounded-full p-1.5 z-20 text-white border-none cursor-pointer"
                  >
                    <ChevronRight size={16} />
                  </button>
                )}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20 pointer-events-none">
                  {post.imgs.map((_, idx) => (
                    <div
                      key={idx}
                      className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
                        idx === activeImgIndex ? "bg-white scale-125" : "bg-white/40"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Double-tap heart pop */}
        <AnimatePresence>
          {showHeartPop && (
            <motion.div
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: [0.3, 1.4, 1], opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.42 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 text-[90px] drop-shadow-2xl"
            >
              ❤️
            </motion.div>
          )}
        </AnimatePresence>

        {/* Long-press reaction picker — anchored at center-bottom of image */}
        <AnimatePresence>
          {showLongPicker && (
            <>
              {/* Dim overlay so tap outside dismisses */}
              <div
                className="absolute inset-0 z-30 bg-black/30"
                onPointerUp={(e) => { e.stopPropagation(); setShowLongPicker(false); setLongPickerHovIdx(null); }}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.7, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.7, y: 12 }}
                transition={{ type: "spring", stiffness: 420, damping: 26 }}
                className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-end gap-1.5 bg-[#111]/95 backdrop-blur-2xl border border-white/10 rounded-full px-4 py-2.5 shadow-2xl z-40 select-none"
                onPointerUp={(e) => e.stopPropagation()}
              >
                {REACTIONS.map((r, idx) => (
                  <motion.button
                    key={r.type}
                    animate={{
                      scale: longPickerHovIdx === idx ? 1.55 : 1,
                      y: longPickerHovIdx === idx ? -12 : 0,
                    }}
                    transition={{ type: "spring", stiffness: 480, damping: 22 }}
                    className="text-[28px] leading-none cursor-pointer relative"
                    onPointerEnter={() => setLongPickerHovIdx(idx)}
                    onPointerLeave={() => setLongPickerHovIdx(null)}
                    onPointerUp={(e) => {
                      e.stopPropagation();
                      commitReaction(r.type);
                    }}
                  >
                    {r.emoji}
                    {longPickerHovIdx === idx && (
                      <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-white bg-black/75 rounded-full px-1.5 py-0.5 whitespace-nowrap pointer-events-none">
                        {r.label}
                      </span>
                    )}
                  </motion.button>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* ── Actions bar ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3.5 p-3.5 pb-1 select-none">

        {/* Like / reaction button with hover picker */}
        <div
          className="relative"
          onMouseEnter={startHoverShow}
          onMouseLeave={startHoverHide}
        >
          <button
            onClick={handleSimpleLike}
            className="cursor-pointer transition hover:scale-105 active:scale-95 flex items-center gap-1"
            style={{ color: reactionInfo?.color }}
          >
            {currentReaction ? (
              <span className="text-[22px] leading-none">{reactionInfo?.emoji}</span>
            ) : hasReacted && reactionInfo ? (
              <span className="text-[22px] leading-none">{reactionInfo.emoji}</span>
            ) : (
              <Heart size={24} fill="none" className="text-white" />
            )}
          </button>

          {/* Hover picker — appears above heart button: hover shows, click commits */}
          <div onMouseEnter={cancelHoverHide} onMouseLeave={startHoverHide}>
            <ReactionPicker
              visible={showHoverPicker}
              anchorBottom
              hoveredIdx={hoverPickerHovIdx}
              onHover={setHoverPickerHovIdx}
              onSelect={(type) => { commitReaction(type); setShowHoverPicker(false); }}
              onMouseLeave={startHoverHide}
            />
          </div>
        </div>

        <button
          onClick={() => setActivePostId(post.id)}
          className="text-white cursor-pointer hover:scale-105 active:scale-95 transition"
        >
          <MessageCircle size={24} />
        </button>

        <button
          onClick={() => showToast("Link copied! 📋", "share")}
          className="text-white cursor-pointer hover:scale-105 active:scale-95 transition"
        >
          <Send size={24} />
        </button>

        <button
          onClick={() => toggleSave(post.id)}
          className="ml-auto cursor-pointer transition hover:scale-105 active:scale-95 text-white"
        >
          <Bookmark size={24} fill={isSaved ? "currentColor" : "none"} />
        </button>
      </div>

      {/* Reactions bar — show emoji + count, replace plain "X likes" */}
      <div
        onClick={() => setShowReactionsModal(true)}
        className="px-3.5 py-1 flex items-center gap-1.5 text-[13px] font-semibold cursor-pointer hover:underline w-fit select-none"
      >
        <div className="flex items-center -space-x-1.5 mr-0.5">
          {getDisplayEmojis().map((emoji, i) => (
            <span key={i} className="text-[15px] leading-none drop-shadow-sm select-none">
              {emoji}
            </span>
          ))}
        </div>
        <span>{formatLikes(localLikes)}</span>
        <span className="font-normal text-[#a8a8a8]">
          {localLikes === 1 ? 'reaction' : 'reactions'}
        </span>
      </div>

      {/* Caption (hidden for text-only posts — caption is shown in the gradient) */}
      {!post.isTextOnly && (
        <div className="px-3.5 py-1 text-[13px] leading-relaxed">
          <span
            onClick={() => handleUserClick(post.user.id)}
            className="font-bold mr-2 cursor-pointer hover:underline"
          >
            {post.user.name}
          </span>
          {formatCaption(post.caption)}
        </div>
      )}
      {post.isTextOnly && (
        <div className="px-3.5 py-1 text-[13px] text-[#a8a8a8]">
          <span onClick={() => handleUserClick(post.user.id)} className="font-bold mr-2 cursor-pointer hover:underline text-white">
            {post.user.name}
          </span>
          Text post
        </div>
      )}

      {/* Comments link */}
      <div
        onClick={() => setActivePostId(post.id)}
        className="px-3.5 py-1 text-[12px] text-[#a8a8a8] cursor-pointer hover:text-white transition"
      >
        {post.comments.length > 0 ? `View all ${post.comments.length} comments` : "Add a comment…"}
      </div>

      {/* Time */}
      <div className="px-3.5 pt-0.5 pb-3.5 text-[11px] text-[#555] uppercase tracking-wider">
        {post.time} · AURAGRAM
      </div>

      {/* Comment input */}
      <form onSubmit={handlePostComment} className="border-t border-[var(--border)] flex items-center p-3.5 gap-3 bg-black/15">
        <span className="text-[20px] cursor-pointer" onClick={() => setCommentText((p) => p + "😊")}>😊</span>
        <input
          type="text"
          placeholder="Add a comment…"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          className="flex-1 bg-transparent border-none text-[13px] text-white outline-none placeholder-[#666]"
        />
        <button
          type="submit"
          disabled={!commentText.trim()}
          className="text-[#3897f0] font-bold text-[13px] disabled:opacity-40 disabled:cursor-default"
        >
          Post
        </button>
      </form>
      
      <ReactionsModal
        isOpen={showReactionsModal}
        onClose={() => setShowReactionsModal(false)}
        postId={post.id}
      />
    </div>
  );
}
