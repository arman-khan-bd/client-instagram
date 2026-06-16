"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "../../../components/AppContext";
import { motion } from "framer-motion";

const ButtonSpinner = () => (
  <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

export default function AdminInstallPage() {
  const router = useRouter();
  const { showToast } = useApp();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    fullName: "",
    email: "",
    password: "",
    secretCode: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { username, fullName, email, password, secretCode } = formData;

    if (!username || !fullName || !email || !password || !secretCode) {
      showToast("All fields are required!", "info");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/admin/install", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username,
          fullName,
          email,
          password,
          secretCode
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create admin account.");
      }

      showToast("Admin account installed successfully! 🎉", "success");
      
      // Clear form
      setFormData({
        username: "",
        fullName: "",
        email: "",
        password: "",
        secretCode: ""
      });

      // Redirect to home/login screen
      setTimeout(() => {
        router.push("/");
      }, 1500);

    } catch (err: any) {
      console.error("Admin registration error:", err);
      showToast(err.message || "Registration failed", "info");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top,_#1f003b_0%,_#030303_70%)] text-white relative overflow-hidden font-sans">
      {/* Decorative Glow Blobs */}
      <div className="absolute top-[15%] left-[15%] w-[280px] h-[280px] bg-gradient-to-tr from-[#9E00FF] to-[#0095f6] rounded-full blur-[110px] opacity-20 select-none pointer-events-none animate-pulse" />
      <div className="absolute bottom-[15%] right-[15%] w-[320px] h-[320px] bg-gradient-to-br from-[#FF2E93] to-[#FF8A00] rounded-full blur-[130px] opacity-20 select-none pointer-events-none animate-pulse [animation-delay:2.5s]" />

      <div className="w-full max-w-[420px] flex flex-col gap-3 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 35 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="bg-white/[0.03] backdrop-blur-3xl border border-white/[0.08] rounded-3xl p-8 flex flex-col shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7)]"
        >
          {/* Header */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#9E00FF] via-[#FF2E93] to-[#FF8A00] p-[2px] shadow-xl mb-3 flex items-center justify-center select-none">
              <div className="w-full h-full bg-[#050505] rounded-[10px] flex items-center justify-center text-lg">
                🛡️
              </div>
            </div>
            <h1 className="text-center text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#0095f6] via-[#FF2E93] to-[#FF8A00] select-none">
              Admin Provisioning
            </h1>
            <p className="text-gray-400 text-xs mt-1.5 text-center">
              Deploy a new platform administrator account. Requires system authorization secret code.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5 ml-1">
                Full Name
              </label>
              <input
                type="text"
                name="fullName"
                placeholder="e.g. System Administrator"
                value={formData.fullName}
                onChange={handleChange}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#0095f6]/70 transition disabled:opacity-50"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5 ml-1">
                Username
              </label>
              <input
                type="text"
                name="username"
                placeholder="e.g. superadmin"
                value={formData.username}
                onChange={handleChange}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#0095f6]/70 transition disabled:opacity-50"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5 ml-1">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                placeholder="admin@auragram.com"
                value={formData.email}
                onChange={handleChange}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#0095f6]/70 transition disabled:opacity-50"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5 ml-1">
                Secure Password
              </label>
              <input
                type="password"
                name="password"
                placeholder="••••••••••••"
                value={formData.password}
                onChange={handleChange}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#0095f6]/70 transition disabled:opacity-50"
                required
                disabled={loading}
              />
            </div>

            <div className="mb-2">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5 ml-1">
                Installation Secret Code
              </label>
              <input
                type="password"
                name="secretCode"
                placeholder="Enter admin secret key"
                value={formData.secretCode}
                onChange={handleChange}
                className="w-full bg-white/[0.05] border border-[#FF2E93]/30 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#FF2E93]/70 focus:ring-1 focus:ring-[#FF2E93]/30 transition disabled:opacity-50"
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-2 rounded-xl bg-gradient-to-r from-[#0095f6] via-[#FF2E93] to-[#FF8A00] text-white text-sm font-bold cursor-pointer hover:brightness-110 active:scale-[0.98] transition-all duration-300 shadow-[0_8px_20px_-6px_rgba(255,46,147,0.4)] flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <ButtonSpinner /> : "Provision Admin Account"}
            </button>
          </form>
        </motion.div>

        <div className="bg-white/[0.01] border border-white/[0.04] rounded-2xl py-3 px-5 text-center text-xs text-gray-400 shadow-lg flex items-center justify-between">
          <span>Go back to default portal?</span>
          <span
            onClick={() => router.push("/")}
            className="text-[#0095f6] font-semibold cursor-pointer hover:underline"
          >
            Sign In
          </span>
        </div>
      </div>
    </div>
  );
}
