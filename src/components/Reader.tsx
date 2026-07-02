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
import { Book, ReadingProgress, Bookmark as BookmarkType, HighlightAndNote } from "../types";
import { askGeminiAssistant } from "../lib/api";

interface ReaderProps {
  book: Book;
  userId: string;
  onBackToLibrary: () => void;
  onOpenAudiobook: () => void;
  onUpdateProgress: (page: number) => void;
  progress: ReadingProgress | null;
}

type ReaderTheme = "claro" | "sepia" | "escuro";

export default function Reader({
  book,
  userId,
  onBackToLibrary,
  onOpenAudiobook,
  onUpdateProgress,
  progress,
}: ReaderProps) {
  const [currentPage, setCurrentPage] = useState(progress?.lastPage || 0);
  const [theme, setTheme] = useState<ReaderTheme>("escuro");
  const [fontSize, setFontSize] = useState(1.1); // in rem
  const [bookmarks, setBookmarks] = useState<BookmarkType[]>([]);
  const [notes, setNotes] = useState<HighlightAndNote[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ page: number; snippet: string }[]>([]);
  
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

  // Handle page turn and trigger parent progress update
  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && newPage < book.pages) {
      setCurrentPage(newPage);
      onUpdateProgress(newPage);
      // Clean selected text draft
      setSelectedText("");
      setShowHighlightForm(false);
      setAiResponse("");
    }
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
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString().trim());
      setShowHighlightForm(true);
    }
  };

  // Click on any paragraph to auto-select and highlight (Frictionless UX)
  const handleParagraphClick = (text: string) => {
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
      <header className={`px-4 py-3 border-b flex items-center justify-between shadow-sm sticky top-0 z-20 transition-colors ${
        theme === "escuro" 
          ? "bg-[#121214] border-zinc-800 text-zinc-100" 
          : theme === "sepia" 
            ? "bg-[#fcf7e8] border-[#ebdcb3] text-[#4a3f28]" 
            : "bg-white border-gray-200 text-gray-900"
      }`}>
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToLibrary}
            className={`p-2 rounded-xl transition cursor-pointer ${
              theme === "escuro" ? "hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100" : "hover:bg-gray-100 text-gray-600"
            }`}
            title="Voltar para Biblioteca"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="min-w-0">
            <h2 className={`text-sm font-serif font-bold truncate ${theme === "escuro" ? "text-zinc-100" : "text-gray-900"}`}>{book.title}</h2>
            <p className={`text-[10px] truncate ${theme === "escuro" ? "text-zinc-500" : "text-gray-500"}`}>{book.author}</p>
          </div>
        </div>

        {/* Central Controls */}
        <div className="flex items-center gap-2">
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
          <div className={`flex rounded-xl p-1 items-center border ${
            theme === "escuro" ? "bg-zinc-900 border-zinc-800" : "bg-gray-50 border-gray-200"
          }`}>
            {(["claro", "sepia", "escuro"] as ReaderTheme[]).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`p-1 px-2 rounded-lg text-[10px] font-bold uppercase transition cursor-pointer ${
                  theme === t 
                    ? theme === "escuro" 
                      ? "bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700" 
                      : theme === "sepia" 
                        ? "bg-[#fcf7e8] text-[#4a3f28] shadow-sm border border-[#ebdcb3]" 
                        : "bg-white text-gray-900 shadow-sm border border-gray-200"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Quick panels toggles */}
        <div className="flex items-center gap-1.5">
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
              <div className={`flex border-b text-xs ${
                theme === "escuro" ? "border-zinc-800" : theme === "sepia" ? "border-[#ebdcb3]" : "border-gray-100"
              }`}>
                {(["companion", "notes", "search"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      // Swap view modes
                      setActiveAiTab("summary");
                    }}
                    className={`flex-1 py-3 text-center font-bold capitalize transition cursor-pointer border-b-2 border-transparent ${
                      theme === "escuro" 
                        ? "text-zinc-400 hover:text-[#e2b874] hover:border-[#e2b874]" 
                        : "text-gray-500 hover:text-[#8a7e58] hover:border-[#8a7e58]"
                    }`}
                  >
                    {tab === "companion" ? "Gemini AI" : tab === "notes" ? "Notas (pág)" : "Pesquisar"}
                  </button>
                ))}
              </div>

              {/* Viewport contents */}
              <div className="flex-grow p-4 overflow-y-auto space-y-4">
                {/* AI Companion view */}
                <div className="space-y-4 font-sans">
                  <div className="bg-gradient-to-br from-[#8a7e58]/5 to-transparent border border-[#dad5bf] p-3.5 rounded-xl">
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
                        className="bg-white border border-[#ece9dc] hover:bg-[#f6f5ee] font-semibold text-gray-700 py-2 rounded-lg transition"
                      >
                        Resumir Página
                      </button>
                      <button
                        onClick={() => {
                          setActiveAiTab("flashcards");
                          handleAskAssistant("flashcard");
                        }}
                        className="bg-white border border-[#ece9dc] hover:bg-[#f6f5ee] font-semibold text-gray-700 py-2 rounded-lg transition"
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
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                      Pergunte algo sobre a página ou obra:
                    </label>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        placeholder="Ex: Qual o simbolismo desta cena?"
                        className="bg-gray-50 border border-gray-200 focus:border-[#8a7e58] text-xs px-3 py-2 rounded-lg outline-none flex-grow"
                        value={userAiQuestion}
                        onChange={(e) => setUserAiQuestion(e.target.value)}
                      />
                      <button
                        type="submit"
                        disabled={aiLoading}
                        className="bg-[#8a7e58] text-white px-3 rounded-lg text-xs font-bold flex items-center justify-center transition active:scale-95 disabled:opacity-40"
                      >
                        OK
                      </button>
                    </div>
                  </form>

                  {/* Response Container with full markdown styling */}
                  <div className="border border-[#ece9dc] rounded-xl p-3 bg-gray-50 min-h-[140px] text-xs relative">
                    {aiLoading ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 rounded-xl space-y-2">
                        <span className="w-6 h-6 border-2 border-[#8a7e58]/30 border-t-[#8a7e58] rounded-full animate-spin"></span>
                        <span className="text-[10px] text-gray-400 font-semibold animate-pulse">Gemini gerando resposta...</span>
                      </div>
                    ) : aiResponse ? (
                      <div className="space-y-2 text-gray-700 leading-relaxed font-sans max-h-[220px] overflow-y-auto">
                        <div className="flex items-center justify-between pb-1.5 border-b border-gray-200">
                          <span className="text-[9px] font-bold bg-[#8a7e58]/10 text-[#8a7e58] px-1.5 py-0.5 rounded uppercase">
                            {activeAiTab}
                          </span>
                          <span className="text-[9px] text-gray-400 font-mono">Gemini-3.5-Flash</span>
                        </div>
                        <div className="whitespace-pre-wrap">{aiResponse}</div>
                      </div>
                    ) : (
                      <div className="text-center text-gray-400 py-10 flex flex-col items-center justify-center">
                        <Sparkles className="w-8 h-8 text-gray-200 mb-1" />
                        <p className="text-[11px] font-medium leading-relaxed">
                          Nenhuma resposta ativa.<br />Use os botões acima ou faça uma pergunta sobre a obra!
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Local Notes of the active page view */}
                <div className="pt-4 border-t border-gray-100">
                  <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#8a7e58]" />
                    Suas Notas & Destaques nesta Página ({notes.filter((n) => n.page === currentPage).length})
                  </h4>

                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {notes.filter((n) => n.page === currentPage).length === 0 ? (
                      <p className="text-[11px] text-gray-400 italic">Nenhum destaque salvo na página {currentPage + 1}.</p>
                    ) : (
                      notes
                        .filter((n) => n.page === currentPage)
                        .map((note) => (
                          <div
                            key={note.id}
                            className={`p-2.5 rounded-lg border text-xs relative ${
                              note.color === "green"
                                ? "bg-green-50 border-green-200"
                                : note.color === "blue"
                                ? "bg-blue-50 border-blue-200"
                                : note.color === "pink"
                                ? "bg-pink-50 border-pink-200"
                                : "bg-yellow-50 border-yellow-200"
                            }`}
                          >
                            <button
                              onClick={() => handleDeleteHighlight(note.id)}
                              className="absolute top-2 right-2 text-gray-400 hover:text-red-500 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <p className="font-serif italic text-gray-700 line-clamp-2 pr-4">"{note.selectedText}"</p>
                            {note.text && <p className="mt-1 font-semibold text-gray-800">Nota: {note.text}</p>}
                          </div>
                        ))
                    )}
                  </div>
                </div>
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
