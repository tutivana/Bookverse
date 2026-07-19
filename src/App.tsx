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
  ChevronDown,
  Bell,
  BellOff
} from "lucide-react";

import { User, Book, ReadingProgress, ReadingStats, BookNotification } from "./types";
import { fetchBooks, fetchUserStats, saveReadingProgress, fetchNotifications, markNotificationsAsRead, updateUserProfile } from "./lib/api";
import { isUserPremium } from "./lib/subscription";
import { AdManagerProvider } from "./components/AdManager";

import AuthScreen from "./components/AuthScreen";
import Library from "./components/Library";
import LandingPage from "./components/LandingPage";
import BookDetailModal from "./components/BookDetailModal";
import Reader from "./components/Reader";
import AudiobookPlayer from "./components/AudiobookPlayer";
import StatsDashboard from "./components/StatsDashboard";
import AdminPanel from "./components/AdminPanel";
import UnavailableBookScreen from "./components/UnavailableBookScreen";
import UserProfile from "./components/UserProfile";
import NotificationCenter from "./components/NotificationCenter";
import PremiumPaywallModal from "./components/PremiumPaywallModal";

export function getInitialsAvatarSvg(name: string): string {
  const firstLetter = (name || "U").charAt(0).toUpperCase();
  const charCode = firstLetter.charCodeAt(0) || 65;
  const colors = [
    { bg: "#1e3a8a", text: "#bfdbfe" }, // Blue
    { bg: "#14532d", text: "#bbf7d0" }, // Green
    { bg: "#7c2d12", text: "#ffedd5" }, // Orange/Red
    { bg: "#4c1d95", text: "#ddd6fe" }, // Purple
    { bg: "#312e81", text: "#c7d2fe" }, // Indigo
    { bg: "#581c87", text: "#f3e8ff" }, // Fuchsia
    { bg: "#831843", text: "#fce7f3" }, // Pink
    { bg: "#1e293b", text: "#cbd5e1" }, // Slate
  ];
  const color = colors[charCode % colors.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <rect width="100" height="100" fill="${color.bg}" />
    <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="'Inter', system-ui, sans-serif" font-size="50" font-weight="bold" fill="${color.text}">${firstLetter}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [books, setBooks] = useState<Book[]>([]);
  const [progresses, setProgresses] = useState<ReadingProgress[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [stats, setStats] = useState<ReadingStats | null>(null);
  
  // Notifications state
  const [notifications, setNotifications] = useState<BookNotification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  
  // Navigation / Active book state
  const [currentView, setCurrentView] = useState<"landing" | "auth" | "library" | "reader" | "audiobook" | "stats" | "admin" | "profile">("landing");
  const [activeBook, setActiveBook] = useState<Book | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [selectedGuestBook, setSelectedGuestBook] = useState<Book | null>(null);

  // Check if a book is available to read
  const isBookAvailable = (book: Book | null): boolean => {
    if (!book) return false;
    
    // First verify admin review status
    if (book.status && book.status !== "Active") {
      return false;
    }

    // Check copyright status and apply access control rules
    const copyright = book.copyright || { status: "commercial", licenseType: "purchase_required" };
    
    // 1. If public domain, allow access
    if (copyright.status === "public_domain") {
      return true;
    }
    
    // 2. If licensed, allow access according to standard platform rules (e.g. standard content access)
    if (copyright.status === "licensed") {
      return true;
    }

    // 3. Otherwise (commercial, exclusive), block standard readers. Admins/Super Admins can bypass to preview content.
    if (user && (user.role === "Super Administrador" || user.role === "Administrador")) {
      return true;
    }

    return false;
  };

  // Poll notifications
  useEffect(() => {
    if (!user) return;
    const loadNotifs = async () => {
      try {
        const notifList = await fetchNotifications(user.id);
        setNotifications(notifList || []);
      } catch (e: any) {
        const isNetworkErr = e && (e.name === "TypeError" || e.message?.includes("fetch") || e.message?.includes("NetworkError") || e.message?.includes("Failed to fetch"));
        if (isNetworkErr) {
          console.warn("Transient network connection warning when fetching notifications:", e.message || e);
        } else {
          console.error("Error loading notifications:", e);
        }
      }
    };
    loadNotifs();
    const interval = setInterval(loadNotifs, 5000);
    return () => clearInterval(interval);
  }, [user]);
  
  // Browser Reading Reminder Scheduler
  useEffect(() => {
    if (!user || !user.preferences?.readingReminderEnabled || !user.preferences?.readingReminderTime) {
      return;
    }

    const checkReminder = () => {
      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`;
      const reminderTime = user.preferences?.readingReminderTime; // "HH:MM"

      if (currentTimeStr === reminderTime) {
        const todayStr = now.toISOString().split('T')[0]; // "YYYY-MM-DD"
        const lastNotified = localStorage.getItem(`last_reading_reminder_notified_${user.id}`);

        if (lastNotified !== todayStr) {
          if ("Notification" in window) {
            if (Notification.permission === "granted") {
              new Notification("Hora da Leitura! 📚", {
                body: "Está na hora de manter sua meta diária de leitura no BookVerse. Abra o app e leia seu livro favorito!",
                icon: "/favicon.ico"
              });
              localStorage.setItem(`last_reading_reminder_notified_${user.id}`, todayStr);
            } else if (Notification.permission === "default") {
              Notification.requestPermission().then((permission) => {
                if (permission === "granted") {
                  new Notification("Hora da Leitura! 📚", {
                    body: "Está na hora de manter sua meta diária de leitura no BookVerse. Abra o app e leia seu livro favorito!",
                    icon: "/favicon.ico"
                  });
                  localStorage.setItem(`last_reading_reminder_notified_${user.id}`, todayStr);
                }
              });
            }
          }
        }
      }
    };

    // Check every 30 seconds
    const intervalId = setInterval(checkReminder, 30000);
    
    // Also run immediately
    checkReminder();

    return () => clearInterval(intervalId);
  }, [user, user?.preferences?.readingReminderEnabled, user?.preferences?.readingReminderTime]);

  // Support deep linking to books on mount
  useEffect(() => {
    if (!loading && books.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const bookId = params.get("bookId") || params.get("book") || window.location.hash.replace("#", "");
      if (bookId) {
        const found = books.find(b => b.id === bookId);
        if (found) {
          setActiveBook(found);
          setCurrentView("reader");
        }
      }
    }
  }, [books, loading]);

  // Support Service Workers registration and automatic sync upon reconnection
  useEffect(() => {
    // 1. Register Service Worker
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      const registerSW = () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            console.log("[BookVerse SW] Registrado com sucesso no escopo:", reg.scope);
          })
          .catch((err) => {
            console.error("[BookVerse SW] Falha ao registrar Service Worker:", err);
          });
      };

      if (document.readyState === "complete") {
        registerSW();
      } else {
        window.addEventListener("load", registerSW);
        return () => window.removeEventListener("load", registerSW);
      }
    }
  }, []);

  // Support automatic sync upon reconnection
  useEffect(() => {
    // 2. Auto-sync function
    const triggerAutoSync = async () => {
      if (!user || !user.id) return;
      console.log("[BookVerse SW] Conexão restaurada! Iniciando sincronização automática...");
      try {
        const { 
          getPendingProgressList, 
          getPendingReviewsList, 
          deletePendingProgress, 
          deletePendingReview 
        } = await import("./lib/offlineStore");
        const { saveReadingProgress, submitReview } = await import("./lib/api");

        // Sync pending progress
        const pProgress = await getPendingProgressList();
        let progressSyncedCount = 0;
        for (const progress of pProgress) {
          if (progress.userId === user.id) {
            await saveReadingProgress(
              progress.userId,
              progress.bookId,
              progress.lastPage,
              progress.audioPositionSeconds
            );
            await deletePendingProgress(progress.bookId);
            progressSyncedCount++;
          }
        }

        // Sync pending reviews
        const pReviews = await getPendingReviewsList();
        let reviewsSyncedCount = 0;
        for (const r of pReviews) {
          if (r.userId === user.id) {
            await submitReview(r.userId, r.bookId, r.rating, r.comment);
            await deletePendingReview(r.id);
            reviewsSyncedCount++;
          }
        }

        // Bidirectional sync for favorites, bookmarks, notes, and reading progresses
        const { syncUserData } = await import("./lib/syncEngine");
        await syncUserData(user.id, favorites, (updatedFavs) => {
          setFavorites(updatedFavs);
        });

        if (progressSyncedCount > 0 || reviewsSyncedCount > 0) {
          console.log(`[BookVerse SW] Sincronização automática concluída: ${progressSyncedCount} progressos e ${reviewsSyncedCount} comentários.`);
          loadUserData();
        } else {
          loadUserData();
        }
      } catch (err) {
        console.error("[BookVerse SW] Falha durante sincronização automática:", err);
      }
    };

    window.addEventListener("online", triggerAutoSync);

    // Initial check if we are online on mount
    if (navigator.onLine && user && user.id) {
      triggerAutoSync();
    }

    return () => {
      window.removeEventListener("online", triggerAutoSync);
    };
  }, [user]);

  const handleMarkNotifsRead = async () => {
    if (!user) return;
    try {
      await markNotificationsAsRead(user.id);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error("Failed to mark notifications as read:", err);
    }
  };
  
  // Profile settings dropdown/modal state
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [isAdminPortal, setIsAdminPortal] = useState(false);

  // Paywall Modal state
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallReason, setPaywallReason] = useState<"audiobook" | "offline" | "premium_book" | "stats" | "highlights" | "generic">("generic");
  const [paywallInterval, setPaywallInterval] = useState<"monthly" | "yearly">("monthly");

  const triggerPaywall = (
    reason: "audiobook" | "offline" | "premium_book" | "stats" | "highlights" | "generic",
    interval: "monthly" | "yearly" = "monthly"
  ) => {
    setPaywallReason(reason);
    setPaywallInterval(interval);
    setPaywallOpen(true);
  };

  // Load user session on mount
  useEffect(() => {
    const path = window.location.pathname;
    const isParamAdmin = path === "/admin" || window.location.hash === "#admin" || window.location.hash === "#/admin";
    setIsAdminPortal(isParamAdmin);

    const savedUser = localStorage.getItem("bookverse_user");
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser) as User;
        setUser(parsed);
        setEditName(parsed.name);
        setEditAvatar(parsed.avatarUrl || "");
        
        if (isParamAdmin) {
          const isAuthorized = parsed.role === "Super Administrador" || parsed.role === "Administrador";
          if (isAuthorized) {
            setCurrentView("admin");
          } else {
            setCurrentView("library");
          }
        } else {
          setCurrentView("library");
        }
      } catch (e) {
        console.error("Stale session found", e);
        setCurrentView(isParamAdmin ? "auth" : "landing");
      }
    } else {
      setUser(null);
      setCurrentView(isParamAdmin ? "auth" : "landing");
    }
    setLoading(false);
  }, []);

  // Middleware de proteção para a tela Admin
  useEffect(() => {
    if (currentView === "admin") {
      const isAuthorized = user && (user.role === "Super Administrador" || user.role === "Administrador");
      if (!isAuthorized) {
        setCurrentView("library");
      }
    }
  }, [currentView, user]);

  // Listener para monitorar mudanças de hash (útil no mobile)
  useEffect(() => {
    const handleHashChange = () => {
      const isParamAdmin = window.location.hash === "#admin" || window.location.hash === "#/admin";
      if (isParamAdmin) {
        setIsAdminPortal(true);
        if (user) {
          const isAuthorized = user.role === "Super Administrador" || user.role === "Administrador";
          if (isAuthorized) {
            setCurrentView("admin");
          } else {
            setCurrentView("library");
          }
        } else {
          setCurrentView("auth");
        }
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [user]);

  // Fetch catalog, progress, and statistics whenever the active user changes
  const loadUserData = async () => {
    try {
      const booksList = await fetchBooks();
      setBooks(booksList || []);

      if (!user || !user.id || user.id === "undefined" || user.id === "null") {
        setProgresses([]);
        setFavorites([]);
        setStats(null);
        return;
      }

      const statsData = await fetchUserStats(user.id);
      setStats(statsData);

      // Load progress
      const progRes = await fetch(`/api/progress/${user.id}`);
      const progData = await progRes.json();
      setProgresses(progData || []);

      // Load favorites from user profile, falling back to localStorage or seed
      if (user.favorites && Array.isArray(user.favorites)) {
        setFavorites(user.favorites);
        localStorage.setItem(`bookverse_favs_${user.id}`, JSON.stringify(user.favorites));
      } else {
        const savedFavs = localStorage.getItem(`bookverse_favs_${user.id}`);
        if (savedFavs) {
          const parsed = JSON.parse(savedFavs);
          setFavorites(parsed);
          // Sync with backend once if we have local but not backend
          updateUserProfile(user.id, { favorites: parsed }).catch(console.error);
        } else {
          const seedFavs = ["dom-casmurro"];
          setFavorites(seedFavs);
          localStorage.setItem(`bookverse_favs_${user.id}`, JSON.stringify(seedFavs));
          updateUserProfile(user.id, { favorites: seedFavs }).catch(console.error);
        }
      }
    } catch (err: any) {
      const isNetworkErr = err && (err.name === "TypeError" || err.message?.includes("fetch") || err.message?.includes("NetworkError") || err.message?.includes("Failed to fetch"));
      if (isNetworkErr) {
        console.warn("Transient network connection warning when loading user data:", err.message || err);
      } else {
        console.error("Error loading user data:", err);
      }
    }
  };

  useEffect(() => {
    loadUserData();
  }, [user]);

  // Listen to open-auth events from guest components
  useEffect(() => {
    const handleOpenAuth = (e: Event) => {
      const customEvent = e as CustomEvent<{ mode?: "login" | "register" }>;
      const mode = customEvent.detail?.mode || "login";
      setAuthMode(mode);
      setCurrentView("auth");
    };
    window.addEventListener("open-auth", handleOpenAuth);
    return () => {
      window.removeEventListener("open-auth", handleOpenAuth);
    };
  }, []);

  const handleAuthSuccess = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    setEditName(authenticatedUser.name);
    setEditAvatar(authenticatedUser.avatarUrl || "");
    localStorage.setItem("bookverse_user", JSON.stringify(authenticatedUser));
    
    if (isAdminPortal) {
      const isAuthorized = authenticatedUser.role === "Super Administrador" || authenticatedUser.role === "Administrador";
      if (isAuthorized) {
        setCurrentView("admin");
      } else {
        setCurrentView("library");
      }
    } else {
      setCurrentView("library");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("bookverse_user");
    setUser(null);
    setActiveBook(null);
    setCurrentView(isAdminPortal ? "auth" : "landing");
  };

  const handleToggleFavorite = async (bookId: string) => {
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
    try {
      const updatedUser = await updateUserProfile(user.id, { favorites: updated });
      if (updatedUser) {
        setUser(updatedUser);
        localStorage.setItem("bookverse_user", JSON.stringify(updatedUser));
      }
    } catch (err) {
      console.error("Error syncing favorites with server:", err);
    }
  };

  const handleSelectBook = (book: Book, startInAudioMode: boolean) => {
    const isPremium = isUserPremium(user);
    if (startInAudioMode && !isPremium) {
      triggerPaywall("audiobook");
      return;
    }
    if (book.accessType === "premium" && !isPremium) {
      triggerPaywall("premium_book");
      return;
    }
    setActiveBook(book);
    setCurrentView(startInAudioMode ? "audiobook" : "reader");
  };

  // Sync Reading position trigger
  const handleUpdateReadingProgress = async (page: number, readingSeconds?: number) => {
    if (!user || !activeBook) return;
    try {
      const updatedProgress = await saveReadingProgress(user.id, activeBook.id, page, undefined, readingSeconds);
      
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center font-sans">
        <span className="w-10 h-10 border-4 border-[#e2b874]/20 border-t-[#e2b874] rounded-full animate-spin"></span>
        <span className="text-xs text-[#e2b874] mt-3.5 font-bold animate-pulse">Iniciando BookVerse...</span>
      </div>
    );
  }

  if (currentView === "landing") {
    return (
      <>
        <LandingPage
          onNavigateToAuth={(mode) => {
            setAuthMode(mode);
            setCurrentView("auth");
          }}
          onExploreCatalog={() => {
            setCurrentView("library");
          }}
          onSelectBookGuest={(book) => {
            setSelectedGuestBook(book);
          }}
        />
        {selectedGuestBook && (
          <BookDetailModal
            isOpen={selectedGuestBook !== null}
            onClose={() => setSelectedGuestBook(null)}
            book={selectedGuestBook}
            user={user}
            isFavorite={false}
            onToggleFavorite={() => {
              setSelectedGuestBook(null);
              setAuthMode("login");
              setIsAdminPortal(false);
              setCurrentView("auth");
            }}
            onSelectBook={() => {
              setSelectedGuestBook(null);
              setAuthMode("login");
              setIsAdminPortal(false);
              setCurrentView("auth");
            }}
            onTriggerAuth={(mode) => {
              setSelectedGuestBook(null);
              setAuthMode(mode);
              setIsAdminPortal(false);
              setCurrentView("auth");
            }}
          />
        )}
      </>
    );
  }

  if (currentView === "auth") {
    return (
      <AuthScreen
        onAuthSuccess={handleAuthSuccess}
        defaultIsLogin={authMode === "login"}
        isAdminPortal={isAdminPortal}
        onBackToLanding={() => {
          setCurrentView("landing");
        }}
      />
    );
  }

  // Get reading active book progress
  const activeBookProgress = activeBook
    ? progresses.find((p) => p.bookId === activeBook.id) || null
    : null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <AdManagerProvider user={user} onUserUpdate={(updatedUser) => {
      setUser(updatedUser);
      localStorage.setItem("bookverse_user", JSON.stringify(updatedUser));
    }}>
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
          <nav className="flex items-center gap-0.5 sm:gap-2 text-xs font-semibold overflow-x-auto no-scrollbar max-w-[50%] md:max-w-none">
            {/* Public Area Links */}
            <button
              onClick={() => {
                setCurrentView("library");
                setIsProfileOpen(false);
              }}
              className={`px-2.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                currentView === "library"
                  ? "bg-[#e2b874]/10 text-[#e2b874]"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
              }`}
              title="Biblioteca"
            >
              <LibraryIcon className="w-4 h-4" />
              <span className={currentView === "library" ? "inline" : "hidden md:inline"}>Biblioteca</span>
            </button>

            {activeBook && (
              <button
                onClick={() => {
                  setCurrentView("reader");
                  setIsProfileOpen(false);
                }}
                className={`px-2.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  currentView === "reader" || currentView === "audiobook"
                    ? "bg-[#e2b874]/10 text-[#e2b874]"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                }`}
                title={`Lendo: ${activeBook.title}`}
              >
                <BookOpen className="w-4 h-4 animate-pulse" />
                <span className={currentView === "reader" || currentView === "audiobook" ? "inline text-xs" : "hidden md:inline text-xs"}>
                  <span className="hidden sm:inline">Lendo: </span>
                  <span className="max-w-[45px] sm:max-w-[120px] inline-block truncate align-bottom font-serif font-bold text-[#e2b874]">{activeBook.title}</span>
                </span>
              </button>
            )}

            {user && (
              <button
                onClick={() => {
                  setCurrentView("stats");
                  setIsProfileOpen(false);
                }}
                className={`px-2.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  currentView === "stats"
                    ? "bg-[#e2b874]/10 text-[#e2b874]"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                }`}
                title="Estatísticas"
              >
                <BarChart3 className="w-4 h-4" />
                <span className={currentView === "stats" ? "inline" : "hidden md:inline"}>Estatísticas</span>
              </button>
            )}

            {/* Separator and Admin Area Link */}
            {user && (user.role === "Super Administrador" || user.role === "Administrador") && (
              <>
                <div className="w-px h-4 bg-zinc-800 mx-1 shrink-0 self-center" />
                <button
                  onClick={() => {
                    setCurrentView("admin");
                    setIsProfileOpen(false);
                  }}
                  className={`px-2.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    currentView === "admin"
                      ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                      : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                  }`}
                  title="Painel Admin"
                >
                  <Settings className="w-4 h-4 text-amber-500" />
                  <span className={currentView === "admin" ? "inline text-amber-500" : "hidden md:inline"}>Admin</span>
                </button>
              </>
            )}
          </nav>

          {/* Right User actions */}
          <div className="flex items-center gap-1.5 sm:gap-3 relative">
            {user ? (
              <>
                {/* Notification Bell */}
                <div>
                  <button
                    onClick={() => setIsNotifOpen(true)}
                    className="p-1.5 sm:p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-lg sm:rounded-xl relative transition cursor-pointer flex items-center justify-center shadow-lg hover:border-zinc-700 hover:text-zinc-100"
                    title="Notificações"
                  >
                    <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] sm:text-[9px] font-bold w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full flex items-center justify-center border border-zinc-900 animate-pulse">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                </div>

                {/* Profile Dropdown Trigger */}
                <button
                  onClick={() => setCurrentView("profile")}
                  className={`flex items-center gap-1 sm:gap-2 p-1 sm:p-1.5 rounded-lg sm:rounded-xl border transition cursor-pointer ${
                    currentView === "profile"
                      ? "bg-[#e2b874]/10 border-[#e2b874] text-[#e2b874]"
                      : "hover:bg-zinc-800 border-zinc-800 bg-zinc-900 text-zinc-100"
                  }`}
                >
                  <div className="relative">
                    <img
                      src={user.avatarUrl || getInitialsAvatarSvg(user.name)}
                      alt={user.name}
                      className="w-6 h-6 sm:w-7 sm:h-7 rounded-md sm:rounded-lg border border-zinc-800 object-cover"
                      referrerPolicy="no-referrer"
                    />
                    {(user.role === "Super Administrador" || user.role === "Administrador") && (
                      <span className="absolute -top-0.5 -right-0.5 bg-amber-500 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full border border-zinc-900 shadow-[0_0_6px_#f59e0b] animate-pulse" title="Administrador" />
                    )}
                  </div>
                  <div className="flex flex-col items-start leading-tight">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-zinc-100 max-w-[80px] truncate hidden sm:inline">{user.name}</span>
                      {(user.role === "Super Administrador" || user.role === "Administrador") && (
                        <span className="text-[8px] bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold px-1 py-0.5 rounded uppercase font-mono tracking-wider scale-90 hidden sm:inline-block">
                          Admin
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-400 hidden sm:inline" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentView("landing")}
                  className="text-xs font-bold text-zinc-400 hover:text-zinc-200 transition px-2.5 py-2 cursor-pointer hidden md:inline-block"
                >
                  Voltar ao Início
                </button>
                <button
                  onClick={() => {
                    setAuthMode("login");
                    setIsAdminPortal(false);
                    setCurrentView("auth");
                  }}
                  className="text-xs font-bold text-zinc-400 hover:text-[#e2b874] transition px-3 py-2 cursor-pointer"
                >
                  Entrar
                </button>
                <button
                  onClick={() => {
                    setAuthMode("register");
                    setIsAdminPortal(false);
                    setCurrentView("auth");
                  }}
                  className="bg-[#e2b874] hover:bg-[#c59e5f] text-zinc-950 font-bold text-xs px-4 py-2 rounded-xl transition active:scale-95 cursor-pointer shadow-md"
                >
                  Criar Conta
                </button>
              </div>
            )}
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
                user={user}
                onTriggerPaywall={triggerPaywall}
              />
            )}

            {currentView === "reader" && activeBook && isBookAvailable(activeBook) && (
              <Reader
                book={activeBook}
                userId={user.id}
                user={user}
                onBackToLibrary={() => setCurrentView("library")}
                onOpenAudiobook={() => {
                  if (isUserPremium(user)) {
                    setCurrentView("audiobook");
                  } else {
                    triggerPaywall("audiobook");
                  }
                }}
                onUpdateProgress={handleUpdateReadingProgress}
                progress={activeBookProgress}
                onTriggerPaywall={triggerPaywall}
                onUpdateUser={setUser}
              />
            )}

            {currentView === "audiobook" && activeBook && isBookAvailable(activeBook) && (
              <AudiobookPlayer
                book={activeBook}
                userId={user.id}
                onBackToLibrary={() => setCurrentView("library")}
                onOpenReader={() => setCurrentView("reader")}
                progress={activeBookProgress}
                onProgressSync={handleAudioProgressSync}
              />
            )}

            {(currentView === "reader" || currentView === "audiobook") && activeBook && !isBookAvailable(activeBook) && (
              <UnavailableBookScreen
                book={activeBook}
                onBackToLibrary={() => {
                  setCurrentView("library");
                  setActiveBook(null);
                }}
              />
            )}

            {currentView === "stats" && (
              <StatsDashboard
                stats={stats}
                progresses={progresses}
                books={books}
                onBackToLibrary={() => setCurrentView("library")}
                onSelectBook={handleSelectBook}
                user={user}
                onTriggerPaywall={triggerPaywall}
              />
            )}

            {currentView === "admin" && user && (user.role === "Super Administrador" || user.role === "Administrador") && (
              <AdminPanel
                books={books}
                onBackToLibrary={() => setCurrentView("library")}
                onRefreshBooks={loadUserData}
                currentUser={user}
              />
            )}

            {currentView === "profile" && (
              <UserProfile
                user={user}
                stats={stats}
                progresses={progresses}
                books={books}
                favorites={favorites}
                notificationsCount={notifications.filter((n) => !n.read).length}
                onUpdateUser={(updatedUser) => setUser(updatedUser)}
                onLogout={handleLogout}
                onViewChange={(view) => setCurrentView(view)}
                onSelectBook={handleSelectBook}
                onTriggerPaywall={triggerPaywall}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {user && (
        <>
          <NotificationCenter
            userId={user.id}
            isOpen={isNotifOpen}
            onClose={() => setIsNotifOpen(false)}
            onNavigate={(destinationLink, bookId) => {
              if (!destinationLink) return;
              if (destinationLink.startsWith("reader:") && bookId) {
                const foundBook = books.find((b) => b.id === bookId);
                if (foundBook) {
                  handleSelectBook(foundBook, false);
                }
              } else if (destinationLink === "settings" || destinationLink === "profile") {
                setCurrentView("profile");
              } else if (destinationLink === "stats") {
                setCurrentView("stats");
              } else if (destinationLink === "library") {
                setCurrentView("library");
              } else if (destinationLink === "admin") {
                if (user && (user.role === "Super Administrador" || user.role === "Administrador")) {
                  setCurrentView("admin");
                } else {
                  setCurrentView("library");
                }
              }
            }}
            onUpdateCount={(count) => {
              // Unread count synced via NotificationCenter's onUpdateCount
            }}
          />

          <PremiumPaywallModal
            isOpen={paywallOpen}
            onClose={async () => {
              setPaywallOpen(false);
              if (user && user.id) {
                try {
                  const r = await fetch(`/api/auth/me/${user.id}`);
                  const d = await r.json();
                  if (d.user) {
                    setUser(d.user);
                    localStorage.setItem("bookverse_user", JSON.stringify(d.user));
                  }
                } catch (e) {
                  console.error("Failed to sync user state on paywall modal close", e);
                }
              }
            }}
            userId={user.id}
            onSuccess={(updatedUser) => {
              setUser(updatedUser);
              localStorage.setItem("bookverse_user", JSON.stringify(updatedUser));
            }}
            initialReason={paywallReason}
            initialInterval={paywallInterval}
          />
        </>
      )}
    </div>
    </AdManagerProvider>
  );
}
