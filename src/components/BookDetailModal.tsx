import React, { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, 
  BookOpen, 
  Headphones, 
  Sparkles, 
  Heart, 
  Clock, 
  Globe, 
  FileText, 
  Volume2, 
  Lock,
  MessageSquare,
  Bookmark
} from "lucide-react";
import { Book, User } from "../types";
import BookReviews from "./BookReviews";

interface BookDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: Book | null;
  user: User | null;
  isFavorite: boolean;
  onToggleFavorite: (bookId: string) => void;
  onSelectBook: (book: Book, startInAudioMode: boolean) => void;
  onTriggerAuth: (mode: "login" | "register") => void;
}

export default function BookDetailModal({
  isOpen,
  onClose,
  book,
  user,
  isFavorite,
  onToggleFavorite,
  onSelectBook,
  onTriggerAuth
}: BookDetailModalProps) {
  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  if (!isOpen || !book) return null;

  const hasAudiobook = book.audiobookAvailable;

  const handleAction = (audioMode: boolean) => {
    if (!user) {
      onTriggerAuth("login");
      return;
    }
    onSelectBook(book, audioMode);
    onClose();
  };

  const handleFavClick = () => {
    if (!user) {
      onTriggerAuth("login");
      return;
    }
    onToggleFavorite(book.id);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.3 }}
          className="relative w-full max-w-4xl bg-[#121214] border border-zinc-800 rounded-3xl shadow-2xl overflow-y-auto md:overflow-hidden flex flex-col md:flex-row max-h-[90vh] md:max-h-[85vh]"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-100 rounded-full transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Left Column: Cover & Quick specs */}
          <div className="w-full md:w-80 bg-zinc-900/40 border-b md:border-b-0 md:border-r border-zinc-800 p-6 flex flex-col justify-between items-center relative overflow-hidden shrink-0">
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/40 to-transparent pointer-events-none"></div>

            <div className="w-44 sm:w-48 aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl border border-zinc-800 relative group">
              <img
                src={book.coverUrl}
                alt={book.title}
                className="w-full h-full object-cover group-hover:scale-102 transition duration-300"
                referrerPolicy="no-referrer"
              />
              {book.accessType === "premium" && (
                <div className="absolute top-3 left-3 bg-[#e2b874] text-zinc-950 text-[9px] font-black px-2 py-0.5 rounded-lg flex items-center gap-0.5 shadow-lg">
                  <Sparkles className="w-2.5 h-2.5 fill-current" />
                  <span>PREMIUM</span>
                </div>
              )}
            </div>

            <div className="w-full mt-6 space-y-3">
              {/* Info grid */}
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="bg-zinc-900/80 border border-zinc-800/80 p-2.5 rounded-xl">
                  <FileText className="w-4 h-4 text-[#e2b874] mx-auto mb-1" />
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Páginas</p>
                  <p className="font-serif font-bold text-zinc-200 mt-0.5">{book.pages} pgs</p>
                </div>
                <div className="bg-zinc-900/80 border border-zinc-800/80 p-2.5 rounded-xl">
                  <Globe className="w-4 h-4 text-[#e2b874] mx-auto mb-1" />
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Idioma</p>
                  <p className="font-serif font-bold text-zinc-200 mt-0.5 truncate">{book.language || "Português"}</p>
                </div>
              </div>

              {/* Audiobook Badge details */}
              <div className="p-3 bg-[#e2b874]/5 border border-[#e2b874]/10 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Headphones className="w-4 h-4 text-[#e2b874]" />
                  <span className="font-semibold text-zinc-300">Audiobook Disponível</span>
                </div>
                <span className={`font-bold text-[10px] px-2 py-0.5 rounded-md ${hasAudiobook ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-zinc-800 text-zinc-500"}`}>
                  {hasAudiobook ? "SIM" : "NÃO"}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Title, Description & Comments reviews panel */}
          <div className="flex-grow p-6 md:p-8 flex flex-col justify-between overflow-y-auto max-h-full">
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-[#e2b874]/10 border border-[#e2b874]/20 text-[#e2b874] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    {book.category}
                  </span>
                  {book.accessType === "free" && (
                    <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      Gratuito
                    </span>
                  )}
                </div>
                
                <h2 className="text-2xl md:text-3xl font-serif font-black tracking-tight text-zinc-100 leading-tight">
                  {book.title}
                </h2>
                <p className="text-sm font-medium text-zinc-400">Por <span className="text-[#e2b874] font-semibold">{book.author}</span></p>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs uppercase font-bold text-zinc-400 tracking-wider">Sinopse do Livro</h3>
                <p className="text-xs text-zinc-300 leading-relaxed font-sans max-h-36 overflow-y-auto pr-2 no-scrollbar">
                  {book.description || "Nenhuma descrição disponível para este livro no momento."}
                </p>
              </div>

              {/* Reviews Panel */}
              <div className="pt-4 border-t border-zinc-800">
                <h3 className="text-xs uppercase font-bold text-zinc-400 tracking-wider mb-3 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-[#e2b874]" />
                  Avaliações e Comentários dos Leitores
                </h3>
                <div className="max-h-60 overflow-y-auto no-scrollbar">
                  <BookReviews bookId={book.id} userId={user?.id} user={user} />
                </div>
              </div>
            </div>

            {/* Bottom Actions Frame */}
            <div className="pt-6 mt-6 border-t border-zinc-800 flex flex-col sm:flex-row gap-3 items-center">
              {user ? (
                <>
                  <button
                    onClick={() => handleAction(false)}
                    className="w-full sm:flex-1 py-3 bg-[#e2b874] hover:bg-[#c59e5f] text-zinc-950 font-bold text-sm rounded-xl transition duration-200 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4" />
                    Começar Leitura
                  </button>
                  {hasAudiobook && (
                    <button
                      onClick={() => handleAction(true)}
                      className="w-full sm:flex-1 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 hover:border-zinc-700 text-zinc-100 font-bold text-sm rounded-xl transition duration-200 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Headphones className="w-4 h-4 text-[#e2b874]" />
                      Ouvir Audiobook
                    </button>
                  )}
                  <button
                    onClick={handleFavClick}
                    className={`w-full sm:w-auto p-3.5 rounded-xl border flex items-center justify-center transition duration-200 cursor-pointer ${
                      isFavorite 
                        ? "bg-[#e2b874]/10 border-[#e2b874] text-[#e2b874]" 
                        : "bg-zinc-900 border-zinc-850 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200"
                    }`}
                    title={isFavorite ? "Remover dos Favoritos" : "Adicionar aos Favoritos"}
                  >
                    <Heart className={`w-4 h-4 ${isFavorite ? "fill-[#e2b874]" : ""}`} />
                    <span className="sm:hidden font-bold text-xs ml-2">Favoritar Livro</span>
                  </button>
                </>
              ) : (
                <div className="w-full p-4 bg-zinc-900/60 border border-zinc-850 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-2.5 text-left">
                    <div className="w-9 h-9 bg-amber-500/5 border border-zinc-800 rounded-xl flex items-center justify-center text-[#e2b874] shrink-0">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-zinc-200">Acesso Restrito</p>
                      <p className="text-[10px] text-zinc-500">Crie uma conta gratuita para ler ou ouvir este livro.</p>
                    </div>
                  </div>

                  <div className="flex gap-2 w-full sm:w-auto shrink-0">
                    <button
                      onClick={() => {
                        onTriggerAuth("login");
                        onClose();
                      }}
                      className="flex-1 sm:flex-none px-4.5 py-2.5 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-200 font-bold text-xs rounded-xl transition duration-200 cursor-pointer"
                    >
                      Entrar
                    </button>
                    <button
                      onClick={() => {
                        onTriggerAuth("register");
                        onClose();
                      }}
                      className="flex-1 sm:flex-none px-4.5 py-2.5 bg-[#e2b874] text-zinc-950 font-bold text-xs rounded-xl hover:bg-[#c59e5f] transition duration-200 cursor-pointer"
                    >
                      Cadastrar Grátis
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
