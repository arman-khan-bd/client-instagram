"use client";

import React, { useState, useEffect, useRef } from "react";
import { useApp } from "../AppContext";
import {
  User, AtSign, Globe, FileText, Users, GraduationCap, Briefcase,
  MapPin, Home, Phone, Heart, Star, Image, X, Check, ChevronRight, Camera
} from "lucide-react";

type Section = "basic" | "about" | "contact" | "interests";

const SECTION_LABELS: Record<Section, string> = {
  basic: "Basic Info",
  about: "About",
  contact: "Contact",
  interests: "Interests",
};

const SECTION_ICONS: Record<Section, React.ReactNode> = {
  basic: <User size={15} />,
  about: <FileText size={15} />,
  contact: <Phone size={15} />,
  interests: <Star size={15} />,
};

const COUNTRIES = [
  "", "Afghanistan", "Albania", "Algeria", "Argentina", "Armenia", "Australia",
  "Austria", "Azerbaijan", "Bangladesh", "Belarus", "Belgium", "Bolivia", "Bosnia",
  "Brazil", "Bulgaria", "Cambodia", "Canada", "Chile", "China", "Colombia",
  "Croatia", "Czech Republic", "Denmark", "Ecuador", "Egypt", "Ethiopia",
  "Finland", "France", "Georgia", "Germany", "Ghana", "Greece", "Guatemala",
  "Hungary", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel",
  "Italy", "Japan", "Jordan", "Kazakhstan", "Kenya", "South Korea", "Kosovo",
  "Kuwait", "Kyrgyzstan", "Lebanon", "Libya", "Lithuania", "Malaysia", "Mexico",
  "Moldova", "Morocco", "Myanmar", "Nepal", "Netherlands", "New Zealand",
  "Nigeria", "North Macedonia", "Norway", "Pakistan", "Palestine", "Panama",
  "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Romania", "Russia",
  "Saudi Arabia", "Senegal", "Serbia", "Singapore", "Slovakia", "Slovenia",
  "South Africa", "Spain", "Sri Lanka", "Sudan", "Sweden", "Switzerland",
  "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Tunisia", "Turkey",
  "Turkmenistan", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom",
  "United States", "Uruguay", "Uzbekistan", "Venezuela", "Vietnam", "Yemen",
  "Zimbabwe",
];

export default function EditProfileModal() {
  const { showEditProfileModal, setShowEditProfileModal, currentUser, saveProfileChanges, refetchCurrentUser, showToast } = useApp();

  // Basic
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [gender, setGender] = useState("Prefer not to say");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [coverPhoto, setCoverPhoto] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isCoverUploading, setIsCoverUploading] = useState(false);

  // About
  const [education, setEducation] = useState("");
  const [work, setWork] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [hometown, setHometown] = useState("");

  // Contact
  const [web, setWeb] = useState("");
  const [phone, setPhone] = useState("");

  // Interests
  const [hobbies, setHobbies] = useState("");
  const [interests, setInterests] = useState("");

  const [activeSection, setActiveSection] = useState<Section>("basic");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const saveSuccessTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentUser && showEditProfileModal) {
      setName(currentUser.full || "");
      setUsername(currentUser.name || "");
      setWeb(currentUser.web || "");
      setBio(currentUser.bio || "");
      setGender(currentUser.gender || "Prefer not to say");
      setAvatarUrl(currentUser.img || "");
      setCoverPhoto(currentUser.coverPhoto || "");
      setEducation(currentUser.education || "");
      setWork(currentUser.work || "");
      setCity(currentUser.city || "");
      setCountry(currentUser.country || "");
      setHometown(currentUser.hometown || "");
      setPhone(currentUser.phone || "");
      setHobbies(currentUser.hobbies || "");
      setInterests(currentUser.interests || "");
      // Only reset section on initial open, not on every currentUser update
    }
  }, [showEditProfileModal]); // Only re-init when modal opens

  // Sync form when currentUser changes (e.g. after save updates it)
  useEffect(() => {
    if (currentUser && showEditProfileModal) {
      setName(currentUser.full || "");
      setUsername(currentUser.name || "");
      setWeb(currentUser.web || "");
      setBio(currentUser.bio || "");
      setGender(currentUser.gender || "Prefer not to say");
      setAvatarUrl(currentUser.img || "");
      setCoverPhoto(currentUser.coverPhoto || "");
      setEducation(currentUser.education || "");
      setWork(currentUser.work || "");
      setCity(currentUser.city || "");
      setCountry(currentUser.country || "");
      setHometown(currentUser.hometown || "");
      setPhone(currentUser.phone || "");
      setHobbies(currentUser.hobbies || "");
      setInterests(currentUser.interests || "");
    }
  }, [currentUser]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (saveSuccessTimerRef.current) clearTimeout(saveSuccessTimerRef.current);
    };
  }, []);

  if (!showEditProfileModal) return null;

  const handleClose = () => setShowEditProfileModal(false);

  const uploadToCloudinary = async (file: File, folder: string): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "auragram");
    formData.append("folder", `auragram/${folder}`);
    const res = await fetch("https://api.cloudinary.com/v1_1/dj7pg5slk/image/upload", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (!data.secure_url) throw new Error("Upload failed");
    return data.secure_url;
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      showToast("Uploading profile photo... ⚡", "info");
      const url = await uploadToCloudinary(file, "avatars");
      setAvatarUrl(url);
      showToast("Photo uploaded! Click Save to apply.", "success");
    } catch (err: any) {
      showToast(err.message || "Upload failed", "info");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsCoverUploading(true);
      showToast("Uploading cover photo... ⚡", "info");
      const url = await uploadToCloudinary(file, "covers");
      setCoverPhoto(url);
      showToast("Cover photo uploaded! Click Save to apply.", "success");
    } catch (err: any) {
      showToast(err.message || "Upload failed", "info");
    } finally {
      setIsCoverUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      showToast("Username cannot be empty!");
      return;
    }
    try {
      setIsSaving(true);
      setSaveSuccess(false);

      // Save and get back the updated user object
      await saveProfileChanges({
        name, username, web, bio, gender, avatarUrl, coverPhoto,
        education, work, city, country, hometown, phone, hobbies, interests,
      });

      // Show success state in the button (don't close modal)
      setSaveSuccess(true);
      if (saveSuccessTimerRef.current) clearTimeout(saveSuccessTimerRef.current);
      saveSuccessTimerRef.current = setTimeout(() => setSaveSuccess(false), 3000);

      // Background refetch to confirm DB data is in sync
      refetchCurrentUser();

    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass =
    "w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-4 py-3 text-[14px] text-white outline-none focus:border-[#3897f0] focus:ring-1 focus:ring-[#3897f0]/30 transition-all placeholder:text-[#555]";
  const labelClass = "text-[11px] font-semibold uppercase tracking-widest text-[#666] mb-1.5 flex items-center gap-1.5";

  return (
    <div
      onClick={handleClose}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 text-white"
      style={{ userSelect: "none" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#0a0a0a] border border-[#1e1e1e] rounded-2xl w-full max-w-[560px] overflow-hidden shadow-2xl animate-fade-in flex flex-col"
        style={{ maxHeight: "92vh" }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a1a1a] shrink-0">
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-[#1a1a1a] hover:bg-[#252525] flex items-center justify-center transition cursor-pointer"
          >
            <X size={16} />
          </button>
          <h3 className="font-bold text-[15px]">Edit Profile</h3>
          <button
            onClick={handleSave}
            disabled={isSaving || isUploading || isCoverUploading}
            className={`px-4 py-1.5 rounded-lg text-[13px] font-bold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 ${
              saveSuccess
                ? "bg-[#22c55e] text-white"
                : "bg-[#3897f0] hover:bg-[#2d86d9] text-white"
            }`}
          >
            {isSaving ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                Saving...
              </>
            ) : saveSuccess ? (
              <>
                <Check size={14} />
                Saved!
              </>
            ) : (
              <>
                <Check size={14} />
                Save
              </>
            )}
          </button>
        </div>

        {/* ── Cover + Avatar ── */}
        <div className="relative shrink-0">
          {/* Cover Photo */}
          <div
            className="relative h-[130px] bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] overflow-hidden group cursor-pointer"
            onClick={() => !isCoverUploading && coverInputRef.current?.click()}
          >
            {coverPhoto && (
              <img src={coverPhoto} alt="Cover" className="w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
              {isCoverUploading ? (
                <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <div className="flex flex-col items-center gap-1 text-white">
                  <Camera size={22} />
                  <span className="text-[11px] font-semibold">Change Cover</span>
                </div>
              )}
            </div>
            <input
              type="file"
              ref={coverInputRef}
              onChange={handleCoverChange}
              accept="image/*"
              className="hidden"
            />
          </div>

          {/* Avatar overlay */}
          <div className="absolute left-5 -bottom-10 z-10">
            <div
              className="relative w-[76px] h-[76px] rounded-full border-3 border-[#0a0a0a] overflow-hidden cursor-pointer group"
              style={{ border: "3px solid #0a0a0a" }}
              onClick={() => !isUploading && avatarInputRef.current?.click()}
            >
              <img
                src={avatarUrl || "https://i.pravatar.cc/150?img=1"}
                alt="avatar"
                className="w-full h-full object-cover group-hover:opacity-70 transition"
              />
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                {isUploading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Camera size={18} className="text-white" />
                )}
              </div>
            </div>
            <input
              type="file"
              ref={avatarInputRef}
              onChange={handleAvatarChange}
              accept="image/*"
              className="hidden"
            />
          </div>
        </div>

        {/* Spacer for avatar overflow */}
        <div className="h-12 shrink-0" />

        {/* ── Section Nav ── */}
        <div className="flex gap-1 px-5 pb-3 shrink-0 overflow-x-auto no-scrollbar">
          {(Object.keys(SECTION_LABELS) as Section[]).map((section) => (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12px] font-semibold whitespace-nowrap transition cursor-pointer ${
                activeSection === section
                  ? "bg-[#3897f0] text-white"
                  : "bg-[#1a1a1a] text-[#888] hover:text-white hover:bg-[#222]"
              }`}
            >
              {SECTION_ICONS[section]}
              {SECTION_LABELS[section]}
            </button>
          ))}
        </div>

        {/* ── Form Body ── */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto custom-scroll px-5 pb-6 space-y-4">

          {/* ── Basic Info ── */}
          {activeSection === "basic" && (
            <>
              <div className="bg-[#111] rounded-2xl p-4 border border-[#1e1e1e] space-y-4">
                <p className="text-[11px] text-[#555] font-semibold uppercase tracking-widest">Identity</p>

                <div>
                  <label className={labelClass}><User size={11} /> Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inputClass}
                    placeholder="Your full name"
                    maxLength={60}
                  />
                </div>

                <div>
                  <label className={labelClass}><AtSign size={11} /> Username</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#555] text-[14px]">@</span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.replace(/\s/g, "").toLowerCase())}
                      className={`${inputClass} pl-8`}
                      placeholder="username"
                      maxLength={30}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}><Users size={11} /> Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className={inputClass + " cursor-pointer appearance-none"}
                  >
                    <option value="Prefer not to say">Prefer not to say</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Non-binary">Non-binary</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
              </div>

              {/* Cover Photo hint */}
              <div
                onClick={() => !isCoverUploading && coverInputRef.current?.click()}
                className="bg-[#111] rounded-2xl p-4 border border-[#1e1e1e] flex items-center gap-3 cursor-pointer hover:bg-[#151515] transition group"
              >
                <div className="w-10 h-10 rounded-xl bg-[#1a1a1a] flex items-center justify-center shrink-0">
                  <Image size={18} className="text-[#3897f0]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold">Cover Photo</p>
                  <p className="text-[11px] text-[#555] mt-0.5 truncate">
                    {coverPhoto ? "Tap to change cover" : "Add a cover photo to your profile"}
                  </p>
                </div>
                <ChevronRight size={16} className="text-[#444] group-hover:text-[#888] transition" />
              </div>
            </>
          )}

          {/* ── About ── */}
          {activeSection === "about" && (
            <>
              <div className="bg-[#111] rounded-2xl p-4 border border-[#1e1e1e] space-y-4">
                <p className="text-[11px] text-[#555] font-semibold uppercase tracking-widest">Bio</p>
                <div>
                  <label className={labelClass}><FileText size={11} /> Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className={inputClass + " h-24 resize-none leading-relaxed"}
                    placeholder="Tell people about yourself..."
                    maxLength={150}
                  />
                  <p className="text-right text-[11px] text-[#555] mt-1">{bio.length}/150</p>
                </div>
              </div>

              <div className="bg-[#111] rounded-2xl p-4 border border-[#1e1e1e] space-y-4">
                <p className="text-[11px] text-[#555] font-semibold uppercase tracking-widest">Work & Education</p>

                <div>
                  <label className={labelClass}><Briefcase size={11} /> Work</label>
                  <input
                    type="text"
                    value={work}
                    onChange={(e) => setWork(e.target.value)}
                    className={inputClass}
                    placeholder="e.g. Software Engineer at Google"
                    maxLength={80}
                  />
                </div>

                <div>
                  <label className={labelClass}><GraduationCap size={11} /> Education</label>
                  <input
                    type="text"
                    value={education}
                    onChange={(e) => setEducation(e.target.value)}
                    className={inputClass}
                    placeholder="e.g. BSc Computer Science, MIT"
                    maxLength={80}
                  />
                </div>
              </div>

              <div className="bg-[#111] rounded-2xl p-4 border border-[#1e1e1e] space-y-4">
                <p className="text-[11px] text-[#555] font-semibold uppercase tracking-widest">Location</p>

                <div>
                  <label className={labelClass}><MapPin size={11} /> City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className={inputClass}
                    placeholder="e.g. New York"
                    maxLength={60}
                  />
                </div>

                <div>
                  <label className={labelClass}><Globe size={11} /> Country</label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className={inputClass + " cursor-pointer appearance-none"}
                  >
                    <option value="">Select country...</option>
                    {COUNTRIES.filter(Boolean).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}><Home size={11} /> Hometown</label>
                  <input
                    type="text"
                    value={hometown}
                    onChange={(e) => setHometown(e.target.value)}
                    className={inputClass}
                    placeholder="e.g. Los Angeles, CA"
                    maxLength={60}
                  />
                </div>
              </div>
            </>
          )}

          {/* ── Contact ── */}
          {activeSection === "contact" && (
            <div className="bg-[#111] rounded-2xl p-4 border border-[#1e1e1e] space-y-4">
              <p className="text-[11px] text-[#555] font-semibold uppercase tracking-widest">Contact Info</p>

              <div>
                <label className={labelClass}><Globe size={11} /> Website</label>
                <input
                  type="url"
                  value={web}
                  onChange={(e) => setWeb(e.target.value)}
                  className={inputClass}
                  placeholder="https://yourwebsite.com"
                  maxLength={120}
                />
              </div>

              <div>
                <label className={labelClass}><Phone size={11} /> Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputClass}
                  placeholder="+1 (555) 000-0000"
                  maxLength={20}
                />
                <p className="text-[11px] text-[#444] mt-1.5 leading-relaxed">
                  Your phone number won't be visible to others unless you choose to show it.
                </p>
              </div>
            </div>
          )}

          {/* ── Interests ── */}
          {activeSection === "interests" && (
            <>
              <div className="bg-[#111] rounded-2xl p-4 border border-[#1e1e1e] space-y-4">
                <p className="text-[11px] text-[#555] font-semibold uppercase tracking-widest">What you love</p>

                <div>
                  <label className={labelClass}><Heart size={11} /> Hobbies</label>
                  <textarea
                    value={hobbies}
                    onChange={(e) => setHobbies(e.target.value)}
                    className={inputClass + " h-20 resize-none"}
                    placeholder="e.g. Photography, Hiking, Cooking..."
                    maxLength={200}
                  />
                  <p className="text-right text-[11px] text-[#555] mt-1">{hobbies.length}/200</p>
                </div>

                <div>
                  <label className={labelClass}><Star size={11} /> Interests</label>
                  <textarea
                    value={interests}
                    onChange={(e) => setInterests(e.target.value)}
                    className={inputClass + " h-20 resize-none"}
                    placeholder="e.g. Technology, Music, Travel, Art..."
                    maxLength={200}
                  />
                  <p className="text-right text-[11px] text-[#555] mt-1">{interests.length}/200</p>
                </div>
              </div>

              <div className="bg-[#111] rounded-2xl p-4 border border-[#1e1e1e]">
                <p className="text-[12px] text-[#555] leading-relaxed">
                  💡 <span className="text-[#777]">Tip: </span>
                  Sharing your interests helps others connect with you and discover your profile through recommendations.
                </p>
              </div>
            </>
          )}
        </form>

        {/* ── Bottom Save Bar ── */}
        <div className="px-5 py-4 border-t border-[#1a1a1a] shrink-0 flex items-center justify-between gap-3">
          <div className="flex gap-1">
            {(Object.keys(SECTION_LABELS) as Section[]).map((section) => (
              <button
                key={section}
                onClick={() => setActiveSection(section)}
                className={`w-1.5 h-1.5 rounded-full transition-all cursor-pointer ${
                  activeSection === section ? "bg-[#3897f0] w-4" : "bg-[#333]"
                }`}
              />
            ))}
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving || isUploading || isCoverUploading}
            className={`flex-1 max-w-[160px] py-2.5 rounded-xl text-[13px] font-bold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
              saveSuccess
                ? "bg-[#22c55e] text-white"
                : "bg-[#3897f0] hover:bg-[#2d86d9] text-white"
            }`}
          >
            {isSaving ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : saveSuccess ? (
              "Saved ✅"
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
