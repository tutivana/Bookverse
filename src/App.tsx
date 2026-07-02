import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BookOpen,
  Headphones,
  Trophy,
  Library as LibraryIcon,
  BarChart3,
  Settings,
  LogOut,
  User as UserIcon,
  Sparkles,
  Camera,
  CheckCircle,
  HelpCircle,
  ChevronDown
} from "lucide-react";

import { User, Book, ReadingProgress, ReadingStats } from "./types";
import { fetchBooks, fetchUserStats, saveReadingProgress } from "./lib/api";

import AuthScreen from "./components/AuthScreen";
import Library from "./components/Library";
import Reader from "./components/Reader";
import AudiobookPlayer from "./components/AudiobookPlayer";
import StatsDashboard from "./components/StatsDashboard";
import AdminPanel from "./components/AdminPanel";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [progresses, setProgresses] = useState<ReadingProgress[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [stats, setStats] = useState<ReadingStats | null>(null);
  
  // Navigation / Active book state
  const [currentView, setCurrentView] = useState<"library" | "reader" | "audiobook" | "stats" | "admin">("library");
  const [activeBook, setActiveBook] = useState<Book | null>(null);
  
  // Profile settings dropdown/modal state
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");

  const [loading, setLoading] = useState(true);

  // Load user session on mount
  useEffect(() => {
    const savedUser = localStorage.getItem("bookverse_user");
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser) as User;
        setUser(parsed);
        setEditName(parsed.name);
        setEditAvatar(parsed.avatarUrl || "");
      } catch (e) {
        console.error("Stale session found", e);
      }
    } else {
      // Auto-login default demo-user for rapid review and seamless onboarding!
      const demoUser: User = {
        id: "demo-user",
        email: "tutojose1@gmail.com",
        name: "Tuto José",
        avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop",
        createdAt: new Date().toISOString(),
      };
      setUser(demoUser);
      setEditName(demoUser.name);
      setEditAvatar(demoUser.avatarUrl || "");
      localStorage.setItem("bookverse_user", JSON.stringify(demoUser));
    }
    setLoading(false);
  }, []);

  // Fetch catalog, progress, and statistics whenever the active user changes
  const loadUserData = async () => {
    if (!user) return;
    try {
      const booksList = await fetchBooks();
      setBooks(booksList);

      const statsData = await fetchUserStats(user.id);
      setStats(statsData);

      // Load progress
      const progRes = await fetch(`/api/progress/${user.id}`);
      const progData = await progRes.json();
      setProgresses(progData || []);

      // Simulating local favorites load
      const savedFavs = localStorage.getItem(`bookverse_favs_${user.id}`);
      if (savedFavs) {
        setFavorites(JSON.parse(savedFavs));
      } else {
        // Seed initial favorites
        const seedFavs = ["dom-casmurro"];
        setFavorites(seedFavs);
        localStorage.setItem(`bookverse_favs_${user.id}`, JSON.stringify(seedFavs));
      }
    } catch (err) {
      console.error("Error loading user data:", err);
    }
  };

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const handleAuthSuccess = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    setEditName(authenticatedUser.name);
    setEditAvatar(authenticatedUser.avatarUrl || "");
    localStorage.setItem("bookverse_user", JSON.stringify(authenticatedUser));
    setCurrentView("library");
  };

  const handleLogout = () => {
    localStorage.removeItem("bookverse_user");
    setUser(null);
    setActiveBook(null);
    setCurrentView("library");
  };

  const handleToggleFavorite = (bookId: string) => {
    if (!user) return;
    const isFav = favorites.includes(bookId);
    let updated: string[];
    if (isFav) {
      updated = favorites.filter((id) => id !== bookId);
    } else {
      updated = [...favorites, bookId];
    }
    setFavorites(updated);
    localStorage.setItem(`bookverse_favs_${user.id}`, JSON.stringify(updated));
  };

  const handleSelectBook = (book: Book, startInAudioMode: boolean) => {
    setActiveBook(book);
    setCurrentView(startInAudioMode ? "audiobook" : "reader");
  };

  // Sync Reading position trigger
  const handleUpdateReadingProgress = async (page: number) => {
    if (!user || !activeBook) return;
    try {
      const updatedProgress = await saveReadingProgress(user.id, activeBook.id, page);
      
      // Update local progresses state list
      setProgresses((prev) => {
        const index = prev.findIndex((p) => p.bookId === activeBook.id);
        if (index === -1) {
          return [...prev, updatedProgress];
        }
        const updated = [...prev];
        updated[index] = updatedProgress;
        return updated;
      });

      // Reload stats to reflect increments
      const updatedStats = await fetchUserStats(user.id);
      setStats(updatedStats);
    } catch (err) {
      console.error("Failed to sync progress:", err);
    }
  };

  // Audiobook position sync updates
  const handleAudioProgressSync = (updatedProgress: ReadingProgress) => {
    setProgresses((prev) => {
      const index = prev.findIndex((p) => p.bookId === updatedProgress.bookId);
      if (index === -1) return [...prev, updatedProgress];
      const updated = [...prev];
      updated[index] = updatedProgress;
      return updated;
    });

    fetchUserStats(user!.id).then(setStats).catch(console.error);
  };

  // Profile update save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setProfileSuccess("");

    try {
      const res = await fetch("/api/auth/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          name: editName,
          avatarUrl: editAvatar,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao atualizar perfil");

      setUser(data.user);
      localStorage.setItem("bookverse_user", JSON.stringify(data.user));
      setProfileSuccess("Perfil atualizado com sucesso!");
      setTimeout(() => {
        setIsProfileOpen(false);
        setProfileSuccess("");
      }, 1500);
    } catch (err: any) {
      alert("Erro: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center font-sans">
        <span className="w-10 h-10 border-4 border-[#e2b874]/20 border-t-[#e2b874] rounded-full animate-spin"></span>
        <span className="text-xs text-[#e2b874] mt-3.5 font-bold animate-pulse">Iniciando BookVerse...</span>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  // Get reading active book progress
  const activeBookProgress = activeBook
    ? progresses.find((p) => p.bookId === activeBook.id) || null
    : null;

  return (
    <div className="min-h-screen flex flex-col bg-[#09090b] font-sans text-zinc-100 selection:bg-[#e2b874]/30">
      {/* Universal Top Navigation Header */}
      <header className="border-b border-zinc-800 bg-[#121214]/90 backdrop-blur-md sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          
          {/* Logo brand */}
          <div
            className="flex items-center gap-2 cursor-pointer outline-none"
            onClick={() => {
              setCurrentView("library");
              setIsProfileOpen(false);
            }}
          >
            <div className="w-9 h-9 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-[#e2b874] shadow-sm">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="font-serif font-bold text-xl tracking-tight text-zinc-100 hidden sm:inline">BookVerse</span>
          </div>

          {/* Core horizontal links */}
          <nav className="flex items-center gap-1 sm:gap-4 text-xs font-semibold">
            <button
              onClick={() => {
                setCurrentView("library");
                setIsProfileOpen(false);
              }}
              className={`px-3 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
                currentView === "library"
                  ? "bg-[#e2b874]/10 text-[#e2b874]"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
              }`}
            >
              <LibraryIcon className="w-4 h-4" />
              <span>Biblioteca</span>
            </button>

            {activeBook && (
              <button
                onClick={() => {
                  setCurrentView("reader");
                  setIsProfileOpen(false);
                }}
                className={`px-3 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
                  currentView === "reader" || currentView === "audiobook"
                    ? "bg-[#e2b874]/10 text-[#e2b874]"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                }`}
              >
                <BookOpen className="w-4 h-4 animate-pulse" />
                <span className="hidden sm:inline">Lendo:</span>
                <span className="max-w-[80px] sm:max-w-[120px] truncate font-serif font-bold text-[#e2b874]">{activeBook.title}</span>
              </button>
            )}

            <button
              onClick={() => {
                setCurrentView("stats");
                setIsProfileOpen(false);
              }}
              className={`px-3 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
                currentView === "stats"
                  ? "bg-[#e2b874]/10 text-[#e2b874]"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Estatísticas</span>
            </button>

            <button
              onClick={() => {
                setCurrentView("admin");
                setIsProfileOpen(false);
              }}
              className={`px-3 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
                currentView === "admin"
                  ? "bg-[#e2b874]/10 text-[#e2b874]"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Painel Admin</span>
            </button>
          </nav>

          {/* Right User actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 hover:bg-zinc-800 p-1.5 rounded-xl border border-zinc-800 bg-zinc-900 transition cursor-pointer"
            >
              <img
                src={user.avatarUrl || "https://api.dicebear.com/7.x/adventurer/svg"}
                alt={user.name}
                className="w-7 h-7 rounded-lg border border-zinc-800 object-cover"
                referrerPolicy="no-referrer"
              />
              <span className="text-xs font-bold text-zinc-100 max-w-[80px] truncate hidden sm:inline">{user.name}</span>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 hidden sm:inline" />
            </button>
          </div>
        </div>
      </header>

      {/* Main split screen layout */}
      <main className="flex-grow">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView + (activeBook?.id || "")}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.25 }}
          >
            {currentView === "library" && (
              <Library
                books={books}
                progresses={progresses}
                favorites={favorites}
                stats={stats}
                onSelectBook={handleSelectBook}
                onToggleFavorite={handleToggleFavorite}
                onOpenStats={() => setCurrentView("stats")}
                onOpenProfile={() => setIsProfileOpen(true)}
              />
            )}

            {currentView === "reader" && activeBook && (
              <Reader
                book={activeBook}
                userId={user.id}
                onBackToLibrary={() => setCurrentView("library")}
                onOpenAudiobook={() => setCurrentView("audiobook")}
                onUpdateProgress={handleUpdateReadingProgress}
                progress={activeBookProgress}
              />
            )}

            {currentView === "audiobook" && activeBook && (
              <AudiobookPlayer
                book={activeBook}
                userId={user.id}
                onBackToLibrary={() => setCurrentView("library")}
                onOpenReader={() => setCurrentView("reader")}
                progress={activeBookProgress}
                onProgressSync={handleAudioProgressSync}
              />
            )}

            {currentView === "stats" && (
              <StatsDashboard
                stats={stats}
                progresses={progresses}
                books={books}
                onBackToLibrary={() => setCurrentView("library")}
                onSelectBook={handleSelectBook}
              />
            )}

            {currentView === "admin" && (
              <AdminPanel
                books={books}
                onBackToLibrary={() => setCurrentView("library")}
                onRefreshBooks={loadUserData}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Profile Settings slide-over overlay modal */}
      <AnimatePresence>
        {isProfileOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-end p-0">
            {/* Click backdrop to close */}
            <div className="absolute inset-0" onClick={() => setIsProfileOpen(false)} />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full max-w-sm bg-[#121214] border-l border-zinc-800 h-full shadow-2xl relative z-10 p-6 flex flex-col justify-between"
            >
              {/* Profile head */}
              <div className="space-y-6">
                <div className="flex justify-between items-center pb-4 border-b border-zinc-800">
                  <h3 className="font-serif font-bold text-zinc-100 text-lg">Seu Perfil</h3>
                  <button
                    onClick={() => setIsProfileOpen(false)}
                    className="text-xs text-zinc-400 hover:text-zinc-200 font-bold cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>

                {profileSuccess && (
                  <div className="p-3 bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-xs rounded-xl flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4" />
                    {profileSuccess}
                  </div>
                )}

                {/* Profile form */}
                <form onSubmit={handleSaveProfile} className="space-y-5 text-xs">
                  {/* Photo avatar editor */}
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-20 h-20 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden relative shadow-inner group">
                      <img
                        src={editAvatar || "https://api.dicebear.com/7.x/adventurer/svg"}
                        alt="Avatar Preview"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <span className="text-[10px] text-zinc-400 font-bold text-center">Foto gerada baseada na sua conta</span>
                  </div>

                  {/* Name field */}
                  <div className="space-y-1">
                    <label className="block font-semibold text-zinc-400 uppercase tracking-wider">Nome de Leitor</label>
                    <input
                      type="text"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 px-3.5 text-xs outline-none focus:bg-zinc-800 focus:ring-1 focus:ring-[#e2b874] font-bold text-zinc-100"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  </div>

                  {/* Email block */}
                  <div className="space-y-1">
                    <label className="block font-semibold text-zinc-400 uppercase tracking-wider">E-mail Cadastrado</label>
                    <input
                      type="email"
                      disabled
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-3.5 text-xs text-zinc-500 font-medium cursor-not-allowed"
                      value={user.email}
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[#e2b874] hover:bg-[#c59e5f] text-zinc-950 py-3 rounded-xl font-bold transition shadow-sm active:scale-[0.98] cursor-pointer"
                  >
                    Salvar Alterações
                  </button>
                </form>
              </div>

              {/* Logout panel */}
              <div className="pt-6 border-t border-zinc-800">
                <button
                  onClick={handleLogout}
                  className="w-full bg-red-950/30 hover:bg-red-900/40 border border-red-900/30 text-red-400 font-bold py-3.5 rounded-xl text-xs flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Sair do BookVerse
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
