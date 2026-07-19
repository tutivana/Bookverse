import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Search, BookOpen, Headphones, Heart, Clock, Compass, Sparkles, Star, Plus, Shield, Lock, Wifi, WifiOff, RefreshCw, Download } from "lucide-react";
import { Book, ReadingProgress, ReadingStats, User } from "../types";
import OfflineDownloadButton from "./OfflineDownloadButton";
import { isUserPremium } from "../lib/subscription";
import BookDetailModal from "./BookDetailModal";
import BookCard from "./BookCard";
import BookSkeleton, { BookSkeletonLoader } from "./BookSkeleton";
import { useBooks } from "./useBooks";
import { NativeBookAd } from "./AdManager";
import { getDownloadedBooks } from "../lib/offlineStore";
import { syncUserData } from "../lib/syncEngine";

interface LibraryProps {
  books: Book[];
  progresses: ReadingProgress[];
  favorites: string[];
  stats: ReadingStats | null;
  onSelectBook: (book: Book, startInAudioMode: boolean) => void;
  onToggleFavorite: (bookId: string) => void;
  onOpenStats: () => void;
  onOpenProfile: () => void;
  user: User | null;
  onTriggerPaywall: (reason: "audiobook" | "offline" | "premium_book" | "stats" | "highlights") => void;
}

export default function Library({
  books,
  progresses,
  favorites,
  stats,
  onSelectBook,
  onToggleFavorite,
  onOpenStats,
  onOpenProfile,
  user,
  onTriggerPaywall
}: LibraryProps) {
  const premium = isUserPremium(user);
  const [selectedDetailBook, setSelectedDetailBook] = useState<Book | null>(null);

  const handleBookClick = (book: Book, startInAudioMode: boolean) => {
    if (!user) {
      setSelectedDetailBook(book);
      return;
    }
    if (startInAudioMode && !premium) {
      onTriggerPaywall("audiobook");
      return;
    }
    if (book.accessType === "premium" && !premium) {
      onTriggerPaywall("premium_book");
      return;
    }
    onSelectBook(book, startInAudioMode);
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const [selectedLanguage, setSelectedLanguage] = useState("Todos");

  // Hybrid states
  type LibraryState = "ONLINE_LOADING" | "ONLINE_SYNCING" | "OFFLINE_MODE" | "EMPTY_OFFLINE";
  const [libraryState, setLibraryState] = useState<LibraryState>("ONLINE_LOADING");
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [downloadedBooks, setDownloadedBooks] = useState<Book[]>([]);
  const [cachedBooks, setCachedBooks] = useState<Book[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [activeLibraryTab, setActiveLibraryTab] = useState<"catalog" | "offline">("catalog");

  // Monitor connection status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Initial load of hybrid data
  const loadHybridData = async () => {
    try {
      const downloaded = await getDownloadedBooks();
      setDownloadedBooks(downloaded);

      const cachedStr = localStorage.getItem("bookverse_catalog_cache");
      let cached: Book[] = [];
      if (cachedStr) {
        cached = JSON.parse(cachedStr);
        setCachedBooks(cached);
      }

      if (!isOnline) {
        setActiveLibraryTab("offline");
        if (downloaded.length > 0) {
          setLibraryState("OFFLINE_MODE");
        } else {
          setLibraryState("EMPTY_OFFLINE");
        }
      } else {
        if (cached.length > 0 || downloaded.length > 0) {
          setLibraryState("ONLINE_SYNCING");
          await syncWithFirestoreBackground(downloaded, cached);
        } else {
          setLibraryState("ONLINE_LOADING");
          await syncWithFirestoreBackground(downloaded, []);
        }
      }
    } catch (err) {
      console.error("Failed to load initial hybrid data:", err);
      if (isOnline) {
        setLibraryState("ONLINE_LOADING");
      } else {
        setLibraryState("EMPTY_OFFLINE");
      }
    }
  };

  const syncWithFirestoreBackground = async (downloadedList: Book[], cachedList: Book[]) => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/books");
      if (res.ok) {
        const data = await res.json();
        const serverBooks = Array.isArray(data) ? data : (data.books || []);
        if (serverBooks && serverBooks.length > 0) {
          localStorage.setItem("bookverse_catalog_cache", JSON.stringify(serverBooks));
          setCachedBooks(serverBooks);
        }
      }

      if (user && user.id) {
        await syncUserData(user.id, favorites);
      }
    } catch (err) {
      console.warn("Background sync warning (using cached data):", err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadHybridData();
  }, [isOnline, user?.id]);

  // Complete lists of standard categories and languages
  const standardCategories = [
    "Todas",
    "Autoajuda",
    "Desenvolvimento Pessoal",
    "Filosofia",
    "Religião",
    "Psicologia",
    "História",
    "Política",
    "Economia",
    "Negócios",
    "Ciência",
    "Tecnologia",
    "Educação",
    "Direito",
    "Medicina",
    "Culinária",
    "Viagens",
    "Arte",
    "Ficção",
    "Romance",
    "Poesia",
    "Biografia",
    "Mistério",
    "Drama",
    "Aventura",
    "Fantasia",
    "Ficção Científica",
    "Infantil"
  ];
  
  const categories = Array.from(new Set([
    ...standardCategories,
    ...(isOnline && activeLibraryTab === "catalog" ? (books.length > 0 ? books : cachedBooks) : downloadedBooks).map((b) => b.category).filter(Boolean)
  ]));

  const standardLanguages = ["Todos", "Português", "Inglês", "Espanhol", "Francês", "Italiano", "Alemão"];
  const languages = Array.from(new Set([
    ...standardLanguages,
    ...(isOnline && activeLibraryTab === "catalog" ? (books.length > 0 ? books : cachedBooks) : downloadedBooks).map((b) => b.language).filter(Boolean)
  ]));

  // Count helper functions for active books
  const getCategoryCount = (cat: string) => {
    const listToCount = isOnline && activeLibraryTab === "catalog" ? (books.length > 0 ? books : cachedBooks) : downloadedBooks;
    if (cat === "Todas") {
      return listToCount.filter((b) => b.status === "Active" || !b.status).length;
    }
    return listToCount.filter((b) => (b.status === "Active" || !b.status) && b.category === cat).length;
  };

  const getLanguageCount = (lang: string) => {
    const listToCount = isOnline && activeLibraryTab === "catalog" ? (books.length > 0 ? books : cachedBooks) : downloadedBooks;
    if (lang === "Todos") {
      return listToCount.filter((b) => b.status === "Active" || !b.status).length;
    }
    return listToCount.filter((b) => (b.status === "Active" || !b.status) && b.language === lang).length;
  };

  // Usar o hook useBooks com paginação e busca otimizada
  const {
    books: fetchedBooks,
    loadingInitial,
    loadingMore,
    hasMore,
    loadMore
  } = useBooks(searchTerm, selectedCategory);

  // Filtrar por idioma em cima do lote de livros atual
  const displayedBooks = isOnline && activeLibraryTab === "catalog"
    ? fetchedBooks.filter((book) => selectedLanguage === "Todos" || book.language === selectedLanguage)
    : downloadedBooks.filter((book) => {
        const matchesSearch = !searchTerm || 
          book.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
          book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (book.category && book.category.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesCategory = selectedCategory === "Todas" || book.category === selectedCategory;
        const matchesLanguage = selectedLanguage === "Todos" || book.language === selectedLanguage;
        return matchesSearch && matchesCategory && matchesLanguage;
      });

  // Intersection Observer para Infinite Scroll / Lazy Loading
  const observerTargetRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!observerTargetRef.current || !hasMore || loadingInitial || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: "150px" }
    );

    observer.observe(observerTargetRef.current);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, loadingInitial, loadingMore, loadMore]);

  // Find books currently in progress (lastPage > 0 or progressPercentage > 0, but not fully read)
  const inProgressList = progresses
    .map((p) => {
      const bookListToSearch = (activeLibraryTab === "offline" || !isOnline) ? downloadedBooks : (books.length > 0 ? books : cachedBooks);
      const book = bookListToSearch.find((b) => b.id === p.bookId);
      return { book, progress: p };
    })
    .filter((item) => item.book && item.progress.progressPercentage < 100);

  // Find favorited books
  const favoriteBooks = ((activeLibraryTab === "offline" || !isOnline) ? downloadedBooks : (books.length > 0 ? books : cachedBooks)).filter((b) => favorites.includes(b.id));

  if (!isOnline && downloadedBooks.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-amber-500">
          <WifiOff className="w-8 h-8 animate-bounce" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-serif font-bold text-zinc-100">Biblioteca Offline Vazia</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Você está sem conexão com a internet no momento e não possui nenhum livro baixado para leitura offline.
          </p>
        </div>
        <div className="p-4 bg-zinc-900/60 border border-zinc-850 rounded-2xl text-left text-xs text-zinc-400 leading-relaxed">
          <p className="font-semibold text-zinc-200 mb-1 flex items-center gap-1.5">
            Como ler offline?
          </p>
          <ol className="list-decimal pl-4 space-y-1 mt-1.5">
            <li>Conecte-se a uma rede de internet (Wi-Fi ou dados móveis).</li>
            <li>Abra o catálogo de livros do BookVerse.</li>
            <li>Clique no botão <span className="text-[#e2b874] font-bold">"Baixar para ler Offline"</span> em qualquer livro.</li>
            <li>Pronto! Você poderá lê-lo e manter seu progresso mesmo sem conexão.</li>
          </ol>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="w-full bg-[#e2b874] hover:bg-[#c59e5f] text-zinc-950 font-bold text-xs py-3 rounded-xl transition cursor-pointer"
        >
          Verificar Conexão / Recarregar
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8 font-sans selection:bg-[#e2b874]/30">
      {/* Search Header Banner */}
      <div className="mb-10 text-center max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full text-xs text-[#e2b874] font-semibold mb-3"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Descubra Novas Leituras
        </motion.div>
        
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-zinc-100 tracking-tight">
          Sua Biblioteca Universo
        </h1>
        <p className="text-sm text-zinc-400 mt-1.5 max-w-md mx-auto">
          Explore clássicos imortais, ouça audiobooks sincronizados e gerencie seu progresso com suporte de inteligência artificial.
        </p>

        {/* Search input bar */}
        <div className="mt-6 relative max-w-md mx-auto">
          <Search className="absolute left-4 top-3.5 w-5 h-5 text-[#e2b874]" />
          <input
            type="text"
            placeholder="Pesquisar por título, autor ou assunto..."
            className="w-full bg-zinc-900 hover:bg-zinc-800 focus:bg-zinc-800 border border-zinc-800 focus:border-[#e2b874] text-zinc-100 rounded-2xl py-3 pl-12 pr-4 text-sm outline-none transition shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Connection and Syncing Indicators */}
      {!isOnline && (
        <div className="mb-8 p-4 bg-amber-950/20 border border-amber-900/30 text-amber-400 rounded-2xl flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/10">
              <WifiOff className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <p className="font-serif font-bold text-sm text-zinc-100">Você está offline</p>
              <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                Mostrando seus livros baixados. Conecte-se à internet para explorar o catálogo completo e sincronizar seu progresso.
              </p>
            </div>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-md">
            Modo Offline
          </span>
        </div>
      )}

      {isOnline && isSyncing && (
        <div className="mb-6 inline-flex items-center gap-2 px-3.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-full text-xs text-zinc-400">
          <RefreshCw className="w-3.5 h-3.5 text-[#e2b874] animate-spin" />
          <span>Sincronizando biblioteca com a nuvem...</span>
        </div>
      )}

      {/* Library View Switcher Tabs */}
      {isOnline && (
        <div className="mb-8 flex border-b border-zinc-850">
          <button
            onClick={() => setActiveLibraryTab("catalog")}
            className={`pb-3.5 px-4 font-serif font-bold text-sm tracking-tight border-b-2 transition cursor-pointer flex items-center gap-2 ${
              activeLibraryTab === "catalog"
                ? "border-[#e2b874] text-[#e2b874]"
                : "border-transparent text-zinc-400 hover:text-zinc-100"
            }`}
          >
            <Compass className="w-4 h-4" />
            Catálogo Online
          </button>
          <button
            onClick={() => setActiveLibraryTab("offline")}
            className={`pb-3.5 px-4 font-serif font-bold text-sm tracking-tight border-b-2 transition cursor-pointer flex items-center gap-2 ${
              activeLibraryTab === "offline"
                ? "border-[#e2b874] text-[#e2b874]"
                : "border-transparent text-zinc-400 hover:text-zinc-100"
            }`}
          >
            <Download className="w-4 h-4" />
            Livros Offline ({downloadedBooks.length})
          </button>
        </div>
      )}

      {/* Categories and Languages chips filters */}
      <div className="mb-8 space-y-4">
        <div>
          <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block mb-1.5">Filtrar por Categoria</span>
          <div className="overflow-x-auto whitespace-nowrap scrollbar-none py-1 flex gap-2">
            {categories.map((cat) => {
              const count = getCategoryCount(cat);
              return (
                <button
                  key={cat}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-medium tracking-wide border cursor-pointer transition flex items-center gap-2 ${
                    selectedCategory === cat
                      ? "bg-[#e2b874] text-zinc-950 border-[#e2b874] font-bold shadow-md shadow-[#e2b874]/10"
                      : "bg-[#121214] text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-100"
                  }`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  <span>{cat}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-sans font-medium ${
                    selectedCategory === cat
                      ? "bg-zinc-950/20 text-zinc-950"
                      : "bg-zinc-900 text-zinc-500"
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {languages.length > 1 && (
          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block mb-1.5">Filtrar por Idioma</span>
            <div className="overflow-x-auto whitespace-nowrap scrollbar-none py-1 flex gap-2">
              {languages.map((lang) => {
                const count = getLanguageCount(lang);
                return (
                  <button
                    key={lang}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-medium tracking-wide border cursor-pointer transition flex items-center gap-2 ${
                      selectedLanguage === lang
                        ? "bg-zinc-100 text-zinc-950 border-zinc-100 font-bold"
                        : "bg-[#121214] text-[#a1a1aa] border-zinc-800 hover:bg-zinc-800 hover:text-zinc-100"
                    }`}
                    onClick={() => setSelectedLanguage(lang)}
                  >
                    <span>{lang}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-sans font-medium ${
                      selectedLanguage === lang
                        ? "bg-zinc-200 text-zinc-950"
                        : "bg-zinc-900 text-[#71717a]"
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Grid containing In Progress (Continue Lendo) shelf */}
      {inProgressList.length > 0 && (
        <div className="mb-10">
          <h2 className="text-xl font-serif font-bold text-zinc-100 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#e2b874]" />
            Continuar Lendo
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {inProgressList.map(({ book, progress }) => {
              if (!book) return null;
              return (
                <motion.div
                  key={book.id}
                  whileHover={{ y: -2 }}
                  className="bg-[#121214] border border-zinc-800 rounded-2xl p-4 flex gap-4 shadow-md relative overflow-hidden"
                >
                  {/* Miniature Cover */}
                  <div
                    className="w-20 h-28 flex-shrink-0 bg-zinc-900 rounded-xl overflow-hidden shadow-sm border border-zinc-800 cursor-pointer relative"
                    onClick={() => handleBookClick(book, false)}
                  >
                    <img
                      src={book.coverUrl}
                      alt={book.title}
                      className={`w-full h-full object-cover transition duration-350 ${
                        book.status && book.status !== "Active" ? "grayscale opacity-40 blur-[0.5px]" : ""
                      }`}
                      referrerPolicy="no-referrer"
                    />
                    {book.accessType === "premium" && (
                      <div className="absolute top-1.5 left-1.5 bg-[#e2b874] text-[#09090b] text-[8px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5 shadow-md">
                        <Sparkles className="w-2 h-2 fill-current" />
                        <span>PREMIUM</span>
                      </div>
                    )}
                    {book.status && book.status !== "Active" && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="text-[8px] font-bold text-white px-1 py-0.5 rounded bg-zinc-950/80 border border-zinc-700">
                          {book.status === "Pending Review" ? "REVISÃO" : book.status === "Archived" ? "ARQUIVO" : "INDISP."}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-grow flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <h3
                          className="font-serif font-bold text-base text-zinc-100 hover:text-[#e2b874] cursor-pointer truncate flex-grow min-w-0"
                          onClick={() => handleBookClick(book, false)}
                        >
                          {book.title}
                        </h3>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className="text-[10px] bg-zinc-900 border border-zinc-800 text-[#e2b874] font-bold px-1.5 py-0.5 rounded-md">
                            Pág {progress.lastPage + 1}/{book.pages}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-zinc-400 truncate">{book.author}</p>
                    </div>

                    {/* Progress Bar */}
                    <div className="my-2">
                      <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                        <span>Progresso de leitura</span>
                        <span>{progress.progressPercentage}%</span>
                      </div>
                      <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#e2b874] h-full transition-all duration-300"
                          style={{ width: `${progress.progressPercentage}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Quick Access Actions */}
                    <div className="flex gap-2 mt-1">
                      {book.status && book.status !== "Active" ? (
                        <button
                          disabled
                          className="flex-1 bg-zinc-900/60 border border-zinc-850 text-zinc-500 text-[11px] font-bold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 cursor-not-allowed"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-zinc-600" />
                          Leitura Indisponível
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => handleBookClick(book, false)}
                            className="flex-grow bg-[#e2b874] hover:bg-[#c59e5f] text-zinc-950 text-[11px] font-bold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Ler</span>
                          </button>
                          {book.audiobookAvailable && (
                            <button
                              onClick={() => handleBookClick(book, true)}
                              className="w-9 h-9 flex-shrink-0 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-200 rounded-lg flex items-center justify-center transition active:scale-95 cursor-pointer"
                              title="Ouvir Audiobook"
                            >
                              <Headphones className="w-3.5 h-3.5 text-[#e2b874]" />
                            </button>
                          )}
                          <OfflineDownloadButton
                            book={book}
                            isPremium={premium}
                            onTriggerPaywall={() => onTriggerPaywall("offline")}
                            iconOnly={true}
                            className="w-9 h-9 flex-shrink-0"
                          />
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Grid: Recommended & Featured Books */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left 3 columns: Catalog Grid */}
        <div className="lg:col-span-3">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-serif font-bold text-zinc-100 flex items-center gap-2">
              <Compass className="w-6 h-6 text-[#e2b874]" />
              Catálogo de Livros
            </h2>
          </div>

          {loadingInitial ? (
            <BookSkeletonLoader count={6} />
          ) : displayedBooks.length === 0 ? (
            <div className="bg-[#121214] border border-zinc-800 rounded-2xl p-12 text-center">
              <p className="text-sm text-zinc-400 mb-2">Nenhum livro corresponde à sua busca ou categoria.</p>
              <button
                onClick={() => {
                  setSearchTerm("");
                  setSelectedCategory("Todas");
                  setSelectedLanguage("Todos");
                }}
                className="text-xs text-[#e2b874] hover:underline font-semibold cursor-pointer"
              >
                Limpar filtros e pesquisar novamente
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                {displayedBooks.map((book, index) => {
                  const isFav = favorites.includes(book.id);
                  const bookProg = progresses.find((p) => p.bookId === book.id);
                  const shouldRenderAd = !premium && index > 0 && index % 4 === 0;

                  return (
                    <React.Fragment key={book.id}>
                      {shouldRenderAd && (
                        <NativeBookAd index={index} />
                      )}
                      <BookCard
                        book={book}
                        user={user}
                        premium={premium}
                        isFav={isFav}
                        bookProg={bookProg}
                        handleBookClick={handleBookClick}
                        onToggleFavorite={onToggleFavorite}
                        setSelectedDetailBook={setSelectedDetailBook}
                        onTriggerPaywall={onTriggerPaywall}
                      />
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Observer Trigger to load more */}
              {hasMore && (
                <div ref={observerTargetRef} className="h-10 w-full flex items-center justify-center py-4">
                  {loadingMore ? (
                    <div className="w-full">
                      <BookSkeletonLoader count={3} />
                    </div>
                  ) : (
                    <div className="h-2 w-2 bg-[#e2b874] rounded-full animate-ping" />
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right 1 column: User Stats & Personalized recommendations sidebar */}
        <div className="space-y-6">
          {/* Quick Stats Bento card */}
          {!user ? (
            <div className="bg-gradient-to-br from-[#121214] to-[#0c0c0e] border border-zinc-800 p-5 rounded-2xl shadow-lg relative overflow-hidden text-center space-y-4">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#e2b874]/5 rounded-full blur-xl pointer-events-none"></div>
              
              <div className="w-10 h-10 bg-amber-500/10 border border-zinc-800 rounded-xl flex items-center justify-center text-[#e2b874] mx-auto">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>

              <div className="space-y-1">
                <h4 className="font-serif font-bold text-sm text-zinc-100">Acompanhe Suas Leituras</h4>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Crie sua conta gratuita para monitorar seu tempo de leitura, audiobooks ouvidos, páginas lidas e obter recomendações de IA personalizadas!
                </p>
              </div>

              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent("open-auth", { detail: { mode: "register" } }))}
                className="w-full bg-[#e2b874] hover:bg-[#c59e5f] text-zinc-950 font-bold text-xs py-2.5 rounded-xl transition cursor-pointer"
              >
                Cadastrar-se Grátis
              </button>
            </div>
          ) : (
            <div className="bg-[#121214] border border-zinc-800 rounded-2xl p-5 shadow-md">
              <h3 className="text-base font-serif font-bold text-zinc-100 mb-4 flex items-center gap-2 pb-2 border-b border-zinc-800">
                <Clock className="w-4.5 h-4.5 text-[#e2b874]" />
                Seu Desempenho
              </h3>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                  <p className="text-xs text-zinc-400 font-medium">Tempo Lendo</p>
                  <p className="text-xl font-serif font-bold text-[#e2b874] mt-0.5">
                    {stats ? `${Math.round(stats.readingMinutes)}m` : "0m"}
                  </p>
                </div>
                <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                  <p className="text-xs text-zinc-400 font-medium">Ouvindo Áudio</p>
                  <p className="text-xl font-serif font-bold text-[#e2b874] mt-0.5">
                    {stats ? `${Math.round(stats.listeningMinutes)}m` : "0m"}
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2 text-xs">
                <div className="flex justify-between text-zinc-400">
                  <span>Livros Concluídos:</span>
                  <span className="font-bold text-zinc-200">{stats?.booksCompletedCount || 0}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Páginas lidas:</span>
                  <span className="font-bold text-zinc-200">{stats?.pagesReadCount || 0} pgs</span>
                </div>
              </div>

              <button
                onClick={onOpenStats}
                className="w-full mt-4 bg-zinc-900 border border-zinc-800 hover:border-zinc-750 hover:bg-zinc-850 text-[#e2b874] font-bold text-xs py-2 rounded-xl transition cursor-pointer"
              >
                Ver Estatísticas Completas
              </button>
            </div>
          )}

          {/* Favoritos shelf compact */}
          {favoriteBooks.length > 0 && (
            <div className="bg-[#121214] border border-zinc-800 rounded-2xl p-5 shadow-md">
              <h3 className="text-base font-serif font-bold text-zinc-100 mb-3 flex items-center gap-2 pb-2 border-b border-zinc-800">
                <Heart className="w-4.5 h-4.5 text-[#e2b874] fill-[#e2b874]" />
                Seus Favoritos ({favoriteBooks.length})
              </h3>
              <div className="space-y-3">
                {favoriteBooks.slice(0, 3).map((fb) => (
                  <div key={fb.id} className="flex gap-2 items-center">
                    <div
                      className="w-9 h-12 relative flex-shrink-0 bg-zinc-900 rounded overflow-hidden border border-zinc-800 cursor-pointer"
                      onClick={() => onSelectBook(fb, false)}
                    >
                      <img
                        src={fb.coverUrl}
                        alt={fb.title}
                        className={`w-full h-full object-cover ${
                          fb.status && fb.status !== "Active" ? "grayscale opacity-40" : ""
                        }`}
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="min-w-0 flex-grow">
                      <div className="flex items-center gap-1.5 justify-between">
                        <h4
                          className="text-xs font-serif font-bold text-zinc-100 hover:text-[#e2b874] truncate cursor-pointer flex-grow"
                          onClick={() => onSelectBook(fb, false)}
                        >
                          {fb.title}
                        </h4>
                        {fb.status && fb.status !== "Active" && (
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0 ${
                            fb.status === "Pending Review" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                            fb.status === "Archived" ? "bg-zinc-600/10 text-zinc-400 border-zinc-600/20" :
                            "bg-red-500/10 text-red-400 border-red-500/20"
                          }`}>
                            {fb.status === "Pending Review" ? "Revisão" :
                             fb.status === "Archived" ? "Arquivado" : "Indisp."}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-400 truncate">{fb.author}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI recommendations card */}
          <div className="bg-gradient-to-br from-amber-500/5 to-transparent border border-zinc-800/80 rounded-2xl p-5 shadow-md relative overflow-hidden">
            <div className="absolute top-2 right-2 text-[#e2b874]/10">
              <Sparkles className="w-12 h-12" />
            </div>

            <h3 className="text-sm font-semibold text-[#e2b874] uppercase tracking-wider flex items-center gap-1.5 mb-2 font-sans">
              <Star className="w-4 h-4 fill-[#e2b874]" />
              Dica da IA do BookVerse
            </h3>
            
            <p className="text-xs font-serif italic text-zinc-300 leading-relaxed mb-3">
              "Para expandir seu pensamento filosófico de forma descontraída, leia **O Pequeno Príncipe** ou aventure-se pelas ironias psicológicas de Machado de Assis em **Dom Casmurro**."
            </p>

            <div className="text-[10px] text-zinc-500 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#e2b874]" />
              Gerado automaticamente baseado na sua preferência.
            </div>
          </div>
        </div>
      </div>

      <BookDetailModal
        isOpen={selectedDetailBook !== null}
        onClose={() => setSelectedDetailBook(null)}
        book={selectedDetailBook}
        user={user}
        isFavorite={selectedDetailBook ? favorites.includes(selectedDetailBook.id) : false}
        onToggleFavorite={onToggleFavorite}
        onSelectBook={onSelectBook}
        onTriggerAuth={(mode) => {
          window.dispatchEvent(new CustomEvent("open-auth", { detail: { mode } }));
        }}
        onTriggerPaywall={onTriggerPaywall}
      />
    </div>
  );
}
