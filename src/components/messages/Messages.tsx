"use client";

import React, { useState, useRef, useEffect } from "react";
import { useApp, MockChatSession, MockMessage } from "../AppContext";
import { Phone, Video, Info, Camera, Image as ImageIcon, Mic, Smile, Award } from "lucide-react";

export default function Messages() {
  const {
    chats,
    setChats,
    chatMessages,
    sendMessage,
    currentUser,
    setViewingUserId,
    setActiveTab,
    showToast,
  } = useApp();

  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeChatSession = chats.find((c) => c.id === activeChatId);
  const currentMessages = activeChatId ? chatMessages[activeChatId] || [] : [];

  // Scroll to bottom when messages list updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages]);

  const handleChatOpen = (chatId: number) => {
    setActiveChatId(chatId);
    // Reset unread count for this session
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, unread: 0 } : c))
    );
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || activeChatId === null) return;
    sendMessage(activeChatId, inputText);
    setInputText("");
  };

  const handleEmojiClick = (emoji: string) => {
    setInputText((prev) => prev + emoji);
  };

  const handleUserClick = (userId: number) => {
    setViewingUserId(userId);
    setActiveTab("profile");
  };

  const isEmojiOnlyMsg = (text: string) => {
    const emojiRegex = /^[\u{1F300}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}]{1,3}$/u;
    return emojiRegex.test(text);
  };

  return (
    <div className="flex-1 bg-black h-full w-full select-none text-white flex">
      {/* 1. Conversations List (DM sidebar) */}
      <div
        className={`w-full md:w-[340px] border-r border-[#222] flex flex-col h-full shrink-0 ${
          activeChatId !== null ? "hidden md:flex" : "flex"
        }`}
      >
        <div className="p-4.5 pb-3 flex items-center justify-between border-b border-[#222]">
          <h2 className="font-bold text-[16px] truncate">
            {currentUser?.name || "alex_dev"}
          </h2>
          <button
            onClick={() => {}}
            className="text-white hover:text-gray-300 font-bold text-[20px]"
            title="New message"
          >
            ✏️
          </button>
        </div>

        {/* Dynamic DM conversations list */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {chats.map((dm) => {
            const isActive = activeChatId === dm.id;
            return (
              <div
                key={`dm-session-${dm.id}`}
                onClick={() => handleChatOpen(dm.id)}
                className={`flex items-center gap-3.5 px-4 py-3.5 cursor-pointer transition ${
                  isActive ? "bg-[#1a1a1a]" : "hover:bg-[#111]"
                }`}
              >
                <div className="relative shrink-0">
                  <img
                    src={dm.user.img}
                    className="w-12.5 h-12.5 rounded-full object-cover border border-[#222]"
                    alt={dm.user.name}
                  />
                  {dm.online && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#58d68d] border-2 border-[#0a0a0a] rounded-full" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-semibold truncate flex items-center gap-1.5">
                    {dm.user.name}
                    {dm.user.verified && <span className="text-[#3897f0] text-[10px]">✓</span>}
                  </div>
                  <div className={`text-[12px] truncate ${dm.unread > 0 ? "text-white font-semibold" : "text-[#a8a8a8]"}`}>
                    {dm.preview}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0 select-none">
                  <span className="text-[11px] text-[#666]">{dm.time}</span>
                  {dm.unread > 0 && (
                    <span className="w-4.5 h-4.5 rounded-full bg-insta-blue text-white text-[9px] font-bold flex items-center justify-center">
                      {dm.unread}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Active Chat Area */}
      <div
        className={`flex-1 flex flex-col h-full bg-[#0a0a0a] ${
          activeChatId === null ? "hidden md:flex" : "flex"
        }`}
      >
        {activeChatId !== null && activeChatSession ? (
          <>
            {/* Chat Header */}
            <div className="px-4.5 py-3 border-b border-[#222] flex items-center gap-3.5 bg-[#111]">
              <button
                onClick={() => setActiveChatId(null)}
                className="md:hidden text-white font-bold text-[18px] mr-1.5"
              >
                ←
              </button>
              
              <img
                src={activeChatSession.user.img}
                alt={activeChatSession.user.name}
                onClick={() => handleUserClick(activeChatSession.user.id)}
                className="w-9 h-9 rounded-full object-cover border border-[#222] cursor-pointer"
              />
              
              <div className="flex-1 min-w-0">
                <div
                  onClick={() => handleUserClick(activeChatSession.user.id)}
                  className="font-bold text-[14px] cursor-pointer hover:underline truncate"
                >
                  {activeChatSession.user.name}
                </div>
                <div className="text-[11px] text-[#58d68d]">
                  {activeChatSession.online ? "Active now" : "Active 1h ago"}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {}}
                  className="p-1 hover:text-gray-300 transition"
                  title="Voice call"
                >
                  <Phone size={18} />
                </button>
                <button
                  onClick={() => {}}
                  className="p-1 hover:text-gray-300 transition"
                  title="Video call"
                >
                  <Video size={18} />
                </button>
                <button
                  onClick={() => {}}
                  className="p-1 hover:text-gray-300 transition"
                  title="Info"
                >
                  <Info size={18} />
                </button>
              </div>
            </div>

            {/* Messages Log */}
            <div className="flex-1 overflow-y-auto px-4.5 py-5 flex flex-col gap-3.5 custom-scroll">
              {/* Profile Card Header */}
              <div className="flex flex-col items-center py-6 border-b border-[#111]">
                <img
                  src={activeChatSession.user.img}
                  className="w-16.5 h-16.5 rounded-full object-cover border border-[#222]"
                  alt={activeChatSession.user.name}
                />
                <div className="font-bold text-[16px] mt-2.5">{activeChatSession.user.name}</div>
                <div className="text-[13px] text-[#a8a8a8]">{activeChatSession.user.full}</div>
                <button
                  onClick={() => handleUserClick(activeChatSession.user.id)}
                  className="mt-3.5 px-4.5 py-1.5 border border-[#222] rounded-lg text-[12px] font-bold hover:bg-[#111]"
                >
                  View profile
                </button>
              </div>

              <div className="text-center text-[11px] text-[#666] my-2">Today</div>

              {/* Bubbles list */}
              {currentMessages.map((msg, i) => (
                <div
                  key={`msg-${i}`}
                  className="flex flex-col gap-0.5"
                >
                  {msg.reel ? (
                    <div
                      className={`max-w-[68%] px-4 py-3 rounded-2xl text-[13px] select-text bg-[#1a1a1a] text-[#f5f5f5] ${
                        msg.mine ? "self-end" : "self-start"
                      }`}
                    >
                      📹 Shared a reel
                    </div>
                  ) : (
                    <div
                      className={`max-w-[68%] px-4 py-2.5 rounded-2xl text-[14px] leading-relaxed select-text word-break ${
                        msg.mine
                          ? "bg-insta-blue text-white self-end rounded-br-[6px]"
                          : "bg-[#1a1a1a] text-white self-start rounded-bl-[6px]"
                      } ${isEmojiOnlyMsg(msg.text) ? "!bg-transparent text-[32px] p-0" : ""}`}
                    >
                      {msg.text}
                    </div>
                  )}
                  <span
                    className={`text-[9px] text-[#666] tracking-wider select-none ${
                      msg.mine ? "self-end" : "self-start"
                    }`}
                  >
                    {msg.time}
                  </span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Emoji Bar */}
            <div className="px-4.5 pb-2">
              <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                {["❤️", "😂", "😮", "😢", "😡", "👍", "🔥", "✨"].map((e) => (
                  <button
                    key={`quick-emoji-${e}`}
                    onClick={() => handleEmojiClick(e)}
                    className="text-[20px] p-1.5 rounded-lg hover:bg-[#1a1a1a] cursor-pointer transition active:scale-90 shrink-0"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Form */}
            <form onSubmit={handleSend} className="px-4.5 pb-4.5 pt-2 border-t border-[#222] bg-[#111] flex items-center gap-3">
              <button
                type="button"
                onClick={() => {}}
                className="text-[#a8a8a8] hover:text-white transition"
              >
                <Camera size={22} />
              </button>
              <button
                type="button"
                onClick={() => {}}
                className="text-[#a8a8a8] hover:text-white transition"
              >
                <ImageIcon size={22} />
              </button>
              <button
                type="button"
                onClick={() => {}}
                className="text-[#a8a8a8] hover:text-white transition"
              >
                <Mic size={22} />
              </button>
              <input
                type="text"
                placeholder="Message…"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 bg-[#1a1a1a] border border-[#222] rounded-full px-4.5 py-2.5 text-[14px] text-white outline-none focus:border-[#333] transition"
              />
              <button
                type="button"
                onClick={() => {}}
                className="text-[#a8a8a8] hover:text-white transition"
              >
                <Smile size={22} />
              </button>
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="bg-insta-blue hover:bg-insta-blue/90 text-white w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-40 disabled:cursor-default"
              >
                ➤
              </button>
            </form>
          </>
        ) : (
          /* Empty Chat Selected State */
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 p-6 select-none">
            <span className="text-[60px]">💬</span>
            <div className="text-[18px] font-bold">Your messages</div>
            <div className="text-[14px] text-[#a8a8a8]">
              Send private photos and messages to a friend or group.
            </div>
            <button
              onClick={() => {}}
              className="mt-2.5 px-5 py-2 rounded-lg bg-insta-blue hover:bg-insta-blue/95 font-bold text-[14px]"
            >
              Send message
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
