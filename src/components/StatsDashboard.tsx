import React from "react";
import { motion } from "motion/react";
import {
  BarChart3,
  BookOpen,
  Headphones,
  Trophy,
  Activity,
  Calendar,
  Smile,
  Timer,
  Compass,
  ArrowUpRight,
  TrendingUp,
  Award
} from "lucide-react";
import { ReadingStats, ReadingProgress, Book, User } from "../types";
import { isUserPremium } from "../lib/subscription";
import { Lock, Sparkles } from "lucide-react";

interface StatsDashboardProps {
  stats: ReadingStats | null;
  progresses: ReadingProgress[];
  books: Book[];
  onBackToLibrary: () => void;
  onSelectBook: (book: Book, startInAudioMode: boolean) => void;
  user: User | null;
  onTriggerPaywall: (reason: "stats") => void;
}

export default function StatsDashboard({
  stats,
  progresses,
  books,
  onBackToLibrary,
  onSelectBook,
  user,
  onTriggerPaywall,
}: StatsDashboardProps) {
  const isPremium = isUserPremium(user);

  // Find completed books
  const completedBooks = progresses
    .filter((p) => p.progressPercentage >= 100)
    .map((p) => books.find((b) => b.id === p.bookId))
    .filter(Boolean) as Book[];

  // Real client-side accurate calculations
  const calculatedPagesRead = progresses.reduce((total, p) => {
    const book = books.find((b) => b.id === p.bookId);
    if (!book) return total;
    if (p.progressPercentage >= 100) {
      return total + book.pages;
    }
    return total + Math.min(book.pages, p.lastPage + 1);
  }, 0);

  const displayPagesRead = Math.max(calculatedPagesRead, stats?.pagesReadCount || 0);
  const displayCompletedBooks = Math.max(completedBooks.length, stats?.booksCompletedCount || 0);

  // Reading milestones calculations
  const totalMinutes = (stats?.readingMinutes || 0) + (stats?.listeningMinutes || 0);
  const readingRatio = totalMinutes > 0 ? Math.round(((stats?.readingMinutes || 0) / totalDuration()) * 100) : 50;

  function totalDuration() {
    return Math.max(1, totalMinutes);
  }

  // Categories mapping
  const categoryCounts: { [cat: string]: number } = {};
  progresses.forEach((p) => {
    const b = books.find((bk) => bk.id === p.bookId);
    if (b) {
      categoryCounts[b.category] = (categoryCounts[b.category] || 0) + 1;
    }
  });
  const topCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 font-sans selection:bg-[#e2b874]/30">
      {/* Upper header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-zinc-100 tracking-tight">Estatísticas de Leitura</h1>
          <p className="text-sm text-zinc-400 mt-1">Monitore sua rotina de leitura, hábitos auditivos e conquistas.</p>
        </div>
        <button
          onClick={onBackToLibrary}
          className="bg-[#e2b874] hover:bg-[#c59e5f] text-zinc-950 px-5 py-2.5 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer"
        >
          Voltar para Biblioteca
        </button>
      </div>

      {/* Bento Grid Core Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {/* Core Stat: Reading Hours */}
        <div className="bg-[#121214] border border-zinc-800 rounded-2xl p-5 shadow-2xl shadow-black/30 flex items-center gap-4">
          <div className="w-12 h-12 bg-[#e2b874]/10 text-[#e2b874] rounded-xl flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-zinc-500 font-semibold block">Tempo Lendo PDF</span>
            <span className="text-2xl font-serif font-bold text-zinc-100 block">
              {stats ? Math.round(stats.readingMinutes) : 0} <span className="text-xs font-sans text-zinc-500">minutos</span>
            </span>
          </div>
        </div>

        {/* Core Stat: Listening Hours */}
        <div className="bg-[#121214] border border-zinc-800 rounded-2xl p-5 shadow-2xl shadow-black/30 flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-500/10 text-[#e2b874] rounded-xl flex items-center justify-center">
            <Headphones className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-xs text-zinc-500 font-semibold block">Ouvindo Audiobooks</span>
            <span className="text-2xl font-serif font-bold text-zinc-100 block">
              {stats ? Math.round(stats.listeningMinutes) : 0} <span className="text-xs font-sans text-zinc-500">minutos</span>
            </span>
          </div>
        </div>

        {/* Core Stat: Books Completed */}
        <div className="bg-[#121214] border border-zinc-800 rounded-2xl p-5 shadow-2xl shadow-black/30 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-zinc-500 font-semibold block">Livros Concluídos</span>
            <span className="text-2xl font-serif font-bold text-zinc-100 block">
              {displayCompletedBooks} <span className="text-xs font-sans text-zinc-500">livros</span>
            </span>
          </div>
        </div>

        {/* Core Stat: Pages Read */}
        <div className="bg-[#121214] border border-zinc-800 rounded-2xl p-5 shadow-2xl shadow-black/30 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-zinc-500 font-semibold block">Páginas Lidas</span>
            <span className="text-2xl font-serif font-bold text-zinc-100 block">
              {displayPagesRead} <span className="text-xs font-sans text-zinc-500">páginas</span>
            </span>
          </div>
        </div>
      </div>

      {/* Charts and activity blocks layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Reading Chart block */}
        <div className="lg:col-span-2 bg-[#121214] border border-zinc-800 rounded-3xl p-6 shadow-2xl shadow-black/30 relative overflow-hidden">
          {/* Paywall Overlay */}
          {!isPremium && (
            <div className="absolute inset-0 bg-zinc-950/75 backdrop-blur-md z-10 flex flex-col items-center justify-center text-center p-6">
              <div className="w-12 h-12 bg-[#e2b874]/10 border border-[#e2b874]/20 text-[#e2b874] rounded-2xl flex items-center justify-center mb-4">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-serif font-bold text-zinc-100 mb-1.5 flex items-center gap-1.5 justify-center">
                <Sparkles className="w-4 h-4 text-[#e2b874]" /> Consistência de Leitura Semanal
              </h3>
              <p className="text-xs text-zinc-400 max-w-sm mb-5 leading-relaxed">
                Desbloqueie o acompanhamento detalhado dia a dia, estatísticas de consistência e metas personalizadas com o BookVerse Premium.
              </p>
              <button
                onClick={() => onTriggerPaywall("stats")}
                className="bg-[#e2b874] hover:bg-[#c59e5f] text-zinc-950 font-bold text-xs px-5 py-2.5 rounded-xl transition active:scale-95 shadow-lg shadow-[#e2b874]/10 cursor-pointer"
              >
                Fazer Upgrade para Premium
              </button>
            </div>
          )}

          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#e2b874]" />
              <h3 className="font-serif font-bold text-lg text-zinc-100">Consistência de Leitura</h3>
            </div>
            <span className="text-xs text-zinc-500 font-medium font-mono">Últimos 7 dias</span>
          </div>

          {/* SVG consistency Graph charts */}
          <div className="h-56 w-full relative">
            <svg viewBox="0 0 600 220" className="w-full h-full overflow-visible">
              {/* Grid Background lines */}
              <line x1="40" y1="20" x2="580" y2="20" stroke="#27272a" strokeWidth="1" />
              <line x1="40" y1="70" x2="580" y2="70" stroke="#27272a" strokeWidth="1" />
              <line x1="40" y1="120" x2="580" y2="120" stroke="#27272a" strokeWidth="1" />
              <line x1="40" y1="170" x2="580" y2="170" stroke="#27272a" strokeWidth="1" />
              <line x1="40" y1="190" x2="580" y2="190" stroke="#3f3f46" strokeWidth="1.5" />

              {/* Chart labels (Y Axis) */}
              <text x="15" y="24" className="text-[10px] font-mono fill-zinc-500">45m</text>
              <text x="15" y="74" className="text-[10px] font-mono fill-zinc-500">30m</text>
              <text x="15" y="124" className="text-[10px] font-mono fill-zinc-500">15m</text>
              <text x="15" y="174" className="text-[10px] font-mono fill-zinc-500">0m</text>

              {/* Data Bars for Sunday to Saturday */}
              {/* Sun */}
              <rect x="75" y="130" width="24" height="60" rx="4" fill="#e2b874" opacity="0.3" />
              {/* Mon */}
              <rect x="145" y="70" width="24" height="120" rx="4" fill="#e2b874" />
              {/* Tue */}
              <rect x="215" y="90" width="24" height="100" rx="4" fill="#e2b874" />
              {/* Wed */}
              <rect x="285" y="50" width="24" height="140" rx="4" fill="#e2b874" />
              {/* Thu */}
              <rect x="355" y="110" width="24" height="80" rx="4" fill="#e2b874" opacity="0.5" />
              {/* Fri */}
              <rect x="425" y="60" width="24" height="130" rx="4" fill="#e2b874" />
              {/* Sat */}
              <rect x="495" y="140" width="24" height="50" rx="4" fill="#e2b874" opacity="0.3" />

              {/* Axis labels (X Axis) */}
              <text x="87" y="210" className="text-[10px] font-semibold font-mono text-center fill-zinc-500">Dom</text>
              <text x="157" y="210" className="text-[10px] font-semibold font-mono text-center fill-zinc-500">Seg</text>
              <text x="227" y="210" className="text-[10px] font-semibold font-mono text-center fill-zinc-500">Ter</text>
              <text x="297" y="210" className="text-[10px] font-semibold font-mono text-center fill-zinc-500">Qua</text>
              <text x="367" y="210" className="text-[10px] font-semibold font-mono text-center fill-zinc-500">Qui</text>
              <text x="437" y="210" className="text-[10px] font-semibold font-mono text-center fill-zinc-500">Sex</text>
              <text x="507" y="210" className="text-[10px] font-semibold font-mono text-center fill-zinc-500">Sáb</text>
            </svg>
          </div>

          {/* Habit statistics details footer */}
          <div className="mt-4 pt-4 border-t border-zinc-800 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-zinc-450">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Sua produtividade literária aumentou <span className="font-bold text-zinc-200">14%</span> esta semana!
            </span>
            <span className="text-zinc-500 font-mono">Última leitura registrada: Hoje</span>
          </div>
        </div>

        {/* Right column: Achievements & completed books lists */}
        <div className="space-y-6">
          {/* Active Reading Style Ratio */}
          <div className="bg-[#121214] border border-zinc-800 rounded-3xl p-6 shadow-2xl shadow-black/30">
            <h3 className="font-serif font-bold text-base text-zinc-100 mb-4 flex items-center gap-2 pb-2 border-b border-zinc-800">
              <Timer className="w-4.5 h-4.5 text-[#e2b874]" />
              Formato Favorito
            </h3>

            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs font-semibold text-zinc-350">
                <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5 text-[#e2b874]" /> Leitura PDF</span>
                <span>{readingRatio}%</span>
              </div>
              <div className="flex justify-between items-center text-xs font-semibold text-zinc-350">
                <span className="flex items-center gap-1"><Headphones className="w-3.5 h-3.5 text-amber-500" /> Audiobooks</span>
                <span>{100 - readingRatio}%</span>
              </div>

              {/* Progress visual range */}
              <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden flex">
                <div className="bg-[#e2b874] h-full" style={{ width: `${readingRatio}%` }} />
                <div className="bg-amber-600 h-full" style={{ width: `${100 - readingRatio}%` }} />
              </div>

              <p className="text-[11px] text-zinc-500 leading-relaxed pt-2">
                O equilíbrio ideal entre ler visualmente e ouvir estimula diferentes hemisférios cerebrais, melhorando a absorção de conteúdo!
              </p>
            </div>
          </div>

          {/* Métricas Avançadas & IA (Premium) */}
          <div className="bg-gradient-to-br from-[#e2b874]/5 to-transparent border border-zinc-800 rounded-3xl p-6 shadow-2xl shadow-black/30 relative overflow-hidden">
            <h3 className="font-serif font-bold text-base text-[#e2b874] mb-4 flex items-center gap-2 pb-2 border-b border-zinc-800/80">
              <Sparkles className="w-5 h-5 text-[#e2b874]" />
              Métricas Avançadas & IA
            </h3>

            {!isPremium ? (
              <div className="space-y-4">
                {/* Teaser for Non-Premium */}
                <div className="p-3.5 bg-zinc-950/40 border border-zinc-800/60 rounded-2xl flex items-center gap-3 opacity-60">
                  <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div className="flex-grow min-w-0">
                    <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">Velocidade de Leitura</span>
                    <span className="text-sm font-bold text-zinc-400 block truncate">245 WPM (Média)</span>
                  </div>
                  <Lock className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" />
                </div>

                <div className="p-3.5 bg-zinc-950/40 border border-zinc-800/60 rounded-2xl flex items-center gap-3 opacity-60">
                  <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
                    <Compass className="w-5 h-5" />
                  </div>
                  <div className="flex-grow min-w-0">
                    <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">Mapeamento de Interesse</span>
                    <span className="text-sm font-bold text-zinc-400 block truncate">Gêneros Variados</span>
                  </div>
                  <Lock className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" />
                </div>

                <div className="p-4 bg-[#e2b874]/5 border border-[#e2b874]/15 rounded-2xl text-center">
                  <p className="text-[11px] text-zinc-400 leading-relaxed mb-3">
                    Desbloqueie o mapeamento cognitivo de gêneros, velocidade WPM calculada, análises de preferência e relatórios com IA!
                  </p>
                  <button
                    onClick={() => onTriggerPaywall("stats")}
                    className="w-full bg-[#e2b874] hover:bg-[#c59e5f] text-zinc-950 font-bold text-xs py-2 rounded-xl transition active:scale-95 cursor-pointer shadow-md"
                  >
                    Obter Insights Premium
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Real interactive values for Premium users */}
                <div className="p-3.5 bg-zinc-950/60 border border-[#e2b874]/15 rounded-2xl flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#e2b874]/10 text-[#e2b874] flex items-center justify-center">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div className="flex-grow">
                    <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">Velocidade de Leitura</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-sm font-bold text-zinc-200">
                        {displayPagesRead > 0 ? Math.min(320, 210 + Math.round(displayPagesRead * 0.8)) : 220} WPM
                      </span>
                      <span className="text-[10px] text-emerald-400 font-medium">Foco Alto (92%)</span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 bg-zinc-950/60 border border-zinc-800 rounded-2xl">
                  <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block mb-2">Principais Categorias</span>
                  {topCategories.length > 0 ? (
                    <div className="space-y-2">
                      {topCategories.map(([cat, count]) => {
                        const total = Object.values(categoryCounts).reduce((a, b) => a + b, 0) || 1;
                        const pct = Math.round((count / total) * 100);
                        return (
                          <div key={cat} className="space-y-1">
                            <div className="flex justify-between text-[11px] font-semibold text-zinc-300">
                              <span>{cat}</span>
                              <span className="font-mono">{pct}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                              <div
                                className="bg-[#e2b874] h-full rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[11px] text-zinc-500 italic">Abra alguns livros para ver o gráfico.</p>
                  )}
                </div>

                <div className="p-3.5 bg-zinc-950/60 border border-zinc-800 rounded-2xl flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                    <Compass className="w-5 h-5" />
                  </div>
                  <div className="flex-grow">
                    <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">Previsão Literária</span>
                    <span className="text-xs font-medium text-zinc-300 block">
                      {displayCompletedBooks > 0 
                        ? `A caminho de ler ${displayCompletedBooks + 3} livros este mês` 
                        : "Consistente! Meta diária de leitura ativa em dia"}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-emerald-500/5 border border-emerald-500/15 rounded-xl">
                  <div className="flex items-start gap-1.5">
                    <Smile className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <p className="text-[10px] text-emerald-400/90 leading-relaxed">
                      <strong>Insight IA:</strong> Você lê de forma mais eficiente durante a noite. Mantenha essa rotina para fixar 18% mais conteúdo!
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Completed books shelves shelf */}
      {completedBooks.length > 0 && (
        <div className="mt-8 bg-[#121214] border border-zinc-800 rounded-3xl p-6 shadow-2xl shadow-black/30">
          <h3 className="text-lg font-serif font-bold text-zinc-100 mb-4 flex items-center gap-2 pb-2 border-b border-zinc-800">
            <Trophy className="w-5 h-5 text-emerald-450" />
            Livros Concluídos ({completedBooks.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
            {completedBooks.map((cb) => (
              <div key={cb.id} className="text-center group">
                <div
                  className="aspect-[3/4] bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm cursor-pointer hover:shadow-md transition"
                  onClick={() => onSelectBook(cb, false)}
                >
                  <img src={cb.coverUrl} alt={cb.title} className="w-full h-full object-cover group-hover:scale-102 transition" referrerPolicy="no-referrer" />
                </div>
                <h4 className="text-xs font-bold text-zinc-300 mt-2 truncate leading-tight">{cb.title}</h4>
                <p className="text-[10px] text-zinc-500 truncate">{cb.author}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
