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

  // Username validation checking states
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [usernameError, setUsernameError] = useState("");

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
  const [selectedFilter, setSelectedFilter] = useState<"all" | "reaction" | "comment" | "save" | "story_view" | "reply" | "watch">("all");
  const [activityPage, setActivityPage] = useState(1);

  // Reset pagination on filter or section change
  useEffect(() => {
    setActivityPage(1);
  }, [selectedFilter, activeSection]);

  // Forbidden terms validation helper
  const isForbiddenText = (text: string): boolean => {
    const forbiddenPatterns = [
      /\ballah\b/i, /\bgod\b/i, /\bbhagwan\b/i, /\bdeity\b/i, /\blord\b/i, /\bjesus\b/i, /\bkrishna\b/i, /\bshiva\b/i,
      /\bporn\b/i, /\bx-rated\b/i, /\bsex\b/i, /\bnude\b/i, /\badult\b/i, /\berotic\b/i
    ];
    return forbiddenPatterns.some(pattern => pattern.test(text));
  };

  // Emoji & Unicode special symbol blocker for full name
  // Blocks: emoji sequences (surrogate pairs), Emoticons, Misc Symbols, Dingbats, CJK symbols-as-icons, etc.
  // Allows: actual language letters (Latin, Arabic, Bangla, Japanese, Russian, Korean, etc.)
  const hasEmojiOrSpecialSymbol = (text: string): boolean => {
    // Block surrogate-pair emojis (modern emoji range via high+low surrogates)
    const surrogatePairRegex = /[\uD800-\uDBFF][\uDC00-\uDFFF]/;
    if (surrogatePairRegex.test(text)) return true;
    // Block BMP emoji / special symbol blocks
    // U+2600–U+26FF Misc Symbols, U+2700–U+27BF Dingbats
    // U+FE00–U+FE0F Variation selectors (emoji style), U+200D ZWJ
    const bmpSymbolRegex = /[\u2600-\u27BF\uFE00-\uFE0F\u200D\u20D0-\u20FF\u2300-\u23FF\u2400-\u243F\u2440-\u245F\u2500-\u257F\u2580-\u259F\u25A0-\u25FF\u2B00-\u2BFF\u3000-\u303F]/;
    return bmpSymbolRegex.test(text);
  };

  // Username validation: ONLY lowercase a-z, dash (-), underscore (_)
  const validateUsernameText = (uname: string): { valid: boolean; error: string } => {
    if (!uname) return { valid: false, error: "Username cannot be empty" };
    if (uname.length < 3) return { valid: false, error: "Username must be at least 3 characters" };

    // Strictly only a-z (lowercase), dash, underscore — nothing else
    const usernameRegex = /^[a-z_-]+$/;
    if (!usernameRegex.test(uname)) {
      return { valid: false, error: "Only lowercase letters (a-z), dash (-), and underscore (_) are allowed" };
    }

    if (isForbiddenText(uname)) {
      return { valid: false, error: "Username contains forbidden religious or adult terms" };
    }

    return { valid: true, error: "" };
  };

  // Full Name validation:
  // ✅ Allowed: a-z, A-Z, any language letters (Bangla, Japanese, Russian, Arabic, etc.), spaces, standard keyboard symbols
  // ❌ Blocked: emojis, Unicode special/misc symbols (✓ ★ ☺ etc.)
  const validateFullNameText = (name: string): { valid: boolean; error: string } => {
    if (!name || !name.trim()) return { valid: false, error: "Full Name cannot be empty" };

    if (hasEmojiOrSpecialSymbol(name)) {
      return { valid: false, error: "Full Name cannot contain emojis or special symbols" };
    }

    if (isForbiddenText(name)) {
      return { valid: false, error: "Full Name contains forbidden religious or adult terms" };
    }

    return { valid: true, error: "" };
  };

  // Live username checker effect
  useEffect(() => {
    if (!username || username === currentUser?.name) {
      setUsernameStatus("idle");
      setUsernameError("");
      return;
    }

    const validation = validateUsernameText(username);
    if (!validation.valid) {
      setUsernameStatus("invalid");
      setUsernameError(validation.error);
      return;
    }

    setUsernameStatus("checking");
    setUsernameError("");

    const checkTimeout = setTimeout(async () => {
      try {
        const { data: existingUser, error: checkError } = await supabase
          .from("User")
          .select("id")
          .eq("username", username.trim().toLowerCase())
          .maybeSingle();

        if (checkError) throw checkError;
        if (existingUser) {
          setUsernameStatus("taken");
          setUsernameError("This username is already taken by another account");
        } else {
          setUsernameStatus("available");
        }
      } catch (err) {
        setUsernameStatus("idle");
      }
    }, 450);

    return () => clearTimeout(checkTimeout);
  }, [username, currentUser]);

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

      // 1. Fetch Likes (Mapped to 'reaction')
      const { data: likes } = await supabase
        .from("Like")
        .select("createdAt, Post(id, caption)")
        .eq("userId", currentUser.id)
        .order("createdAt", { ascending: false })
        .limit(30);

      if (likes) {
        likes.forEach((l: any) => {
          if (l.Post) {
            logs.push({
              category: "reaction",
              text: `You liked post: "${l.Post.caption || 'Photo/Video'}"`,
              date: new Date(l.createdAt),
            });
          }
        });
      }

      // Fetch Reaction table (Facebook reactions - Mapped to 'reaction')
      const { data: reactions } = await supabase
        .from("Reaction")
        .select("createdAt, type, Post(id, caption)")
        .eq("userId", currentUser.id)
        .order("createdAt", { ascending: false })
        .limit(30);

      if (reactions) {
        reactions.forEach((r: any) => {
          if (r.Post) {
            logs.push({
              category: "reaction",
              text: `You reacted ${r.type} to post: "${r.Post.caption || 'Photo/Video'}"`,
              date: new Date(r.createdAt),
            });
          }
        });
      }

      // 2. Fetch Comments (Mapped to 'comment')
      const { data: comments } = await supabase
        .from("Comment")
        .select("createdAt, text, Post(id, caption)")
        .eq("userId", currentUser.id)
        .order("createdAt", { ascending: false })
        .limit(30);

      if (comments) {
        comments.forEach((c: any) => {
          if (c.Post) {
            logs.push({
              category: "comment",
              text: `You commented "${c.text}" on post: "${c.Post.caption || 'Photo/Video'}"`,
              date: new Date(c.createdAt),
            });
          }
        });
      }

      // 3. Fetch Saved posts (Mapped to 'save')
      const { data: saves } = await supabase
        .from("Save")
        .select("createdAt, Post(id, caption)")
        .eq("userId", currentUser.id)
        .order("createdAt", { ascending: false })
        .limit(30);

      if (saves) {
        saves.forEach((s: any) => {
          if (s.Post) {
            logs.push({
              category: "save",
              text: `You saved post: "${s.Post.caption || 'Photo/Video'}"`,
              date: new Date(s.createdAt),
            });
          }
        });
      }

      // 4. Fetch Story Interactions (views/likes mapped to 'story_view', replies mapped to 'reply', reactions to 'reaction')
      const { data: interactions } = await supabase
        .from("StoryInteraction")
        .select("createdAt, type, value")
        .eq("userId", currentUser.id)
        .order("createdAt", { ascending: false })
        .limit(40);

      if (interactions) {
        interactions.forEach((i: any) => {
          let category = "story_view";
          let description = "You viewed a story";

          if (i.type === "like") {
            category = "reaction";
            description = "You liked a story";
          } else if (i.type === "reaction") {
            category = "reaction";
            description = `You reacted "${i.value}" to a story`;
          } else if (i.type === "message") {
            category = "reply";
            description = `You replied "${i.value}" to a story`;
          }
          
          logs.push({
            category,
            text: description,
            date: new Date(i.createdAt),
          });
        });
      }

      // 5. Fetch Video Watches (Mapped to 'watch', duration removed)
      const { data: watches } = await supabase
        .from("VideoWatchLog")
        .select("createdAt, Post(id, caption)")
        .eq("userId", currentUser.id)
        .order("createdAt", { ascending: false })
        .limit(30);

      if (watches) {
        watches.forEach((w: any) => {
          if (w.Post) {
            logs.push({
              category: "watch",
              text: `You watched video post: "${w.Post.caption || 'Video'}"`,
              date: new Date(w.createdAt),
            });
          }
        });
      }

      // Sort logs by date descending
      logs.sort((a, b) => b.date.getTime() - a.date.getTime());
      setActivities(logs);
    } catch (err) {
      console.error("Failed to load activity logs:", err);
    } finally {
      setLoadingActivity(false);
    }
  };

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validate full name rules
    const nameValidation = validateFullNameText(fullName);
    if (!nameValidation.valid) {
      showToast(nameValidation.error, "info");
      return;
    }

    // 2. Validate username rules
    const targetUsername = username.trim().toLowerCase();
    const usernameValidation = validateUsernameText(targetUsername);
    if (!usernameValidation.valid) {
      showToast(usernameValidation.error, "info");
      return;
    }
    
    setSavingGeneral(true);
    try {
      // Check if username is taken by another user in the database
      if (targetUsername !== currentUser?.name?.toLowerCase()) {
        const { data: existingUser, error: checkError } = await supabase
          .from("User")
          .select("id")
          .eq("username", targetUsername)
          .maybeSingle();

        if (checkError) throw checkError;
        if (existingUser) {
          throw new Error("You can't use this username. It is already taken by another account!");
        }
      }

      const { error } = await supabase
        .from("User")
        .update({
          fullName: fullName.trim(),
          username: targetUsername,
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
    <div className="flex-1 overflow-y-auto h-full w-full custom-scroll text-[var(--text)] select-none bg-[var(--bg)]">
      <div className="max-w-[900px] mx-auto px-4 py-8">
        <div className="flex items-center gap-3.5 mb-8">
          <SettingsIcon size={24} className="text-[var(--text3)]" />
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">Settings</h1>
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
                    ? "bg-[var(--surface3)] text-[var(--text)]"
                    : "text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--surface2)]"
                }`}
              >
                {section.icon}
                <span>{section.label}</span>
              </button>
            ))}
          </nav>

          {/* Section Content */}
          <div className="md:col-span-3 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 relative">
            {/* General Section */}
            {activeSection === "general" && (
              <form onSubmit={handleSaveGeneral} className="space-y-5">
                <div>
                  <h3 className="text-lg font-bold mb-1">General Settings</h3>
                  <p className="text-xs text-[var(--text3)] mb-4">Update your profile identity details.</p>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-bold text-[var(--text2)]">Full Name</label>
                    <div className="relative flex items-center">
                      <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text3)] z-10" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-xl pl-10 pr-10 py-3 text-[14px] text-[var(--text)] outline-none focus:border-[#3897f0] transition-colors"
                        required
                      />
                      <div className="absolute right-3.5 flex items-center gap-1.5 select-none pointer-events-none">
                        {fullName && validateFullNameText(fullName).valid ? (
                          <span className="text-[#2ecc71] font-bold text-[15px]">✓</span>
                        ) : fullName ? (
                          <span className="text-[#e74c3c] font-bold text-[15px]" title={validateFullNameText(fullName).error}>✗</span>
                        ) : null}
                      </div>
                    </div>
                    {fullName && !validateFullNameText(fullName).valid && (
                      <span className="text-[11px] text-[#e74c3c] font-semibold mt-0.5">{validateFullNameText(fullName).error}</span>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-bold text-[var(--text2)]">Username</label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-xl pl-4 pr-10 py-3 text-[14px] text-[var(--text)] outline-none focus:border-[#3897f0] transition-colors"
                        required
                      />
                      <div className="absolute right-3.5 flex items-center gap-1.5 select-none pointer-events-none">
                        {usernameStatus === "checking" && (
                          <div className="w-4.5 h-4.5 border-2 border-insta-blue border-t-transparent rounded-full animate-spin" />
                        )}
                        {usernameStatus === "available" && (
                          <span className="text-[#2ecc71] font-bold text-[15px]" title="Username is available">✓</span>
                        )}
                        {(usernameStatus === "taken" || usernameStatus === "invalid") && (
                          <span className="text-[#e74c3c] font-bold text-[15px]" title={usernameError || "Taken"}>✗</span>
                        )}
                      </div>
                    </div>
                    {usernameError && (
                      <span className="text-[11px] text-[#e74c3c] font-semibold mt-0.5">{usernameError}</span>
                    )}
                    {usernameStatus === "available" && (
                      <span className="text-[11px] text-[#2ecc71] font-semibold mt-0.5">Username is available</span>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-bold text-[var(--text2)]">Email Address</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text3)]" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-xl pl-10 pr-4 py-3 text-[14px] text-[var(--text)] outline-none focus:border-[#3897f0] transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-bold text-[var(--text2)]">Phone Number</label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text3)]" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. +123456789"
                        className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-xl pl-10 pr-4 py-3 text-[14px] text-[var(--text)] outline-none focus:border-[#3897f0] transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={savingGeneral}
                    className="bg-[var(--text)] text-[var(--bg)] text-[13px] font-bold px-6 py-2.5 rounded-xl hover:opacity-90 transition disabled:opacity-50"
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
                  <p className="text-xs text-[var(--text3)] mb-4">Ensure your account safety by updating your password.</p>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-bold text-[var(--text2)]">New Password</label>
                    <div className="relative">
                      <Key size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text3)]" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-xl pl-10 pr-4 py-3 text-[14px] text-[var(--text)] outline-none focus:border-[#3897f0] transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-bold text-[var(--text2)]">Confirm Password</label>
                    <div className="relative">
                      <Key size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text3)]" />
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-xl pl-10 pr-4 py-3 text-[14px] text-[var(--text)] outline-none focus:border-[#3897f0] transition-colors"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={changingPass}
                    className="bg-[var(--text)] text-[var(--bg)] text-[13px] font-bold px-6 py-2.5 rounded-xl hover:opacity-90 transition disabled:opacity-50"
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
                  <p className="text-xs text-[var(--text3)] mb-4 font-medium">Control who can view your social activities.</p>
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
                    <div key={idx} className="flex items-start justify-between p-3 rounded-xl hover:bg-[var(--surface3)] transition">
                      <div className="flex-1 pr-4">
                        <span className="text-[14px] font-bold text-[var(--text)]">{priv.label}</span>
                        <p className="text-[11px] text-[var(--text3)] mt-0.5 leading-relaxed">{priv.desc}</p>
                      </div>
                      <button
                        onClick={() => priv.set(!priv.val)}
                        className={`w-11 h-6 rounded-full transition-colors relative flex items-center shrink-0 ${
                          priv.val ? "bg-[#2ecc71]" : "bg-[var(--surface3)]"
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
                    className="bg-[var(--text)] text-[var(--bg)] text-[13px] font-bold px-6 py-2.5 rounded-xl hover:opacity-90 transition disabled:opacity-50"
                  >
                    {savingPrivacy ? "Saving..." : "Save Privacy Rules"}
                  </button>
                </div>
              </div>
            )}

            {/* Activity Log Section */}
            {activeSection === "activity" && (() => {
              const filters = [
                { id: "all", label: "All" },
                { id: "reaction", label: "Reactions" },
                { id: "comment", label: "Comments" },
                { id: "save", label: "Saves" },
                { id: "story_view", label: "Story Views" },
                { id: "reply", label: "Replies" },
                { id: "watch", label: "Watched Videos" },
              ];

              const filteredActivities = activities.filter((act) => {
                if (selectedFilter === "all") return true;
                return act.category === selectedFilter;
              });

              const ITEMS_PER_PAGE = 8;
              const totalItems = filteredActivities.length;
              const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
              const paginatedActivities = filteredActivities.slice(
                (activityPage - 1) * ITEMS_PER_PAGE,
                activityPage * ITEMS_PER_PAGE
              );

              return (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-lg font-bold mb-1">Activity Log</h3>
                    <p className="text-xs text-[var(--text3)] mb-4 font-medium">History of your actions sorted by categories.</p>
                  </div>

                  {/* Filter Tabs */}
                  <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2 shrink-0">
                    {filters.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setSelectedFilter(f.id as any)}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide transition border border-[var(--border)] whitespace-nowrap ${
                          selectedFilter === f.id
                            ? "bg-[var(--text)] text-[var(--bg)] border-[var(--text)]"
                            : "bg-[var(--surface2)] text-[var(--text2)] hover:text-[var(--text)]"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-3.5 max-h-[360px] overflow-y-auto custom-scroll pr-1.5">
                    {loadingActivity ? (
                      <div className="text-center py-10 text-[var(--text3)] text-sm font-semibold">Loading activities...</div>
                    ) : paginatedActivities.length === 0 ? (
                      <div className="text-center py-10 text-[var(--text3)] text-sm font-semibold">No activity recorded under this category.</div>
                    ) : (
                      paginatedActivities.map((act, idx) => (
                        <div key={idx} className="flex flex-col p-3 rounded-xl bg-[var(--surface2)] border border-[var(--border)] gap-1.5 select-text">
                          <span className="text-[13px] text-[var(--text)] font-semibold leading-relaxed">{act.text}</span>
                          <div className="flex items-center justify-between text-[10px] text-[var(--text3)] font-bold uppercase tracking-wider">
                            <span>{act.category.replace("_", " ")}</span>
                            <span>
                              {act.date.toLocaleDateString()} {act.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-3 border-t border-[var(--border)] text-xs select-none">
                      <button
                        type="button"
                        onClick={() => setActivityPage((prev) => Math.max(1, prev - 1))}
                        disabled={activityPage === 1}
                        className="px-3 py-1.5 rounded-lg bg-[var(--surface2)] hover:bg-[var(--surface3)] text-[var(--text)] font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <span className="text-[var(--text2)] font-medium">
                        Page {activityPage} of {totalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => setActivityPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={activityPage === totalPages}
                        className="px-3 py-1.5 rounded-lg bg-[var(--surface2)] hover:bg-[var(--surface3)] text-[var(--text)] font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Appearance Section */}
            {activeSection === "appearance" && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-lg font-bold mb-1">Appearance</h3>
                  <p className="text-xs text-[var(--text3)] mb-4 font-medium">Choose your workspace display mode theme preference.</p>
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
                          ? "border-[var(--text)] bg-[var(--surface3)]"
                          : "border-[var(--border)] bg-[var(--surface2)] opacity-65 hover:opacity-100"
                      }`}
                    >
                      {theme.icon}
                      <span className="text-[14px] font-bold text-[var(--text)]">{theme.label}</span>
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
