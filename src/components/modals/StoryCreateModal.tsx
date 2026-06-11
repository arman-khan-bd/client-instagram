"use client";

import React, { useState, useRef } from "react";
import { useApp } from "../AppContext";
import { X, Upload, Image as ImageIcon, Film } from "lucide-react";

export default function StoryCreateModal() {
  const { showStoryCreate, setShowStoryCreate, createStory } = useApp();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [caption, setCaption] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!showStoryCreate) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreviewUrl("");
    setCaption("");
    setIsUploading(false);
    setShowStoryCreate(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    try {
      setIsUploading(true);
      await createStory(file, { caption });
      handleClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-[480px] overflow-hidden flex flex-col text-white max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-lg font-bold">Create Story</h2>
          <button
            onClick={handleClose}
            className="text-zinc-400 hover:text-white p-1 hover:bg-zinc-800 rounded-full transition"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-y-auto">
          {/* File Picker / Preview */}
          <div className="aspect-[9/16] max-h-[400px] w-full bg-zinc-950 flex items-center justify-center relative border-b border-zinc-800 group">
            {previewUrl ? (
              file?.type.startsWith("video") ? (
                <video
                  src={previewUrl}
                  controls
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  src={previewUrl}
                  alt="Story preview"
                  className="w-full h-full object-cover"
                />
              )
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center gap-3 cursor-pointer text-zinc-500 hover:text-zinc-300 transition p-6 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:scale-105 transition">
                  <Upload size={28} />
                </div>
                <div>
                  <p className="font-semibold text-sm">Upload a photo or video</p>
                  <p className="text-xs text-zinc-600 mt-1">Recommended: 9:16 aspect ratio</p>
                </div>
              </div>
            )}
            
            {previewUrl && !isUploading && (
              <button
                type="button"
                onClick={() => { setFile(null); setPreviewUrl(""); }}
                className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-full backdrop-blur-sm transition"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*,video/*"
            className="hidden"
          />

          {/* Form fields */}
          <div className="p-4 flex flex-col gap-4">
            <div>
              <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider block mb-1.5">
                Story Caption
              </label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write a caption (optional)..."
                rows={3}
                maxLength={200}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm focus:border-zinc-700 outline-none resize-none placeholder-zinc-600"
              />
            </div>

            <button
              type="submit"
              disabled={!file || isUploading}
              className="w-full py-3 bg-white text-black font-semibold rounded-xl hover:bg-zinc-200 transition disabled:opacity-55 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isUploading ? "Sharing to Story..." : "Share Story ✨"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
