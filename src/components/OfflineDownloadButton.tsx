import React, { useState, useEffect } from "react";
import { saveBookOffline, getBookOffline, deleteBookOffline, getDownloadedBooksMeta } from "../lib/offlineStore";
import { Download, Check, AlertCircle, Loader2, Trash2, Pause } from "lucide-react";
import { Book } from "../types";

interface OfflineDownloadButtonProps {
  book: Book;
  onStateChange?: (state: "idle" | "downloading" | "downloaded" | "paused" | "error") => void;
  className?: string;
  isPremium?: boolean;
  onTriggerPaywall?: () => void;
  iconOnly?: boolean;
  variant?: "default" | "large";
}

type DownloadState = "idle" | "downloading" | "downloaded" | "paused" | "error";

export default function OfflineDownloadButton({
  book,
  onStateChange,
  className = "",
  isPremium = false,
  onTriggerPaywall,
  iconOnly = false,
  variant = "default"
}: OfflineDownloadButtonProps) {
  const [downloadState, setDownloadState] = useState<DownloadState>("idle");
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    checkDownloadStatus();
  }, [book.id]);

  const checkDownloadStatus = async () => {
    try {
      const offlineBook = await getBookOffline(book.id);
      if (offlineBook) {
        updateState("downloaded");
      } else {
        updateState("idle");
      }
    } catch (err) {
      console.error("Erro ao verificar status offline:", err);
      updateState("idle");
    }
  };

  const updateState = (state: DownloadState) => {
    setDownloadState(state);
    if (onStateChange) onStateChange(state);
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (downloadState === "downloading") {
      updateState("paused");
      return;
    }
    if (downloadState === "downloaded") {
      if (confirm(`Deseja remover "${book.title}" dos seus downloads offline?`)) {
        try {
          await deleteBookOffline(book.id);
          updateState("idle");
        } catch (err) {
          console.error("Erro ao remover download:", err);
        }
      }
      return;
    }

    // Limit check: Free users can download up to 2 books offline
    if (!isPremium) {
      try {
        const offlineMeta = await getDownloadedBooksMeta();
        const downloadedCount = offlineMeta.filter(item => item.id !== book.id).length;
        if (downloadedCount >= 2) {
          alert("Limite atingido! O plano gratuito permite baixar no máximo 2 livros offline. Faça upgrade para o Premium para downloads ilimitados!");
          if (onTriggerPaywall) onTriggerPaywall();
          return;
        }
      } catch (err) {
        console.error("Erro ao verificar limite offline:", err);
      }
    }

    // Start download process simulation
    updateState("downloading");
    setDownloadProgress(0);

    const interval = setInterval(() => {
      setDownloadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          // Actual save
          saveBookOffline(book)
            .then(() => {
              updateState("downloaded");
            })
            .catch((err) => {
              console.error("Erro ao salvar livro offline:", err);
              updateState("error");
            });
          return 100;
        }
        return prev + 25; // Simulate download speed
      });
    }, 400);
  };

  const getButtonClasses = (state: DownloadState) => {
    if (iconOnly) {
      switch (state) {
        case "downloaded":
          return `w-9 h-9 p-0 bg-emerald-950/20 hover:bg-red-950/20 border border-emerald-900/30 hover:border-red-900/30 text-emerald-400 hover:text-red-400 rounded-xl flex items-center justify-center transition active:scale-[0.97] cursor-pointer group ${className}`;
        case "downloading":
          return `w-9 h-9 p-0 bg-[#e2b874]/10 border border-[#e2b874]/20 text-[#e2b874] rounded-xl flex items-center justify-center transition cursor-pointer ${className}`;
        case "paused":
          return `w-9 h-9 p-0 bg-amber-950/20 border border-amber-900/30 text-amber-400 rounded-xl flex items-center justify-center transition active:scale-[0.97] cursor-pointer ${className}`;
        case "error":
          return `w-9 h-9 p-0 bg-red-950/20 border border-red-900/30 text-red-400 rounded-xl flex items-center justify-center transition active:scale-[0.97] cursor-pointer ${className}`;
        default: // idle
          return `w-9 h-9 p-0 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-zinc-100 rounded-xl flex items-center justify-center transition active:scale-[0.97] cursor-pointer ${className}`;
      }
    } else {
      const baseLarge = "w-full sm:flex-1 py-3 font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition cursor-pointer";
      const baseDefault = "px-2 sm:px-3 py-2 text-[10px] sm:text-xs font-bold rounded-xl flex items-center justify-center gap-1 sm:gap-1.5 transition active:scale-[0.97] cursor-pointer";
      const base = variant === "large" ? baseLarge : baseDefault;

      switch (state) {
        case "downloaded":
          return `${base} bg-emerald-950/20 hover:bg-red-950/20 border border-emerald-900/30 hover:border-red-900/30 text-emerald-400 hover:text-red-400 group ${className}`;
        case "downloading":
          return `${base} bg-[#e2b874]/10 border border-[#e2b874]/20 text-[#e2b874] ${className}`;
        case "paused":
          return `${base} bg-amber-950/20 border border-amber-900/30 text-amber-400 ${className}`;
        case "error":
          return `${base} bg-red-950/20 border border-red-900/30 text-red-400 ${className}`;
        default: // idle
          return `${base} bg-zinc-900 hover:bg-zinc-850 border border-zinc-850 hover:border-zinc-700 text-zinc-100 hover:text-zinc-50 ${className}`;
      }
    }
  };

  const buttonClasses = getButtonClasses(downloadState);

  if (downloadState === "downloaded") {
    return (
      <button
        onClick={handleDownload}
        className={buttonClasses}
        title={iconOnly ? `Remover download de "${book.title}"` : "Clique para remover dos downloads offline"}
      >
        <Check className={iconOnly ? "w-4 h-4 group-hover:hidden" : (variant === "large" ? "w-4 h-4 flex-shrink-0 group-hover:hidden" : "w-3.5 h-3.5 flex-shrink-0 group-hover:hidden hidden sm:block")} />
        <Trash2 className={iconOnly ? "w-4 h-4 hidden group-hover:block" : (variant === "large" ? "w-4 h-4 flex-shrink-0 hidden group-hover:block" : "w-3.5 h-3.5 flex-shrink-0 hidden group-hover:block")} />
        {!iconOnly && (
          <>
            <span className="group-hover:hidden">Baixado</span>
            <span className="hidden group-hover:block">Remover</span>
          </>
        )}
      </button>
    );
  }

  if (downloadState === "downloading") {
    return (
      <button
        onClick={handleDownload}
        className={buttonClasses}
        title={iconOnly ? `Baixando... ${downloadProgress}% (Pausar)` : "Clique para pausar"}
      >
        <Loader2 className={iconOnly ? "w-4 h-4 animate-spin" : (variant === "large" ? "w-4 h-4 animate-spin flex-shrink-0" : "w-3.5 h-3.5 animate-spin flex-shrink-0 hidden sm:block")} />
        {!iconOnly && <span>Baixando... {downloadProgress}%</span>}
      </button>
    );
  }

  if (downloadState === "paused") {
    return (
      <button
        onClick={handleDownload}
        className={buttonClasses}
        title={iconOnly ? "Pausado (Retomar)" : "Clique para retomar"}
      >
        <Pause className={iconOnly ? "w-4 h-4" : (variant === "large" ? "w-4 h-4 flex-shrink-0" : "w-3.5 h-3.5 flex-shrink-0 hidden sm:block")} />
        {!iconOnly && <span>Pausado</span>}
      </button>
    );
  }

  if (downloadState === "error") {
    return (
      <button
        onClick={handleDownload}
        className={buttonClasses}
        title={iconOnly ? "Erro no download (Tentar novamente)" : "Clique para tentar novamente"}
      >
        <AlertCircle className={iconOnly ? "w-4 h-4" : (variant === "large" ? "w-4 h-4 flex-shrink-0" : "w-3.5 h-3.5 flex-shrink-0 hidden sm:block")} />
        {!iconOnly && <span>Erro no download</span>}
      </button>
    );
  }

  // Idle / "Baixar" state
  return (
    <button
      onClick={handleDownload}
      className={buttonClasses}
      title={iconOnly ? `Baixar "${book.title}" para leitura offline` : "Baixar para leitura offline"}
    >
      <Download className={iconOnly ? "w-4 h-4 text-[#e2b874]" : (variant === "large" ? "w-4 h-4 text-[#e2b874] flex-shrink-0" : "w-3.5 h-3.5 flex-shrink-0 text-[#e2b874] hidden sm:block")} />
      {!iconOnly && <span>Baixar para ler Offline</span>}
    </button>
  );
}
