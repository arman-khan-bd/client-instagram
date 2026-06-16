"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "../AppContext";
import { User, Shield, Eye, FileText, Palette, Key, Mail, Phone, Settings as SettingsIcon, Check, Moon, Sun } from "lucide-react";
import { supabase } from "../../lib/supabase";

export default function Settings() {
  const { currentUser, updateSettings, showToast, refetchCurrentUser } = useApp();
  const [activeSection, setActiveSection] = useState<"general" | "security" | "privacy" | "activity" | "appearance">("general");

  // General state
  const [fullName, setFullName] = useState(currentUser?.full || "");
  const [username, setUsername] = useState(currentUser?.name || "");
  const [email, setEmail] = useState(currentUser?.email || "");
  const [phone, setPhone] = useState(currentUser?.phone || "");
  const [savingGeneral, setSavingGeneral] = useState(false);

  // Security state
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPass, setChangingPass] = useState(false);

  // Privacy state
  const [privateProfile, setPrivateProfile] = useState(currentUser?.private_profile || false);
  const [privateStories, setPrivateStories] = useState(currentUser?.private_stories || false);
  const [privateReels, setPrivateReels] = useState(currentUser?.private_reels || false);
  const [privateDays, setPrivateDays] = useState(currentUser?.private_days || false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  // Appearance state
  const [activeTheme, setActiveTheme] = useState(currentUser?.theme || "dark");

  // Activity log state
  const [activities, setActivities] = useState<any[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  // Sync state if currentUser changes (e.g. from background refetches)
  useEffect(() => {
    if (currentUser) {
      setFullName(currentUser.full || "");
      setUsername(currentUser.name || "");
      setEmail(currentUser.email || "");
      setPhone(currentUser.phone || "");
      setPrivateProfile(currentUser.private_profile || false);
      setPrivateStories(currentUser.private_stories || false);
      setPrivateReels(currentUser.private_reels || false);
      setPrivateDays(currentUser.private_days || false);
      setActiveTheme(currentUser.theme || "dark");
    }
  }, [currentUser]);

  // Load Activity Log
  useEffect(() => {
    if (activeSection === "activity" && currentUser) {
      loadActivityLog();
    }
  }, [activeSection, currentUser]);

  const loadActivityLog = async () => {
    if (!currentUser) return;
    setLoadingActivity(true);
    try {
      const logs: any[] = [];

      // 1. Fetch Likes
      const { data: likes } = await supabase
        .from("Like")
        .select("createdAt, Post(id, caption)")
        .eq("userId", currentUser.id)
        .order("createdAt", { ascending: false })
        .limit(20);

      if (likes) {
        likes.forEach((l: any) => {
          if (l.Post) {
            logs.push({
              type: "like",
              text: `You liked post: "${l.Post.caption || 'Photo/Video'}"`,
              date: new Date(l.createdAt),
            });
          }
        });
      }

      // 2. Fetch Comments
      const { data: comments } = await supabase
        .from("Comment")
        .select("createdAt, text, Post(id, caption)")
        .eq("userId", currentUser.id)
        .order("createdAt", { ascending: false })
        .limit(20);

      if (comments) {
        comments.forEach((c: any) => {
          if (c.Post) {
            logs.push({
              type: "comment",
              text: `You commented "${c.text}" on post: "${c.Post.caption || 'Photo/Video'}"`,
              date: new Date(c.createdAt),
            });
          }
        });
      }

      // 3. Fetch Saved posts
      const { data: saves } = await supabase
        .from("Save")
        .select("createdAt, Post(id, caption)")
        .eq("userId", currentUser.id)
        .order("createdAt", { ascending: false })
        .limit(20);

      if (saves) {
        saves.forEach((s: any) => {
          if (s.Post) {
            logs.push({
              type: "save",
              text: `You saved post: "${s.Post.caption || 'Photo/Video'}"`,
              date: new Date(s.createdAt),
            });
          }
        });
      }

      // 4. Fetch Story Interactions (views/replies)
      const { data: interactions } = await supabase
        .from("StoryInteraction")
        .select("createdAt, type, value, Story(id, caption)")
        .eq("userId", currentUser.id)
        .order("createdAt", { ascending: false })
        .limit(20);

      if (interactions) {
        interactions.forEach((i: any) => {
          let description = "You viewed a story";
          if (i.type === "like") description = "You liked a story";
          if (i.type === "reaction") description = `You reacted "${i.value}" to a story`;
          if (i.type === "message") description = `You replied "${i.value}" to a story`;
          
          logs.push({
            type: "story",
            text: description,
            date: new Date(i.createdAt),
          });
        });
      }

      // 5. Fetch Video Watches
      const { data: watches } = await supabase
        .from("VideoWatchLog")
        .select("createdAt, duration, Post(id, caption)")
        .eq("userId", currentUser.id)
        .order("createdAt", { ascending: false })
        .limit(20);

      if (watches) {
        watches.forEach((w: any) => {
          if (w.Post) {
            logs.push({
              type: "watch",
              text: `You watched video: "${w.Post.caption || 'Video'}" for ${Math.round(w.duration)}s`,
              date: new Date(w.createdAt),
            });
          }
        });
      }

      // Sort logs by date descending
      logs.sort((a, b) => b.date.getTime() - a.date.getTime());
      setActivities(logs.slice(0, 40));
    } catch (err) {
      console.error("Failed to load activity logs:", err);
    } finally {
      setLoadingActivity(false);
    }
  };

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGeneral(true);
    try {
      const { error } = await supabase
        .from("User")
        .update({
          fullName,
          username: username.trim().toLowerCase(),
          email: email.trim(),
          phone: phone.trim(),
        })
        .eq("id", currentUser?.id);

      if (error) throw error;
      await refetchCurrentUser();
      showToast("General settings updated! ✅", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to update profile", "info");
    } finally {
      setSavingGeneral(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      showToast("Passwords do not match!", "info");
      return;
    }
    if (password.length < 6) {
      showToast("Password must be at least 6 characters long", "info");
      return;
    }
    setChangingPass(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword("");
      confirmPassword && setConfirmPassword("");
      showToast("Password updated successfully! Key security updated 🔒", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to update password", "info");
    } finally {
      setChangingPass(false);
    }
  };

  const handleSavePrivacy = async () => {
    setSavingPrivacy(true);
    try {
      await updateSettings({
        private_profile: privateProfile,
        private_stories: privateStories,
        private_reels: privateReels,
        private_days: privateDays,
      });
    } catch (err) {
      // Handled in Context
    } finally {
      setSavingPrivacy(false);
    }
  };

  const handleThemeChange = async (theme: "dark" | "light") => {
    setActiveTheme(theme);
    try {
      await updateSettings({ theme });
      // Apply theme to document element
      if (theme === "light") {
        document.documentElement.style.setProperty("--bg", "#ffffff");
        document.documentElement.style.setProperty("--surface", "rgba(240, 240, 240, 0.8)");
        document.documentElement.style.setProperty("--surface2", "rgba(225, 225, 225, 0.9)");
        document.documentElement.style.setProperty("--surface3", "rgba(200, 200, 200, 0.9)");
        document.documentElement.style.setProperty("--border", "rgba(0, 0, 0, 0.1)");
        document.documentElement.style.setProperty("--text", "#111111");
        document.documentElement.style.setProperty("--text2", "#555555");
        document.documentElement.style.setProperty("--text3", "#888888");
      } else {
        document.documentElement.style.setProperty("--bg", "#030303");
        document.documentElement.style.setProperty("--surface", "rgba(18, 18, 18, 0.45)");
        document.documentElement.style.setProperty("--surface2", "rgba(26, 26, 26, 0.65)");
        document.documentElement.style.setProperty("--surface3", "rgba(38, 38, 38, 0.8)");
        document.documentElement.style.setProperty("--border", "rgba(255, 255, 255, 0.07)");
        document.documentElement.style.setProperty("--text", "#f9fafb");
        document.documentElement.style.setProperty("--text2", "#9ca3af");
        document.documentElement.style.setProperty("--text3", "#6b7280");
      }
    } catch (err) {
      // Handled in Context
    }
  };

  return (
    <div className="flex-1 overflow-y-auto h-full w-full custom-scroll text-white select-none bg-black">
      <div className="max-w-[900px] mx-auto px-4 py-8">
        <div className="flex items-center gap-3.5 mb-8">
          <SettingsIcon size={24} className="text-[#888]" />
          <h1 className="text-2xl font-bold tracking-tight text-gray-100">Settings</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Settings Nav */}
          <nav className="flex flex-col gap-1.5 md:col-span-1">
            {[
              { id: "general", label: "General", icon: <User size={18} /> },
              { id: "security", label: "Security", icon: <Shield size={18} /> },
              { id: "privacy", label: "Privacy & Visibility", icon: <Eye size={18} /> },
              { id: "activity", label: "Activity Log", icon: <FileText size={18} /> },
              { id: "appearance", label: "Appearance", icon: <Palette size={18} /> },
            ].map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id as any)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left text-[14px] font-semibold transition cursor-pointer ${
                  activeSection === section.id
                    ? "bg-[#1a1a1a] text-white"
                    : "text-zinc-400 hover:text-white hover:bg-[#111]"
                }`}
              >
                {section.icon}
                <span>{section.label}</span>
              </button>
            ))}
          </nav>

          {/* Section Content */}
          <div className="md:col-span-3 bg-[#0c0c0c] border border-zinc-900 rounded-2xl p-6 relative">
            {/* General Section */}
            {activeSection === "general" && (
              <form onSubmit={handleSaveGeneral} className="space-y-5">
                <div>
                  <h3 className="text-lg font-bold mb-1">General Settings</h3>
                  <p className="text-xs text-zinc-500 mb-4">Update your profile identity details.</p>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-bold text-zinc-400">Full Name</label>
                    <div className="relative">
                      <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full bg-[#141414] border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-[14px] text-white outline-none focus:border-[#3897f0] transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-bold text-zinc-400">Username</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-[#141414] border border-zinc-800 rounded-xl px-4 py-3 text-[14px] text-white outline-none focus:border-[#3897f0] transition-colors"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-bold text-zinc-400">Email Address</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-[#141414] border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-[14px] text-white outline-none focus:border-[#3897f0] transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-bold text-zinc-400">Phone Number</label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. +123456789"
                        className="w-full bg-[#141414] border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-[14px] text-white outline-none focus:border-[#3897f0] transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={savingGeneral}
                    className="bg-white text-black text-[13px] font-bold px-6 py-2.5 rounded-xl hover:bg-zinc-200 transition disabled:opacity-50"
                  >
                    {savingGeneral ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            )}

            {/* Security Section */}
            {activeSection === "security" && (
              <form onSubmit={handleChangePassword} className="space-y-5">
                <div>
                  <h3 className="text-lg font-bold mb-1">Security Settings</h3>
                  <p className="text-xs text-zinc-500 mb-4">Ensure your account safety by updating your password.</p>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-bold text-zinc-400">New Password</label>
                    <div className="relative">
                      <Key size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-[#141414] border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-[14px] text-white outline-none focus:border-[#3897f0] transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-bold text-zinc-400">Confirm Password</label>
                    <div className="relative">
                      <Key size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600" />
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-[#141414] border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-[14px] text-white outline-none focus:border-[#3897f0] transition-colors"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={changingPass}
                    className="bg-white text-black text-[13px] font-bold px-6 py-2.5 rounded-xl hover:bg-zinc-200 transition disabled:opacity-50"
                  >
                    {changingPass ? "Changing..." : "Change Password"}
                  </button>
                </div>
              </form>
            )}

            {/* Privacy Section */}
            {activeSection === "privacy" && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-lg font-bold mb-1">Privacy & Visibility</h3>
                  <p className="text-xs text-zinc-500 mb-4 font-medium">Control who can view your social activities.</p>
                </div>

                <div className="space-y-4">
                  {[
                    {
                      label: "Private Profile",
                      desc: "Only approved followers can see your profile details and posts.",
                      val: privateProfile,
                      set: setPrivateProfile,
                    },
                    {
                      label: "Private Stories",
                      desc: "Restrict your current day stories visibility to your followers.",
                      val: privateStories,
                      set: setPrivateStories,
                    },
                    {
                      label: "Private Reels",
                      desc: "Reels are only visible to your followers and won't show up on search/explore.",
                      val: privateReels,
                      set: setPrivateReels,
                    },
                    {
                      label: "Private Days",
                      desc: "Control visibility of your highlights and historical day logs.",
                      val: privateDays,
                      set: setPrivateDays,
                    },
                  ].map((priv, idx) => (
                    <div key={idx} className="flex items-start justify-between p-3 rounded-xl hover:bg-[#111] transition">
                      <div className="flex-1 pr-4">
                        <span className="text-[14px] font-bold text-gray-200">{priv.label}</span>
                        <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">{priv.desc}</p>
                      </div>
                      <button
                        onClick={() => priv.set(!priv.val)}
                        className={`w-11 h-6 rounded-full transition-colors relative flex items-center shrink-0 ${
                          priv.val ? "bg-[#2ecc71]" : "bg-zinc-800"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white transition-transform absolute ${
                            priv.val ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleSavePrivacy}
                    disabled={savingPrivacy}
                    className="bg-white text-black text-[13px] font-bold px-6 py-2.5 rounded-xl hover:bg-zinc-200 transition disabled:opacity-50"
                  >
                    {savingPrivacy ? "Saving..." : "Save Privacy Rules"}
                  </button>
                </div>
              </div>
            )}

            {/* Activity Log Section */}
            {activeSection === "activity" && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-lg font-bold mb-1">Activity Log</h3>
                  <p className="text-xs text-zinc-500 mb-4 font-medium">History of your likes, comments, story views, and video watches.</p>
                </div>

                <div className="space-y-3.5 max-h-[400px] overflow-y-auto custom-scroll pr-1.5">
                  {loadingActivity ? (
                    <div className="text-center py-10 text-zinc-500 text-sm">Loading activities...</div>
                  ) : activities.length === 0 ? (
                    <div className="text-center py-10 text-zinc-500 text-sm">No activity recorded yet.</div>
                  ) : (
                    activities.map((act, idx) => (
                      <div key={idx} className="flex flex-col p-3 rounded-xl bg-[#141414] border border-zinc-900/60 gap-1 select-text">
                        <span className="text-[13px] text-zinc-200 font-semibold leading-relaxed">{act.text}</span>
                        <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider">
                          {act.date.toLocaleDateString()} {act.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Appearance Section */}
            {activeSection === "appearance" && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-lg font-bold mb-1">Appearance</h3>
                  <p className="text-xs text-zinc-500 mb-4 font-medium">Choose your workspace display mode theme preference.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { id: "dark", label: "Dark Theme", icon: <Moon size={20} className="text-violet-500" /> },
                    { id: "light", label: "Light Theme", icon: <Sun size={20} className="text-amber-500" /> },
                  ].map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => handleThemeChange(theme.id as any)}
                      className={`flex flex-col items-center gap-3 p-6 rounded-2xl border transition cursor-pointer text-center ${
                        activeTheme === theme.id
                          ? "border-white bg-[#1a1a1a]"
                          : "border-zinc-800 bg-[#141414] opacity-65 hover:opacity-100"
                      }`}
                    >
                      {theme.icon}
                      <span className="text-[14px] font-bold text-gray-200">{theme.label}</span>
                      {activeTheme === theme.id && (
                        <div className="bg-[#2ecc71] text-white p-1 rounded-full text-xs">
                          <Check size={12} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
