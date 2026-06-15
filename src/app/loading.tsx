"use client";

import React from "react";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#050505]/60 backdrop-blur-[1px] pointer-events-none">
      <div className="flex flex-col items-center gap-3">
        {/* Glow spinner */}
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#FF8A00] via-[#FF2E93] to-[#9E00FF] animate-spin p-[2px]">
            <div className="w-full h-full bg-[#050505] rounded-full" />
          </div>
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#FF8A00] via-[#FF2E93] to-[#9E00FF] opacity-30 blur-sm animate-pulse" />
        </div>
      </div>
    </div>
  );
}
