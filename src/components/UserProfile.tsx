import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  User,
  ReadingStats,
  ReadingProgress,
  Book,
} from "../types";
import {
  User as UserIcon,
  Shield,
  Sliders,
  Eye,
  LogOut,
  Trophy,
  BookOpen,
  Headphones,
  Heart,
  Star,
  MessageSquare,
  Bell,
  Download,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Lock,
  Volume2,
  X,
  FileText,
  Calendar,
  Settings,
  Tv,
  Trash2,
  History,
  KeyRound,
  Laptop,
  Check,
  ChevronRight,
  Info,
  HelpCircle
} from "lucide-react";
import {
  updateUserProfile,
  fetchUserReviews,
  fetchUserNotes,
  deleteUserAccount
} from "../lib/api";

interface UserProfileProps {
  user: User;
  stats: ReadingStats | null;
  progresses: ReadingProgress[];
  books: Book[];
  favorites: string[];
  notificationsCount: number;
  onUpdateUser: (updatedUser: User) => void;
  onLogout: () => void;
  onViewChange: (view: "library" | "reader" | "audiobook" | "stats" | "admin" | "profile") => void;
  onSelectBook: (book: Book, startInAudioMode: boolean) => void;
  onTriggerPaywall?: (reason: "audiobook" | "offline" | "premium_book" | "stats" | "highlights" | "generic", interval?: "monthly" | "yearly") => void;
}

import NotificationSettings from "./NotificationSettings";
import OfflineManager from "./OfflineManager";
import ContactSupportModal from "./ContactSupportModal";

type ProfileTab = "profile" | "settings" | "security" | "privacy" | "notifications" | "offline" | "billing";

export default function UserProfile({
  user,
  stats,
  progresses,
  books,
  favorites,
  notificationsCount,
  onUpdateUser,
  onLogout,
  onViewChange,
  onSelectBook,
  onTriggerPaywall,
}: UserProfileProps) {
  const [activeTab, setActiveTab] = useState<ProfileTab>("profile");

  // Profile forms
  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username || "");
  const [bio, setBio] = useState(user.bio || "");
  const [email, setEmail] = useState(user.email);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || "");
  const [password, setPassword] = useState("••••••••");
  
  const [saveSuccess, setSaveSuccess] = useState("");
  const [saveError, setSaveError] = useState("");
  const [loading, setLoading] = useState(false);

  // Stats / Activities loaded dynamically
  const [userReviews, setUserReviews] = useState<any[]>([]);
  const [userNotes, setUserNotes] = useState<any[]>([]);
  const [isReviewsLoading, setIsReviewsLoading] = useState(false);

  // Security States
  const [twoFactor, setTwoFactor] = useState(user.security?.twoFactorEnabled || false);
  const [sessions, setSessions] = useState(
    user.security?.sessions || [
      { id: "s1", name: "Chrome no Windows", ip: "192.168.1.45", lastActive: "Ativa agora" },
      { id: "s2", name: "Safari no iPhone 15", ip: "177.82.11.2", lastActive: "Há 2 horas" }
    ]
  );

  // Preference states
  const [language, setLanguage] = useState(user.preferences?.language || "pt-BR");
  const [theme, setTheme] = useState(user.preferences?.theme || "dark");
  const [fontSize, setFontSize] = useState(user.preferences?.fontSize || "medium");
  const [layoutMode, setLayoutMode] = useState(user.preferences?.layoutMode || "paged");

  // Billing/Subscription states
  const [billingRequests, setBillingRequests] = useState<any[]>([]);
  const [requestIntervalSetting, setRequestIntervalSetting] = useState<"monthly" | "yearly">("monthly");
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingSuccess, setBillingSuccess] = useState("");
  const [billingError, setBillingError] = useState("");
  const [notifyPush, setNotifyPush] = useState(user.preferences?.notifyPush !== false);
  const [notifyEmail, setNotifyEmail] = useState(user.preferences?.notifyEmail !== false);
  const [audioSpeed, setAudioSpeed] = useState(user.preferences?.audioSpeed || "1.0");

  // Privacy states
  const [accountPrivate, setAccountPrivate] = useState(user.privacy?.accountPrivate || false);
  const [showStats, setShowStats] = useState(user.privacy?.showStats !== false);

  // Modals / Confirmation dialogues
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteEmailConfirm, setDeleteEmailConfirm] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  // Loading Reviews and Notes on mount
  useEffect(() => {
    const loadUserData = async () => {
      setIsReviewsLoading(true);
      try {
        const reviews = await fetchUserReviews(user.id);
        const notes = await fetchUserNotes(user.id);
        setUserReviews(reviews || []);
        setUserNotes(notes || []);
      } catch (err) {
        console.error("Error fetching user stats/reviews:", err);
      } finally {
        setIsReviewsLoading(false);
      }
    };
    loadUserData();
  }, [user.id]);

  // Load upgrade requests for the user when they view the billing tab
  useEffect(() => {
    if (activeTab === "billing") {
      setBillingLoading(true);
      fetch(`/api/billing/requests/${user.id}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success) {
            setBillingRequests(data.requests || []);
          }
        })
        .catch((err) => console.error("Error loading user premium requests:", err))
        .finally(() => setBillingLoading(false));
    }
  }, [activeTab, user.id, user]);

  // Handle saving personal info / account settings
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSaveSuccess("");
    setSaveError("");
    try {
      const updated = await updateUserProfile(user.id, {
        name,
        username,
        bio,
        email,
        avatarUrl,
        preferences: {
          language,
          theme,
          fontSize,
          layoutMode,
          notifyPush,
          notifyEmail,
          audioSpeed,
        },
        security: {
          twoFactorEnabled: twoFactor,
          sessions,
        },
        privacy: {
          accountPrivate,
          showStats,
        }
      });
      onUpdateUser(updated);
      setSaveSuccess("Perfil atualizado com sucesso!");
      setTimeout(() => setSaveSuccess(""), 4000);
    } catch (err: any) {
      setSaveError(err.message || "Erro ao salvar informações.");
    } finally {
      setLoading(false);
    }
  };

  // Handle saving preferences immediately when toggled (or on click)
  const handlePreferenceChange = async (key: string, value: any) => {
    try {
      const prefs = {
        language,
        theme,
        fontSize,
        layoutMode,
        notifyPush,
        notifyEmail,
        audioSpeed,
        [key]: value
      };
      const updated = await updateUserProfile(user.id, { preferences: prefs });
      onUpdateUser(updated);
    } catch (err) {
      console.error("Error updating preferences:", err);
    }
  };

  // Handle Toggle 2FA
  const handleToggle2FA = async () => {
    const nextVal = !twoFactor;
    setTwoFactor(nextVal);
    try {
      const updated = await updateUserProfile(user.id, {
        security: {
          twoFactorEnabled: nextVal,
          sessions
        }
      });
      onUpdateUser(updated);
    } catch (e) {
      console.error("Failed to update 2FA", e);
    }
  };

  // Disconnect other sessions
  const handleDisconnectSessions = async () => {
    const onlyCurrent = sessions.filter(s => s.lastActive === "Ativa agora");
    setSessions(onlyCurrent);
    try {
      const updated = await updateUserProfile(user.id, {
        security: {
          twoFactorEnabled: twoFactor,
          sessions: onlyCurrent
        }
      });
      onUpdateUser(updated);
      setSaveSuccess("Outros dispositivos desconectados com sucesso!");
      setTimeout(() => setSaveSuccess(""), 4000);
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Privacy state update
  const handlePrivacyToggle = async (key: "accountPrivate" | "showStats", value: boolean) => {
    try {
      const payload = {
        accountPrivate,
        showStats,
        [key]: value
      };
      const updated = await updateUserProfile(user.id, { privacy: payload });
      onUpdateUser(updated);
    } catch (e) {
      console.error(e);
    }
  };

  // Requesting personal data export
  const handleExportData = () => {
    const userData = {
      profile: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
        bio: user.bio,
      },
      statistics: stats,
      readingProgresses: progresses.map(p => {
        const b = books.find(book => book.id === p.bookId);
        return {
          bookId: p.bookId,
          title: b ? b.title : "Desconhecido",
          author: b ? b.author : "Desconhecido",
          progressPercentage: p.progressPercentage,
          lastPage: p.lastPage,
          lastReadAt: p.lastReadAt,
        };
      }),
      reviews: userReviews,
      notes: userNotes,
      favorites: favorites.map(id => {
        const b = books.find(book => book.id === id);
        return b ? { id: b.id, title: b.title, author: b.author } : { id };
      })
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(userData, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `bookverse_data_${user.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Handle delete account
  const handleDeleteAccount = async () => {
    setDeleteError("");
    if (deleteEmailConfirm.trim().toLowerCase() !== user.email.toLowerCase()) {
      setDeleteError("O e-mail digitado não corresponde à sua conta atual.");
      return;
    }
    try {
      const success = await deleteUserAccount(user.id, user.email);
      if (success) {
        setShowDeleteConfirm(false);
        onLogout();
      }
    } catch (err: any) {
      setDeleteError(err.message || "Erro ao processar exclusão da conta.");
    }
  };

  // Calculated metrics
  const booksInProgress = progresses.filter(p => p.progressPercentage > 0 && p.progressPercentage < 100);
  const booksCompleted = progresses.filter(p => p.progressPercentage >= 100);
  
  // Audiobooks in progress
  const completedAudiobooks = progresses.filter(p => {
    const b = books.find(book => book.id === p.bookId);
    return p.progressPercentage >= 100 && b?.audiobookAvailable;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 font-sans text-zinc-100 selection:bg-[#e2b874]/30 min-h-[calc(100vh-4rem)]">
      {/* Top Banner section */}
      <div className="relative mb-8 bg-gradient-to-r from-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl p-6 md:p-8 overflow-hidden shadow-2xl flex flex-col md:flex-row items-center gap-6 justify-between">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#e2b874]/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-center gap-5 text-center md:text-left">
          {/* Avatar frame */}
          <div className="w-24 h-24 rounded-2xl border-2 border-[#e2b874]/40 overflow-hidden bg-zinc-900 shadow-lg relative group">
            <img
              src={avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(user.name)}`}
              alt={user.name}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>

          <div>
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <h1 className="text-2xl font-serif font-bold text-zinc-100">{user.name}</h1>
              {user.role && (
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-[#e2b874]/10 text-[#e2b874] border border-[#e2b874]/20">
                  {user.role}
                </span>
              )}
            </div>
            
            <p className="text-sm text-[#e2b874] font-mono mt-1 font-semibold">
              {username ? `@${username}` : `@${user.name.toLowerCase().replace(/\s+/g, "")}`}
            </p>
            
            <p className="text-xs text-zinc-400 mt-2 max-w-md italic font-serif leading-relaxed">
              {bio || "Nenhuma biografia informada ainda. Clique em Editar Perfil para adicionar."}
            </p>

            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 mt-3 justify-center md:justify-start">
              <Calendar className="w-3.5 h-3.5" />
              Membro desde: {new Date(user.createdAt).toLocaleDateString("pt-BR", { year: "numeric", month: "long", day: "numeric" })}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab("settings")}
            className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Settings className="w-3.5 h-3.5 text-[#e2b874]" />
            Configurações
          </button>
          
          <button
            onClick={() => onViewChange("library")}
            className="bg-[#e2b874] hover:bg-[#c59e5f] text-zinc-950 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-md shadow-[#e2b874]/10"
          >
            Voltar à Biblioteca
          </button>
        </div>
      </div>

      {/* Main navigation layouts: Sidebar + Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Segment controller Menu list */}
        <div className="lg:col-span-3 space-y-2">
          {[
            { id: "profile", label: "Painel Geral", icon: <UserIcon className="w-4 h-4" /> },
            { id: "settings", label: "Configurar Conta", icon: <Sliders className="w-4 h-4" /> },
            { id: "billing", label: "Assinatura Premium", icon: <Trophy className="w-4 h-4" /> },
            { id: "notifications", label: "Notificações (FCM)", icon: <Bell className="w-4 h-4" /> },
            { id: "offline", label: "Leitura Offline", icon: <Download className="w-4 h-4" /> },
            { id: "security", label: "Segurança & Logs", icon: <Shield className="w-4 h-4" /> },
            { id: "privacy", label: "Privacidade & Dados", icon: <Eye className="w-4 h-4" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as ProfileTab);
                setSaveSuccess("");
                setSaveError("");
              }}
              className={`w-full text-left py-3 px-4 rounded-xl text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                activeTab === tab.id
                  ? "bg-[#e2b874]/10 text-[#e2b874] border-l-2 border-[#e2b874]"
                  : "bg-zinc-900/40 hover:bg-zinc-900 text-zinc-400 border-l-2 border-transparent"
              }`}
            >
              <span className={activeTab === tab.id ? "text-[#e2b874]" : "text-zinc-500"}>
                {tab.icon}
              </span>
              {tab.label}
              <ChevronRight className="w-3.5 h-3.5 ml-auto text-zinc-600" />
            </button>
          ))}

          <div className="pt-4 mt-4 border-t border-zinc-800/60 space-y-2">
            <button
              onClick={() => setIsSupportOpen(true)}
              className="w-full text-left py-3 px-4 rounded-xl text-xs font-bold text-amber-400 hover:bg-amber-950/10 hover:text-amber-300 transition flex items-center gap-3 cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-amber-500/80" />
              Fale com o Suporte
            </button>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full text-left py-3 px-4 rounded-xl text-xs font-bold text-red-400 hover:bg-red-950/20 transition flex items-center gap-3 cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-red-500/80" />
              Terminar Sessão
            </button>
          </div>
        </div>

        {/* Right Side: Active view tab content container */}
        <div className="lg:col-span-9">
          <AnimatePresence mode="wait">
            {activeTab === "profile" && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                {/* 1. Statistics Cards indicators */}
                <div>
                  <h3 className="text-sm font-bold tracking-wider text-zinc-400 uppercase mb-4 flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-[#e2b874]" />
                    Indicadores de Leitura
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-[#121214] border border-zinc-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">Tempo de Leitura</span>
                      <span className="text-2xl font-serif font-bold text-zinc-100 block mt-2">
                        {stats ? (stats.readingMinutes + stats.listeningMinutes) : 0} <span className="text-[10px] font-sans text-zinc-500 font-bold">min</span>
                      </span>
                    </div>

                    <div className="bg-[#121214] border border-zinc-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">Em andamento</span>
                      <span className="text-2xl font-serif font-bold text-zinc-100 block mt-2">
                        {booksInProgress.length} <span className="text-[10px] font-sans text-zinc-500 font-bold">livros</span>
                      </span>
                    </div>

                    <div className="bg-[#121214] border border-zinc-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">Concluídos</span>
                      <span className="text-2xl font-serif font-bold text-emerald-400 block mt-2">
                        {booksCompleted.length} <span className="text-[10px] font-sans text-zinc-500 font-bold">livros</span>
                      </span>
                    </div>

                    <div className="bg-[#121214] border border-zinc-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">Audiobooks</span>
                      <span className="text-2xl font-serif font-bold text-[#e2b874] block mt-2">
                        {completedAudiobooks.length} <span className="text-[10px] font-sans text-zinc-500 font-bold">lidos</span>
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                    <div className="bg-[#121214] border border-zinc-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">Páginas Lidas</span>
                      <span className="text-xl font-serif font-bold text-zinc-100 block mt-2">
                        {stats?.pagesReadCount || 0} <span className="text-[10px] font-sans text-zinc-500 font-bold">págs</span>
                      </span>
                    </div>

                    <div className="bg-[#121214] border border-zinc-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">Favoritos salvos</span>
                      <span className="text-xl font-serif font-bold text-rose-400 block mt-2">
                        {favorites.length} <span className="text-[10px] font-sans text-zinc-500 font-bold">livros</span>
                      </span>
                    </div>

                    <div className="bg-[#121214] border border-zinc-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">Avaliações Feitas</span>
                      <span className="text-xl font-serif font-bold text-[#e2b874] block mt-2">
                        {userReviews.length} <span className="text-[10px] font-sans text-zinc-500 font-bold">votos</span>
                      </span>
                    </div>

                    <div className="bg-[#121214] border border-zinc-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">Notas & Destaques</span>
                      <span className="text-xl font-serif font-bold text-blue-400 block mt-2">
                        {userNotes.length} <span className="text-[10px] font-sans text-zinc-500 font-bold">itens</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Quick Access links shortcuts area */}
                <div>
                  <h3 className="text-sm font-bold tracking-wider text-zinc-400 uppercase mb-4">
                    Acesso Rápido & Suas Leituras
                  </h3>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button
                      onClick={() => onViewChange("library")}
                      className="bg-zinc-900/60 hover:bg-zinc-900 hover:border-zinc-700 border border-zinc-800/80 p-4 rounded-2xl transition text-left cursor-pointer flex flex-col justify-between gap-3 group"
                    >
                      <BookOpen className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition" />
                      <div>
                        <span className="text-xs font-serif font-bold text-zinc-100 block">Minha Biblioteca</span>
                        <span className="text-[10px] text-zinc-500">Acessar seu catálogo</span>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        onViewChange("library");
                        // We can deep link or highlight favorites
                      }}
                      className="bg-zinc-900/60 hover:bg-zinc-900 hover:border-zinc-700 border border-zinc-800/80 p-4 rounded-2xl transition text-left cursor-pointer flex flex-col justify-between gap-3 group"
                    >
                      <Heart className="w-5 h-5 text-rose-400 group-hover:scale-110 transition" />
                      <div>
                        <span className="text-xs font-serif font-bold text-zinc-100 block">Favoritos</span>
                        <span className="text-[10px] text-zinc-500">{favorites.length} títulos salvos</span>
                      </div>
                    </button>

                    <button
                      onClick={() => onViewChange("stats")}
                      className="bg-zinc-900/60 hover:bg-zinc-900 hover:border-zinc-700 border border-zinc-800/80 p-4 rounded-2xl transition text-left cursor-pointer flex flex-col justify-between gap-3 group"
                    >
                      <History className="w-5 h-5 text-[#e2b874] group-hover:scale-110 transition" />
                      <div>
                        <span className="text-xs font-serif font-bold text-zinc-100 block">Histórico de Leitura</span>
                        <span className="text-[10px] text-zinc-500">Acessar estatísticas</span>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        // Triggers open notification
                        const bellBtn = document.querySelector('[title="Notificações"]') as HTMLButtonElement;
                        if (bellBtn) bellBtn.click();
                      }}
                      className="bg-zinc-900/60 hover:bg-zinc-900 hover:border-zinc-700 border border-zinc-800/80 p-4 rounded-2xl transition text-left cursor-pointer flex flex-col justify-between gap-3 group"
                    >
                      <div className="relative inline-block">
                        <Bell className="w-5 h-5 text-blue-400 group-hover:scale-110 transition" />
                        {notificationsCount > 0 && (
                          <span className="absolute -top-1 -right-1 bg-red-500 w-2 h-2 rounded-full" />
                        )}
                      </div>
                      <div>
                        <span className="text-xs font-serif font-bold text-zinc-100 block">Notificações</span>
                        <span className="text-[10px] text-zinc-500">{notificationsCount} novas alertas</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* 3. Feed of Reviews written by User */}
                <div>
                  <h3 className="text-sm font-bold tracking-wider text-zinc-400 uppercase mb-4 flex items-center gap-2">
                    <Star className="w-4 h-4 text-[#e2b874]" />
                    Suas Avaliações & Comentários ({userReviews.length})
                  </h3>

                  {isReviewsLoading ? (
                    <div className="py-8 text-center text-zinc-500 text-xs">Carregando avaliações...</div>
                  ) : userReviews.length === 0 ? (
                    <div className="py-8 text-center bg-[#121214] border border-zinc-800 rounded-2xl text-zinc-500 text-xs flex flex-col items-center justify-center gap-1.5">
                      <MessageSquare className="w-6 h-6 text-zinc-600" />
                      Você ainda não avaliou nenhum livro.
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {userReviews.map((rev) => (
                        <div key={rev.id} className="bg-[#121214] border border-zinc-800 rounded-2xl p-4 flex gap-4 items-start">
                          {rev.bookCover && (
                            <img
                              src={rev.bookCover}
                              alt={rev.bookTitle}
                              className="w-9 h-13 object-cover rounded border border-zinc-800 flex-shrink-0"
                              referrerPolicy="no-referrer"
                            />
                          )}
                          <div className="min-w-0 flex-grow text-xs">
                            <div className="flex justify-between items-start gap-2">
                              <h4 className="font-serif font-bold text-zinc-200 truncate">{rev.bookTitle}</h4>
                              <span className="text-[10px] text-zinc-500 flex-shrink-0">
                                {new Date(rev.createdAt).toLocaleDateString("pt-BR")}
                              </span>
                            </div>

                            {/* Stars rating visual */}
                            <div className="flex items-center gap-0.5 mt-1 mb-2">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-3.5 h-3.5 ${
                                    i < rev.rating ? "text-[#e2b874] fill-[#e2b874]" : "text-zinc-700"
                                  }`}
                                />
                              ))}
                            </div>

                            <p className="text-zinc-300 italic leading-relaxed">
                              "{rev.comment}"
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4. Reading Notes & Highlights written by User */}
                <div>
                  <h3 className="text-sm font-bold tracking-wider text-zinc-400 uppercase mb-4 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-400" />
                    Seus Destaques & Notas ({userNotes.length})
                  </h3>

                  {isReviewsLoading ? (
                    <div className="py-8 text-center text-zinc-500 text-xs">Carregando destaques...</div>
                  ) : userNotes.length === 0 ? (
                    <div className="py-8 text-center bg-[#121214] border border-zinc-800 rounded-2xl text-zinc-500 text-xs flex flex-col items-center justify-center gap-1.5">
                      <FileText className="w-6 h-6 text-zinc-600" />
                      Você ainda não salvou nenhum destaque de leitura.
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {userNotes.map((note) => (
                        <div key={note.id} className="bg-[#121214] border border-zinc-800 rounded-2xl p-4 flex gap-4 items-start">
                          <div className="min-w-0 flex-grow text-xs">
                            <div className="flex justify-between items-start gap-2">
                              <h4 className="font-serif font-bold text-zinc-200 truncate">{note.bookTitle} — Pág {note.page + 1}</h4>
                              <span className="text-[10px] text-zinc-500 flex-shrink-0">
                                {new Date(note.createdAt).toLocaleDateString("pt-BR")}
                              </span>
                            </div>

                            {/* Marked text visual highlights */}
                            <div className="mt-2 pl-3 border-l-2 border-[#e2b874]/60 py-1 bg-zinc-900/45 rounded-r-lg text-zinc-300 mb-2">
                              {note.selectedText}
                            </div>

                            {note.text && (
                              <p className="text-zinc-400 leading-relaxed text-[11px] font-sans">
                                <span className="font-semibold text-zinc-500">Sua nota:</span> {note.text}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === "settings" && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-[#121214] border border-zinc-800 rounded-3xl p-6 md:p-8 space-y-8"
              >
                <div>
                  <h2 className="text-xl font-serif font-bold text-zinc-100">Informações da Conta</h2>
                  <p className="text-xs text-zinc-400 mt-1">Gerencie suas credenciais de perfil e as preferências de navegação.</p>
                </div>

                {saveSuccess && (
                  <div className="p-3 bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-xs rounded-xl flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    {saveSuccess}
                  </div>
                )}

                {saveError && (
                  <div className="p-3 bg-red-950/40 border border-red-800/40 text-red-400 text-xs rounded-xl flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    {saveError}
                  </div>
                )}

                <form onSubmit={handleSaveProfile} className="space-y-6 text-xs text-left">
                  {/* Photo Edit Option */}
                  <div className="p-4 bg-zinc-900/50 border border-zinc-800/80 rounded-2xl flex flex-col sm:flex-row gap-4 items-center">
                    <img
                      src={avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`}
                      alt={name}
                      className="w-16 h-16 rounded-xl border border-zinc-800 object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-grow space-y-1 w-full">
                      <label className="block font-semibold text-zinc-400">URL da Foto de Perfil</label>
                      <input
                        type="text"
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                        placeholder="Insira uma URL de imagem válida"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-3 text-zinc-200 outline-none focus:border-[#e2b874] transition"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block font-semibold text-zinc-400 uppercase tracking-wider text-[10px]">Nome Completo</label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 px-3.5 text-zinc-100 outline-none focus:border-[#e2b874] transition"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block font-semibold text-zinc-400 uppercase tracking-wider text-[10px]">Nome de Usuário</label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ""))}
                        placeholder="ex: tutorleitor"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 px-3.5 text-zinc-100 outline-none focus:border-[#e2b874] transition"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block font-semibold text-zinc-400 uppercase tracking-wider text-[10px]">E-mail</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 px-3.5 text-zinc-100 outline-none focus:border-[#e2b874] transition"
                      />
                    </div>

                    <div className="space-y-1 relative">
                      <label className="block font-semibold text-zinc-400 uppercase tracking-wider text-[10px]">Senha de Acesso</label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 px-3.5 text-zinc-100 outline-none focus:border-[#e2b874] transition"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block font-semibold text-zinc-400 uppercase tracking-wider text-[10px]">Biografia do Leitor</label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Fale um pouco sobre seus gêneros favoritos ou hábitos de leitura..."
                      rows={3}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 px-3.5 text-zinc-100 outline-none focus:border-[#e2b874] transition"
                    />
                  </div>

                  <div className="border-t border-zinc-800 pt-6">
                    <h4 className="font-serif font-bold text-zinc-100 text-sm mb-4">Preferências do Aplicativo</h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                      <div className="space-y-1">
                        <label className="block text-zinc-400 text-[10px] uppercase font-bold tracking-wider">Idioma da interface</label>
                        <select
                          value={language}
                          onChange={(e) => {
                            setLanguage(e.target.value);
                            handlePreferenceChange("language", e.target.value);
                          }}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-3 text-zinc-200 font-bold"
                        >
                          <option value="pt-BR">Português (Brasil)</option>
                          <option value="en">English (US)</option>
                          <option value="es">Español</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-zinc-400 text-[10px] uppercase font-bold tracking-wider">Tema Visual</label>
                        <select
                          value={theme}
                          onChange={(e) => {
                            setTheme(e.target.value);
                            handlePreferenceChange("theme", e.target.value);
                          }}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-3 text-zinc-200 font-bold"
                        >
                          <option value="dark">Escuro (BookVerse)</option>
                          <option value="light">Claro (Clássico)</option>
                          <option value="system">Sistema</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-zinc-400 text-[10px] uppercase font-bold tracking-wider">Tamanho de Fonte</label>
                        <select
                          value={fontSize}
                          onChange={(e) => {
                            setFontSize(e.target.value);
                            handlePreferenceChange("fontSize", e.target.value);
                          }}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-3 text-zinc-200 font-bold"
                        >
                          <option value="small">Pequena</option>
                          <option value="medium">Média (Padrão)</option>
                          <option value="large">Grande</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-zinc-400 text-[10px] uppercase font-bold tracking-wider">Velocidade Audiobook</label>
                        <select
                          value={audioSpeed}
                          onChange={(e) => {
                            setAudioSpeed(e.target.value);
                            handlePreferenceChange("audioSpeed", e.target.value);
                          }}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-3 text-zinc-200 font-bold"
                        >
                          <option value="1.0">1.0x (Normal)</option>
                          <option value="1.25">1.25x</option>
                          <option value="1.5">1.5x</option>
                          <option value="2.0">2.0x</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-zinc-400 text-[10px] uppercase font-bold tracking-wider">Visualização PDF</label>
                        <select
                          value={layoutMode}
                          onChange={(e) => {
                            setLayoutMode(e.target.value);
                            handlePreferenceChange("layoutMode", e.target.value);
                          }}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-3 text-zinc-200 font-bold"
                        >
                          <option value="paged">Página por página</option>
                          <option value="continuous">Rolagem Contínua</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-3.5 mt-5 p-4 bg-zinc-900/40 rounded-2xl border border-zinc-800/60">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="block font-bold text-zinc-200">Notificações Push</label>
                          <span className="text-[10px] text-zinc-500">Alertas de novos lançamentos e reativações</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={notifyPush}
                          onChange={(e) => {
                            setNotifyPush(e.target.checked);
                            handlePreferenceChange("notifyPush", e.target.checked);
                          }}
                          className="w-4 h-4 text-[#e2b874] bg-zinc-900 border-zinc-800 rounded focus:ring-0 cursor-pointer"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <label className="block font-bold text-zinc-200">E-mails Informativos</label>
                          <span className="text-[10px] text-zinc-500">E-mails de progresso semanal e conquistas</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={notifyEmail}
                          onChange={(e) => {
                            setNotifyEmail(e.target.checked);
                            handlePreferenceChange("notifyEmail", e.target.checked);
                          }}
                          className="w-4 h-4 text-[#e2b874] bg-zinc-900 border-zinc-800 rounded focus:ring-0 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#e2b874] hover:bg-[#c59e5f] text-zinc-950 py-3.5 rounded-xl font-bold transition active:scale-95 cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                  >
                    {loading ? "Salvando..." : "Salvar Configurações de Perfil"}
                  </button>
                </form>
              </motion.div>
            )}

            {activeTab === "security" && (
              <motion.div
                key="security"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-[#121214] border border-zinc-800 rounded-3xl p-6 md:p-8 space-y-6"
              >
                <div>
                  <h2 className="text-xl font-serif font-bold text-zinc-100 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-[#e2b874]" />
                    Segurança de Acesso
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1">Monitore sessões ativas e configure proteções adicionais.</p>
                </div>

                {/* 2FA block */}
                <div className="p-5 bg-zinc-900/50 border border-zinc-800 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-[#e2b874]" />
                      Autenticação em Duas Etapas (2FA)
                    </h3>
                    <p className="text-[11px] text-zinc-400 max-w-lg leading-relaxed">
                      Adicione uma camada extra de segurança à sua conta de leitor. Exige código de verificação via e-mail ou app authenticator a cada novo acesso.
                    </p>
                  </div>
                  <button
                    onClick={handleToggle2FA}
                    className={`py-2 px-4 rounded-xl text-xs font-bold transition cursor-pointer flex-shrink-0 ${
                      twoFactor
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-800/40"
                        : "bg-[#e2b874] text-zinc-950 hover:bg-[#c59e5f]"
                    }`}
                  >
                    {twoFactor ? "Habilitado ✓" : "Ativar 2FA"}
                  </button>
                </div>

                {/* Devices lists */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-1.5">
                    <Laptop className="w-4 h-4 text-[#e2b874]" />
                    Dispositivos Conectados
                  </h3>

                  <div className="space-y-3">
                    {sessions.map((session) => (
                      <div key={session.id} className="p-4 bg-zinc-900/30 border border-zinc-850 rounded-xl flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[#e2b874]">
                            <Laptop className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-zinc-200 block">{session.name}</span>
                            <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">IP: {session.ip}</span>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          session.lastActive === "Ativa agora"
                            ? "bg-emerald-950/40 text-emerald-400 border border-emerald-900/30"
                            : "bg-zinc-800 text-zinc-400"
                        }`}>
                          {session.lastActive}
                        </span>
                      </div>
                    ))}
                  </div>

                  {sessions.length > 1 && (
                    <button
                      onClick={handleDisconnectSessions}
                      className="mt-4 bg-red-950/20 hover:bg-red-950/30 border border-red-900/30 text-red-400 font-bold py-2 px-4 rounded-xl text-xs transition cursor-pointer"
                    >
                      Encerrar Outras Sessões Ativas
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === "privacy" && (
              <motion.div
                key="privacy"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-[#121214] border border-zinc-800 rounded-3xl p-6 md:p-8 space-y-6 text-left"
              >
                <div>
                  <h2 className="text-xl font-serif font-bold text-zinc-100 flex items-center gap-2">
                    <Eye className="w-5 h-5 text-[#e2b874]" />
                    Controle de Privacidade & Seus Dados
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1">Gerencie a visibilidade do seu progresso e faça a portabilidade dos seus dados.</p>
                </div>

                <div className="space-y-4 p-5 bg-zinc-900/30 border border-zinc-850 rounded-2xl">
                  <div className="flex items-center justify-between text-xs pb-4 border-b border-zinc-850">
                    <div>
                      <label className="block font-bold text-zinc-200">Perfil Privado</label>
                      <span className="text-[10px] text-zinc-500 max-w-sm block mt-0.5">
                        Apenas você poderá visualizar seus comentários, notas de leitura e conquistas salvas.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={accountPrivate}
                      onChange={(e) => {
                        setAccountPrivate(e.target.checked);
                        handlePrivacyToggle("accountPrivate", e.target.checked);
                      }}
                      className="w-4 h-4 text-[#e2b874] bg-zinc-900 border-zinc-800 rounded focus:ring-0 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2">
                    <div>
                      <label className="block font-bold text-zinc-200">Compartilhar Estatísticas</label>
                      <span className="text-[10px] text-zinc-500 max-w-sm block mt-0.5">
                        Permitir que outros membros da plataforma vejam seu tempo total de leitura e livros completados.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={showStats}
                      onChange={(e) => {
                        setShowStats(e.target.checked);
                        handlePrivacyToggle("showStats", e.target.checked);
                      }}
                      className="w-4 h-4 text-[#e2b874] bg-zinc-900 border-zinc-800 rounded focus:ring-0 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Portability block */}
                <div className="p-5 bg-zinc-900/50 border border-zinc-800 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                      <Download className="w-3.5 h-3.5 text-[#e2b874]" />
                      Portabilidade de Dados Pessoais
                    </h3>
                    <p className="text-[11px] text-zinc-400 max-w-lg leading-relaxed">
                      Solicite a exportação de todos os seus dados armazenados (perfil, progresso em PDFs, notas salvas, favoritos e histórico de áudio) em formato estruturado JSON.
                    </p>
                  </div>
                  <button
                    onClick={handleExportData}
                    className="bg-[#e2b874] hover:bg-[#c59e5f] text-zinc-950 font-bold py-2.5 px-4 rounded-xl text-xs transition cursor-pointer flex-shrink-0 flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Exportar JSON
                  </button>
                </div>

                {/* Destructive account deletion block */}
                <div className="p-5 bg-red-950/10 border border-red-900/20 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      Remover Conta de Leitor
                    </h3>
                    <p className="text-[11px] text-zinc-400 max-w-lg leading-relaxed">
                      Excluir permanentemente sua conta, conquistas, anotações de leitura e históricos do BookVerse. Esta ação é definitiva e não poderá ser desfeita.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setDeleteError("");
                      setDeleteEmailConfirm("");
                      setShowDeleteConfirm(true);
                    }}
                    className="bg-red-950 hover:bg-red-900 border border-red-900/40 text-red-400 font-bold py-2.5 px-4 rounded-xl text-xs transition cursor-pointer flex-shrink-0 flex items-center gap-1.5 active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Excluir Conta
                  </button>
                </div>
              </motion.div>
            )}

            {activeTab === "notifications" && (
              <motion.div
                key="notifications"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-[#121214] border border-zinc-850 rounded-3xl p-6 md:p-8 text-left"
              >
                <NotificationSettings user={user} onUpdateUser={onUpdateUser} />
              </motion.div>
            )}

            {activeTab === "offline" && (
              <motion.div
                key="offline"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-[#121214] border border-zinc-850 rounded-3xl p-6 md:p-8 text-left"
              >
                <OfflineManager 
                  userId={user.id} 
                  onNavigateToReader={(bookId) => {
                    const foundBook = books.find((b) => b.id === bookId);
                    if (foundBook) {
                      onSelectBook(foundBook, false);
                    }
                  }}
                />
              </motion.div>
            )}

            {activeTab === "billing" && (
              <motion.div
                key="billing"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-[#121214] border border-zinc-850 rounded-3xl p-6 md:p-8 text-left space-y-6"
              >
                <div>
                  <h3 className="text-xl font-serif font-bold text-zinc-100 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    Gerenciamento de Assinatura Premium
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Verifique seu status atual, gerencie faturamento, faça upgrade ou cancele seu plano diretamente do seu painel de leitor.
                  </p>
                </div>

                {billingSuccess && (
                  <div className="p-4 bg-emerald-950/20 border border-emerald-900/30 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>{billingSuccess}</span>
                  </div>
                )}

                {billingError && (
                  <div className="p-4 bg-red-950/20 border border-red-900/30 text-red-400 text-xs rounded-xl flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>{billingError}</span>
                  </div>
                )}

                {/* Subscription Status Card */}
                {user.subscription && user.subscription.plan === "PREMIUM" ? (
                  <div className="border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent rounded-2xl p-5 md:p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <span className="bg-amber-500 text-zinc-950 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          Plano Premium Ativo
                        </span>
                        <h4 className="text-lg font-serif font-bold text-zinc-100 mt-2">
                          BookVerse Premium {user.subscription.billingInterval === "yearly" ? "Anual" : "Mensal"}
                        </h4>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-xs text-zinc-400">Próxima cobrança / Vencimento</p>
                        <p className="text-sm font-bold text-[#e2b874] mt-0.5">
                          {new Date(user.subscription.expiresAt).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-zinc-800/80 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-zinc-300">
                      <div>
                        <p className="text-zinc-500">Método de Faturamento:</p>
                        <p className="font-semibold text-zinc-100 mt-0.5">
                          {user.subscription.paymentMethod?.brand?.toUpperCase()} (•••• {user.subscription.paymentMethod?.last4})
                        </p>
                      </div>
                      <div>
                        <p className="text-zinc-500">Status de Renovação:</p>
                        <p className={`font-semibold mt-0.5 ${user.subscription.status === "canceled" ? "text-red-400" : "text-emerald-400"}`}>
                          {user.subscription.status === "canceled" ? "Cancelada (Sem renovação automática)" : "Ativa (Renovação automática habilitada)"}
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-zinc-800/80 pt-4 flex flex-wrap gap-3">
                      {user.subscription.status === "canceled" ? (
                        <button
                          disabled={billingLoading}
                          onClick={async () => {
                            setBillingLoading(true);
                            setBillingSuccess("");
                            setBillingError("");
                            try {
                              const res = await fetch("/api/billing/reactivate", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ userId: user.id })
                              });
                              const data = await res.json();
                              if (data.success) {
                                setBillingSuccess("Sua assinatura foi reativada com sucesso! A renovação automática está ativa.");
                                onUpdateUser(data.user);
                              } else {
                                setBillingError(data.error || "Falha ao reativar assinatura.");
                              }
                            } catch (err) {
                              setBillingError("Erro de conexão ao reativar assinatura.");
                            } finally {
                              setBillingLoading(false);
                            }
                          }}
                          className="px-4 py-2 bg-[#e2b874] hover:bg-[#c59e5f] text-zinc-950 font-bold text-xs rounded-xl transition cursor-pointer disabled:opacity-40"
                        >
                          {billingLoading ? "Processando..." : "Reativar Renovação Automática"}
                        </button>
                      ) : (
                        <button
                          disabled={billingLoading}
                          onClick={async () => {
                            if (confirm("Tem certeza que deseja cancelar a renovação automática da sua assinatura Premium? Você manterá acesso aos benefícios até o final do período atual.")) {
                              setBillingLoading(true);
                              setBillingSuccess("");
                              setBillingError("");
                              try {
                                const res = await fetch("/api/billing/cancel", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ userId: user.id })
                                });
                                const data = await res.json();
                                if (data.success) {
                                  setBillingSuccess("Sua renovação automática foi cancelada. Seu acesso Premium continuará ativo até o vencimento.");
                                  onUpdateUser(data.user);
                                } else {
                                  setBillingError(data.error || "Falha ao cancelar assinatura.");
                                }
                              } catch (err) {
                                setBillingError("Erro de conexão ao cancelar assinatura.");
                              } finally {
                                setBillingLoading(false);
                              }
                            }
                          }}
                          className="px-4 py-2 bg-red-950/30 border border-red-900/30 hover:bg-red-900/20 text-red-400 font-bold text-xs rounded-xl transition cursor-pointer disabled:opacity-40"
                        >
                          {billingLoading ? "Processando..." : "Cancelar Assinatura (Interromper Renovação)"}
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Free Plan / Pitch Card */}
                    <div className="border border-zinc-800 bg-zinc-900/30 rounded-2xl p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="space-y-2">
                        <span className="bg-zinc-800 text-zinc-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          Plano Gratuito
                        </span>
                        <h4 className="text-lg font-serif font-bold text-zinc-100">
                          Acesse todo o potencial do BookVerse
                        </h4>
                        <p className="text-xs text-zinc-400 max-w-md">
                          Os membros Premium possuem acesso ilimitado a Audiobooks e Narração por Voz, downloads offline de livros e análises avançadas com gráficos reais de leitura.
                        </p>
                      </div>

                      <div className="shrink-0 flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            id="interval-monthly"
                            name="billing-interval"
                            checked={requestIntervalSetting === "monthly"}
                            onChange={() => setRequestIntervalSetting("monthly")}
                            className="text-[#e2b874] focus:ring-0"
                          />
                          <label htmlFor="interval-monthly" className="text-xs text-zinc-200 cursor-pointer">
                            Mensal - <span className="font-bold text-[#e2b874]">R$ 9,99/mês</span>
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            id="interval-yearly"
                            name="billing-interval"
                            checked={requestIntervalSetting === "yearly"}
                            onChange={() => setRequestIntervalSetting("yearly")}
                            className="text-[#e2b874] focus:ring-0"
                          />
                          <label htmlFor="interval-yearly" className="text-xs text-zinc-200 cursor-pointer">
                            Anual - <span className="font-bold text-[#e2b874]">R$ 89,99/ano</span> (Economize!)
                          </label>
                        </div>

                        <button
                          onClick={() => {
                            if (onTriggerPaywall) {
                              onTriggerPaywall("generic", requestIntervalSetting);
                            }
                          }}
                          className="mt-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-zinc-950 font-bold text-xs rounded-xl shadow-lg transition duration-200 cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          Solicitar Plano Premium
                        </button>
                      </div>
                    </div>

                    {/* Premium Upgrade Request History */}
                    {billingRequests.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-serif font-bold text-zinc-200">
                          Histórico de Solicitações de Plano Premium
                        </h4>
                        <div className="space-y-2">
                          {billingRequests.map((req: any) => (
                            <div
                              key={req.id}
                              className="bg-zinc-900/60 border border-zinc-850 p-4 rounded-xl flex items-center justify-between text-xs"
                            >
                              <div>
                                <p className="font-bold text-zinc-100">
                                  Upgrade para Plano PREMIUM
                                </p>
                                <p className="text-[10px] text-zinc-500 mt-0.5">
                                  Faturamento: {req.billingInterval === "yearly" ? "Anual (R$ 89,99)" : "Mensal (R$ 9,99)"} • Enviado em: {new Date(req.createdAt).toLocaleString("pt-BR")}
                                </p>
                              </div>
                              <div>
                                <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] border ${
                                  req.status === "pending"
                                    ? "bg-amber-950/20 text-amber-400 border-amber-900/30 animate-pulse"
                                    : req.status === "approved"
                                    ? "bg-emerald-950/20 text-emerald-400 border-emerald-900/30"
                                    : "bg-red-950/20 text-red-400 border-red-900/30"
                                }`}>
                                  {req.status === "pending" && "Pendente de Aprovação"}
                                  {req.status === "approved" && "Aprovado / Ativo"}
                                  {req.status === "rejected" && "Recusado pelo Admin"}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* MODAL 1: Logout confirm */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-xs" onClick={() => setShowLogoutConfirm(false)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#121214] border border-zinc-800 rounded-2xl max-w-sm w-full p-6 relative z-10 text-center"
            >
              <LogOut className="w-10 h-10 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-serif font-bold text-zinc-100">Encerrar sessão?</h3>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                Você precisará fazer login com seu e-mail e senha cadastrados para acessar novamente seu progresso no BookVerse.
              </p>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 py-2.5 rounded-xl text-xs font-bold border border-zinc-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setShowLogoutConfirm(false);
                    onLogout();
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Confirmar Saída
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Delete Account security check */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/85 backdrop-blur-xs" onClick={() => setShowDeleteConfirm(false)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#121214] border border-zinc-800 rounded-3xl max-w-md w-full p-6 md:p-8 relative z-10"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2 text-red-500">
                  <AlertTriangle className="w-5 h-5" />
                  <h3 className="text-base font-serif font-bold">Exclusão Permanente de Conta</h3>
                </div>
                <button onClick={() => setShowDeleteConfirm(false)} className="text-zinc-500 hover:text-zinc-300">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed mb-5">
                Esta ação apagará de forma irreversível todos os seus dados cadastrados, estatísticas, notas feitas e históricos do BookVerse. Não é possível reverter essa remoção.
              </p>

              {deleteError && (
                <div className="p-3 bg-red-950/40 border border-red-800/40 text-red-400 text-xs rounded-xl flex items-center gap-1.5 mb-4">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  {deleteError}
                </div>
              )}

              <div className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="block text-zinc-300 font-semibold">
                    Para confirmar, digite seu e-mail cadastrado (<span className="text-[#e2b874] font-mono select-all">{user.email}</span>):
                  </label>
                  <input
                    type="email"
                    value={deleteEmailConfirm}
                    onChange={(e) => setDeleteEmailConfirm(e.target.value)}
                    placeholder={user.email}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-3.5 text-zinc-200 outline-none focus:border-red-600 font-bold transition"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-grow bg-zinc-900 hover:bg-zinc-800 text-zinc-300 py-3 rounded-xl font-bold border border-zinc-800 transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    className="flex-grow bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold transition active:scale-95 cursor-pointer"
                  >
                    Excluir Permanentemente
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: Contact Support */}
      <ContactSupportModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
        user={user}
      />
    </div>
  );
}
