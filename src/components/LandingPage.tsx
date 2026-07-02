import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  BookOpen, 
  Sparkles, 
  Headphones, 
  ArrowRight, 
  Compass, 
  Trophy, 
  ShieldCheck, 
  ChevronRight, 
  Star, 
  Download, 
  Volume2, 
  BookMarked,
  Layout,
  Clock,
  Search,
  Globe,
  Lock,
  MessageSquare,
  Bookmark
} from "lucide-react";
import { Book } from "../types";
import { fetchBooks } from "../lib/api";

interface LandingPageProps {
  onNavigateToAuth: (mode: "login" | "register") => void;
  onExploreCatalog: () => void;
  onSelectBookGuest: (book: Book) => void;
}

export default function LandingPage({ onNavigateToAuth, onExploreCatalog, onSelectBookGuest }: LandingPageProps) {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBooks() {
      try {
        const booksList = await fetchBooks();
        setBooks(booksList.filter(b => b.status === "Active" || !b.status));
      } catch (err) {
        console.error("Erro ao carregar livros na landing page:", err);
      } finally {
        setLoading(false);
      }
    }
    loadBooks();
  }, []);

  // Featured books (e.g. first 3 or marked as premium/featured)
  const featuredBooks = books.slice(0, 3);
  
  // Recently added books (e.g. sorted by ID/date, or just slice of the next few)
  const recentlyAddedBooks = books.slice().reverse().slice(0, 4);

  // Popular categories
  const categories = Array.from(new Set(books.map((b) => b.category))).slice(0, 5);

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-[#e2b874]/30 overflow-x-hidden">
      {/* Absolute background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none"></div>

      {/* Modern Top Header / Navbar */}
      <nav className="border-b border-zinc-900 bg-[#0c0c0e]/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo brand */}
          <div className="flex items-center gap-2.5 cursor-pointer">
            <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center text-[#e2b874] shadow-md shadow-black/45">
              <BookOpen className="w-5.5 h-5.5" />
            </div>
            <span className="font-serif font-bold text-2xl tracking-tight text-zinc-50">BookVerse</span>
          </div>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <a href="#beneficios" className="hover:text-zinc-100 transition duration-200">Benefícios</a>
            <a href="#destaques" className="hover:text-zinc-100 transition duration-200">Destaques</a>
            <a href="#recursos" className="hover:text-zinc-100 transition duration-200">Recursos</a>
            <button 
              onClick={onExploreCatalog} 
              className="hover:text-[#e2b874] transition duration-200 font-bold"
            >
              Explorar Catálogo
            </button>
          </div>

          {/* Auth Action buttons */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => onNavigateToAuth("login")}
              className="px-4.5 py-2.5 text-xs font-bold text-zinc-300 hover:text-zinc-100 bg-zinc-900/40 hover:bg-zinc-900/90 border border-zinc-800 rounded-xl transition duration-200 cursor-pointer"
            >
              Entrar
            </button>
            <button 
              onClick={() => onNavigateToAuth("register")}
              className="px-4.5 py-2.5 text-xs font-bold bg-[#e2b874] text-zinc-950 hover:bg-[#c59e5f] rounded-xl shadow-lg shadow-amber-500/5 transition duration-200 cursor-pointer flex items-center gap-1.5"
            >
              Criar Conta
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative py-20 lg:py-32 overflow-hidden border-b border-zinc-900/60">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Text Column */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-900/80 border border-zinc-800 rounded-full text-xs text-[#e2b874] font-semibold"
            >
              <Sparkles className="w-3.5 h-3.5 animate-pulse text-[#e2b874]" />
              Sua Próxima Aventura Literária Começa Aqui
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-serif font-black tracking-tight leading-tight text-zinc-50"
            >
              Onde as páginas ganham <span className="text-[#e2b874] relative">voz e inteligência</span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-zinc-400 text-base sm:text-lg max-w-xl mx-auto lg:mx-0 leading-relaxed font-sans"
            >
              Explore um ecossistema imersivo de leitura. Sincronize audiobooks com narração por IA, acesse ferramentas de resumos instantâneos do Gemini e visualize o crescimento do seu hábito de leitura.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row justify-center lg:justify-start items-center gap-4 pt-4"
            >
              <button 
                onClick={() => onNavigateToAuth("register")}
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950 hover:from-amber-600 hover:to-amber-700 font-bold text-sm rounded-2xl shadow-xl shadow-amber-500/10 hover:shadow-amber-500/20 active:scale-[0.98] transition cursor-pointer flex items-center justify-center gap-2"
              >
                Criar Conta Grátis
                <ArrowRight className="w-4 h-4" />
              </button>
              <button 
                onClick={onExploreCatalog}
                className="w-full sm:w-auto px-8 py-4 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-100 hover:text-white font-bold text-sm rounded-2xl transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-black/40"
              >
                <Compass className="w-4 h-4 text-[#e2b874]" />
                Explorar Catálogo
              </button>
            </motion.div>

            {/* Quick trust metrics */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="pt-8 border-t border-zinc-900 grid grid-cols-3 gap-6 max-w-md mx-auto lg:mx-0 text-left"
            >
              <div>
                <p className="text-xl sm:text-2xl font-serif font-bold text-zinc-100">100%</p>
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mt-1">Interativo</p>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-serif font-bold text-zinc-100">AI-Powered</p>
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mt-1">Gemini Pro</p>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-serif font-bold text-zinc-100">Offline</p>
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mt-1">Leitura Everywhere</p>
              </div>
            </motion.div>
          </div>

          {/* Right Banner Image Column */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7 }}
            className="lg:col-span-5 relative flex justify-center"
          >
            <div className="relative w-72 sm:w-80 aspect-[3/4] bg-zinc-900 border border-zinc-800 rounded-3xl p-4 shadow-2xl shadow-black relative group overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-900/40 to-transparent z-10"></div>
              
              <img 
                src="https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=600&auto=format&fit=crop" 
                alt="BookVerse app experience" 
                className="w-full h-full object-cover rounded-2xl transition duration-500 group-hover:scale-105"
              />

              <div className="absolute bottom-6 left-6 right-6 z-20 space-y-2">
                <span className="text-[10px] uppercase font-bold bg-[#e2b874] text-zinc-950 px-2 py-0.5 rounded-md inline-block">Destaque</span>
                <h4 className="text-lg font-serif font-bold text-zinc-50 line-clamp-1">Dom Casmurro</h4>
                <p className="text-xs text-zinc-300 line-clamp-2">"A vida é uma ópera, mas o libreto é que às vezes não presta..." Machado de Assis clássico brasileiro.</p>
                <div className="flex gap-1.5 pt-2">
                  <span className="text-[9px] bg-zinc-950/80 text-[#e2b874] font-semibold px-2 py-1 rounded border border-zinc-800">188 pgs</span>
                  <span className="text-[9px] bg-zinc-950/80 text-[#e2b874] font-semibold px-2 py-1 rounded border border-zinc-800 flex items-center gap-0.5">
                    <Headphones className="w-2.5 h-2.5" /> AUDIO
                  </span>
                </div>
              </div>
            </div>

            {/* Float visual indicators */}
            <div className="absolute -top-4 -right-4 bg-[#121214] border border-zinc-800 rounded-2xl p-3 shadow-lg flex items-center gap-2.5 z-25 max-w-[150px]">
              <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center text-[#e2b874]">
                <Volume2 className="w-4 h-4 animate-bounce" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-zinc-200">Voz Realista</p>
                <p className="text-[8px] text-zinc-500">Narração Ativa</p>
              </div>
            </div>

            <div className="absolute -bottom-4 -left-4 bg-[#121214] border border-zinc-800 rounded-2xl p-3 shadow-lg flex items-center gap-2.5 z-25 max-w-[150px]">
              <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center text-purple-400">
                <Sparkles className="w-4 h-4 animate-pulse" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-zinc-200">Resumos IA</p>
                <p className="text-[8px] text-zinc-500">Pronto em 1s</p>
              </div>
            </div>
          </motion.div>
        </div>
      </header>

      {/* Core Platform Benefits section */}
      <section id="beneficios" className="py-24 bg-[#0c0c0e]/80 border-b border-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-xs uppercase font-bold text-[#e2b874] tracking-widest">A Revolução Digital da Leitura</h2>
            <h3 className="text-3xl sm:text-4xl font-serif font-bold text-zinc-50 tracking-tight">Recursos premium moldados para leitores modernos</h3>
            <p className="text-sm text-zinc-400">Uma experiência literária que vai muito além de ler simples páginas de PDF.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-[#121214] border border-zinc-850 p-6 rounded-2xl space-y-4 hover:border-zinc-800 transition group">
              <div className="w-12 h-12 bg-amber-500/5 group-hover:bg-amber-500/10 border border-zinc-800 rounded-xl flex items-center justify-center text-[#e2b874] transition">
                <Headphones className="w-6 h-6" />
              </div>
              <h4 className="font-serif font-bold text-base text-zinc-100">Audiobooks Sincronizados</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">Alterne fluidamente entre leitura de texto e áudio imersivo sem perder sua posição.</p>
            </div>

            <div className="bg-[#121214] border border-zinc-850 p-6 rounded-2xl space-y-4 hover:border-zinc-800 transition group">
              <div className="w-12 h-12 bg-purple-500/5 group-hover:bg-purple-500/10 border border-zinc-800 rounded-xl flex items-center justify-center text-purple-400 transition">
                <Sparkles className="w-6 h-6" />
              </div>
              <h4 className="font-serif font-bold text-base text-zinc-100">Inteligência Artificial</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">Gere resumos, extraia lições-chave e tire dúvidas de termos literários em tempo real com o Gemini.</p>
            </div>

            <div className="bg-[#121214] border border-zinc-850 p-6 rounded-2xl space-y-4 hover:border-zinc-800 transition group">
              <div className="w-12 h-12 bg-emerald-500/5 group-hover:bg-emerald-500/10 border border-zinc-800 rounded-xl flex items-center justify-center text-emerald-400 transition">
                <Download className="w-6 h-6" />
              </div>
              <h4 className="font-serif font-bold text-base text-zinc-100">Acesso Total Offline</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">Baixe seus livros prediletos diretamente no navegador e desfrute em aviões, metrôs ou sem internet.</p>
            </div>

            <div className="bg-[#121214] border border-zinc-850 p-6 rounded-2xl space-y-4 hover:border-zinc-800 transition group">
              <div className="w-12 h-12 bg-blue-500/5 group-hover:bg-blue-500/10 border border-zinc-800 rounded-xl flex items-center justify-center text-blue-400 transition">
                <Clock className="w-6 h-6" />
              </div>
              <h4 className="font-serif font-bold text-base text-zinc-100">Estatísticas e Hábitos</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">Acompanhe seu progresso diário, minutos gastos e veja sua dedicação em gráficos interativos.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Books section */}
      <section id="destaques" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-zinc-900 pb-6">
          <div className="space-y-1.5">
            <h2 className="text-xs uppercase font-bold text-[#e2b874] tracking-widest">Obras Primorosas</h2>
            <h3 className="text-3xl font-serif font-bold text-zinc-50">Livros em Destaque</h3>
            <p className="text-sm text-zinc-400">Comece a ler clássicos consagrados da literatura universal imediatamente.</p>
          </div>
          <button 
            onClick={onExploreCatalog}
            className="text-xs text-[#e2b874] hover:text-[#c59e5f] font-bold flex items-center gap-1 transition"
          >
            Ver catálogo completo
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <span className="w-8 h-8 border-2 border-[#e2b874]/20 border-t-[#e2b874] rounded-full animate-spin"></span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredBooks.map((book) => (
              <div 
                key={book.id} 
                onClick={() => onSelectBookGuest(book)}
                className="bg-[#121214] border border-zinc-850 hover:border-zinc-800 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition duration-300 flex flex-col md:flex-row h-full group cursor-pointer"
              >
                {/* Book cover mini */}
                <div className="w-full md:w-36 aspect-[3/4] md:aspect-auto bg-zinc-900 overflow-hidden relative flex-shrink-0 border-r border-zinc-850">
                  <img 
                    src={book.coverUrl} 
                    alt={book.title} 
                    className="w-full h-full object-cover transition duration-500 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  {book.accessType === "premium" && (
                    <div className="absolute top-2.5 left-2.5 bg-[#e2b874] text-zinc-950 text-[8px] font-black px-1.5 py-0.5 rounded shadow">
                      PREMIUM
                    </div>
                  )}
                </div>

                {/* Metadata details */}
                <div className="p-5 flex-grow flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] bg-zinc-900 border border-zinc-850 text-[#e2b874] font-semibold px-2 py-0.5 rounded-full">
                        {book.category}
                      </span>
                      <span className="text-[9px] text-zinc-500 font-mono">
                        {book.pages} pgs
                      </span>
                    </div>

                    <h4 className="font-serif font-bold text-base text-zinc-100 group-hover:text-[#e2b874] transition line-clamp-1">
                      {book.title}
                    </h4>
                    <p className="text-xs text-zinc-400">{book.author}</p>
                    <p className="text-[11px] text-zinc-500 leading-relaxed line-clamp-3">
                      {book.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-2 border-t border-zinc-900">
                    <span className="font-medium">Idioma: {book.language || "Português"}</span>
                    {book.audiobookAvailable && (
                      <span className="flex items-center gap-0.5 font-bold text-[#e2b874]">
                        <Headphones className="w-3.5 h-3.5" /> AUDIOBOOK
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recente section */}
      <section className="py-20 bg-[#0c0c0e]/60 border-t border-b border-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="space-y-1.5">
            <h2 className="text-xs uppercase font-bold text-[#e2b874] tracking-widest">Novidades Frescas</h2>
            <h3 className="text-3xl font-serif font-bold text-zinc-50">Adicionados Recentemente</h3>
            <p className="text-sm text-zinc-400">Confira as últimas aquisições de nosso catálogo para impulsionar suas leituras.</p>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center">
              <span className="w-8 h-8 border-2 border-[#e2b874]/20 border-t-[#e2b874] rounded-full animate-spin"></span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              {recentlyAddedBooks.map((book) => (
                <div 
                  key={book.id}
                  onClick={() => onSelectBookGuest(book)}
                  className="bg-[#121214] border border-zinc-850 hover:border-zinc-800 rounded-2xl overflow-hidden p-3 shadow-md hover:shadow-xl transition group cursor-pointer flex flex-col justify-between"
                >
                  <div className="aspect-[3/4] bg-zinc-900 rounded-xl overflow-hidden relative mb-3">
                    <img 
                      src={book.coverUrl} 
                      alt={book.title} 
                      className="w-full h-full object-cover transition duration-300 group-hover:scale-103"
                      referrerPolicy="no-referrer"
                    />
                    {book.audiobookAvailable && (
                      <div className="absolute bottom-2 left-2 bg-[#e2b874] text-zinc-950 text-[8px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 shadow">
                        <Headphones className="w-2.5 h-2.5" /> AUDIO
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <span className="text-[8px] text-[#e2b874] uppercase font-bold tracking-wider">{book.category}</span>
                    <h4 className="font-serif font-bold text-sm text-zinc-100 group-hover:text-[#e2b874] transition line-clamp-1">{book.title}</h4>
                    <p className="text-[10px] text-zinc-400 truncate">{book.author}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Popular Categories Grid Section */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center max-w-xl mx-auto space-y-3">
          <h2 className="text-xs uppercase font-bold text-[#e2b874] tracking-widest">Encontre Seus Gêneros</h2>
          <h3 className="text-3xl font-serif font-bold text-zinc-50">Categorias Populares</h3>
          <p className="text-sm text-zinc-400">Temos um catálogo selecionado de obras de múltiplos gêneros.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {categories.map((cat, i) => (
            <div 
              key={cat}
              onClick={onExploreCatalog}
              className="bg-[#121214] border border-zinc-850 hover:border-zinc-850 rounded-2xl p-6 text-center hover:bg-gradient-to-t hover:from-[#e2b874]/5 hover:to-transparent hover:border-[#e2b874]/35 cursor-pointer transition"
            >
              <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 text-[#e2b874] rounded-xl flex items-center justify-center mx-auto mb-3 shadow-md">
                {i % 4 === 0 ? <BookMarked className="w-5 h-5" /> : i % 4 === 1 ? <Trophy className="w-5 h-5" /> : i % 4 === 2 ? <Volume2 className="w-5 h-5" /> : <Star className="w-5 h-5" />}
              </div>
              <p className="font-serif font-bold text-xs text-zinc-100">{cat}</p>
              <p className="text-[10px] text-zinc-500 mt-1">Explorar Obras</p>
            </div>
          ))}
        </div>
      </section>

      {/* Detail Showcase: Mobile Readiness & Future Platform */}
      <section id="recursos" className="py-24 bg-[#0c0c0e]/90 border-t border-zinc-900 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 relative flex justify-center">
            {/* Phone-like Mockup frame container */}
            <div className="w-64 aspect-[9/19.5] bg-[#0c0c0e] border-[6px] border-zinc-800 rounded-[36px] shadow-2xl relative overflow-hidden flex flex-col justify-between">
              {/* Speaker receiver */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-4.5 bg-zinc-800 rounded-b-2xl z-30 flex justify-center items-center">
                <div className="w-8 h-1 bg-zinc-700 rounded-full"></div>
              </div>

              {/* Status bar */}
              <div className="h-6 px-4 bg-zinc-950/25 flex justify-between items-center text-[8px] text-zinc-500 z-20">
                <span>09:41</span>
                <span>LTE • 100%</span>
              </div>

              {/* Screen Mockup Content */}
              <div className="flex-grow p-4 space-y-4 pt-6 bg-[#09090b] relative overflow-hidden">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 bg-zinc-900 rounded-lg border border-zinc-800 flex items-center justify-center text-[#e2b874]">
                    <BookOpen className="w-3 h-3" />
                  </div>
                  <span className="font-serif font-black text-xs text-zinc-100">BookVerse Mobile</span>
                </div>

                <div className="bg-[#121214] border border-zinc-850 rounded-xl p-2.5 space-y-2">
                  <div className="w-full aspect-[4/3] bg-zinc-900 rounded-lg overflow-hidden relative">
                    <img 
                      src="https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=200&auto=format&fit=crop" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="text-[9px] font-bold text-zinc-200">Dom Casmurro</p>
                  <p className="text-[7px] text-zinc-500">Capítulo 1: O Título</p>
                  
                  {/* Miniature Audio loop bar */}
                  <div className="flex items-center gap-1">
                    <span className="text-[7px] text-zinc-500">1:34</span>
                    <div className="flex-grow h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="w-1/3 h-full bg-[#e2b874]"></div>
                    </div>
                    <span className="text-[7px] text-zinc-500">4:20</span>
                  </div>
                </div>

                <div className="flex justify-around items-center pt-2 border-t border-zinc-900 text-[8px] text-zinc-500">
                  <div className="text-center font-bold text-[#e2b874]">
                    <Compass className="w-3.5 h-3.5 mx-auto text-[#e2b874]" />
                    <span>Início</span>
                  </div>
                  <div className="text-center">
                    <BookOpen className="w-3.5 h-3.5 mx-auto" />
                    <span>Explorar</span>
                  </div>
                  <div className="text-center">
                    <Headphones className="w-3.5 h-3.5 mx-auto" />
                    <span>Áudio</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <span className="text-xs uppercase font-bold text-purple-400 tracking-widest">Multi-plataforma e Futuro</span>
            <h3 className="text-3xl sm:text-4xl font-serif font-bold text-zinc-50 tracking-tight">Pronto para o seu bolso</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              O BookVerse foi planejado arquitetonicamente para suportar uma migração nativa mobile rápida e limpa em Flutter. Nossos endpoints e armazenamento local de progresso são inteiramente modulares e preparados para sincronizar instantaneamente todas as suas marcações, notas, estatísticas e downloads offline entre múltiplos dispositivos.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 bg-amber-500/10 rounded-full flex items-center justify-center text-[#e2b874] flex-shrink-0 mt-0.5">
                  <Check className="w-3 h-3 font-black" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-200">Sincronização Nuvem Real-time</h4>
                  <p className="text-[10px] text-zinc-500">Sua página atual salva no computador é aberta no seu telefone móvel.</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 bg-amber-500/10 rounded-full flex items-center justify-center text-[#e2b874] flex-shrink-0 mt-0.5">
                  <Check className="w-3 h-3 font-black" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-200">Arquitetura Escalável</h4>
                  <p className="text-[10px] text-zinc-500">Lógica e controllers desacoplados prontos para API rest ou offline SQLite.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Footer */}
      <footer className="bg-zinc-950 border-t border-zinc-900 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-[#e2b874] shadow-sm">
                <BookOpen className="w-4.5 h-4.5" />
              </div>
              <span className="font-serif font-bold text-lg text-zinc-200">BookVerse</span>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Descubra, explore e cultive o prazer da leitura diária com uma biblioteca interativa abastecida de tecnologia.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs uppercase font-bold tracking-wider text-[#e2b874]">Plataforma</h4>
            <ul className="space-y-2 text-xs text-zinc-400">
              <li>
                <button onClick={onExploreCatalog} className="hover:text-zinc-100 transition">Explorar Catálogo</button>
              </li>
              <li>
                <button onClick={() => onNavigateToAuth("login")} className="hover:text-zinc-100 transition">Entrar / Login</button>
              </li>
              <li>
                <button onClick={() => onNavigateToAuth("register")} className="hover:text-zinc-100 transition">Registrar Conta</button>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs uppercase font-bold tracking-wider text-zinc-300">Recursos</h4>
            <ul className="space-y-2 text-xs text-zinc-400">
              <li><span className="text-zinc-500">Audiobooks por IA</span></li>
              <li><span className="text-zinc-500">Resumos Gemini Pro</span></li>
              <li><span className="text-zinc-500">Plano Premium SaaS</span></li>
              <li><span className="text-zinc-500">Leitura Offline RLS</span></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs uppercase font-bold tracking-wider text-zinc-300">Contato & Legal</h4>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Dúvidas ou feedbacks? Contate-nos através das redes ou envie e-mails de suporte institucional.
            </p>
            <div className="flex items-center gap-3 pt-1 text-zinc-400">
              <span className="text-[10px] bg-zinc-900 border border-zinc-850 px-2 py-1 rounded">v2.1 Stable</span>
              <span className="text-[10px] text-zinc-500">© {new Date().getFullYear()} BookVerse</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Simple Helper component for checkmark
function Check({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="3" 
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}
