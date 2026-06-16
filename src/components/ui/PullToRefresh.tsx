"use client";

import React, { useState, useEffect, useRef, ReactNode } from "react";
import { useApp } from "../AppContext";
import { Loader2 } from "lucide-react";

interface PullToRefreshProps {
  children: ReactNode;
}

export default function PullToRefresh({ children }: PullToRefreshProps) {
  const { refreshData } = useApp();
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const startYRef = useRef(0);
  const isPullingRef = useRef(false);
  const scrollParentRef = useRef<HTMLElement | null>(null);

  // Helper to find the scrollable parent
  const getScrollParent = (node: HTMLElement | null): HTMLElement => {
    if (!node) return document.documentElement;
    const overflowY = window.getComputedStyle(node).overflowY;
    const isScrollable = overflowY === "auto" || overflowY === "scroll";
    if (isScrollable && node.scrollHeight > node.clientHeight) {
      return node;
    }
    return getScrollParent(node.parentElement);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Find the actual scrollable element under the touch target
      const target = e.target as HTMLElement;
      const scrollParent = getScrollParent(target);
      scrollParentRef.current = scrollParent;

      // Only allow pulling if scrollable parent is scrolled to the top
      if (scrollParent.scrollTop <= 0 && !isRefreshing) {
        startYRef.current = e.touches[0].clientY;
        isPullingRef.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPullingRef.current || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const diffY = currentY - startYRef.current;

      // Only pull down
      if (diffY > 0) {
        // Apply resistance formula so pulling becomes harder the further down we pull
        const resistance = 0.4;
        const distance = Math.min(diffY * resistance, 80);
        setPullDistance(distance);

        // Prevent browser default pull-to-refresh on mobile if we are pulling down at scroll top
        if (scrollParentRef.current && scrollParentRef.current.scrollTop <= 0) {
          if (e.cancelable) {
            e.preventDefault();
          }
        }
      } else {
        setPullDistance(0);
      }
    };

    const handleTouchEnd = async () => {
      if (!isPullingRef.current) return;
      isPullingRef.current = false;

      // Trigger refresh if pulled past threshold (50px)
      if (pullDistance >= 50 && !isRefreshing) {
        setIsRefreshing(true);
        setPullDistance(50); // Keep at loading position

        try {
          await refreshData();
        } catch (error) {
          console.error("Pull to refresh error:", error);
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
        }
      } else {
        // Reset distance if threshold not met
        setPullDistance(0);
      }
    };

    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd);

    // Also support mouse dragging on desktop viewports for easier desktop testing and seamless feel
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const scrollParent = getScrollParent(target);
      scrollParentRef.current = scrollParent;

      if (scrollParent.scrollTop <= 0 && !isRefreshing) {
        startYRef.current = e.clientY;
        isPullingRef.current = true;
        
        const handleMouseMove = (moveEvent: MouseEvent) => {
          if (!isPullingRef.current) return;
          const diffY = moveEvent.clientY - startYRef.current;
          if (diffY > 0) {
            const resistance = 0.4;
            const distance = Math.min(diffY * resistance, 80);
            setPullDistance(distance);
            if (moveEvent.cancelable) {
              moveEvent.preventDefault();
            }
          } else {
            setPullDistance(0);
          }
        };

        const handleMouseUp = async () => {
          isPullingRef.current = false;
          window.removeEventListener("mousemove", handleMouseMove);
          window.removeEventListener("mouseup", handleMouseUp);

          if (pullDistance >= 50 && !isRefreshing) {
            setIsRefreshing(true);
            setPullDistance(50);
            try {
              await refreshData();
            } catch (error) {
              console.error("Pull to refresh error:", error);
            } finally {
              setIsRefreshing(false);
              setPullDistance(0);
            }
          } else {
            setPullDistance(0);
          }
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
      }
    };

    container.addEventListener("mousedown", handleMouseDown);

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
      container.removeEventListener("mousedown", handleMouseDown);
    };
  }, [pullDistance, isRefreshing, refreshData]);

  const rotation = (pullDistance / 50) * 360;
  const opacity = Math.min(pullDistance / 50, 1);

  return (
    <div ref={containerRef} className="relative w-full h-full flex flex-col overflow-hidden">
      {/* Pull down indicator */}
      <div
        style={{
          transform: `translateY(${pullDistance - 40}px)`,
          opacity: opacity,
          transition: isPullingRef.current ? "none" : "transform 0.3s cubic-bezier(0.1, 0.9, 0.2, 1), opacity 0.3s ease",
        }}
        className="absolute left-1/2 -translate-x-1/2 z-[100] top-0 pointer-events-none"
      >
        <div className="w-10 h-10 rounded-full bg-[var(--surface)] border border-[var(--border)] shadow-[0_4px_12px_rgba(0,0,0,0.15)] flex items-center justify-center text-[var(--text)]">
          {isRefreshing ? (
            <Loader2 className="w-5 h-5 animate-spin text-sky-500" />
          ) : (
            <Loader2
              style={{ transform: `rotate(${rotation}deg)` }}
              className="w-5 h-5 text-[var(--text2)] transition-transform duration-75"
            />
          )}
        </div>
      </div>
      
      {/* Children content area */}
      <div 
        style={{
          transform: `translateY(${isRefreshing ? 40 : pullDistance * 0.5}px)`,
          transition: isPullingRef.current ? "none" : "transform 0.3s cubic-bezier(0.1, 0.9, 0.2, 1)",
        }}
        className="w-full h-full flex-1 flex flex-col"
      >
        {children}
      </div>
    </div>
  );
}
