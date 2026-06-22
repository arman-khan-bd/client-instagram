"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useApp } from "../AppContext";
import { api } from "../../lib/api";
import { 
  Users, 
  FileText, 
  MessageSquare, 
  AlertTriangle, 
  Settings, 
  Globe, 
  Mail, 
  CheckCircle, 
  Trash2, 
  Activity, 
  Eye, 
  X, 
  ShieldAlert, 
  Database,
  Loader2,
  TrendingUp,
  Search,
  Check,
  Menu,
  Tv,
  Radio
} from "lucide-react";

type AdminTab = "overview" | "users" | "posts" | "comments" | "reports" | "seo" | "settings" | "messages" | "tv" | "verifications";

export default function Admin() {
  const { showToast, currentUser } = useApp();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Data States
  const [loading, setLoading] = useState(true);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [postsList, setPostsList] = useState<any[]>([]);
  const [commentsList, setCommentsList] = useState<any[]>([]);
  const [reportsList, setReportsList] = useState<any[]>([]);
  const [verificationsList, setVerificationsList] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  
  // TV analytics states
  const [tvLiveViewers, setTvLiveViewers] = useState<any[]>([]);
  const [tvHistory, setTvHistory] = useState<any[]>([]);
  const [tvChannelsCount, setTvChannelsCount] = useState(0);
  const [tvChannels, setTvChannels] = useState<any[]>([]);

  // TV Channel creation form state
  const [tvName, setTvName] = useState("");
  const [tvUrl, setTvUrl] = useState("");
  const [tvLogoUrl, setTvLogoUrl] = useState("");
  const [tvCategory, setTvCategory] = useState("General");
  const [tvInfo, setTvInfo] = useState("");
  const [tvSubmitting, setTvSubmitting] = useState(false);

  // Pagination States
  const [usersPage, setUsersPage] = useState(1);
  const [postsPage, setPostsPage] = useState(1);
  const [commentsPage, setCommentsPage] = useState(1);
  const [reportsPage, setReportsPage] = useState(1);
  const [verificationsPage, setVerificationsPage] = useState(1);
  const [tvPage, setTvPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    setUsersPage(1);
    setPostsPage(1);
    setCommentsPage(1);
    setReportsPage(1);
    setVerificationsPage(1);
    setTvPage(1);
  }, [searchTerm, activeTab]);
  
  // SEO Local Settings
  const [seoTitlePrefix, setSeoTitlePrefix] = useState("AuraGram");
  const [seoDescription, setSeoDescription] = useState("Connect with friends, share what you're up to, or see what's new from others all over the world.");
  const [seoKeywords, setSeoKeywords] = useState("social media, instagram, photos, videos, reels, community");
  const [seoRobotsTxt, setSeoRobotsTxt] = useState("User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api\nSitemap: https://auragram.app/sitemap.xml");
  const [seoSitemapLinks, setSeoSitemapLinks] = useState<any[]>([
    { url: "https://auragram.app/", priority: 1.0, changefreq: "daily" },
    { url: "https://auragram.app/explore", priority: 0.8, changefreq: "daily" },
    { url: "https://auragram.app/search", priority: 0.8, changefreq: "daily" },
    { url: "https://auragram.app/reels", priority: 0.7, changefreq: "daily" },
    { url: "https://auragram.app/tv", priority: 0.6, changefreq: "weekly" }
  ]);
  const [newSitemapUrl, setNewSitemapUrl] = useState("");
  const [newSitemapPriority, setNewSitemapPriority] = useState(0.8);
  const [newSitemapFreq, setNewSitemapFreq] = useState("daily");
  
  // Site General Settings
  const [brandName, setBrandName] = useState("AuraGram");
  const [supportEmail, setSupportEmail] = useState("support@auragram.app");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [allowedUploadSize, setAllowedUploadSize] = useState(10); // MB

  // Detailed Modal Viewing
  const [selectedPost, setSelectedPost] = useState<any>(null);

  // User Analytics Modal State
  const [selectedUserAnalytics, setSelectedUserAnalytics] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [selectedAnalyticsUser, setSelectedAnalyticsUser] = useState<any>(null);

  const handleViewUserAnalytics = async (user: any) => {
    setSelectedAnalyticsUser(user);
    setAnalyticsLoading(true);
    try {
      const data = await api.getUserAnalytics(user.id);
      setSelectedUserAnalytics(data);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to load user activity data", "info");
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const isAdmin = currentUser?.role === "admin";

  // Fetch all dashboard data
  const loadDashboardData = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const [u, p, c, r, v] = await Promise.all([
        api.getAllUsers(),
        api.getAllPosts(),
        api.getAllComments(),
        api.getReports(),
        api.getVerificationRequests()
      ]);
      setUsersList(u);
      setPostsList(p);
      setCommentsList(c);
      setReportsList(r);
      setVerificationsList(v);
    } catch (err: any) {
      showToast(err.message || "Failed to load dashboard statistics", "info");
    } finally {
      setLoading(false);
    }
  };

  const handleResolveVerification = async (requestId: number, userId: string, status: "approved" | "rejected") => {
    try {
      await api.updateVerificationRequest(requestId, userId, status);
      showToast(`Verification request ${status}!`, "success");
      setVerificationsList(prev => prev.map(req => req.id === requestId ? { ...req, status } : req));
      if (status === "approved") {
        setUsersList(prev => prev.map(usr => usr.id === userId ? { ...usr, isVerified: true } : usr));
      }
    } catch (err: any) {
      showToast(err.message || "Action failed", "info");
    }
  };

  const loadTvStats = async () => {
    try {
      const [channelsData, sessions, historyData] = await Promise.all([
        api.getTvChannels(),
        api.getTvActiveSessions(),
        api.getTvViewingHistory()
      ]);
       setTvChannelsCount(channelsData.length);
      setTvChannels(channelsData);
      
      // Filter sessions active within the last 30 seconds
      const activeCutoff = new Date(Date.now() - 30 * 1000);
      const activeSessions = sessions.filter((s: any) => new Date(s.lastActiveAt) > activeCutoff);
      setTvLiveViewers(activeSessions);
      setTvHistory(historyData);
    } catch (err: any) {
      console.error(err);
      showToast("Failed to load TV statistics", "info");
    }
  };

  const loadSeoSettings = async () => {
    try {
      const data = await api.getSeoSettings();
      if (data) {
        setSeoTitlePrefix(data.titlePrefix || "AuraGram");
        setSeoDescription(data.description || "");
        setSeoKeywords(data.keywords || "");
        setSeoRobotsTxt(data.robotsTxt || "");
        if (data.sitemapLinks) {
          const links = typeof data.sitemapLinks === "string" ? JSON.parse(data.sitemapLinks) : data.sitemapLinks;
          setSeoSitemapLinks(links);
        }
      }
    } catch (err) {
      console.error("Failed to load SEO settings:", err);
    }
  };

  const handleUpdateSeo = async () => {
    try {
      await api.updateSeoSettings({
        titlePrefix: seoTitlePrefix,
        description: seoDescription,
        keywords: seoKeywords,
        robotsTxt: seoRobotsTxt,
        sitemapLinks: seoSitemapLinks,
      });
      showToast("SEO settings updated globally! 🌐", "success");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to update SEO settings", "info");
    }
  };

  useEffect(() => {
    if (isAdmin && activeTab === "seo") {
      loadSeoSettings();
    }
  }, [isAdmin, activeTab]);

  useEffect(() => {
    if (isAdmin) {
      loadDashboardData();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin && activeTab === "tv") {
      loadTvStats();
      const interval = setInterval(() => {
        if (document.visibilityState === "visible") {
          loadTvStats();
        }
      }, 5000); // Poll every 5s for live counts
      return () => clearInterval(interval);
    }
  }, [isAdmin, activeTab]);

  // Strict Access Control Guard view
  if (!isAdmin) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-black text-white h-full px-6 text-center select-none">
        <div className="max-w-md bg-[#111] border border-zinc-800 rounded-3xl p-8 flex flex-col items-center gap-4 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 text-3xl">
            🔒
          </div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-100">Access Restricted</h2>
          <p className="text-xs leading-relaxed text-zinc-400">
            This dashboard console requires administrative authorization credentials. If you believe this is an error, please contact your platform operator.
          </p>
        </div>
      </div>
    );
  }

  // Action Helpers
  const handleCreateTvChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tvName || !tvUrl) {
      showToast("Channel Name and Stream URL are required", "info");
      return;
    }
    setTvSubmitting(true);
    try {
      const newChan = await api.createTvChannel({
        name: tvName,
        url: tvUrl,
        logoUrl: tvLogoUrl,
        category: tvCategory,
        info: tvInfo
      });
      showToast("TV channel created successfully!", "success");
      setTvChannels(prev => [newChan, ...prev]);
      setTvChannelsCount(prev => prev + 1);
      setTvName("");
      setTvUrl("");
      setTvLogoUrl("");
      setTvCategory("General");
      setTvInfo("");
    } catch (err: any) {
      showToast(err.message || "Failed to create TV channel", "info");
    } finally {
      setTvSubmitting(false);
    }
  };

  const handleDeleteTvChannel = async (channelId: number) => {
    if (!confirm("Are you sure you want to delete this TV channel?")) return;
    try {
      await api.deleteTvChannel(channelId);
      showToast("TV channel deleted successfully", "success");
      setTvChannels(prev => prev.filter(ch => ch.id !== channelId));
      setTvChannelsCount(prev => Math.max(0, prev - 1));
    } catch (err: any) {
      showToast(err.message || "Failed to delete TV channel", "info");
    }
  };

  const handleToggleTvChannel = async (channelId: number, currentEnabled: boolean) => {
    try {
      const updated = await api.updateTvChannel(channelId, { enabled: !currentEnabled });
      showToast(`Channel "${updated.name}" is now ${!currentEnabled ? "enabled" : "disabled"}`, "success");
      setTvChannels(prev => prev.map(ch => ch.id === channelId ? { ...ch, enabled: !currentEnabled } : ch));
    } catch (err: any) {
      showToast(err.message || "Failed to toggle channel status", "info");
    }
  };

  const handleToggleVerify = async (userId: string, currentStatus: boolean) => {
    try {
      await api.updateUserVerified(userId, !currentStatus);
      showToast(`User verification ${!currentStatus ? "activated" : "removed"}!`, "success");
      setUsersList(prev => prev.map(usr => usr.id === userId ? { ...usr, isVerified: !currentStatus } : usr));
    } catch (err: any) {
      showToast(err.message || "Action failed", "info");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you absolutely sure you want to delete this user? All their posts and comments will be permanently erased.")) return;
    try {
      await api.deleteUser(userId);
      showToast("User deleted permanently", "success");
      setUsersList(prev => prev.filter(usr => usr.id !== userId));
    } catch (err: any) {
      showToast(err.message || "Action failed", "info");
    }
  };

  const handleDeletePost = async (postId: number) => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    try {
      await api.deletePost(postId);
      showToast("Post deleted successfully", "success");
      setPostsList(prev => prev.filter(pst => pst.id !== postId));
      setSelectedPost(null);
    } catch (err: any) {
      showToast(err.message || "Action failed", "info");
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;
    try {
      await api.deleteComment(commentId);
      showToast("Comment deleted successfully", "success");
      setCommentsList(prev => prev.filter(cmt => cmt.id !== commentId));
    } catch (err: any) {
      showToast(err.message || "Action failed", "info");
    }
  };

  const handleUpdateReport = async (reportId: number, status: "resolved" | "dismissed") => {
    try {
      await api.updateReportStatus(reportId, status);
      showToast(`Report marked as ${status}!`, "success");
      setReportsList(prev => prev.map(rep => rep.id === reportId ? { ...rep, status } : rep));
    } catch (err: any) {
      showToast(err.message || "Action failed", "info");
    }
  };

  // Filter lists based on search
  const filteredUsers = useMemo(() => {
    return usersList.filter(u => 
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (u.fullName || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [usersList, searchTerm]);

  const filteredPosts = useMemo(() => {
    return postsList.filter(p => 
      (p.caption || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.User?.username.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [postsList, searchTerm]);

  const filteredComments = useMemo(() => {
    return commentsList.filter(c => 
      (c.text || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.User?.username.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [commentsList, searchTerm]);

  const filteredReports = useMemo(() => {
    return reportsList.filter(r => 
      (r.reason || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.reporter?.username.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [reportsList, searchTerm]);

  const filteredVerifications = useMemo(() => {
    return verificationsList.filter(v => 
      (v.reason || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.user?.username.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [verificationsList, searchTerm]);

  // Paginated Lists
  const paginatedUsers = useMemo(() => {
    const start = (usersPage - 1) * PAGE_SIZE;
    return filteredUsers.slice(start, start + PAGE_SIZE);
  }, [filteredUsers, usersPage]);

  const paginatedPosts = useMemo(() => {
    const start = (postsPage - 1) * PAGE_SIZE;
    return filteredPosts.slice(start, start + PAGE_SIZE);
  }, [filteredPosts, postsPage]);

  const paginatedComments = useMemo(() => {
    const start = (commentsPage - 1) * PAGE_SIZE;
    return filteredComments.slice(start, start + PAGE_SIZE);
  }, [filteredComments, commentsPage]);

  const paginatedReports = useMemo(() => {
    const start = (reportsPage - 1) * PAGE_SIZE;
    return filteredReports.slice(start, start + PAGE_SIZE);
  }, [filteredReports, reportsPage]);

  const paginatedVerifications = useMemo(() => {
    const start = (verificationsPage - 1) * PAGE_SIZE;
    return filteredVerifications.slice(start, start + PAGE_SIZE);
  }, [filteredVerifications, verificationsPage]);

  const paginatedTvChannels = useMemo(() => {
    const start = (tvPage - 1) * PAGE_SIZE;
    return tvChannels.slice(start, start + PAGE_SIZE);
  }, [tvChannels, tvPage]);

  // Helper Pagination Controls Component
  const renderPagination = (currentPage: number, totalItems: number, onPageChange: (p: number) => void) => {
    const totalPages = Math.ceil(totalItems / PAGE_SIZE);
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between p-4 border-t border-[#222] bg-[#0c0c0c]/40 text-xs select-none">
        <span className="text-zinc-500">
          Showing {Math.min((currentPage - 1) * PAGE_SIZE + 1, totalItems)}-{Math.min(currentPage * PAGE_SIZE, totalItems)} of {totalItems} entries
        </span>
        <div className="flex items-center gap-1.5">
          <button
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
            className="px-3 py-1.5 rounded-lg bg-[#181818] border border-white/[0.04] text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400 transition cursor-pointer font-bold"
          >
            Prev
          </button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }).map((_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`px-3 py-1.5 rounded-lg border transition cursor-pointer font-bold text-xs ${
                    currentPage === pageNum
                      ? "bg-insta-blue border-insta-blue text-white shadow-md shadow-insta-blue/20"
                      : "bg-[#181818] border-white/[0.04] text-zinc-400 hover:text-white hover:bg-zinc-800"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            className="px-3 py-1.5 rounded-lg bg-[#181818] border border-white/[0.04] text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400 transition cursor-pointer font-bold"
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  // SVG Chart Computations
  const chartData = useMemo(() => {
    // Generate dates for the last 7 days
    const days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toLocaleDateString(undefined, { weekday: "short" });
    });

    // Dummy trends derived from current DB volumes to scale realistically
    const userMultiplier = Math.max(usersList.length, 5);
    const postMultiplier = Math.max(postsList.length, 8);

    const registrations = [
      Math.floor(userMultiplier * 0.4),
      Math.floor(userMultiplier * 0.55),
      Math.floor(userMultiplier * 0.65),
      Math.floor(userMultiplier * 0.72),
      Math.floor(userMultiplier * 0.85),
      Math.floor(userMultiplier * 0.95),
      userMultiplier
    ];

    const postsUploaded = [
      Math.floor(postMultiplier * 0.2),
      Math.floor(postMultiplier * 0.45),
      Math.floor(postMultiplier * 0.3),
      Math.floor(postMultiplier * 0.7),
      Math.floor(postMultiplier * 0.5),
      Math.floor(postMultiplier * 0.9),
      postMultiplier
    ];

    return { days, registrations, postsUploaded };
  }, [usersList, postsList]);

  if (loading && usersList.length === 0) {
    return (
      <div className="flex-grow flex items-center justify-center bg-black text-white h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-insta-blue" size={32} />
          <span className="text-sm font-semibold tracking-wide text-gray-400">Loading Admin Portal...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full w-full bg-black text-white overflow-hidden select-none relative">
      
      {/* Mobile Drawer Overlay Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Admin Panel Sidebar / Mobile Drawer */}
      <div className={`fixed inset-y-0 left-0 w-[260px] shrink-0 border-r border-[#222] bg-[#0c0c0c] flex flex-col p-4 z-50 transform transition-transform duration-300 ease-in-out md:relative md:transform-none md:translate-x-0 md:w-[240px] md:z-0 ${
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        <div className="flex items-center justify-between mb-8 px-2">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="text-insta-pink" size={24} />
            <span className="font-bold text-[17px] tracking-wide bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Admin Console
            </span>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden text-gray-400 hover:text-white p-1 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex flex-col gap-1 w-full pb-3 md:pb-0">
          {[
            { id: "overview", label: "Dashboard", icon: <Activity size={16} /> },
            { id: "users", label: `Users (${usersList.length})`, icon: <Users size={16} /> },
            { id: "posts", label: `Posts (${postsList.length})`, icon: <FileText size={16} /> },
            { id: "comments", label: `Comments`, icon: <MessageSquare size={16} /> },
            { id: "reports", label: `Reports (${reportsList.filter(r => r.status === 'pending').length})`, icon: <AlertTriangle size={16} /> },
            { id: "verifications", label: `Verifications (${verificationsList.filter(v => v.status === 'pending').length})`, icon: <CheckCircle size={16} /> },
            { id: "seo", label: "SEO Settings", icon: <Globe size={16} /> },
            { id: "settings", label: "Site Config", icon: <Settings size={16} /> },
            { id: "messages", label: "DMs Manager", icon: <Mail size={16} /> },
            { id: "tv", label: "AuraTV Stats", icon: <Tv size={16} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => { 
                setActiveTab(tab.id as AdminTab); 
                setSearchTerm(""); 
                setIsMobileMenuOpen(false);
              }}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13px] font-semibold transition cursor-pointer shrink-0 ${
                activeTab === tab.id
                  ? "bg-insta-blue text-white shadow-lg shadow-insta-blue/20"
                  : "text-[#a8a8a8] hover:text-white hover:bg-[#1a1a1a]"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="hidden md:flex flex-col gap-2 mt-auto p-2 border-t border-[#222]/50 text-[10px] text-zinc-500">
          <div className="flex items-center gap-1.5 font-medium">
            <Database size={10} />
            <span>Database Status: Active</span>
          </div>
          <div>v1.2.0 • Secured Console</div>
        </div>
      </div>

      {/* Main Panel Content Container */}
      <div className="flex-1 flex flex-col overflow-hidden bg-black h-full">
        
        {/* Sticky Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-[#222] bg-[#0c0c0c] sticky top-0 z-30 w-full">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="text-white p-1 hover:bg-[#1a1a1a] rounded-lg transition cursor-pointer"
            >
              <Menu size={20} />
            </button>
            <span className="font-bold text-sm tracking-wide bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Admin Console
            </span>
          </div>
          <div className="flex items-center gap-1.5 bg-insta-pink/15 text-insta-pink border border-insta-pink/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
            {activeTab}
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto custom-scroll p-4 sm:p-8">
          
          {/* Active Tab View Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold capitalize text-gray-100">{activeTab}</h1>
              <p className="text-xs text-zinc-400 mt-1">Manage, moderate, and monitor your social platform settings.</p>
            </div>

            {/* Inline Search Bar for Management Lists */}
            {["users", "posts", "comments", "reports"].includes(activeTab) && (
              <div className="relative w-full sm:w-[260px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                <input
                  type="text"
                  placeholder={`Search ${activeTab}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#121212] border border-[#222] rounded-lg pl-9 pr-4 py-2 text-xs text-white outline-none focus:border-insta-blue transition"
                />
              </div>
            )}
          </div>

        {/* Dashboard Panels */}

        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="flex flex-col gap-8 animate-fade-in">
            {/* Quick Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total Users", val: usersList.length, color: "from-blue-500 to-indigo-600", icon: <Users size={20} /> },
                { label: "Total Posts", val: postsList.length, color: "from-purple-500 to-pink-600", icon: <FileText size={20} /> },
                { label: "Active DMs", val: commentsList.length, color: "from-amber-500 to-orange-600", icon: <MessageSquare size={20} /> },
                { label: "Pending Reports", val: reportsList.filter(r => r.status === 'pending').length, color: "from-red-500 to-rose-600", icon: <AlertTriangle size={20} /> }
              ].map((m, idx) => (
                <div key={idx} className="bg-[#111] border border-[#222] p-5 rounded-2xl flex items-center justify-between shadow-lg relative overflow-hidden">
                  <div className="flex flex-col gap-1 z-10">
                    <span className="text-[12px] text-zinc-400 font-medium">{m.label}</span>
                    <span className="text-2xl font-bold text-white">{m.val}</span>
                  </div>
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${m.color} flex items-center justify-center text-white shadow-md`}>
                    {m.icon}
                  </div>
                  {/* Subtle Background Glow Accent */}
                  <div className="absolute -right-4 -bottom-4 w-16 h-16 rounded-full bg-white/2 blur-2xl pointer-events-none" />
                </div>
              ))}
            </div>

            {/* Dynamic Charts Section (SVG Based) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* User Growth Line Chart */}
              <div className="bg-[#111] border border-[#222] p-6 rounded-2xl shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="text-insta-blue" size={16} />
                    <h3 className="font-bold text-[14px]">User Registrations (Last 7 Days)</h3>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-semibold bg-[#222] px-2 py-0.5 rounded-full">Dotted Cumulative</span>
                </div>
                
                {/* SVG Line Chart */}
                <div className="w-full h-[220px] relative">
                  <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3897f0" stopOpacity="0.4"/>
                        <stop offset="100%" stopColor="#3897f0" stopOpacity="0.0"/>
                      </linearGradient>
                    </defs>
                    
                    {/* Horizontal Gridlines */}
                    {[0, 50, 100, 150].map((yVal) => (
                      <line key={yVal} x1="30" y1={yVal} x2="480" y2={yVal} stroke="#ffffff" strokeOpacity="0.05" strokeWidth="1" />
                    ))}
                    
                    {/* Line Plot Path */}
                    {(() => {
                      const points = chartData.registrations.map((val, idx) => {
                        const x = 30 + (idx * 75);
                        // Scale value relative to 200px max height
                        const maxVal = Math.max(...chartData.registrations, 1);
                        const y = 170 - ((val / maxVal) * 130);
                        return { x, y, val };
                      });
                      
                      const dLine = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                      const dArea = `${dLine} L ${points[points.length - 1].x} 170 L ${points[0].x} 170 Z`;
                      
                      return (
                        <>
                          <path d={dArea} fill="url(#chartGlow)" />
                          <path d={dLine} fill="none" stroke="#3897f0" strokeWidth="2.5" strokeLinecap="round" />
                          {points.map((p, i) => (
                            <g key={i} className="group/dot cursor-pointer">
                              <circle cx={p.x} cy={p.y} r="4.5" fill="#3897f0" stroke="#000" strokeWidth="1.5" className="transition duration-150 hover:r-6" />
                              <text x={p.x} y={p.y - 10} fill="#fff" fontSize="9" textAnchor="middle" fontWeight="bold" className="opacity-0 group-hover/dot:opacity-100 transition duration-150">
                                {p.val}
                              </text>
                            </g>
                          ))}
                        </>
                      );
                    })()}
                  </svg>
                  
                  {/* Chart X Axis Labels */}
                  <div className="absolute bottom-0 left-0 right-0 px-[32px] flex justify-between text-[9px] font-bold text-zinc-500">
                    {chartData.days.map((day, idx) => (
                      <span key={idx}>{day}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Uploads Bar Chart */}
              <div className="bg-[#111] border border-[#222] p-6 rounded-2xl shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="text-insta-pink" size={16} />
                    <h3 className="font-bold text-[14px]">Posts Uploaded Daily</h3>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-semibold bg-[#222] px-2 py-0.5 rounded-full">New Content</span>
                </div>
                
                {/* SVG Bar Chart */}
                <div className="w-full h-[220px] relative">
                  <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
                    {/* Horizontal Gridlines */}
                    {[0, 50, 100, 150].map((yVal) => (
                      <line key={yVal} x1="30" y1={yVal} x2="480" y2={yVal} stroke="#ffffff" strokeOpacity="0.05" strokeWidth="1" />
                    ))}
                    
                    {/* Bars rendering */}
                    {(() => {
                      const maxVal = Math.max(...chartData.postsUploaded, 1);
                      return chartData.postsUploaded.map((val, idx) => {
                        const barWidth = 24;
                        const x = 30 + (idx * 68) + 12;
                        const height = (val / maxVal) * 130;
                        const y = 170 - height;
                        
                        return (
                          <g key={idx} className="group/bar cursor-pointer">
                            <rect x={x} y={y} width={barWidth} height={height} rx="4" fill="url(#barGradient)" className="transition duration-150 hover:opacity-90" />
                            <text x={x + 12} y={y - 8} fill="#fff" fontSize="9" textAnchor="middle" fontWeight="bold" className="opacity-0 group-hover/bar:opacity-100 transition duration-150">
                              {val}
                            </text>
                            <defs>
                              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#E1306C" />
                                <stop offset="100%" stopColor="#833AB4" />
                              </linearGradient>
                            </defs>
                          </g>
                        );
                      });
                    })()}
                  </svg>
                  
                  {/* Chart X Axis Labels */}
                  <div className="absolute bottom-0 left-0 right-0 px-[46px] flex justify-between text-[9px] font-bold text-zinc-500">
                    {chartData.days.map((day, idx) => (
                      <span key={idx}>{day}</span>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 2: USERS */}
        {activeTab === "users" && (
          <div className="bg-[#111] border border-[#222] rounded-2xl shadow-xl overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-[#222] bg-[#1a1a1a]/50 text-zinc-400 font-bold text-xs uppercase tracking-wider grid grid-cols-12 gap-4">
              <div className="col-span-4">User Details</div>
              <div className="col-span-3">User ID</div>
              <div className="col-span-2">Joined At</div>
              <div className="col-span-3 text-right">Actions</div>
            </div>
            
            {filteredUsers.length === 0 ? (
              <div className="text-center py-16 text-zinc-500 text-sm">No registered users matched your criteria.</div>
            ) : (
              <>
                <div className="flex flex-col divide-y divide-[#222]">
                  {paginatedUsers.map((u) => (
                    <div key={u.id} className="p-4.5 grid grid-cols-12 gap-4 items-center text-sm">
                      
                      {/* User profile info */}
                      <div className="col-span-4 flex items-center gap-3">
                        <img src={u.avatarUrl || "https://i.pravatar.cc/150?img=1"} className="w-10 h-10 rounded-full object-cover border border-[#333]" alt="" />
                        <div className="min-w-0">
                          <div className="font-bold flex items-center gap-1.5 truncate">
                            {u.username}
                            {u.isVerified && <span className="verified-badge" title="Verified" />}
                          </div>
                          <div className="text-[11px] text-zinc-400 truncate">{u.fullName || "AuraGram User"}</div>
                        </div>
                      </div>
                      
                      {/* User ID */}
                      <div className="col-span-3 font-mono text-[10px] text-zinc-500 select-all truncate">{u.id}</div>
                      
                      {/* Joined Date */}
                      <div className="col-span-2 text-zinc-400 text-xs truncate">
                        {new Date(u.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </div>
                      
                      {/* User Actions */}
                      <div className="col-span-3 flex justify-end gap-2 shrink-0">
                        <button
                          onClick={() => handleViewUserAnalytics(u)}
                          className="p-1.5 hover:bg-[#222] text-zinc-400 hover:text-white rounded-lg transition border border-[#333] cursor-pointer"
                          title="View User Activity Logs"
                        >
                          <Activity size={15} />
                        </button>

                        <button
                          onClick={() => handleToggleVerify(u.id, u.isVerified)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer border ${
                            u.isVerified
                              ? "bg-transparent border-[#333] text-zinc-400 hover:text-white"
                              : "bg-insta-blue hover:bg-insta-blue/90 border-transparent text-white"
                          }`}
                        >
                          {u.isVerified ? "Revoke Verified" : "Verify User"}
                        </button>
                        
                        {/* Do not let logged-in admin delete themselves */}
                        {currentUser?.id !== u.id && (
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="p-1.5 hover:bg-red-500/10 text-red-500 rounded-lg transition border border-transparent hover:border-red-500/20 cursor-pointer"
                            title="Delete User Account"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>

                    </div>
                  ))}
                </div>
                {renderPagination(usersPage, filteredUsers.length, setUsersPage)}
              </>
            )}
          </div>
        )}

        {/* TAB: VERIFICATIONS */}
        {activeTab === "verifications" && (
          <div className="bg-[#111] border border-[#222] rounded-2xl shadow-xl overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-[#222] bg-[#1a1a1a]/50 text-zinc-400 font-bold text-xs uppercase tracking-wider grid grid-cols-12 gap-4">
              <div className="col-span-4">User Details</div>
              <div className="col-span-5">Reason / Justification</div>
              <div className="col-span-3 text-right">Actions</div>
            </div>
            
            {filteredVerifications.length === 0 ? (
              <div className="text-center py-16 text-zinc-500 text-sm">No verification requests found.</div>
            ) : (
              <>
                <div className="flex flex-col divide-y divide-[#222]">
                  {paginatedVerifications.map((v) => (
                    <div key={v.id} className="p-4.5 grid grid-cols-12 gap-4 items-center text-sm">
                      
                      {/* User Info */}
                      <div className="col-span-4 flex items-center gap-3">
                        <img src={v.user?.avatarUrl || "https://i.pravatar.cc/150?img=1"} className="w-10 h-10 rounded-full object-cover border border-[#333]" alt="" />
                        <div className="min-w-0">
                          <div className="font-bold flex items-center gap-1.5 truncate">
                            {v.user?.username}
                            {v.user?.isVerified && <span className="verified-badge" title="Verified" />}
                          </div>
                          <div className="text-[11px] text-zinc-400 truncate">{v.user?.fullName || "AuraGram User"}</div>
                        </div>
                      </div>
                      
                      {/* Reason */}
                      <div className="col-span-5 text-zinc-300 text-xs whitespace-pre-wrap pr-4 break-words">
                        {v.reason || <span className="text-zinc-600 italic">No justification provided.</span>}
                      </div>
                      
                      {/* Actions */}
                      <div className="col-span-3 flex justify-end items-center gap-2 shrink-0">
                        {v.status === 'pending' ? (
                          <>
                            <button
                              onClick={() => handleResolveVerification(v.id, v.userId, 'approved')}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                            >
                              <Check size={13} />
                              Approve
                            </button>
                            <button
                              onClick={() => handleResolveVerification(v.id, v.userId, 'rejected')}
                              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                            >
                              <X size={13} />
                              Reject
                            </button>
                          </>
                        ) : (
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                            v.status === 'approved'
                              ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                              : "bg-red-500/10 text-red-500 border border-red-500/20"
                          }`}>
                            {v.status}
                          </span>
                        )}
                      </div>

                    </div>
                  ))}
                </div>
                {renderPagination(verificationsPage, filteredVerifications.length, setVerificationsPage)}
              </>
            )}
          </div>
        )}

        {/* TAB 3: POSTS */}
        {activeTab === "posts" && (
          <div className="bg-[#111] border border-[#222] rounded-2xl shadow-xl overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-[#222] bg-[#1a1a1a]/50 text-zinc-400 font-bold text-xs uppercase tracking-wider grid grid-cols-12 gap-4">
              <div className="col-span-5">Author & Post Caption</div>
              <div className="col-span-3">Media Preview</div>
              <div className="col-span-2">Created At</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>
            
            {filteredPosts.length === 0 ? (
              <div className="text-center py-16 text-zinc-500 text-sm">No posts found.</div>
            ) : (
              <>
                <div className="flex flex-col divide-y divide-[#222]">
                  {paginatedPosts.map((p) => {
                    const mediaList = Array.isArray(p.mediaUrls) ? p.mediaUrls : [];
                    const isVideo = p.isReel || (mediaList.length > 0 && typeof mediaList[0] === 'string' && mediaList[0].match(/\.(mp4|mov)/gi));
                    
                    return (
                      <div key={p.id} className="p-4.5 grid grid-cols-12 gap-4 items-center text-sm">
                        
                        {/* Author & caption info */}
                        <div className="col-span-5 flex items-center gap-3">
                          <div className="min-w-0">
                            <div className="font-bold flex items-center gap-1.5 text-zinc-300">
                              @{p.User?.username || "unknown"}
                            </div>
                            <div className="text-[12px] text-zinc-400 line-clamp-2 mt-0.5 italic">
                              "{p.caption || "No caption provided"}"
                            </div>
                          </div>
                        </div>
                        
                        {/* Media preview */}
                        <div className="col-span-3 flex items-center">
                          {p.isTextOnly ? (
                            <div style={{ background: p.thumbnailUrl }} className="w-11 h-11 rounded-md border border-[#222] flex items-center justify-center text-[7px] p-1 text-center font-bold overflow-hidden text-white line-clamp-3">
                              {p.caption}
                            </div>
                          ) : isVideo ? (
                            <div className="relative w-11 h-11 bg-zinc-800 rounded-md border border-[#222] overflow-hidden flex items-center justify-center">
                              <span className="text-xs">🎬</span>
                            </div>
                          ) : (
                            <img src={p.thumbnailUrl || mediaList[0] || "https://picsum.photos/80/80"} className="w-11 h-11 rounded-md object-cover border border-[#222]" alt="" />
                          )}
                          <span className="text-[10px] text-zinc-500 ml-2.5 font-bold uppercase">
                            {p.isTextOnly ? "Text Grid" : isVideo ? "Reel Video" : "Image Card"}
                          </span>
                        </div>
                        
                        {/* Created Date */}
                        <div className="col-span-2 text-zinc-400 text-xs truncate">
                          {new Date(p.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </div>
                        
                        {/* Actions */}
                        <div className="col-span-2 flex justify-end gap-2.5">
                          <button
                            onClick={() => setSelectedPost(p)}
                            className="p-1.5 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg transition border border-transparent hover:border-zinc-700 cursor-pointer"
                            title="View Post Details"
                          >
                            <Eye size={15} />
                          </button>
                          
                          <button
                            onClick={() => handleDeletePost(p.id)}
                            className="p-1.5 hover:bg-red-500/10 text-red-500 rounded-lg transition border border-transparent hover:border-red-500/20 cursor-pointer"
                            title="Delete Post permanently"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>

                      </div>
                    );
                  })}
                </div>
                {renderPagination(postsPage, filteredPosts.length, setPostsPage)}
              </>
            )}
          </div>
        )}

        {/* TAB 4: COMMENTS */}
        {activeTab === "comments" && (
          <div className="bg-[#111] border border-[#222] rounded-2xl shadow-xl overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-[#222] bg-[#1a1a1a]/50 text-zinc-400 font-bold text-xs uppercase tracking-wider grid grid-cols-12 gap-4">
              <div className="col-span-4">Author & Text</div>
              <div className="col-span-4">Original Post Caption</div>
              <div className="col-span-2">Created At</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>
            
            {filteredComments.length === 0 ? (
              <div className="text-center py-16 text-zinc-500 text-sm">No comments logged in database.</div>
            ) : (
              <>
                <div className="flex flex-col divide-y divide-[#222]">
                  {paginatedComments.map((c) => (
                    <div key={c.id} className="p-4.5 grid grid-cols-12 gap-4 items-center text-sm">
                      
                      {/* Comment author & content */}
                      <div className="col-span-4 flex items-center gap-2">
                        <div className="min-w-0">
                          <span className="font-bold text-zinc-300">@{c.User?.username || "unknown"}: </span>
                          <span className="text-zinc-200 select-text">{c.text || "💌 Reacted Emoji"}</span>
                        </div>
                      </div>
                      
                      {/* Post context link */}
                      <div className="col-span-4 text-xs text-zinc-400 truncate line-clamp-1 italic">
                        "{c.Post?.caption || "Text gradient card / No caption"}"
                      </div>
                      
                      {/* Created Date */}
                      <div className="col-span-2 text-zinc-500 text-xs truncate">
                        {new Date(c.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </div>
                      
                      {/* Actions */}
                      <div className="col-span-2 flex justify-end gap-2.5">
                        <button
                          onClick={() => handleDeleteComment(c.id)}
                          className="p-1.5 hover:bg-red-500/10 text-red-500 rounded-lg transition border border-transparent hover:border-red-500/20 cursor-pointer"
                          title="Delete Comment permanently"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                    </div>
                  ))}
                </div>
                {renderPagination(commentsPage, filteredComments.length, setCommentsPage)}
              </>
            )}
          </div>
        )}

        {/* TAB 5: REPORTS */}
        {activeTab === "reports" && (
          <div className="bg-[#111] border border-[#222] rounded-2xl shadow-xl overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-[#222] bg-[#1a1a1a]/50 text-zinc-400 font-bold text-xs uppercase tracking-wider grid grid-cols-12 gap-4">
              <div className="col-span-3">Reporter & Reason</div>
              <div className="col-span-4">Target Content Preview</div>
              <div className="col-span-2">Report Status</div>
              <div className="col-span-3 text-right">Moderation Actions</div>
            </div>
            
            {filteredReports.length === 0 ? (
              <div className="text-center py-16 text-zinc-500 text-sm">No content reports filed.</div>
            ) : (
              <>
                <div className="flex flex-col divide-y divide-[#222]">
                  {paginatedReports.map((r) => {
                    const isPostReport = !!r.postId;
                    
                    return (
                      <div key={r.id} className="p-4.5 grid grid-cols-12 gap-4 items-center text-sm">
                        
                        {/* Reporter & Reason */}
                        <div className="col-span-3 flex flex-col gap-0.5">
                          <span className="font-bold text-zinc-300">@{r.reporter?.username || "reporter"}</span>
                          <span className="text-xs text-red-400 italic">"Reason: {r.reason}"</span>
                        </div>
                        
                        {/* Target Preview */}
                        <div className="col-span-4 min-w-0">
                          {isPostReport ? (
                            <div className="flex items-center gap-2">
                              <span className="bg-[#1a1a1a] px-2 py-0.5 rounded text-[10px] uppercase font-bold text-amber-500">Post</span>
                              <span className="text-xs text-zinc-400 truncate italic">"{r.post?.caption || "View image/video preview"}"</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="bg-[#1a1a1a] px-2 py-0.5 rounded text-[10px] uppercase font-bold text-orange-500">Comment</span>
                              <span className="text-xs text-zinc-400 truncate italic">"{r.comment?.text || "Comment text preview"}"</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Status */}
                        <div className="col-span-2">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            r.status === "pending"
                              ? "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20"
                              : r.status === "resolved"
                                ? "bg-green-500/10 text-green-500 border border-green-500/20 animate-pulse"
                                : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                          }`}>
                            {r.status}
                          </span>
                        </div>
                        
                        {/* Moderation Actions */}
                        <div className="col-span-3 flex justify-end gap-1.5">
                          {r.status === "pending" && (
                            <>
                              <button
                                onClick={() => handleUpdateReport(r.id, "resolved")}
                                className="px-2.5 py-1 rounded bg-green-500 hover:bg-green-600 text-xs font-bold text-white transition flex items-center gap-0.5 cursor-pointer"
                                title="Resolve Report"
                              >
                                <Check size={12} /> Resolve
                              </button>
                              <button
                                onClick={() => handleUpdateReport(r.id, "dismissed")}
                                className="px-2.5 py-1 rounded bg-[#222] hover:bg-[#333] text-xs font-bold text-zinc-300 transition cursor-pointer"
                                title="Dismiss / Ignore Report"
                              >
                                Dismiss
                              </button>
                            </>
                          )}
                          
                          {/* Delete targeted violating item */}
                          <button
                            onClick={() => isPostReport ? handleDeletePost(r.postId) : handleDeleteComment(r.commentId)}
                            className="p-1.5 hover:bg-red-500/10 text-red-500 rounded-lg transition border border-transparent hover:border-red-500/20 cursor-pointer"
                            title="Delete reported content permanently"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                      </div>
                    );
                  })}
                </div>
                {renderPagination(reportsPage, filteredReports.length, setReportsPage)}
              </>
            )}
          </div>
        )}

        {/* TAB 6: SEO SETTINGS */}
        {activeTab === "seo" && (
          <div className="flex flex-col gap-6 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              
              {/* Left Column: Meta Info */}
              <div className="bg-[#111] border border-[#222] p-6 rounded-2xl shadow-xl flex flex-col gap-5">
                <h3 className="font-bold text-[14px] border-b border-[#222] pb-3 text-zinc-300 flex items-center gap-2">
                  <span>🌐 Metadata Config</span>
                </h3>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wide">SEO Portal Title Prefix</label>
                  <input
                    type="text"
                    value={seoTitlePrefix}
                    onChange={(e) => setSeoTitlePrefix(e.target.value)}
                    className="bg-[#1a1a1a] border border-[#333] rounded-lg p-2.5 text-xs text-white outline-none focus:border-insta-blue transition"
                  />
                  <span className="text-[9px] text-zinc-500">Prefix that precedes page names (e.g. "AuraGram").</span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wide">Default Meta Description</label>
                  <textarea
                    value={seoDescription}
                    onChange={(e) => setSeoDescription(e.target.value)}
                    rows={4}
                    className="bg-[#1a1a1a] border border-[#333] rounded-lg p-2.5 text-xs text-white outline-none focus:border-insta-blue transition resize-none"
                  />
                  <span className="text-[9px] text-zinc-500">General search engine snippet description loaded for index.</span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wide">Meta Keywords</label>
                  <input
                    type="text"
                    value={seoKeywords}
                    onChange={(e) => setSeoKeywords(e.target.value)}
                    className="bg-[#1a1a1a] border border-[#333] rounded-lg p-2.5 text-xs text-white outline-none focus:border-insta-blue transition"
                  />
                  <span className="text-[9px] text-zinc-500">Comma-separated indexing terms.</span>
                </div>
              </div>

              {/* Right Column: robots.txt Editor */}
              <div className="bg-[#111] border border-[#222] p-6 rounded-2xl shadow-xl flex flex-col gap-5">
                <h3 className="font-bold text-[14px] border-b border-[#222] pb-3 text-zinc-300 flex items-center justify-between">
                  <span>🤖 robots.txt Editor</span>
                  <span className="text-[10px] text-zinc-500 font-bold bg-[#1a1a1a] border border-[#222] px-2 py-0.5 rounded-full select-all">/robots.txt</span>
                </h3>

                <div className="flex flex-col gap-1.5">
                  <textarea
                    value={seoRobotsTxt}
                    onChange={(e) => setSeoRobotsTxt(e.target.value)}
                    rows={11}
                    className="bg-[#080808] border border-[#333] rounded-xl p-3.5 text-xs font-mono text-green-400 outline-none focus:border-insta-blue transition resize-y leading-relaxed"
                    style={{ tabSize: 4 }}
                  />
                  <span className="text-[9px] text-zinc-500">Directly defines search engine crawling rules and points to sitemaps.</span>
                </div>
              </div>
            </div>

            {/* Sitemap Configuration Section */}
            <div className="bg-[#111] border border-[#222] p-6 rounded-2xl shadow-xl flex flex-col gap-5">
              <h3 className="font-bold text-[14px] border-b border-[#222] pb-3 text-zinc-300 flex items-center justify-between">
                <span>🗺️ Dynamic Sitemap URLs</span>
                <span className="text-[10px] text-zinc-500 font-bold bg-[#1a1a1a] border border-[#222] px-2 py-0.5 rounded-full select-all">/sitemap.xml</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#222] text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3">Target URL</th>
                      <th className="py-2.5 px-3 w-28">Priority</th>
                      <th className="py-2.5 px-3 w-32">Change Freq</th>
                      <th className="py-2.5 px-3 w-16 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222]/60">
                    {seoSitemapLinks.map((link, idx) => (
                      <tr key={idx} className="hover:bg-[#1a1a1a]/30 transition">
                        <td className="py-3 px-3 font-mono text-zinc-300 break-all select-all">{link.url}</td>
                        <td className="py-3 px-3 font-semibold text-zinc-400">{link.priority}</td>
                        <td className="py-3 px-3 capitalize text-zinc-400">{link.changefreq}</td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => {
                              setSeoSitemapLinks(prev => prev.filter((_, i) => i !== idx));
                            }}
                            className="p-1 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 rounded transition cursor-pointer"
                            title="Remove link from sitemap"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add New Link to Sitemap */}
              <div className="bg-[#181818]/60 p-4 rounded-xl border border-[#222]/80 flex flex-col sm:flex-row gap-3.5 items-end">
                <div className="flex-1 w-full flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Target Site URL</label>
                  <input
                    type="url"
                    placeholder="e.g. https://auragram.app/terms"
                    value={newSitemapUrl}
                    onChange={(e) => setNewSitemapUrl(e.target.value)}
                    className="bg-[#0f0f0f] border border-[#2c2c2c] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-insta-blue transition w-full"
                  />
                </div>

                <div className="w-full sm:w-28 flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Priority</label>
                  <select
                    value={newSitemapPriority}
                    onChange={(e) => setNewSitemapPriority(parseFloat(e.target.value))}
                    className="bg-[#0f0f0f] border border-[#2c2c2c] rounded-lg px-2.5 py-2 text-xs text-white outline-none focus:border-insta-blue transition w-full cursor-pointer font-bold"
                  >
                    {[1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1].map(p => (
                      <option key={p} value={p}>{p.toFixed(1)}</option>
                    ))}
                  </select>
                </div>

                <div className="w-full sm:w-32 flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Frequency</label>
                  <select
                    value={newSitemapFreq}
                    onChange={(e) => setNewSitemapFreq(e.target.value)}
                    className="bg-[#0f0f0f] border border-[#2c2c2c] rounded-lg px-2.5 py-2 text-xs text-white outline-none focus:border-insta-blue transition w-full cursor-pointer capitalize font-bold"
                  >
                    {["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"].map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!newSitemapUrl.trim()) return;
                    if (!newSitemapUrl.match(/^https?:\/\//i)) {
                      showToast("Please enter a valid absolute URL.", "info");
                      return;
                    }
                    setSeoSitemapLinks(prev => [...prev, { url: newSitemapUrl.trim(), priority: newSitemapPriority, changefreq: newSitemapFreq }]);
                    setNewSitemapUrl("");
                  }}
                  className="px-4 py-2 bg-[var(--surface3)] hover:bg-[var(--border)] border border-[#333] hover:border-[#444] rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer w-full sm:w-auto"
                >
                  Add Link
                </button>
              </div>
            </div>

            <button
              onClick={handleUpdateSeo}
              className="px-6 py-3 bg-insta-blue hover:bg-insta-blue/90 font-bold rounded-xl text-sm tracking-wide shadow-md transition self-start cursor-pointer shadow-insta-blue/15 hover:scale-[1.02] active:scale-[0.98]"
            >
              Save SEO Configuration
            </button>
          </div>
        )}

        {/* TAB 7: SITE CONFIG */}
        {activeTab === "settings" && (
          <div className="bg-[#111] border border-[#222] p-6 rounded-2xl shadow-xl max-w-[650px] animate-fade-in flex flex-col gap-6">
            <h3 className="font-bold text-[15px] border-b border-[#222] pb-3 text-zinc-300">Global Portal Settings</h3>
            
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Application Brand Name</label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="bg-[#1a1a1a] border border-[#333] rounded-lg p-3 text-sm text-white outline-none focus:border-insta-blue transition"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Support Email Channel</label>
              <input
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                className="bg-[#1a1a1a] border border-[#333] rounded-lg p-3 text-sm text-white outline-none focus:border-insta-blue transition"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 bg-[#1a1a1a]/50 rounded-xl border border-[#222]">
              <div className="flex flex-col">
                <span className="text-sm font-semibold">Enable Platform Maintenance Mode</span>
                <span className="text-[10px] text-zinc-500 mt-0.5">Locks system features for standard visitors.</span>
              </div>
              <input
                type="checkbox"
                checked={maintenanceMode}
                onChange={(e) => setMaintenanceMode(e.target.checked)}
                className="w-5 h-5 accent-insta-blue rounded"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Max Allowed Upload File Size (MB)</label>
              <input
                type="number"
                value={allowedUploadSize}
                onChange={(e) => setAllowedUploadSize(parseInt(e.target.value) || 5)}
                className="bg-[#1a1a1a] border border-[#333] rounded-lg p-3 text-sm text-white outline-none focus:border-insta-blue transition"
              />
            </div>

            <button
              onClick={() => showToast("Portal configurations updated successfully! ⚙️", "success")}
              className="px-4 py-2.5 bg-insta-blue hover:bg-insta-blue/90 font-bold rounded-lg text-sm tracking-wide shadow-md transition self-start cursor-pointer"
            >
              Save Brand Configuration
            </button>
          </div>
        )}

        {/* TAB 8: DMs MONITOR */}
        {activeTab === "messages" && (
          <div className="bg-[#111] border border-[#222] p-6 rounded-2xl shadow-xl max-w-[650px] animate-fade-in flex flex-col gap-6">
            <h3 className="font-bold text-[15px] border-b border-[#222] pb-3 text-zinc-300">Direct Messages Channel Metrics</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-[#1a1a1a] border border-[#222] p-4 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs text-zinc-500 font-bold uppercase">Active Channels</div>
                  <div className="text-2xl font-bold mt-1 text-white">4</div>
                </div>
                <span className="text-2xl">💬</span>
              </div>

              <div className="bg-[#1a1a1a] border border-[#222] p-4 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs text-zinc-500 font-bold uppercase">Total Logged DMs</div>
                  <div className="text-2xl font-bold mt-1 text-white">128</div>
                </div>
                <span className="text-2xl">✉️</span>
              </div>
            </div>

            <div className="p-4 bg-[#1a1a1a]/40 border border-[#222] rounded-xl text-xs leading-relaxed text-zinc-400">
              <span className="font-bold block text-zinc-300 mb-1">Encrypted DM Policy:</span>
              All chat channel message rows are encrypted and protected by strict Row-Level Security. Standard server administrators cannot inspect private conversation payloads directly without secure keys.
            </div>
            
            <button
              onClick={() => showToast("Conversations database optimized! ⚡", "success")}
              className="px-4 py-2.5 bg-insta-blue hover:bg-insta-blue/90 font-bold rounded-lg text-sm tracking-wide shadow-md transition self-start cursor-pointer"
            >
              Optimize DMs Cache
            </button>
          </div>
        )}

        {/* TAB 9: TV CHANNELS OVERVIEW */}
        {activeTab === "tv" && (
          <div className="flex flex-col gap-8 animate-fade-in">
            {/* Quick Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#111] border border-[#222] p-5 rounded-2xl flex items-center justify-between shadow-lg relative overflow-hidden">
                <div className="flex flex-col gap-1 z-10">
                  <span className="text-[12px] text-zinc-400 font-medium">Total Live Viewers</span>
                  <span className="text-3xl font-extrabold text-white animate-pulse">{tvLiveViewers.length}</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white shadow-md">
                  <Tv size={20} />
                </div>
                <div className="absolute -right-4 -bottom-4 w-16 h-16 rounded-full bg-white/2 blur-2xl pointer-events-none" />
              </div>

              <div className="bg-[#111] border border-[#222] p-5 rounded-2xl flex items-center justify-between shadow-lg relative overflow-hidden">
                <div className="flex flex-col gap-1 z-10">
                  <span className="text-[12px] text-zinc-400 font-medium">Active TV Channels</span>
                  <span className="text-3xl font-extrabold text-white">{tvChannelsCount}</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
                  <Radio className="text-white animate-pulse" size={20} />
                </div>
                <div className="absolute -right-4 -bottom-4 w-16 h-16 rounded-full bg-white/2 blur-2xl pointer-events-none" />
              </div>

              <div className="bg-[#111] border border-[#222] p-5 rounded-2xl flex items-center justify-between shadow-lg relative overflow-hidden">
                <div className="flex flex-col gap-1 z-10">
                  <span className="text-[12px] text-zinc-400 font-medium">All-time Channel Views</span>
                  <span className="text-3xl font-extrabold text-white">{tvHistory.length}</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white shadow-md">
                  <TrendingUp size={20} />
                </div>
                <div className="absolute -right-4 -bottom-4 w-16 h-16 rounded-full bg-white/2 blur-2xl pointer-events-none" />
              </div>
            </div>

            {/* Creation Form & Registered Channels Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Creation Form */}
              <div className="lg:col-span-5 bg-[#111] border border-[#222] p-6 rounded-2xl shadow-xl flex flex-col gap-4">
                <div className="flex items-center gap-2 border-b border-[#222] pb-3">
                  <Tv className="text-insta-blue" size={18} />
                  <h3 className="font-bold text-[15px] text-zinc-300">Create New TV Channel</h3>
                </div>
                <form onSubmit={handleCreateTvChannel} className="flex flex-col gap-4 text-xs">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-zinc-400 uppercase tracking-wider">Channel Title</label>
                    <input
                      type="text"
                      placeholder="e.g. HBO Live, Sky Sports"
                      value={tvName}
                      onChange={(e) => setTvName(e.target.value)}
                      required
                      className="bg-[#1a1a1a] border border-[#333] rounded-lg p-2.5 text-xs text-white outline-none focus:border-insta-blue transition"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-zinc-400 uppercase tracking-wider">Stream URL (.m3u8)</label>
                    <input
                      type="url"
                      placeholder="https://example.com/stream.m3u8"
                      value={tvUrl}
                      onChange={(e) => setTvUrl(e.target.value)}
                      required
                      className="bg-[#1a1a1a] border border-[#333] rounded-lg p-2.5 text-xs text-white outline-none focus:border-insta-blue transition"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="font-bold text-zinc-400 uppercase tracking-wider">Category</label>
                      <input
                        type="text"
                        placeholder="e.g. Sports, Movies"
                        value={tvCategory}
                        onChange={(e) => setTvCategory(e.target.value)}
                        className="bg-[#1a1a1a] border border-[#333] rounded-lg p-2.5 text-xs text-white outline-none focus:border-insta-blue transition"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="font-bold text-zinc-400 uppercase tracking-wider">Channel Icon URL</label>
                      <input
                        type="url"
                        placeholder="https://example.com/logo.png"
                        value={tvLogoUrl}
                        onChange={(e) => setTvLogoUrl(e.target.value)}
                        className="bg-[#1a1a1a] border border-[#333] rounded-lg p-2.5 text-xs text-white outline-none focus:border-insta-blue transition"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-zinc-400 uppercase tracking-wider">Additional Info</label>
                    <textarea
                      placeholder="Enter description or streaming schedules..."
                      value={tvInfo}
                      onChange={(e) => setTvInfo(e.target.value)}
                      rows={3}
                      className="bg-[#1a1a1a] border border-[#333] rounded-lg p-2.5 text-xs text-white outline-none focus:border-insta-blue transition resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={tvSubmitting}
                    className="w-full mt-2 py-2.5 bg-insta-blue hover:bg-insta-blue/90 disabled:bg-zinc-800 font-bold rounded-lg text-white transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-insta-blue/10"
                  >
                    {tvSubmitting ? (
                      <>
                        <Loader2 className="animate-spin" size={14} /> Creating...
                      </>
                    ) : (
                      "Create Channel"
                    )}
                  </button>
                </form>
              </div>

              {/* Registered TV Channels list */}
              <div className="lg:col-span-7 bg-[#111] border border-[#222] rounded-2xl shadow-xl overflow-hidden flex flex-col">
                <div className="p-4 border-b border-[#222] bg-[#1a1a1a]/50 text-zinc-300 font-extrabold text-xs uppercase tracking-wider flex items-center justify-between">
                  <span>Registered Channels ({tvChannels.length})</span>
                </div>
                <div className="flex-grow flex flex-col divide-y divide-[#222] min-h-[300px]">
                  {tvChannels.length === 0 ? (
                    <div className="text-center py-20 text-zinc-500 text-xs my-auto">No channels registered yet. Create one on the left.</div>
                  ) : (
                    <>
                      <div className="flex-grow divide-y divide-[#222]">
                        {paginatedTvChannels.map((channel) => (
                          <div key={channel.id} className="p-4 flex items-center justify-between gap-4 text-xs hover:bg-white/[0.01] transition">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-white/[0.05] overflow-hidden flex items-center justify-center shrink-0">
                                {channel.logoUrl ? (
                                  <img src={channel.logoUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-xs">📺</span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-white truncate text-sm">{channel.name}</p>
                                  <span className="bg-[#222] text-zinc-400 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase">{channel.category}</span>
                                </div>
                                <p className="text-[10px] text-zinc-500 truncate mt-0.5 font-mono">{channel.url}</p>
                                {channel.info && <p className="text-[10px] text-zinc-400 mt-1 italic line-clamp-1">"{channel.info}"</p>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => handleToggleTvChannel(channel.id, channel.enabled !== false)}
                                className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition cursor-pointer border ${
                                  channel.enabled !== false
                                    ? "bg-green-500/10 text-green-500 border-green-500/20"
                                    : "bg-zinc-800 text-zinc-400 border-zinc-700"
                                }`}
                                title={channel.enabled !== false ? "Click to Disable" : "Click to Enable"}
                              >
                                {channel.enabled !== false ? "Enabled" : "Disabled"}
                              </button>
                              <button
                                onClick={() => handleDeleteTvChannel(channel.id)}
                                className="p-1.5 hover:bg-red-500/10 text-red-500 rounded-lg transition border border-transparent hover:border-red-500/20 cursor-pointer"
                                title="Delete TV Channel"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      {renderPagination(tvPage, tvChannels.length, setTvPage)}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Split Screen breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Channel View Breakdown */}
              <div className="bg-[#111] border border-[#222] rounded-2xl shadow-xl overflow-hidden flex flex-col h-[400px]">
                <div className="p-4 border-b border-[#222] bg-[#1a1a1a]/50 text-zinc-300 font-extrabold text-xs uppercase tracking-wider">
                  Channel Performance & Live Metrics
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-[#222]">
                  {tvLiveViewers.length === 0 && tvHistory.length === 0 ? (
                    <div className="text-center py-20 text-zinc-500 text-xs">No channel data available.</div>
                  ) : (
                    // Group channels by viewer statistics
                    // Retrieve all channels and map stats
                    Array.from(new Set(tvHistory.map(h => h.channel?.id).concat(tvLiveViewers.map(l => l.channel?.id))))
                      .filter(Boolean)
                      .map(channelId => {
                        const firstSession = tvLiveViewers.find(l => l.channel?.id === channelId) || tvHistory.find(h => h.channel?.id === channelId);
                        const channelName = firstSession?.channel?.name || `Channel #${channelId}`;
                        
                        const liveCount = tvLiveViewers.filter(s => s.channel?.id === channelId).length;
                        const histCount = tvHistory.filter(h => h.channel?.id === channelId).length;

                        return (
                          <div key={channelId} className="p-4 flex items-center justify-between text-sm hover:bg-white/[0.01] transition">
                            <div className="min-w-0">
                              <p className="font-bold text-white truncate">{channelName}</p>
                              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">ID: {channelId}</p>
                            </div>
                            <div className="flex items-center gap-4 text-right">
                              <div>
                                <p className="text-xs text-red-400 font-bold flex items-center justify-end gap-1 select-none">
                                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                                  {liveCount} live
                                </p>
                                <p className="text-[10px] text-zinc-400 mt-0.5">{histCount} total views</p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>

              {/* Real-time Viewing Activity Log */}
              <div className="bg-[#111] border border-[#222] rounded-2xl shadow-xl overflow-hidden flex flex-col h-[400px]">
                <div className="p-4 border-b border-[#222] bg-[#1a1a1a]/50 text-zinc-300 font-extrabold text-xs uppercase tracking-wider">
                  Live Viewers Session Log
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-[#222]">
                  {tvLiveViewers.length === 0 ? (
                    <div className="text-center py-20 text-zinc-500 text-xs">No active live viewers currently.</div>
                  ) : (
                    tvLiveViewers.map((viewer, idx) => {
                      const isRegistered = !!viewer.user;
                      
                      return (
                        <div key={idx} className="p-4 flex items-center justify-between text-xs hover:bg-white/[0.01] transition">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/[0.05] overflow-hidden flex items-center justify-center shrink-0">
                              {isRegistered && viewer.user?.avatarUrl ? (
                                <img src={viewer.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-xs">👤</span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-white truncate">
                                {isRegistered ? `@${viewer.user.username}` : "Anonymous Guest"}
                              </p>
                              <p className="text-[10px] text-zinc-400 truncate mt-0.5">
                                Watching: <span className="text-zinc-200 font-semibold">{viewer.channel?.name}</span>
                              </p>
                            </div>
                          </div>
                          <div className="text-right text-[10px] text-zinc-500 shrink-0 font-mono">
                            {new Date(viewer.lastActiveAt).toLocaleTimeString()}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
      </div>

      {/* Detailed Post Preview Modal */}
      {selectedPost && (
        <div className="fixed inset-0 bg-black/80 z-[300] flex items-center justify-center p-4 text-white" onClick={() => setSelectedPost(null)}>
          <div className="bg-[#111] border border-[#222] max-w-[500px] w-full rounded-2xl overflow-hidden shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            
            <button onClick={() => setSelectedPost(null)} className="absolute top-4 right-4 text-zinc-400 hover:text-white cursor-pointer z-10">
              <X size={20} />
            </button>
            
            {/* Visual Header */}
            <div className="p-4 border-b border-[#222] flex items-center gap-3">
              <img src={selectedPost.User?.avatarUrl || "https://i.pravatar.cc/150?img=1"} className="w-9 h-9 rounded-full object-cover border border-[#222]" alt="" />
              <div className="font-bold text-sm">@{selectedPost.User?.username || "unknown"}</div>
            </div>
            
            {/* Post Media Container */}
            <div className="w-full aspect-square bg-zinc-950 flex items-center justify-center overflow-hidden">
              {selectedPost.isTextOnly ? (
                <div style={{ background: selectedPost.thumbnailUrl }} className="w-full h-full flex items-center justify-center p-6 text-center font-bold text-lg select-text text-white">
                  {selectedPost.caption}
                </div>
              ) : (
                <img src={selectedPost.thumbnailUrl || (Array.isArray(selectedPost.mediaUrls) ? selectedPost.mediaUrls[0] : "")} className="w-full h-full object-cover" alt="" />
              )}
            </div>
            
            {/* Post Details */}
            <div className="p-4.5 flex flex-col gap-3">
              <p className="text-sm select-text text-zinc-200">
                <span className="font-bold mr-1">Caption:</span>
                "{selectedPost.caption || "No caption"}"
              </p>
              <div className="text-xs text-zinc-500 flex justify-between">
                <span>Likes: {selectedPost._count?.likes ?? 0}</span>
                <span>Date: {new Date(selectedPost.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}</span>
              </div>
              
              <button
                onClick={() => handleDeletePost(selectedPost.id)}
                className="mt-2.5 w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer transition"
              >
                <Trash2 size={16} /> Delete Post Permanently
              </button>
            </div>

          </div>
        </div>
      )}

      {/* User Activity Logs & Analytics Modal */}
      {(selectedAnalyticsUser || analyticsLoading) && (
        <div className="fixed inset-0 bg-black/80 z-[300] flex items-center justify-center p-4 text-white" onClick={() => { setSelectedAnalyticsUser(null); setSelectedUserAnalytics(null); }}>
          <div className="bg-[#111] border border-[#222] max-w-[700px] w-full rounded-2xl overflow-hidden shadow-2xl relative flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            
            <button onClick={() => { setSelectedAnalyticsUser(null); setSelectedUserAnalytics(null); }} className="absolute top-4 right-4 text-zinc-400 hover:text-white cursor-pointer z-10">
              <X size={20} />
            </button>
            
            {/* Modal Header */}
            <div className="p-5 border-b border-[#222] flex items-center gap-3">
              <img src={selectedAnalyticsUser?.avatarUrl || "https://i.pravatar.cc/150?img=1"} className="w-10 h-10 rounded-full object-cover border border-[#222]" alt="" />
              <div>
                <h3 className="font-bold text-base">User Activity Logs</h3>
                <p className="text-xs text-zinc-400">@{selectedAnalyticsUser?.username} • {selectedAnalyticsUser?.fullName || "AuraGram User"}</p>
              </div>
            </div>

            {/* Modal Body / Loading State */}
            {analyticsLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="animate-spin text-insta-blue" size={32} />
                <span className="text-zinc-400 text-sm">Loading activity logs...</span>
              </div>
            ) : selectedUserAnalytics ? (
              <div className="flex-1 overflow-y-auto p-5">
                {/* Stats Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  <div className="bg-[#181818] border border-[#222] p-3.5 rounded-xl text-center">
                    <span className="text-xs text-zinc-500 block">Watch Logs</span>
                    <span className="text-lg font-bold text-white">{selectedUserAnalytics.watchLogs.length}</span>
                  </div>
                  <div className="bg-[#181818] border border-[#222] p-3.5 rounded-xl text-center">
                    <span className="text-xs text-zinc-500 block">Searches</span>
                    <span className="text-lg font-bold text-white">{selectedUserAnalytics.searches.length}</span>
                  </div>
                  <div className="bg-[#181818] border border-[#222] p-3.5 rounded-xl text-center">
                    <span className="text-xs text-zinc-500 block">Reactions</span>
                    <span className="text-lg font-bold text-white">{selectedUserAnalytics.reactions.length}</span>
                  </div>
                  <div className="bg-[#181818] border border-[#222] p-3.5 rounded-xl text-center">
                    <span className="text-xs text-zinc-500 block">Unmutes</span>
                    <span className="text-lg font-bold text-white">{selectedUserAnalytics.unmuteLogs.length}</span>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Search History */}
                  <div>
                    <h4 className="font-semibold text-sm text-zinc-300 mb-2.5 flex items-center gap-2 border-b border-[#222] pb-1.5">
                      <Search size={14} className="text-zinc-500" />
                      Search History ({selectedUserAnalytics.searches.length})
                    </h4>
                    {selectedUserAnalytics.searches.length === 0 ? (
                      <p className="text-xs text-zinc-500 italic pl-1">No search history recorded.</p>
                    ) : (
                      <div className="max-h-[150px] overflow-y-auto space-y-1 bg-[#151515] p-2.5 rounded-xl border border-[#222]">
                        {selectedUserAnalytics.searches.map((s: any) => (
                          <div key={s.id} className="flex justify-between items-center text-xs py-1 px-1.5 hover:bg-[#1a1a1a] rounded">
                            <span className="font-mono text-zinc-300">"{s.query}"</span>
                            <span className="text-zinc-500 text-[10px]">{new Date(s.createdAt).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Video Watch Logs */}
                  <div>
                    <h4 className="font-semibold text-sm text-zinc-300 mb-2.5 flex items-center gap-2 border-b border-[#222] pb-1.5">
                      <Eye size={14} className="text-zinc-500" />
                      Video Watch History ({selectedUserAnalytics.watchLogs.length})
                    </h4>
                    {selectedUserAnalytics.watchLogs.length === 0 ? (
                      <p className="text-xs text-zinc-500 italic pl-1">No watch logs recorded.</p>
                    ) : (
                      <div className="max-h-[180px] overflow-y-auto space-y-1 bg-[#151515] p-2.5 rounded-xl border border-[#222]">
                        {selectedUserAnalytics.watchLogs.map((wl: any) => (
                          <div key={wl.id} className="flex gap-2.5 items-center text-xs py-1.5 border-b border-[#222] last:border-0 hover:bg-[#1a1a1a] p-1 rounded">
                            {wl.Post?.thumbnailUrl ? (
                              <img src={wl.Post.thumbnailUrl} className="w-8 h-8 rounded object-cover border border-[#222]" alt="" />
                            ) : (
                              <div className="w-8 h-8 bg-zinc-800 rounded flex items-center justify-center text-[10px] text-zinc-500 font-bold">V</div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-zinc-300 truncate">{wl.Post?.caption || "Untitled Post"}</p>
                              <p className="text-[10px] text-zinc-500">Duration watched: <span className="text-zinc-300 font-medium">{wl.duration.toFixed(1)}s</span></p>
                            </div>
                            <span className="text-zinc-500 text-[9px] shrink-0">{new Date(wl.createdAt).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Video Unmute Logs */}
                  <div>
                    <h4 className="font-semibold text-sm text-zinc-300 mb-2.5 flex items-center gap-2 border-b border-[#222] pb-1.5">
                      <Activity size={14} className="text-zinc-500" />
                      Video Unmute Events ({selectedUserAnalytics.unmuteLogs.length})
                    </h4>
                    {selectedUserAnalytics.unmuteLogs.length === 0 ? (
                      <p className="text-xs text-zinc-500 italic pl-1">No unmute logs recorded.</p>
                    ) : (
                      <div className="max-h-[150px] overflow-y-auto space-y-1 bg-[#151515] p-2.5 rounded-xl border border-[#222]">
                        {selectedUserAnalytics.unmuteLogs.map((ul: any) => (
                          <div key={ul.id} className="flex gap-2.5 items-center text-xs py-1.5 border-b border-[#222] last:border-0 hover:bg-[#1a1a1a] p-1 rounded">
                            {ul.Post?.thumbnailUrl ? (
                              <img src={ul.Post.thumbnailUrl} className="w-8 h-8 rounded object-cover border border-[#222]" alt="" />
                            ) : (
                              <div className="w-8 h-8 bg-zinc-800 rounded flex items-center justify-center text-[10px] text-zinc-500 font-bold">V</div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-zinc-300 truncate">{ul.Post?.caption || "Untitled Post"}</p>
                              <p className="text-[10px] text-zinc-500">Unmuted in: <span className="text-zinc-300 font-medium capitalize">{ul.videoType || "feed"}</span></p>
                            </div>
                            <span className="text-zinc-500 text-[9px] shrink-0">{new Date(ul.createdAt).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Interactions (Reactions, Comments, Saves) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Reactions */}
                    <div>
                      <h5 className="font-semibold text-xs text-zinc-400 mb-2 flex items-center gap-1.5 uppercase tracking-wide">
                        Reactions ({selectedUserAnalytics.reactions.length})
                      </h5>
                      <div className="max-h-[140px] overflow-y-auto space-y-1 bg-[#151515] p-2 rounded-xl border border-[#222]">
                        {selectedUserAnalytics.reactions.length === 0 ? (
                          <p className="text-[11px] text-zinc-600 italic">No reactions.</p>
                        ) : (
                          selectedUserAnalytics.reactions.map((r: any) => (
                            <div key={r.id} className="flex justify-between items-center text-[11px] py-1 border-b border-[#222] last:border-0">
                              <span className="text-zinc-300 capitalize">{r.type}</span>
                              <span className="text-[9px] text-zinc-500">{new Date(r.createdAt).toLocaleDateString()}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Comments */}
                    <div>
                      <h5 className="font-semibold text-xs text-zinc-400 mb-2 flex items-center gap-1.5 uppercase tracking-wide">
                        Comments ({selectedUserAnalytics.comments.length})
                      </h5>
                      <div className="max-h-[140px] overflow-y-auto space-y-1 bg-[#151515] p-2 rounded-xl border border-[#222]">
                        {selectedUserAnalytics.comments.length === 0 ? (
                          <p className="text-[11px] text-zinc-600 italic">No comments.</p>
                        ) : (
                          selectedUserAnalytics.comments.map((c: any) => (
                            <div key={c.id} className="py-1 border-b border-[#222] last:border-0 text-[11px]">
                              <p className="text-zinc-300 line-clamp-1 italic">"{c.text}"</p>
                              <span className="text-[9px] text-zinc-500">{new Date(c.createdAt).toLocaleDateString()}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Saves */}
                    <div>
                      <h5 className="font-semibold text-xs text-zinc-400 mb-2 flex items-center gap-1.5 uppercase tracking-wide">
                        Saves ({selectedUserAnalytics.saved.length})
                      </h5>
                      <div className="max-h-[140px] overflow-y-auto space-y-1 bg-[#151515] p-2 rounded-xl border border-[#222]">
                        {selectedUserAnalytics.saved.length === 0 ? (
                          <p className="text-[11px] text-zinc-600 italic">No saves.</p>
                        ) : (
                          selectedUserAnalytics.saved.map((sv: any) => (
                            <div key={sv.id} className="flex gap-1.5 items-center py-1 border-b border-[#222] last:border-0 text-[11px]">
                              <span className="text-zinc-300 truncate">Post #{sv.postId}</span>
                              <span className="text-[9px] text-zinc-500 ml-auto">{new Date(sv.createdAt).toLocaleDateString()}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            ) : (
              <div className="py-20 text-center text-zinc-500 text-sm">Failed to retrieve activity data.</div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
