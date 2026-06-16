import React, { useRef, useState, useEffect } from "react";
import { useApp } from "../AppContext";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function StoriesBar() {
  const { storyGroups, setStoryViewerIndex, setShowStoryCreate, currentUser } = useApp();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const [showLeftBtn, setShowLeftBtn] = useState(false);
  const [showRightBtn, setShowRightBtn] = useState(false);
  const [lazyLoadCount, setLazyLoadCount] = useState(8); // Lazy load threshold

  const handleAddStory = () => {
    setShowStoryCreate(true);
  };

  // Find if user has their own story in the groups
  const myGroupIndex = currentUser ? storyGroups.findIndex(g => g.userId === currentUser.id) : -1;
  const hasMyStory = myGroupIndex !== -1;

  // Check scroll position to dynamically show/hide next/prev buttons on desktop
  const checkScroll = () => {
    const container = scrollContainerRef.current;
    if (container) {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      setShowLeftBtn(scrollLeft > 5);
      setShowRightBtn(scrollLeft + clientWidth < scrollWidth - 5);
      
      // Load more stories dynamically as user scrolls (lazy loading)
      const scrollPercentage = (scrollLeft + clientWidth) / scrollWidth;
      if (scrollPercentage > 0.7 && lazyLoadCount < storyGroups.length) {
        setLazyLoadCount((prev) => Math.min(prev + 8, storyGroups.length));
      }
    }
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      checkScroll();
      container.addEventListener("scroll", checkScroll);
      window.addEventListener("resize", checkScroll);
    }
    return () => {
      if (container) {
        container.removeEventListener("scroll", checkScroll);
      }
      window.removeEventListener("resize", checkScroll);
    };
  }, [storyGroups, lazyLoadCount]);

  const handleScrollClick = (direction: "left" | "right") => {
    const container = scrollContainerRef.current;
    if (container) {
      const scrollAmount = container.clientWidth * 0.75;
      container.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4.5 mb-5 select-none w-full relative group/bar">
      
      {/* Desktop Navigation Left Button */}
      {showLeftBtn && (
        <button
          onClick={() => handleScrollClick("left")}
          className="hidden md:flex absolute left-3.5 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-[var(--surface3)] border border-[var(--border)] items-center justify-center text-[var(--text)] cursor-pointer hover:bg-[var(--surface)] transition shadow-lg"
          title="Scroll Left"
        >
          <ChevronLeft size={16} />
        </button>
      )}

      {/* Desktop Navigation Right Button */}
      {showRightBtn && (
        <button
          onClick={() => handleScrollClick("right")}
          className="hidden md:flex absolute right-3.5 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-[var(--surface3)] border border-[var(--border)] items-center justify-center text-[var(--text)] cursor-pointer hover:bg-[var(--surface)] transition shadow-lg"
          title="Scroll Right"
        >
          <ChevronRight size={16} />
        </button>
      )}

      <div
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto no-scrollbar pb-1 scroll-smooth"
      >
        {/* Add Story Button (Always Visible) */}
        <div className="flex flex-col items-center gap-1.5 shrink-0">
          <div className="relative">
            <div
              onClick={handleAddStory}
              className="w-[60px] h-[60px] rounded-full bg-[var(--surface2)] border-2 border-dashed border-[var(--border)] flex items-center justify-center text-xl font-bold text-[var(--text2)] hover:text-[var(--text)] transition cursor-pointer"
            >
              ➕
            </div>
            <div
              onClick={handleAddStory}
              className="absolute bottom-0 right-0 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white border-2 border-[var(--bg)] font-bold text-xs cursor-pointer select-none"
            >
              +
            </div>
          </div>
          <span className="text-[11px] text-[var(--text2)] text-center max-w-[64px] truncate">
            Add story
          </span>
        </div>

        {/* Your Story (Only visible if you have active stories) */}
        {hasMyStory && (
          <div
            onClick={() => setStoryViewerIndex(myGroupIndex)}
            className="flex flex-col items-center gap-1.5 cursor-pointer shrink-0"
          >
            <div className="w-[60px] h-[60px] rounded-full p-[2px] bg-[linear-gradient(45deg,#f09433_0%,#e6683c_25%,#dc2743_50%,#cc2366_75%,#bc1888_100%)]">
              <img
                className="w-full h-full rounded-full border-2 border-[var(--bg)] object-cover"
                src={currentUser?.img || "https://i.pravatar.cc/150?img=1"}
                alt="Your story"
              />
            </div>
            <span className="text-[11px] text-[var(--text2)] text-center max-w-[64px] truncate">
              Your story
            </span>
          </div>
        )}

        {/* Other User Stories (Lazy loaded based on lazyLoadCount) */}
        {storyGroups.slice(0, lazyLoadCount).map((group, idx) => {
          // Skip if it's the current user's story (already handled above)
          if (currentUser && group.userId === currentUser.id) return null;

          return (
            <div
              key={group.userId}
              onClick={() => setStoryViewerIndex(idx)}
              className="flex flex-col items-center gap-1.5 cursor-pointer shrink-0"
            >
              <div className="w-[60px] h-[60px] rounded-full p-[2px] bg-[linear-gradient(45deg,#f09433_0%,#e6683c_25%,#dc2743_50%,#cc2366_75%,#bc1888_100%)]">
                <img
                  className="w-full h-full rounded-full border-2 border-[var(--bg)] object-cover"
                  src={group.avatarUrl}
                  alt={group.username}
                  loading="lazy"
                />
              </div>
              <span className="text-[11px] text-[var(--text2)] text-center max-w-[64px] truncate">
                {group.username}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
