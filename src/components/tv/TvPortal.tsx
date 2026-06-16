"use client";

import React, { useEffect, useState, useRef } from "react";
import Hls from "hls.js";
import { useApp } from "../AppContext";
import { api } from "../../lib/api";
import { 
  Tv, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize,
  RotateCcw, 
  RotateCw, 
  Plus, 
  Trash2, 
  Search, 
  Radio, 
  AlertCircle,
  ChevronRight,
  Sliders,
  Settings
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface TvChannel {
  id: number;
  name: string;
  url: string;
  category: string;
  logoUrl?: string;
  createdAt?: string;
}

export default function TvPortal() {
  const { currentUser, showToast } = useApp();
  const isAdmin = currentUser?.role === "admin";

  const [channels, setChannels] = useState<TvChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<TvChannel | null>(null);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Custom player states
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [isLive, setIsLive] = useState(true);

  // Controls visibility management
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetControlsTimeout = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying]);

  useEffect(() => {
    const handleMouseMove = () => {
      resetControlsTimeout();
    };
    const handleContainerClick = () => {
      resetControlsTimeout();
    };
    const container = playerContainerRef.current;
    if (container) {
      container.addEventListener("mousemove", handleMouseMove);
      container.addEventListener("click", handleContainerClick);
    }
    return () => {
      if (container) {
        container.removeEventListener("mousemove", handleMouseMove);
        container.removeEventListener("click", handleContainerClick);
      }
    };
  }, [isPlaying]);

  const handleVideoClick = (e: React.MouseEvent) => {
    if (!showControls) {
      e.stopPropagation();
      resetControlsTimeout();
    } else {
      togglePlay();
    }
  };

  // Admin states
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [newChannel, setNewChannel] = useState({
    name: "",
    url: "",
    category: "General",
    logoUrl: ""
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Load channels on mount
  const loadChannels = async () => {
    try {
      setLoadingChannels(true);
      const data = await api.getTvChannels(true);
      setChannels(data);
      if (data.length > 0) {
        setSelectedChannel(data[0]);
      }
    } catch (err: any) {
      console.error("Failed to load TV channels:", err);
      showToast("Could not load TV channels", "info");
    } finally {
      setLoadingChannels(false);
    }
  };

  useEffect(() => {
    loadChannels();
  }, []);

  const sessionIdRef = useRef<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      let id = sessionStorage.getItem("tv_session_id");
      if (!id) {
        id = `tv_session_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
        sessionStorage.setItem("tv_session_id", id);
      }
      sessionIdRef.current = id;
    }
  }, []);

  // Send heartbeats to track live viewers
  useEffect(() => {
    if (!selectedChannel || !isPlaying) return;

    const sendHeartbeat = async (isNew = false) => {
      try {
        await fetch("/api/tv/heartbeat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            channelId: selectedChannel.id,
            sessionId: sessionIdRef.current || `fallback_${currentUser?.id || "anon"}`,
            userId: currentUser?.id || null,
            isNewChannel: isNew,
          }),
        });
      } catch (err) {
        console.error("Heartbeat error:", err);
      }
    };

    // Send immediately when channel is selected
    sendHeartbeat(true);

    // Set up interval for subsequent heartbeats
    const interval = setInterval(() => {
      sendHeartbeat(false);
    }, 10000); // every 10 seconds

    return () => {
      clearInterval(interval);
    };
  }, [selectedChannel, isPlaying, currentUser]);

  // Initialize Hls.js on video stream changes
  useEffect(() => {
    if (!selectedChannel || !videoRef.current) return;

    setVideoError(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    const video = videoRef.current;
    const streamUrl = selectedChannel.url;

    // Clean up previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        maxMaxBufferLength: 10,
        enableWorker: true,
        lowLatencyMode: true,
      });
      hlsRef.current = hls;

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play()
          .then(() => setIsPlaying(true))
          .catch((err) => console.log("Auto-play blocked:", err));
      });

      let networkRetryCount = 0;
      let attemptedUpgrade = false;
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.warn("HLS network error, trying to recover...", data);
              if (data.details === "manifestLoadError" && streamUrl.startsWith("http://") && !attemptedUpgrade) {
                attemptedUpgrade = true;
                const upgradedUrl = streamUrl.replace("http://", "https://");
                console.log("Attempting HTTP -> HTTPS stream upgrade fallback:", upgradedUrl);
                hls.loadSource(upgradedUrl);
              } else if (networkRetryCount < 3) {
                networkRetryCount++;
                setTimeout(() => {
                  if (hlsRef.current) {
                    hlsRef.current.startLoad();
                  }
                }, 2000);
              } else {
                console.error("HLS network error recovery failed after 3 retries");
                setVideoError(true);
                hls.destroy();
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn("HLS media error, trying to recover...", data);
              hls.recoverMediaError();
              break;
            default:
              console.error("Fatal HLS error:", data);
              setVideoError(true);
              hls.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Native Apple HLS support
      video.src = streamUrl;
      video.addEventListener("loadedmetadata", () => {
        video.play()
          .then(() => setIsPlaying(true))
          .catch((err) => console.log("Auto-play blocked:", err));
      });
      video.addEventListener("error", () => {
        setVideoError(true);
      });
    } else {
      setVideoError(true);
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [selectedChannel]);

  // Video event handlers
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
    const dur = videoRef.current.duration;
    if (dur && isFinite(dur)) {
      setDuration(dur);
      setIsLive(false);
    } else {
      setIsLive(true);
    }
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    const dur = videoRef.current.duration;
    if (dur && isFinite(dur)) {
      setDuration(dur);
      setIsLive(false);
    } else {
      setIsLive(true);
    }
  };

  // Video Controls
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play()
        .then(() => setIsPlaying(true))
        .catch((err) => console.error(err));
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (videoRef.current) {
      videoRef.current.currentTime = val;
    }
  };

  const skip = (amount: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime += amount;
  };

  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;

    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch((err) => console.error("Error entering fullscreen:", err));
    } else {
      document.exitFullscreen()
        .then(() => setIsFullscreen(false));
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Admin Operations
  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannel.name || !newChannel.url) {
      showToast("Name and URL are required", "info");
      return;
    }
    try {
      const created = await api.createTvChannel(newChannel);
      setChannels((prev) => [created, ...prev]);
      if (!selectedChannel) {
        setSelectedChannel(created);
      }
      setNewChannel({
        name: "",
        url: "",
        category: "General",
        logoUrl: ""
      });
      showToast("Channel added successfully! 📺", "success");
    } catch (err: any) {
      console.error(err);
      showToast("Failed to add channel", "info");
    }
  };

  const handleDeleteChannel = async (id: number) => {
    if (!confirm("Are you sure you want to delete this channel?")) return;
    try {
      await api.deleteTvChannel(id);
      setChannels((prev) => prev.filter((c) => c.id !== id));
      if (selectedChannel?.id === id) {
        setSelectedChannel(channels.find((c) => c.id !== id) || null);
      }
      showToast("Channel deleted", "success");
    } catch (err: any) {
      console.error(err);
      showToast("Failed to delete channel", "info");
    }
  };

  // Filtering channels
  const categories = ["All", ...Array.from(new Set(channels.map((c) => c.category)))];
  
  const filteredChannels = channels.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || c.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds === Infinity) return "00:00";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const pad = (n: number) => (n < 10 ? `0${n}` : n);
    if (hrs > 0) {
      return `${hrs}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  };

  return (
    <div className="flex flex-col lg:flex-row h-full w-full bg-[#0a0a0c] text-white overflow-hidden">
      
      {/* Channels List Sidebar (Left / Top on Mobile) */}
      <div className="hidden lg:flex lg:w-[320px] shrink-0 bg-[#121216]/60 backdrop-blur-md border-r border-white/[0.06] flex-col h-full">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="text-[#FF2E93] animate-pulse" size={20} />
            <span className="font-extrabold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-zinc-200 to-zinc-400">
              AuraTV Channels
            </span>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowAdminPanel(!showAdminPanel)}
              className="p-1.5 rounded-lg hover:bg-white/[0.08] text-zinc-400 hover:text-white transition flex items-center gap-1 text-xs"
              title="Channel settings"
            >
              <Settings size={16} />
            </button>
          )}
        </div>

        {/* Search */}
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={15} />
            <input
              type="text"
              placeholder="Search live channels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2 text-xs text-white outline-none focus:border-[#FF2E93]/60 transition"
            />
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex gap-1.5 px-3 pb-3 overflow-x-auto no-scrollbar shrink-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full text-[10px] font-bold transition shrink-0 uppercase tracking-wider ${
                selectedCategory === cat
                  ? "bg-[#FF2E93] text-white shadow-md shadow-[#FF2E93]/20"
                  : "bg-white/[0.04] text-zinc-400 hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Channels scroll list */}
        <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
          {loadingChannels ? (
            <div className="flex flex-col items-center justify-center py-10 text-zinc-500 gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-[#FF2E93]" />
              <span className="text-xs">Loading TV Channels...</span>
            </div>
          ) : filteredChannels.length === 0 ? (
            <div className="text-center py-10 text-xs text-zinc-500">No channels found</div>
          ) : (
            filteredChannels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => setSelectedChannel(channel)}
                className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition text-left ${
                  selectedChannel?.id === channel.id
                    ? "bg-gradient-to-r from-white/[0.06] to-white/[0.02] border-l-4 border-[#FF2E93] pl-2"
                    : "hover:bg-white/[0.02] border-l-4 border-transparent"
                }`}
              >
                {/* Logo */}
                <div className="w-10 h-10 rounded-lg bg-zinc-800/80 border border-white/[0.05] overflow-hidden flex items-center justify-center shrink-0">
                  {channel.logoUrl ? (
                    <img src={channel.logoUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Tv size={18} className="text-zinc-400" />
                  )}
                </div>
                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{channel.name}</p>
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wider mt-0.5">{channel.category}</p>
                </div>
                <ChevronRight size={14} className="text-zinc-500" />
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Viewing Area */}
      <div className="flex-1 flex flex-col min-w-0 relative h-full">
        <AnimatePresence>
          {showAdminPanel && isAdmin && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute inset-x-0 top-0 bg-[#0f0f13]/95 backdrop-blur-lg border-b border-white/[0.08] p-5 z-40 flex flex-col md:flex-row gap-5"
            >
              {/* Form */}
              <form onSubmit={handleAddChannel} className="flex-1 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#FF2E93]">Create New TV Channel</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Channel Name"
                    value={newChannel.name}
                    onChange={(e) => setNewChannel({ ...newChannel, name: e.target.value })}
                    className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#FF2E93]/60 w-full"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Category"
                    value={newChannel.category}
                    onChange={(e) => setNewChannel({ ...newChannel, category: e.target.value })}
                    className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#FF2E93]/60 w-full"
                  />
                  <input
                    type="url"
                    placeholder="HLS Stream URL (.m3u8)"
                    value={newChannel.url}
                    onChange={(e) => setNewChannel({ ...newChannel, url: e.target.value })}
                    className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#FF2E93]/60 w-full md:col-span-2"
                    required
                  />
                  <input
                    type="url"
                    placeholder="Logo Image URL (Optional)"
                    value={newChannel.logoUrl}
                    onChange={(e) => setNewChannel({ ...newChannel, logoUrl: e.target.value })}
                    className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#FF2E93]/60 w-full md:col-span-2"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-[#FF2E93] hover:bg-[#FF2E93]/90 text-white font-bold py-1.5 px-4 rounded-lg text-xs transition-all shadow-md shadow-[#FF2E93]/20 cursor-pointer"
                >
                  Save Channel
                </button>
              </form>

              {/* Management List */}
              <div className="flex-1 md:border-l md:border-white/[0.06] md:pl-5 flex flex-col max-h-[180px]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Manage Channel List</h3>
                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                  {channels.map((chan) => (
                    <div key={chan.id} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/[0.04] text-xs">
                      <span className="font-semibold truncate max-w-[200px]">{chan.name}</span>
                      <button
                        onClick={() => handleDeleteChannel(chan.id)}
                        className="text-zinc-500 hover:text-red-400 p-1 rounded-md transition"
                        title="Delete Channel"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Video Player Section */}
        <div className="flex-1 flex items-center justify-center p-0 sm:p-4 md:p-8 bg-[#040406] min-h-0">
          {selectedChannel ? (
            <div 
              ref={playerContainerRef}
              className="w-full max-w-[960px] max-h-full aspect-video bg-[#000] sm:rounded-2xl overflow-hidden relative shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-white/[0.08] group"
            >
              {/* Main Video Element */}
              <div className="relative w-full h-full bg-black flex items-center justify-center">
                <video
                  ref={videoRef}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onClick={handleVideoClick}
                  className="w-full h-full object-contain cursor-pointer"
                  playsInline
                />

                {/* Video Error Overlay */}
                {videoError && (
                  <div className="absolute inset-0 bg-[#0a0a0c]/95 flex flex-col items-center justify-center gap-4 p-6 text-center z-20 select-none">
                    <AlertCircle className="text-[#FF2E93] animate-pulse" size={42} />
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-zinc-200">Playback Connection Blocked</h3>
                      {selectedChannel?.url.startsWith("http://") && typeof window !== "undefined" && window.location.protocol === "https:" ? (
                        <p className="text-[11px] text-amber-400 max-w-md mx-auto leading-relaxed">
                          <strong>Mixed Content Warning:</strong> You are accessing this site via secure HTTPS, but this stream is served over insecure HTTP. Browsers block insecure requests by default.
                        </p>
                      ) : (
                        <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                          This stream failed to load. This is usually due to CORS restrictions or the stream server being temporarily offline.
                        </p>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                      <a 
                        href={selectedChannel.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="bg-[#FF2E93] hover:bg-[#FF2E93]/90 text-white font-bold py-1.5 px-4 rounded-xl text-xs transition-all shadow-md shadow-[#FF2E93]/20 cursor-pointer"
                      >
                        Play in New Tab ↗
                      </a>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(selectedChannel.url);
                          showToast("Stream Link Copied! 📋", "success");
                        }}
                        className="bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-zinc-300 hover:text-white font-bold py-1.5 px-4 rounded-xl text-xs transition cursor-pointer"
                      >
                        Copy URL for VLC
                      </button>
                    </div>
                    <span className="text-[9px] text-zinc-500 max-w-xs leading-normal">
                      Tip: You can click the shield or lock icon in your browser's address bar and select "Site Settings" to "Allow Insecure Content" for this site.
                    </span>
                  </div>
                )}

                {/* Big Center Play/Pause button on Hover */}
                {!videoError && (
                  <div 
                    onClick={togglePlay}
                    className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 z-10 pointer-events-none ${
                      showControls ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    <div className="w-14 h-14 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white scale-90 hover:scale-100 transition-all pointer-events-auto cursor-pointer shadow-lg">
                      {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
                    </div>
                  </div>
                )}
              </div>

              {/* Custom Player Controls Bar */}
              <div className={`bg-gradient-to-t from-black/95 via-black/85 to-transparent p-2.5 sm:p-4 pb-4 pt-10 flex flex-col gap-2 absolute bottom-0 left-0 right-0 z-20 select-none transition-all duration-300 ${
                showControls ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-2 pointer-events-none"
              }`}>
                
                {/* Progress bar / Seekbar */}
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="text-[10px] font-semibold text-zinc-400 select-none">
                    {formatTime(currentTime)}
                  </span>
                  <input
                    type="range"
                    min="0"
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleSeek}
                    disabled={isLive || duration === 0}
                    className={`flex-1 h-1 bg-white/[0.08] rounded-lg appearance-none cursor-pointer accent-[#FF2E93] focus:outline-none transition-all ${
                      isLive ? "opacity-30 cursor-not-allowed" : "hover:h-1.5"
                    }`}
                  />
                  <span className="text-[10px] font-semibold text-zinc-400 select-none">
                    {isLive ? (
                      <span className="flex items-center gap-1.5 text-[#FF2E93] font-bold tracking-wider text-[9px] uppercase bg-[#FF2E93]/10 px-2 py-0.5 rounded-full border border-[#FF2E93]/20">
                        <span className="w-1.5 h-1.5 bg-[#FF2E93] rounded-full animate-ping" />
                        Live
                      </span>
                    ) : (
                      formatTime(duration)
                    )}
                  </span>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between mt-0.5">
                  
                  {/* Left Controls */}
                  <div className="flex items-center gap-1 sm:gap-2">
                    <button
                      onClick={togglePlay}
                      className="p-1.5 sm:p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/[0.05] transition cursor-pointer"
                      title={isPlaying ? "Pause" : "Play"}
                    >
                      {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                    </button>

                    <button
                      onClick={() => skip(-10)}
                      className="p-1.5 sm:p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.05] transition cursor-pointer"
                      title="Rewind 10s"
                    >
                      <RotateCcw size={16} />
                    </button>

                    <button
                      onClick={() => skip(10)}
                      className="p-1.5 sm:p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.05] transition cursor-pointer"
                      title="Forward 10s"
                    >
                      <RotateCw size={16} />
                    </button>

                    {/* Volume */}
                    <div className="flex items-center gap-1 group/volume">
                      <button
                        onClick={toggleMute}
                        className="p-1.5 sm:p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/[0.05] transition cursor-pointer"
                        title={isMuted ? "Unmute" : "Mute"}
                      >
                        {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="hidden sm:block w-16 h-1 bg-white/[0.08] rounded-lg appearance-none cursor-pointer accent-white transition-all group-hover/volume:w-20"
                      />
                    </div>
                  </div>

                  {/* Right Controls */}
                  <div className="flex items-center gap-1 md:gap-2">
                    <span className="text-[9px] sm:text-[10px] font-bold text-zinc-400 bg-white/[0.04] border border-white/[0.05] px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg mr-1 sm:mr-2 max-w-[90px] sm:max-w-[200px] truncate select-none">
                      {selectedChannel.name}
                    </span>
                    <button
                      onClick={toggleFullscreen}
                      className="p-1.5 sm:p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/[0.05] transition cursor-pointer"
                      title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                    >
                      {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                    </button>
                  </div>
                </div>

              </div>
            </div>
          ) : (
            <div className="text-center py-20 text-zinc-500">
              <Tv size={48} className="mx-auto text-zinc-600 mb-3" />
              <p className="text-sm">Select a channel from the left sidebar to start streaming.</p>
            </div>
          )}
        </div>

        {/* Bottom Carousel for mobile channel list */}
        <div className="lg:hidden w-full bg-[#121216]/80 backdrop-blur-md border-t border-white/[0.06] p-4 pb-6 shrink-0 overflow-hidden">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 mb-2 px-1">
            Live TV Channels
          </p>
          <div className="flex gap-3 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory pb-1">
            {filteredChannels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => setSelectedChannel(channel)}
                className={`snap-start flex flex-col items-center gap-1.5 p-2 rounded-xl transition w-[75px] shrink-0 text-center ${
                  selectedChannel?.id === channel.id
                    ? "bg-white/[0.08] border border-[#FF2E93]/60"
                    : "bg-white/[0.02] border border-transparent hover:bg-white/[0.04]"
                }`}
              >
                {/* Logo 50x50px */}
                <div className="w-[50px] h-[50px] rounded-xl bg-zinc-800/80 border border-white/[0.05] overflow-hidden flex items-center justify-center shrink-0">
                  {channel.logoUrl ? (
                    <img src={channel.logoUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Tv size={22} className="text-zinc-400" />
                  )}
                </div>
                {/* Name */}
                <p className="text-[9px] font-bold text-zinc-200 truncate w-full select-none">{channel.name}</p>
              </button>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
