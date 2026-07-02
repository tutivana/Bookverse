import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  BookMarked,
  Bookmark,
  Highlighter,
  MessageSquare,
  Search,
  Type,
  Maximize2,
  Trash2,
  Settings,
  Sparkles,
  Headphones,
  FileText
} from "lucide-react";
import { Book, ReadingProgress, Bookmark as BookmarkType, HighlightAndNote, User } from "../types";
import { askGeminiAssistant } from "../lib/api";
import BookReviews from "./BookReviews";
import { isUserPremium } from "../lib/subscription";
import { Lock } from "lucide-react";

interface ReaderProps {
  book: Book;
  userId: string;
  user: User;
  onBackToLibrary: () => void;
  onOpenAudiobook: () => void;
  onUpdateProgress: (page: number, readingSeconds?: number) => void;
  progress: ReadingProgress | null;
  onTriggerPaywall: (reason: "highlights") => void;
}

type ReaderTheme = "claro" | "sepia" | "escuro";

export default function Reader({
  book,
  userId,
  user,
  onBackToLibrary,
  onOpenAudiobook,
  onUpdateProgress,
  progress,
  onTriggerPaywall,
}: ReaderProps) {
  const premium = isUserPremium(user);
  const [currentPage, setCurrentPage] = useState(progress?.lastPage || 0);
  const [theme, setTheme] = useState<ReaderTheme>("escuro");
  const [fontSize, setFontSize] = useState(1.1); // in rem
  const [bookmarks, setBookmarks] = useState<BookmarkType[]>([]);
  const [notes, setNotes] = useState<HighlightAndNote[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<"companion" | "notes" | "search" | "reviews">("companion");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ page: number; snippet: string }[]>([]);
  
  // Timer to track exact active reading time (in seconds) on the current page
  const timeSpentRef = useRef<number>(0);

  useEffect(() => {
    const timer = setInterval(() => {
      timeSpentRef.current += 1;
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  
  // Highlight draft state
  const [selectedText, setSelectedText] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [highlightColor, setHighlightColor] = useState("yellow");
  const [showHighlightForm, setShowHighlightForm] = useState(false);

  // AI assistant loading states
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [activeAiTab, setActiveAiTab] = useState<"summary" | "explain" | "translate" | "qa" | "flashcards">("summary");
  const [userAiQuestion, setUserAiQuestion] = useState("");

  const pageTextRef = useRef<HTMLDivElement>(null);

  // Sync state with parent progress
  useEffect(() => {
    if (progress) {
      setCurrentPage(progress.lastPage);
    }
  }, [progress]);

  // Load bookmarks & notes for this book on mount or page change
  useEffect(() => {
    fetch(`/api/bookmarks/${userId}/${book.id}`)
      .then((res) => res.json())
      .then((data) => setBookmarks(data))
      .catch((err) => console.error("Error fetching bookmarks:", err));

    fetch(`/api/notes/${userId}/${book.id}`)
      .then((res) => res.json())
      .then((data) => setNotes(data))
      .catch((err) => console.error("Error fetching notes:", err));
  }, [book.id, userId]);

  // Handle page turn and trigger parent progress update with exact reading seconds
  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && newPage < book.pages) {
      const elapsed = timeSpentRef.current;
      timeSpentRef.current = 0; // Reset for the next page
      setCurrentPage(newPage);
      onUpdateProgress(newPage, elapsed);
      // Clean selected text draft
      setSelectedText("");
      setShowHighlightForm(false);
      setAiResponse("");
    }
  };

  // Handle exiting back to library and saving the final reading session seconds
  const handleBackToLibrary = () => {
    const elapsed = timeSpentRef.current;
    timeSpentRef.current = 0;
    onUpdateProgress(currentPage, elapsed);
    onBackToLibrary();
  };

  // Toggle page bookmark
  const handleToggleBookmark = async () => {
    try {
      const res = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, bookId: book.id, page: currentPage }),
      });
      const data = await res.json();
      if (data.bookmarks) {
        setBookmarks(data.bookmarks);
      }
    } catch (err) {
      console.error("Error toggling bookmark:", err);
    }
  };

  const isCurrentPageBookmarked = bookmarks.some((b) => b.page === currentPage);

  // Full-text keyword search across pages
  const handleSearchInsideBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const results: { page: number; snippet: string }[] = [];

    book.pdfContent.forEach((content, index) => {
      if (content.toLowerCase().includes(query)) {
        // extract context snippet
        const charIndex = content.toLowerCase().indexOf(query);
        const start = Math.max(0, charIndex - 40);
        const end = Math.min(content.length, charIndex + query.length + 40);
        let snippet = content.substring(start, end);
        if (start > 0) snippet = "..." + snippet;
        if (end < content.length) snippet = snippet + "...";

        results.push({
          page: index,
          snippet: snippet,
        });
      }
    });

    setSearchResults(results);
  };

  // Handle standard user text selection
  const handleTextSelection = () => {
    if (!premium && notes.length >= 3) {
      onTriggerPaywall("highlights");
      return;
    }
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString().trim());
      setShowHighlightForm(true);
    }
  };

  // Click on any paragraph to auto-select and highlight (Frictionless UX)
  const handleParagraphClick = (text: string) => {
    if (!premium && notes.length >= 3) {
      onTriggerPaywall("highlights");
      return;
    }
    setSelectedText(text);
    setShowHighlightForm(true);
  };

  // Create highlighted note API
  const handleSaveHighlight = async () => {
    if (!selectedText) return;
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          bookId: book.id,
          page: currentPage,
          selectedText,
          text: noteDraft,
          color: highlightColor,
        }),
      });
      if (res.ok) {
        const newNote = await res.json();
        setNotes([...notes, newNote]);
        // Reset inputs
        setSelectedText("");
        setNoteDraft("");
        setShowHighlightForm(false);
      }
    } catch (err) {
      console.error("Error saving highlight/note:", err);
    }
  };

  // Delete highlighted note API
  const handleDeleteHighlight = async (noteId: string) => {
    try {
      const res = await fetch(`/api/notes/${noteId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setNotes(notes.filter((n) => n.id !== noteId));
      }
    } catch (err) {
      console.error("Error deleting note:", err);
    }
  };

  // Gemini assistant prompt triggers
  const handleAskAssistant = async (mode: any) => {
    setAiLoading(true);
    setAiResponse("");
    try {
      const textSnippet = selectedText || book.pdfContent[currentPage].substring(0, 1000);
      const payload = {
        mode,
        bookTitle: book.title,
        author: book.author,
        textSnippet,
        pageNumber: currentPage,
        userQuestion: mode === "qa" ? userAiQuestion : undefined,
      };

      const answer = await askGeminiAssistant(payload);
      setAiResponse(answer);
    } catch (err: any) {
      setAiResponse("Desculpe, ocorreu um erro ao consultar a IA do Gemini: " + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  // Helper colors classes mapping
  const colorMap: { [key: string]: string } = {
    yellow: "bg-yellow-200/80 text-yellow-900 border-yellow-300",
    green: "bg-green-200/80 text-green-900 border-green-300",
    blue: "bg-blue-200/80 text-blue-900 border-blue-300",
    pink: "bg-pink-200/80 text-pink-900 border-pink-300",
  };

  // Reading themes styles mapping
  const themeStyles = {
    claro: {
      outerBg: "bg-[#f5f4ed]",
      cardBg: "bg-white text-gray-900 border-gray-200",
      border: "border-gray-200",
      textMuted: "text-gray-500",
    },
    sepia: {
      outerBg: "bg-[#f4ebd0]",
      cardBg: "bg-[#fcf7e8] text-[#4a3f28] border-[#ebdcb3]",
      border: "border-[#e0ce9a]",
      textMuted: "text-[#807255]",
    },
    escuro: {
      outerBg: "bg-[#09090b]",
      cardBg: "bg-[#121214] text-zinc-100 border-zinc-800",
      border: "border-zinc-800",
      textMuted: "text-zinc-500",
    },
  };

  const activeTheme = themeStyles[theme];

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${activeTheme.outerBg} selection:bg-[#e2b874]/30`}>
      {/* Top Navbar */}
      <header className={`px-4 py-2.5 md:py-3 border-b flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-4 shadow-sm sticky top-0 z-20 transition-colors ${
        theme === "escuro" 
          ? "bg-[#121214] border-zinc-800 text-zinc-100" 
          : theme === "sepia" 
            ? "bg-[#fcf7e8] border-[#ebdcb3] text-[#4a3f28]" 
            : "bg-white border-gray-200 text-gray-900"
      }`}>
        {/* Row 1 on mobile: Title & back button on left, quick controls on the right */}
        <div className="flex items-center justify-between w-full md:w-auto gap-3 min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={handleBackToLibrary}
              className={`p-2 rounded-xl transition cursor-pointer flex-shrink-0 ${
                theme === "escuro" ? "hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100" : "hover:bg-gray-100 text-gray-600"
              }`}
              title="Voltar para Biblioteca"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <div className="min-w-0">
              <h2 className={`text-xs md:text-sm font-serif font-bold truncate ${theme === "escuro" ? "text-zinc-100" : "text-gray-900"}`}>{book.title}</h2>
              <p className={`text-[9px] md:text-[10px] truncate ${theme === "escuro" ? "text-zinc-500" : "text-gray-500"}`}>{book.author}</p>
            </div>
          </div>

          {/* Quick Panels on the right (MOBILE ONLY) */}
          <div className="flex md:hidden items-center gap-1 flex-shrink-0">
            {book.audiobookAvailable && (
              <button
                onClick={onOpenAudiobook}
                className={`p-1.5 rounded-lg flex items-center gap-1 text-[10px] font-semibold transition cursor-pointer ${
                  theme === "escuro" 
                    ? "bg-[#e2b874]/10 hover:bg-[#e2b874]/25 text-[#e2b874]" 
                    : "bg-[#8a7e58]/10 hover:bg-[#8a7e58]/20 text-[#8a7e58]"
                }`}
                title="Ouvir Audiobook"
              >
                <Headphones className="w-3.5 h-3.5 animate-pulse" />
                <span>Audio</span>
              </button>
            )}

            <button
              onClick={handleToggleBookmark}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                isCurrentPageBookmarked
                  ? "bg-red-500/15 text-red-400 hover:bg-red-500/25"
                  : theme === "escuro" 
                    ? "text-zinc-500 hover:bg-zinc-850 hover:text-zinc-300" 
                    : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              }`}
              title={isCurrentPageBookmarked ? "Remover marcador" : "Marcar página"}
            >
              <Bookmark className={`w-4 h-4 ${isCurrentPageBookmarked ? "fill-red-500" : ""}`} />
            </button>

            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                isSidebarOpen 
                  ? theme === "escuro" 
                    ? "bg-zinc-800 text-zinc-100" 
                    : "bg-gray-100 text-gray-850" 
                  : theme === "escuro" 
                    ? "text-zinc-400 hover:bg-zinc-850 hover:text-zinc-200" 
                    : "text-gray-500 hover:bg-gray-100"
              }`}
              title="Marcadores e Notas"
            >
              <BookMarked className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Central Controls: Font Sizes & Theme selection (Row 2 on mobile, Center on desktop) */}
        <div className="flex items-center justify-center md:justify-center gap-2 flex-wrap md:flex-nowrap w-full md:w-auto">
          {/* Font Sizes controls */}
          <div className={`flex rounded-xl p-1 items-center border ${
            theme === "escuro" ? "bg-zinc-900 border-zinc-800" : "bg-gray-50 border-gray-200"
          }`}>
            <button
              onClick={() => setFontSize(Math.max(0.8, fontSize - 0.1))}
              className={`p-1 px-2.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                theme === "escuro" ? "hover:bg-zinc-850 text-zinc-300" : "hover:bg-white text-gray-700"
              }`}
              title="Diminuir texto"
            >
              A-
            </button>
            <div className={`w-px h-4 mx-1 ${theme === "escuro" ? "bg-zinc-800" : "bg-gray-200"}`}></div>
            <button
              onClick={() => setFontSize(Math.min(2.0, fontSize + 0.1))}
              className={`p-1 px-2.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                theme === "escuro" ? "hover:bg-zinc-850 text-zinc-300" : "hover:bg-white text-gray-700"
              }`}
              title="Aumentar texto"
            >
              A+
            </button>
          </div>

          {/* Reading Themes Toggles */}
          <div className={`flex rounded-xl p-1 items-center border gap-1 ${
            theme === "escuro" ? "bg-zinc-900 border-zinc-800" : "bg-gray-50 border-gray-200"
          }`}>
            {(["claro", "sepia", "escuro"] as ReaderTheme[]).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`p-1 px-1.5 sm:px-2.5 rounded-lg text-[10px] font-bold uppercase transition cursor-pointer flex items-center gap-1.5 ${
                  theme === t 
                    ? theme === "escuro" 
                      ? "bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700" 
                      : theme === "sepia" 
                        ? "bg-[#fcf7e8] text-[#4a3f28] shadow-sm border border-[#ebdcb3]" 
                        : "bg-white text-gray-900 shadow-sm border border-gray-200"
                    : "text-zinc-500 hover:text-zinc-350 hover:bg-zinc-800/10"
                }`}
                title={`Tema ${t}`}
              >
                {/* Visual colored circle representing the theme */}
                <span className={`w-3 h-3 rounded-full border border-black/10 flex-shrink-0 ${
                  t === "claro" ? "bg-white" : t === "sepia" ? "bg-[#f4ebd0]" : "bg-zinc-950"
                }`} />
                <span className="hidden sm:inline">{t}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Quick panels toggles (DESKTOP ONLY) */}
        <div className="hidden md:flex items-center gap-1.5">
          {book.audiobookAvailable && (
            <button
              onClick={onOpenAudiobook}
              className={`p-2 rounded-xl flex items-center gap-1.5 text-xs font-semibold transition cursor-pointer ${
                theme === "escuro" 
                  ? "bg-[#e2b874]/10 hover:bg-[#e2b874]/25 text-[#e2b874]" 
                  : "bg-[#8a7e58]/10 hover:bg-[#8a7e58]/20 text-[#8a7e58]"
              }`}
              title="Ouvir Audiobook"
            >
              <Headphones className="w-4 h-4 animate-pulse" />
              <span className="hidden sm:inline">Audiobook</span>
            </button>
          )}

          <button
            onClick={handleToggleBookmark}
            className={`p-2 rounded-xl transition cursor-pointer ${
              isCurrentPageBookmarked
                ? "bg-red-500/15 text-red-400 hover:bg-red-500/25"
                : theme === "escuro" 
                  ? "text-zinc-500 hover:bg-zinc-850 hover:text-zinc-300" 
                  : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            }`}
            title={isCurrentPageBookmarked ? "Remover marcador desta página" : "Marcar esta página"}
          >
            <Bookmark className={`w-5 h-5 ${isCurrentPageBookmarked ? "fill-red-500" : ""}`} />
          </button>

          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`p-2 rounded-xl transition cursor-pointer ${
              isSidebarOpen 
                ? theme === "escuro" 
                  ? "bg-zinc-800 text-zinc-100" 
                  : "bg-gray-100 text-gray-850" 
                : theme === "escuro" 
                  ? "text-zinc-400 hover:bg-zinc-850 hover:text-zinc-200" 
                  : "text-gray-500 hover:bg-gray-100"
            }`}
            title="Marcadores e Notas"
          >
            <BookMarked className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main split viewport layout */}
      <div className="flex-grow flex relative overflow-hidden h-[calc(100vh-53px)]">
        {/* E-book reader core body */}
        <div className="flex-grow flex flex-col justify-between p-4 md:p-8 overflow-y-auto" onMouseUp={handleTextSelection}>
          <div className="max-w-2xl mx-auto w-full my-auto">
            
            {/* Pages viewport animation */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPage}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.25 }}
                className={`p-8 md:p-12 rounded-2xl border shadow-md font-serif leading-relaxed ${activeTheme.cardBg}`}
                style={{ fontSize: `${fontSize}rem` }}
                ref={pageTextRef}
              >
                {/* Book text split by paragraphs */}
                {book.pdfContent[currentPage].split("\n\n").map((para, idx) => (
                  <p
                    key={idx}
                    className="mb-5 indent-6 hover:bg-[#8a7e58]/5 hover:text-[#8a7e58] p-1 rounded transition cursor-pointer"
                    onClick={() => handleParagraphClick(para)}
                  >
                    {/* Render matching local note highlights overlay */}
                    {notes
                      .filter((n) => n.page === currentPage && para.includes(n.selectedText))
                      .reduce((acc, curr) => {
                        // Highlight matches in the paragraph text
                        return para; // simplfied render block
                      }, para)}
                  </p>
                ))}
              </motion.div>
            </AnimatePresence>

            {/* Float Highlight Editor Panel */}
            {showHighlightForm && selectedText && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-[#dad5bf] p-4 rounded-xl shadow-lg mt-4 max-w-lg mx-auto"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
                    <Highlighter className="w-3.5 h-3.5 text-[#8a7e58]" />
                    Destacar Trecho Selecionado
                  </span>
                  <button
                    onClick={() => {
                      setSelectedText("");
                      setShowHighlightForm(false);
                    }}
                    className="text-gray-400 hover:text-gray-600 text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                </div>
                <p className="text-xs italic text-gray-600 bg-gray-50 p-2.5 rounded-lg mb-3 border-l-2 border-[#8a7e58] line-clamp-2">
                  "{selectedText}"
                </p>

                {/* Annotation color picker & note */}
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-gray-400 font-semibold mr-1">Cor:</span>
                    {(["yellow", "green", "blue", "pink"] as string[]).map((col) => (
                      <button
                        key={col}
                        onClick={() => setHighlightColor(col)}
                        className={`w-6 h-6 rounded-full cursor-pointer transition flex items-center justify-center ${
                          col === "yellow"
                            ? "bg-yellow-200"
                            : col === "green"
                            ? "bg-green-200"
                            : col === "blue"
                            ? "bg-blue-200"
                            : "bg-pink-200"
                        } ${highlightColor === col ? "ring-2 ring-offset-1 ring-[#8a7e58]" : ""}`}
                      />
                    ))}
                  </div>

                  <input
                    type="text"
                    placeholder="Adicione uma anotação opcional..."
                    className="bg-gray-50 border border-gray-200 focus:border-[#8a7e58] text-xs px-3 py-2 rounded-lg outline-none flex-grow"
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                  />

                  <button
                    onClick={handleSaveHighlight}
                    className="bg-[#8a7e58] hover:bg-[#4a432d] text-white px-3 py-2 text-xs font-bold rounded-lg cursor-pointer transition whitespace-nowrap"
                  >
                    Salvar Nota
                  </button>
                </div>

                {/* Gemini AI smart shortcuts from highlights */}
                <div className="mt-3.5 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#8a7e58]" />
                    Inteligência Artificial Gemini:
                  </span>
                  
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => {
                        setActiveAiTab("explain");
                        handleAskAssistant("explicar");
                      }}
                      className="text-[10px] bg-[#f6f5ee] hover:bg-[#dad5bf] text-gray-700 px-2.5 py-1 rounded-md font-semibold transition"
                    >
                      Explicar
                    </button>
                    <button
                      onClick={() => {
                        setActiveAiTab("translate");
                        handleAskAssistant("traduzir");
                      }}
                      className="text-[10px] bg-[#f6f5ee] hover:bg-[#dad5bf] text-gray-700 px-2.5 py-1 rounded-md font-semibold transition"
                    >
                      Traduzir
                    </button>
                    <button
                      onClick={() => {
                        setActiveAiTab("flashcards");
                        handleAskAssistant("flashcard");
                      }}
                      className="text-[10px] bg-[#8a7e58]/10 hover:bg-[#8a7e58]/25 text-[#8a7e58] px-2.5 py-1 rounded-md font-bold transition"
                    >
                      Flashcard
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Reader Footer Page Navigator bar */}
          <footer className="max-w-xl mx-auto w-full mt-4 flex items-center justify-between">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 0}
              className={`p-2 border rounded-xl transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 text-xs font-semibold ${
                theme === "escuro" 
                  ? "border-zinc-805 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white" 
                  : "border-[#dad5bf] bg-gray-50 text-gray-700 hover:bg-white"
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </button>

            <span className={`text-xs font-bold font-mono ${activeTheme.textMuted}`}>
              Página {currentPage + 1} de {book.pages}
            </span>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === book.pages - 1}
              className={`p-2 border rounded-xl transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 text-xs font-semibold ${
                theme === "escuro" 
                  ? "border-zinc-805 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white" 
                  : "border-[#dad5bf] bg-gray-50 text-gray-700 hover:bg-white"
              }`}
            >
              Próxima
              <ChevronRight className="w-4 h-4" />
            </button>
          </footer>
        </div>

        {/* Dynamic Sidebar Right: Highlights, Bookmarks, and Gemini AI Reading Companion! */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 360, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className={`h-full border-l flex flex-col justify-between flex-shrink-0 z-10 shadow-2xl transition-colors ${
                theme === "escuro" 
                  ? "bg-[#121214] border-zinc-800 text-zinc-100" 
                  : theme === "sepia" 
                    ? "bg-[#fcf7e8] border-[#ebdcb3] text-[#4a3f28]" 
                    : "bg-white border-gray-200 text-gray-950"
              }`}
            >
              {/* Sidebar Header tabs */}
              <div className={`p-4 border-b flex justify-between items-center ${
                theme === "escuro" 
                  ? "bg-zinc-900 border-zinc-800" 
                  : theme === "sepia" 
                    ? "bg-[#f4ebd0] border-[#ebdcb3]" 
                    : "bg-gray-50 border-gray-100"
              }`}>
                <h3 className={`font-serif font-bold text-sm flex items-center gap-1.5 ${
                  theme === "escuro" ? "text-zinc-100" : theme === "sepia" ? "text-[#4a3f28]" : "text-[#2d291c]"
                }`}>
                  <Sparkles className={`w-4.5 h-4.5 ${theme === "escuro" ? "text-[#e2b874] fill-[#e2b874]/10" : "text-[#8a7e58] fill-[#8a7e58]/10"}`} />
                  Assistente & Marcadores
                </h3>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className={`text-xs font-semibold cursor-pointer ${
                    theme === "escuro" ? "text-zinc-500 hover:text-zinc-300" : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  Fechar
                </button>
              </div>

              {/* Sidebar Tabs selectors */}
              <div className={`flex border-b text-[10px] ${
                theme === "escuro" ? "border-zinc-800" : theme === "sepia" ? "border-[#ebdcb3]" : "border-gray-100"
              }`}>
                {(["companion", "notes", "search", "reviews"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setActiveSidebarTab(tab);
                      setActiveAiTab("summary");
                    }}
                    className={`flex-1 py-3 text-center font-bold capitalize transition cursor-pointer border-b-2 ${
                      activeSidebarTab === tab
                        ? theme === "escuro"
                          ? "text-[#e2b874] border-[#e2b874]"
                          : "text-[#8a7e58] border-[#8a7e58]"
                        : "border-transparent " + (theme === "escuro"
                          ? "text-zinc-400 hover:text-zinc-200"
                          : "text-gray-500 hover:text-gray-800")
                    }`}
                  >
                    {tab === "companion" ? "Gemini AI" : tab === "notes" ? "Notas" : tab === "search" ? "Pesquisar" : "Comunidade"}
                  </button>
                ))}
              </div>

              {/* Viewport contents */}
              <div className="flex-grow p-4 overflow-y-auto space-y-4">
                {activeSidebarTab === "companion" && (
                  /* AI Companion view */
                  !premium ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 font-sans">
                      <div className="w-12 h-12 bg-[#e2b874]/10 border border-[#e2b874]/20 text-[#e2b874] rounded-2xl flex items-center justify-center mb-4">
                        <Lock className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-serif font-bold text-zinc-100 mb-1.5 flex items-center gap-1.5 justify-center">
                        Assistente de IA do Gemini
                      </h4>
                      <p className="text-xs text-zinc-400 max-w-sm mb-5 leading-relaxed">
                        Faça perguntas estruturadas sobre qualquer trecho, peça explicações contextuais, resumos e traduções com o BookVerse Premium.
                      </p>
                      <button
                        onClick={() => onTriggerPaywall("highlights")}
                        className="w-full bg-[#e2b874] hover:bg-[#c59e5f] text-zinc-950 font-bold text-xs py-2.5 rounded-xl transition active:scale-95 shadow-md cursor-pointer"
                      >
                        Assinar BookVerse Premium
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4 font-sans">
                    <div className="bg-[#8a7e58]/5 border border-[#dad5bf]/50 p-3.5 rounded-xl">
                      <h4 className="text-xs font-bold text-[#8a7e58] flex items-center gap-1.5 mb-2">
                        <Sparkles className="w-3.5 h-3.5" />
                        Ações Rápidas do Assistente
                      </h4>
                      
                      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                        <button
                          onClick={() => {
                            setActiveAiTab("summary");
                            handleAskAssistant("resumir");
                          }}
                          className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-100 font-semibold py-2 rounded-lg transition"
                        >
                          Resumir Página
                        </button>
                        <button
                          onClick={() => {
                            setActiveAiTab("flashcards");
                            handleAskAssistant("flashcard");
                          }}
                          className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-100 font-semibold py-2 rounded-lg transition"
                        >
                          Gerar Flashcard
                        </button>
                      </div>
                    </div>

                    {/* Question and answers widget */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleAskAssistant("qa");
                      }}
                      className="space-y-2"
                    >
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                        Pergunte algo sobre a página ou obra:
                      </label>
                      <div className="flex gap-1">
                        <input
                          type="text"
                          placeholder="Ex: Qual o simbolismo desta cena?"
                          className="bg-zinc-900 border border-zinc-800 focus:border-[#e2b874] text-xs px-3 py-2 rounded-lg outline-none flex-grow text-zinc-100"
                          value={userAiQuestion}
                          onChange={(e) => setUserAiQuestion(e.target.value)}
                        />
                        <button
                          type="submit"
                          disabled={aiLoading}
                          className="bg-[#8a7e58] hover:bg-[#a6986c] text-zinc-950 px-3 rounded-lg text-xs font-bold flex items-center justify-center transition active:scale-95 disabled:opacity-40"
                        >
                          OK
                        </button>
                      </div>
                    </form>

                    {/* Response Container with full markdown styling */}
                    <div className="border border-zinc-800 rounded-xl p-3 bg-zinc-900/30 min-h-[140px] text-xs relative text-zinc-300">
                      {aiLoading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/80 rounded-xl space-y-2">
                          <span className="w-6 h-6 border-2 border-[#8a7e58]/30 border-t-[#8a7e58] rounded-full animate-spin"></span>
                          <span className="text-[10px] text-zinc-500 font-semibold animate-pulse">Gemini gerando resposta...</span>
                        </div>
                      ) : aiResponse ? (
                        <div className="space-y-2 leading-relaxed font-sans max-h-[220px] overflow-y-auto">
                          <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800">
                            <span className="text-[9px] font-bold bg-[#8a7e58]/10 text-[#8a7e58] px-1.5 py-0.5 rounded uppercase">
                              {activeAiTab}
                            </span>
                            <span className="text-[9px] text-zinc-500 font-mono">Gemini-3.5-Flash</span>
                          </div>
                          <div className="whitespace-pre-wrap">{aiResponse}</div>
                        </div>
                      ) : (
                        <div className="text-center text-zinc-500 py-10 flex flex-col items-center justify-center">
                          <Sparkles className="w-8 h-8 text-zinc-700 mb-1" />
                          <p className="text-[11px] font-medium leading-relaxed">
                            Nenhuma resposta ativa.<br />Use os botões acima ou faça uma pergunta sobre a obra!
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  )
                )}

                {activeSidebarTab === "notes" && (
                  /* Local Notes of the active page view */
                  !premium ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 font-sans">
                      <div className="w-12 h-12 bg-[#e2b874]/10 border border-[#e2b874]/20 text-[#e2b874] rounded-2xl flex items-center justify-center mb-4">
                        <Lock className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-serif font-bold text-zinc-100 mb-1.5 flex items-center gap-1.5 justify-center">
                        Destaques e Anotações
                      </h4>
                      <p className="text-xs text-zinc-400 max-w-sm mb-5 leading-relaxed">
                        Salve notas, grife parágrafos importantes e crie seu próprio resumo conceitual com o BookVerse Premium.
                      </p>
                      <button
                        onClick={() => onTriggerPaywall("highlights")}
                        className="w-full bg-[#e2b874] hover:bg-[#c59e5f] text-zinc-950 font-bold text-xs py-2.5 rounded-xl transition active:scale-95 shadow-md cursor-pointer"
                      >
                        Assinar BookVerse Premium
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-[#8a7e58]" />
                        Suas Notas nesta Página ({notes.filter((n) => n.page === currentPage).length})
                      </h4>

                      <div className="space-y-2 max-h-[350px] overflow-y-auto">
                        {notes.filter((n) => n.page === currentPage).length === 0 ? (
                          <p className="text-[11px] text-zinc-500 italic py-6 text-center">Nenhum destaque salvo na página {currentPage + 1}.</p>
                        ) : (
                          notes
                            .filter((n) => n.page === currentPage)
                            .map((note) => (
                              <div
                                key={note.id}
                                className={`p-2.5 rounded-lg border text-xs relative ${
                                  note.color === "green"
                                    ? "bg-emerald-950/20 border-emerald-900/40 text-emerald-300"
                                    : note.color === "blue"
                                    ? "bg-blue-950/20 border-blue-900/40 text-blue-300"
                                    : note.color === "pink"
                                    ? "bg-pink-950/20 border-pink-900/40 text-pink-300"
                                    : "bg-amber-950/20 border-amber-900/40 text-amber-300"
                                }`}
                              >
                                <button
                                  onClick={() => handleDeleteHighlight(note.id)}
                                  className="absolute top-2 right-2 text-zinc-500 hover:text-red-400 transition"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                <p className="font-serif italic line-clamp-2 pr-4">"{note.selectedText}"</p>
                                {note.text && <p className="mt-1 font-semibold text-zinc-200">Nota: {note.text}</p>}
                              </div>
                            ))
                        )}
                      </div>
                    </div>
                  )
                )}

                {activeSidebarTab === "search" && (
                  /* Search Inside Book view */
                  <div className="space-y-4">
                    <form onSubmit={handleSearchInsideBook} className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                        Pesquisar no texto do livro:
                      </label>
                      <div className="flex gap-1">
                        <input
                          type="text"
                          placeholder="Digite uma palavra ou frase..."
                          className="bg-zinc-900 border border-zinc-800 focus:border-[#e2b874] text-xs px-3 py-2 rounded-lg outline-none flex-grow text-zinc-100"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <button
                          type="submit"
                          className="bg-[#e2b874] hover:bg-[#d4a863] text-zinc-950 px-3 rounded-lg text-xs font-bold flex items-center justify-center transition active:scale-95"
                        >
                          Buscar
                        </button>
                      </div>
                    </form>

                    <div className="space-y-2 max-h-[350px] overflow-y-auto">
                      <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                        Resultados encontrados: {searchResults.length}
                      </h4>

                      {searchResults.length === 0 ? (
                        <p className="text-[11px] text-zinc-500 italic py-6 text-center">Nenhum resultado para exibir.</p>
                      ) : (
                        searchResults.map((res, idx) => (
                          <button
                            key={idx}
                            onClick={() => handlePageChange(res.page)}
                            className="w-full text-left p-2.5 bg-zinc-900/20 hover:bg-zinc-900 border border-zinc-850 rounded-lg text-xs transition block space-y-1"
                          >
                            <span className="text-[9px] bg-zinc-800 border border-zinc-700 text-[#e2b874] px-1.5 py-0.5 rounded font-bold">
                              Página {res.page + 1}
                            </span>
                            <p className="text-zinc-300 font-serif italic text-[11px] line-clamp-2">"{res.snippet}"</p>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {activeSidebarTab === "reviews" && (
                  /* Reviews & Comments view */
                  <div>
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3.5 flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-[#e2b874]" />
                      Comunidade & Avaliações
                    </h4>
                    <BookReviews bookId={book.id} userId={userId} user={user} />
                  </div>
                )}
              </div>

              {/* Sidebar Footer bookmarks jump lists */}
              <div className="p-4 bg-gray-50 border-t border-gray-100 text-xs">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-gray-600 uppercase tracking-wider text-[10px]">Páginas Marcadas</span>
                  <span className="text-[10px] text-gray-400 font-mono">{bookmarks.length} pags</span>
                </div>

                <div className="flex gap-1.5 overflow-x-auto py-1 scrollbar-none">
                  {bookmarks.length === 0 ? (
                    <span className="text-[10px] text-gray-400 italic">Nenhuma página marcada.</span>
                  ) : (
                    bookmarks.map((bm) => (
                      <button
                        key={bm.id}
                        onClick={() => handlePageChange(bm.page)}
                        className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold transition flex items-center gap-1 cursor-pointer hover:bg-white hover:text-[#8a7e58] ${
                          currentPage === bm.page
                            ? "bg-[#8a7e58] text-white border-[#8a7e58]"
                            : "bg-[#f6f5ee] border-[#dad5bf] text-gray-600"
                        }`}
                      >
                        Pág {bm.page + 1}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
