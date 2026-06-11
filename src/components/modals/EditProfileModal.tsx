"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "../AppContext";

export default function EditProfileModal() {
  const { showEditProfileModal, setShowEditProfileModal, currentUser, saveProfileChanges, showToast } = useApp();

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [web, setWeb] = useState("");
  const [bio, setBio] = useState("");
  const [gender, setGender] = useState("Prefer not to say");

  // Load current values on open
  useEffect(() => {
    if (currentUser) {
      setName(currentUser.full);
      setUsername(currentUser.name);
      setWeb(currentUser.web || "");
      setBio(currentUser.bio || "");
      setGender(currentUser.gender || "Prefer not to say");
    }
  }, [currentUser, showEditProfileModal]);

  if (!showEditProfileModal) return null;

  const handleClose = () => {
    setShowEditProfileModal(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      showToast("Username cannot be empty!");
      return;
    }
    saveProfileChanges({
      name,
      username,
      web,
      bio,
      gender,
    });
    handleClose();
  };

  return (
    <div
      onClick={handleClose}
      className="fixed inset-0 bg-black/75 z-[200] flex items-center justify-center p-4 text-white select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#111] border border-[#2a2a2a] rounded-2xl w-full max-w-[480px] overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#222]">
          <button
            onClick={handleClose}
            className="text-white hover:text-gray-300 text-[14px] cursor-pointer"
          >
            Cancel
          </button>
          <h3 className="font-bold text-[15px]">Edit Profile</h3>
          <button
            onClick={handleSave}
            className="text-insta-blue hover:text-white font-bold text-[14px] cursor-pointer"
          >
            Done
          </button>
        </div>

        {/* Form Fields */}
        <form onSubmit={handleSave} className="p-5 flex flex-col gap-4 overflow-y-auto max-h-[75vh]">
          {/* Avatar Area */}
          <div className="flex flex-col items-center gap-2 mb-2 select-none">
            <img
              src={currentUser?.img || "https://i.pravatar.cc/150?img=1"}
              alt="avatar"
              className="w-20 h-20 rounded-full object-cover border-2 border-[#222]"
            />
            <span
              onClick={() => showToast("Change profile photo simulation")}
              className="text-insta-blue text-[14px] font-semibold cursor-pointer hover:underline"
            >
              Change profile photo
            </span>
          </div>

          <div>
            <label className="text-[12px] text-[#a8a8a8] font-bold block mb-1.5 uppercase tracking-wide">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3.5 py-2.5 text-[14px] text-white outline-none focus:border-[#3897f0] transition-colors"
            />
          </div>

          <div>
            <label className="text-[12px] text-[#a8a8a8] font-bold block mb-1.5 uppercase tracking-wide">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3.5 py-2.5 text-[14px] text-white outline-none focus:border-[#3897f0] transition-colors"
            />
          </div>

          <div>
            <label className="text-[12px] text-[#a8a8a8] font-bold block mb-1.5 uppercase tracking-wide">
              Website
            </label>
            <input
              type="text"
              value={web}
              onChange={(e) => setWeb(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3.5 py-2.5 text-[14px] text-white outline-none focus:border-[#3897f0] transition-colors"
            />
          </div>

          <div>
            <label className="text-[12px] text-[#a8a8a8] font-bold block mb-1.5 uppercase tracking-wide">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3.5 py-2.5 text-[14px] text-white outline-none focus:border-[#3897f0] transition-colors h-20 resize-none"
            />
          </div>

          <div>
            <label className="text-[12px] text-[#a8a8a8] font-bold block mb-1.5 uppercase tracking-wide">
              Gender
            </label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3.5 py-2.5 text-[14px] text-white outline-none focus:border-[#3897f0] transition-colors cursor-pointer"
            >
              <option value="Prefer not to say">Prefer not to say</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Custom">Custom</option>
            </select>
          </div>
        </form>
      </div>
    </div>
  );
}
