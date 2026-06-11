"use client";

import React, { useState, useRef } from "react";
import { useApp } from "../AppContext";
import { Upload, X } from "lucide-react";

export default function CreatePostModal() {
  const { showCreatePostModal, setShowCreatePostModal, createPost } = useApp();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!showCreatePostModal) return null;

  const handleClose = () => {
    setShowCreatePostModal(false);
    setImagePreview(null);
    setCaption("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  };

  const handleSelectClick = () => {
    fileInputRef.current?.click();
  };

  const handleShare = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imagePreview) return;
    createPost(imagePreview, caption);
    handleClose();
  };

  return (
    <div
      onClick={handleClose}
      className="fixed inset-0 bg-black/75 z-[200] flex items-center justify-center p-4 text-white select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#111] border border-[#2a2a2a] rounded-2xl w-full max-w-[520px] overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#222]">
          <button
            onClick={handleClose}
            className="text-white hover:text-gray-300 text-[14px] cursor-pointer"
          >
            Cancel
          </button>
          <h3 className="font-bold text-[15px]">Create new post</h3>
          <button
            onClick={handleShare}
            disabled={!imagePreview}
            className="text-insta-blue hover:text-white font-bold text-[14px] cursor-pointer disabled:opacity-40 disabled:cursor-default"
          >
            Share
          </button>
        </div>

        {/* Content Body */}
        <div className="flex flex-col">
          {imagePreview ? (
            /* Selected Preview & Caption Panel */
            <form onSubmit={handleShare} className="flex flex-col">
              <div className="aspect-square bg-black overflow-hidden relative">
                <img
                  src={imagePreview}
                  alt="Post preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setImagePreview(null)}
                  className="absolute top-3 right-3 bg-black/50 hover:bg-black/80 rounded-full p-1.5 transition"
                  title="Remove image"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Caption text area */}
              <div className="p-4.5 border-t border-[#222]">
                <textarea
                  placeholder="Write a caption..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  maxLength={2200}
                  className="w-full bg-transparent border-none text-[14px] text-white outline-none placeholder-[#666] h-20 resize-none"
                />
                
                {/* Character count limit */}
                <div className="text-right text-[11px] text-[#666] select-none">
                  {caption.length} / 2,200
                </div>
              </div>
            </form>
          ) : (
            /* Drag and Drop Zone */
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={handleSelectClick}
              className="py-16 px-6 flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-[#1a1a1a]/30 transition group select-none"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              <Upload size={56} className="text-[#a8a8a8] group-hover:scale-105 transition duration-300" />
              <span className="text-[18px] text-gray-300 group-hover:text-white transition">
                Drag photos and videos here
              </span>
              <button
                type="button"
                className="mt-1 px-4.5 py-2 rounded-lg bg-insta-blue hover:bg-insta-blue/95 font-bold text-[13px] active:scale-95 transition"
              >
                Select from computer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
