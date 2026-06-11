"use client";

import React, { useState } from "react";
import { useApp } from "../AppContext";
import { motion, AnimatePresence } from "framer-motion";

export default function AuthScreen() {
  const { doLogin, doRegister, showToast } = useApp();
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  
  // Login fields
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPass, setLoginPass] = useState("");

  // Register fields
  const [regMobile, setRegMobile] = useState("");
  const [regName, setRegName] = useState("");
  const [regUser, setRegUser] = useState("");
  const [regPass, setRegPass] = useState("");

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doLogin(loginUsername || "alex_dev");
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUser) {
      showToast("Please enter a username!");
      return;
    }
    doRegister(regUser);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,_#1a0a2e_0%,_#0a0a0a_60%)] text-white">
      <div className="w-full max-w-[380px] flex flex-col gap-3">
        <AnimatePresence mode="wait">
          {authMode === "login" ? (
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="bg-[#111] border border-[#2a2a2a] rounded-2xl p-9 flex flex-col shadow-2xl"
            >
              <h1 className="text-center text-4xl mb-7 font-['Pacifico',cursive] text-gradient-instagram select-none py-1">
                Instagram
              </h1>

              <form onSubmit={handleLoginSubmit} className="flex flex-col gap-2.5">
                <input
                  type="text"
                  placeholder="Phone number, username, or email"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3.5 py-3 text-[14px] text-white outline-none focus:border-[#3897f0] transition"
                  required
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3.5 py-3 text-[14px] text-white outline-none focus:border-[#3897f0] transition"
                  required
                />

                <button
                  type="submit"
                  className="w-full py-3 mt-1.5 rounded-lg bg-[linear-gradient(45deg,#f09433_0%,#e6683c_25%,#dc2743_50%,#cc2366_75%,#bc1888_100%)] text-white text-[14px] font-bold cursor-pointer hover:opacity-90 active:scale-[0.99] transition shadow-md"
                >
                  Log in
                </button>
              </form>

              <div className="flex items-center gap-3 my-5 text-[12px] text-[#666]">
                <div className="flex-1 h-[1px] bg-[#2a2a2a]" />
                OR
                <div className="flex-1 h-[1px] bg-[#2a2a2a]" />
              </div>

              <div
                onClick={() => showToast("Demo Mode: log in with any credentials")}
                className="text-center cursor-pointer text-[#3897f0] text-[13px] font-semibold hover:underline"
              >
                Log in with Facebook
              </div>

              <div
                onClick={() => showToast("Password reset link simulated!")}
                className="text-center mt-3.5 text-[12px] text-[#a8a8a8] cursor-pointer hover:text-white transition"
              >
                Forgot password? <span className="text-[#3897f0] font-semibold">Reset</span>
              </div>

              <div className="text-center text-[13px] text-[#a8a8a8] mt-6 pt-5 border-t border-[#222]">
                Don't have an account?{" "}
                <span
                  onClick={() => setAuthMode("register")}
                  className="text-[#3897f0] font-semibold cursor-pointer hover:underline"
                >
                  Sign up
                </span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="register"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="bg-[#111] border border-[#2a2a2a] rounded-2xl p-9 flex flex-col shadow-2xl"
            >
              <h1 className="text-center text-4xl mb-3 font-['Pacifico',cursive] text-gradient-instagram select-none py-1">
                Instagram
              </h1>

              <p className="text-center text-[14px] text-[#a8a8a8] mb-5 leading-relaxed">
                Sign up to see photos and videos from your friends.
              </p>

              <button
                onClick={() => showToast("Facebook signup simulator")}
                className="w-full py-2.5 bg-[#3b5998] hover:bg-[#334e85] text-white border-none rounded-lg text-[14px] font-bold cursor-pointer transition select-none flex items-center justify-center gap-2 mb-4"
              >
                <span>👤</span> Continue with Facebook
              </button>

              <div className="flex items-center gap-3 my-3.5 text-[12px] text-[#666]">
                <div className="flex-1 h-[1px] bg-[#2a2a2a]" />
                OR
                <div className="flex-1 h-[1px] bg-[#2a2a2a]" />
              </div>

              <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-2">
                <input
                  type="text"
                  placeholder="Mobile Number or Email"
                  value={regMobile}
                  onChange={(e) => setRegMobile(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3.5 py-3 text-[14px] text-white outline-none focus:border-[#3897f0] transition"
                  required
                />
                <input
                  type="text"
                  placeholder="Full Name"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3.5 py-3 text-[14px] text-white outline-none focus:border-[#3897f0] transition"
                  required
                />
                <input
                  type="text"
                  placeholder="Username"
                  value={regUser}
                  onChange={(e) => setRegUser(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3.5 py-3 text-[14px] text-white outline-none focus:border-[#3897f0] transition"
                  required
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={regPass}
                  onChange={(e) => setRegPass(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3.5 py-3 text-[14px] text-white outline-none focus:border-[#3897f0] transition"
                  required
                />

                <button
                  type="submit"
                  className="w-full py-3 mt-3 rounded-lg bg-[linear-gradient(45deg,#f09433_0%,#e6683c_25%,#dc2743_50%,#cc2366_75%,#bc1888_100%)] text-white text-[14px] font-bold cursor-pointer hover:opacity-90 active:scale-[0.99] transition shadow-md"
                >
                  Sign up
                </button>
              </form>

              <p className="text-[11px] text-[#666] text-center mt-4 leading-normal">
                By signing up, you agree to our <span className="text-[#a8a8a8] cursor-pointer hover:underline">Terms</span>,{" "}
                <span className="text-[#a8a8a8] cursor-pointer hover:underline">Privacy Policy</span> and{" "}
                <span className="text-[#a8a8a8] cursor-pointer hover:underline">Cookies Policy</span>.
              </p>

              <div className="text-center text-[13px] text-[#a8a8a8] mt-6 pt-5 border-t border-[#222]">
                Have an account?{" "}
                <span
                  onClick={() => setAuthMode("login")}
                  className="text-[#3897f0] font-semibold cursor-pointer hover:underline"
                >
                  Log in
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="bg-[#111] border border-[#2a2a2a] rounded-xl py-5 px-7 text-center text-[13px] text-[#a8a8a8] shadow-md">
          Get the app.{" "}
          <span
            onClick={() => showToast("App Store coming soon!")}
            className="text-[#3897f0] font-semibold cursor-pointer hover:underline"
          >
            App Store
          </span>{" "}
          ·{" "}
          <span
            onClick={() => showToast("Google Play coming soon!")}
            className="text-[#3897f0] font-semibold cursor-pointer hover:underline"
          >
            Google Play
          </span>
        </div>
      </div>
    </div>
  );
}
