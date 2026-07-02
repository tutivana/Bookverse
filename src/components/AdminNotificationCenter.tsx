import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Bell, 
  Megaphone, 
  Send, 
  ShieldAlert, 
  Check, 
  Trash2, 
  AlertTriangle, 
  Info, 
  UserPlus, 
  Cpu, 
  HardDrive, 
  FileWarning, 
  Activity, 
  RefreshCw,
  PlusCircle
} from "lucide-react";
import { BookNotification, User } from "../types";
import { 
  fetchAdminNotifications, 
  markSingleNotificationAsRead, 
  deleteNotification, 
  sendAdminBroadcastNotification 
} from "../lib/api";

interface AdminNotificationCenterProps {
  adminUser: User;
  onNavigate: (view: string) => void;
}

export default function AdminNotificationCenter({ adminUser, onNavigate }: AdminNotificationCenterProps) {
  const [notifications, setNotifications] = useState<BookNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Broadcast campaign form state
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("platform_announcement");
  const [priority, setPriority] = useState("medium");
  const [destination, setDestination] = useState("library");
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);

  // Load notifications from server
  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAdminNotifications();
      // Sort cronologically desc
      const sorted = [...data].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setNotifications(sorted);
    } catch (err) {
      console.error(err);
      setError("Erro ao carregar notificações administrativas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await markSingleNotificationAsRead(id, adminUser.id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNotification(id, adminUser.id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    try {
      setSending(true);
      setSendSuccess(null);
      await sendAdminBroadcastNotification(adminUser.id, {
        title: title.trim(),
        message: message.trim(),
        category,
        priority,
        destinationLink: destination
      });

      setSendSuccess("Transmissão enviada com sucesso para todos os usuários cadastrados!");
      setTitle("");
      setMessage("");
      setTimeout(() => setSendSuccess(null), 5000);
    } catch (err) {
      console.error(err);
      alert("Erro ao enviar transmissão de notificações.");
    } finally {
      setSending(false);
    }
  };

  // Helper to trigger simulated administrative events on demand
  const handleTriggerMockAdminEvent = async (eventKey: string) => {
    let mockParams: any = {};
    
    switch (eventKey) {
      case "review":
        mockParams = {
          title: "Novo Livro Enviado para Revisão",
          message: 'O livro "A Odisséia" foi enviado para revisão pelo usuário. Status atualizado para Pendente.',
          category: "admin_new_book_review",
          priority: "medium",
          icon: "book-open",
          destinationLink: "admin:books"
        };
        break;
      case "report":
        mockParams = {
          title: "Livro Denunciado",
          message: 'O livro "Memórias Póstumas de Brás Cubas" recebeu uma queixa de direitos autorais por "Tuto José".',
          category: "admin_book_reported",
          priority: "high",
          icon: "alert-triangle",
          destinationLink: "admin:reports"
        };
        break;
      case "invalid_file":
        mockParams = {
          title: "Falha de Upload: Arquivo Inválido",
          message: "O upload tentado no painel falhou pois o tipo de arquivo '.exe' não é aceito. Apenas PDF é suportado.",
          category: "admin_invalid_file",
          priority: "high",
          icon: "file-warning",
          destinationLink: "admin:books"
        };
        break;
      case "new_admin":
        mockParams = {
          title: "Novo Administrador Criado",
          message: "O usuário 'Mariana Mendes' foi promovido à função de Moderadora pelo Super Administrador.",
          category: "admin_new_admin_created",
          priority: "medium",
          icon: "user-plus",
          destinationLink: "admin:users"
        };
        break;
      case "critical_error":
        mockParams = {
          title: "Erro Crítico: Falha de TTS",
          message: "O sintetizador de voz Gemini API retornou erro status 429 quota excedida durante geração de áudio.",
          category: "admin_critical_error",
          priority: "high",
          icon: "cpu",
          destinationLink: "admin:logs"
        };
        break;
      case "storage":
        mockParams = {
          title: "Aviso de Armazenamento",
          message: "O espaço de armazenamento para PDFs e áudios está em 92% da capacidade limite contratada.",
          category: "admin_storage_warning",
          priority: "high",
          icon: "hard-drive",
          destinationLink: "admin:logs"
        };
        break;
      case "sync_failure":
        mockParams = {
          title: "Falha de Sincronização",
          message: "Houve uma interrupção temporária na sincronização de estatísticas diárias com o servidor de persistência.",
          category: "admin_sync_failure",
          priority: "medium",
          icon: "activity",
          destinationLink: "admin:logs"
        };
        break;
    }

    try {
      // Post on notifications/admin directly or via fetch / API. Let's send a post request.
      const res = await fetch("/api/notifications/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminId: adminUser.id,
          title: `[SISTEMA] ${mockParams.title}`,
          message: mockParams.message,
          category: mockParams.category,
          priority: mockParams.priority,
          destinationLink: mockParams.destinationLink
        })
      });
      if (!res.ok) throw new Error();
      
      // Also inject a custom record specifically into our admin notification pool on server side!
      // Since broadcast pushes to all users, let's trigger an exclusive notification specifically for the "admin" user target!
      const resAdmin = await fetch("/api/books/demo-user/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: adminUser.id,
          reason: mockParams.title,
          description: mockParams.message
        })
      });

      loadNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  // Helper to map icon components
  const getAdminIcon = (category: string) => {
    switch (category) {
      case "admin_new_book_review":
        return { icon: Info, bg: "bg-blue-500/10 border-blue-500/20 text-blue-400" };
      case "admin_book_reported":
        return { icon: AlertTriangle, bg: "bg-red-500/10 border-red-500/20 text-red-400" };
      case "admin_invalid_file":
        return { icon: FileWarning, bg: "bg-orange-500/10 border-orange-500/20 text-orange-400" };
      case "admin_new_admin_created":
        return { icon: UserPlus, bg: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400" };
      case "admin_critical_error":
        return { icon: Cpu, bg: "bg-red-950 border-red-900/40 text-red-400" };
      case "admin_storage_warning":
        return { icon: HardDrive, bg: "bg-amber-500/10 border-amber-500/20 text-amber-400" };
      case "admin_sync_failure":
        return { icon: Activity, bg: "bg-purple-500/10 border-purple-500/20 text-purple-400" };
      default:
        return { icon: ShieldAlert, bg: "bg-zinc-800 border-zinc-700 text-zinc-400" };
    }
  };

  return (
    <div className="space-y-8" id="admin-notif-center-container">
      {/* Introduction banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-zinc-950/40 border border-zinc-900 rounded-2xl">
        <div className="space-y-1">
          <h4 className="font-serif font-bold text-zinc-100 text-base flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-400" />
            Central de Notificações de Administradores
          </h4>
          <p className="text-zinc-400 text-xs max-w-xl leading-relaxed">
            Área restrita de controle e monitoramento. Receba relatórios de eventos críticos de hardware, uploads de livros, denúncias de conteúdo e envie comunicados globais via Push/In-App para todos os leitores cadastrados.
          </p>
        </div>

        <button
          onClick={loadNotifications}
          disabled={loading}
          className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs text-zinc-300 font-bold transition flex items-center gap-2 shrink-0 cursor-pointer disabled:opacity-55"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#e2b874]" : ""}`} />
          Atualizar Painel
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Admin Notifications Logs (8 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h5 className="font-serif font-bold text-zinc-200 text-sm">Alertas & logs de Eventos ({notifications.length})</h5>
            <span className="text-[10px] text-zinc-500 font-mono">Moderação ativa</span>
          </div>

          {/* Trigger mock events utilities */}
          <div className="p-4 bg-zinc-900/30 border border-zinc-850 rounded-xl space-y-3">
            <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <PlusCircle className="w-3.5 h-3.5 text-[#e2b874]" />
              Simular Eventos do Sistema (Para testes rápidos)
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: "review", label: "Novo Livro Pendente" },
                { key: "report", label: "Livro Denunciado" },
                { key: "invalid_file", label: "Arquivo Inválido" },
                { key: "new_admin", label: "Novo Moderador" },
                { key: "critical_error", label: "Erro de TTS API" },
                { key: "storage", label: "Espaço em Disco" },
                { key: "sync_failure", label: "Falha de Sinc" }
              ].map(mock => (
                <button
                  key={mock.key}
                  onClick={() => handleTriggerMockAdminEvent(mock.key)}
                  className="px-2.5 py-1.5 bg-[#121214] hover:bg-zinc-800 border border-zinc-800 rounded-lg text-[10px] text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
                >
                  {mock.label}
                </button>
              ))}
            </div>
          </div>

          {/* List of alerts */}
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-10 border border-zinc-800 border-dashed rounded-2xl text-center space-y-2">
                <Bell className="w-10 h-10 text-zinc-700 mx-auto" />
                <span className="text-xs text-zinc-400 font-medium block">Nenhum evento pendente na fila</span>
                <p className="text-[10px] text-zinc-500 max-w-xs mx-auto">Use os botões acima para simular os eventos administrativos que este painel monitora.</p>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {notifications.map((notif) => {
                  const { icon: IconComp, bg } = getAdminIcon(notif.category);
                  return (
                    <motion.div
                      key={notif.id}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, x: -30 }}
                      className={`p-4 rounded-xl border flex gap-3.5 relative group ${
                        notif.read 
                          ? "bg-zinc-900/10 border-zinc-900" 
                          : "bg-red-950/5 border-red-900/20 hover:border-red-900/40"
                      }`}
                    >
                      {/* Icon */}
                      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${bg}`}>
                        <IconComp className="w-5 h-5" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          {notif.priority === "high" && (
                            <span className="px-1.5 py-0.5 bg-red-950 border border-red-900/40 text-red-400 text-[8px] font-mono rounded uppercase font-bold">
                              Alta Prioridade
                            </span>
                          )}
                          <h6 className="text-xs font-bold text-zinc-200">{notif.title}</h6>
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed font-medium">{notif.message}</p>
                        <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-mono pt-1">
                          <span>{new Date(notif.createdAt).toLocaleDateString()} às {new Date(notif.createdAt).toLocaleTimeString()}</span>
                          {notif.destinationLink && (
                            <button
                              onClick={() => {
                                const target = notif.destinationLink?.split(":")[1] || "books";
                                onNavigate(target);
                              }}
                              className="text-[#e2b874] hover:underline font-bold"
                            >
                              Acessar Módulo &rarr;
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Hover action buttons */}
                      <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 flex items-center gap-1 transition">
                        {!notif.read && (
                          <button
                            onClick={() => handleMarkRead(notif.id)}
                            className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 border border-zinc-800 rounded-lg transition"
                            title="Marcar como lida"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(notif.id)}
                          className="p-1.5 bg-zinc-900 hover:bg-red-950/30 text-zinc-400 hover:text-red-400 border border-zinc-800 rounded-lg transition"
                          title="Excluir log"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Right Column: Broadcast campaign center (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <h5 className="font-serif font-bold text-zinc-200 text-sm flex items-center gap-1.5">
            <Megaphone className="w-4 h-4 text-[#e2b874]" />
            Transmissão de Mensagem (Massa)
          </h5>

          <form onSubmit={handleBroadcast} className="bg-[#121214] border border-zinc-850 rounded-2xl p-5 space-y-4">
            {sendSuccess && (
              <div className="p-3.5 bg-emerald-950/30 border border-emerald-900/40 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                {sendSuccess}
              </div>
            )}

            {/* Campaign title */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Título da Notificação</label>
              <input
                type="text"
                required
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 px-3.5 text-xs text-zinc-100 outline-none focus:bg-zinc-800 focus:ring-1 focus:ring-[#e2b874] font-bold"
                placeholder="Ex: Manutenção no Sistema Programada"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Campaign message */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Mensagem Principal</label>
              <textarea
                required
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 px-3.5 text-xs text-zinc-200 outline-none focus:bg-zinc-800 focus:ring-1 focus:ring-[#e2b874] h-24 resize-none leading-relaxed font-medium"
                placeholder="Escreva a mensagem que os leitores receberão na central e por push..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Category selector */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase block">Categoria</label>
                <select
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 px-3.5 text-xs text-zinc-200 outline-none focus:bg-zinc-800 focus:ring-1 focus:ring-[#e2b874]"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="platform_announcement">Novidades / Comunicados</option>
                  <option value="recommendations">Recomendação do Editor</option>
                  <option value="new_book">Lançamento Especial</option>
                </select>
              </div>

              {/* Priority level */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase block">Prioridade</label>
                <select
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 px-3.5 text-xs text-zinc-200 outline-none focus:bg-zinc-800 focus:ring-1 focus:ring-[#e2b874]"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta (Urgente)</option>
                </select>
              </div>
            </div>

            {/* Quick destination link helper */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase block">Destino de Toque (Redirecionar)</label>
              <select
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 px-3.5 text-xs text-zinc-200 outline-none focus:bg-zinc-800 focus:ring-1 focus:ring-[#e2b874]"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              >
                <option value="library">Biblioteca (Início)</option>
                <option value="settings">Configurações de Perfil</option>
                <option value="stats">Estatísticas do Leitor</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={sending || !title.trim() || !message.trim()}
              className="w-full bg-[#e2b874] hover:bg-[#c59e5f] text-zinc-950 font-bold py-3 rounded-xl text-xs transition active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-55 cursor-pointer"
            >
              <Send className="w-4 h-4 shrink-0" />
              {sending ? "Disparando Mensagens..." : "Disparar Transmissão Global"}
            </button>
          </form>

          <div className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-2xl text-[11px] text-zinc-500 leading-relaxed flex gap-2">
            <Info className="w-4 h-4 shrink-0 text-[#e2b874] mt-0.5" />
            <span>
              Ao clicar em <strong>Disparar Transmissão Global</strong>, a mensagem será instantaneamente cadastrada no banco para 100% dos usuários e transmitida por FCM Push aos múltiplos dispositivos vinculados a cada conta.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
