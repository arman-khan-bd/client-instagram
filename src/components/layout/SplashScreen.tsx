"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulate loading progress
    const duration = 1800; // 1.8 seconds total
    const intervalTime = 30;
    const steps = duration / intervalTime;
    const increment = 100 / steps;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            onComplete();
          }, 200); // Small buffer before fading out completely
          return 100;
        }
        return Math.min(prev + increment, 100);
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [onComplete]);

  // Framer Motion Variants for letters/elements
  const containerVariants = {
    initial: {},
    animate: {
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const letterVariants = {
    initial: { opacity: 0, y: 20 },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
      },
    },
  };

  const logoVariants = {
    initial: { scale: 0.8, opacity: 0 },
    animate: {
      scale: 1,
      opacity: 1,
      transition: {
        duration: 0.8,
        ease: [0.16, 1, 0.3, 1], // easeOutExpo
      },
    },
  };

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.4, ease: "easeInOut" } }}
      className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-[#050505] text-white select-none overflow-hidden"
    >
      {/* Dynamic glow blobs in the background */}
      <div className="absolute w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-[#9E00FF] to-[#FF2E93] opacity-20 blur-[130px] -translate-y-[20%] animate-pulse pointer-events-none" />
      <div className="absolute w-[350px] h-[350px] rounded-full bg-gradient-to-br from-[#FF8A00] to-[#FF2E93] opacity-15 blur-[120px] translate-y-[30%] pointer-events-none" style={{ animationDelay: "1s" }} />

      <div className="flex flex-col items-center gap-6 z-10">
        {/* Animated Brand Logo Icon with Glow */}
        <motion.div
          variants={logoVariants}
          initial="initial"
          animate="animate"
          className="relative flex items-center justify-center"
        >
          {/* Pulsing Outer Neon Glow */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-[#FF8A00] via-[#FF2E93] to-[#9E00FF] opacity-50 blur-xl animate-pulse" />
          
          {/* Logo Frame */}
          <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#FF8A00] via-[#FF2E93] to-[#9E00FF] p-[2.5px] shadow-[0_15px_30px_rgba(255,46,147,0.3)]">
            <div className="w-full h-full bg-[#050505] rounded-[13px] flex items-center justify-center text-3xl">
              ✨
            </div>
          </div>
        </motion.div>

        {/* Animated Title Text */}
        <motion.div
          variants={containerVariants}
          initial="initial"
          animate="animate"
          className="flex gap-[2px] items-center"
        >
          {Array.from("AuraGram").map((char, index) => (
            <motion.span
              key={index}
              variants={letterVariants}
              className="text-3xl font-extrabold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-[#FF8A00] via-[#FF2E93] to-[#9E00FF]"
            >
              {char}
            </motion.span>
          ))}
        </motion.div>

        {/* Subtle Progress Bar */}
        <div className="w-48 h-[3px] bg-white/[0.08] rounded-full overflow-hidden mt-4 relative">
          <motion.div
            className="h-full bg-gradient-to-r from-[#FF8A00] via-[#FF2E93] to-[#9E00FF]"
            style={{ width: `${progress}%` }}
            transition={{ ease: "easeInOut" }}
          />
        </div>

        {/* Brand Tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="text-[10px] uppercase tracking-[0.25em] text-zinc-400 font-semibold mt-1"
        >
          your digital escape
        </motion.p>
      </div>

      {/* Footer Branding */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 0.3, y: 0 }}
        transition={{ delay: 1, duration: 0.6 }}
        className="absolute bottom-10 flex flex-col items-center gap-1"
      >
        <span className="text-[10px] tracking-widest text-zinc-500">FROM</span>
        <span className="text-[11px] font-bold tracking-[0.15em] text-white">ANTIGRAVITY</span>
      </motion.div>
    </motion.div>
  );
}
