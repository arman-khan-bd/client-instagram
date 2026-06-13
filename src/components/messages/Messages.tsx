"use client";

import React, { useState, useRef, useEffect } from "react";
import { useApp, MockChatSession, MockMessage, MockUser } from "../AppContext";
import { api } from "../../lib/api";
import { 
  Phone, Video, Info, Camera, Image as ImageIcon, Mic, Smile, 
  Trash2, Edit2, Reply, X, PlusCircle, CheckCircle, Send, MoreVertical, ShieldAlert,
  Timer
} from "lucide-react";

export default function Messages() {
  const {
    chats,
    setChats,
    chatMessages,
    sendMessage,
    loadMessages,
    editMessage,
    deleteMessage,
    reactToMessage,
    createConversation,
    currentUser,
    setViewingUserId,
    setActiveTab,
    showToast,
    activeChatId,
    setActiveChatId,
  } = useApp();

  const [inputText, setInputText] = useState("");
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  
  // Replying & Editing States
  const [replyingToMsg, setReplyingToMsg] = useState<MockMessage | null>(null);
  const [editingMsg, setEditingMsg] = useState<MockMessage | null>(null);

  // Disappearing Messages States
  const [tempDuration, setTempDuration] = useState<number | null>(null);
  const [showTimerMenu, setShowTimerMenu] = useState(false);
  const [nowTime, setNowTime] = useState(Date.now());

  // Tick for countdown timers
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Message Delete Confirmation State
  const [deletingMsgId, setDeletingMsgId] = useState<number | null>(null);

  // Modal forms
  const [modalMode, setModalMode] = useState<"dm" | "group">("dm");
  const [groupName, setGroupName] = useState("");
  const [groupFile, setGroupFile] = useState<File | null>(null);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [followers, setFollowers] = useState<any[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const groupPhotoInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeChatSession = chats.find((c) => String(c.id) === String(activeChatId));
  const currentMessages = activeChatId ? chatMessages[activeChatId] || [] : [];

  // Fetch followers list for conversation creation
  useEffect(() => {
    if (currentUser) {
      api.getFollowersList(currentUser.id)
        .then(setFollowers)
        .catch((err) => console.error("Failed to load followers list:", err));
    }
  }, [currentUser, showNewChatModal]);

  // Load messages when active chat changes
  useEffect(() => {
    if (activeChatId !== null) {
      loadMessages(activeChatId);
      // Reset reply/edit states
      setReplyingToMsg(null);
      setEditingMsg(null);
    }
  }, [activeChatId]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeChatId === null) return;

    if (editingMsg) {
      if (!inputText.trim() || editingMsg.id === undefined) return;
      await editMessage(editingMsg.id, inputText);
      setEditingMsg(null);
      setInputText("");
    } else {
      if (!inputText.trim()) return;
      sendMessage(activeChatId, inputText, {
        replyToId: replyingToMsg?.id || undefined,
        duration: tempDuration || undefined
      });
      setInputText("");
      setReplyingToMsg(null);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || activeChatId === null) return;

    setUploadingMedia(true);
    try {
      const uploaded = await api.uploadMessageMedia(file);
      const expiresAt = tempDuration
        ? new Date(Date.now() + tempDuration * 1000).toISOString()
        : null;
        
      await api.sendMessage({
        conversationId: activeChatId,
        mediaUrl: uploaded.url,
        mediaType: uploaded.type,
        expiresAt: expiresAt || undefined
      });
    } catch (err: any) {
      console.error("Failed to send media message:", err);
      alert("Failed to upload media");
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleGroupCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedParticipants.length === 0) return;

    let groupAvatarUrl = "";
    try {
      if (groupFile) {
        const uploaded = await api.uploadMessageMedia(groupFile);
        groupAvatarUrl = uploaded.url;
      }
      
      const newConv = await createConversation({
        name: groupName || "Unnamed Group",
        avatarUrl: groupAvatarUrl,
        isGroup: true,
        participantIds: selectedParticipants
      });

      setActiveChatId(newConv.id);
      setShowNewChatModal(false);
      // Reset form
      setGroupName("");
      setGroupFile(null);
      setSelectedParticipants([]);
    } catch (err) {
      console.error("Failed to create group:", err);
      alert("Failed to create group");
    }
  };

  const startDirectMessage = async (userId: string) => {
    try {
      const newConv = await createConversation({
        isGroup: false,
        participantIds: [userId]
      });
      setActiveChatId(newConv.id);
      setShowNewChatModal(false);
      setSelectedParticipants([]);
    } catch (err) {
      console.error("Failed to start DM:", err);
    }
  };

  const toggleParticipant = (userId: string) => {
    setSelectedParticipants((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleReaction = async (msgId: number, emoji: string) => {
    await reactToMessage(msgId, emoji);
  };

  const initiateEdit = (msg: MockMessage) => {
    setEditingMsg(msg);
    setInputText(msg.text);
    setReplyingToMsg(null);
  };

  const initiateDelete = (msgId: number) => {
    setDeletingMsgId(msgId);
  };

  const confirmDelete = async () => {
    if (deletingMsgId) {
      await deleteMessage(deletingMsgId);
      setDeletingMsgId(null);
    }
  };

  const [searchResults, setSearchResults] = useState<any[]>([]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const delayDebounce = setTimeout(() => {
      api.searchUsers(searchQuery)
        .then(setSearchResults)
        .catch((err) => console.error("Failed to search users:", err));
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const displayUsers = searchQuery.trim() ? searchResults : followers;

  return (
    <div className="flex-1 bg-black h-full w-full select-none text-white flex relative">
      {/* 1. Conversations List / Sidebar */}
      <div
        className={`w-full md:w-[340px] border-r border-[#222] flex flex-col h-full shrink-0 ${
          activeChatId !== null ? "hidden md:flex" : "flex"
        }`}
      >
        <div className="p-4.5 pb-3 flex items-center justify-between border-b border-[#222]">
          <h2 className="font-bold text-[16px] truncate">
            {currentUser?.name || "messages"}
          </h2>
          <button
            onClick={() => {
              setModalMode("dm");
              setShowNewChatModal(true);
            }}
            className="text-white hover:text-gray-300 font-bold text-[20px] cursor-pointer"
            title="Create Message / Group"
          >
            ✏️
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          {chats.length === 0 ? (
            <div className="p-8 text-center text-[#666] text-xs">
              No conversations yet. Tap the edit icon above to start one!
            </div>
          ) : (
            chats.map((dm) => {
              const isActive = activeChatId === dm.id;
              return (
                <div
                  key={`dm-session-${dm.id}`}
                  onClick={() => setActiveChatId(dm.id)}
                  className={`flex items-center gap-3.5 px-4 py-3.5 cursor-pointer transition ${
                    isActive ? "bg-[#161616]" : "hover:bg-[#111]"
                  }`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={dm.user.img}
                      className="w-12.5 h-12.5 rounded-full object-cover border border-[#222]"
                      alt={dm.user.name}
                    />
                    {dm.online && !dm.isGroup && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#58d68d] border-2 border-[#0a0a0a] rounded-full" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold truncate flex items-center gap-1.5">
                      {dm.user.name}
                      {dm.isGroup && (
                        <span className="bg-[#222] text-[#aaa] text-[9px] font-bold px-1.5 py-0.5 rounded">
                          Group
                        </span>
                      )}
                    </div>
                    <div className={`text-[12px] truncate ${dm.unread > 0 ? "text-white font-semibold" : "text-[#a8a8a8]"}`}>
                      {dm.preview}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0 select-none">
                    <span className="text-[11px] text-[#666]">{dm.time}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Active Chat Area */}
      <div
        className={`flex-1 flex flex-col h-full bg-[#0a0a0a] ${
          activeChatId === null ? "hidden md:flex" : "flex"
        }`}
      >
        {activeChatId !== null ? (
          !activeChatSession ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 bg-black">
              <div className="w-8 h-8 border-2 border-insta-blue border-t-transparent rounded-full animate-spin"></div>
              <div className="text-[14px] text-zinc-400">Loading conversation...</div>
            </div>
          ) : (
            <>
            {/* Chat Header */}
            <div className="px-4.5 py-3 border-b border-[#222] flex items-center gap-3.5 bg-[#111] z-20">
              <button
                onClick={() => setActiveChatId(null)}
                className="md:hidden text-white font-bold text-[18px] mr-1.5 cursor-pointer"
              >
                ←
              </button>
              
              <img
                src={activeChatSession.user.img}
                alt={activeChatSession.user.name}
                className="w-9 h-9 rounded-full object-cover border border-[#222]"
              />
              
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[14px] truncate">
                  {activeChatSession.user.name}
                </div>
                <div className="text-[11px] text-[#a8a8a8] truncate">
                  {activeChatSession.isGroup
                    ? `${activeChatSession.participants.length} members`
                    : "Active now"}
                </div>
              </div>

              <div className="flex items-center gap-3 text-[#a8a8a8]">
                <button
                  onClick={() => {
                    setModalMode("dm");
                    setShowNewChatModal(true);
                  }}
                  className="md:hidden p-1 hover:text-white transition cursor-pointer"
                  title="Create Message / Group"
                >
                  <PlusCircle size={18} />
                </button>
                <button className="p-1 hover:text-white transition"><Phone size={18} /></button>
                <button className="p-1 hover:text-white transition"><Video size={18} /></button>
                <button className="p-1 hover:text-white transition"><Info size={18} /></button>
              </div>
            </div>

            {/* Messages Log */}
            <div className="flex-1 overflow-y-auto px-4.5 py-5 flex flex-col gap-5 custom-scroll z-10 bg-black">
              {currentMessages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 text-[#555]">
                  <span>✨</span>
                  <div className="text-[13px]">No messages yet. Send a message to start!</div>
                </div>
              ) : (
                currentMessages.map((msg, i) => {
                  const reactionsList = Object.entries(msg.reactions || {});
                  const isTemp = !!msg.expiresAt;
                  let secondsLeft = 0;
                  if (isTemp && msg.expiresAt) {
                    const expiry = new Date(msg.expiresAt).getTime();
                    secondsLeft = Math.max(0, Math.ceil((expiry - nowTime) / 1000));
                  }

                  if (isTemp && secondsLeft <= 0 && msg.id) {
                    deleteMessage(msg.id);
                    return null;
                  }

                  return (
                    <div
                      key={`msg-${msg.id}-${i}`}
                      className={`flex flex-col gap-1 group/msg max-w-[70%] ${
                        msg.mine ? "self-end items-end" : "self-start items-start"
                      }`}
                    >
                      {/* Sender name for Group chats */}
                      {!msg.mine && activeChatSession.isGroup && msg.sender && (
                        <span className="text-[10px] text-zinc-500 font-semibold px-2 mb-0.5">
                          {msg.sender.username}
                        </span>
                      )}

                      {/* Reply Reference Preview */}
                      {msg.replyTo && (
                        <div className="text-[11px] bg-[#161616] text-zinc-400 px-3 py-1.5 rounded-t-xl border-l-2 border-insta-blue/70 max-w-full truncate opacity-80 mb-[-6px]">
                          <span className="font-bold text-[10px] text-zinc-500 block">
                            Replying to {msg.replyTo.senderName}
                          </span>
                          {msg.replyTo.text}
                        </div>
                      )}

                      {/* Content Bubble */}
                      <div className="relative flex items-center gap-2 group">
                        {/* Actions Context Menu (Hover actions) */}
                        {msg.mine && (
                          <div className="hidden group-hover/msg:flex items-center gap-1 bg-[#1a1a1a] px-1 py-0.5 rounded-lg border border-[#2a2a2a] order-first text-zinc-400">
                            <button
                              onClick={() => initiateEdit(msg)}
                              className="p-1 hover:text-white transition cursor-pointer"
                              title="Edit message"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => initiateDelete(msg.id!)}
                              className="p-1 hover:text-red-400 transition cursor-pointer"
                              title="Delete message"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}

                        {/* Reply trigger (Hover) */}
                        <div className="hidden group-hover/msg:block order-last">
                          <button
                            onClick={() => setReplyingToMsg(msg)}
                            className="p-1 text-zinc-400 hover:text-white transition cursor-pointer"
                            title="Reply"
                          >
                            <Reply size={14} />
                          </button>
                        </div>

                        {/* Text / Media Bubble */}
                        <div
                          className={`px-4 py-2.5 rounded-2xl text-[14px] leading-relaxed word-break relative select-text ${
                            msg.mine
                              ? "bg-insta-blue text-white rounded-br-[6px]"
                              : "bg-[#1c1c1e] text-white rounded-bl-[6px]"
                          }`}
                        >
                          {msg.mediaUrl ? (
                            msg.mediaType === "video" ? (
                              <video
                                src={msg.mediaUrl}
                                controls
                                className="max-w-[240px] rounded-lg border border-[#222]"
                              />
                            ) : (
                              <img
                                src={msg.mediaUrl}
                                alt="Media message"
                                className="max-w-[240px] max-h-[300px] object-cover rounded-lg border border-[#222]"
                              />
                            )
                          ) : (
                            msg.text
                          )}

                          {/* Reaction emojis rendering */}
                          {reactionsList.length > 0 && (
                            <div className="absolute bottom-[-10px] right-2 bg-[#222] border border-[#333] rounded-full px-1.5 py-0.5 flex items-center gap-0.5 text-[10px] shadow-lg">
                              {Array.from(new Set(reactionsList.map(([_, emoji]) => emoji))).map((emoji) => (
                                <span key={`r-emoji-${emoji}`}>{emoji}</span>
                              ))}
                              {reactionsList.length > 1 && (
                                <span className="text-[#888] font-bold ml-0.5">{reactionsList.length}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Message details & Reactions Picker */}
                      <div className="flex items-center gap-2.5 mt-1 text-[9px] text-[#666]">
                        <span>{msg.time}</span>
                        {msg.isEdited && <span>(edited)</span>}
                        {isTemp && (
                          <span className="text-amber-500 font-bold flex items-center gap-1 bg-amber-500/10 px-1.5 py-0.5 rounded-full border border-amber-500/20">
                            ⏱️ {secondsLeft >= 3600 
                              ? `${Math.floor(secondsLeft/3600)}h ${Math.floor((secondsLeft%3600)/60)}m` 
                              : secondsLeft >= 60 
                                ? `${Math.floor(secondsLeft/60)}m ${secondsLeft%60}s` 
                                : `${secondsLeft}s`
                            } left
                          </span>
                        )}

                        {/* Reactions quick emoji picker trigger */}
                        <div className="relative group/react-picker">
                          <button className="hover:text-zinc-300 transition cursor-pointer">
                            React
                          </button>
                          <div className="hidden group-hover/react-picker:flex absolute bottom-4 left-0 bg-[#1e1e1e] border border-[#333] rounded-full px-2 py-1 gap-1.5 shadow-2xl z-30">
                            {["❤️", "😂", "😮", "😢", "👍", "🔥"].map((emoji) => (
                              <span
                                key={`emoji-${emoji}`}
                                onClick={() => msg.id !== undefined && handleReaction(msg.id, emoji)}
                                className="text-[14px] cursor-pointer hover:scale-125 transition active:scale-95"
                              >
                                {emoji}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              {uploadingMedia && (
                <div className="self-end bg-[#111] px-4 py-2.5 rounded-xl text-xs text-zinc-400 italic">
                  Uploading file... ⚡
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Panel with Edit/Reply contexts */}
            <div className="p-4 bg-black border-t border-[#222]">
              {/* Replying context bar */}
              {replyingToMsg && (
                <div className="flex items-center justify-between bg-[#161618] border-l-2 border-insta-blue px-3 py-2 rounded-t-xl mb-2 text-xs">
                  <div className="truncate text-zinc-400">
                    Replying to <span className="font-bold text-white">@{replyingToMsg.mine ? "yourself" : replyingToMsg.sender?.username}</span>:{" "}
                    {replyingToMsg.text || "Shared media"}
                  </div>
                  <button onClick={() => setReplyingToMsg(null)} className="text-zinc-500 hover:text-white">
                    <X size={15} />
                  </button>
                </div>
              )}

              {/* Editing context bar */}
              {editingMsg && (
                <div className="flex items-center justify-between bg-zinc-900 border-l-2 border-yellow-500 px-3 py-2 rounded-t-xl mb-2 text-xs">
                  <div className="truncate text-zinc-400">
                    Editing message: <span className="text-white italic">{editingMsg.text}</span>
                  </div>
                  <button onClick={() => { setEditingMsg(null); setInputText(""); }} className="text-zinc-500 hover:text-white">
                    <X size={15} />
                  </button>
                </div>
              )}

              <form onSubmit={handleSend} className="flex items-center gap-3 bg-[#1c1c1e] rounded-full px-4 py-2 relative">
                {/* Media Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[#a8a8a8] hover:text-white transition cursor-pointer"
                  title="Upload image/video"
                >
                  <ImageIcon size={20} />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                />

                {/* Disappearing Message Timer Button */}
                <div className="relative flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => setShowTimerMenu(!showTimerMenu)}
                    className={`${tempDuration ? "text-amber-500 animate-pulse font-bold" : "text-[#a8a8a8] hover:text-white"} transition cursor-pointer flex items-center justify-center`}
                    title="Disappearing messages"
                  >
                    <Timer size={20} />
                  </button>
                  {showTimerMenu && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setShowTimerMenu(false)} />
                      <div className="absolute bottom-10 left-0 bg-[#1e1e20] border border-zinc-800 rounded-xl p-2 flex flex-col gap-1 shadow-2xl z-30 w-44 backdrop-blur-md bg-opacity-90">
                        <div className="text-[10px] text-zinc-500 font-bold px-2 py-1 uppercase tracking-wider">
                          Message Expiration
                        </div>
                        {[
                          { label: "Off", value: null },
                          { label: "10 Seconds", value: 10 },
                          { label: "1 Minute", value: 60 },
                          { label: "1 Hour", value: 3600 },
                          { label: "24 Hours", value: 86400 },
                        ].map((opt) => (
                          <button
                            key={`duration-${opt.label}`}
                            type="button"
                            onClick={() => {
                              setTempDuration(opt.value);
                              setShowTimerMenu(false);
                            }}
                            className={`text-left text-xs px-2 py-1.5 rounded-lg hover:bg-zinc-850 transition flex items-center justify-between ${
                              tempDuration === opt.value ? "text-amber-400 font-bold bg-white/5" : "text-zinc-300"
                            }`}
                          >
                            <span>{opt.label}</span>
                            {tempDuration === opt.value && <span className="text-[10px]">●</span>}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <input
                  type="text"
                  placeholder={
                    editingMsg
                      ? "Edit message..."
                      : tempDuration
                      ? `Disappearing in ${tempDuration >= 3600 ? `${tempDuration/3600}h` : tempDuration >= 60 ? `${tempDuration/60}m` : `${tempDuration}s`}...`
                      : "Message..."
                  }
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="flex-1 bg-transparent text-[14px] outline-none text-white placeholder-zinc-500"
                />

                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="bg-insta-blue text-white w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-40 cursor-pointer"
                >
                  <Send size={14} />
                </button>
              </form>
            </div>
          </>
          )
        ) : (
          /* Empty Chat Selected State */
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 p-6 select-none bg-black">
            <div className="w-24 h-24 rounded-full border border-zinc-800 flex items-center justify-center text-[40px]">
              💬
            </div>
            <div className="text-[18px] font-bold">Your private conversations</div>
            <div className="text-[14px] text-[#a8a8a8] max-w-[280px]">
              Send private photos, videos, and group messages to your followers.
            </div>
            <button
              onClick={() => {
                setModalMode("dm");
                setShowNewChatModal(true);
              }}
              className="mt-2.5 px-6 py-2.5 rounded-lg bg-insta-blue hover:bg-insta-blue/95 font-bold text-[13px] cursor-pointer"
            >
              Start Chat
            </button>
          </div>
        )}
      </div>

      {/* 3. Delete Confirmation Modal */}
      {deletingMsgId !== null && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 px-4">
          <div className="bg-[#1c1c1e] border border-zinc-800 rounded-2xl w-full max-w-[360px] overflow-hidden p-6 text-center shadow-2xl">
            <h3 className="text-[16px] font-bold mb-2">Unsend message?</h3>
            <p className="text-xs text-[#a8a8a8] mb-6">
              This will remove the message for everyone in the conversation.
            </p>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={confirmDelete}
                className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs cursor-pointer"
              >
                Unsend
              </button>
              <button
                onClick={() => setDeletingMsgId(null)}
                className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. New Chat / Group Creation Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-40 px-4">
          <div className="bg-[#1c1c1e] border border-zinc-800 rounded-2xl w-full max-w-[440px] max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-bold text-[15px]">New message</h3>
              <button
                onClick={() => {
                  setShowNewChatModal(false);
                  setSelectedParticipants([]);
                }}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Mode selection (DM vs Group) */}
            <div className="flex border-b border-zinc-800 text-[13px] font-semibold text-center">
              <button
                onClick={() => {
                  setModalMode("dm");
                  setSelectedParticipants([]);
                }}
                className={`flex-1 py-3 cursor-pointer ${
                  modalMode === "dm" ? "text-white border-b-2 border-insta-blue bg-white/5" : "text-[#a8a8a8]"
                }`}
              >
                Direct Message
              </button>
              <button
                onClick={() => setModalMode("group")}
                className={`flex-1 py-3 cursor-pointer ${
                  modalMode === "group" ? "text-white border-b-2 border-insta-blue bg-white/5" : "text-[#a8a8a8]"
                }`}
              >
                Group Chat
              </button>
            </div>

            {/* Group details form (if group mode) */}
            {modalMode === "group" && (
              <form onSubmit={handleGroupCreateSubmit} className="p-4.5 border-b border-zinc-800 flex flex-col gap-3.5 bg-zinc-900/30">
                <div className="flex items-center gap-3">
                  <div
                    onClick={() => groupPhotoInputRef.current?.click()}
                    className="w-12.5 h-12.5 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center cursor-pointer text-zinc-500 overflow-hidden shrink-0 hover:border-zinc-500 transition"
                  >
                    {groupFile ? (
                      <img src={URL.createObjectURL(groupFile)} className="w-full h-full object-cover" alt="Group Preview" />
                    ) : (
                      <Camera size={18} />
                    )}
                  </div>
                  <input
                    type="file"
                    ref={groupPhotoInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => setGroupFile(e.target.files?.[0] || null)}
                  />
                  <input
                    type="text"
                    placeholder="Group name..."
                    value={groupName}
                    required
                    onChange={(e) => setGroupName(e.target.value)}
                    className="flex-1 bg-zinc-850 border border-zinc-800 rounded-lg px-3.5 py-2 text-[13px] text-white outline-none focus:border-zinc-700"
                  />
                </div>
                {selectedParticipants.length > 0 && (
                  <button
                    type="submit"
                    className="w-full py-2 bg-insta-blue hover:bg-insta-blue/90 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    Create Group Chat ({selectedParticipants.length} selected)
                  </button>
                )}
              </form>
            )}

            {/* Followers Search input */}
            <div className="p-3 bg-zinc-900/10 border-b border-zinc-800 flex items-center gap-2">
              <span className="text-[12px] text-zinc-500 font-bold uppercase shrink-0">To:</span>
              <input
                type="text"
                placeholder="Search followers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-[13px] outline-none text-white"
              />
            </div>

            {/* Followers List */}
            <div className="flex-1 overflow-y-auto custom-scroll p-2 flex flex-col gap-1">
              {displayUsers.length === 0 ? (
                <div className="py-8 text-center text-zinc-500 text-xs">
                  No users found.
                </div>
              ) : (
                displayUsers.map((user) => {
                  const isSelected = selectedParticipants.includes(user.id);
                  return (
                    <div
                      key={`follower-list-${user.id}`}
                      onClick={() => {
                        if (modalMode === "dm") {
                          startDirectMessage(user.id);
                        } else {
                          toggleParticipant(user.id);
                        }
                      }}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-zinc-800/50 rounded-xl cursor-pointer transition"
                    >
                      <img
                        src={user.avatarUrl || "https://i.pravatar.cc/80?img=1"}
                        className="w-10 h-10 rounded-full object-cover border border-[#222]"
                        alt={user.username}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-bold truncate flex items-center gap-1.5">
                          {user.username}
                          {user.isVerified && <span className="verified-badge" />}
                        </div>
                        <div className="text-[11px] text-[#888] truncate">{user.fullName}</div>
                      </div>
                      
                      {modalMode === "group" && (
                        <div>
                          {isSelected ? (
                            <CheckCircle size={20} className="text-insta-blue" />
                          ) : (
                            <PlusCircle size={20} className="text-zinc-600 hover:text-zinc-400" />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
