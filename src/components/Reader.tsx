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
  Minimize2,
  Trash2,
  Settings,
  Sparkles,
  Headphones,
  FileText,
  List,
  X,
  Eye,
  EyeOff,
  Sliders,
  Maximize,
  Minimize
} from "lucide-react";
import { Book, ReadingProgress, Bookmark as BookmarkType, HighlightAndNote, User } from "../types";
import { askGeminiAssistant } from "../lib/api";
import BookReviews from "./BookReviews";
import { isUserPremium } from "../lib/subscription";
import { useAdManager } from "./AdManager";
import { Lock } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface ReaderProps {
  book: Book;
  userId: string;
  user: User;
  onBackToLibrary: () => void;
  onOpenAudiobook: () => void;
  onUpdateProgress: (page: number, readingSeconds?: number) => void;
  progress: ReadingProgress | null;
  onTriggerPaywall: (reason: "highlights") => void;
  onUpdateUser?: (updatedUser: User) => void;
  onFocusModeChange?: (isFocus: boolean) => void;
}

type ReaderTheme = "claro" | "sepia" | "escuro" | "auto";

function getLastOrderedListNumber(markdownContent: string): number {
  if (!markdownContent) return 0;
  const lines = markdownContent.split("\n");
  let lastNum = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const match = line.match(/^(\d+)\.\s+/);
    if (match) {
      lastNum = parseInt(match[1], 10);
    }
  }
  return lastNum;
}

export function preprocessMarkdownLists(content: string): string {
  if (!content) return content;
  return content
    .split("\n")
    .map((line) => {
      // Matches lines that start with spaces/tabs, followed by digits, a period, and then a character that is NOT a space, period, or digit.
      // E.g., "1.texto" -> "1. texto"
      return line.replace(/^(\s*)(\d+)\.(?!\s|\d|\.)/g, "$1$2. ");
    })
    .join("\n");
}

export default function Reader({
  book,
  userId,
  user,
  onBackToLibrary,
  onOpenAudiobook,
  onUpdateProgress,
  progress,
  onTriggerPaywall,
  onUpdateUser,
  onFocusModeChange,
}: ReaderProps) {
  const premium = isUserPremium(user);
  const { triggerInterstitialAd } = useAdManager();
  const [currentPage, setCurrentPage] = useState(progress?.lastPage || 0);
  const [theme, setTheme] = useState<ReaderTheme>(() => {
    return (user?.preferences?.theme as ReaderTheme) || "escuro";
  });
  const [isFocusMode, setIsFocusMode] = useState(false);

  useEffect(() => {
    onFocusModeChange?.(isFocusMode);
  }, [isFocusMode, onFocusModeChange]);
  const [fontSize, setFontSize] = useState(1.1); // in rem
  const [fontFamily, setFontFamily] = useState<string>(() => {
    return (user?.preferences as any)?.fontFamily || "'Merriweather', 'Georgia', serif";
  });

  const [showMobileFontControls, setShowMobileFontControls] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((e) => console.warn(e));
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch((e) => console.warn(e));
      }
    }
  };

  const [markedPositions, setMarkedPositions] = useState<{ [page: number]: number }>(() => {
    try {
      const saved = localStorage.getItem(`bookverse_readmark_${book.id}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const handleToggleMarkPosition = (pageIndex: number, paragraphIndex: number) => {
    setMarkedPositions((prev) => {
      const updated = { ...prev };
      if (updated[pageIndex] === paragraphIndex) {
        delete updated[pageIndex];
      } else {
        updated[pageIndex] = paragraphIndex;
      }
      try {
        localStorage.setItem(`bookverse_readmark_${book.id}`, JSON.stringify(updated));
      } catch (e) {
        console.error("Error saving read mark", e);
      }
      return updated;
    });
  };

  const [bookmarks, setBookmarks] = useState<BookmarkType[]>([]);
  const [notes, setNotes] = useState<HighlightAndNote[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<"companion" | "notes" | "search" | "reviews">("companion");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ page: number; snippet: string }[]>([]);

  // Page tracking states & refs
  const [visitedPages, setVisitedPages] = useState<number[]>(() => [progress?.lastPage || 0]);
  const [showFloatingNav, setShowFloatingNav] = useState(false);
  
  const pageScrollPositionsRef = useRef<{ [page: number]: number }>({});
  const readerScrollContainerRef = useRef<HTMLDivElement>(null);
  
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  // Dynamically resolve theme based on "auto" option (time of day)
  const getResolvedTheme = (t: ReaderTheme): "claro" | "sepia" | "escuro" => {
    if (t !== "auto") return t;
    const hour = new Date().getHours();
    if (hour >= 7 && hour < 18) {
      return "claro";
    } else if (hour >= 18 && hour < 21) {
      return "sepia";
    } else {
      return "escuro";
    }
  };

  const resolvedTheme = getResolvedTheme(theme);

  // Helper functions to dynamically highlight matching text in pages
  const renderHighlightedText = (text: string, pageNotes: HighlightAndNote[]) => {
    if (!pageNotes || pageNotes.length === 0 || !text) return text;

    interface MatchInterval {
      start: number;
      end: number;
      note: HighlightAndNote;
    }

    let matches: MatchInterval[] = [];

    pageNotes.forEach((note) => {
      const term = note.selectedText;
      if (!term) return;

      let index = text.indexOf(term);
      while (index !== -1) {
        matches.push({
          start: index,
          end: index + term.length,
          note,
        });
        index = text.indexOf(term, index + 1);
      }
    });

    if (matches.length === 0) return text;

    matches.sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start;
      return b.end - a.end;
    });

    const finalMatches: MatchInterval[] = [];
    let lastEnd = 0;

    for (const match of matches) {
      if (match.start >= lastEnd) {
        finalMatches.push(match);
        lastEnd = match.end;
      }
    }

    if (finalMatches.length === 0) return text;

    const result: React.ReactNode[] = [];
    let currentIndex = 0;

    finalMatches.forEach((match, i) => {
      if (match.start > currentIndex) {
        result.push(text.substring(currentIndex, match.start));
      }

      let colorClass = "";
      if (resolvedTheme === "escuro") {
        if (match.note.color === "green") colorClass = "bg-emerald-950/80 text-emerald-300 border-b border-emerald-500/50";
        else if (match.note.color === "blue") colorClass = "bg-blue-950/80 text-blue-300 border-b border-blue-500/50";
        else if (match.note.color === "pink") colorClass = "bg-pink-950/80 text-pink-300 border-b border-pink-500/50";
        else colorClass = "bg-amber-950/80 text-amber-300 border-b border-amber-500/50";
      } else if (resolvedTheme === "sepia") {
        if (match.note.color === "green") colorClass = "bg-green-100/90 text-green-900 border-b border-green-400/40";
        else if (match.note.color === "blue") colorClass = "bg-blue-100/90 text-blue-900 border-b border-blue-400/40";
        else if (match.note.color === "pink") colorClass = "bg-pink-100/90 text-pink-900 border-b border-pink-400/40";
        else colorClass = "bg-yellow-100/90 text-yellow-900 border-b border-yellow-400/40";
      } else {
        if (match.note.color === "green") colorClass = "bg-green-100 text-green-900 border-b border-green-500/30";
        else if (match.note.color === "blue") colorClass = "bg-blue-100 text-blue-900 border-b border-blue-500/30";
        else if (match.note.color === "pink") colorClass = "bg-pink-100 text-pink-900 border-b border-pink-500/30";
        else colorClass = "bg-yellow-100 text-yellow-900 border-b border-yellow-500/30";
      }

      result.push(
        <span
          key={`hl-${match.note.id}-${i}`}
          className={`${colorClass} px-1 rounded-sm relative group cursor-pointer font-medium transition-all duration-200 hover:brightness-110`}
          title={match.note.text || "Destaque"}
        >
          {text.substring(match.start, match.end)}
          {match.note.text && (
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-zinc-900 text-zinc-100 text-[11px] font-sans px-2.5 py-1.5 rounded-lg shadow-xl border border-zinc-800 whitespace-nowrap z-50">
              {match.note.text}
            </span>
          )}
        </span>
      );

      currentIndex = match.end;
    });

    if (currentIndex < text.length) {
      result.push(text.substring(currentIndex));
    }

    return result;
  };

  const highlightChildren = (node: React.ReactNode): React.ReactNode => {
    if (typeof node === "string") {
      return renderHighlightedText(node, notes.filter((n) => n.page === currentPage));
    }
    if (React.isValidElement(node)) {
      const element = node as React.ReactElement<{ children?: React.ReactNode }>;
      if (element.props && element.props.children) {
        const childrenArray = React.Children.toArray(element.props.children);
        const highlighted = childrenArray.map((child, idx) => {
          const childKey = (child as any)?.key || idx;
          return <React.Fragment key={childKey}>{highlightChildren(child)}</React.Fragment>;
        });
        return React.cloneElement(element, {}, ...highlighted);
      }
    }
    return node;
  };
  
  // Timer to track exact active reading time (in seconds) on the current page
  const timeSpentRef = useRef<number>(0);

  useEffect(() => {
    const timer = setInterval(() => {
      timeSpentRef.current += 1;
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen to keyboard shortcuts and page turning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isTyping = activeEl && (
        activeEl.tagName === "INPUT" ||
        activeEl.tagName === "TEXTAREA" ||
        activeEl.getAttribute("contenteditable") === "true"
      );
      
      if (isTyping) return;
      
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        setIsFocusMode((prev) => !prev);
      } else if (e.key === "Escape" && isFocusMode) {
        e.preventDefault();
        setIsFocusMode(false);
      } else if (e.key === "ArrowRight" || e.key === "PageDown") {
        if (currentPage < book.pages - 1) {
          e.preventDefault();
          handlePageChange(currentPage + 1);
        }
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        if (currentPage > 0) {
          e.preventDefault();
          handlePageChange(currentPage - 1);
        }
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentPage, isFocusMode, book.pages]);

  const handleThemeChange = async (newTheme: ReaderTheme) => {
    setTheme(newTheme);
    if (userId) {
      try {
        const { updateUserProfile } = await import("../lib/api");
        const currentPrefs = user?.preferences || {};
        const updatedUser = await updateUserProfile(userId, {
          preferences: {
            ...currentPrefs,
            theme: newTheme,
          }
        });
        if (onUpdateUser) {
          onUpdateUser(updatedUser);
        }
      } catch (err) {
        console.error("Erro ao atualizar tema nas preferências:", err);
      }
    }
  };
  
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
      setVisitedPages((prev) => {
        if (!prev.includes(progress.lastPage)) {
          return [...prev, progress.lastPage];
        }
        return prev;
      });
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
      const isNextPageAChapter = book.summary && book.summary.some(item => item.page === newPage);
      const isMovingForward = newPage > currentPage;

      const proceedPageChange = () => {
        // Save current scroll position before page change
        if (readerScrollContainerRef.current) {
          pageScrollPositionsRef.current[currentPage] = readerScrollContainerRef.current.scrollTop;
        }

        const elapsed = timeSpentRef.current;
        timeSpentRef.current = 0; // Reset for the next page
        
        const hasVisited = visitedPages.includes(newPage);

        setCurrentPage(newPage);
        onUpdateProgress(newPage, elapsed);
        // Clean selected text draft
        setSelectedText("");
        setShowHighlightForm(false);
        setAiResponse("");

        if (!hasVisited) {
          setVisitedPages((prev) => [...prev, newPage]);
        }

        // Restore scroll position
        setTimeout(() => {
          if (readerScrollContainerRef.current) {
            if (hasVisited) {
              readerScrollContainerRef.current.scrollTop = pageScrollPositionsRef.current[newPage] || 0;
            } else {
              readerScrollContainerRef.current.scrollTop = 0;
            }
          }
        }, 50);
      };

      if (isMovingForward && isNextPageAChapter && !premium) {
        const adShown = triggerInterstitialAd(proceedPageChange);
        if (!adShown) {
          proceedPageChange();
        }
      } else {
        proceedPageChange();
      }
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;

    const touch = e.changedTouches[0];
    const diffX = touch.clientX - touchStartXRef.current;
    const diffY = touch.clientY - touchStartYRef.current;

    if (Math.abs(diffX) > Math.abs(diffY)) {
      if (Math.abs(diffX) > 50) {
        if (diffX > 0) {
          if (currentPage > 0) {
            handlePageChange(currentPage - 1);
          }
        } else {
          if (currentPage < book.pages - 1) {
            handlePageChange(currentPage + 1);
          }
        }
      }
    }

    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest("a") ||
      target.closest("input") ||
      target.closest("select") ||
      target.closest("textarea") ||
      target.closest(".highlight-panel") ||
      window.getSelection()?.toString().trim()
    ) {
      return;
    }
    setShowFloatingNav((prev) => !prev);
  };

  // Handle exiting back to library and saving the final reading session seconds
  const handleBackToLibrary = () => {
    const elapsed = timeSpentRef.current;
    timeSpentRef.current = 0;
    onUpdateProgress(currentPage, elapsed);
    
    if (!premium) {
      const adShown = triggerInterstitialAd(onBackToLibrary);
      if (!adShown) {
        onBackToLibrary();
      }
    } else {
      onBackToLibrary();
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
  const activeTheme = themeStyles[resolvedTheme];

  // Table of Contents summary handling
  const bookSummary = book.summary || [];
  const activeTocIndex = bookSummary.reduce((bestIdx, item, idx) => {
    const itemPageIndex = item.page - 1; // Convert to 0-index
    if (currentPage >= itemPageIndex) {
      if (bestIdx === -1 || itemPageIndex > (bookSummary[bestIdx].page - 1)) {
        return idx;
      }
    }
    return bestIdx;
  }, -1);

  // Handle text selection (mouse & mobile touch handles)
  useEffect(() => {
    let timeoutId: any = null;
    const handleSelectionChange = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const selection = window.getSelection();
        if (selection) {
          const text = selection.toString().trim();
          if (text && text.length >= 3) {
            if (!premium && notes.length >= 3) {
              onTriggerPaywall("highlights");
              return;
            }
            setSelectedText(text);
            setShowHighlightForm(true);
          }
        }
      }, 300);
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [notes.length, premium, onTriggerPaywall]);

  return (
    <div className={`h-[100dvh] flex flex-col overflow-hidden font-sans transition-colors duration-300 ${activeTheme.outerBg} selection:bg-[#e2b874]/30 relative`}>
      {/* Subtle floating escape focus button when in Focus Mode */}
      {isFocusMode && (
        <>
          <div className="absolute top-4 right-4 z-50 group">
            <button
              onClick={() => setIsFocusMode(false)}
              className={`p-2 rounded-xl transition duration-200 cursor-pointer shadow-md opacity-30 hover:opacity-100 ${
                resolvedTheme === "escuro" 
                  ? "bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white" 
                  : "bg-white border border-gray-200 text-gray-600 hover:text-gray-900"
              }`}
              title="Sair do Modo Foco (F)"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
            <span className={`absolute right-10 top-1.5 text-[10px] font-bold whitespace-nowrap px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition shadow border ${
              resolvedTheme === "escuro" 
                ? "bg-zinc-950 border-zinc-850 text-zinc-400" 
                : "bg-white border-gray-100 text-gray-500"
            }`}>
              Sair do Modo Foco (F)
            </span>
          </div>

          {/* Floating side-navigation arrows in Focus Mode */}
          {currentPage > 0 && (
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              className={`absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 rounded-full transition duration-200 cursor-pointer shadow-lg z-30 opacity-20 hover:opacity-90 backdrop-blur-xs ${
                resolvedTheme === "escuro" 
                  ? "bg-zinc-900/60 border border-zinc-800 text-zinc-300 hover:text-white" 
                  : "bg-white/60 border border-gray-200 text-gray-600 hover:text-gray-900"
              }`}
              title="Página Anterior (←)"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          {currentPage < book.pages - 1 && (
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              className={`absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 rounded-full transition duration-200 cursor-pointer shadow-lg z-30 opacity-20 hover:opacity-90 backdrop-blur-xs ${
                resolvedTheme === "escuro" 
                  ? "bg-zinc-900/60 border border-zinc-800 text-zinc-300 hover:text-white" 
                  : "bg-white/60 border border-gray-200 text-gray-600 hover:text-gray-900"
              }`}
              title="Próxima Página (→)"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </>
      )}

      {/* Top Navbar */}
      {!isFocusMode && (
        <header className={`px-3 py-2 md:px-5 md:py-3 border-b flex flex-col md:flex-row md:items-center justify-between gap-2 shadow-sm sticky top-0 z-20 transition-colors ${
          resolvedTheme === "escuro" 
            ? "bg-[#121214] border-zinc-800 text-zinc-100" 
            : resolvedTheme === "sepia" 
              ? "bg-[#fcf7e8] border-[#ebdcb3] text-[#4a3f28]" 
              : "bg-white border-gray-200 text-gray-900"
        }`}>
          {/* Row 1 on mobile: Title & back button on left, quick controls on the right */}
          <div className="flex items-center justify-between w-full md:w-auto gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={handleBackToLibrary}
                className={`p-1.5 rounded-xl transition cursor-pointer flex-shrink-0 ${
                  resolvedTheme === "escuro" ? "hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100" : "hover:bg-gray-100 text-gray-600"
                }`}
                title="Voltar para Biblioteca"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              
              <div className="min-w-0">
                <h2 className={`text-xs md:text-sm font-serif font-bold truncate ${resolvedTheme === "escuro" ? "text-zinc-100" : "text-gray-900"}`}>{book.title}</h2>
                <p className={`text-[9px] md:text-[10px] truncate ${resolvedTheme === "escuro" ? "text-zinc-500" : "text-gray-500"}`}>{book.author}</p>
              </div>
            </div>

            {/* Quick Panels on the right (MOBILE ONLY) */}
            <div className="flex md:hidden items-center gap-1 flex-shrink-0">
              {book.audiobookAvailable && (
                <button
                  onClick={onOpenAudiobook}
                  className={`p-1.5 rounded-lg flex items-center gap-1 text-[10px] font-semibold transition cursor-pointer ${
                    resolvedTheme === "escuro" 
                      ? "bg-[#e2b874]/10 hover:bg-[#e2b874]/25 text-[#e2b874]" 
                      : "bg-[#8a7e58]/10 hover:bg-[#8a7e58]/20 text-[#8a7e58]"
                  }`}
                  title="Ouvir Audiobook"
                >
                  <Headphones className="w-3.5 h-3.5 animate-pulse" />
                  <span>Audio</span>
                </button>
              )}

              {/* Collapsible Appearance button on mobile */}
              <button
                onClick={() => setShowMobileFontControls(!showMobileFontControls)}
                className={`p-1.5 rounded-lg flex items-center gap-1 text-[10px] font-semibold transition cursor-pointer border ${
                  showMobileFontControls
                    ? "bg-[#e2b874]/20 border-[#e2b874]/50 text-[#e2b874]"
                    : resolvedTheme === "escuro"
                      ? "bg-zinc-900 border-zinc-800 text-zinc-300"
                      : "bg-gray-100 border-gray-200 text-gray-700"
                }`}
                title="Aparência, Fonte e Tema"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Aa</span>
              </button>

              <button
                onClick={handleToggleBookmark}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  isCurrentPageBookmarked
                    ? "bg-red-500/15 text-red-400 hover:bg-red-500/25"
                    : resolvedTheme === "escuro" 
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
                    ? resolvedTheme === "escuro" 
                      ? "bg-zinc-800 text-zinc-100" 
                      : "bg-gray-100 text-gray-850" 
                    : resolvedTheme === "escuro" 
                      ? "text-zinc-400 hover:bg-zinc-850 hover:text-zinc-200" 
                      : "text-gray-500 hover:bg-gray-100"
                }`}
                title="Marcadores e Notas"
              >
                <BookMarked className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsTocOpen(!isTocOpen)}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  isTocOpen 
                    ? resolvedTheme === "escuro" 
                      ? "bg-zinc-800 text-zinc-100" 
                      : "bg-gray-100 text-gray-850" 
                    : resolvedTheme === "escuro" 
                      ? "text-zinc-400 hover:bg-zinc-850 hover:text-zinc-200" 
                      : "text-gray-500 hover:bg-gray-100"
                }`}
                title="Sumário"
              >
                <List className="w-4 h-4" />
              </button>

              {/* Fullscreen Button Mobile */}
              <button
                onClick={toggleFullscreen}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  isFullscreen
                    ? "bg-[#e2b874]/20 text-[#e2b874]"
                    : resolvedTheme === "escuro"
                      ? "text-zinc-400 hover:bg-zinc-850 hover:text-zinc-200"
                      : "text-gray-500 hover:bg-gray-100"
                }`}
                title={isFullscreen ? "Sair da Tela Cheia" : "Tela Cheia"}
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>

              <button
                onClick={() => setIsFocusMode(!isFocusMode)}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  isFocusMode 
                    ? resolvedTheme === "escuro" 
                      ? "bg-zinc-800 text-[#e2b874]" 
                      : "bg-gray-100 text-[#8a7e58]" 
                    : resolvedTheme === "escuro" 
                      ? "text-zinc-400 hover:bg-zinc-850 hover:text-zinc-200" 
                      : "text-gray-500 hover:bg-gray-100"
                }`}
                title="Modo Foco (F)"
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Central Controls: Font Sizes & Theme selection (Collapsible on mobile, Center on desktop) */}
          <div className={`${showMobileFontControls ? "flex" : "hidden md:flex"} flex-wrap md:flex-nowrap items-center justify-center gap-2 w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 ${
            resolvedTheme === "escuro" ? "border-zinc-800" : "border-gray-200"
          }`}>
            {/* Font Family selector & Font Sizes controls */}
            <div className={`flex rounded-xl p-1 items-center border gap-1 ${
              resolvedTheme === "escuro" ? "bg-zinc-900 border-zinc-800" : "bg-gray-50 border-gray-200"
            }`}>
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                className={`text-xs font-semibold rounded-lg px-2 py-1 transition cursor-pointer outline-none ${
                  resolvedTheme === "escuro"
                    ? "bg-zinc-900 text-zinc-200 hover:text-white"
                    : "bg-gray-50 text-gray-800 hover:bg-white"
                }`}
                title="Escolher Fonte de Leitura"
              >
                <option value="'Merriweather', 'Georgia', serif">Merriweather (Serif)</option>
                <option value="'Georgia', 'Times New Roman', serif">Georgia (Clássica)</option>
                <option value="'Inter', system-ui, sans-serif">Inter (Sans-Serif)</option>
                <option value="'Atkinson Hyperlegible', sans-serif">Atkinson (Legível)</option>
                <option value="'Courier Prime', monospace">Courier (Monospaçada)</option>
              </select>
              <div className={`w-px h-4 mx-1 ${resolvedTheme === "escuro" ? "bg-zinc-800" : "bg-gray-200"}`}></div>
              <button
                onClick={() => setFontSize(Math.max(0.8, fontSize - 0.1))}
                className={`p-1 px-2.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  resolvedTheme === "escuro" ? "hover:bg-zinc-850 text-zinc-300" : "hover:bg-white text-gray-700"
                }`}
                title="Diminuir texto"
              >
                A-
              </button>
              <button
                onClick={() => setFontSize(Math.min(2.0, fontSize + 0.1))}
                className={`p-1 px-2.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  resolvedTheme === "escuro" ? "hover:bg-zinc-850 text-zinc-300" : "hover:bg-white text-gray-700"
                }`}
                title="Aumentar texto"
              >
                A+
              </button>
            </div>

            {/* Reading Themes Toggles */}
            <div className={`flex rounded-xl p-1 items-center border gap-1 ${
              resolvedTheme === "escuro" ? "bg-zinc-900 border-zinc-800" : "bg-gray-50 border-gray-200"
            }`}>
              {(["claro", "sepia", "escuro", "auto"] as ReaderTheme[]).map((t) => (
                <button
                  key={t}
                  onClick={() => handleThemeChange(t)}
                  className={`p-1 px-1.5 sm:px-2.5 rounded-lg text-[10px] font-bold uppercase transition cursor-pointer flex items-center gap-1.5 ${
                    theme === t 
                      ? resolvedTheme === "escuro" 
                        ? "bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700" 
                        : resolvedTheme === "sepia" 
                          ? "bg-[#fcf7e8] text-[#4a3f28] shadow-sm border border-[#ebdcb3]" 
                          : "bg-white text-gray-900 shadow-sm border border-gray-200"
                      : resolvedTheme === "escuro" 
                        ? "text-zinc-500 hover:text-zinc-350 hover:bg-zinc-800/20" 
                        : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-250/30"
                  }`}
                  title={t === "auto" ? "Tema Automático" : `Tema ${t}`}
                >
                  <span className={`w-3 h-3 rounded-full border border-black/10 flex-shrink-0 ${
                    t === "claro" ? "bg-white" : t === "sepia" ? "bg-[#f4ebd0]" : t === "escuro" ? "bg-zinc-950" : "bg-gradient-to-tr from-zinc-950 via-[#ebdcb3] to-white"
                  }`} />
                  <span className="sm:inline text-[10px]">{t === "auto" ? "Auto" : t}</span>
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
                  resolvedTheme === "escuro" 
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
                  : resolvedTheme === "escuro" 
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
                  ? resolvedTheme === "escuro" 
                    ? "bg-zinc-800 text-zinc-100" 
                    : "bg-gray-100 text-gray-850" 
                  : resolvedTheme === "escuro" 
                    ? "text-zinc-400 hover:bg-zinc-850 hover:text-zinc-200" 
                    : "text-gray-500 hover:bg-gray-100"
              }`}
              title="Marcadores e Notas"
            >
              <BookMarked className="w-5 h-5" />
            </button>

            <button
              onClick={() => setIsTocOpen(!isTocOpen)}
              className={`p-2 rounded-xl transition cursor-pointer ${
                isTocOpen 
                  ? resolvedTheme === "escuro" 
                    ? "bg-zinc-800 text-zinc-100" 
                    : "bg-gray-100 text-gray-850" 
                  : resolvedTheme === "escuro" 
                    ? "text-zinc-400 hover:bg-zinc-850 hover:text-zinc-200" 
                    : "text-gray-500 hover:bg-gray-100"
              }`}
              title="Sumário"
            >
              <List className="w-5 h-5" />
            </button>

            {/* Fullscreen Button Desktop */}
            <button
              onClick={toggleFullscreen}
              className={`p-2 rounded-xl transition cursor-pointer ${
                isFullscreen
                  ? "bg-[#e2b874]/20 text-[#e2b874]"
                  : resolvedTheme === "escuro"
                    ? "text-zinc-400 hover:bg-zinc-850 hover:text-zinc-200"
                    : "text-gray-500 hover:bg-gray-100"
              }`}
              title={isFullscreen ? "Sair da Tela Cheia" : "Tela Cheia"}
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>

            <button
              onClick={() => setIsFocusMode(!isFocusMode)}
              className={`p-2 rounded-xl transition cursor-pointer ${
                isFocusMode 
                  ? resolvedTheme === "escuro" 
                    ? "bg-zinc-800 text-[#e2b874]" 
                    : "bg-gray-100 text-[#8a7e58]" 
                  : resolvedTheme === "escuro" 
                    ? "text-zinc-400 hover:bg-zinc-850 hover:text-zinc-200" 
                    : "text-gray-500 hover:bg-gray-100"
              }`}
              title="Modo Foco (F)"
            >
              <Eye className="w-5 h-5" />
            </button>
          </div>
        </header>
      )}

      {/* Main split viewport layout */}
      <div className={`flex-grow flex relative overflow-hidden ${isFocusMode ? "h-screen" : "h-[calc(100vh-53px)]"}`}>
        
        {/* Floating navigation buttons */}
        <AnimatePresence>
          {showFloatingNav && !isFocusMode && (
            <>
              {currentPage > 0 && (
                <motion.button
                  key="float-left"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePageChange(currentPage - 1);
                  }}
                  className={`absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 p-3 sm:p-4 rounded-full transition duration-200 cursor-pointer shadow-xl z-30 backdrop-blur-md opacity-75 hover:opacity-100 hover:scale-105 border flex items-center justify-center ${
                    resolvedTheme === "escuro"
                      ? "bg-zinc-900/80 border-zinc-700/70 text-[#e2b874] hover:bg-zinc-800"
                      : "bg-white/80 border-gray-300/80 text-amber-700 hover:bg-gray-50"
                  }`}
                  title="Página Anterior"
                >
                  <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                </motion.button>
              )}
              {currentPage < book.pages - 1 && (
                <motion.button
                  key="float-right"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePageChange(currentPage + 1);
                  }}
                  className={`absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 p-3 sm:p-4 rounded-full transition duration-200 cursor-pointer shadow-xl z-30 backdrop-blur-md opacity-75 hover:opacity-100 hover:scale-105 border flex items-center justify-center ${
                    resolvedTheme === "escuro"
                      ? "bg-zinc-900/80 border-zinc-700/70 text-[#e2b874] hover:bg-zinc-800"
                      : "bg-white/80 border-gray-300/80 text-amber-700 hover:bg-gray-50"
                  }`}
                  title="Próxima Página"
                >
                  <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                </motion.button>
              )}
            </>
          )}
        </AnimatePresence>

        {/* Discrete always-visible page indicator fixed at bottom right */}
        <div className={`fixed z-30 pointer-events-none select-none transition-all duration-300 ${
          isFocusMode ? "bottom-4 right-4" : "bottom-16 sm:bottom-4 right-4"
        }`}>
          <span className={`text-[11px] font-bold font-mono px-3 py-1.5 rounded-xl shadow-lg border transition-all duration-300 ${
            resolvedTheme === "escuro" 
              ? "bg-zinc-950/90 border-zinc-800 text-zinc-300 shadow-black/50" 
              : resolvedTheme === "sepia"
                ? "bg-[#fcf7e8]/90 border-[#ebdcb3] text-[#695d46] shadow-[#ebdcb3]/30"
                : "bg-white/90 border-gray-200 text-gray-700 shadow-gray-200/50"
          }`}>
            Pág. {currentPage + 1} / {book.pages}
          </span>
        </div>

        {/* E-book reader core body */}
        <div
          ref={readerScrollContainerRef}
          className="flex-grow flex flex-col justify-between p-4 md:p-8 overflow-y-auto"
          onMouseUp={handleTextSelection}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClick={handleContainerClick}
        >
          <div className="max-w-2xl mx-auto w-full my-auto">
            
            {/* Pages viewport animation */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPage}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.25 }}
                className={`p-8 md:p-12 rounded-2xl border shadow-md leading-relaxed ${activeTheme.cardBg}`}
                style={{ fontSize: `${fontSize}rem`, fontFamily: fontFamily }}
                ref={pageTextRef}
              >
                <div className="markdown-body">
                  {(() => {
                    let currentParagraphIndex = 0;
                    return (
                      <ReactMarkdown
                        components={{
                          h1: ({ children }) => (
                            <h1 className={`font-serif font-bold text-2xl md:text-3xl mb-6 tracking-tight pb-3 border-b border-dashed ${
                              resolvedTheme === "escuro" ? "text-[#e2b874] border-zinc-800" : resolvedTheme === "sepia" ? "text-[#544830] border-[#ebdcb3]" : "text-gray-900 border-gray-200"
                            }`}>
                              {children}
                            </h1>
                          ),
                          h2: ({ children }) => (
                            <h2 className={`font-serif font-bold text-lg md:text-xl mt-8 mb-4 tracking-tight ${
                              resolvedTheme === "escuro" ? "text-zinc-100" : resolvedTheme === "sepia" ? "text-[#544830]" : "text-gray-800"
                            }`}>
                              {children}
                            </h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className={`font-serif font-semibold text-base md:text-lg mt-6 mb-3 ${
                              resolvedTheme === "escuro" ? "text-zinc-200" : resolvedTheme === "sepia" ? "text-[#695d46]" : "text-gray-700"
                            }`}>
                              {children}
                            </h3>
                          ),
                          p: ({ children }) => {
                            const pIndex = currentParagraphIndex++;
                            const isMarked = markedPositions[currentPage] === pIndex;
                            const textContent = React.Children.toArray(children)
                              .map((child) => (typeof child === "string" || typeof child === "number" ? child : ""))
                              .join("");
                            return (
                              <div className="relative group/p my-3">
                                <p
                                  className={`indent-6 p-2 rounded-xl transition text-justify ${
                                    isMarked
                                      ? "bg-[#e2b874]/20 border-l-4 border-[#e2b874] pl-3 text-[#e2b874] font-medium shadow-md"
                                      : "hover:bg-[#8a7e58]/10 hover:text-[#e2b874]"
                                  }`}
                                  onClick={() => {
                                    if (textContent) {
                                      handleParagraphClick(textContent);
                                    }
                                  }}
                                >
                                  {isMarked && (
                                    <span className="inline-flex items-center gap-1 text-[10px] bg-[#e2b874] text-zinc-950 font-bold px-2 py-0.5 rounded-md mr-2 shadow-sm font-sans uppercase tracking-wider">
                                      📌 Ponto de Parada
                                    </span>
                                  )}
                                  {highlightChildren(children)}
                                </p>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleMarkPosition(currentPage, pIndex);
                                  }}
                                  className={`absolute right-1 -top-2.5 transition-all p-1 px-2 text-[10px] rounded-lg font-sans font-bold flex items-center gap-1 cursor-pointer z-10 ${
                                    isMarked
                                      ? "bg-[#e2b874] text-zinc-950 shadow-md opacity-100"
                                      : `bg-zinc-900/90 text-zinc-300 hover:bg-[#e2b874] hover:text-zinc-950 border border-zinc-700 ${
                                          showFloatingNav
                                            ? "opacity-90"
                                            : "opacity-0 pointer-events-none sm:group-hover/p:opacity-100 sm:group-hover/p:pointer-events-auto"
                                        }`
                                  }`}
                                  title={isMarked ? "Desmarcar ponto de parada" : "Marcar como última parte lida"}
                                >
                                  <Bookmark className={`w-3 h-3 ${isMarked ? "fill-zinc-950" : ""}`} />
                                  <span>{isMarked ? "Desmarcar" : "Marcar parada"}</span>
                                </button>
                              </div>
                            );
                          },
                      strong: ({ children }) => (
                        <strong className={`font-bold ${
                          resolvedTheme === "escuro" ? "text-[#e2b874]" : resolvedTheme === "sepia" ? "text-[#8a7e58]" : "text-gray-900"
                        }`}>
                          {children}
                        </strong>
                      ),
                      em: ({ children }) => (
                        <em className="italic opacity-95">
                          {children}
                        </em>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className={`pl-4 py-1.5 border-l-4 my-6 italic text-sm md:text-base rounded-r-lg ${
                          resolvedTheme === "escuro"
                            ? "border-[#e2b874] bg-[#e2b874]/5 text-zinc-300"
                            : resolvedTheme === "sepia"
                              ? "border-[#8a7e58] bg-[#8a7e58]/5 text-[#695c42]"
                              : "border-[#8a7e58] bg-gray-50 text-gray-700"
                        }`}>
                          {highlightChildren(children)}
                        </blockquote>
                      ),
                      ul: ({ children }) => (
                        <ul className="book-verse-ul pl-6 my-4 space-y-2 text-sm md:text-base">
                          {children}
                        </ul>
                      ),
                      ol: ({ children, start }) => {
                        const currentPageContent = book.pdfContent[currentPage] || "";
                        let finalStart = start;

                        if (currentPageContent.includes("<!-- continue-ordered-list -->") && currentPage > 0) {
                          const prevPageContent = book.pdfContent[currentPage - 1] || "";
                          const lastNum = getLastOrderedListNumber(prevPageContent);
                          if (lastNum > 0) {
                            finalStart = lastNum + 1;
                          }
                        }

                        return (
                          <ol start={finalStart} className="book-verse-ol pl-6 my-4 space-y-2 text-sm md:text-base">
                            {children}
                          </ol>
                        );
                      },
                      li: ({ children }) => (
                        <li className="leading-relaxed">
                          {highlightChildren(children)}
                        </li>
                      ),
                      hr: () => (
                        <hr className={`my-8 border-t ${
                          resolvedTheme === "escuro" ? "border-zinc-800" : resolvedTheme === "sepia" ? "border-[#ebdcb3]" : "border-gray-200"
                        }`} />
                      ),
                      a: ({ children, href }) => {
                        const isInternal = href?.startsWith("#");
                        const handleLinkClick = (e: React.MouseEvent) => {
                          if (isInternal && href) {
                            e.preventDefault();
                            const hash = href.substring(1); // remove '#'
                            
                            // 1. Try to match as page number
                            const pageMatch = hash.match(/^p(?:agina)?-?(\d+)$/i) || hash.match(/^(\d+)$/);
                            if (pageMatch) {
                              const pageNum = parseInt(pageMatch[1], 10);
                              if (!isNaN(pageNum) && pageNum > 0 && pageNum <= book.pdfContent.length) {
                                handlePageChange(pageNum - 1);
                                return;
                              }
                            }
                            
                            // Helper to slugify
                            const slugifyText = (text: string) => {
                              return text
                                .toLowerCase()
                                .normalize("NFD")
                                .replace(/[\u0300-\u036f]/g, "") // remove accents
                                .replace(/[^a-z0-9\s-]/g, "")
                                .trim()
                                .replace(/\s+/g, "-");
                            };

                            const targetSlug = slugifyText(decodeURIComponent(hash));

                            // 2. Try to match chapter in bookSummary
                            const summaryIndex = bookSummary.findIndex((item) => {
                              return slugifyText(item.title) === targetSlug;
                            });

                            if (summaryIndex !== -1) {
                              const targetPage = bookSummary[summaryIndex].page;
                              if (targetPage > 0 && targetPage <= book.pdfContent.length) {
                                handlePageChange(targetPage - 1);
                                return;
                              }
                            }

                            // 3. Try to search for heading in pages (e.g. lines starting with '#', '##', etc.)
                            for (let pIdx = 0; pIdx < book.pdfContent.length; pIdx++) {
                              const lines = book.pdfContent[pIdx].split("\n");
                              for (const line of lines) {
                                if (line.trim().startsWith("#")) {
                                  const titleText = line.replace(/^#+\s+/, "").trim();
                                  if (slugifyText(titleText) === targetSlug) {
                                    handlePageChange(pIdx);
                                    return;
                                  }
                                }
                              }
                            }

                            // 4. Try generic substring match in pages
                            for (let pIdx = 0; pIdx < book.pdfContent.length; pIdx++) {
                              if (book.pdfContent[pIdx].toLowerCase().includes(decodeURIComponent(hash).toLowerCase())) {
                                handlePageChange(pIdx);
                                return;
                              }
                            }
                          }
                        };
                        return (
                          <a
                            href={href}
                            onClick={handleLinkClick}
                            target={isInternal ? undefined : "_blank"}
                            rel={isInternal ? undefined : "noopener noreferrer"}
                            className={`underline cursor-pointer transition-colors hover:opacity-80 font-medium ${
                              theme === "escuro" ? "text-[#e2b874]" : theme === "sepia" ? "text-[#8a7e58]" : "text-blue-600"
                            }`}
                          >
                            {children}
                          </a>
                        );
                      },
                      img: ({ src, alt }) => (
                        <img
                          src={src}
                          alt={alt}
                          className="mx-auto my-6 rounded-xl max-w-full h-auto shadow-md"
                          referrerPolicy="no-referrer"
                        />
                      ),
                    }}
                  >
                    {preprocessMarkdownLists(book.pdfContent[currentPage] || "")}
                  </ReactMarkdown>
                );
              })()}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Float Highlight Editor Panel (Floating on screen) */}
            {showHighlightForm && selectedText && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                className="fixed bottom-6 right-4 sm:right-6 z-50 max-w-md w-[calc(100%-2rem)] sm:w-full bg-zinc-900 border border-[#e2b874]/40 p-4.5 rounded-2xl shadow-2xl backdrop-blur-xl text-zinc-100"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-[#e2b874] flex items-center gap-1.5 uppercase tracking-wider font-sans">
                    <Highlighter className="w-3.5 h-3.5 text-[#e2b874]" />
                    Destacar Trecho Selecionado
                  </span>
                  <button
                    onClick={() => {
                      setSelectedText("");
                      setShowHighlightForm(false);
                    }}
                    className="text-zinc-400 hover:text-zinc-200 text-xs font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
                <p className="text-xs italic text-zinc-300 bg-zinc-950/80 p-2.5 rounded-xl mb-3 border-l-2 border-[#e2b874] line-clamp-2">
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
          {!isFocusMode && (
            <footer className="max-w-xl mx-auto w-full mt-4 flex items-center justify-between">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 0}
                className={`p-2 border rounded-xl transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 text-xs font-semibold ${
                  resolvedTheme === "escuro" 
                    ? "border-zinc-805 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white" 
                    : "border-[#dad5bf] bg-gray-50 text-gray-700 hover:bg-white"
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </button>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === book.pages - 1}
                className={`p-2 border rounded-xl transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 text-xs font-semibold ${
                  resolvedTheme === "escuro" 
                    ? "border-zinc-805 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white" 
                    : "border-[#dad5bf] bg-gray-50 text-gray-700 hover:bg-white"
                }`}
              >
                Próxima
                <ChevronRight className="w-4 h-4" />
              </button>
            </footer>
          )}
        </div>

        {/* Dynamic Sidebar Right: Highlights, Bookmarks, and Gemini AI Reading Companion Overlay Drawer */}
        <AnimatePresence>
          {isSidebarOpen && (
            <>
              {/* Backdrop Overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSidebarOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 cursor-pointer"
              />

              {/* Sliding Drawer Container from Right */}
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 220 }}
                className={`fixed top-0 right-0 bottom-0 h-full w-full max-w-[360px] sm:max-w-[400px] z-50 shadow-2xl flex flex-col justify-between transition-colors duration-300 ${
                  theme === "escuro" 
                    ? "bg-[#121214] border-l border-zinc-800 text-zinc-100" 
                    : theme === "sepia" 
                      ? "bg-[#fcf7e8] border-l border-[#ebdcb3] text-[#4a3f28]" 
                      : "bg-white border-l border-gray-200 text-gray-950"
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
                          <div className="markdown-body text-zinc-300">
                            <ReactMarkdown>{aiResponse}</ReactMarkdown>
                          </div>
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
          </>
        )}
      </AnimatePresence>

        {/* Table of Contents Sliding Drawer (Left) */}
        <AnimatePresence>
          {isTocOpen && (
            <>
              {/* Backdrop Overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsTocOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 cursor-pointer"
              />

              {/* Sliding Drawer Container */}
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 220 }}
                className={`fixed top-0 left-0 bottom-0 h-full w-full max-w-[340px] sm:max-w-[380px] z-50 shadow-2xl flex flex-col transition-colors duration-300 ${
                  theme === "escuro" 
                    ? "bg-[#121214] text-zinc-100 border-r border-zinc-800" 
                    : theme === "sepia" 
                      ? "bg-[#fcf7e8] text-[#4a3f28] border-r border-[#ebdcb3]" 
                      : "bg-white text-gray-900 border-r border-gray-200"
                }`}
              >
                {/* Drawer Header */}
                <div className={`p-4 md:p-5 border-b flex justify-between items-center transition-colors duration-300 ${
                  theme === "escuro" 
                    ? "bg-zinc-900 border-zinc-800" 
                    : theme === "sepia" 
                      ? "bg-[#f4ebd0] border-[#ebdcb3]" 
                      : "bg-gray-50 border-gray-100"
                }`}>
                  <div>
                    <h3 className={`font-serif font-bold text-base md:text-lg flex items-center gap-2 ${
                      theme === "escuro" ? "text-zinc-100" : theme === "sepia" ? "text-[#4a3f28]" : "text-gray-900"
                    }`}>
                      <List className={`w-5 h-5 ${theme === "escuro" ? "text-[#e2b874]" : "text-[#8a7e58]"}`} />
                      Sumário
                    </h3>
                    <p className={`text-[10px] md:text-xs font-serif truncate max-w-[200px] sm:max-w-[240px] mt-0.5 ${
                      theme === "escuro" ? "text-zinc-500" : "text-gray-500"
                    }`}>
                      {book.title}
                    </p>
                  </div>
                  <button
                    onClick={() => setIsTocOpen(false)}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      theme === "escuro" 
                        ? "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800" 
                        : "text-gray-400 hover:text-gray-700 hover:bg-gray-200/50"
                    }`}
                    title="Fechar Sumário"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Drawer Body (Scrollable List) */}
                <div className="flex-grow overflow-y-auto p-4 md:p-5 space-y-1 scrollbar-thin">
                  {bookSummary.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center px-4 space-y-3">
                      <FileText className={`w-12 h-12 stroke-1 ${theme === "escuro" ? "text-zinc-700" : "text-gray-300"}`} />
                      <div>
                        <p className={`text-sm font-semibold ${theme === "escuro" ? "text-zinc-400" : "text-gray-700"}`}>
                          Este livro não possui um sumário disponível.
                        </p>
                        <p className={`text-xs mt-1 max-w-[240px] ${theme === "escuro" ? "text-zinc-500" : "text-gray-400"}`}>
                          Use as setas de navegação no rodapé ou a barra de páginas para folhear o livro.
                        </p>
                      </div>
                      <button
                        onClick={() => setIsTocOpen(false)}
                        className={`mt-4 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition ${
                          theme === "escuro"
                            ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-100"
                            : "bg-gray-100 hover:bg-gray-200 text-gray-800"
                        }`}
                      >
                        Entendido
                      </button>
                    </div>
                  ) : (
                    bookSummary.map((item, idx) => {
                      const isActive = idx === activeTocIndex;
                      const itemPageIndex = item.page - 1;
                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            handlePageChange(itemPageIndex);
                            setIsTocOpen(false);
                          }}
                          className={`w-full text-left p-3.5 rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-between border ${
                            isActive
                              ? theme === "escuro"
                                ? "bg-[#e2b874]/10 text-[#e2b874] border-[#e2b874]/30 font-bold border-l-4 border-l-[#e2b874]"
                                : theme === "sepia"
                                  ? "bg-[#8a7e58]/15 text-[#8a7e58] border-[#8a7e58]/30 font-bold border-l-4 border-l-[#8a7e58]"
                                  : "bg-[#8a7e58]/10 text-[#8a7e58] border-[#8a7e58]/25 font-bold border-l-4 border-l-[#8a7e58]"
                              : theme === "escuro"
                                ? "bg-zinc-900/20 hover:bg-zinc-850/60 border-zinc-900/50 text-zinc-300 hover:text-zinc-100"
                                : theme === "sepia"
                                  ? "bg-[#fbf6e3]/30 hover:bg-[#ebdcae]/40 border-[#f5ebcb]/30 text-[#544830] hover:text-[#2d291c]"
                                  : "bg-gray-50 hover:bg-gray-100 border-gray-100 text-gray-700 hover:text-gray-900"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            {isActive && (
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                theme === "escuro" ? "bg-[#e2b874]" : "bg-[#8a7e58]"
                              }`} />
                            )}
                            <span className="truncate text-xs md:text-sm font-medium leading-snug">
                              {item.title}
                            </span>
                          </div>
                          <span className={`text-[10px] md:text-xs font-mono font-semibold px-2 py-0.5 rounded-md flex-shrink-0 ${
                            isActive
                              ? theme === "escuro"
                                ? "bg-[#e2b874]/20 text-[#e2b874]"
                                : "bg-[#8a7e58]/20 text-[#8a7e58]"
                              : theme === "escuro"
                                ? "bg-zinc-800 text-zinc-500"
                                : "bg-gray-200/60 text-gray-500"
                          }`}>
                            Pág {item.page}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Drawer Footer */}
                <div className={`p-4 border-t text-center text-[10px] md:text-xs font-medium transition-colors duration-300 ${
                  theme === "escuro" 
                    ? "bg-zinc-900 border-zinc-800 text-zinc-500" 
                    : theme === "sepia" 
                      ? "bg-[#f4ebd0] border-[#ebdcb3] text-[#807255]" 
                      : "bg-gray-50 border-gray-100 text-gray-500"
                }`}>
                  Progresso de Leitura: <span className="font-mono font-bold text-xs ml-1">{Math.round((currentPage + 1) / book.pages * 100)}%</span>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
