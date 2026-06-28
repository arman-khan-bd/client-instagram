"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Hls from "hls.js";
import { useApp, MockPost } from "../AppContext";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, ChevronLeft, ChevronRight, Play, Pause, Volume2, VolumeX, Maximize, Trash2, X, Plus, Camera, Upload } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../../lib/api";
import ReactionsModal from "../modals/ReactionsModal";

export const BG_GRADIENTS = [
  { name: "Sunset", value: "linear-gradient(45deg, #FF8A00, #FF2E93, #9E00FF)" },
  { name: "Ocean Breeze", value: "linear-gradient(135deg, #02AAB0 0%, #00CDAC 100%)" },
  { name: "Neon Glow", value: "linear-gradient(135deg, #F107A3 0%, #7B2FF7 100%)" },
  { name: "Dark Nebula", value: "linear-gradient(135deg, #0F2027 0%, #203A43 50%, #2C5364 100%)" },
  { name: "Lime Energy", value: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)" },
];

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

// ── Inline Reaction Picker ────────────────────────────────────────────────────
interface ReactionPickerProps {
  visible: boolean;
  anchorBottom?: boolean;
  hoveredIdx: number | null;
  onHover: (idx: number | null) => void;
  onSelect: (type: string) => void;
  onMouseLeave?: () => void;
}

function ReactionPicker({ visible, anchorBottom = true, hoveredIdx, onHover, onSelect, onMouseLeave }: ReactionPickerProps) {
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
          } flex items-end gap-1 bg-[var(--surface2)]/95 backdrop-blur-xl border border-[var(--border)] rounded-full px-3 py-2 shadow-2xl z-50 select-none`}
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
              data-index={idx}
              data-reaction-type={r.type}
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

// ── Video Player in Feed ──────────────────────────────────────────────────────
let globalMuted = true;

function FeedVideo({ src, poster, onDoubleTap, onLongPress, postId, onAspectRatioCalculated }: { src: string; poster?: string; onDoubleTap?: () => void; onLongPress?: () => void; postId: number; onAspectRatioCalculated?: (ratio: number) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { setActiveTab, activePostId } = useApp();
  const [playing, setPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [muted, setMuted] = useState(globalMuted);
  const lastClickTime = useRef<number>(0);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevActivePostId = useRef<number | null>(null);

  const playStartTimeRef = useRef<number | null>(null);

  const logSessionDuration = () => {
    if (playStartTimeRef.current !== null) {
      const duration = (Date.now() - playStartTimeRef.current) / 1000;
      playStartTimeRef.current = null;
      if (duration > 0.5) {
        api.logWatchDuration(postId, duration);
      }
    }
  };

  useEffect(() => {
    return () => {
      logSessionDuration();
    };
  }, []);

  // Resume playback from modal's current time with sound when modal is closed
  useEffect(() => {
    if (prevActivePostId.current !== null && String(prevActivePostId.current) === String(postId) && activePostId === null) {
      const el = videoRef.current;
      if (el) {
        const savedTime = localStorage.getItem(`video_time_${postId}`);
        if (savedTime) {
          try {
            const data = JSON.parse(savedTime);
            el.currentTime = data.time;
          } catch (e) {
            const parsed = parseFloat(savedTime);
            if (!isNaN(parsed) && parsed > 0) {
              el.currentTime = parsed;
            }
          }
        }
        
        globalMuted = false;
        window.dispatchEvent(new CustomEvent("feedMuteChange", { detail: false }));
        el.muted = false;
        setMuted(false);

        el.play().then(() => {
          window.dispatchEvent(new CustomEvent("feedVideoPlay", { detail: { src } }));
        }).catch((err) => {
          console.error("Auto-play failed on modal close:", err);
        });
        setPlaying(true);
        setHasStarted(true);
      }
    }
    prevActivePostId.current = activePostId;
  }, [activePostId, postId, src]);

  // Sync with global feed mute state
  useEffect(() => {
    const handleMuteChange = (e: CustomEvent<boolean>) => {
      setMuted(e.detail);
      if (videoRef.current) {
        videoRef.current.muted = e.detail;
      }
    };
    window.addEventListener("feedMuteChange" as any, handleMuteChange);
    return () => {
      window.removeEventListener("feedMuteChange" as any, handleMuteChange);
    };
  }, []);

  // Auto-play when scrolled in view (>= 40% visible), auto-pause when scrolled out of view (< 40% visible / 60% hidden)
  // Ensures only one video plays at any given time in the feed.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.muted = globalMuted;
          el.play().then(() => {
            window.dispatchEvent(new CustomEvent("feedVideoPlay", { detail: { src } }));
          }).catch(() => {});
          setPlaying(true);
          setHasStarted(true);
        } else {
          el.pause();
          setPlaying(false);
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(el);

    const handleVideoPlay = (e: CustomEvent<{ src: string }>) => {
      if (e.detail.src !== src) {
        el.pause();
        setPlaying(false);
      }
    };

    window.addEventListener("feedVideoPlay" as any, handleVideoPlay);

    return () => {
      observer.disconnect();
      window.removeEventListener("feedVideoPlay" as any, handleVideoPlay);
    };
  }, [src]);

  const [isVertical, setIsVertical] = useState(false);

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    if (video.videoHeight > video.videoWidth) {
      setIsVertical(true);
    } else {
      setIsVertical(false);
    }
    if (video.videoWidth && video.videoHeight && onAspectRatioCalculated) {
      onAspectRatioCalculated(video.videoWidth / video.videoHeight);
    }

    const savedTime = localStorage.getItem(`video_time_${postId}`);
    if (savedTime) {
      try {
        const data = JSON.parse(savedTime);
        if (Date.now() - data.savedAt < 60000) {
          video.currentTime = data.time;
        } else {
          localStorage.removeItem(`video_time_${postId}`);
        }
      } catch (e) {
        const parsed = parseFloat(savedTime);
        if (!isNaN(parsed) && parsed > 0) {
          video.currentTime = parsed;
        }
      }
    }
  };

  const handlePointerDown = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      if (onLongPress) onLongPress();
    }, 450);
  };

  const handlePointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const el = videoRef.current;
    if (!el) return;

    const now = Date.now();
    const DOUBLE_CLICK_DELAY = 300;
    if (now - lastClickTime.current < DOUBLE_CLICK_DELAY) {
      if (onDoubleTap) onDoubleTap();
      lastClickTime.current = 0;
    } else {
      lastClickTime.current = now;
      setTimeout(() => {
        if (lastClickTime.current === now) {
          if (globalMuted) {
            // Unmute globally on first video interaction, but do NOT pause if already playing
            globalMuted = false;
            window.dispatchEvent(new CustomEvent("feedMuteChange", { detail: false }));
            api.logUnmute(postId, 'feed');
          } else {
            // Otherwise, play/pause normally
            if (el.paused) {
              el.play().then(() => {
                window.dispatchEvent(new CustomEvent("feedVideoPlay", { detail: { src } }));
              }).catch(() => {});
              setPlaying(true);
              setHasStarted(true);
            } else {
              el.pause();
              setPlaying(false);
            }
          }
        }
      }, DOUBLE_CLICK_DELAY);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const el = videoRef.current;
    if (!el) return;
    const newMuteState = !el.muted;
    globalMuted = newMuteState;
    window.dispatchEvent(new CustomEvent("feedMuteChange", { detail: newMuteState }));
    if (!newMuteState) {
      api.logUnmute(postId, 'feed');
    }
  };

  // Convert video URLs in poster to Cloudinary thumbnail images if applicable
  const posterUrl = useMemo(() => {
    if (!poster) return undefined;
    const cleanPoster = poster.trim();
    if (cleanPoster.match(/\.(jpeg|jpg|gif|png|webp)/i)) {
      return cleanPoster;
    }
    // If it's a Cloudinary video URL, convert it to a jpg thumbnail
    if (cleanPoster.includes("res.cloudinary.com") && (cleanPoster.includes("/video/upload/") || cleanPoster.match(/\.(mp4|mov|webm)$/i))) {
      let url = cleanPoster.replace(/\.(mp4|mov|webm)$/i, ".jpg");
      if (!url.includes("/so_")) {
        url = url.replace("/video/upload/", "/video/upload/so_0/");
      }
      return url;
    }
    return cleanPoster;
  }, [poster]);

  // Convert video URLs to HLS (.m3u8) adaptive streams for compression and chunking
  const streamSrc = useMemo(() => {
    if (!src) return "";
    const cleanUrl = src.trim();
    if (cleanUrl.includes("res.cloudinary.com") && (cleanUrl.includes("/video/upload/") || cleanUrl.match(/\.(mp4|mov|webm)$/i))) {
      let hlsUrl = cleanUrl.replace(/\.(mp4|mov|webm)$/i, ".m3u8");
      if (!hlsUrl.includes("/sp_auto")) {
        hlsUrl = hlsUrl.replace("/video/upload/", "/video/upload/sp_auto/");
      }
      return hlsUrl;
    }
    return cleanUrl;
  }, [src]);

  // Set up Hls.js playback
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;

    if (streamSrc.endsWith(".m3u8")) {
      if (Hls.isSupported()) {
        hls = new Hls({
          maxMaxBufferLength: 10,
          autoStartLoad: true,
        });
        hls.loadSource(streamSrc);
        hls.attachMedia(video);
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = streamSrc;
      } else {
        video.src = src;
      }
    } else {
      video.src = src;
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [src, streamSrc]);

  return (
    <div
      className="relative w-full h-full bg-black cursor-pointer"
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      <video
        ref={videoRef}
        poster={posterUrl}
        className="w-full h-full object-contain"
        playsInline
        muted={muted}
        loop
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={(e) => {
          const video = e.currentTarget;
          if (video.currentTime > 0) {
            localStorage.setItem(`video_time_${postId}`, JSON.stringify({ time: video.currentTime, savedAt: Date.now() }));
          }
        }}
        onPlay={() => {
          setPlaying(true);
          setHasStarted(true);
          playStartTimeRef.current = Date.now();
        }}
        onPause={() => {
          setPlaying(false);
          logSessionDuration();
        }}
        onEnded={logSessionDuration}
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Stretch thumbnail image overlay to guarantee it displays stretched under all conditions before starting */}
      {!playing && !hasStarted && posterUrl && (
        <img
          src={posterUrl}
          alt="thumbnail"
          className="absolute inset-0 w-full h-full object-contain z-0 pointer-events-none"
        />
      )}

      {/* Play/pause overlay */}
      <AnimatePresence>
        {!playing && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
          >
            <div className="w-16 h-16 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20">
              <Play size={28} className="text-white ml-1" fill="white" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Mute / unmute button */}
      <button
        onClick={toggleMute}
        className="absolute bottom-3 right-3 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 transition z-10"
      >
        {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
      </button>
      {/* View Full Screen button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          localStorage.setItem("activeReelId", String(postId));
          setActiveTab("reels");
        }}
        className="absolute bottom-3 right-13 px-2.5 py-1 bg-black/60 hover:bg-black/80 rounded-full flex items-center gap-1.5 text-white text-[11px] font-bold transition z-10 border border-white/10"
      >
        <Maximize size={12} />
        Full Screen
      </button>
      {/* Reel badge */}
      <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/10 z-10">
        🎬 REEL
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
interface PostCardProps { post: MockPost }

export default function PostCard({ post }: PostCardProps) {
  const {
    savedPosts,
    toggleSave, toggleFollow,
    addComment, setViewingUserId, setActiveTab,
    setActivePostId, showToast, setSharePostId,
    setPosts, followStates, setReportPostId,
    currentUser, deletePost, updatePost, users,
  } = useApp();

  const [commentText, setCommentText] = useState("");
  const [showHeartPop, setShowHeartPop] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editCaption, setEditCaption] = useState(post.caption || "");
  const [editLocation, setEditLocation] = useState(post.location || "");
  const [editPrivacyType, setEditPrivacyType] = useState(post.privacy || (post.isPrivate ? "private" : "public"));
  const [editPrivacyCustomUser, setEditPrivacyCustomUser] = useState(post.privacyCustomUser || "");
  const [editIsTextOnly, setEditIsTextOnly] = useState(post.isTextOnly || false);
  const [editBgGradient, setEditBgGradient] = useState(post.bgGradient || "linear-gradient(135deg, #FF8A00, #FF2E93, #9E00FF)");
  const [editSelectedFiles, setEditSelectedFiles] = useState<File[]>([]);
  const [editMediaPreviews, setEditMediaPreviews] = useState<string[]>([]);
  const [editFileTypes, setEditFileTypes] = useState<("image" | "video")[]>([]);
  const [editSelectedBgIdx, setEditSelectedBgIdx] = useState<number | null>(null);
  const [editIsSaving, setEditIsSaving] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenEditDialog = () => {
    setEditCaption(post.caption || "");
    setEditLocation(post.location || "");
    setEditPrivacyType(post.privacy || (post.isPrivate ? "private" : "public"));
    setEditPrivacyCustomUser(post.privacyCustomUser || "");
    setEditIsTextOnly(post.isTextOnly || false);
    setEditBgGradient(post.bgGradient || "linear-gradient(135deg, #FF8A00, #FF2E93, #9E00FF)");
    setEditSelectedFiles([]);
    setEditMediaPreviews(post.imgs && post.imgs.length > 0 ? post.imgs : (post.img ? [post.img] : []));
    setEditFileTypes(
      post.mediaType === "video" ? ["video"] : (post.imgs && post.imgs.length > 0 ? post.imgs.map((u: any) => u.match(/\.(mp4|mov|webm)/i) || u.includes("/video/upload/") ? "video" : "image") : (post.img ? [post.mediaType || "image"] : []))
    );
    setEditSelectedBgIdx(
      post.isTextOnly ? BG_GRADIENTS.findIndex(g => g.value === post.bgGradient) : null
    );
    setShowEditDialog(true);
    setShowMenu(false);
  };

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileList = Array.from(files);
      const newUrls = fileList.map(f => URL.createObjectURL(f));
      const newTypes = fileList.map(f => f.type.startsWith("video/") ? "video" as const : "image" as const);
      
      setEditSelectedFiles(prev => [...prev, ...fileList]);
      setEditMediaPreviews(prev => [...prev, ...newUrls]);
      setEditFileTypes(prev => [...prev, ...newTypes]);
      setEditIsTextOnly(false);
      setEditSelectedBgIdx(null);
    }
  };

  const handleSaveEditDialog = async () => {
    setEditIsSaving(true);
    try {
      let finalMediaUrls: any[] = [];
      let finalThumbnailUrl = "";

      if (editIsTextOnly && editSelectedBgIdx !== null) {
        finalThumbnailUrl = BG_GRADIENTS[editSelectedBgIdx].value;
      } else {
        const uploadedUrls = await Promise.all(
          editMediaPreviews.map(async (previewUrl, idx) => {
            if (previewUrl.startsWith("http")) {
              const fileType = editFileTypes[idx] || "image";
              return { url: previewUrl, type: fileType };
            } else {
              const fileIndex = editMediaPreviews.slice(0, idx).filter(url => !url.startsWith("http")).length;
              const file = editSelectedFiles[fileIndex];
              if (!file) throw new Error("File not found for upload");

              const isVideo = file.type.startsWith('video/');
              const uploadData = new FormData();
              uploadData.append('file', file);
              uploadData.append('upload_preset', 'auragram');

              const cloudinaryEndpoint = isVideo
                ? 'https://api.cloudinary.com/v1_1/dj7pg5slk/video/upload'
                : 'https://api.cloudinary.com/v1_1/dj7pg5slk/image/upload';

              const res = await fetch(cloudinaryEndpoint, {
                method: 'POST',
                body: uploadData,
              });

              if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error?.message || `${isVideo ? 'Video' : 'Image'} upload failed`);
              }

              const { secure_url } = await res.json();
              return { url: secure_url, type: isVideo ? 'video' : 'image' };
            }
          })
        );
        finalMediaUrls = uploadedUrls;
        finalThumbnailUrl = uploadedUrls[0]?.url || "";
      }

      await updatePost(post.id, {
        caption: editCaption,
        location: editLocation,
        privacy: editPrivacyType,
        privacyCustomUser: editPrivacyType === "custom" ? editPrivacyCustomUser : undefined,
        isTextOnly: editIsTextOnly,
        bgGradient: editIsTextOnly && editSelectedBgIdx !== null ? BG_GRADIENTS[editSelectedBgIdx].value : undefined,
        mediaUrls: finalMediaUrls,
        thumbnailUrl: finalThumbnailUrl,
      });

      setShowEditDialog(false);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to update post", "info");
    } finally {
      setEditIsSaving(false);
    }
  };

  // ── Reaction state ─────────────────────────────────────────────────────────
  const [currentReaction, setCurrentReaction] = useState<ReactionType>(null);
  const [hasReacted, setHasReacted] = useState(false);
  const [localLikes, setLocalLikes]   = useState(post.likes);
  const [reactionsList, setReactionsList] = useState<{ type: string; userId: string }[]>([]);
  const [showReactionsModal, setShowReactionsModal] = useState(false);

  const [revealed, setRevealed] = useState(false);
  const isOwner = currentUser && String(currentUser.id) === String(post.user.id);

  const handleUnflag = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.flagPostNSFW(post.id, false, true);
      setPosts((current) =>
        current.map((p) => (p.id === post.id ? { ...p, isAdult: false, isAdultUnmarked: true } : p))
      );
      showToast("Post unmarked from NSFW", "success");
    } catch (err) {
      console.error("Failed to unflag post:", err);
      showToast("Failed to unflag post", "info");
    }
  };

  const showNsfwOverlay = post.isAdult && !post.isAdultUnmarked && !revealed;

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

  const touchStart = useRef<number | null>(null);
  const [zoomStyle, setZoomStyle] = useState<React.CSSProperties>({});
  const touchStartDist = useRef<number | null>(null);
  const touchStartCenter = useRef<{ x: number; y: number } | null>(null);
  const isZooming = useRef(false);
  const [isPinching, setIsPinching] = useState(false);

  const [mediaAspectRatio, setMediaAspectRatio] = useState<number | null>(null);
  const [origMediaAspectRatio, setOrigMediaAspectRatio] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      isZooming.current = true;
      setIsPinching(true);
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      touchStartDist.current = dist;

      const centerX = (t1.clientX + t2.clientX) / 2;
      const centerY = (t1.clientY + t2.clientY) / 2;
      touchStartCenter.current = { x: centerX, y: centerY };
    } else if (e.touches.length === 1) {
      touchStart.current = e.touches[0].clientX;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isZooming.current && e.touches.length === 2 && touchStartDist.current && touchStartCenter.current) {
      if (e.cancelable) e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const scale = Math.max(1, dist / touchStartDist.current);

      const centerX = (t1.clientX + t2.clientX) / 2;
      const centerY = (t1.clientY + t2.clientY) / 2;
      const translateX = centerX - touchStartCenter.current.x;
      const translateY = centerY - touchStartCenter.current.y;

      setZoomStyle({
        transform: `scale(${scale}) translate(${translateX / scale}px, ${translateY / scale}px)`,
        transformOrigin: "center",
        zIndex: 50,
        position: "relative",
        transition: "none"
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isZooming.current) {
      isZooming.current = false;
      setIsPinching(false);
      touchStartDist.current = null;
      touchStartCenter.current = null;
      setZoomStyle({
        transform: "scale(1) translate(0px, 0px)",
        transition: "transform 0.2s ease-out"
      });
    } else if (touchStart.current !== null && e.changedTouches.length > 0) {
      const diff = touchStart.current - e.changedTouches[0].clientX;
      const threshold = 50;
      if (post.imgs && post.imgs.length > 1) {
        if (diff > threshold && activeImgIndex < post.imgs.length - 1) {
          setActiveImgIndex((p) => p + 1);
        } else if (diff < -threshold && activeImgIndex > 0) {
          setActiveImgIndex((p) => p - 1);
        }
      }
    }
    touchStart.current = null;
  };

  // Detect if this post is a video/reel
  const isVideo = post.isReel || post.mediaType === "video" ||
    (post.imgs && post.imgs.some((u) => u.match(/\.(mp4|mov|webm)/i) || u.includes("/video/upload/")));

  // The video src (first video media url)
  const videoSrc = isVideo
    ? (post.imgs?.find((u) => u.match(/\.(mp4|mov|webm)/i) || u.includes("/video/upload/")) || post.img)
    : "";

  // Load existing reaction from DB
  useEffect(() => {
    api.getPostReaction(post.id).then((r) => {
      if (r) { setCurrentReaction(r as ReactionType); setHasReacted(true); }
      else { setCurrentReaction(null); setHasReacted(false); }
    }).catch(() => {});
    api.getPostReactionsDetails(post.id).then((list) => {
      setReactionsList(list as any[]);
    }).catch(() => {});
  }, [post.id, currentUser?.id]);

  // Prevent page scroll when reaction pickers are visible on mobile screen
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth >= 768) return;
    if (showHoverPicker || showLongPicker) {
      const preventDefault = (e: TouchEvent) => {
        if (e.cancelable) e.preventDefault();
      };

      // Add a non-passive listener to block scrolling gestures at window level
      window.addEventListener("touchmove", preventDefault, { passive: false });

      // Add overflow hidden to body to prevent scrollbars and page scrolling
      const originalBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      // Prevent scroll on parent elements with scroll containers (e.g., in feed layout)
      const scrollContainers = document.querySelectorAll(".overflow-y-auto");
      const originalOverflows: { el: HTMLElement; overflowY: string; overflow: string }[] = [];
      
      scrollContainers.forEach((el) => {
        const htmlEl = el as HTMLElement;
        originalOverflows.push({
          el: htmlEl,
          overflowY: htmlEl.style.overflowY || "",
          overflow: htmlEl.style.overflow || ""
        });
        htmlEl.style.setProperty("overflow-y", "hidden", "important");
        htmlEl.style.setProperty("overflow", "hidden", "important");
      });

      return () => {
        window.removeEventListener("touchmove", preventDefault);
        document.body.style.overflow = originalBodyOverflow;
        originalOverflows.forEach(({ el, overflowY, overflow }) => {
          if (overflowY) el.style.overflowY = overflowY;
          else el.style.removeProperty("overflow-y");
          
          if (overflow) el.style.overflow = overflow;
          else el.style.removeProperty("overflow");
        });
      };
    }
  }, [showHoverPicker, showLongPicker]);

  // ── Commit a reaction ──────────────────────────────────────────────────────
  const commitReaction = useCallback((type: string) => {
    setShowHoverPicker(false);
    setShowLongPicker(false);
    setHoverPickerHovIdx(null);
    setLongPickerHovIdx(null);

    const prevReaction = currentReaction;
    const prevHasReacted = hasReacted;
    const prevLocalLikes = localLikes;
    const prevReactionsList = reactionsList;
    const isTogglingOff = currentReaction === type;
    const currentUserId = currentUser?.id;

    if (isTogglingOff) {
      setCurrentReaction(null); setHasReacted(false);
      setLocalLikes((l) => Math.max(0, l - 1));
      if (currentUserId) setReactionsList((prev) => prev.filter((r) => r.userId !== currentUserId));
    } else {
      setCurrentReaction(type as ReactionType); setHasReacted(true);
      if (!prevHasReacted) setLocalLikes((l) => l + 1);
      if (currentUserId) {
        setReactionsList((prev) => {
          const filtered = prev.filter((r) => r.userId !== currentUserId);
          return [...filtered, { type, userId: currentUserId }];
        });
      }
      const r = REACTIONS.find((r) => r.type === type);
      if (r) showToast(`${r.emoji} ${r.label}`, "notification");
    }

    api.reactToPost(post.id, type)
      .then((result) => {
        if (result.reaction === null) { setCurrentReaction(null); setHasReacted(false); }
        else { setCurrentReaction(result.reaction as ReactionType); setHasReacted(true); }
        api.getPostReactionsDetails(post.id).then((list) => setReactionsList(list as any[])).catch(() => {});
      })
      .catch((err) => {
        console.error("Optimistic reaction commit failed:", err);
        setCurrentReaction(prevReaction); setHasReacted(prevHasReacted);
        setLocalLikes(prevLocalLikes); setReactionsList(prevReactionsList);
        showToast("Log in to react", "info");
      });
  }, [post.id, currentReaction, hasReacted, localLikes, reactionsList, currentUser, showToast]);

  const handleSimpleLike = useCallback(() => {
    if (showHoverPicker) return;
    commitReaction(currentReaction ?? "love");
  }, [showHoverPicker, currentReaction, commitReaction]);

  const startHoverShow = () => {
    if (hoverHideTimer.current) clearTimeout(hoverHideTimer.current);
    hoverShowTimer.current = setTimeout(() => setShowHoverPicker(true), 340);
  };
  const startHoverHide = () => {
    if (hoverShowTimer.current) clearTimeout(hoverShowTimer.current);
    hoverHideTimer.current = setTimeout(() => { setShowHoverPicker(false); setHoverPickerHovIdx(null); }, 220);
  };
  const cancelHoverHide = () => { if (hoverHideTimer.current) clearTimeout(hoverHideTimer.current); };

  const likeTouchStartTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLikeHolding = useRef(false);

  const handleLikeTouchStart = (e: React.TouchEvent) => {
    isLikeHolding.current = false;
    likeTouchStartTimer.current = setTimeout(() => {
      isLikeHolding.current = true;
      setShowHoverPicker(true);
      if (typeof window !== "undefined" && window.navigator && typeof window.navigator.vibrate === "function") {
        window.navigator.vibrate(15);
      }
    }, 350);
  };

  const handleLikeTouchMove = (e: React.TouchEvent) => {
    if (!isLikeHolding.current) {
      if (likeTouchStartTimer.current) {
        clearTimeout(likeTouchStartTimer.current);
      }
      return;
    }
    if (e.cancelable) {
      e.preventDefault();
    }
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    if (element) {
      const btn = element.closest("[data-reaction-type]");
      if (btn) {
        const idxStr = btn.getAttribute("data-index");
        if (idxStr !== null) {
          setHoverPickerHovIdx(parseInt(idxStr, 10));
        }
      } else {
        setHoverPickerHovIdx(null);
      }
    }
  };

  const handleLikeTouchEnd = (e: React.TouchEvent) => {
    if (likeTouchStartTimer.current) {
      clearTimeout(likeTouchStartTimer.current);
    }
    if (isLikeHolding.current) {
      e.preventDefault();
      if (hoverPickerHovIdx !== null) {
        commitReaction(REACTIONS[hoverPickerHovIdx].type);
      }
      setShowHoverPicker(false);
      setHoverPickerHovIdx(null);
      isLikeHolding.current = false;
    }
  };

  // Double-tap vs Single-tap delay trigger
  const singleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onImagePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => { isLongPress.current = true; setShowLongPicker(true); }, 480);
  };
  const onImagePointerUp = (e: React.PointerEvent) => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    if (showLongPicker) return;
    if (!isLongPress.current) {
      const now = Date.now();
      if (now - lastTap.current < 280) {
        // Double tap confirmed: clear single tap timer and like the post
        if (singleTapTimer.current) {
          clearTimeout(singleTapTimer.current);
          singleTapTimer.current = null;
        }
        setShowHeartPop(true);
        setTimeout(() => setShowHeartPop(false), 850);
        commitReaction("love");
        lastTap.current = 0;
      } else {
        lastTap.current = now;
        // Start a delay before opening the dialog, to verify if it's a single or double tap
        if (singleTapTimer.current) clearTimeout(singleTapTimer.current);
        singleTapTimer.current = setTimeout(() => {
          setActivePostId(post.id);
          singleTapTimer.current = null;
        }, 280);
      }
    }
  };
  const onImagePointerCancel = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    if (singleTapTimer.current) clearTimeout(singleTapTimer.current);
    if (!showLongPicker) isLongPress.current = false;
  };

  const handlePostComment = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commentText.trim()) return;
    addComment(post.id, commentText);
    setCommentText("");
  };

  const handleUserClick = (username: string) => {
    setViewingUserId(username);
    setActiveTab("profile", username);
  };

  const formatCaption = (text: string) => {
    if (!text) return "";
    return text.split(/(\s+)/).map((part, i) => {
      if (part.startsWith("#")) {
        return <span key={i} className="text-[#3897f0] cursor-pointer hover:underline">{part}</span>;
      }
      if (part.startsWith("@") && part.length > 1) {
        const cleanName = part.substring(1).replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
        return (
          <span
            key={i}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              handleUserClick(cleanName);
            }}
            className="text-[#3897f0] font-bold cursor-pointer hover:underline"
          >
            {part.substring(1)}
          </span>
        );
      }
      return part;
    });
  };

  const formatLikes = (n: number) =>
    n >= 1_000_000 ? (n / 1_000_000).toFixed(1) + "M"
    : n >= 1_000   ? (n / 1_000).toFixed(1) + "K"
    : n.toString();

  const getDisplayEmojis = () => {
    const counts: Record<string, number> = {};
    reactionsList.forEach((r) => { counts[r.type] = (counts[r.type] || 0) + 1; });
    const sortedTypes = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    const top2 = sortedTypes.slice(0, 2);
    const emojisToShow = [...top2];
    if (currentReaction && !top2.includes(currentReaction)) emojisToShow.push(currentReaction);
    return emojisToShow.map((type) => REACTIONS.find((r) => r.type === type)?.emoji).filter(Boolean);
  };

  return (
    <div className={`bg-[var(--surface)] backdrop-blur-md border border-[var(--border)] rounded-[24px] mb-6 overflow-hidden w-full text-[var(--text)] shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] transition-all ${isPinching ? 'z-40 relative' : ''}`}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 p-3.5 select-none">
        <img
          src={post.user.img}
          className={`w-[38px] h-[38px] rounded-full object-cover cursor-pointer ${
            post.hasStory ? "p-[2px] bg-[linear-gradient(45deg,#f09433,#e6683c,#dc2743,#bc1888)]" : "border border-[var(--border)]"
          }`}
          alt={post.user.name}
          onClick={() => handleUserClick(post.user.name)}
        />
        <div className="flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span onClick={() => handleUserClick(post.user.name)} className="text-[14px] font-semibold cursor-pointer hover:underline flex items-center gap-1">
              {post.user.name}
              {post.user.verified && <span className="verified-badge" title="Verified" />}
            </span>
            {currentUser && String(currentUser.id) !== String(post.user.id) && post.user.name !== currentUser.name && (
              <>
                <span className="text-zinc-500 text-[12px]">•</span>
                <button
                  onClick={() => toggleFollow(post.user.id)}
                  className={`text-[12px] font-bold cursor-pointer transition ${
                    followStates[post.user.id] || followStates[post.user.name]
                      ? "text-zinc-500 hover:text-[var(--text)]"
                      : "text-insta-blue hover:text-[var(--text)]"
                  }`}
                >
                  {followStates[post.user.id] || followStates[post.user.name] ? "Following" : "Follow"}
                </button>
              </>
            )}
          </div>
          {post.location && <div className="text-[11px] text-[var(--text2)]">{post.location}</div>}
        </div>
        <div className="relative">
          <button onClick={() => setShowMenu(!showMenu)} className="text-[var(--text2)] hover:text-[var(--text)] p-1 cursor-pointer">
            <MoreHorizontal size={18} />
          </button>
          <AnimatePresence>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.1 }}
                  className="absolute right-0 mt-2 bg-[var(--surface2)] border border-[var(--border)] rounded-xl w-44 shadow-xl overflow-hidden z-50 text-[13px]"
                >
                  {isOwnPost ? (
                    <>
                      <div onClick={handleOpenEditDialog} className="p-3 hover:bg-[var(--surface3)] cursor-pointer">✏️ Edit Post</div>
                      <button onClick={handleTogglePrivacy} className="w-full text-left p-3 hover:bg-[var(--surface3)] cursor-pointer border-t border-[var(--border)] flex items-center justify-between bg-transparent outline-none">
                        <span>🔒 Privacy</span>
                        <span className="text-[11px] text-insta-blue font-bold">{post.isPrivate ? "Private" : "Public"}</span>
                      </button>
                      <div onClick={handleDeletePost} className="p-3 text-red-500 hover:bg-[var(--surface3)] cursor-pointer border-t border-[var(--border)] font-bold">🗑️ Delete</div>
                    </>
                  ) : (
                    <>
                      <div onClick={() => { setReportPostId(post.id); setShowMenu(false); }} className="p-3 text-red-500 hover:bg-[var(--surface3)] cursor-pointer">🚩 Report</div>
                      <div onClick={() => setShowMenu(false)} className="p-3 hover:bg-[var(--surface3)] cursor-pointer border-t border-[var(--border)]">🚫 Not interested</div>
                      {currentUser && String(currentUser.id) !== String(post.user.id) && post.user.name !== currentUser.name && (
                        <div onClick={() => { toggleFollow(post.user.id); setShowMenu(false); }} className="p-3 hover:bg-[var(--surface3)] cursor-pointer border-t border-[var(--border)]">➕ Follow</div>
                      )}
                    </>
                  )}
                  <div onClick={() => { setSharePostId(post.id); setShowMenu(false); }} className="p-3 hover:bg-[var(--surface3)] cursor-pointer border-t border-[var(--border)]">🔗 Share</div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Post Media ─────────────────────────────────────────────────────── */}
      {/* ── Post Media ─────────────────────────────────────────────────────── */}
      {post.originalPost && post.originalPost.id ? (
        <div className="px-4 pb-3 flex flex-col gap-3">
          {post.caption && (
            <div className="text-[13px] text-[var(--text)] leading-relaxed px-1">
              {formatCaption(post.caption)}
            </div>
          )}
          <div 
            onClick={() => setActivePostId(post.originalPost!.id)}
            className="border border-[var(--border)] rounded-[20px] overflow-hidden bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 transition duration-200 cursor-pointer"
          >
            {/* Header of original post */}
            <div className="flex items-center gap-2.5 p-3 border-b border-[var(--border)] bg-black/[0.02] dark:bg-white/[0.02]">
              <img
                src={post.originalPost.user.img}
                className="w-6 h-6 rounded-full object-cover border border-[var(--border)]"
                alt=""
              />
              <div className="flex flex-col">
                <span className="text-[12px] font-bold flex items-center gap-1">
                  {post.originalPost.user.name}
                  {post.originalPost.user.verified && <span className="verified-badge w-3.5 h-3.5" />}
                </span>
                {post.originalPost.location && (
                  <span className="text-[9px] text-[var(--text2)]">{post.originalPost.location}</span>
                )}
              </div>
            </div>

            {/* Media/Content of original post */}
            {post.originalPost.isTextOnly ? (
              <div 
                className="w-full py-12 px-6 flex items-center justify-center text-center font-bold text-white leading-relaxed break-words"
                style={{ 
                  background: post.originalPost.bgGradient || "linear-gradient(135deg,#FF8A00,#FF2E93,#9E00FF)", 
                  fontSize: "15px", 
                  textShadow: "0 1px 8px rgba(0,0,0,0.3)" 
                }}
              >
                {formatCaption(post.originalPost.caption)}
              </div>
            ) : (
              <div 
                className="relative w-full flex items-center justify-center bg-black/95 overflow-hidden min-h-[100px] max-h-[550px]"
                style={{ aspectRatio: origMediaAspectRatio || 1.777 }}
              >
                {(() => {
                  const mediaUrl = post.originalPost.imgs?.[0] || post.originalPost.img || "";
                  const isVideoMedia = typeof mediaUrl === "string" && (
                    mediaUrl.match(/\.(mp4|mov|webm)/i) || mediaUrl.includes("/video/upload/")
                  );
                  if (isVideoMedia) {
                    return (
                      <FeedVideo
                        src={mediaUrl}
                        poster={post.originalPost.img || undefined}
                        postId={post.originalPost.id}
                        onDoubleTap={() => {
                          setShowHeartPop(true);
                          setTimeout(() => setShowHeartPop(false), 850);
                          commitReaction("love");
                        }}
                        onLongPress={() => {
                          setShowLongPicker(true);
                        }}
                        onAspectRatioCalculated={setOrigMediaAspectRatio}
                      />
                    );
                  } else {
                    return (
                      <img
                        src={mediaUrl}
                        className="w-full h-full object-contain"
                        onLoad={(e) => {
                          const img = e.currentTarget;
                          if (img.naturalWidth && img.naturalHeight) {
                            setOrigMediaAspectRatio(img.naturalWidth / img.naturalHeight);
                          }
                        }}
                        alt=""
                      />
                    );
                  }
                })()}
              </div>
            )}

            {/* Caption of original post */}
            {!post.originalPost.isTextOnly && post.originalPost.caption && (
              <div className="p-3 text-[12px] text-[var(--text2)] leading-relaxed border-t border-[var(--border)]">
                <span className="font-bold mr-2 text-[var(--text)]">{post.originalPost.user.name}</span>
                {formatCaption(post.originalPost.caption)}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div
          className={`relative select-none flex items-center justify-center bg-black/95 min-h-[100px] max-h-[550px] w-full overflow-hidden ${isPinching ? 'z-40 overflow-visible' : ''}`}
          style={{ aspectRatio: mediaAspectRatio || 1 }}
          onContextMenu={(e) => e.preventDefault()}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {post.isTextOnly ? (
            <div
               className="w-full h-full flex items-center justify-center p-10 text-center font-bold text-white leading-relaxed break-words cursor-pointer select-none relative"
              style={{ background: post.bgGradient || "linear-gradient(135deg,#FF8A00,#FF2E93,#9E00FF)", fontSize: "clamp(18px, 5vw, 30px)", textShadow: "0 2px 12px rgba(0,0,0,0.35)" }}
              onPointerDown={onImagePointerDown}
              onPointerUp={onImagePointerUp}
              onPointerCancel={onImagePointerCancel}
              onPointerLeave={onImagePointerCancel}
            >
              {formatCaption(post.caption)}
            </div>
          ) : (
            <div className={`relative w-full h-full ${isPinching ? 'overflow-visible' : 'overflow-hidden'}`}>
              <AnimatePresence initial={false}>
                <motion.div
                  key={activeImgIndex}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className={`w-full h-full absolute inset-0 ${isPinching ? 'z-50 overflow-visible' : ''}`}
                >
                  {(() => {
                    const mediaList = post.imgs && post.imgs.length > 0 ? post.imgs : [post.img];
                    const currentMediaUrl = mediaList[activeImgIndex] || "";
                    const isCurrentMediaVideo = typeof currentMediaUrl === "string" && (
                      currentMediaUrl.match(/\.(mp4|mov|webm)/i) || currentMediaUrl.includes("/video/upload/")
                    );

                    // Preload the next video in the carousel to load quickly
                    const nextMediaUrl = mediaList[activeImgIndex + 1];
                    const isNextMediaVideo = nextMediaUrl && typeof nextMediaUrl === "string" && (
                      nextMediaUrl.match(/\.(mp4|mov|webm)/i) || nextMediaUrl.includes("/video/upload/")
                    );

                    if (isCurrentMediaVideo) {
                      return (
                        <>
                          <FeedVideo 
                            src={currentMediaUrl} 
                            poster={post.img || undefined} 
                            postId={post.id}
                            onDoubleTap={() => {
                              setShowHeartPop(true);
                              setTimeout(() => setShowHeartPop(false), 850);
                              commitReaction("love");
                            }}
                            onLongPress={() => {
                              setShowLongPicker(true);
                            }}
                            onAspectRatioCalculated={setMediaAspectRatio}
                          />
                          {isNextMediaVideo && (
                            <video src={nextMediaUrl} preload="auto" className="hidden" muted playsInline />
                          )}
                        </>
                      );
                    } else {
                      return (
                        <>
                          <img
                            src={currentMediaUrl}
                            className="w-full h-full object-contain transition-all duration-300"
                            style={{ ...zoomStyle, filter: post.filter && post.filter !== "none" ? post.filter : undefined }}
                            onLoad={(e) => {
                              const img = e.currentTarget;
                              if (img.naturalWidth && img.naturalHeight) {
                                setMediaAspectRatio(img.naturalWidth / img.naturalHeight);
                              }
                            }}
                            alt="post"
                            draggable={false}
                            onPointerDown={onImagePointerDown}
                            onPointerUp={onImagePointerUp}
                            onPointerCancel={onImagePointerCancel}
                            onPointerLeave={onImagePointerCancel}
                          />
                          {isNextMediaVideo && (
                            <video src={nextMediaUrl} preload="auto" className="hidden" muted playsInline />
                          )}
                        </>
                      );
                    }
                  })()}
                </motion.div>
              </AnimatePresence>

              {post.imgs && post.imgs.length > 1 && (
                <>
                  {activeImgIndex > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImgIndex((prev) => prev - 1);
                      }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/80 transition z-20 cursor-pointer hidden sm:flex"
                    >
                      <ChevronLeft size={18} />
                    </button>
                  )}

                  {activeImgIndex < post.imgs.length - 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImgIndex((prev) => prev + 1);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/80 transition z-20 cursor-pointer hidden sm:flex"
                    >
                      <ChevronRight size={18} />
                    </button>
                  )}

                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20 pointer-events-none">
                    {post.imgs.map((_, idx) => (
                      <div key={idx} className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${idx === activeImgIndex ? "bg-white scale-125" : "bg-white/40"}`} />
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
                initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: [0.3, 1.4, 1], opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }} transition={{ duration: 0.42 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 text-[90px] drop-shadow-2xl"
              >❤️</motion.div>
            )}
          </AnimatePresence>

          {/* Long-press reaction picker */}
          <AnimatePresence>
            {showLongPicker && (
              <>
                <div className="absolute inset-0 z-30 bg-black/30"
                  onPointerUp={(e) => { e.stopPropagation(); setShowLongPicker(false); setLongPickerHovIdx(null); }} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.7, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.7, y: 12 }} transition={{ type: "spring", stiffness: 420, damping: 26 }}
                  className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-end gap-1.5 bg-[var(--surface2)]/95 backdrop-blur-2xl border border-[var(--border)] rounded-full px-4 py-2.5 shadow-2xl z-40 select-none"
                  onPointerUp={(e) => e.stopPropagation()}
                >
                  {REACTIONS.map((r, idx) => (
                    <motion.button key={r.type}
                      animate={{ scale: longPickerHovIdx === idx ? 1.55 : 1, y: longPickerHovIdx === idx ? -12 : 0 }}
                      transition={{ type: "spring", stiffness: 480, damping: 22 }}
                      className="text-[28px] leading-none cursor-pointer relative"
                      onPointerEnter={() => setLongPickerHovIdx(idx)} onPointerLeave={() => setLongPickerHovIdx(null)}
                      onPointerUp={(e) => { e.stopPropagation(); commitReaction(r.type); }}
                    >
                      {r.emoji}
                      {longPickerHovIdx === idx && (
                        <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-white bg-black/75 rounded-full px-1.5 py-0.5 whitespace-nowrap pointer-events-none">{r.label}</span>
                      )}
                    </motion.button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* NSFW Blurred Overlay */}
          {showNsfwOverlay && (
            <div className="absolute inset-0 bg-[var(--bg)]/95 backdrop-blur-3xl z-30 flex flex-col items-center justify-center p-6 text-center select-text">
              <span className="text-[36px] mb-3">🔞</span>
              <h4 className="text-[17px] font-bold text-[var(--text)] mb-1">Sensitive Content</h4>
              <p className="text-[12px] text-[var(--text2)] max-w-[240px] mb-6 leading-relaxed">
                This post may contain adult or sensitive content.
              </p>
              <div className="flex flex-col gap-2.5 w-full max-w-[200px]">
                <button
                  type="button"
                  onClick={() => setRevealed(true)}
                  className="w-full py-2.5 rounded-full bg-[var(--text)] text-[var(--bg)] font-extrabold text-[12px] hover:opacity-90 transition active:scale-95 cursor-pointer shadow-md"
                >
                  See NSFW Post
                </button>
                {isOwner && (
                  <button
                    type="button"
                    onClick={handleUnflag}
                    className="w-full py-2.5 rounded-full bg-transparent hover:bg-[var(--surface2)] border border-[var(--border)] text-[var(--text)] font-bold text-[11px] transition active:scale-95 cursor-pointer"
                  >
                    This is not NSFW Post
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Actions bar ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3.5 p-3.5 pb-1 select-none">
        <div className="relative" onMouseEnter={startHoverShow} onMouseLeave={startHoverHide}>
          <button
            onClick={handleSimpleLike}
            onTouchStart={handleLikeTouchStart}
            onTouchMove={handleLikeTouchMove}
            onTouchEnd={handleLikeTouchEnd}
            className="cursor-pointer transition hover:scale-105 active:scale-95 flex items-center gap-1"
            style={{ touchAction: "none", color: reactionInfo?.color }}
          >
            {currentReaction ? (
              <span className="text-[22px] leading-none">{reactionInfo?.emoji}</span>
            ) : hasReacted && reactionInfo ? (
              <span className="text-[22px] leading-none">{reactionInfo.emoji}</span>
            ) : (
              <Heart size={24} fill="none" className="text-[var(--text)]" />
            )}
          </button>
          <div onMouseEnter={cancelHoverHide} onMouseLeave={startHoverHide}>
            <ReactionPicker visible={showHoverPicker} anchorBottom hoveredIdx={hoverPickerHovIdx}
              onHover={setHoverPickerHovIdx}
              onSelect={(type) => { commitReaction(type); setShowHoverPicker(false); }}
              onMouseLeave={startHoverHide}
            />
          </div>
        </div>

        <button onClick={() => setActivePostId(post.id)} className="text-[var(--text)] cursor-pointer hover:scale-105 active:scale-95 transition">
          <MessageCircle size={24} />
        </button>

        <button onClick={() => setSharePostId(post.id)} className="text-[var(--text)] cursor-pointer hover:scale-105 active:scale-95 transition">
          <Send size={24} />
        </button>

        <button onClick={() => toggleSave(post.id)} className="ml-auto cursor-pointer transition hover:scale-105 active:scale-95 text-[var(--text)]">
          <Bookmark size={24} fill={isSaved ? "currentColor" : "none"} />
        </button>
      </div>

      {/* Reactions bar */}
      <div onClick={() => setShowReactionsModal(true)} className="px-3.5 py-1 flex items-center gap-1.5 text-[13px] font-semibold cursor-pointer hover:underline w-fit select-none">
        <div className="flex items-center -space-x-1.5 mr-0.5">
          {getDisplayEmojis().map((emoji, i) => (
            <span key={i} className="text-[15px] leading-none drop-shadow-sm select-none">{emoji}</span>
          ))}
        </div>
        <span>{formatLikes(localLikes)}</span>
        <span className="font-normal text-[var(--text2)]">{localLikes === 1 ? 'reaction' : 'reactions'}</span>
      </div>

      <>
        {/* Caption */}
        {!(post.originalPost && post.originalPost.id) && !post.isTextOnly && (
          <div className="px-3.5 py-1 text-[13px] leading-relaxed">
            <span onClick={() => handleUserClick(post.user.name)} className="font-bold mr-2 cursor-pointer hover:underline text-[var(--text)]">{post.user.name}</span>
            {formatCaption(post.caption)}
          </div>
        )}
        {!(post.originalPost && post.originalPost.id) && post.isTextOnly && (
          <div className="px-3.5 py-1 text-[13px] text-[var(--text2)]">
            <span onClick={() => handleUserClick(post.user.name)} className="font-bold mr-2 cursor-pointer hover:underline text-[var(--text)]">{post.user.name}</span>
            Text post
          </div>
        )}

        {/* Comments link */}
        <div onClick={() => setActivePostId(post.id)} className="px-3.5 py-1 text-[12px] text-[var(--text2)] cursor-pointer hover:text-[var(--text)] transition">
          {(post.commentsCount ?? 0) > 0 ? `View all ${post.commentsCount} comments` : "Add a comment…"}
        </div>

        {/* Time */}
        <div className="px-3.5 pt-0.5 pb-3.5 text-[11px] text-[var(--text3)] uppercase tracking-wider">
          {post.time} · AURAGRAM
        </div>

        {/* Comment input */}
        <form 
          onClick={(e) => {
            e.preventDefault();
            setActivePostId(post.id);
          }}
          className="border-t border-[var(--border)] flex items-center p-3.5 gap-3 bg-black/15 cursor-pointer"
        >
          <span className="text-[20px] cursor-pointer">😊</span>
          <input
            type="text"
            placeholder="Add a comment…"
            readOnly
            className="flex-1 bg-transparent border-none text-[13px] text-[var(--text)] outline-none placeholder-[var(--text3)] cursor-pointer"
          />
          <button type="button" className="text-[#3897f0] font-bold text-[13px]">
            Post
          </button>
        </form>
      </>

      <ReactionsModal isOpen={showReactionsModal} onClose={() => setShowReactionsModal(false)} postId={post.id} />

      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="relative w-full max-w-[340px] bg-[var(--surface2)] border border-[var(--border)] rounded-[24px] overflow-hidden shadow-2xl z-10 text-[var(--text)] text-center p-6 flex flex-col items-center gap-4 animate-fadeIn"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-1">
                <Trash2 size={24} />
              </div>
              <div className="flex flex-col gap-1">
                <h4 className="font-bold text-[16px] text-white">Delete Post?</h4>
                <p className="text-[12px] text-[var(--text2)] leading-relaxed px-4">
                  Are you sure you want to delete this post? This action cannot be undone.
                </p>
              </div>
              <div className="w-full flex flex-col gap-2 mt-2">
                <button
                  type="button"
                  onClick={async () => {
                    setShowDeleteConfirm(false);
                    try {
                      await deletePost(post.id);
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl transition cursor-pointer active:scale-[0.98]"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="w-full py-2.5 bg-[var(--surface3)] hover:bg-[var(--border)] text-[var(--text)] font-bold text-xs rounded-xl transition cursor-pointer active:scale-[0.98]"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Post Edit Dialog Modal */}
      <AnimatePresence>
        {showEditDialog && (
          <div 
            className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[250] flex items-center justify-center p-4 text-[var(--text)] select-none"
            onClick={() => setShowEditDialog(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-[24px] w-full max-w-[550px] max-h-[85vh] overflow-y-auto shadow-2xl flex flex-col relative custom-scroll"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-[var(--border)] bg-[var(--surface)] sticky top-0 z-30">
                <button
                  onClick={() => setShowEditDialog(false)}
                  className="text-[var(--text)] hover:text-gray-300 text-[14px] cursor-pointer"
                >
                  Cancel
                </button>
                <h3 className="font-bold text-[15px]">Edit Post</h3>
                <button
                  onClick={handleSaveEditDialog}
                  disabled={editIsSaving || (!editIsTextOnly && editMediaPreviews.length === 0)}
                  className="text-insta-blue hover:text-white font-bold text-[14px] cursor-pointer disabled:opacity-40 disabled:cursor-default transition-opacity"
                >
                  {editIsSaving ? "Saving…" : "Save"}
                </button>
              </div>

              {/* Post Type Selector */}
              <div className="flex border-b border-[var(--border)] text-xs shrink-0 select-none bg-[var(--surface2)]">
                <button
                  type="button"
                  onClick={() => {
                    setEditIsTextOnly(false);
                    setEditSelectedBgIdx(null);
                  }}
                  className={`flex-1 py-3 text-center font-bold cursor-pointer transition ${
                    !editIsTextOnly ? "text-insta-blue border-b-2 border-insta-blue bg-[var(--surface)]" : "text-[var(--text3)] hover:text-[var(--text)]"
                  }`}
                >
                  🖼️ Media Post
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditIsTextOnly(true);
                    setEditSelectedBgIdx(editSelectedBgIdx !== null ? editSelectedBgIdx : 0);
                  }}
                  className={`flex-1 py-3 text-center font-bold cursor-pointer transition ${
                    editIsTextOnly ? "text-insta-blue border-b-2 border-insta-blue bg-[var(--surface)]" : "text-[var(--text3)] hover:text-[var(--text)]"
                  }`}
                >
                  🎨 Color Text Post
                </button>
              </div>

              {/* Media preview/upload list */}
              {!editIsTextOnly && (
                <div className="p-4 border-b border-[var(--border)] bg-black/10">
                  <p className="text-[11px] font-semibold text-[var(--text3)] uppercase tracking-wider mb-2.5">
                    Photos / Videos
                  </p>
                  <div className="flex gap-2.5 overflow-x-auto pb-1 select-none no-scrollbar">
                    {editMediaPreviews.map((previewUrl, idx) => (
                      <div key={`edit-media-${idx}`} className="w-16 h-16 rounded-xl overflow-hidden shrink-0 relative border border-[var(--border)] group">
                        {editFileTypes[idx] === "video" ? (
                          <video src={previewUrl} className="w-full h-full object-cover" muted />
                        ) : (
                          <img src={previewUrl} className="w-full h-full object-cover" alt="media preview" />
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setEditMediaPreviews(prev => prev.filter((_, i) => i !== idx));
                            setEditFileTypes(prev => prev.filter((_, i) => i !== idx));
                          }}
                          className="absolute -top-1.5 -right-1.5 bg-black/75 hover:bg-black rounded-full p-0.5 text-white border border-[var(--border)] transition scale-90"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => editFileInputRef.current?.click()}
                      className="w-16 h-16 rounded-xl border-2 border-dashed border-[var(--border)] hover:border-[var(--text3)] flex items-center justify-center text-[var(--text3)] hover:text-[var(--text)] transition cursor-pointer"
                    >
                      <Plus size={20} />
                    </button>
                    <input
                      type="file"
                      ref={editFileInputRef}
                      onChange={handleEditFileChange}
                      className="hidden"
                      multiple
                      accept="image/*,video/*"
                    />
                  </div>
                </div>
              )}

              {/* Color bg post preview with inline editor */}
              {editIsTextOnly && editSelectedBgIdx !== null && (
                <div className="aspect-square bg-black overflow-hidden relative border-b border-[var(--border)]">
                  <div
                    className="w-full h-full flex items-center justify-center p-8 text-center text-[19px] font-semibold break-words text-white select-text leading-relaxed relative"
                    style={{ background: BG_GRADIENTS[editSelectedBgIdx].value }}
                  >
                    <textarea
                      placeholder="Your text will appear here..."
                      value={editCaption}
                      onChange={(e) => setEditCaption(e.target.value)}
                      maxLength={2200}
                      className="w-full h-full bg-transparent border-none outline-none resize-none text-center text-white placeholder-white/60 font-semibold focus:ring-0 leading-relaxed font-sans flex items-center justify-center pt-20 no-scrollbar"
                    />
                  </div>
                  {/* Gradient pickers */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2.5 z-10 bg-black/40 backdrop-blur-md px-3.5 py-2 rounded-full border border-white/10">
                    {BG_GRADIENTS.map((g, idx) => (
                      <button
                        key={g.name}
                        type="button"
                        onClick={() => setEditSelectedBgIdx(idx)}
                        className={`w-6 h-6 rounded-full border-2 cursor-pointer transition hover:scale-110 active:scale-95 ${
                          editSelectedBgIdx === idx ? "border-white" : "border-transparent"
                        }`}
                        style={{ background: g.value }}
                        title={g.name}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Form Input fields */}
              <div className="p-4.5 flex flex-col gap-4">
                {!editIsTextOnly && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11.5px] font-bold uppercase tracking-wider text-[var(--text2)]">Caption</label>
                    <textarea
                      value={editCaption}
                      onChange={(e) => setEditCaption(e.target.value)}
                      placeholder="Write a caption..."
                      className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-xl p-3 text-[13.5px] text-[var(--text)] outline-none resize-y min-h-[80px]"
                    />
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11.5px] font-bold uppercase tracking-wider text-[var(--text2)]">Location</label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    placeholder="Enter location..."
                    className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-xl p-3 text-[13.5px] text-[var(--text)] outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11.5px] font-bold uppercase tracking-wider text-[var(--text2)]">Privacy</label>
                  <select
                    value={editPrivacyType}
                    onChange={(e) => {
                      setEditPrivacyType(e.target.value);
                      if (e.target.value !== "custom") {
                        setEditPrivacyCustomUser("");
                      } else if (!editPrivacyCustomUser && users && users.length > 0) {
                        setEditPrivacyCustomUser(users[0].name);
                      }
                    }}
                    className="bg-[var(--surface2)] border border-[var(--border)] text-[13.5px] text-[var(--text)] rounded-xl p-3 outline-none cursor-pointer"
                  >
                    <option value="public">🌍 Public</option>
                    <option value="followers">👥 Followers</option>
                    <option value="private">🔒 Private</option>
                    <option value="custom">👤 Custom User</option>
                  </select>
                </div>

                {editPrivacyType === "custom" && users && users.length > 0 && (
                  <div className="flex flex-col gap-1.5 mt-0.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text2)]">Allowed User</label>
                    <select
                      value={editPrivacyCustomUser}
                      onChange={(e) => setEditPrivacyCustomUser(e.target.value)}
                      className="bg-[var(--surface2)] border border-[var(--border)] text-[13.5px] text-[var(--text)] rounded-xl p-3 outline-none cursor-pointer"
                    >
                      {users.map((u) => (
                        <option key={`edit-custom-user-sel-dialog-${u.id}`} value={u.name}>
                          {u.name} ({u.full || u.name})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
