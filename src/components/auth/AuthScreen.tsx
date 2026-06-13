"use client";

import React, { useState } from "react";
import { useApp } from "../AppContext";
import { motion, AnimatePresence } from "framer-motion";

const ButtonSpinner = () => (
  <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

export default function AuthScreen() {
  const { doLogin, doRegister, doLoginWithGoogle, showToast } = useApp();
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);

  // Login fields
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");

  // Register fields
  const [regEmail, setRegEmail] = useState("");
  const [regName, setRegName] = useState("");
  const [regUser, setRegUser] = useState("");
  const [regPass, setRegPass] = useState("");

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPass) {
      showToast("Email and password are required!");
      return;
    }
    setLoading(true);
    try {
      await doLogin(loginEmail, loginPass);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regEmail || !regName || !regUser || !regPass) {
      showToast("All fields are required!");
      return;
    }
    setLoading(true);
    try {
      await doRegister({
        username: regUser,
        email: regEmail,
        pass: regPass,
        fullName: regName
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSubmit = async () => {
    setLoading(true);
    try {
      await doLoginWithGoogle();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top,_#2b1055_0%,_#050505_70%)] text-white relative overflow-hidden font-sans">
      {/* Decorative Aura Blobs */}
      <div className="absolute top-[20%] left-[20%] w-[250px] h-[250px] bg-gradient-to-tr from-[#9E00FF] to-[#FF2E93] rounded-full blur-[100px] opacity-30 select-none pointer-events-none animate-pulse" />
      <div className="absolute bottom-[20%] right-[20%] w-[300px] h-[300px] bg-gradient-to-br from-[#FF8A00] to-[#FF2E93] rounded-full blur-[120px] opacity-25 select-none pointer-events-none animate-pulse [animation-delay:2s]" />

      <div className="w-full max-w-[340px] flex flex-col gap-2.5 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-5 flex flex-col shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]"
        >
          {/* Brand Header */}
          <div className="flex flex-col items-center mb-3.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-[#FF8A00] via-[#FF2E93] to-[#9E00FF] p-[2px] shadow-lg mb-2 flex items-center justify-center select-none">
              <div className="w-full h-full bg-[#050505] rounded-[7px] flex items-center justify-center text-sm">
                ✨
              </div>
            </div>
            <h1 className="text-center text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#FF8A00] via-[#FF2E93] to-[#9E00FF] select-none">
              AuraGram
            </h1>
          </div>

          {/* Form Tabs */}
          <div className="flex bg-white/[0.04] p-1 rounded-lg mb-4 border border-white/[0.05]">
            <button
              onClick={() => setAuthMode("login")}
              className={`flex-1 py-1.5 rounded-md text-[12px] font-semibold transition cursor-pointer ${
                authMode === "login" ? "bg-white text-black shadow-sm" : "text-gray-400 hover:text-white"
              }`}
            >
              Log In
            </button>
            <button
              onClick={() => setAuthMode("register")}
              className={`flex-1 py-1.5 rounded-md text-[12px] font-semibold transition cursor-pointer ${
                authMode === "register" ? "bg-white text-black shadow-sm" : "text-gray-400 hover:text-white"
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Forms switcher */}
          <AnimatePresence mode="wait">
            {authMode === "login" ? (
              <motion.form
                key="login-form"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleLoginSubmit}
                className="flex flex-col gap-2"
              >
                <input
                  type="email"
                  placeholder="Email address"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[12px] text-white outline-none focus:border-[#FF2E93]/60 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                  disabled={loading}
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[12px] text-white outline-none focus:border-[#FF2E93]/60 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                  disabled={loading}
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 mt-1 rounded-lg bg-gradient-to-r from-[#FF8A00] via-[#FF2E93] to-[#9E00FF] text-white text-[12px] font-bold cursor-pointer hover:opacity-95 active:scale-[0.98] transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? <ButtonSpinner /> : "Log In"}
                </button>
              </motion.form>
            ) : (
              <motion.form
                key="register-form"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleRegisterSubmit}
                className="flex flex-col gap-2"
              >
                <input
                  type="email"
                  placeholder="Email Address"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[12px] text-white outline-none focus:border-[#FF2E93]/60 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                  disabled={loading}
                />
                <input
                  type="text"
                  placeholder="Full Name"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[12px] text-white outline-none focus:border-[#FF2E93]/60 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                  disabled={loading}
                />
                <input
                  type="text"
                  placeholder="Username"
                  value={regUser}
                  onChange={(e) => setRegUser(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[12px] text-white outline-none focus:border-[#FF2E93]/60 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                  disabled={loading}
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={regPass}
                  onChange={(e) => setRegPass(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[12px] text-white outline-none focus:border-[#FF2E93]/60 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                  disabled={loading}
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 mt-1 rounded-lg bg-gradient-to-r from-[#FF8A00] via-[#FF2E93] to-[#9E00FF] text-white text-[12px] font-bold cursor-pointer hover:opacity-95 active:scale-[0.98] transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? <ButtonSpinner /> : "Sign Up"}
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="flex items-center gap-3 my-3.5 text-[11px] text-gray-500 w-full select-none">
            <div className="flex-1 h-[1px] bg-white/[0.08]" />
            OR
            <div className="flex-1 h-[1px] bg-white/[0.08]" />
          </div>

          {/* Google Login Button */}
          <button
            onClick={handleGoogleSubmit}
            disabled={loading}
            className="w-full py-2.5 bg-white text-black hover:bg-gray-100 rounded-lg text-[12px] font-semibold cursor-pointer transition-all duration-300 shadow-sm flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <ButtonSpinner />
            ) : (
              <>
                {/* Google Icon SVG */}
                <svg className="w-4 h-4" viewBox="0 0 24 24">
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
              </>
            )}
          </button>

          <p className="text-[10px] text-gray-500 text-center mt-4 leading-relaxed select-none">
            By signing up, you agree to our <span className="text-gray-400 cursor-pointer hover:underline">Terms</span> and <span className="text-gray-400 cursor-pointer hover:underline">Privacy Policy</span>.
          </p>
        </motion.div>

        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl py-2.5 px-4 text-center text-[11px] text-gray-400 shadow-md">
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
