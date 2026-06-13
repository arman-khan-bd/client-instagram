"use client";

import React, { useState } from "react";
import { useApp } from "../AppContext";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { api } from "../../lib/api";

export default function ReportModal() {
  const { reportPostId, setReportPostId, showToast } = useApp();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportPostId) return;
    if (!reason.trim()) {
      showToast("Please enter a reason for reporting.", "info");
      return;
    }

    setLoading(true);
    try {
      await api.createReport({
        postId: reportPostId,
        reason: reason.trim(),
      });
      showToast("Report submitted successfully. Thank you!", "success");
      handleClose();
    } catch (err: any) {
      console.error("Failed to submit report:", err);
      showToast(err.message || "Failed to submit report. Please try again.", "info");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setReportPostId(null);
    setReason("");
  };

  return (
    <AnimatePresence>
      {reportPostId && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Dialog Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative w-full max-w-[400px] bg-[#1c1c1e] border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl z-10 text-white"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800/65">
              <div className="flex items-center gap-2 text-red-500 font-bold text-base">
                <AlertTriangle size={18} />
                <span>Report Content</span>
              </div>
              <button
                onClick={handleClose}
                className="text-zinc-400 hover:text-white transition p-1 hover:bg-zinc-800/50 rounded-full cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
              <p className="text-xs text-zinc-400 leading-relaxed">
                Please help us keep AuraGram safe. Tell us why you are reporting this post or reel. Your report is confidential.
              </p>

              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Write reason (e.g., spam, hate speech, inappropriate, spamming comments, etc.)..."
                className="w-full h-32 bg-[#121212] border border-zinc-800 focus:border-red-500 rounded-2xl p-4 text-sm outline-none resize-none text-white transition placeholder-zinc-600"
                maxLength={400}
                required
              />

              <div className="flex justify-end gap-3.5 mt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-5 py-2.5 rounded-full text-xs font-bold bg-zinc-800 text-zinc-300 hover:bg-zinc-700/80 cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 rounded-full text-xs font-bold bg-red-600 hover:bg-red-700 disabled:bg-red-950 text-white cursor-pointer transition flex items-center justify-center gap-1.5"
                >
                  {loading ? (
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "Submit Report"
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
