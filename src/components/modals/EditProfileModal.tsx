"use client";

import React, { useState, useEffect, useRef } from "react";
import { useApp } from "../AppContext";
import {
  User, Globe, FileText, Users, GraduationCap, Briefcase,
  MapPin, Home, Phone, Heart, Star, Image, X, Check, Camera, Mail
} from "lucide-react";
import { scanFileForAdultContent } from "../../lib/nsfwDetector";

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

  // Basic (Non-editable full name and username states kept for context and saving backend)
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
  const [email, setEmail] = useState("");

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
      setEmail(currentUser.email || "");
      setHobbies(currentUser.hobbies || "");
      setInterests(currentUser.interests || "");
    }
  }, [showEditProfileModal]);

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
      setEmail(currentUser.email || "");
      setHobbies(currentUser.hobbies || "");
      setInterests(currentUser.interests || "");
    }
  }, [currentUser]);

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
    // NSFW Adult Content Safety Scan
    try {
      showToast("🔍 Running safety scan...", "info");
      const scan = await scanFileForAdultContent(file);
      if (scan.isAdult) {
        showToast(`⚠️ Adult content detected (${(scan.probability * 100).toFixed(1)}%). Upload blocked.`, "info");
        alert(`WARNING: Nude or adult content detected!\n\nThis photo was rejected. If you attempt to upload adult content, your account will be banned automatically.`);
        e.target.value = "";
        return;
      }
    } catch (scanErr) {
      console.warn("NSFW scan failed for avatar:", scanErr);
    }
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
    // NSFW Adult Content Safety Scan
    try {
      showToast("🔍 Running safety scan...", "info");
      const scan = await scanFileForAdultContent(file);
      if (scan.isAdult) {
        showToast(`⚠️ Adult content detected (${(scan.probability * 100).toFixed(1)}%). Upload blocked.`, "info");
        alert(`WARNING: Nude or adult content detected!\n\nThis cover photo was rejected. If you attempt to upload adult content, your account will be banned automatically.`);
        e.target.value = "";
        return;
      }
    } catch (scanErr) {
      console.warn("NSFW scan failed for cover:", scanErr);
    }
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
    try {
      setIsSaving(true);
      setSaveSuccess(false);

      await saveProfileChanges({
        name, username, web, bio, gender, avatarUrl, coverPhoto,
        education, work, city, country, hometown, phone, hobbies, interests,
        email,
      });

      await refetchCurrentUser();
      handleClose();

    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass =
    "w-full bg-[#0a0a0b] border border-zinc-800/80 rounded-xl px-4 py-3 text-[14px] text-white outline-none focus:border-[#3897f0] focus:ring-1 focus:ring-[#3897f0]/30 transition-all placeholder:text-[#555]";
  const labelClass = "text-[11px] font-semibold uppercase tracking-widest text-[#666] mb-1.5 flex items-center gap-1.5";

  return (
    <div
      className="fixed inset-0 bg-[#070708] z-[250] text-white flex flex-col w-screen h-screen select-none overflow-hidden"
    >
      {/* Top Header Bar */}
      <div className="w-full border-b border-zinc-800 shrink-0 bg-[#0a0a0b] z-10">
        <div className="flex items-center justify-between px-6 py-4.5 max-w-[1200px] mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              className="w-9 h-9 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-center transition cursor-pointer text-zinc-300 hover:text-white"
            >
              <X size={16} />
            </button>
            <h3 className="font-extrabold text-[16px] tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">Edit Profile Settings</h3>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving || isUploading || isCoverUploading}
            className={`px-5 py-2 rounded-xl text-[13px] font-bold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-md ${
              saveSuccess
                ? "bg-[#22c55e] text-white shadow-green-500/10"
                : "bg-[#3897f0] hover:bg-[#2d86d9] text-white shadow-insta-blue/10"
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
                Saved
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </div>

      {/* Main Workspace (Wide Split Panel Layout) */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden max-w-[1200px] w-full mx-auto p-4 md:p-6 gap-6">
        
        {/* Left Panel: Profile Preview card & Section Navigation */}
        <div className="w-full md:w-[320px] shrink-0 flex flex-col gap-4 select-none">
          {/* Profile Card Preview */}
          <div className="relative rounded-[24px] overflow-hidden border border-zinc-800/80 bg-zinc-900/40 backdrop-blur-xl p-5 shadow-xl">
            {/* Background cover photo */}
            <div className="absolute inset-x-0 top-0 h-[85px] bg-gradient-to-r from-insta-blue to-purple-600 z-0">
              {coverPhoto && (
                <img src={coverPhoto} className="w-full h-full object-cover opacity-75" alt="cover" />
              )}
              <div className="absolute inset-0 bg-black/40" />
              <button
                type="button"
                onClick={() => !isCoverUploading && coverInputRef.current?.click()}
                className="absolute top-2.5 right-2.5 bg-black/60 hover:bg-black/85 transition text-white p-2 rounded-xl border border-white/10 flex items-center justify-center cursor-pointer"
                title="Change Cover Photo"
              >
                <Camera size={13} />
              </button>
              <input
                type="file"
                ref={coverInputRef}
                onChange={handleCoverChange}
                className="hidden"
                accept="image/*"
              />
            </div>

            {/* Avatar & Name details */}
            <div className="relative z-10 pt-10 flex flex-col items-center text-center">
              <div className="relative group mb-3">
                <img
                  src={avatarUrl || "https://i.pravatar.cc/150?img=1"}
                  className="w-20 h-20 rounded-full object-cover border-4 border-zinc-950 shadow-xl"
                  alt="avatar"
                />
                <div
                  onClick={() => !isUploading && avatarInputRef.current?.click()}
                  className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer"
                  title="Change Profile Photo"
                >
                  <Camera size={18} className="text-white" />
                </div>
                <input
                  type="file"
                  ref={avatarInputRef}
                  onChange={handleAvatarChange}
                  className="hidden"
                  accept="image/*"
                />
              </div>
              <h4 className="text-[16px] font-bold text-white leading-snug truncate w-full px-2">{name || "Your Name"}</h4>
              <p className="text-[12px] text-zinc-500 mt-0.5 font-semibold truncate w-full px-2">@{username || "username"}</p>
            </div>
          </div>

          {/* Section Navigation Tabs */}
          <div className="bg-zinc-900/20 border border-zinc-800/80 rounded-[24px] p-2 flex md:flex-col gap-1 overflow-x-auto no-scrollbar">
            {(Object.keys(SECTION_LABELS) as Section[]).map((section) => (
              <button
                key={section}
                type="button"
                onClick={() => setActiveSection(section)}
                className={`flex items-center gap-3 px-4.5 py-3.5 rounded-2xl text-[13px] font-semibold transition cursor-pointer shrink-0 text-left w-full ${
                  activeSection === section
                    ? "bg-gradient-to-r from-insta-blue/20 to-purple-600/10 border border-insta-blue/30 text-white shadow-inner"
                    : "border border-transparent text-zinc-400 hover:text-white hover:bg-zinc-800/30"
                }`}
              >
                <span className={activeSection === section ? "text-insta-blue" : "text-zinc-500"}>
                  {SECTION_ICONS[section]}
                </span>
                <span>{SECTION_LABELS[section]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right Panel: Active Form Section details */}
        <div className="flex-1 bg-zinc-900/20 border border-zinc-800/80 rounded-[28px] overflow-hidden flex flex-col shadow-xl">
          <form
            onSubmit={handleSave}
            className="flex-1 p-5 md:p-8 overflow-y-auto space-y-6 custom-scroll text-left"
          >
            {/* Active section header info */}
            <div className="border-b border-zinc-800 pb-3 mb-2 shrink-0 flex items-center justify-between">
              <span className="text-[13px] font-bold text-white uppercase tracking-wider">
                {SECTION_LABELS[activeSection]}
              </span>
              <span className="text-[10px] text-zinc-500 font-semibold select-none">Fields will auto-save on submit</span>
            </div>

            {/* Basic Info section without Name/Username */}
            {activeSection === "basic" && (
              <div className="space-y-5">
                <div className="bg-zinc-900/30 rounded-2xl p-4 border border-zinc-800/60 space-y-4">
                  <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-widest">Personal Details</p>
                  <div>
                    <label className={labelClass}><Users size={11} /> Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className={inputClass + " cursor-pointer appearance-none bg-zinc-950"}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Custom">Custom</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>
                </div>

                <div className="bg-zinc-900/30 rounded-2xl p-4 border border-zinc-800/60 space-y-4">
                  <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-widest">Contact Details</p>
                  <div>
                    <label className={labelClass}><Phone size={11} /> Phone Number</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={inputClass}
                      placeholder="e.g. +123456789"
                    />
                  </div>
                  <div>
                    <label className={labelClass}><Mail size={11} /> Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputClass}
                      placeholder="e.g. user@example.com"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* About Section */}
            {activeSection === "about" && (
              <div className="space-y-5">
                <div className="bg-zinc-900/30 rounded-2xl p-4 border border-zinc-800/60 space-y-3">
                  <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-widest">Bio Description</p>
                  <div>
                    <label className={labelClass}><FileText size={11} /> Bio</label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className={inputClass + " h-24 resize-none leading-relaxed bg-zinc-950"}
                      placeholder="Tell people about yourself..."
                      maxLength={150}
                    />
                    <p className="text-right text-[10px] text-zinc-600 mt-1">{bio.length}/150</p>
                  </div>
                </div>

                <div className="bg-zinc-900/30 rounded-2xl p-4 border border-zinc-800/60 space-y-4">
                  <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-widest">Work & Education</p>
                  <div>
                    <label className={labelClass}><Briefcase size={11} /> Work Info</label>
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
                    <label className={labelClass}><GraduationCap size={11} /> Education Info</label>
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

                <div className="bg-zinc-900/30 rounded-2xl p-4 border border-zinc-800/60 space-y-4">
                  <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-widest">Geographics</p>
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
                      className={inputClass + " cursor-pointer appearance-none bg-zinc-950"}
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
              </div>
            )}

            {/* Contact Section */}
            {activeSection === "contact" && (
              <div className="bg-zinc-900/30 rounded-2xl p-4 border border-[#1a1a1a] space-y-4">
                <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-widest">Contact details</p>
                <div>
                  <label className={labelClass}><Globe size={11} /> Website link</label>
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
                </div>
              </div>
            )}

            {/* Interests Section */}
            {activeSection === "interests" && (
              <div className="space-y-5">
                <div className="bg-zinc-900/30 rounded-2xl p-4 border border-[#1a1a1a] space-y-4">
                  <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-widest">Personal Passions</p>
                  <div>
                    <label className={labelClass}><Heart size={11} /> Hobbies</label>
                    <textarea
                      value={hobbies}
                      onChange={(e) => setHobbies(e.target.value)}
                      className={inputClass + " h-20 resize-none bg-zinc-950"}
                      placeholder="e.g. Photography, Hiking, Cooking..."
                      maxLength={200}
                    />
                    <p className="text-right text-[10px] text-zinc-600 mt-1">{hobbies.length}/200</p>
                  </div>
                  <div>
                    <label className={labelClass}><Star size={11} /> Interests</label>
                    <textarea
                      value={interests}
                      onChange={(e) => setInterests(e.target.value)}
                      className={inputClass + " h-20 resize-none bg-zinc-950"}
                      placeholder="e.g. Technology, Music, Travel, Art..."
                      maxLength={200}
                    />
                    <p className="text-right text-[10px] text-zinc-600 mt-1">{interests.length}/200</p>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

      </div>
    </div>
  );
}
