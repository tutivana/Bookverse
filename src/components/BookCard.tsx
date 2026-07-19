import React from "react";
import { motion } from "motion/react";
import { Sparkles, Heart, Headphones, BookOpen } from "lucide-react";
import { Book, ReadingProgress, User } from "../types";
import OfflineDownloadButton from "./OfflineDownloadButton";

interface BookCardProps {
  book: Book;
  user: User | null;
  premium: boolean;
  isFav: boolean;
  bookProg: ReadingProgress | undefined;
  handleBookClick: (book: Book, startInAudioMode: boolean) => void;
  onToggleFavorite: (bookId: string) => void;
  setSelectedDetailBook: (book: Book) => void;
  onTriggerPaywall: (reason: "audiobook" | "offline" | "premium_book" | "stats" | "highlights") => void;
}

export default function BookCard({
  book,
  user,
  premium,
  isFav,
  bookProg,
  handleBookClick,
  onToggleFavorite,
  setSelectedDetailBook,
  onTriggerPaywall
}: BookCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.3 }}
      className="group bg-[#121214] border border-zinc-800 hover:border-[#e2b874]/50 rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition flex flex-col h-full relative"
      id={`book-card-${book.id}`}
    >
      {/* Cover Frame */}
      <div
        className="aspect-[3/4] relative bg-zinc-900 overflow-hidden border-b border-zinc-800 cursor-pointer"
        onClick={() => setSelectedDetailBook(book)}
      >
        <img
          src={book.coverUrl}
          alt={book.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          referrerPolicy="no-referrer"
        />
        
        {/* Premium / Free Label overlay */}
        <div className="absolute top-3 left-3 flex gap-1 items-center z-10">
          {book.accessType === "premium" ? (
            <div className="bg-[#e2b874] text-[#09090b] text-[9px] font-black px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-md">
              <Sparkles className="w-2.5 h-2.5 fill-current" />
              <span>PREMIUM</span>
            </div>
          ) : (
            <div className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 text-zinc-400 text-[9px] font-bold px-2 py-0.5 rounded-lg">
              GRÁTIS
            </div>
          )}
        </div>

        {/* Floating actions */}
        <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!user) {
                setSelectedDetailBook(book);
              } else {
                onToggleFavorite(book.id);
              }
            }}
            className={`w-8 h-8 rounded-full flex items-center justify-center border shadow-sm cursor-pointer transition active:scale-90 ${
              isFav
                ? "bg-[#e2b874] border-[#e2b874] text-zinc-950"
                : "bg-black/80 border-zinc-800 text-[#e2b874] hover:bg-zinc-900"
            }`}
          >
            <Heart className={`w-4 h-4 ${isFav ? "fill-zinc-950" : ""}`} />
          </button>
        </div>

        {/* Audiobook Badge overlay */}
        {book.audiobookAvailable && (
          <div className="absolute bottom-3 left-3 bg-[#e2b874]/95 backdrop-blur-sm text-zinc-950 px-2 py-1 rounded-lg text-[9px] font-bold flex items-center gap-1 shadow-sm">
            <Headphones className="w-3 h-3 animate-pulse" />
            AUDIOBOOK
          </div>
        )}
      </div>

      {/* Book Metadata details */}
      <div className="p-4 flex-grow flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-[10px] bg-zinc-900 border border-zinc-800 text-[#e2b874] font-semibold px-2 py-0.5 rounded-full">
              {book.category}
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">
              {book.pages} pgs
            </span>
          </div>
          
          <h3
            className="font-serif font-bold text-base text-zinc-100 group-hover:text-[#e2b874] transition leading-snug line-clamp-1 cursor-pointer"
            onClick={() => setSelectedDetailBook(book)}
          >
            {book.title}
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5 mb-2 line-clamp-1">{book.author}</p>
          <p className="text-[11px] text-zinc-500 line-clamp-2 leading-relaxed mb-4">
            {book.description}
          </p>
        </div>

        <div className="pt-2 border-t border-zinc-800">
          {/* Progress display if started */}
          {bookProg && bookProg.progressPercentage > 0 && (
            <div className="mb-3">
              <div className="flex justify-between text-[9px] text-zinc-500 mb-0.5">
                <span>Progresso</span>
                <span>{bookProg.progressPercentage}%</span>
              </div>
              <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
                <div
                  className="bg-[#e2b874] h-full"
                  style={{ width: `${bookProg.progressPercentage}%` }}
                ></div>
              </div>
            </div>
          )}

          <div className="flex gap-1.5 w-full">
            <button
              onClick={() => handleBookClick(book, false)}
              className="flex-1 bg-[#e2b874] hover:bg-[#c59e5f] text-zinc-950 text-[10px] sm:text-xs font-bold h-10 rounded-xl flex items-center justify-center gap-1 transition active:scale-[0.97] cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ler</span>
            </button>
            {book.audiobookAvailable && (
              <button
                onClick={() => handleBookClick(book, true)}
                className="w-10 h-10 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-100 rounded-xl flex items-center justify-center transition active:scale-[0.97] cursor-pointer flex-shrink-0"
                title="Ouvir Audiobook"
              >
                <Headphones className="w-4 h-4 text-[#e2b874]" />
              </button>
            )}
            <OfflineDownloadButton
              book={book}
              isPremium={premium}
              onTriggerPaywall={() => onTriggerPaywall("offline")}
              iconOnly={true}
              className="w-10 h-10 flex-shrink-0"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
