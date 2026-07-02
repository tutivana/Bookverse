import React, { useState, useEffect } from "react";
import { 
  getDownloadedBooksMeta, 
  deleteBookOffline, 
  clearAllDownloads, 
  getPendingProgressList, 
  getPendingReviewsList,
  deletePendingProgress,
  deletePendingReview
} from "../lib/offlineStore";
import { saveReadingProgress, submitReview } from "../lib/api";
import { 
  Download, 
  Trash2, 
  RefreshCw, 
  CheckCircle, 
  Database, 
  Wifi, 
  WifiOff, 
  BookOpen, 
  Star 
} from "lucide-react";
import { BookNotification } from "../types";

interface OfflineManagerProps {
  userId: string;
  onRefreshLibrary?: () => void;
  onNavigateToReader?: (bookId: string) => void;
}

export default function OfflineManager({ userId, onRefreshLibrary, onNavigateToReader }: OfflineManagerProps) {
  const [downloadedMeta, setDownloadedMeta] = useState<any[]>([]);
  const [pendingProgress, setPendingProgress] = useState<any[]>([]);
  const [pendingReviews, setPendingReviews] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

  // Load downloads metadata and pending items
  const loadData = async () => {
    try {
      const meta = await getDownloadedBooksMeta();
      setDownloadedMeta(meta);

      const pProgress = await getPendingProgressList();
      setPendingProgress(pProgress);

      const pReviews = await getPendingReviewsList();
      setPendingReviews(pReviews);
    } catch (err) {
      console.error("Erro ao carregar dados offline:", err);
    }
  };

  useEffect(() => {
    loadData();

    const handleOnline = () => {
      setIsOnline(true);
      autoSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Format bytes to MB
  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 MB";
    const mb = bytes / (1024 * 1024);
    return mb.toFixed(2) + " MB";
  };

  // Total space used
  const totalBytes = downloadedMeta.reduce((acc, b) => acc + (b.sizeBytes || 0), 0);

  // Delete single download
  const handleDelete = async (bookId: string) => {
    if (confirm("Deseja remover este livro do seu armazenamento offline?")) {
      await deleteBookOffline(bookId);
      await loadData();
      if (onRefreshLibrary) onRefreshLibrary();
    }
  };

  // Clear all downloads
  const handleClearAll = async () => {
    if (confirm("Tem certeza que deseja apagar TODOS os livros baixados offline?")) {
      await clearAllDownloads();
      await loadData();
      if (onRefreshLibrary) onRefreshLibrary();
    }
  };

  // Sync handler
  const handleSync = async () => {
    if (!isOnline) {
      alert("Você está desconectado. Conecte-se à internet para sincronizar seus dados.");
      return;
    }
    setIsSyncing(true);
    setSyncStatus("Sincronizando dados pendentes...");

    try {
      // 1. Sync reading progress
      const pProgress = await getPendingProgressList();
      let syncProgressSuccessCount = 0;
      for (const progress of pProgress) {
        if (progress.userId === userId) {
          await saveReadingProgress(
            progress.userId,
            progress.bookId,
            progress.lastPage,
            progress.audioPositionSeconds
          );
          await deletePendingProgress(progress.bookId);
          syncProgressSuccessCount++;
        }
      }

      // 2. Sync reviews / comments
      const pReviews = await getPendingReviewsList();
      let syncReviewsSuccessCount = 0;
      for (const r of pReviews) {
        if (r.userId === userId) {
          await submitReview(r.userId, r.bookId, r.rating, r.comment);
          await deletePendingReview(r.id);
          syncReviewsSuccessCount++;
        }
      }

      await loadData();
      setSyncStatus(`Sincronização concluída! ${syncProgressSuccessCount} progressos e ${syncReviewsSuccessCount} avaliações atualizados.`);
      setTimeout(() => setSyncStatus(null), 5000);
    } catch (err) {
      console.error("Erro na sincronização:", err);
      setSyncStatus("Houve um erro durante a sincronização dos dados.");
    } finally {
      setIsSyncing(false);
    }
  };

  const autoSync = () => {
    // Only auto sync if there's actual pending data
    getPendingProgressList().then((p) => {
      getPendingReviewsList().then((r) => {
        if (p.length > 0 || r.length > 0) {
          handleSync();
        }
      });
    });
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-serif font-bold text-zinc-100 flex items-center gap-2">
            <Download className="w-5 h-5 text-[#e2b874]" />
            Leitura Offline & Sincronização
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Gerencie seus livros baixados para ler sem internet e sincronize seu progresso.
          </p>
        </div>

        {/* CONNECTION STATUS BADGE */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold border transition-colors ${
          isOnline 
            ? "bg-emerald-950/20 border-emerald-900/30 text-emerald-400" 
            : "bg-amber-950/20 border-amber-900/30 text-amber-400"
        }`}>
          {isOnline ? (
            <>
              <Wifi className="w-3.5 h-3.5" />
              CONECTADO
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5" />
              MODO OFFLINE
            </>
          )}
        </div>
      </div>

      {/* STORAGE & SYNC STATS BENTO GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Used Space */}
        <div className="p-5 bg-zinc-900/40 border border-zinc-850 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-[#e2b874]/10 rounded-xl text-[#e2b874]">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-zinc-500 block uppercase font-bold tracking-wider">Espaço Utilizado</span>
            <span className="text-lg font-serif font-bold text-zinc-100">{formatSize(totalBytes)}</span>
            <span className="text-[9px] text-zinc-500 block mt-0.5">{downloadedMeta.length} livros salvos</span>
          </div>
        </div>

        {/* Card 2: Pending Syncs */}
        <div className="p-5 bg-zinc-900/40 border border-zinc-850 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-[#8a7e58]/10 rounded-xl text-[#8a7e58]">
            <RefreshCw className={`w-5 h-5 ${isSyncing ? "animate-spin" : ""}`} />
          </div>
          <div>
            <span className="text-[10px] text-zinc-500 block uppercase font-bold tracking-wider">Sincronizações Pendentes</span>
            <span className="text-lg font-serif font-bold text-zinc-100">
              {pendingProgress.length + pendingReviews.length} itens
            </span>
            <span className="text-[9px] text-zinc-500 block mt-0.5">
              {pendingProgress.length} progressos | {pendingReviews.length} avaliações
            </span>
          </div>
        </div>

        {/* Card 3: Sync Trigger */}
        <div className="p-5 bg-zinc-900/40 border border-zinc-850 rounded-2xl flex flex-col justify-center">
          <button
            onClick={handleSync}
            disabled={isSyncing || !isOnline}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 border ${
              !isOnline
                ? "bg-zinc-950/40 border-zinc-900 text-zinc-600 cursor-not-allowed"
                : "bg-[#e2b874] hover:bg-[#d4a863] border-[#e2b874] text-zinc-950 cursor-pointer shadow-lg active:scale-95"
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            Sincronizar Agora
          </button>
          <span className="text-[9px] text-zinc-500 text-center block mt-2">
            {isOnline ? "A sincronização ocorre automaticamente ao voltar online" : "Aguardando conexão com a internet..."}
          </span>
        </div>
      </div>

      {/* SYNC NOTIFICATIONS */}
      {syncStatus && (
        <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-xs text-zinc-300 flex items-center gap-2 animate-fadeIn">
          <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{syncStatus}</span>
        </div>
      )}

      {/* DOWNLOADED BOOKS LIST */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-xs uppercase font-bold text-zinc-400 tracking-wider">Livros Disponíveis Offline</h3>
          {downloadedMeta.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-[10px] text-red-400 hover:text-red-300 font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              Excluir todos
            </button>
          )}
        </div>

        {downloadedMeta.length === 0 ? (
          <div className="p-12 text-center bg-zinc-950/20 border border-zinc-900 rounded-2xl space-y-2">
            <Download className="w-8 h-8 text-zinc-700 mx-auto" />
            <p className="text-zinc-500 text-xs font-medium">Você ainda não possui livros salvos offline.</p>
            <p className="text-[10px] text-zinc-600">Explore o catálogo e clique em "Baixar" nos detalhes de qualquer livro.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {downloadedMeta.map((book) => (
              <div 
                key={book.id} 
                className="p-3.5 bg-zinc-900/20 border border-zinc-850 rounded-2xl flex justify-between items-center gap-4 hover:border-zinc-800 transition"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <img 
                    src={book.coverUrl} 
                    alt={book.title} 
                    className="w-12 h-16 object-cover rounded-lg border border-zinc-850 flex-shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="text-left overflow-hidden">
                    <h4 className="font-serif font-bold text-xs text-zinc-100 truncate">{book.title}</h4>
                    <p className="text-[10px] text-zinc-400 truncate mt-0.5">{book.author}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[9px] text-zinc-500 font-mono bg-zinc-900/50 border border-zinc-850 px-1.5 py-0.5 rounded">
                        {formatSize(book.sizeBytes)}
                      </span>
                      <span className="text-[9px] text-zinc-500">
                        Baixado em {new Date(book.downloadedAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {onNavigateToReader && (
                    <button
                      onClick={() => onNavigateToReader(book.id)}
                      className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 text-[#e2b874] rounded-xl transition cursor-pointer"
                      title="Abrir livro no Leitor"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(book.id)}
                    className="p-2 bg-zinc-900 hover:bg-red-950/20 border border-zinc-850 hover:border-red-900/20 text-zinc-500 hover:text-red-400 rounded-xl transition cursor-pointer"
                    title="Excluir livro baixado"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
