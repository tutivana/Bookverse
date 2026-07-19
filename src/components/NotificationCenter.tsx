import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Trash2, 
  BookOpen, 
  Headphones, 
  MessageSquare, 
  User, 
  Shield, 
  Activity, 
  Megaphone, 
  AlertTriangle, 
  X, 
  ChevronRight, 
  Info,
  RefreshCw
} from "lucide-react";
import { BookNotification } from "../types";
import { 
  fetchNotifications, 
  markSingleNotificationAsRead, 
  markNotificationsAsRead, 
  deleteNotification 
} from "../lib/api";

interface NotificationCenterProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (destination?: string, bookId?: string) => void;
  onUpdateCount?: (unreadCount: number) => void;
}

export default function NotificationCenter({ 
  userId, 
  isOpen, 
  onClose, 
  onNavigate,
  onUpdateCount 
}: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<BookNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visibleLimit, setVisibleLimit] = useState(5);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchNotifications(userId);
      // Sort cronologically desc
      const sorted = [...data].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setNotifications(sorted);
      
      const unreadCount = sorted.filter(n => !n.read).length;
      if (onUpdateCount) onUpdateCount(unreadCount);
    } catch (err: any) {
      const isNetworkErr = err && (
        err.name === "TypeError" || 
        err.message?.includes("fetch") || 
        err.message?.includes("NetworkError") || 
        err.message?.includes("Failed to fetch")
      );
      if (isNetworkErr) {
        console.warn("Transient network connection warning when fetching notifications in NotificationCenter:", err.message || err);
      } else {
        setError("Erro ao carregar notificações.");
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      loadNotifications();
      // Auto-refresh every 10 seconds to simulate real-time notification push!
      const interval = setInterval(loadNotifications, 10000);
      return () => clearInterval(interval);
    }
  }, [userId]);

  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await markSingleNotificationAsRead(id, userId);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n));
      const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
      if (onUpdateCount) onUpdateCount(updated.filter(n => !n.read).length);
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markNotificationsAsRead(userId);
      setNotifications(prev => prev.map(n => ({ ...n, read: true, readAt: new Date().toISOString() })));
      if (onUpdateCount) onUpdateCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // prevent triggering navigation
    try {
      await deleteNotification(id, userId);
      const updated = notifications.filter(n => n.id !== id);
      setNotifications(updated);
      if (onUpdateCount) onUpdateCount(updated.filter(n => !n.read).length);
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = async (notif: BookNotification) => {
    if (!notif.read) {
      await handleMarkAsRead(notif.id);
    }
    onClose();
    onNavigate(notif.destinationLink, notif.bookId);
  };

  // Helper to retrieve category icon and colors
  const getCategoryTheme = (category: string, type: string) => {
    switch (category) {
      case "welcome":
        return { icon: User, bg: "bg-blue-500/10 border-blue-500/30 text-blue-400" };
      case "new_device_login":
      case "security_updated":
        return { icon: Shield, bg: "bg-rose-500/10 border-rose-500/30 text-rose-400" };
      case "email_updated":
        return { icon: Info, bg: "bg-purple-500/10 border-purple-500/30 text-purple-400" };
      case "book_approved":
      case "book_available":
      case "new_book":
        return { icon: BookOpen, bg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" };
      case "audiobook_added":
        return { icon: Headphones, bg: "bg-indigo-500/10 border-indigo-500/30 text-indigo-400" };
      case "comment_reply":
        return { icon: MessageSquare, bg: "bg-amber-500/10 border-amber-500/30 text-[#e2b874]" };
      case "admin_book_reported":
        return { icon: AlertTriangle, bg: "bg-red-500/10 border-red-500/30 text-red-400" };
      case "platform_announcement":
        return { icon: Megaphone, bg: "bg-violet-500/10 border-violet-500/30 text-violet-400" };
      default:
        // Use general types if no specific category match
        if (type === "admin") {
          return { icon: AlertTriangle, bg: "bg-red-500/10 border-red-500/30 text-red-400" };
        }
        return { icon: Bell, bg: "bg-zinc-800 border-zinc-700 text-zinc-400" };
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
            id="notif-backdrop"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative w-full max-w-md h-full bg-[#0d0d0f] border-l border-zinc-800 shadow-2xl flex flex-col z-10"
            id="notif-panel"
          >
            {/* Header */}
            <div className="p-5 border-b border-zinc-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl">
                  <Bell className="w-5 h-5 text-[#e2b874]" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-zinc-100 text-base">Notificações</h3>
                  <p className="text-[11px] text-zinc-400">
                    {unreadCount > 0 
                      ? `${unreadCount} não ${unreadCount === 1 ? 'lida' : 'lidas'}` 
                      : "Tudo atualizado"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={loadNotifications}
                  disabled={loading}
                  className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
                  title="Atualizar"
                  id="notif-refresh"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#e2b874]" : ""}`} />
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
                  id="notif-close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            {notifications.length > 0 && (
              <div className="px-5 py-3 bg-zinc-900/30 border-b border-zinc-800/60 flex items-center justify-between text-xs">
                <button
                  onClick={handleMarkAllRead}
                  className="text-[#e2b874] hover:text-[#f3cd8f] font-bold flex items-center gap-1.5 cursor-pointer transition"
                  id="notif-mark-all"
                >
                  <CheckCheck className="w-4 h-4" />
                  Marcar todas como lidas
                </button>
                <span className="text-[10px] text-zinc-500 font-mono">
                  {notifications.length} total
                </span>
              </div>
            )}

            {/* Body / List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
              {error && (
                <div className="p-4 bg-red-950/30 border border-red-900/30 text-red-400 text-xs rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              {loading && notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-3">
                  <div className="w-8 h-8 border-2 border-[#e2b874] border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-zinc-400 font-medium">Buscando suas notificações...</span>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center px-6">
                  <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center text-zinc-600 mb-4">
                    <Bell className="w-8 h-8" />
                  </div>
                  <h4 className="text-zinc-300 font-bold text-sm">Nenhuma notificação por aqui</h4>
                  <p className="text-zinc-500 text-xs mt-1.5 max-w-xs">
                    Nós avisaremos você quando novos livros chegarem ou quando houver atualizações na sua conta.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <AnimatePresence initial={false}>
                    {notifications.slice(0, visibleLimit).map((notif) => {
                      const { icon: CategoryIcon, bg } = getCategoryTheme(notif.category, notif.type);
                      return (
                        <motion.div
                          key={notif.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -50 }}
                          onClick={() => handleNotificationClick(notif)}
                          className={`group relative p-4 rounded-xl border transition cursor-pointer flex gap-3.5 ${
                            notif.read 
                              ? "bg-zinc-900/20 border-zinc-900 hover:bg-zinc-900/30" 
                              : "bg-[#121215] border-zinc-800 hover:border-zinc-700/80 hover:bg-[#15151a]"
                          }`}
                          id={`notif-item-${notif.id}`}
                        >
                          {/* Unread dot indicator */}
                          {!notif.read && (
                            <span className="absolute top-4 right-4 w-2 h-2 bg-amber-400 rounded-full" />
                          )}

                          {/* Category Icon */}
                          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${bg}`}>
                            <CategoryIcon className="w-5 h-5" />
                          </div>

                          {/* Details */}
                          <div className="flex-1 space-y-1 pr-6">
                            <div className="flex items-center gap-1.5">
                              {notif.priority === "high" && (
                                <span className="px-1.5 py-0.5 bg-red-950 border border-red-900/40 text-red-400 text-[8px] font-mono rounded uppercase">
                                  Urgente
                                </span>
                              )}
                              <h5 className={`text-xs font-bold transition ${notif.read ? "text-zinc-400" : "text-zinc-200 group-hover:text-zinc-100"}`}>
                                {notif.title}
                              </h5>
                            </div>
                            <p className={`text-xs leading-relaxed ${notif.read ? "text-zinc-500 font-normal" : "text-zinc-400 font-medium"}`}>
                              {notif.message}
                            </p>
                            <span className="block text-[10px] text-zinc-500 font-mono pt-1">
                              {new Date(notif.createdAt).toLocaleDateString("pt-BR")} às {new Date(notif.createdAt).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          {/* Hover action buttons */}
                          <div className="absolute right-3 bottom-3 opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-all duration-200">
                            {!notif.read && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkAsRead(notif.id);
                                }}
                                className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-[#e2b874] border border-zinc-800 rounded-lg transition"
                                title="Marcar como lida"
                                id={`notif-mark-read-${notif.id}`}
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={(e) => handleDelete(e, notif.id)}
                              className="p-1.5 bg-zinc-900 hover:bg-red-950/40 text-zinc-400 hover:text-red-400 border border-zinc-800 hover:border-red-900/30 rounded-lg transition"
                              title="Excluir notificação"
                              id={`notif-delete-${notif.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  {/* Pagination button */}
                  {notifications.length > visibleLimit && (
                    <button
                      onClick={() => setVisibleLimit(prev => prev + 5)}
                      className="w-full text-center py-3 border border-dashed border-zinc-800 rounded-xl text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-900/10 hover:bg-zinc-900/20 font-bold transition cursor-pointer"
                      id="notif-load-more"
                    >
                      Carregar mais notificações
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
