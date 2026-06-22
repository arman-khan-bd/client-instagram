"use client";

import React, { useState } from "react";
import Tesseract from "tesseract.js";
import { ArrowLeft, Upload, FileText, Camera, User, Tag, HelpCircle, Loader2 } from "lucide-react";
import Link from "next/link";

export default function ImageAnalyzer() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side resizing / compression warning check
    const maxSizeBytes = 4.5 * 1024 * 1024; // 4.5MB Vercel limit
    if (file.size > maxSizeBytes) {
      alert(`⚠️ File is large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Vercel limits request payload to 4.5MB. Please upload a smaller image.`);
      return;
    }

    setLoading(true);
    setResults(null);
    setPreviewUrl(URL.createObjectURL(file));

    try {
      // 1. Extract Text locally inside client browser (Bypasses Vercel Timeouts)
      const ocrData = await Tesseract.recognize(file, "eng");
      const extractedText = ocrData.data.text.trim();

      // 2. Call the Server API for AI categorization and structural data
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/analyze", { method: "POST", body: formData });
      const apiData = await response.json();

      if (response.ok) {
        setResults({ ...apiData, text: extractedText || "No text found in photo." });
      } else {
        alert(apiData.error || "Failed to analyze image components.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while analyzing the image.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 sm:p-10 select-none flex flex-col items-center">
      <div className="w-full max-w-[800px] flex items-center justify-between mb-8">
        <Link href="/" className="flex items-center gap-2 text-zinc-400 hover:text-white transition font-semibold text-sm">
          <ArrowLeft size={16} />
          Back to Feed
        </Link>
        <span className="text-[10px] uppercase font-bold text-insta-pink tracking-wider bg-insta-pink/10 border border-insta-pink/20 px-3 py-1 rounded-full">
          AI Smart Lens
        </span>
      </div>

      <div className="w-full max-w-[800px] bg-zinc-950 border border-zinc-900 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
            Smart Image Meta Analyzer
          </h1>
          <p className="text-xs text-zinc-500 mt-2 max-w-[500px] mx-auto leading-relaxed">
            Upload any image to extract type metadata, execute client-side OCR text recognition, and run Hugging Face AI image captioning and object detection.
          </p>
        </div>

        {/* Upload Zone */}
        <label className="border-2 border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-900/10 hover:bg-zinc-900/30 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition text-center select-none group">
          <input type="file" accept="image/*" onChange={handleImageUpload} disabled={loading} className="hidden" />
          <div className="w-14 h-14 bg-zinc-950 border border-zinc-800 rounded-2xl flex items-center justify-center text-zinc-400 group-hover:scale-105 transition duration-200">
            <Upload size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-zinc-300">Choose an image file</p>
            <p className="text-[10px] text-zinc-500 mt-1">PNG, JPG, WEBP • Max 4.5 MB</p>
          </div>
        </label>

        {loading && (
          <div className="flex flex-col items-center justify-center py-10 gap-3 border border-zinc-900 bg-zinc-900/10 rounded-2xl animate-pulse">
            <Loader2 className="animate-spin text-insta-blue" size={28} />
            <span className="text-xs font-bold text-zinc-400 tracking-wider">Executing OCR and AI analysis pipelines...</span>
          </div>
        )}

        {/* Results view */}
        {results && !loading && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start animate-fade-in pt-4 border-t border-zinc-900">
            {/* Image preview column */}
            <div className="md:col-span-5 flex flex-col gap-3">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Image Preview</h3>
              <div className="aspect-square bg-black border border-zinc-900 rounded-2xl overflow-hidden shadow-inner relative flex items-center justify-center">
                <img src={previewUrl} className="w-full h-full object-contain" alt="Preview" />
              </div>
            </div>

            {/* AI Results column */}
            <div className="md:col-span-7 flex flex-col gap-5">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Analysis Results</h3>
              
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-zinc-900/40 border border-zinc-900 p-3.5 rounded-2xl flex flex-col gap-1">
                  <span className="text-zinc-500 font-semibold flex items-center gap-1.5"><Camera size={12} /> Format</span>
                  <span className="font-extrabold text-[13px] text-zinc-200 uppercase">{results.type}</span>
                </div>
                <div className="bg-zinc-900/40 border border-zinc-900 p-3.5 rounded-2xl flex flex-col gap-1">
                  <span className="text-zinc-500 font-semibold flex items-center gap-1.5"><FileText size={12} /> Dimensions</span>
                  <span className="font-extrabold text-[13px] text-zinc-200">{results.dimensions}</span>
                </div>
                <div className="bg-zinc-900/40 border border-zinc-900 p-3.5 rounded-2xl flex flex-col gap-1">
                  <span className="text-zinc-500 font-semibold flex items-center gap-1.5"><User size={12} /> People Present</span>
                  <span className="font-extrabold text-[13px] text-zinc-200">{results.peopleCount}</span>
                </div>
                <div className="bg-zinc-900/40 border border-zinc-900 p-3.5 rounded-2xl flex flex-col gap-1">
                  <span className="text-zinc-500 font-semibold flex items-center gap-1.5"><Tag size={12} /> Tags</span>
                  <span className="font-semibold text-[11px] text-zinc-400 truncate" title={results.styleTags.join(', ')}>
                    {results.styleTags.join(', ')}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5 text-xs">
                <span className="text-zinc-500 font-semibold flex items-center gap-1.5"><HelpCircle size={12} /> AI Description</span>
                <div className="bg-zinc-900/40 border border-zinc-900 p-4 rounded-2xl leading-relaxed text-zinc-300 italic font-medium">
                  "{results.description}"
                </div>
              </div>

              {/* Extracted Text */}
              <div className="flex flex-col gap-1.5 text-xs">
                <span className="text-zinc-500 font-semibold flex items-center gap-1.5"><FileText size={12} /> Extracted Text (OCR)</span>
                <pre className="bg-[#050505] border border-zinc-900 p-4 rounded-2xl font-mono text-[11px] text-green-400 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[160px] custom-scroll">
                  {results.text}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
