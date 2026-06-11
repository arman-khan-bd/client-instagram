"use client";

import React from "react";
import { useApp } from "../AppContext";
import { motion } from "framer-motion";

export default function AuthScreen() {
  const { doLoginWithGoogle } = useApp();

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,_#2b1055_0%,_#050505_70%)] text-white relative overflow-hidden font-sans">
      {/* Decorative Aura Blobs */}
      <div className="absolute top-[20%] left-[20%] w-[250px] h-[250px] bg-gradient-to-tr from-[#9E00FF] to-[#FF2E93] rounded-full blur-[100px] opacity-30 select-none pointer-events-none animate-pulse" />
      <div className="absolute bottom-[20%] right-[20%] w-[300px] h-[300px] bg-gradient-to-br from-[#FF8A00] to-[#FF2E93] rounded-full blur-[120px] opacity-25 select-none pointer-events-none animate-pulse [animation-delay:2s]" />

      <div className="w-full max-w-[390px] flex flex-col gap-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-10 flex flex-col items-center shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]"
        >
          {/* AuraGram Logo Icon */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#FF8A00] via-[#FF2E93] to-[#9E00FF] p-[3px] shadow-lg mb-6 flex items-center justify-center select-none animate-spin-slow">
            <div className="w-full h-full bg-[#050505] rounded-[13px] flex items-center justify-center text-2xl">
              ✨
            </div>
          </div>

          <h1 className="text-center text-4xl mb-3 font-semibold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#FF8A00] via-[#FF2E93] to-[#9E00FF] select-none">
            AuraGram
          </h1>

          <p className="text-center text-[13.5px] text-gray-400 mb-9 leading-relaxed max-w-[280px]">
            Connect, share, and manifest your moments in the social aura.
          </p>

          {/* Google Login Button */}
          <button
            onClick={doLoginWithGoogle}
            className="w-full py-3.5 bg-white text-black hover:bg-gray-100 rounded-2xl text-[14px] font-bold cursor-pointer transition-all duration-300 shadow-md flex items-center justify-center gap-3 active:scale-[0.98]"
          >
            {/* Google Icon SVG */}
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.68 1.54 14.98 1 12 1 7.35 1 3.37 3.67 1.39 7.56l3.89 3.02C6.21 7.57 8.87 5.04 12 5.04z"
              />
              <path
                fill="#4285F4"
                d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.28 1.48-1.11 2.73-2.36 3.58l3.66 2.84c2.14-1.98 3.39-4.88 3.39-8.57z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.58c-.24-.72-.38-1.49-.38-2.31 0-.82.14-1.59.38-2.31L1.39 6.92C.5 8.7 0 10.7 0 12.8c0 2.1.5 4.1 1.39 5.88l3.89-3.1z"
              />
              <path
                fill="#34A853"
                d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.66-2.84c-1.01.68-2.3 1.09-3.96 1.09-3.13 0-5.79-2.53-6.72-5.54l-3.89 3.02C3.37 20.33 7.35 23 12 23z"
              />
            </svg>
            Continue with Google
          </button>

          <p className="text-[11px] text-gray-500 text-center mt-9 leading-relaxed max-w-[260px]">
            By continuing, you agree to AuraGram's <span className="text-gray-400 cursor-pointer hover:underline">Terms of Service</span> and <span className="text-gray-400 cursor-pointer hover:underline">Privacy Policy</span>.
          </p>
        </motion.div>

        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl py-4 px-6 text-center text-[12px] text-gray-400 shadow-md">
          Need support?{" "}
          <span
            onClick={() => alert("Support coming soon!")}
            className="text-[#FF2E93] font-semibold cursor-pointer hover:underline"
          >
            Contact Help Center
          </span>
        </div>
      </div>
    </div>
  );
}
