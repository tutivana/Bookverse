import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "motion/react";
import {
  ShieldAlert,
  Database,
  Plus,
  Trash2,
  Edit3,
  Check,
  AlertTriangle,
  Upload,
  BookOpen,
  Headphones,
  Settings,
  Sparkles,
  RefreshCcw,
  UserCheck,
  Download,
  FileText,
  ChevronLeft,
  ChevronRight,
  Search,
  FileUp,
  Shield,
  UserX,
  History,
  BarChart3,
  AlertOctagon,
  Eye,
  Calendar,
  BookOpenCheck,
  ListFilter,
  SlidersHorizontal,
  Info,
  Archive,
  RefreshCw,
  Layers,
  HelpCircle,
  Bell,
  MessageSquare,
  Cpu,
  Lock,
  Unlock,
  CheckCircle2,
  Trophy,
  CheckCircle
} from "lucide-react";
import AdminNotificationCenter from "./AdminNotificationCenter";
import ProfessionalBookEditor from "./ProfessionalBookEditor";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from "recharts";
import { Book, User, BookHistory, BookReport, AdminLog, Review } from "../types";
import {
  adminCreateBook,
  adminDeleteBook,
  adminUpdateBook,
  adminUpdateBookStatus,
  adminUpdateBookFeatured,
  adminExecuteBatchAction,
  adminFetchUsers,
  adminUpdateUserStatus,
  adminUpdateUserRole,
  adminFetchReports,
  adminUpdateReportStatus,
  adminFetchLogs,
  adminFetchDashboard,
  adminFetchReportedComments,
  adminUpdateCommentStatus,
  adminToggleUserCommentBan,
  adminFetchAiConfig,
  adminUpdateAiConfig,
  adminAnalyzeBook,
  adminAnalyzeCatalog,
  adminApplyAiSuggestions,
  adminDetectDuplicates,
  adminAiAssistantChat
} from "../lib/api";

interface AdminPanelProps {
  books: Book[];
  onBackToLibrary: () => void;
  onRefreshBooks: () => void;
  currentUser?: User;
}

export default function AdminPanel({ books, onBackToLibrary, onRefreshBooks, currentUser }: AdminPanelProps) {
  // Ensure we have active credentials, defaulting to Demo Super Administrador if missing
  const currentAdmin = currentUser || {
    id: "admin-demo-id",
    name: "Administrador Geral",
    email: "admin@bookverse.com",
    role: "Super Administrador"
  };

  const isAdminOrSuper = currentAdmin.role === "Super Administrador" || currentAdmin.role === "Administrador";

  // Helper to map and enrich duplicate pairs returned by backend APIs
  const mapDuplicatePairs = (rawDuplicates: any[]) => {
    return (rawDuplicates || []).map((item) => {
      const b1 = item.book1 || item.bookA || {};
      const b2 = item.book2 || item.bookB || {};
      
      const fullBookA = books.find((b) => b.id === b1.id) || b1;
      const fullBookB = books.find((b) => b.id === b2.id) || b2;
      
      let confidence = 0.9;
      if (item.confidence !== undefined) {
        confidence = item.confidence;
      } else if (item.similarityScore !== undefined) {
        confidence = item.similarityScore > 1 ? item.similarityScore / 100 : item.similarityScore;
      }
      
      return {
        ...item,
        bookA: {
          id: fullBookA.id || "",
          title: fullBookA.title || "",
          author: fullBookA.author || "",
          coverUrl: fullBookA.coverUrl || "",
          status: fullBookA.status || "Active"
        },
        bookB: {
          id: fullBookB.id || "",
          title: fullBookB.title || "",
          author: fullBookB.author || "",
          coverUrl: fullBookB.coverUrl || "",
          status: fullBookB.status || "Active"
        },
        confidence,
        reason: item.reason || "Potencial duplicidade de catálogo",
        suggestedAction: item.suggestedAction || "manter versão principal"
      };
    });
  };

  // Navigation State
  const [activeTab, setActiveTab] = useState<'books' | 'users' | 'reports' | 'logs' | 'dashboard' | 'notifications' | 'ai' | 'saas' | 'rules' | 'support'>('books');

  // Rules & Conversion Tab States
  const [selectedRulesDoc, setSelectedRulesDoc] = useState<'firestore' | 'markdown' | 'conversion'>('firestore');
  const [rulesDocs, setRulesDocs] = useState({
    firestore: `# 💾 Regras de Armazenamento no Firestore (BookVerse Core)

O ecossistema BookVerse é sincronizado em tempo real com o **Cloud Firestore** utilizando coleções de alta performance e suporte a operações offline automáticas.

## 📂 Mapeamento de Coleções e Subcoleções

### 1. Coleção Principal: \`books\`
Registra o catálogo de livros disponíveis.
* **Caminho**: \`/books/{bookId}\`
* **Esquema de Atributos**:
  * \`id\` *(string)*: Chave primária única da obra (slug).
  * \`title\` *(string)*: Título oficial.
  * \`author\` *(string)*: Autor ou tradutor principal.
  * \`description\` *(string)*: Resumo curto/sinopse.
  * \`category\` *(string)*: Categoria (ex: "Ficção", "Clássico").
  * \`tags\` *(array<string>)*: Tags para recomendação e busca.
  * \`coverUrl\` *(string)*: URL de imagem pública de capa.
  * \`accessType\` *(string)*: \`"free"\` ou \`"premium"\`.
  * \`language\` *(string)*: Idioma (ex: \`"PT-BR"\`).
  * \`pagesCount\` *(number)*: Total de páginas geradas no processamento.
  * \`favoritesCount\` *(number)*: Contador geral de favoritados.

### 2. Coleção de Usuários e Subcoleções
Cada leitor possui um nó isolado que garante a segurança dos dados pessoais.
* **Caminho**: \`/users/{userId}\`
* **Subcoleção \`library\`**: \`/users/{userId}/library/{bookId}\`
  * Armazena os livros salvos na biblioteca (favoritos).
  * Atributos: \`bookId\`, \`addedAt\`.
* **Subcoleção \`progress\`**: \`/users/{userId}/progress/{bookId}\`
  * Rastreia a página atual do leitor.
  * Atributos: \`bookId\`, \`currentPage\`, \`updatedAt\`, \`timeSpent\`.
* **Subcoleção \`bookmarks\`**: \`/users/{userId}/bookmarks/{bookmarkId}\`
  * Marcadores manuais salvos nas páginas do livro.`,
    markdown: `# 📝 Protocolo de Formatação em Markdown para Livros

O BookVerse renderiza todo o conteúdo textual das obras usando Markdown estrito. Isso nos permite criar uma experiência de leitura limpa, modular e altamente responsiva para qualquer tamanho de tela.

## 📐 Diretrizes de Marcação Suportadas

### 1. Títulos de Capítulos (\`#\`)
O uso de \`#\` (Header 1) deve ser reservado exclusivamente para títulos de capítulos ou seções principais.
* O renderizador detecta automaticamente o título para preencher o sumário dinâmico.
* **Regra de Conversão**: Todo título de capítulo inicia automaticamente uma nova página.

### 2. Quebras Manuais de Página (\`---\`)
Insira três hífens em uma linha isolada para forçar o leitor a quebrar a página imediatamente.
* Útil para poemas, epílogos, prefácios ou citações soltas.
\`\`\`markdown
Isso está na página A.
---
Isso está na página B.
\`\`\`

### 3. Ênfases Visuais
* **Negrito**: \`**palavra**\` para termos de grande destaque.
* *Itálico*: \`*palavra*\` para diálogos, pensamentos de personagens ou palavras estrangeiras.
* > Citações em Bloco: Use \`>\` para citações de outros livros ou pensamentos profundos.

### 4. Quebras de Linha Manuais (Pular Linhas)
Caso queira forçar uma quebra de linha simples ou múltipla no texto (adicionando espaçamentos vazios), utilize a tag HTML \`<br />\`:
* **Pular uma linha**: Insira \`<br />\` ao fim do parágrafo ou linha.
* **Pular várias linhas**: Insira \`<br /><br />\` consecutivamente.

### 5. Links Internos (Salto para partes do livro)
Para criar links que realizam saltos interativos dentro do próprio livro:
* **Para uma página específica**: Use a sintaxe \`[Texto do Link](#p5)\` (substitua 5 pelo número da página desejada).
* **Para um capítulo ou título**: Use a sintaxe \`[Texto do Link](#nome-do-capitulo)\` (o sistema fará o salto automático para a página correspondente).`,
    conversion: `# ⚙️ Regras de Conversão e Paginação (TXT/EPUB para BookVerse)

Para garantir um tempo de resposta inferior a 200ms no carregamento e renderização fluida no navegador, o texto bruto dos livros deve passar por um algoritmo de normalização e paginação dinâmica.

## 📝 Regras de Processamento do Algoritmo

### 1. Paginação por Caracteres (Fallback)
Caso o livro não possua divisores manuais (\`---\`), o algoritmo realiza a divisão em páginas usando um limite de caracteres parametrizável (Padrão: 1.200 caracteres por página).

### 2. Algoritmo de Busca de Margens Seguras
Para evitar que a quebra de página ocorra no meio de uma frase ou palavra, o conversor segue as seguintes regras de busca:
1. Identifica a posição limite (ex: 1.200).
2. Procura para trás (até no máximo 150 caracteres) pelo sinal de pontuação mais próximo (\`.\`, \`!\`, \`?\` ou quebra de linha \`\\n\`).
3. Realiza a quebra de página nessa pontuação segura para manter a coesão de leitura.

### 3. Divisão Automatizada por Capítulos
Sempre que a expressão \`#\` for encontrada em uma nova linha, o algoritmo força o fechamento da página atual e inicia uma nova página, mesmo que a página anterior contenha apenas alguns caracteres.`
  });
  const [isEditingRules, setIsEditingRules] = useState(false);
  const [rulesEditContent, setRulesEditContent] = useState("");

  // Interactive Book Converter States
  const [rawBookTitle, setRawBookTitle] = useState("O Pequeno Príncipe (Capítulo Extra)");
  const [rawBookContent, setRawBookContent] = useState(
    "# Capítulo I - Um Encontro Inesperado\\n\\nFoi assim que vivi sozinho, sem ninguém com quem conversar de verdade, até uma pane no deserto do Saara, há seis anos. Algo se quebrara no motor. E como não trazia comigo mecânico nem passageiros, preparei-me para executar sozinho o difícil conserto. Era, para mim, questão de vida ou de morte. A água de beber daria apenas para oito dias.\\n\\nA primeira noite adormeci, pois, sobre a areia, a mil milhas de qualquer terra habitada. Estava mais isolado que um náufrago numa jangada no meio do oceano. Imaginem, pois, a minha surpresa, quando o dia surgiu, ao ser acordado por uma vozinha estranha que dizia:\\n\\n-- Por favor... desenha-me um carneiro!\\n\\n-- Hein?\\n\\n-- Desenha-me um carneiro...\\n\\n---\\n\\n# Capítulo II - Os Mistérios da Areia\\n\\nEu me pus de pé, como se tivesse sido atingido por um raio. Esfreguei bem os olhos. Olhei com atenção. E vi um pedacinho de gente inteiramente extraordinário, que me considerava com gravidade.\\n\\nEis aqui o melhor retrato que, mais tarde, consegui fazer dele. Mas o meu desenho é seguramente muito menos sedutor que o modelo. Não tenho culpa. Fora desencorajado, na minha carreira de pintor, pelos adultos, aos seis anos de idade, e só aprendera a desenhar jiboias abertas e fechadas."
  );
  const [pageSizeLimit, setPageSizeLimit] = useState(600);
  const [autoSplitChapters, setAutoSplitChapters] = useState(true);
  
  // Generated Pages State
  const [generatedPages, setGeneratedPages] = useState<string[]>([]);
  const [selectedPreviewPage, setSelectedPreviewPage] = useState(0);
  const [previewTheme, setPreviewTheme] = useState<'light' | 'dark' | 'sepia'>('sepia');
  const [previewFontSize, setPreviewFontSize] = useState<number>(14);
  const [previewFontFamily, setPreviewFontFamily] = useState<'serif' | 'sans'>('serif');

  // Admin AI Dashboard States
  const [aiConfigEnabled, setAiConfigEnabled] = useState(true);
  const [isAiConfigLoading, setIsAiConfigLoading] = useState(false);
  const [isAnalyzingCatalog, setIsAnalyzingCatalog] = useState(false);
  const [isDetectingDuplicates, setIsDetectingDuplicates] = useState(false);
  const [duplicatePairs, setDuplicatePairs] = useState<any[]>([]);
  const [selectedBookForAi, setSelectedBookForAi] = useState<Book | null>(null);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<any | null>(null);
  const [isAnalyzingSingleBook, setIsAnalyzingSingleBook] = useState(false);
  const [aiApplyingFields, setAiApplyingFields] = useState<string[]>(["category", "tags", "metadata"]);
  const [isApplyingSuggestions, setIsApplyingSuggestions] = useState(false);

  // AI Chat Assistant States
  const [aiChatMessages, setAiChatMessages] = useState<{ sender: "user" | "assistant"; text: string }[]>([
    {
      sender: "assistant",
      text: "Olá! Sou o Assistente de Inteligência Artificial do BookVerse. Posso analisar o catálogo, identificar lacunas de metadados, prever popularidade de livros ou responder a perguntas complexas sobre o acervo. Como posso ajudar você hoje?"
    }
  ]);
  const [aiChatInput, setAiChatInput] = useState("");
  const [isAiChatLoading, setIsAiChatLoading] = useState(false);

  // Support Tickets States
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  // Core Dialog States
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [importTab, setImportTab] = useState<'template' | 'direct'>('template');
  
  // Book Form State
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [category, setCategory] = useState("Desenvolvimento Pessoal");
  const [description, setDescription] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [language, setLanguage] = useState("Português");
  const [publishDate, setPublishDate] = useState("2026");
  const [audiobookAvailable, setAudiobookAvailable] = useState(false);
  const [audioDuration, setAudioDuration] = useState("45m");
  const [pagesRawContent, setPagesRawContent] = useState(""); // Pages separated by double-newlines
  const [isbn, setIsbn] = useState("");
  const [keywords, setKeywords] = useState("");

  // Book Status Change Action State
  const [statusPromptBook, setStatusPromptBook] = useState<Book | null>(null);
  const [targetStatus, setTargetStatus] = useState<string>("");
  const [statusReason, setStatusReason] = useState("");

  // Detailed Stats & History Modal State
  const [selectedBookDetails, setSelectedBookDetails] = useState<Book | null>(null);
  const [detailsSubTab, setDetailsSubTab] = useState<'stats' | 'history'>('stats');

  // Catalog Filters, Sort, Multi-select & Pagination State
  const [adminSearch, setAdminSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [filterCategory, setFilterCategory] = useState("Todas");
  const [filterLanguage, setFilterLanguage] = useState("Todos");
  const [filterFeatured, setFilterFeatured] = useState("Todos");
  const [filterAudiobook, setFilterAudiobook] = useState("Todos");
  const [sortField, setSortField] = useState("recent");
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);
  const [adminPage, setAdminPage] = useState(1);
  const booksPerPage = 5;

  // Batch Operations State
  const [batchAction, setBatchAction] = useState("");
  const [batchCategory, setBatchCategory] = useState("Desenvolvimento Pessoal");
  const [batchLanguage, setBatchLanguage] = useState("Português");
  const [batchReason, setBatchReason] = useState("");
  const [showBatchConfirm, setShowBatchConfirm] = useState(false);

  // Tab Data States
  const [users, setUsers] = useState<User[]>([]);
  const [reports, setReports] = useState<BookReport[]>([]);
  const [reportedComments, setReportedComments] = useState<Review[]>([]);
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [dashboardData, setDashboardData] = useState<any>(null);

  // Users Tab Filter & Selection State
  const [userSearch, setUserSearch] = useState("");
  const [userPage, setUserPage] = useState(1);
  const usersPerPage = 5;
  const [selectedUserDetails, setSelectedUserDetails] = useState<User | null>(null);

  // SaaS Tab States
  const [saasRequests, setSaasRequests] = useState<any[]>([]);
  const [saasActionLoading, setSaasActionLoading] = useState<string | null>(null);
  const [saasMonthlyPrice, setSaasMonthlyPrice] = useState<number>(9.99);
  const [saasYearlyPrice, setSaasYearlyPrice] = useState<number>(89.99);
  const [isSavingSaasPrices, setIsSavingSaasPrices] = useState(false);

  // System Logs Tab Filter State
  const [logSearch, setLogSearch] = useState("");
  const [logFilterAction, setLogFilterAction] = useState("Todos");
  const [logPage, setLogPage] = useState(1);
  const logsPerPage = 10;

  // Custom confirmation state
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    confirmText?: string;
    cancelText?: string;
  } | null>(null);

  // General States
  const [isParsingBookFile, setIsParsingBookFile] = useState(false);
  const [parsingStatus, setParsingStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [tabLoading, setTabLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleProcessPagination = () => {
    if (!rawBookContent) {
      setGeneratedPages([]);
      return;
    }

    let pages: string[] = [];
    
    // Unescape literal newlines in default string if any
    const formattedContent = rawBookContent.replace(/\\n/g, "\n");
    
    // Split by manual page breaks "---" first
    const parts = formattedContent.split(/\n---\n|\n---\r\n|^---\n|^---\r\n/);
    
    for (const part of parts) {
      if (!part.trim()) continue;
      
      // If we need to split by chapters or character limits
      if (autoSplitChapters) {
        // Chapters start with "\n#" or at start
        const lines = part.split("\n");
        let currentPageText = "";
        
        for (const line of lines) {
          if (line.trim().startsWith("#")) {
            // New chapter starts! Push current page if not empty
            if (currentPageText.trim()) {
              pages.push(currentPageText.trim());
              currentPageText = "";
            }
            currentPageText += line + "\n";
          } else {
            currentPageText += line + "\n";
            // If character limit exceeded, we can do character limit paging
            if (currentPageText.length >= pageSizeLimit) {
              // Try to find a good punctuation point to break (., !, ?, \n)
              let breakIndex = -1;
              const searchOffset = Math.min(currentPageText.length, 120);
              
              // Search for punctuation backwards from the end
              for (let i = currentPageText.length - 1; i >= currentPageText.length - searchOffset; i--) {
                if ([".", "!", "?", "\n"].includes(currentPageText[i])) {
                  breakIndex = i;
                  break;
                }
              }
              
              if (breakIndex !== -1) {
                const pageText = currentPageText.substring(0, breakIndex + 1);
                pages.push(pageText.trim());
                currentPageText = currentPageText.substring(breakIndex + 1);
              } else {
                // Hard break
                pages.push(currentPageText.trim());
                currentPageText = "";
              }
            }
          }
        }
        if (currentPageText.trim()) {
          pages.push(currentPageText.trim());
        }
      } else {
        // Simple character split
        let text = part;
        while (text.length > 0) {
          if (text.length <= pageSizeLimit) {
            pages.push(text.trim());
            break;
          }
          
          let breakIndex = -1;
          const searchRange = Math.min(text.length, pageSizeLimit);
          const searchOffset = 120;
          
          // Look backward from limit for punctuation
          for (let i = searchRange - 1; i >= searchRange - searchOffset && i >= 0; i--) {
            if ([".", "!", "?", "\n"].includes(text[i])) {
              breakIndex = i;
              break;
            }
          }
          
          if (breakIndex !== -1) {
            pages.push(text.substring(0, breakIndex + 1).trim());
            text = text.substring(breakIndex + 1);
          } else {
            pages.push(text.substring(0, pageSizeLimit).trim());
            text = text.substring(pageSizeLimit);
          }
        }
      }
    }
    
    setGeneratedPages(pages);
    setSelectedPreviewPage(0);
  };

  // Run pagination once on mount/load or when content changes
  useEffect(() => {
    handleProcessPagination();
  }, [rawBookContent, pageSizeLimit, autoSplitChapters]);

  // Load backend data based on active tab
  useEffect(() => {
    loadTabSpecificData();
  }, [activeTab]);

  const loadTabSpecificData = async () => {
    setTabLoading(true);
    setError("");
    try {
      if (activeTab === 'users') {
        const u = await adminFetchUsers();
        setUsers(u);
      } else if (activeTab === 'saas') {
        try {
          const reqsRes = await fetch("/api/admin/billing/requests");
          const reqsData = await reqsRes.json();
          if (reqsData.success) {
            setSaasRequests(reqsData.requests || []);
          }
        } catch (rErr) {
          console.error("Error loading saas requests:", rErr);
        }
        try {
          const pricesRes = await fetch("/api/billing/prices");
          const pricesData = await pricesRes.json();
          if (pricesData) {
            setSaasMonthlyPrice(pricesData.monthly ?? 9.99);
            setSaasYearlyPrice(pricesData.yearly ?? 89.99);
          }
        } catch (pErr) {
          console.error("Error loading saas subscription prices:", pErr);
        }
        const u = await adminFetchUsers();
        setUsers(u);
      } else if (activeTab === 'reports') {
        const rep = await adminFetchReports();
        setReports(rep);
        try {
          const comments = await adminFetchReportedComments();
          setReportedComments(comments);
        } catch (cErr) {
          console.error("Error loading reported comments:", cErr);
        }
      } else if (activeTab === 'logs') {
        const audit = await adminFetchLogs();
        setLogs(audit);
      } else if (activeTab === 'dashboard') {
        const dbStats = await adminFetchDashboard();
        setDashboardData(dbStats);
      } else if (activeTab === 'ai') {
        try {
          const cfg = await adminFetchAiConfig();
          setAiConfigEnabled(cfg.aiEnabled);
        } catch (cfgErr) {
          console.error("Error loading AI config:", cfgErr);
        }
        try {
          const dups = await adminDetectDuplicates(currentAdmin.id);
          setDuplicatePairs(mapDuplicatePairs(dups.duplicates || []));
        } catch (dupsErr) {
          console.error("Error loading duplicates:", dupsErr);
        }
      } else if (activeTab === 'support') {
        try {
          const res = await fetch("/api/support/tickets");
          const data = await res.json();
          setSupportTickets(data);
        } catch (sErr) {
          console.error("Error loading support tickets:", sErr);
        }
      }
    } catch (err: any) {
      setError(err.message || "Erro ao carregar dados administrativos");
    } finally {
      setTabLoading(false);
    }
  };

  // Helper to flash success message
  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  const handleResolveTicket = async (id: string) => {
    try {
      const res = await fetch(`/api/support/tickets/${id}/resolve`, {
        method: "POST"
      });
      const data = await res.json();
      setSupportTickets(data);
      triggerSuccess("Chamado de suporte marcado como resolvido.");
    } catch (err) {
      console.error("Error resolving support ticket:", err);
      setError("Não foi possível marcar o chamado como resolvido.");
    }
  };

  // AI Actions and Handlers
  const handleToggleAiConfig = async () => {
    setIsAiConfigLoading(true);
    setError("");
    try {
      const nextVal = !aiConfigEnabled;
      const res = await adminUpdateAiConfig(currentAdmin.id, nextVal);
      setAiConfigEnabled(res.aiEnabled);
      triggerSuccess(`Diretivas de Inteligência Artificial administrativa ${res.aiEnabled ? "ativadas" : "desativadas"} com sucesso.`);
    } catch (err: any) {
      setError(err.message || "Falha ao alterar configuração de IA.");
    } finally {
      setIsAiConfigLoading(false);
    }
  };

  const handleAnalyzeCatalog = async () => {
    setIsAnalyzingCatalog(true);
    setError("");
    try {
      const res = await adminAnalyzeCatalog(currentAdmin.id);
      triggerSuccess(`Sucesso! Analisou ${res.count} livros no acervo do BookVerse.`);
      onRefreshBooks();
    } catch (err: any) {
      setError(err.message || "Erro na análise automatizada do catálogo.");
    } finally {
      setIsAnalyzingCatalog(false);
    }
  };

  const handleDetectDuplicates = async () => {
    setIsDetectingDuplicates(true);
    setError("");
    try {
      const res = await adminDetectDuplicates(currentAdmin.id);
      setDuplicatePairs(mapDuplicatePairs(res.duplicates || []));
      triggerSuccess(`Varredura concluída. Encontrou ${res.duplicates?.length || 0} potenciais registros duplicados.`);
    } catch (err: any) {
      setError(err.message || "Erro ao detectar registros duplicados.");
    } finally {
      setIsDetectingDuplicates(false);
    }
  };

  const handleSendAiChatMessage = async (presetText?: string) => {
    const textToSend = presetText || aiChatInput;
    if (!textToSend.trim()) return;

    if (!presetText) {
      setAiChatInput("");
    }

    setAiChatMessages(prev => [...prev, { sender: "user", text: textToSend }]);
    setIsAiChatLoading(true);

    try {
      const res = await adminAiAssistantChat(currentAdmin.id, textToSend);
      setAiChatMessages(prev => [...prev, { sender: "assistant", text: res.result }]);
    } catch (err: any) {
      setAiChatMessages(prev => [...prev, { sender: "assistant", text: `Erro: ${err.message || "Não foi possível obter resposta do assistente."}` }]);
    } finally {
      setIsAiChatLoading(false);
    }
  };

  const handleAnalyzeSingleBook = async (book: Book, force = false) => {
    setSelectedBookForAi(book);
    setAiAnalysisResult(null);
    setIsAnalyzingSingleBook(true);
    setError("");
    try {
      const res = await adminAnalyzeBook(book.id, currentAdmin.id, force);
      setAiAnalysisResult(res.analysis);
      if (res.cached) {
        triggerSuccess(`Carregou sugestões armazenadas para "${book.title}".`);
      } else {
        triggerSuccess(`Análise completa de IA gerada com sucesso para "${book.title}".`);
      }
    } catch (err: any) {
      setError(err.message || "Falha ao gerar sugestões da IA.");
    } finally {
      setIsAnalyzingSingleBook(false);
    }
  };

  const handleApplyAiSuggestions = async () => {
    if (!selectedBookForAi || !aiAnalysisResult) return;
    setIsApplyingSuggestions(true);
    setError("");
    try {
      const res = await adminApplyAiSuggestions(currentAdmin.id, selectedBookForAi.id, aiApplyingFields);
      triggerSuccess(`Metadados sugeridos aplicados ao livro "${res.book.title}" com sucesso.`);
      setSelectedBookForAi(null);
      setAiAnalysisResult(null);
      onRefreshBooks();
    } catch (err: any) {
      setError(err.message || "Falha ao aplicar sugestões do assistente.");
    } finally {
      setIsApplyingSuggestions(false);
    }
  };

  // Load CDN scripts on-demand for file parsing
  const loadExternalScript = (url: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${url}"]`)) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = url;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Falha ao carregar script de terceiros: ${url}`));
      document.head.appendChild(script);
    });
  };

  // Extracts text content page by page from PDF
  const extractPDFPages = async (file: File): Promise<string[]> => {
    setParsingStatus("Carregando motor PDF.js via CDN...");
    await loadExternalScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js");
    
    setParsingStatus("Configurando worker de renderização...");
    const pdfjsLib = (window as any)['pdfjs-dist/build/pdf'];
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

    setParsingStatus("Lendo arquivo PDF e decodificando canais...");
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    const extractedPages: string[] = [];

    for (let i = 1; i <= numPages; i++) {
      setParsingStatus(`Extraindo conteúdo de texto: Página ${i} de ${numPages}...`);
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      
      if (pageText) {
        extractedPages.push(pageText);
      }
    }
    return extractedPages;
  };

  // Extracts metadata & pages from EPUB (ZIP archive of HTMLs)
  const extractEPUBPages = async (file: File): Promise<{ title: string; author: string; pages: string[] }> => {
    setParsingStatus("Carregando leitor de ZIP (JSZip) via CDN...");
    await loadExternalScript("https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js");
    
    setParsingStatus("Abrindo arquivo EPUB de forma compactada...");
    const JSZip = (window as any).JSZip;
    const zip = await JSZip.loadAsync(file);
    
    let docTitle = "";
    let docAuthor = "";
    const htmlFiles: { name: string; content: string }[] = [];

    setParsingStatus("Mapeando arquivos XHTML/HTML internos...");
    for (const relativePath in zip.files) {
      if (relativePath.endsWith(".xhtml") || relativePath.endsWith(".html") || relativePath.endsWith(".htm")) {
        const content = await zip.files[relativePath].async("text");
        htmlFiles.push({ name: relativePath, content });
      } else if (relativePath.endsWith(".opf")) {
        const opfContent = await zip.files[relativePath].async("text");
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(opfContent, "text/xml");
        docTitle = xmlDoc.querySelector("title")?.textContent || xmlDoc.querySelector("dc\\:title")?.textContent || "";
        docAuthor = xmlDoc.querySelector("creator")?.textContent || xmlDoc.querySelector("dc\\:creator")?.textContent || "";
      }
    }

    setParsingStatus("Ordenando capítulos textuais...");
    htmlFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

    const pages: string[] = [];
    const domParser = new DOMParser();
    const totalFiles = htmlFiles.length;

    for (let idx = 0; idx < totalFiles; idx++) {
      const htmlFile = htmlFiles[idx];
      setParsingStatus(`Processando capítulo ${idx + 1} de ${totalFiles}...`);
      const xmlDoc = domParser.parseFromString(htmlFile.content, "text/html");
      const text = xmlDoc.body.textContent || "";
      const cleaned = text.replace(/\s+/g, " ").trim();
      if (cleaned.length > 50) {
        pages.push(cleaned);
      }
    }

    return {
      title: docTitle || file.name.replace(/\.[^/.]+$/, ""),
      author: docAuthor || "Autor Desconhecido",
      pages
    };
  };

  // Direct File Import drop & select handler
  const handleDirectBookImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingBookFile(true);
    setError("");
    try {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (extension === 'pdf') {
        const extracted = await extractPDFPages(file);
        if (extracted.length === 0) {
          throw new Error("Nenhum texto pôde ser extraído deste arquivo PDF.");
        }
        setPagesRawContent(extracted.join("\n\n"));
        setTitle(file.name.replace(/\.pdf$/i, ""));
        setAuthor("Importado do PDF");
        triggerSuccess(`PDF processado com sucesso! ${extracted.length} páginas extraídas.`);
      } else if (extension === 'epub') {
        const { title: epubTitle, author: epubAuthor, pages: epubPages } = await extractEPUBPages(file);
        if (epubPages.length === 0) {
          throw new Error("Nenhum capítulo legível foi encontrado no arquivo EPUB.");
        }
        setPagesRawContent(epubPages.join("\n\n"));
        setTitle(epubTitle);
        setAuthor(epubAuthor);
        triggerSuccess(`EPUB processado com sucesso! ${epubPages.length} capítulos mapeados em páginas.`);
      } else {
        throw new Error("Formato inválido. Suporta apenas arquivos .pdf ou .epub");
      }
    } catch (err: any) {
      setError(err.message || "Erro ao decodificar arquivo.");
    } finally {
      setIsParsingBookFile(false);
      setParsingStatus("");
    }
  };

  // Custom Image Upload Handler for Book Cover
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverUrl(reader.result as string);
        setLoading(false);
        triggerSuccess("Imagem de capa carregada localmente para preview!");
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError("Erro ao ler imagem de capa.");
      setLoading(false);
    }
  };

  // Core Form Reset
  const resetForm = () => {
    setTitle("");
    setAuthor("");
    setCategory("Desenvolvimento Pessoal");
    setDescription("");
    setCoverUrl("");
    setLanguage("Português");
    setPublishDate("2026");
    setAudiobookAvailable(false);
    setAudioDuration("45m");
    setPagesRawContent("");
    setIsbn("");
    setKeywords("");
    setIsEditing(null);
    setError("");
  };

  // Handle Book Creation or Editing Submit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !author || !description || !pagesRawContent) {
      setError("Por favor, preencha todos os campos obrigatórios (*).");
      return;
    }

    setLoading(true);
    setError("");

    // Split text by double newline to form pages
    const pagesList = pagesRawContent
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);

    if (pagesList.length === 0) {
      setError("O livro deve conter ao menos uma página de texto estruturada.");
      setLoading(false);
      return;
    }

    const payload: Partial<Book> = {
      title,
      author,
      category,
      description,
      coverUrl: coverUrl || "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=600&auto=format&fit=crop",
      language,
      publishDate,
      audiobookAvailable,
      audioDuration: audiobookAvailable ? audioDuration : undefined,
      pdfContent: pagesList,
      isbn: isbn || undefined,
      keywords: keywords ? keywords.split(",").map(k => k.trim()) : undefined,
      status: isEditing ? undefined : "Draft" // Defaults new books to Draft state
    };

    try {
      if (isEditing) {
        await adminUpdateBook(isEditing, payload);
        triggerSuccess(`Livro "${title}" atualizado com sucesso!`);
      } else {
        await adminCreateBook(payload);
        triggerSuccess(`Livro "${title}" adicionado com sucesso como Rascunho!`);
      }
      setIsAdding(false);
      setIsEditing(null);
      resetForm();
      onRefreshBooks();
    } catch (err: any) {
      setError(err.message || "Erro ao salvar informações do livro.");
    } finally {
      setLoading(false);
    }
  };

  // Delete Book validation & execution
  const handleDeleteBook = async (id: string, bookTitle: string) => {
    if (currentAdmin.role !== "Super Administrador") {
      alert("Permissão negada. Apenas Super Administradores podem excluir livros permanentemente.");
      return;
    }

    setConfirmAction({
      title: "Excluir Livro",
      message: `Deseja REALMENTE excluir permanentemente o livro "${bookTitle}"? Esta ação deletará todos os logs, comentários e progresso de usuários no Firestore e não poderá ser desfeita.`,
      confirmText: "Excluir permanentemente",
      cancelText: "Cancelar",
      onConfirm: async () => {
        try {
          await adminDeleteBook(id, currentAdmin.id);
          triggerSuccess(`Livro "${bookTitle}" removido permanentemente.`);
          onRefreshBooks();
        } catch (err: any) {
          alert(err.message || "Erro ao excluir livro.");
        }
      }
    });
  };

  // Single book status update handler
  const handleUpdateStatusConfirm = async () => {
    if (!statusPromptBook || !targetStatus) return;

    setLoading(true);
    try {
      await adminUpdateBookStatus(statusPromptBook.id, targetStatus, statusReason, currentAdmin.id);
      triggerSuccess(`Status do livro "${statusPromptBook.title}" alterado para ${targetStatus}.`);
      setStatusPromptBook(null);
      setStatusReason("");
      onRefreshBooks();
    } catch (err: any) {
      setError(err.message || "Erro ao atualizar status do livro.");
    } finally {
      setLoading(false);
    }
  };

  // Toggle Highlight (Featured)
  const handleToggleFeatured = async (book: Book) => {
    const newVal = !book.isFeatured;
    try {
      await adminUpdateBookFeatured(book.id, newVal, currentAdmin.id);
      triggerSuccess(`Destaque do livro "${book.title}" ${newVal ? "ativado" : "desativado"}.`);
      onRefreshBooks();
    } catch (err: any) {
      alert(err.message || "Erro ao alternar destaque do livro.");
    }
  };

  // Multi-select actions
  const toggleBookSelection = (id: string) => {
    setSelectedBookIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllOnPage = (pageBooks: Book[]) => {
    const pageIds = pageBooks.map(b => b.id);
    const allSelected = pageIds.every(id => selectedBookIds.includes(id));

    if (allSelected) {
      setSelectedBookIds(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      setSelectedBookIds(prev => [...new Set([...prev, ...pageIds])]);
    }
  };

  // Execute batch actions
  const handleExecuteBatchAction = async () => {
    if (selectedBookIds.length === 0 || !batchAction) return;

    setLoading(true);
    try {
      const res = await adminExecuteBatchAction(
        selectedBookIds,
        batchAction,
        batchCategory,
        batchLanguage,
        currentAdmin.id,
        batchReason
      );
      triggerSuccess(`${res.count} livros atualizados em lote!`);
      setSelectedBookIds([]);
      setBatchAction("");
      setBatchReason("");
      setShowBatchConfirm(false);
      onRefreshBooks();
    } catch (err: any) {
      alert(err.message || "Erro ao executar ação em lote.");
    } finally {
      setLoading(false);
    }
  };

  // User Administration Handlers
  const handleToggleUserBlock = async (user: User) => {
    const nextStatus = user.status === "Blocked" ? "Active" : "Blocked";
    setConfirmAction({
      title: nextStatus === "Blocked" ? "Bloquear Usuário" : "Ativar Usuário",
      message: `Tem certeza que deseja ${nextStatus === "Blocked" ? "bloquear" : "ativar"} o usuário "${user.name}"? Esta ação será registrada no Firestore.`,
      confirmText: nextStatus === "Blocked" ? "Confirmar Bloqueio" : "Ativar Usuário",
      cancelText: "Cancelar",
      onConfirm: async () => {
        try {
          const updated = await adminUpdateUserStatus(user.id, nextStatus, currentAdmin.id);
          // Update local state
          setUsers(prev => prev.map(u => u.id === user.id ? updated : u));
          triggerSuccess(`Usuário ${user.name} está agora ${nextStatus === "Blocked" ? "BLOQUEADO" : "ATIVO"}.`);
        } catch (err: any) {
          alert(err.message || "Erro ao alterar bloqueio de usuário");
        }
      }
    });
  };

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    if (currentAdmin.role !== "Super Administrador") {
      alert("Apenas Super Administradores podem gerenciar permissões administrativas.");
      return;
    }
    try {
      const updated = await adminUpdateUserRole(userId, newRole, currentAdmin.id);
      setUsers(prev => prev.map(u => u.id === userId ? updated : u));
      triggerSuccess(`Permissão de acesso do usuário atualizada para "${newRole}".`);
    } catch (err: any) {
      alert(err.message || "Erro ao alterar permissão");
    }
  };

  // Report Moderation Handlers
  const handleUpdateReport = async (reportId: string, nextStatus: string) => {
    const proceedWithUpdate = async () => {
      try {
        await adminUpdateReportStatus(reportId, nextStatus, currentAdmin.id);
        setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: nextStatus as any } : r));
        triggerSuccess(`Denúncia marcada como "${nextStatus}".`);
      } catch (err: any) {
        alert(err.message || "Erro ao atualizar denúncia");
      }
    };

    if (nextStatus === "Ignored") {
      setConfirmAction({
        title: "Ignorar Denúncia",
        message: "Tem certeza que deseja ignorar esta denúncia? O status será atualizado para Ignorado no Firestore.",
        confirmText: "Ignorar Denúncia",
        cancelText: "Cancelar",
        onConfirm: proceedWithUpdate
      });
    } else {
      await proceedWithUpdate();
    }
  };

  const handleDeactivateBookFromReport = async (report: BookReport) => {
    setConfirmAction({
      title: "Desativar Livro da Denúncia",
      message: `Tem certeza que deseja desativar permanentemente o livro "${report.bookTitle}" com base nesta denúncia? Esta ação atualizará o status do livro no Firestore para Inativo.`,
      confirmText: "Desativar Livro",
      cancelText: "Cancelar",
      onConfirm: async () => {
        try {
          // 1. Mark report as Resolved
          await adminUpdateReportStatus(report.id, "Resolved", currentAdmin.id);
          // 2. Deactivate book
          await adminUpdateBookStatus(report.bookId, "Inactive", `Desativado devido à denúncia ID ${report.id}: ${report.reason}`, currentAdmin.id);
          triggerSuccess(`Livro desativado e denúncia resolvida com sucesso!`);
          // Update lists
          setReports(prev => prev.map(r => r.id === report.id ? { ...r, status: "Resolved" } : r));
          onRefreshBooks();
        } catch (err: any) {
          alert(err.message || "Erro ao desativar livro a partir de denúncia");
        }
      }
    });
  };

  const handleModCommentStatus = async (commentId: string, status: "active" | "hidden") => {
    try {
      await adminUpdateCommentStatus(commentId, status, currentAdmin.id);
      triggerSuccess(status === "hidden" ? "Comentário ocultado com sucesso!" : "Comentário reativado com sucesso!");
      const comments = await adminFetchReportedComments();
      setReportedComments(comments);
    } catch (err: any) {
      alert(err.message || "Erro ao moderar comentário");
    }
  };

  const handleToggleUserBan = async (userId: string) => {
    try {
      const res = await adminToggleUserCommentBan(userId, currentAdmin.id);
      triggerSuccess(res.isBannedFromCommenting ? "Usuário banido de comentar!" : "Usuário desbanido de comentar!");
      const comments = await adminFetchReportedComments();
      setReportedComments(comments);
    } catch (err: any) {
      alert(err.message || "Erro ao atualizar banimento");
    }
  };

  // ==========================================
  // FILTERS, SEARCH AND SORT FOR CATALOG TABLE
  // ==========================================
  const filteredBooks = books.filter((b) => {
    const matchesSearch =
      b.title.toLowerCase().includes(adminSearch.toLowerCase()) ||
      b.author.toLowerCase().includes(adminSearch.toLowerCase()) ||
      b.id.toLowerCase().includes(adminSearch.toLowerCase()) ||
      (b.isbn && b.isbn.toLowerCase().includes(adminSearch.toLowerCase())) ||
      (b.keywords && b.keywords.some(k => k.toLowerCase().includes(adminSearch.toLowerCase())));

    const currentStatus = b.status || "Active";
    const matchesStatus = filterStatus === "Todos" || currentStatus === filterStatus;
    const matchesCategory = filterCategory === "Todas" || b.category === filterCategory;
    const matchesLanguage = filterLanguage === "Todos" || b.language === filterLanguage;

    const matchesFeatured = filterFeatured === "Todos" ||
      (filterFeatured === "Destaques" && b.isFeatured) ||
      (filterFeatured === "NaoDestaques" && !b.isFeatured);

    const matchesAudiobook = filterAudiobook === "Todos" ||
      (filterAudiobook === "Disponivel" && b.audiobookAvailable) ||
      (filterAudiobook === "Indisponivel" && !b.audiobookAvailable);

    return matchesSearch && matchesStatus && matchesCategory && matchesLanguage && matchesFeatured && matchesAudiobook;
  });

  // Sorting
  const sortedBooks = [...filteredBooks].sort((a, b) => {
    if (sortField === "recent") {
      const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bDate - aDate;
    }
    if (sortField === "oldest") {
      const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return aDate - bDate;
    }
    if (sortField === "reads") {
      return (b.readsCount || 0) - (a.readsCount || 0);
    }
    if (sortField === "favorites") {
      return (b.favoritesCount || 0) - (a.favoritesCount || 0);
    }
    if (sortField === "rating") {
      return (b.avgRating || 0) - (a.avgRating || 0);
    }
    if (sortField === "alphabetical") {
      return a.title.localeCompare(b.title);
    }
    return 0;
  });

  // Catalog Pagination
  const totalFiltered = sortedBooks.length;
  const totalPages = Math.ceil(totalFiltered / booksPerPage) || 1;
  const safePage = Math.min(adminPage, totalPages);
  const startIndex = (safePage - 1) * booksPerPage;
  const paginatedBooks = sortedBooks.slice(startIndex, startIndex + booksPerPage);

  // Users filter
  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.id.toLowerCase().includes(userSearch.toLowerCase())
  );

  // Users pagination
  const totalFilteredUsers = filteredUsers.length;
  const totalUserPages = Math.ceil(totalFilteredUsers / usersPerPage) || 1;
  const safeUserPage = Math.min(userPage, totalUserPages);
  const userStartIndex = (safeUserPage - 1) * usersPerPage;
  const paginatedUsers = filteredUsers.slice(userStartIndex, userStartIndex + usersPerPage);

  // Logs filter
  const filteredLogs = logs.filter(l => {
    const matchesSearch = 
      l.userName.toLowerCase().includes(logSearch.toLowerCase()) ||
      l.userEmail.toLowerCase().includes(logSearch.toLowerCase()) ||
      l.action.toLowerCase().includes(logSearch.toLowerCase()) ||
      l.details.toLowerCase().includes(logSearch.toLowerCase());
    
    const matchesAction = logFilterAction === "Todos" || l.action === logFilterAction;
    return matchesSearch && matchesAction;
  }).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Logs pagination
  const totalFilteredLogs = filteredLogs.length;
  const totalLogPages = Math.ceil(totalFilteredLogs / logsPerPage) || 1;
  const safeLogPage = Math.min(logPage, totalLogPages);
  const logStartIndex = (safeLogPage - 1) * logsPerPage;
  const paginatedLogs = filteredLogs.slice(logStartIndex, logStartIndex + logsPerPage);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 font-sans selection:bg-[#dad5bf]" id="admin-workspace-container">
      
      {/* HEADER OPERATIONS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8" id="admin-header">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-serif font-bold text-[#2d291c] tracking-tight">Painel de Administração</h1>
            <span className="bg-[#8a7e58]/10 text-[#8a7e58] border border-[#8a7e58]/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
              {currentAdmin.role}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Gestão avançada de acervo, moderação de relatórios, controle de permissões e auditoria do BookVerse.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {activeTab === 'books' && (
            <button
              onClick={() => {
                resetForm();
                setIsAdding(true);
              }}
              className="bg-[#8a7e58] hover:bg-[#4a432d] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              id="btn-add-new-book"
            >
              <Plus className="w-4 h-4" />
              Adicionar Novo Livro
            </button>
          )}
          
          <button
            onClick={onBackToLibrary}
            className="bg-transparent hover:bg-gray-100 border border-[#dad5bf] text-gray-700 px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
            id="btn-back-to-lib"
          >
            Sair do Painel
          </button>
        </div>
      </div>

      {/* TOP SYSTEM HEALTH ROW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8" id="admin-diagnostics">
        <div className="bg-white border border-[#ece9dc] rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Banco de Dados</span>
            <span className="text-sm font-serif font-bold text-[#2d291c] flex items-center gap-1.5">
              Durable JSON Engine
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </span>
          </div>
        </div>

        <div className="bg-white border border-[#ece9dc] rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 bg-[#8a7e58]/10 text-[#8a7e58] rounded-xl flex items-center justify-center border border-[#8a7e58]/20">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Autenticação & RBAC</span>
            <span className="text-sm font-serif font-bold text-emerald-700 flex items-center gap-1">
              Ativo e Monitorado
            </span>
          </div>
        </div>

        <div className="bg-white border border-[#ece9dc] rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center border border-amber-100">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Central de Denúncias</span>
            <span className="text-sm font-serif font-bold text-[#2d291c]">
              Moderação em Tempo Real
            </span>
          </div>
        </div>
      </div>

      {/* TAB NAVIGATION */}
      <div className="flex border-b border-[#ece9dc] mb-8 gap-1 overflow-x-auto pb-px" id="admin-tab-nav">
        <button
          onClick={() => setActiveTab('books')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'books'
              ? "border-[#8a7e58] text-[#8a7e58]"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Catálogo ({books.length})
        </button>

        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'dashboard'
              ? "border-[#8a7e58] text-[#8a7e58]"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Métricas & Indicadores
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'users'
              ? "border-[#8a7e58] text-[#8a7e58]"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Usuários & Permissões
        </button>

        <button
          onClick={() => setActiveTab('saas')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'saas'
              ? "border-[#8a7e58] text-[#8a7e58]"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <Trophy className="w-4 h-4" />
          SaaS & Planos Premium
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'reports'
              ? "border-[#8a7e58] text-[#8a7e58]"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <AlertOctagon className="w-4 h-4" />
          Denúncias
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'logs'
              ? "border-[#8a7e58] text-[#8a7e58]"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <History className="w-4 h-4" />
          Log de Auditoria
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'notifications'
              ? "border-[#8a7e58] text-[#8a7e58]"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <Bell className="w-4 h-4" />
          Notificações & Campanhas
        </button>

        <button
          onClick={() => setActiveTab('ai')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'ai'
              ? "border-amber-500 text-amber-600"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
          IA Administrativa <span className="text-[9px] bg-amber-100 text-amber-700 px-1 py-0.2 rounded font-mono">CORE</span>
        </button>

        <button
          onClick={() => setActiveTab('rules')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'rules'
              ? "border-[#8a7e58] text-[#8a7e58]"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <Database className="w-4 h-4" />
          Regras & Conversão
        </button>

        <button
          onClick={() => setActiveTab('support')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'support'
              ? "border-amber-500 text-amber-600"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          Chamados de Suporte
        </button>
      </div>

      {/* ERROR / SUCCESS NOTIFICATIONS */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3.5 rounded-2xl text-xs flex items-center gap-2 mb-6" id="admin-error-box">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 px-4 py-3.5 rounded-2xl text-xs flex items-center gap-2 mb-6" id="admin-success-box">
          <Check className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* TAB CONTENTS */}
      {tabLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-[#ece9dc] rounded-3xl" id="tab-spinner">
          <RefreshCw className="w-8 h-8 text-[#8a7e58] animate-spin mb-3" />
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Carregando dados estruturados...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: BOOK CATALOG */}
          {activeTab === 'books' && (
            <div className="bg-white border border-[#ece9dc] rounded-3xl overflow-hidden shadow-sm mb-12" id="tab-books">
              
              {/* ADVANCED MULTI-FILTER BAR */}
              <div className="p-6 bg-[#f6f5ee]/40 border-b border-[#ece9dc] space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-serif font-bold text-lg text-[#2d291c]">Acervo Geral ({books.length} livros)</h3>
                    <p className="text-[10px] text-gray-400 mt-0.5">Filtre, ordene e execute modificações ou operações em lote.</p>
                  </div>
                  <button
                    onClick={onRefreshBooks}
                    className="p-2 text-gray-400 hover:text-[#8a7e58] rounded-xl hover:bg-white transition border border-[#ece9dc] cursor-pointer bg-white"
                    title="Recarregar acervo"
                  >
                    <RefreshCcw className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-4 relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Buscar por Título, Autor, ID, ISBN, tags..."
                      className="w-full bg-white border border-[#ece9dc] rounded-xl pl-9 pr-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-[#8a7e58] text-gray-900 shadow-xs"
                      value={adminSearch}
                      onChange={(e) => {
                        setAdminSearch(e.target.value);
                        setAdminPage(1);
                      }}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <select
                      className="w-full bg-white border border-[#ece9dc] rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-1 focus:ring-[#8a7e58] text-gray-900 shadow-xs"
                      value={filterStatus}
                      onChange={(e) => {
                        setFilterStatus(e.target.value);
                        setAdminPage(1);
                      }}
                    >
                      <option value="Todos">Todos Status</option>
                      <option value="Draft">Rascunho (Draft)</option>
                      <option value="Pending Review">Sob Revisão (Pending)</option>
                      <option value="Active">Ativo (Active)</option>
                      <option value="Inactive">Inativo (Inactive)</option>
                      <option value="Rejected">Rejeitado (Rejected)</option>
                      <option value="Archived">Arquivado (Archived)</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <select
                      className="w-full bg-white border border-[#ece9dc] rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-1 focus:ring-[#8a7e58] text-gray-900 shadow-xs"
                      value={filterCategory}
                      onChange={(e) => {
                        setFilterCategory(e.target.value);
                        setAdminPage(1);
                      }}
                    >
                      <option value="Todas">Todas Categorias</option>
                      {(() => {
                        const standardCats = [
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
                        const actualCats = books.map((b) => b.category).filter(Boolean);
                        const allUniqueCats = Array.from(new Set([...standardCats, ...actualCats])).sort((a, b) => a.localeCompare(b, "pt-BR"));
                        return allUniqueCats.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ));
                      })()}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <select
                      className="w-full bg-white border border-[#ece9dc] rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-1 focus:ring-[#8a7e58] text-gray-900 shadow-xs"
                      value={filterLanguage}
                      onChange={(e) => {
                        setFilterLanguage(e.target.value);
                        setAdminPage(1);
                      }}
                    >
                      <option value="Todos">Todos Idiomas</option>
                      {(() => {
                        const standardLangs = ["Português", "Inglês", "Espanhol", "Francês", "Italiano", "Alemão"];
                        const actualLangs = books.map((b) => b.language).filter(Boolean);
                        const allUniqueLangs = Array.from(new Set([...standardLangs, ...actualLangs])).sort((a, b) => a.localeCompare(b, "pt-BR"));
                        return allUniqueLangs.map((lang) => (
                          <option key={lang} value={lang}>{lang}</option>
                        ));
                      })()}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <select
                      className="w-full bg-white border border-[#ece9dc] rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-1 focus:ring-[#8a7e58] text-gray-900 shadow-xs font-bold"
                      value={sortField}
                      onChange={(e) => setSortField(e.target.value)}
                    >
                      <option value="recent">Mais Recentes</option>
                      <option value="oldest">Mais Antigos</option>
                      <option value="reads">Mais Lidos</option>
                      <option value="favorites">Mais Favoritados</option>
                      <option value="rating">Melhor Avaliados</option>
                      <option value="alphabetical">Ordem Alfabética</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-[#ece9dc]/50">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400 font-bold uppercase whitespace-nowrap">Destaques:</span>
                    <select
                      className="bg-white border border-[#ece9dc] rounded-lg px-2 py-1 text-[11px] outline-none text-gray-700"
                      value={filterFeatured}
                      onChange={(e) => setFilterFeatured(e.target.value)}
                    >
                      <option value="Todos">Todos</option>
                      <option value="Destaques">Apenas Destaques</option>
                      <option value="NaoDestaques">Sem Destaque</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400 font-bold uppercase whitespace-nowrap">Audiobook:</span>
                    <select
                      className="bg-white border border-[#ece9dc] rounded-lg px-2 py-1 text-[11px] outline-none text-gray-700"
                      value={filterAudiobook}
                      onChange={(e) => setFilterAudiobook(e.target.value)}
                    >
                      <option value="Todos">Todos</option>
                      <option value="Disponivel">Com Narrador</option>
                      <option value="Indisponivel">Apenas Texto</option>
                    </select>
                  </div>

                  <div className="flex justify-end">
                    {(adminSearch || filterStatus !== "Todos" || filterCategory !== "Todas" || filterLanguage !== "Todos" || filterFeatured !== "Todos" || filterAudiobook !== "Todos") && (
                      <button
                        onClick={() => {
                          setAdminSearch("");
                          setFilterStatus("Todos");
                          setFilterCategory("Todas");
                          setFilterLanguage("Todos");
                          setFilterFeatured("Todos");
                          setFilterAudiobook("Todos");
                          setAdminPage(1);
                        }}
                        className="text-[11px] text-red-500 hover:text-red-700 font-bold hover:underline transition cursor-pointer"
                      >
                        Limpar Todos os Filtros
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* BATCH ACTION FLOATING/CONTROLS BAR */}
              {selectedBookIds.length > 0 && (
                <div className="bg-[#8a7e58]/10 border-b border-[#8a7e58]/30 px-6 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fade-in">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#8a7e58]" />
                    <span className="text-xs font-bold text-gray-800">
                      <strong className="text-[#8a7e58]">{selectedBookIds.length}</strong> livros selecionados para alteração em lote:
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                    <select
                      className="bg-white border border-[#ece9dc] rounded-xl px-3 py-1.5 text-xs outline-none text-gray-900"
                      value={batchAction}
                      onChange={(e) => setBatchAction(e.target.value)}
                    >
                      <option value="">Escolher ação em lote...</option>
                      <option value="activate">Ativar Livros (Active)</option>
                      <option value="deactivate">Desativar Livros (Inactive)</option>
                      <option value="archive">Arquivar Livros (Archived)</option>
                      <option value="feature">Destacar Todos na Vitrine</option>
                      <option value="unfeature">Remover Destaque de Todos</option>
                      <option value="change-category">Alterar Categoria em Massa</option>
                      <option value="change-language">Alterar Idioma em Massa</option>
                    </select>

                    {batchAction === "change-category" && (
                      <select
                        className="bg-white border border-[#ece9dc] rounded-xl px-3 py-1.5 text-xs outline-none text-gray-900 font-semibold cursor-pointer"
                        value={batchCategory}
                        onChange={(e) => setBatchCategory(e.target.value)}
                      >
                        <option value="Autoajuda">Autoajuda</option>
                        <option value="Desenvolvimento Pessoal">Desenvolvimento Pessoal</option>
                        <option value="Filosofia">Filosofia</option>
                        <option value="Religião">Religião</option>
                        <option value="Psicologia">Psicologia</option>
                        <option value="História">História</option>
                        <option value="Política">Política</option>
                        <option value="Economia">Economia</option>
                        <option value="Negócios">Negócios</option>
                        <option value="Ciência">Ciência</option>
                        <option value="Tecnologia">Tecnologia</option>
                        <option value="Educação">Educação</option>
                        <option value="Direito">Direito</option>
                        <option value="Medicina">Medicina</option>
                        <option value="Culinária">Culinária</option>
                        <option value="Viagens">Viagens</option>
                        <option value="Arte">Arte</option>
                      </select>
                    )}

                    {batchAction === "change-language" && (
                      <select
                        className="bg-white border border-[#ece9dc] rounded-xl px-3 py-1.5 text-xs outline-none text-gray-900"
                        value={batchLanguage}
                        onChange={(e) => setBatchLanguage(e.target.value)}
                      >
                        <option value="Português">Português</option>
                        <option value="Inglês">Inglês</option>
                        <option value="Espanhol">Espanhol</option>
                        <option value="Francês">Francês</option>
                      </select>
                    )}

                    {(batchAction === "deactivate" || batchAction === "archive") && (
                      <input
                        type="text"
                        placeholder="Motivo (obrigatório)..."
                        className="bg-white border border-[#ece9dc] rounded-xl px-3 py-1.5 text-xs outline-none text-gray-900 max-w-xs"
                        value={batchReason}
                        onChange={(e) => setBatchReason(e.target.value)}
                      />
                    )}

                    <button
                      onClick={() => setShowBatchConfirm(true)}
                      disabled={!batchAction || ((batchAction === 'deactivate' || batchAction === 'archive') && !batchReason)}
                      className="bg-[#8a7e58] hover:bg-[#4a432d] text-white px-4 py-1.5 rounded-xl text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                    >
                      Executar
                    </button>

                    <button
                      onClick={() => setSelectedBookIds([])}
                      className="text-xs text-gray-500 hover:text-gray-800 underline ml-1 cursor-pointer"
                    >
                      Cancelar Seleção
                    </button>
                  </div>
                </div>
              )}

              {books.length === 0 ? (
                <div className="p-12 text-center text-gray-500 text-sm">
                  Nenhum livro no catálogo. Adicione um novo clicando no botão acima.
                </div>
              ) : filteredBooks.length === 0 ? (
                <div className="p-12 text-center text-gray-500 text-sm">
                  Nenhum livro corresponde aos filtros selecionados.
                  <button
                    onClick={() => {
                      setAdminSearch("");
                      setFilterStatus("Todos");
                      setFilterCategory("Todas");
                      setFilterLanguage("Todos");
                      setFilterFeatured("Todos");
                      setFilterAudiobook("Todos");
                      setAdminPage(1);
                    }}
                    className="block mx-auto mt-3 text-xs bg-[#8a7e58]/10 text-[#8a7e58] hover:bg-[#8a7e58]/20 px-3 py-1.5 rounded-lg transition font-bold"
                  >
                    Resetar Filtros
                  </button>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#f6f5ee] border-b border-[#ece9dc] text-gray-500 font-semibold uppercase tracking-wider">
                          <th className="p-4 pl-6 w-12 text-center">
                            <input
                              type="checkbox"
                              className="rounded text-[#8a7e58] focus:ring-[#8a7e58] cursor-pointer"
                              checked={paginatedBooks.every(b => selectedBookIds.includes(b.id))}
                              onChange={() => handleSelectAllOnPage(paginatedBooks)}
                            />
                          </th>
                          <th className="p-4">Capa & Título</th>
                          <th className="p-4">Autor / Categoria</th>
                          <th className="p-4">Status</th>
                          <th className="p-4">Destaque</th>
                          <th className="p-4">Ações e Status</th>
                          <th className="p-4 text-right pr-6">Ações Finais</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f6f5ee]">
                        {paginatedBooks.map((b) => {
                          const statusVal = b.status || "Active";
                          return (
                            <tr key={b.id} className="hover:bg-gray-50/50 transition">
                              <td className="p-4 text-center">
                                <input
                                  type="checkbox"
                                  className="rounded text-[#8a7e58] focus:ring-[#8a7e58] cursor-pointer"
                                  checked={selectedBookIds.includes(b.id)}
                                  onChange={() => toggleBookSelection(b.id)}
                                />
                              </td>
                              <td className="p-4 flex items-center gap-3 min-w-[220px]">
                                <img
                                  src={b.coverUrl}
                                  alt={b.title}
                                  className="w-10 h-14 object-cover rounded shadow-sm border border-gray-100 flex-shrink-0"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="min-w-0">
                                  <span className="font-serif font-bold text-gray-900 block truncate leading-tight">{b.title}</span>
                                  <span className="text-[9px] text-gray-400 block font-mono mt-0.5">ID: {b.id}</span>
                                  {b.isbn && <span className="text-[9px] text-gray-500 block font-mono">ISBN: {b.isbn}</span>}
                                </div>
                              </td>
                              <td className="p-4">
                                <span className="text-gray-700 block font-medium">{b.author}</span>
                                <span className="text-[10px] text-gray-400 block mt-0.5">{b.category} • {b.language}</span>
                              </td>
                              <td className="p-4">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                                  statusVal === "Active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                  statusVal === "Draft" ? "bg-gray-50 text-gray-600 border-gray-200" :
                                  statusVal === "Pending Review" ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                                  statusVal === "Inactive" ? "bg-red-50 text-red-600 border-red-200" :
                                  statusVal === "Rejected" ? "bg-rose-100 text-rose-800 border-rose-200" :
                                  "bg-indigo-50 text-indigo-700 border-indigo-200"
                                }`}>
                                  {statusVal}
                                </span>
                              </td>
                              <td className="p-4">
                                <button
                                  onClick={() => handleToggleFeatured(b)}
                                  className={`p-1.5 rounded-lg border transition cursor-pointer ${
                                    b.isFeatured
                                      ? "bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100"
                                      : "bg-gray-50 text-gray-400 border-gray-200 hover:text-amber-500 hover:border-amber-200"
                                  }`}
                                  title={b.isFeatured ? "Remover destaque" : "Destacar na home"}
                                >
                                  <Sparkles className="w-4 h-4" />
                                </button>
                              </td>
                              <td className="p-4">
                                <div className="flex flex-wrap gap-1">
                                  <select
                                    className="bg-white border border-[#ece9dc] rounded-lg px-2 py-1 text-[11px] outline-none text-gray-800 max-w-[120px]"
                                    value={statusVal}
                                    onChange={(e) => {
                                      setTargetStatus(e.target.value);
                                      setStatusPromptBook(b);
                                    }}
                                  >
                                    <option value="Draft">Draft (Rascunho)</option>
                                    <option value="Pending Review">Pending Review</option>
                                    <option value="Active">Active (Ativo)</option>
                                    <option value="Inactive">Inactive (Inativo)</option>
                                    <option value="Rejected">Rejected (Rejeitar)</option>
                                    <option value="Archived">Archived (Arquivar)</option>
                                  </select>
                                </div>
                              </td>
                              <td className="p-4 text-right pr-6">
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    onClick={() => {
                                      setSelectedBookDetails(b);
                                      setDetailsSubTab('stats');
                                    }}
                                    className="p-2 text-gray-500 hover:text-[#8a7e58] hover:bg-gray-100 rounded-lg transition cursor-pointer"
                                    title="Estatísticas e Histórico"
                                  >
                                    <BarChart3 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleAnalyzeSingleBook(b)}
                                    className="p-2 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                                    title="Análise de IA & Sugestões"
                                  >
                                    <Sparkles className="w-4 h-4 animate-pulse" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setTitle(b.title);
                                      setAuthor(b.author);
                                      setCategory(b.category);
                                      setDescription(b.description);
                                      setCoverUrl(b.coverUrl);
                                      setLanguage(b.language);
                                      setPublishDate(b.publishDate);
                                      setAudiobookAvailable(b.audiobookAvailable);
                                      setAudioDuration(b.audioDuration || "45m");
                                      setPagesRawContent(b.pdfContent.join("\n\n"));
                                      setIsbn(b.isbn || "");
                                      setKeywords(b.keywords ? b.keywords.join(", ") : "");
                                      setIsEditing(b.id);
                                    }}
                                    className="p-2 text-gray-500 hover:text-[#8a7e58] hover:bg-amber-50/50 rounded-lg transition cursor-pointer"
                                    title="Editar livro"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteBook(b.id, b.title)}
                                    disabled={currentAdmin.role !== "Super Administrador"}
                                    className={`p-2 rounded-lg transition cursor-pointer ${
                                      currentAdmin.role === "Super Administrador"
                                        ? "text-gray-500 hover:text-red-500 hover:bg-red-50"
                                        : "text-gray-300 cursor-not-allowed opacity-50"
                                    }`}
                                    title={currentAdmin.role === "Super Administrador" ? "Excluir permanentemente" : "Apenas Super Admins podem excluir"}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Controls */}
                  <div className="p-4 border-t border-[#f6f5ee] flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50/30">
                    <span className="text-xs text-gray-500">
                      Mostrando <strong className="font-semibold text-gray-800">{startIndex + 1}</strong> a{" "}
                      <strong className="font-semibold text-gray-800">
                        {Math.min(startIndex + booksPerPage, totalFiltered)}
                      </strong>{" "}
                      de <strong className="font-semibold text-gray-800">{totalFiltered}</strong> livros
                    </span>

                    <div className="flex items-center gap-1.5 font-sans">
                      <button
                        type="button"
                        onClick={() => setAdminPage((prev) => Math.max(prev - 1, 1))}
                        disabled={safePage === 1}
                        className="p-2 border border-[#ece9dc] rounded-xl hover:bg-white text-gray-600 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer flex items-center gap-1 text-[11px] font-bold bg-white"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        Anterior
                      </button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }).map((_, idx) => {
                          const pageNum = idx + 1;
                          return (
                            <button
                              type="button"
                              key={pageNum}
                              onClick={() => setAdminPage(pageNum)}
                              className={`w-7 h-7 rounded-lg text-xs font-bold transition flex items-center justify-center cursor-pointer ${
                                safePage === pageNum
                                  ? "bg-[#8a7e58] text-white"
                                  : "hover:bg-gray-100 text-gray-600 border border-[#ece9dc] bg-white"
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={() => setAdminPage((prev) => Math.min(prev + 1, totalPages))}
                        disabled={safePage === totalPages}
                        className="p-2 border border-[#ece9dc] rounded-xl hover:bg-white text-gray-600 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer flex items-center gap-1 text-[11px] font-bold bg-white"
                      >
                        Próximo
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 2: DASHBOARD STATISTICS (RECHARTS) */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8" id="tab-dashboard">
              {dashboardData ? (
                <>
                  {/* Indicators Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    <div className="bg-white border border-[#ece9dc] p-5 rounded-3xl shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-gray-400 font-bold uppercase text-[10px] tracking-wider">Total de Livros</span>
                        <BookOpen className="w-4 h-4 text-[#8a7e58]" />
                      </div>
                      <div className="text-3xl font-serif font-bold text-[#2d291c]">{dashboardData.counts.totalBooks}</div>
                      <div className="text-[10px] text-gray-400 mt-2 flex gap-2">
                        <span className="text-emerald-600 font-bold">{dashboardData.counts.active} Ativos</span>
                        <span>•</span>
                        <span>{dashboardData.counts.pending} Revisões</span>
                      </div>
                    </div>

                    <div className="bg-white border border-[#ece9dc] p-5 rounded-3xl shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-gray-400 font-bold uppercase text-[10px] tracking-wider">Total de Usuários</span>
                        <UserCheck className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="text-3xl font-serif font-bold text-[#2d291c]">{dashboardData.counts.totalUsers}</div>
                      <div className="text-[10px] text-red-500 mt-2 font-bold">
                        {dashboardData.counts.blockedUsers} bloqueados/suspensos
                      </div>
                    </div>

                    <div className="bg-white border border-[#ece9dc] p-5 rounded-3xl shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-gray-400 font-bold uppercase text-[10px] tracking-wider">Fila de Moderamento</span>
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                      </div>
                      <div className="text-3xl font-serif font-bold text-[#2d291c]">{dashboardData.counts.totalReports}</div>
                      <div className="text-[10px] text-amber-600 mt-2 font-bold">
                        {dashboardData.counts.pendingReports} denúncias pendentes
                      </div>
                    </div>

                    <div className="bg-white border border-[#ece9dc] p-5 rounded-3xl shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-gray-400 font-bold uppercase text-[10px] tracking-wider">Auditoria de Alterações</span>
                        <History className="w-4 h-4 text-indigo-500" />
                      </div>
                      <div className="text-3xl font-serif font-bold text-[#2d291c]">{logs.length}</div>
                      <div className="text-[10px] text-gray-400 mt-2">
                        Ações administrativas auditadas
                      </div>
                    </div>
                  </div>

                  {/* Charts row */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Line Chart */}
                    <div className="lg:col-span-8 bg-white border border-[#ece9dc] p-6 rounded-3xl shadow-sm">
                      <h4 className="font-serif font-bold text-base text-[#2d291c] mb-1">Evolução Temporal de Leitura</h4>
                      <p className="text-[10px] text-gray-400 mb-6 uppercase tracking-wider">Volume total de páginas lidas e progressos de leitura consolidados</p>
                      
                      <div className="h-[280px] w-full text-xs font-sans">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={dashboardData.last30DaysReads}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f6f5ee" />
                            <XAxis dataKey="name" stroke="#a1a1aa" />
                            <YAxis stroke="#a1a1aa" />
                            <Tooltip contentStyle={{ background: "#2d291c", border: "none", borderRadius: "12px", color: "#fff", fontFamily: "Inter" }} />
                            <Line type="monotone" dataKey="leituras" stroke="#8a7e58" strokeWidth={3} activeDot={{ r: 6 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Pie Chart */}
                    <div className="lg:col-span-4 bg-white border border-[#ece9dc] p-6 rounded-3xl shadow-sm flex flex-col justify-between">
                      <div>
                        <h4 className="font-serif font-bold text-base text-[#2d291c] mb-1">Status do Acervo</h4>
                        <p className="text-[10px] text-gray-400 mb-6 uppercase tracking-wider">Proporção estruturada de livros cadastrados</p>
                      </div>

                      <div className="h-[180px] w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: "Ativos", value: dashboardData.counts.active },
                                { name: "Revisão", value: dashboardData.counts.pending },
                                { name: "Inativos", value: dashboardData.counts.inactive },
                                { name: "Arquivados", value: dashboardData.counts.archived },
                              ].filter(d => d.value > 0)}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={75}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              <Cell fill="#10b981" /> {/* Emerald */}
                              <Cell fill="#f59e0b" /> {/* Amber */}
                              <Cell fill="#ef4444" /> {/* Red */}
                              <Cell fill="#6366f1" /> {/* Indigo */}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px] font-sans font-bold text-gray-600 pt-4 border-t border-[#f6f5ee]">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />Ativos ({dashboardData.counts.active})</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" />Revisão ({dashboardData.counts.pending})</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500" />Inativos ({dashboardData.counts.inactive})</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />Arquivados ({dashboardData.counts.archived})</span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Grid: Popular categories and books */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Categories Bar Chart */}
                    <div className="bg-white border border-[#ece9dc] p-6 rounded-3xl shadow-sm">
                      <h4 className="font-serif font-bold text-base text-[#2d291c] mb-1">Categorias Mais Lidas</h4>
                      <p className="text-[10px] text-gray-400 mb-6 uppercase tracking-wider">Volume agregado de acessos a capítulos por tema</p>

                      <div className="h-[220px] w-full text-xs font-sans">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={dashboardData.popularCategories}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f6f5ee" />
                            <XAxis dataKey="name" stroke="#a1a1aa" />
                            <YAxis stroke="#a1a1aa" />
                            <Tooltip contentStyle={{ background: "#2d291c", border: "none", borderRadius: "12px", color: "#fff" }} />
                            <Bar dataKey="value" fill="#8a7e58" radius={[8, 8, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Popular Books */}
                    <div className="bg-white border border-[#ece9dc] p-6 rounded-3xl shadow-sm flex flex-col justify-between">
                      <div>
                        <h4 className="font-serif font-bold text-base text-[#2d291c] mb-1">Livros Mais Populares</h4>
                        <p className="text-[10px] text-gray-400 mb-4 uppercase tracking-wider">Top 5 títulos com maior engajamento do leitor</p>
                      </div>

                      <div className="divide-y divide-gray-50 flex-grow font-sans text-xs">
                        {dashboardData.popularBooks.map((pb: any, index: number) => (
                          <div key={pb.id} className="py-2.5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-[#8a7e58] text-sm w-4">#{index + 1}</span>
                              <div>
                                <span className="font-serif font-bold text-gray-800 block truncate max-w-[200px]">{pb.title}</span>
                                <span className="text-[10px] text-gray-400">{pb.author}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-gray-800 block">{pb.readsCount} leituras</span>
                              <span className="text-[9px] text-gray-400 font-bold block">{pb.avgRating ? `★ ${pb.avgRating.toFixed(1)}` : 'Sem nota'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center text-gray-500 py-12">Nenhum dado consolidado no dashboard.</div>
              )}
            </div>
          )}

          {/* TAB 3: USER MANAGEMENT */}
          {activeTab === 'users' && (
            <div className="bg-white border border-[#ece9dc] rounded-3xl overflow-hidden shadow-sm mb-12" id="tab-users">
              <div className="p-6 bg-[#f6f5ee]/40 border-b border-[#ece9dc] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="font-serif font-bold text-lg text-[#2d291c]">Controle de Usuários e Acessos</h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">Gerencie o status de bloqueio, suspensão e atualize os privilégios administrativos.</p>
                </div>

                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Filtrar por nome, email, ID..."
                    className="w-full bg-white border border-[#ece9dc] rounded-xl pl-9 pr-4 py-2 text-xs outline-none focus:ring-1 focus:ring-[#8a7e58] text-gray-900"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                </div>
              </div>

              {filteredUsers.length === 0 ? (
                <div className="p-12 text-center text-gray-500 text-sm">Nenhum usuário cadastrado ou correspondente.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#f6f5ee] border-b border-[#ece9dc] text-gray-500 font-semibold uppercase tracking-wider">
                        <th className="p-4 pl-6">Usuário</th>
                        <th className="p-4">Cargo / Função (Role)</th>
                        <th className="p-4">Status de Bloqueio</th>
                        <th className="p-4">Leituras / Favoritos</th>
                        <th className="p-4">Último Acesso</th>
                        <th className="p-4 text-right pr-6">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f6f5ee]">
                      {paginatedUsers.map((u) => {
                        const isBlocked = u.status === "Blocked";
                        return (
                          <tr key={u.id} className="hover:bg-gray-50/50 transition">
                            <td className="p-4 pl-6 flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-[#8a7e58]/10 text-[#8a7e58] border border-[#8a7e58]/20 flex items-center justify-center font-bold font-serif text-sm">
                                {u.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <span className="font-serif font-bold text-gray-900 block leading-tight">{u.name}</span>
                                <span className="text-[10px] text-gray-400 block mt-0.5">{u.email}</span>
                              </div>
                            </td>
                            <td className="p-4">
                              <select
                                className="bg-white border border-[#ece9dc] rounded-lg px-2 py-1 text-[11px] outline-none text-gray-800 disabled:opacity-60 disabled:cursor-not-allowed"
                                value={u.role || "Leitor"}
                                disabled={currentAdmin.role !== "Super Administrador"}
                                onChange={(e) => handleUpdateUserRole(u.id, e.target.value)}
                              >
                                <option value="Super Administrador">Super Administrador</option>
                                <option value="Administrador">Administrador</option>
                                <option value="Moderador">Moderador</option>
                                <option value="Leitor">Leitor</option>
                              </select>
                              {currentAdmin.role !== "Super Administrador" && (
                                <span className="text-[9px] text-gray-400 block mt-0.5">Apenas Super Admin altera</span>
                              )}
                            </td>
                            <td className="p-4">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                isBlocked 
                                  ? "bg-red-50 text-red-600 border-red-200" 
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
                              }`}>
                                {isBlocked ? "Bloqueado" : "Ativo"}
                              </span>
                            </td>
                            <td className="p-4 text-gray-600 font-medium font-sans">
                              {u.booksReadCount || 0} lidos • {u.favorites?.length || 0} favoritos
                            </td>
                            <td className="p-4 text-gray-500 font-mono text-[10px]">
                              {u.lastAccess ? new Date(u.lastAccess).toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : "Nunca"}
                            </td>
                            <td className="p-4 text-right pr-6">
                              <div className="flex justify-end gap-1.5">
                                <button
                                  onClick={() => setSelectedUserDetails(u)}
                                  className="text-xs bg-[#8a7e58]/10 text-[#8a7e58] hover:bg-[#8a7e58]/20 px-2.5 py-1.5 rounded-xl transition font-bold flex items-center gap-1 cursor-pointer"
                                  title="Perfil Detalhado"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  Detalhes
                                </button>
                                <button
                                  onClick={() => handleToggleUserBlock(u)}
                                  disabled={u.id === currentAdmin.id}
                                  className={`p-1.5 rounded-lg border transition cursor-pointer ${
                                    isBlocked
                                      ? "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100"
                                      : "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                                  title={isBlocked ? "Desbloquear" : "Bloquear"}
                                >
                                  <UserX className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {/* Users Pagination Controls */}
                  {totalUserPages > 1 && (
                    <div className="p-4 bg-[#f6f5ee]/20 border-t border-[#ece9dc] flex items-center justify-between">
                      <div className="text-[11px] text-gray-500">
                        Mostrando <span className="font-semibold">{userStartIndex + 1}</span> a{" "}
                        <span className="font-semibold">
                          {Math.min(userStartIndex + usersPerPage, totalFilteredUsers)}
                        </span>{" "}
                        de <span className="font-semibold">{totalFilteredUsers}</span> usuários
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setUserPage(prev => Math.max(prev - 1, 1))}
                          disabled={safeUserPage === 1}
                          className="px-2.5 py-1.5 rounded-lg border border-[#ece9dc] text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer animate-none"
                        >
                          Anterior
                        </button>
                        <div className="text-xs text-gray-600 px-2">
                          Página <span className="font-semibold text-gray-900">{safeUserPage}</span> de{" "}
                          <span className="font-semibold text-gray-900">{totalUserPages}</span>
                        </div>
                        <button
                          onClick={() => setUserPage(prev => Math.min(prev + 1, totalUserPages))}
                          disabled={safeUserPage === totalUserPages}
                          className="px-2.5 py-1.5 rounded-lg border border-[#ece9dc] text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer animate-none"
                        >
                          Próximo
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB: SAAS & PREMIUM PLANS */}
          {activeTab === 'saas' && (
            <div className="space-y-6 animate-none" id="tab-saas">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border border-[#ece9dc] rounded-3xl p-6 shadow-sm">
                  <p className="text-gray-400 text-[11px] font-semibold uppercase tracking-wider">Assinantes Ativos</p>
                  <p className="text-3xl font-serif font-bold text-gray-900 mt-1">
                    {users.filter(u => u.subscription?.plan === 'PREMIUM').length} <span className="text-xs text-gray-400 font-sans font-normal">leitores</span>
                  </p>
                  <div className="text-[10px] text-emerald-600 font-semibold mt-2 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>Acesso Premium Completo</span>
                  </div>
                </div>

                <div className="bg-white border border-[#ece9dc] rounded-3xl p-6 shadow-sm">
                  <p className="text-gray-400 text-[11px] font-semibold uppercase tracking-wider">Solicitações Pendentes</p>
                  <p className="text-3xl font-serif font-bold text-amber-600 mt-1">
                    {saasRequests.filter(r => r.status === 'pending').length} <span className="text-xs text-gray-400 font-sans font-normal">aguardando</span>
                  </p>
                  <div className="text-[10px] text-amber-600 font-semibold mt-2 flex items-center gap-1">
                    <Trophy className="w-3 h-3 animate-pulse" />
                    <span>Aprovação Manual SaaS</span>
                  </div>
                </div>

                <div className="bg-white border border-[#ece9dc] rounded-3xl p-6 shadow-sm">
                  <p className="text-gray-400 text-[11px] font-semibold uppercase tracking-wider">Receita Mensal Estimada</p>
                  <p className="text-3xl font-serif font-bold text-[#8a7e58] mt-1">
                    R$ {(
                      users.reduce((acc, u) => {
                        if (u.subscription?.plan === 'PREMIUM') {
                          return acc + (u.subscription.billingInterval === 'yearly' ? 7.49 : 9.99);
                        }
                        return acc;
                      }, 0)
                    ).toFixed(2)} <span className="text-xs text-gray-400 font-sans font-normal">/mês</span>
                  </p>
                  <div className="text-[10px] text-gray-400 mt-2">
                    Cálculo baseado nas assinaturas recorrentes
                  </div>
                </div>
              </div>

              {/* SECTION 1: Pending Requests */}
              <div className="bg-white border border-[#ece9dc] rounded-3xl overflow-hidden shadow-sm">
                <div className="p-6 bg-[#f6f5ee]/40 border-b border-[#ece9dc]">
                  <h3 className="font-serif font-bold text-lg text-[#2d291c]">Solicitações Pendentes de Upgrade Premium</h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">Aprove ou rejeite novas requisições de ativação de planos após validar os pagamentos.</p>
                </div>

                {saasRequests.filter(r => r.status === 'pending').length === 0 ? (
                  <div className="p-12 text-center text-gray-500 text-sm">Nenhuma solicitação pendente no momento.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#f6f5ee] border-b border-[#ece9dc] text-gray-500 font-semibold uppercase tracking-wider">
                          <th className="p-4 pl-6">Leitor</th>
                          <th className="p-4">Plano Solicitado</th>
                          <th className="p-4">Faturamento</th>
                          <th className="p-4">Data do Envio</th>
                          <th className="p-4 text-right pr-6">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f6f5ee]">
                        {saasRequests.filter(r => r.status === 'pending').map((req) => (
                          <tr key={req.id} className="hover:bg-gray-50/50 transition">
                            <td className="p-4 pl-6">
                              <span className="font-serif font-bold text-gray-900 block leading-tight">{req.userName}</span>
                              <span className="text-[10px] text-gray-400 block mt-0.5">{req.userEmail}</span>
                            </td>
                            <td className="p-4 font-bold text-amber-600">
                              PREMIUM
                            </td>
                            <td className="p-4 text-gray-600 font-medium">
                              {req.billingInterval === "yearly" ? "Anual (R$ 89,99)" : "Mensal (R$ 9,99)"}
                            </td>
                            <td className="p-4 text-gray-500 font-mono text-[10px]">
                              {new Date(req.createdAt).toLocaleString("pt-BR")}
                            </td>
                            <td className="p-4 text-right pr-6">
                              <div className="flex justify-end gap-1.5">
                                <button
                                  disabled={!!saasActionLoading}
                                  onClick={async () => {
                                    setSaasActionLoading(req.id);
                                    try {
                                      const res = await fetch("/api/admin/billing/approve", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ requestId: req.id, adminId: currentAdmin.id })
                                      });
                                      const data = await res.json();
                                      if (data.success) {
                                        // refresh
                                        const reqsRes = await fetch("/api/admin/billing/requests");
                                        const reqsData = await reqsRes.json();
                                        if (reqsData.success) {
                                          setSaasRequests(reqsData.requests || []);
                                        }
                                        const u = await adminFetchUsers();
                                        setUsers(u);
                                      } else {
                                        alert(data.error || "Erro ao aprovar");
                                      }
                                    } catch (err) {
                                      alert("Erro de conexão");
                                    } finally {
                                      setSaasActionLoading(null);
                                    }
                                  }}
                                  className="text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl transition font-bold cursor-pointer disabled:opacity-40"
                                >
                                  {saasActionLoading === req.id ? "Aprovando..." : "Aprovar"}
                                </button>
                                <button
                                  disabled={!!saasActionLoading}
                                  onClick={async () => {
                                    setSaasActionLoading(req.id);
                                    try {
                                      const res = await fetch("/api/admin/billing/reject", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ requestId: req.id, adminId: currentAdmin.id })
                                      });
                                      const data = await res.json();
                                      if (data.success) {
                                        // refresh
                                        const reqsRes = await fetch("/api/admin/billing/requests");
                                        const reqsData = await reqsRes.json();
                                        if (reqsData.success) {
                                          setSaasRequests(reqsData.requests || []);
                                        }
                                        const u = await adminFetchUsers();
                                        setUsers(u);
                                      } else {
                                        alert(data.error || "Erro ao rejeitar");
                                      }
                                    } catch (err) {
                                      alert("Erro de conexão");
                                    } finally {
                                      setSaasActionLoading(null);
                                    }
                                  }}
                                  className="text-xs bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-xl transition font-bold cursor-pointer disabled:opacity-40"
                                >
                                  {saasActionLoading === req.id ? "Recusando..." : "Recusar"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* SECTION 2: Active Premium Members */}
              <div className="bg-white border border-[#ece9dc] rounded-3xl overflow-hidden shadow-sm">
                <div className="p-6 bg-[#f6f5ee]/40 border-b border-[#ece9dc]">
                  <h3 className="font-serif font-bold text-lg text-[#2d291c]">Assinantes Premium Ativos</h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">Gerencie o acesso de assinantes e cancele planos se necessário.</p>
                </div>

                {users.filter(u => u.subscription?.plan === 'PREMIUM').length === 0 ? (
                  <div className="p-12 text-center text-gray-500 text-sm">Nenhum assinante premium ativo no sistema.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#f6f5ee] border-b border-[#ece9dc] text-gray-500 font-semibold uppercase tracking-wider">
                          <th className="p-4 pl-6">Usuário</th>
                          <th className="p-4">Faturamento</th>
                          <th className="p-4">Vencimento</th>
                          <th className="p-4">Método</th>
                          <th className="p-4 text-right pr-6">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f6f5ee]">
                        {users.filter(u => u.subscription?.plan === 'PREMIUM').map((usr) => (
                          <tr key={usr.id} className="hover:bg-gray-50/50 transition">
                            <td className="p-4 pl-6">
                              <span className="font-serif font-bold text-gray-900 block leading-tight">{usr.name}</span>
                              <span className="text-[10px] text-gray-400 block mt-0.5">{usr.email}</span>
                            </td>
                            <td className="p-4 font-semibold text-[#8a7e58]">
                              {usr.subscription?.billingInterval === "yearly" ? "Premium Anual" : "Premium Mensal"}
                            </td>
                            <td className="p-4 text-gray-500 font-mono text-[10px]">
                              {usr.subscription?.expiresAt ? new Date(usr.subscription.expiresAt).toLocaleDateString("pt-BR") : "N/A"}
                            </td>
                            <td className="p-4 text-gray-600 font-medium">
                              {usr.subscription?.paymentMethod?.brand?.toUpperCase() || "MANUAL/PIX"}
                            </td>
                            <td className="p-4 text-right pr-6">
                              <button
                                disabled={!!saasActionLoading}
                                onClick={async () => {
                                  setConfirmAction({
                                    title: "Forçar Cancelamento de Assinatura",
                                    message: `Tem certeza que deseja forçar o cancelamento da assinatura Premium de "${usr.name}"? Isso revogará o acesso dele imediatamente no Firestore.`,
                                    confirmText: "Sim, Forçar Cancelamento",
                                    cancelText: "Não, Manter Ativa",
                                    onConfirm: async () => {
                                      setSaasActionLoading(usr.id);
                                      try {
                                        const res = await fetch("/api/admin/billing/force-cancel", {
                                          method: "POST",
                                          headers: { "Content-Type": "application/json" },
                                          body: JSON.stringify({ userId: usr.id, adminId: currentAdmin.id })
                                        });
                                        const data = await res.json();
                                        if (data.success) {
                                          // refresh
                                          const reqsRes = await fetch("/api/admin/billing/requests");
                                          const reqsData = await reqsRes.json();
                                          if (reqsData.success) {
                                            setSaasRequests(reqsData.requests || []);
                                          }
                                          const u = await adminFetchUsers();
                                          setUsers(u);
                                          triggerSuccess(`Assinatura de ${usr.name} cancelada com sucesso.`);
                                        } else {
                                          alert(data.error || "Erro ao cancelar");
                                        }
                                      } catch (err) {
                                        alert("Erro de conexão");
                                      } finally {
                                        setSaasActionLoading(null);
                                      }
                                    }
                                  });
                                }}
                                className="text-xs bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-xl transition font-bold cursor-pointer disabled:opacity-40 animate-none"
                              >
                                {saasActionLoading === usr.id ? "Cancelando..." : "Forçar Cancelamento"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* SECTION 3: Dynamic Subscription Pricing (USD) */}
              <div className="bg-white border border-[#ece9dc] rounded-3xl overflow-hidden shadow-sm">
                <div className="p-6 bg-[#f6f5ee]/40 border-b border-[#ece9dc]">
                  <h3 className="font-serif font-bold text-lg text-[#2d291c]">Configuração de Preços dos Planos (USD)</h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">Altere os valores da mensalidade e anuidade do plano Premium em dólares (USD).</p>
                </div>

                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">Preço Mensal ($ USD)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={saasMonthlyPrice}
                        onChange={(e) => setSaasMonthlyPrice(Number(e.target.value))}
                        className="w-full bg-gray-50 border border-[#ece9dc] rounded-xl px-4 py-2.5 text-xs text-gray-800 focus:border-[#8a7e58] outline-none font-sans"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">Preço Anual ($ USD)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={saasYearlyPrice}
                        onChange={(e) => setSaasYearlyPrice(Number(e.target.value))}
                        className="w-full bg-gray-50 border border-[#ece9dc] rounded-xl px-4 py-2.5 text-xs text-gray-800 focus:border-[#8a7e58] outline-none font-sans"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      disabled={isSavingSaasPrices}
                      onClick={async () => {
                        setIsSavingSaasPrices(true);
                        try {
                          const res = await fetch("/api/admin/subscription-prices", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              adminId: currentAdmin.id,
                              monthly: saasMonthlyPrice,
                              yearly: saasYearlyPrice
                            })
                          });
                          const data = await res.json();
                          if (data.success) {
                            alert("Preços de assinatura atualizados com sucesso!");
                          } else {
                            alert(data.error || "Erro ao salvar preços");
                          }
                        } catch (err) {
                          alert("Erro ao conectar ao servidor para salvar preços");
                        } finally {
                          setIsSavingSaasPrices(false);
                        }
                      }}
                      className="text-xs bg-[#8a7e58] hover:bg-[#726848] text-white px-5 py-2.5 rounded-xl transition font-bold cursor-pointer disabled:opacity-50"
                    >
                      {isSavingSaasPrices ? "Salvando..." : "Salvar Configuração de Preços"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: COMPLAINTS / REPORTS */}
          {activeTab === 'reports' && (
            <div className="bg-white border border-[#ece9dc] rounded-3xl overflow-hidden shadow-sm mb-12" id="tab-reports">
              <div className="p-6 bg-[#f6f5ee]/40 border-b border-[#ece9dc]">
                <h3 className="font-serif font-bold text-lg text-[#2d291c]">Denúncias de Obras Literárias</h3>
                <p className="text-[10px] text-gray-400 mt-0.5">Analise queixas e reclamações enviadas por leitores e tome medidas imediatas.</p>
              </div>

              {reports.length === 0 ? (
                <div className="p-12 text-center text-gray-500 text-sm">Não há denúncias pendentes de moderação.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#f6f5ee] border-b border-[#ece9dc] text-gray-500 font-semibold uppercase tracking-wider">
                        <th className="p-4 pl-6">Obra Denunciada</th>
                        <th className="p-4">Denunciante</th>
                        <th className="p-4">Motivo / Razão</th>
                        <th className="p-4">Descrição</th>
                        <th className="p-4">Data</th>
                        <th className="p-4">Estado</th>
                        <th className="p-4 text-right pr-6">Moderação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f6f5ee]">
                      {reports.map((r) => (
                        <tr key={r.id} className="hover:bg-gray-50/50 transition">
                          <td className="p-4 pl-6 font-serif font-bold text-gray-900">
                            {r.bookTitle}
                            <span className="text-[9px] text-gray-400 block font-mono font-normal">ID: {r.bookId}</span>
                          </td>
                          <td className="p-4 font-medium text-gray-700">{r.userName}</td>
                          <td className="p-4">
                            <span className="bg-red-50 text-red-700 px-2.5 py-0.5 rounded-full font-bold border border-red-100">
                              {r.reason}
                            </span>
                          </td>
                          <td className="p-4 text-gray-500 max-w-xs truncate" title={r.description}>
                            {r.description || <span className="italic text-gray-300">Sem descrição adicional</span>}
                          </td>
                          <td className="p-4 text-gray-500 font-mono text-[10px]">
                            {new Date(r.date).toLocaleDateString("pt-BR")}
                          </td>
                          <td className="p-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              r.status === "Pending" ? "bg-amber-50 text-amber-700 border-amber-200" :
                              r.status === "Ignored" ? "bg-gray-50 text-gray-500 border-gray-200" :
                              "bg-emerald-50 text-emerald-700 border-emerald-200"
                            }`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="p-4 text-right pr-6">
                            {r.status === "Pending" ? (
                              <div className="flex justify-end gap-1 w-full max-w-[240px]">
                                <button
                                  onClick={() => handleUpdateReport(r.id, "Ignored")}
                                  className="bg-gray-50 hover:bg-gray-100 text-gray-600 px-2 py-1 rounded-md text-[10px] font-bold border border-[#ece9dc] cursor-pointer"
                                >
                                  Ignorar
                                </button>
                                <button
                                  onClick={() => handleUpdateReport(r.id, "Resolved")}
                                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md text-[10px] font-bold border border-emerald-200 cursor-pointer"
                                >
                                  Resolver
                                </button>
                                <button
                                  onClick={() => handleDeactivateBookFromReport(r)}
                                  className="bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1 rounded-md text-[10px] font-bold border border-red-200 cursor-pointer"
                                >
                                  Desativar Livro
                                </button>
                              </div>
                            ) : (
                              <span className="text-gray-300 italic font-medium">Moderado</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              {/* SECTION B: COMMENT & REVIEW REPORTS */}
              <div className="bg-white border border-[#ece9dc] rounded-3xl overflow-hidden shadow-sm mt-8 mb-6" id="tab-comment-reports">
                <div className="p-6 bg-[#f6f5ee]/40 border-b border-[#ece9dc]">
                  <h3 className="font-serif font-bold text-lg text-[#2d291c]">Denúncias de Comentários & Avaliações</h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">Gerencie denúncias de comentários ofensivos, spam, spoilers ou assédio em reviews de livros.</p>
                </div>

                {reportedComments.length === 0 ? (
                  <div className="p-12 text-center text-gray-500 text-sm">Não há denúncias de comentários pendentes.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#f6f5ee] border-b border-[#ece9dc] text-gray-500 font-semibold uppercase tracking-wider">
                          <th className="p-4 pl-6">Comentário / Obra</th>
                          <th className="p-4">Autor do Comentário</th>
                          <th className="p-4">Tickets / Motivos</th>
                          <th className="p-4 text-center">Estado</th>
                          <th className="p-4 text-right pr-6">Ações de Moderação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f6f5ee]">
                        {reportedComments.map((comment) => {
                          const isCommentHidden = comment.status === "hidden";
                          const reasonsList = comment.reports?.map(r => r.reason) || [];
                          const uniqueReasons = Array.from(new Set(reasonsList));

                          return (
                            <tr key={comment.id} className="hover:bg-gray-50/50 transition">
                              <td className="p-4 pl-6 max-w-sm">
                                <span className="text-[10px] bg-amber-50 border border-amber-200 text-[#8a7e58] font-bold px-1.5 py-0.5 rounded block w-fit mb-1">
                                  {comment.bookTitle || "Livro desconhecido"}
                                </span>
                                <p className="text-gray-900 font-medium font-serif leading-relaxed italic">
                                  "{comment.comment}"
                                </p>
                                {comment.rating !== undefined && (
                                  <div className="flex text-amber-500 text-[10px] mt-1">
                                    {"★".repeat(comment.rating)}{"☆".repeat(5 - comment.rating)}
                                  </div>
                                )}
                              </td>
                              <td className="p-4 font-medium text-gray-700">
                                <div className="flex items-center gap-2">
                                  {comment.userAvatar ? (
                                    <img referrerPolicy="no-referrer" src={comment.userAvatar} alt="" className="w-6 h-6 rounded-full border" />
                                  ) : (
                                    <span className="w-6 h-6 rounded-full bg-zinc-200 flex items-center justify-center font-bold text-[10px] text-zinc-600">
                                      {comment.userName?.charAt(0).toUpperCase()}
                                    </span>
                                  )}
                                  <div>
                                    <span className="block font-bold">{comment.userName}</span>
                                    <span className="text-[9px] text-gray-400 font-mono">UID: {comment.userId}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="flex flex-col gap-1">
                                  <span className="text-red-700 font-bold text-[10px] flex items-center gap-1">
                                    <AlertTriangle className="w-3.5 h-3.5 text-red-500 inline" />
                                    {comment.reports?.length || 0} denúncia(s)
                                  </span>
                                  <div className="flex flex-wrap gap-1">
                                    {uniqueReasons.map((reason, rIdx) => (
                                      <span key={rIdx} className="bg-red-50 text-red-700 border border-red-100 text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                                        {reason}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </td>
                              <td className="p-4 text-center">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  isCommentHidden 
                                    ? "bg-red-100 text-red-800 border border-red-200" 
                                    : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                }`}>
                                  {isCommentHidden ? "Ocultado" : "Ativo"}
                                </span>
                              </td>
                              <td className="p-4 text-right pr-6">
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    onClick={() => handleModCommentStatus(comment.id, isCommentHidden ? "active" : "hidden")}
                                    className={`px-2 py-1 rounded-md text-[10px] font-bold border cursor-pointer transition ${
                                      isCommentHidden
                                        ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200"
                                        : "bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200"
                                    }`}
                                  >
                                    {isCommentHidden ? "Reativar" : "Ocultar"}
                                  </button>
                                  <button
                                    onClick={() => handleToggleUserBan(comment.userId)}
                                    className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-2 py-1 rounded-md text-[10px] font-bold cursor-pointer transition"
                                    title="Bloquear/Desbloquear o autor de postar novos comentários"
                                  >
                                    Tog Ban
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: SYSTEM LOGS AUDIT */}
          {activeTab === 'logs' && (
            <div className="bg-white border border-[#ece9dc] rounded-3xl overflow-hidden shadow-sm mb-12" id="tab-logs">
              <div className="p-6 bg-[#f6f5ee]/40 border-b border-[#ece9dc] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="font-serif font-bold text-lg text-[#2d291c]">Log de Alterações e Auditoria</h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">Histórico completo de ações operacionais e modificações na plataforma.</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Pesquisar logs..."
                      className="w-full bg-white border border-[#ece9dc] rounded-xl pl-9 pr-4 py-2 text-xs outline-none focus:ring-1 focus:ring-[#8a7e58]"
                      value={logSearch}
                      onChange={(e) => {
                        setLogSearch(e.target.value);
                        setLogPage(1);
                      }}
                    />
                  </div>

                  <select
                    className="bg-white border border-[#ece9dc] rounded-xl px-3 py-2 text-xs outline-none text-gray-900"
                    value={logFilterAction}
                    onChange={(e) => {
                      setLogFilterAction(e.target.value);
                      setLogPage(1);
                    }}
                  >
                    <option value="Todos">Todas Ações</option>
                    <option value="Criação de Livro">Criação de Livro</option>
                    <option value="Alteração de Status">Alteração de Status</option>
                    <option value="Alteração de Destaque">Alteração de Destaque</option>
                    <option value="Exclusão de Livro">Exclusão de Livro</option>
                    <option value="Gerenciamento de Usuário">Bloqueio de Usuário</option>
                    <option value="Alteração de Permissão">Permissões de Cargo</option>
                    <option value="Operação em Lote">Operações em Lote</option>
                    <option value="Resolução de Denúncia">Denúncias Resolvidas</option>
                  </select>
                </div>
              </div>

              {filteredLogs.length === 0 ? (
                <div className="p-12 text-center text-gray-500 text-sm">Nenhum log encontrado para os critérios.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#f6f5ee] border-b border-[#ece9dc] text-gray-500 font-semibold uppercase tracking-wider">
                        <th className="p-4 pl-6">Data e Hora</th>
                        <th className="p-4">Operador</th>
                        <th className="p-4">Ação</th>
                        <th className="p-4 pl-6">Detalhes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f6f5ee] font-sans">
                      {paginatedLogs.map((l) => (
                        <tr key={l.id} className="hover:bg-gray-50/50 transition">
                          <td className="p-4 pl-6 text-gray-400 font-mono text-[10px] whitespace-nowrap">
                            {new Date(l.timestamp).toLocaleString("pt-BR")}
                          </td>
                          <td className="p-4 font-medium text-gray-900">
                            {l.userName}
                            <span className="text-[9px] text-gray-400 block font-normal">{l.userEmail}</span>
                          </td>
                          <td className="p-4">
                            <span className="bg-[#f6f5ee] text-[#8a7e58] border border-[#dad5bf] px-2 py-0.5 rounded-md font-bold text-[9px] uppercase tracking-wide">
                              {l.action}
                            </span>
                          </td>
                          <td className="p-4 text-gray-600 pl-6 text-xs font-normal">
                            {l.details}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {/* Logs Pagination Controls */}
                  {totalLogPages > 1 && (
                    <div className="p-4 bg-[#f6f5ee]/20 border-t border-[#ece9dc] flex items-center justify-between">
                      <div className="text-[11px] text-gray-500">
                        Mostrando <span className="font-semibold">{logStartIndex + 1}</span> a{" "}
                        <span className="font-semibold">
                          {Math.min(logStartIndex + logsPerPage, totalFilteredLogs)}
                        </span>{" "}
                        de <span className="font-semibold">{totalFilteredLogs}</span> logs
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setLogPage(prev => Math.max(1, prev - 1))}
                          disabled={safeLogPage === 1}
                          className="px-2.5 py-1.5 rounded-lg border border-[#ece9dc] text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer bg-white"
                        >
                          Anterior
                        </button>
                        <div className="text-xs text-gray-600 px-2">
                          Página <span className="font-semibold text-gray-900">{safeLogPage}</span> de{" "}
                          <span className="font-semibold text-gray-900">{totalLogPages}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setLogPage(prev => Math.min(prev + 1, totalLogPages))}
                          disabled={safeLogPage === totalLogPages}
                          className="px-2.5 py-1.5 rounded-lg border border-[#ece9dc] text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer bg-white"
                        >
                          Próximo
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: NOTIFICATIONS & CAMPAIGNS CENTER */}
          {activeTab === 'notifications' && (
            <div className="bg-[#121214] border border-zinc-800 rounded-3xl p-6 md:p-8 mb-12 text-left animate-fadeIn" id="tab-notifications">
              <AdminNotificationCenter 
                adminUser={currentAdmin as User} 
                onNavigate={(view) => {
                  if (view === 'reports' || view === 'books' || view === 'logs' || view === 'users') {
                    setActiveTab(view as any);
                  }
                }} 
              />
            </div>
          )}

          {/* TAB 7: AI ADMINISTRATIVA DASHBOARD & CO-PILOT */}
          {activeTab === 'ai' && (
            <div className="space-y-8 text-left animate-fadeIn" id="tab-ai-dashboard">
              {/* Top Banner */}
              <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200/60 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
                    <span className="text-[10px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider">Mecanismo Integrado</span>
                  </div>
                  <h2 className="text-2xl font-serif font-bold text-gray-900">Co-Piloto & IA Administrativa</h2>
                  <p className="text-xs text-gray-500 max-w-xl">
                    Utilize o poder da Inteligência Artificial Generativa para otimizar o catálogo do BookVerse, detectar inconsistências, identificar obras duplicadas e obter insights do comportamento do leitor.
                  </p>
                </div>

                {/* AI Config Switcher */}
                <div className="bg-white border border-amber-200 rounded-2xl p-4 flex items-center gap-4 shadow-xs self-stretch md:self-auto justify-between md:justify-start">
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">Estado Geral da IA</span>
                    <span className={`text-xs font-bold ${aiConfigEnabled ? "text-emerald-600" : "text-gray-500"}`}>
                      {aiConfigEnabled ? "Diretivas Ativas" : "Desativado"}
                    </span>
                  </div>
                  <button
                    onClick={handleToggleAiConfig}
                    disabled={isAiConfigLoading}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      aiConfigEnabled
                        ? "bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-200"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200"
                    }`}
                  >
                    {isAiConfigLoading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : aiConfigEnabled ? (
                      <>
                        <Lock className="w-3.5 h-3.5" /> Pausar Diretivas
                      </>
                    ) : (
                      <>
                        <Unlock className="w-3.5 h-3.5" /> Ativar IA
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Grid: Actions & Duplicate List */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Panel: Catalog Scan & Duplicate Detection (7 columns) */}
                <div className="lg:col-span-7 space-y-8">
                  {/* Automated Scanners */}
                  <div className="bg-white border border-[#ece9dc] rounded-3xl p-6 shadow-sm space-y-5">
                    <h3 className="text-sm font-serif font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-amber-500" /> Varreduras e Processamentos Globais
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Catalog metadata scanner */}
                      <div className="border border-[#ece9dc] rounded-2xl p-4 bg-gray-50/50 flex flex-col justify-between">
                        <div className="space-y-1.5">
                          <span className="font-bold text-xs text-gray-800 block">Varredura de Metadados</span>
                          <p className="text-[11px] text-gray-500 leading-normal">
                            Analisa todos os livros e preenche tags, resumos e gera categorias sugeridas caso estejam em rascunho ou incompletos.
                          </p>
                        </div>
                        <button
                          onClick={handleAnalyzeCatalog}
                          disabled={isAnalyzingCatalog}
                          className="mt-4 w-full bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2"
                        >
                          {isAnalyzingCatalog ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" /> Analisando...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5" /> Analisar Todo o Catálogo
                            </>
                          )}
                        </button>
                      </div>

                      {/* Duplicate Detector */}
                      <div className="border border-[#ece9dc] rounded-2xl p-4 bg-gray-50/50 flex flex-col justify-between">
                        <div className="space-y-1.5">
                          <span className="font-bold text-xs text-gray-800 block">Detetor de Registros Duplicados</span>
                          <p className="text-[11px] text-gray-500 leading-normal">
                            Busca e compara títulos similares ou conteúdo cruzado no acervo do BookVerse para higienizar dados de catálogo.
                          </p>
                        </div>
                        <button
                          onClick={handleDetectDuplicates}
                          disabled={isDetectingDuplicates}
                          className="mt-4 w-full bg-gray-50 hover:bg-gray-100 text-gray-800 border border-gray-200 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2"
                        >
                          {isDetectingDuplicates ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-gray-500" /> Executando busca...
                            </>
                          ) : (
                            <>
                              <Layers className="w-3.5 h-3.5" /> Detectar Duplicações
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Duplicate Pairs Section */}
                  <div className="bg-white border border-[#ece9dc] rounded-3xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                      <h3 className="text-sm font-serif font-bold text-gray-900 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" /> Potenciais Duplicações Encontradas ({duplicatePairs.length})
                      </h3>
                      {duplicatePairs.length > 0 && (
                        <span className="text-[9px] bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider">Ação Recomendada</span>
                      )}
                    </div>

                    {duplicatePairs.length === 0 ? (
                      <div className="text-center py-10 px-4 border border-dashed border-[#ece9dc] rounded-2xl bg-gray-50/30">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                        <span className="text-xs font-bold text-gray-700 block">Catálogo Saudável e Higienizado</span>
                        <p className="text-[11px] text-gray-400 mt-1">Nenhum registro suspeito de duplicação foi detectado no acervo.</p>
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                        {duplicatePairs.map((pair, idx) => (
                          <div key={idx} className="border border-red-100 bg-red-50/10 rounded-2xl p-4 space-y-3">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-mono text-[10px] text-red-600 bg-red-50 px-2 py-0.5 rounded font-bold">Confiança de Duplicação: {Math.round(pair.confidence * 100)}%</span>
                              <span className="text-gray-400">Motivo: {pair.reason}</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Book A */}
                              <div className="border border-[#ece9dc] bg-white rounded-xl p-3 text-xs flex gap-3 relative">
                                <div className="w-10 h-14 bg-gray-100 rounded-md overflow-hidden flex-shrink-0 border border-gray-200">
                                  {pair.bookA.coverUrl ? (
                                    <img src={pair.bookA.coverUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[8px] text-gray-400">Sem Capa</div>
                                  )}
                                </div>
                                <div className="min-w-0 space-y-0.5">
                                  <span className="font-serif font-bold text-gray-900 block truncate" title={pair.bookA.title}>{pair.bookA.title}</span>
                                  <span className="text-[10px] text-gray-500 block truncate">Autor: {pair.bookA.author}</span>
                                  <span className="text-[9px] text-gray-400 font-mono block">ID: {pair.bookA.id.slice(0, 8)}...</span>
                                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold inline-block mt-1 ${pair.bookA.status === "Inactive" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                                    {pair.bookA.status === "Inactive" ? "Inativo" : "Ativo"}
                                  </span>
                                </div>
                                {pair.bookA.status !== "Inactive" && (
                                  <button
                                    onClick={async () => {
                                      const confirm = window.confirm(`Deseja desativar "${pair.bookA.title}" para resolver a duplicação?`);
                                      if (!confirm) return;
                                      try {
                                        await adminUpdateBookStatus(pair.bookA.id, "Inactive", `Desativado devido a duplicação com livro ID ${pair.bookB.id}`, currentAdmin.id);
                                        triggerSuccess(`Livro "${pair.bookA.title}" inativado com sucesso.`);
                                        handleDetectDuplicates();
                                        onRefreshBooks();
                                      } catch (err: any) {
                                        setError(err.message);
                                      }
                                    }}
                                    className="absolute bottom-2 right-2 text-[10px] text-red-600 hover:text-red-800 font-bold underline bg-transparent border-0 cursor-pointer"
                                  >
                                    Inativar
                                  </button>
                                )}
                              </div>

                              {/* Book B */}
                              <div className="border border-[#ece9dc] bg-white rounded-xl p-3 text-xs flex gap-3 relative">
                                <div className="w-10 h-14 bg-gray-100 rounded-md overflow-hidden flex-shrink-0 border border-gray-200">
                                  {pair.bookB.coverUrl ? (
                                    <img src={pair.bookB.coverUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[8px] text-gray-400">Sem Capa</div>
                                  )}
                                </div>
                                <div className="min-w-0 space-y-0.5">
                                  <span className="font-serif font-bold text-gray-900 block truncate" title={pair.bookB.title}>{pair.bookB.title}</span>
                                  <span className="text-[10px] text-gray-500 block truncate">Autor: {pair.bookB.author}</span>
                                  <span className="text-[9px] text-gray-400 font-mono block">ID: {pair.bookB.id.slice(0, 8)}...</span>
                                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold inline-block mt-1 ${pair.bookB.status === "Inactive" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                                    {pair.bookB.status === "Inactive" ? "Inativo" : "Ativo"}
                                  </span>
                                </div>
                                {pair.bookB.status !== "Inactive" && (
                                  <button
                                    onClick={async () => {
                                      const confirm = window.confirm(`Deseja desativar "${pair.bookB.title}" para resolver a duplicação?`);
                                      if (!confirm) return;
                                      try {
                                        await adminUpdateBookStatus(pair.bookB.id, "Inactive", `Desativado devido a duplicação com livro ID ${pair.bookA.id}`, currentAdmin.id);
                                        triggerSuccess(`Livro "${pair.bookB.title}" inativado com sucesso.`);
                                        handleDetectDuplicates();
                                        onRefreshBooks();
                                      } catch (err: any) {
                                        setError(err.message);
                                      }
                                    }}
                                    className="absolute bottom-2 right-2 text-[10px] text-red-600 hover:text-red-800 font-bold underline bg-transparent border-0 cursor-pointer"
                                  >
                                    Inativar
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Panel: AI Interactive Chat Assistant (5 columns) */}
                <div className="lg:col-span-5">
                  <div className="bg-white border border-[#ece9dc] rounded-3xl p-6 shadow-sm flex flex-col h-[550px]">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3 flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-amber-500" />
                        <h3 className="text-sm font-serif font-bold text-gray-900">Co-Piloto do Acervo</h3>
                      </div>
                      <span className="flex items-center gap-1.5 text-[9px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full font-mono font-bold">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                        GEMINI ONLINE
                      </span>
                    </div>

                    {/* Messages Window */}
                    <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 text-xs">
                      {aiChatMessages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[85%] rounded-2xl p-3.5 space-y-1.5 ${
                              msg.sender === "user"
                                ? "bg-[#f6f5ee] text-[#2d291c] border border-[#dad5bf]"
                                : "bg-gray-900 text-gray-100 rounded-tl-none font-sans leading-relaxed"
                            }`}
                          >
                            <span className="text-[9px] text-gray-400 block font-bold uppercase tracking-wider">
                              {msg.sender === "user" ? "Você (Administrador)" : "BookVerse AI Co-Pilot"}
                            </span>
                            <p className="whitespace-pre-line text-xs font-normal leading-relaxed">{msg.text}</p>
                          </div>
                        </div>
                      ))}
                      {isAiChatLoading && (
                        <div className="flex justify-start">
                          <div className="bg-gray-900 text-gray-100 rounded-2xl rounded-tl-none p-3.5 flex items-center gap-2">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                            <span className="text-[11px] font-sans">Analisando dados do BookVerse...</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Prompt Presets */}
                    <div className="flex-shrink-0 pt-2 border-t border-gray-100 space-y-2">
                      <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">Sugestões de Perguntas rápidas:</span>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          onClick={() => handleSendAiChatMessage("Quantos livros precisam de revisão de metadados?")}
                          disabled={isAiChatLoading}
                          className="bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 text-[10px] px-2 py-1 rounded-lg transition cursor-pointer"
                        >
                          "Livros incompletos?"
                        </button>
                        <button
                          onClick={() => handleSendAiChatMessage("Faça uma análise de popularidade dos livros de Clássicos")}
                          disabled={isAiChatLoading}
                          className="bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 text-[10px] px-2 py-1 rounded-lg transition cursor-pointer"
                        >
                          "Popularidade Clássicos"
                        </button>
                        <button
                          onClick={() => handleSendAiChatMessage("Sugira novos temas e autores com base nas leituras dos usuários")}
                          disabled={isAiChatLoading}
                          className="bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 text-[10px] px-2 py-1 rounded-lg transition cursor-pointer"
                        >
                          "Sugerir novos livros"
                        </button>
                      </div>
                    </div>

                    {/* Form Input */}
                    <div className="flex-shrink-0 pt-3 flex gap-2">
                      <input
                        type="text"
                        placeholder="Pergunte sobre o acervo, logs, previsões de audiência..."
                        value={aiChatInput}
                        onChange={(e) => setAiChatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSendAiChatMessage();
                        }}
                        className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                      <button
                        onClick={() => handleSendAiChatMessage()}
                        disabled={isAiChatLoading || !aiChatInput.trim()}
                        className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer flex-shrink-0"
                      >
                        Enviar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ==========================================
          MODALS & DIALOGS
          ========================================== */}
      
      {/* DIALOG 1: PROFESSIONAL BOOK WIZARD & EDITOR */}
      <AnimatePresence>
        {(isAdding || isEditing) && (
          <ProfessionalBookEditor
            book={isEditing ? (books.find((b) => b.id === isEditing) || null) : null}
            onClose={() => {
              setIsAdding(false);
              setIsEditing(null);
            }}
            loading={loading}
            currentAdmin={{
              name: currentAdmin.name || "Administrador Geral",
              role: currentAdmin.role || "Super Administrador",
              email: currentAdmin.email || "admin@bookverse.com"
            }}
            onSave={async (updatedBookData) => {
              setLoading(true);
              try {
                if (isEditing) {
                  await adminUpdateBook(isEditing, updatedBookData);
                  triggerSuccess(`Livro "${updatedBookData.title}" atualizado com sucesso!`);
                } else {
                  await adminCreateBook(updatedBookData);
                  triggerSuccess(`Livro "${updatedBookData.title}" adicionado com sucesso como Rascunho!`);
                }
                setIsAdding(false);
                setIsEditing(null);
                resetForm();
                onRefreshBooks();
              } catch (err: any) {
                setError(err.message || "Erro ao salvar as modificações do livro.");
              } finally {
                setLoading(false);
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* DIALOG 2: SINGLE BOOK STATUS REASON PROMPT */}
      <AnimatePresence>
        {statusPromptBook && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 border border-[#ece9dc] w-full max-w-md shadow-2xl space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 text-[#8a7e58]">
                <Settings className="w-6 h-6" />
                <h3 className="font-serif font-bold text-lg text-gray-900">Motivo da Alteração</h3>
              </div>
              <p className="text-xs text-gray-500">
                Você está alterando o status do livro <strong className="text-gray-900">"{statusPromptBook.title}"</strong> para <strong className="text-[#8a7e58]">{targetStatus}</strong>.
              </p>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-400 block">Selecione ou digite o motivo:</label>
                <select
                  className="w-full bg-gray-50 border border-[#ece9dc] rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-[#8a7e58] text-gray-900"
                  onChange={(e) => setStatusReason(e.target.value)}
                >
                  <option value="">-- Selecione um motivo padrão --</option>
                  <option value="Aprovado no controle de qualidade">Aprovado no controle de qualidade</option>
                  <option value="Direitos Autorais expirados/notificados">Direitos Autorais expirados/notificados</option>
                  <option value="Arquivo corrompido / Conteúdo quebrado">Arquivo corrompido / Conteúdo quebrado</option>
                  <option value="Denúncia de conteúdo abusivo">Denúncia de conteúdo abusivo</option>
                  <option value="Em revisão técnica de formatação">Em revisão técnica de formatação</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-400 block">Outro / Descrição detalhada:</label>
                <textarea
                  rows={3}
                  className="w-full bg-gray-50 border border-[#ece9dc] rounded-xl p-2.5 text-xs outline-none focus:ring-1 focus:ring-[#8a7e58] text-gray-900"
                  placeholder="Escreva o motivo detalhadamente aqui..."
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setStatusPromptBook(null);
                    setStatusReason("");
                  }}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUpdateStatusConfirm}
                  disabled={loading}
                  className="bg-[#8a7e58] hover:bg-[#4a432d] text-white px-5 py-2 rounded-xl text-xs font-bold disabled:opacity-50 cursor-pointer"
                >
                  Salvar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DIALOG 3: BATCH ACTION CONFIRMATION PROMPT */}
      <AnimatePresence>
        {showBatchConfirm && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 border border-[#ece9dc] w-full max-w-md shadow-2xl space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 text-amber-500">
                <Layers className="w-6 h-6" />
                <h3 className="font-serif font-bold text-lg text-gray-900">Confirmar Operação em Lote</h3>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Você escolheu aplicar a ação <strong className="text-[#8a7e58] uppercase font-mono">{batchAction}</strong> em <strong className="text-gray-900">{selectedBookIds.length} livros</strong> de forma simultânea. 
              </p>
              <p className="text-[11px] text-gray-400 bg-[#f6f5ee] p-3 rounded-xl border border-[#ece9dc] leading-relaxed">
                Esta ação será auditada e vinculada ao seu nome administrativo. Todos os livros correspondentes terão seu histórico de alteração persistido.
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBatchConfirm(false)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleExecuteBatchAction}
                  disabled={loading}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2 rounded-xl text-xs font-bold disabled:opacity-50 cursor-pointer"
                >
                  Sim, Executar Lote
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DIALOG 4: DETAILED BOOK STATS & HISTORY MODAL */}
      <AnimatePresence>
        {selectedBookDetails && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl border border-[#ece9dc] w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-[#ece9dc] flex justify-between items-start bg-[#f6f5ee]/40">
                <div className="flex gap-4">
                  <img
                    src={selectedBookDetails.coverUrl}
                    alt={selectedBookDetails.title}
                    className="w-12 h-16 object-cover rounded-md shadow-xs border"
                  />
                  <div>
                    <h3 className="font-serif font-bold text-lg text-gray-900 leading-tight">{selectedBookDetails.title}</h3>
                    <p className="text-xs text-gray-400 mt-1">{selectedBookDetails.author} • {selectedBookDetails.category}</p>
                    <span className="inline-block bg-[#8a7e58]/10 text-[#8a7e58] border border-[#8a7e58]/20 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider font-mono mt-1.5">
                      Status: {selectedBookDetails.status || "Active"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedBookDetails(null)}
                  className="text-gray-400 hover:text-gray-700 font-bold p-1 hover:bg-gray-100 rounded"
                >
                  ✕
                </button>
              </div>

              {/* Sub tabs selector */}
              <div className="flex border-b border-[#ece9dc] px-6">
                <button
                  onClick={() => setDetailsSubTab('stats')}
                  className={`flex items-center gap-1.5 py-3 px-4 text-xs font-bold border-b-2 transition cursor-pointer ${
                    detailsSubTab === 'stats' ? "border-[#8a7e58] text-[#8a7e58]" : "border-transparent text-gray-400 hover:text-gray-700"
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  Estatísticas Reais
                </button>
                <button
                  onClick={() => setDetailsSubTab('history')}
                  className={`flex items-center gap-1.5 py-3 px-4 text-xs font-bold border-b-2 transition cursor-pointer ${
                    detailsSubTab === 'history' ? "border-[#8a7e58] text-[#8a7e58]" : "border-transparent text-gray-400 hover:text-gray-700"
                  }`}
                >
                  <History className="w-4 h-4" />
                  Histórico de Alterações ({selectedBookDetails.history?.length || 0})
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-grow">
                {detailsSubTab === 'stats' ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 border border-[#ece9dc] p-4 rounded-2xl">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Leituras Registradas</span>
                      <span className="text-xl font-bold font-serif text-[#2d291c] mt-1 block">
                        {selectedBookDetails.readsCount || 10} acessos
                      </span>
                    </div>

                    <div className="bg-gray-50 border border-[#ece9dc] p-4 rounded-2xl">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Favoritado por</span>
                      <span className="text-xl font-bold font-serif text-[#2d291c] mt-1 block">
                        {selectedBookDetails.favoritesCount || 4} leitores
                      </span>
                    </div>

                    <div className="bg-gray-50 border border-[#ece9dc] p-4 rounded-2xl">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Avaliação Média</span>
                      <span className="text-xl font-bold font-serif text-amber-600 mt-1 block flex items-center gap-1">
                        ★ {selectedBookDetails.avgRating ? selectedBookDetails.avgRating.toFixed(1) : "5.0"}
                        <span className="text-[11px] text-gray-400 font-normal">({selectedBookDetails.ratingsCount || 2} notas)</span>
                      </span>
                    </div>

                    <div className="bg-gray-50 border border-[#ece9dc] p-4 rounded-2xl">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Ouvintes Audiobook</span>
                      <span className="text-xl font-bold font-serif text-[#2d291c] mt-1 block flex items-center gap-1">
                        <Headphones className="w-4 h-4 text-[#8a7e58]" />
                        {selectedBookDetails.listenersCount || 0}
                      </span>
                    </div>

                    <div className="bg-gray-50 border border-[#ece9dc] p-4 rounded-2xl col-span-2">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Última Leitura Ativa</span>
                      <span className="text-xs font-semibold text-gray-700 mt-1 block font-mono">
                        {selectedBookDetails.lastReadAt ? new Date(selectedBookDetails.lastReadAt).toLocaleString("pt-BR") : "Ainda sem registros recentes de leitura."}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {!selectedBookDetails.history || selectedBookDetails.history.length === 0 ? (
                      <div className="text-center text-gray-400 py-8 text-xs italic">Nenhuma alteração registrada no histórico do livro.</div>
                    ) : (
                      <div className="relative pl-6 border-l-2 border-[#ece9dc] space-y-6">
                        {selectedBookDetails.history.map((hist) => (
                          <div key={hist.id} className="relative">
                            <span className="absolute -left-[31px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#8a7e58] border-2 border-white ring-4 ring-[#ece9dc]" />
                            <div className="bg-gray-50 border border-[#ece9dc] p-3.5 rounded-2xl space-y-1.5 text-xs">
                              <div className="flex justify-between items-center text-[10px] text-gray-400">
                                <span className="font-bold text-gray-700">{hist.adminName}</span>
                                <span className="font-mono">{new Date(hist.timestamp).toLocaleString("pt-BR")}</span>
                              </div>
                              <span className="font-serif font-bold text-[#2d291c] block text-xs">{hist.action}</span>
                              <p className="text-gray-500 font-normal leading-relaxed">
                                <strong>Motivo/Descrição:</strong> {hist.reason}
                              </p>
                              {hist.changes && hist.changes.length > 0 && (
                                <div className="text-[10px] text-gray-400 pt-1.5 border-t border-dashed border-gray-200 space-y-0.5">
                                  {hist.changes.map((c, i) => (
                                    <span key={i} className="block font-mono">
                                      {c.field}: <strong className="text-red-500">{String(c.old)}</strong> → <strong className="text-emerald-600">{String(c.new)}</strong>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DIALOG 5: DETAILED USER ACTIVITY MODAL */}
      <AnimatePresence>
        {selectedUserDetails && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 border border-[#ece9dc] w-full max-w-lg shadow-2xl space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#8a7e58]/10 text-[#8a7e58] flex items-center justify-center font-bold text-base font-serif">
                    {selectedUserDetails.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-lg text-gray-900 leading-tight">{selectedUserDetails.name}</h3>
                    <span className="text-xs text-gray-400 block mt-0.5">{selectedUserDetails.email}</span>
                  </div>
                </div>
                <button onClick={() => setSelectedUserDetails(null)} className="text-gray-400 hover:text-gray-700 font-bold p-1">✕</button>
              </div>

              <div className="bg-gray-50 border border-[#ece9dc] rounded-2xl p-4 grid grid-cols-2 gap-4 text-xs font-sans">
                <div>
                  <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">ID do Usuário</span>
                  <span className="font-mono text-gray-600 block mt-0.5 truncate">{selectedUserDetails.id}</span>
                </div>

                <div>
                  <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">Cargo / Permissão</span>
                  <span className="font-bold text-[#8a7e58] block mt-0.5">{selectedUserDetails.role || "Leitor"}</span>
                </div>

                <div>
                  <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">Status do Usuário</span>
                  <span className={`font-bold block mt-0.5 ${selectedUserDetails.status === "Blocked" ? "text-red-500" : "text-emerald-600"}`}>
                    {selectedUserDetails.status === "Blocked" ? "Bloqueado" : "Ativo"}
                  </span>
                </div>

                <div>
                  <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">Total de Denúncias Feitas</span>
                  <span className="font-bold text-gray-800 block mt-0.5">{selectedUserDetails.reportsMadeCount || 0} denúncias</span>
                </div>
              </div>

              {/* Favorites list */}
              <div className="space-y-1.5 text-xs font-sans">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Lista de Favoritos:</span>
                {!selectedUserDetails.favorites || selectedUserDetails.favorites.length === 0 ? (
                  <span className="text-gray-400 italic">Nenhum livro favoritado ainda.</span>
                ) : (
                  <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto pt-1">
                    {selectedUserDetails.favorites.map((favId, fIdx) => {
                      const bookName = books.find(b => b.id === favId)?.title || `Livro ID: ${favId}`;
                      return (
                        <span key={`${favId}-${fIdx}`} className="bg-[#f6f5ee] border border-[#dad5bf] text-[#2d291c] px-2 py-0.5 rounded-lg font-bold text-[10px]">
                          {bookName}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Activities timeline */}
              <div className="space-y-2">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Registro de Atividades:</span>
                {!selectedUserDetails.activities || selectedUserDetails.activities.length === 0 ? (
                  <div className="text-center text-gray-400 text-[11px] py-4 italic border border-dashed border-[#ece9dc] rounded-2xl">
                    Nenhuma atividade administrativa registrada.
                  </div>
                ) : (
                  <div className="border border-[#ece9dc] rounded-2xl p-3 max-h-[140px] overflow-y-auto space-y-2.5 font-sans text-xs bg-gray-50/50">
                    {selectedUserDetails.activities.map((act, index) => (
                      <div key={index} className="flex justify-between items-start gap-3">
                        <span className="text-gray-600 leading-normal">{act.action}</span>
                        <span className="font-mono text-[9px] text-gray-400 whitespace-nowrap pt-0.5">{new Date(act.timestamp).toLocaleDateString("pt-BR")}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DIALOG 6: AI SINGLE BOOK ANALYSIS & OPTIMIZER */}
      <AnimatePresence>
        {selectedBookForAi && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl border border-[#ece9dc] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#f6f5ee]/40">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
                  <div>
                    <h2 className="text-lg font-serif font-bold text-gray-900">
                      Otimização por Inteligência Artificial
                    </h2>
                    <p className="text-[11px] text-gray-400 mt-0.5">Sugestões de metadados geradas pela IA administrativa do BookVerse</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedBookForAi(null);
                    setAiAnalysisResult(null);
                  }}
                  className="p-1.5 hover:bg-gray-200 rounded-lg transition text-gray-400 hover:text-gray-700 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6">
                {/* Book Card Current Details */}
                <div className="flex gap-4 p-4 bg-gray-50 border border-[#ece9dc] rounded-2xl">
                  <div className="w-16 h-24 bg-gray-100 rounded-xl overflow-hidden border border-gray-200 flex-shrink-0 shadow-xs">
                    {selectedBookForAi.coverUrl ? (
                      <img src={selectedBookForAi.coverUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400 font-bold">Sem Capa</div>
                    )}
                  </div>
                  <div className="space-y-1 min-w-0">
                    <span className="text-[9px] bg-[#8a7e58]/10 text-[#8a7e58] border border-[#8a7e58]/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider inline-block">Livro Selecionado</span>
                    <h3 className="font-serif font-bold text-base text-gray-900 truncate" title={selectedBookForAi.title}>{selectedBookForAi.title}</h3>
                    <p className="text-xs text-gray-500">{selectedBookForAi.author} • {selectedBookForAi.category || "Sem Categoria"}</p>
                    <p className="text-[11px] text-gray-400 font-sans line-clamp-2 italic">"{selectedBookForAi.description || "Sem descrição disponível."}"</p>
                  </div>
                </div>

                {isAnalyzingSingleBook && (
                  <div className="text-center py-16 space-y-3">
                    <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
                    <span className="text-xs font-bold text-gray-700 block">Consultando IA Co-Piloto...</span>
                    <p className="text-[11px] text-gray-400 max-w-xs mx-auto">Analisando o conteúdo, vocabulário e estilo literário para sugerir as melhores otimizações bibliográficas.</p>
                  </div>
                )}

                {!isAnalyzingSingleBook && !aiAnalysisResult && (
                  <div className="text-center py-12 border border-dashed border-[#ece9dc] rounded-2xl bg-gray-50/20">
                    <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                    <span className="text-xs font-bold text-gray-700 block">Nenhuma sugestão carregada</span>
                    <p className="text-[11px] text-gray-400 mt-1 mb-4">Clique no botão abaixo para gerar uma análise completa de metadados para esta obra.</p>
                    <button
                      onClick={() => handleAnalyzeSingleBook(selectedBookForAi, true)}
                      className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Gerar Análise de IA
                    </button>
                  </div>
                )}

                {aiAnalysisResult && (
                  <div className="space-y-6">
                    {/* Insights Block */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Prediction */}
                      <div className="p-4 bg-amber-50/30 border border-amber-200/50 rounded-2xl space-y-1.5">
                        <span className="text-[9px] text-amber-800 font-bold uppercase tracking-wider block">Previsão de Engajamento</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-serif font-bold text-amber-700">{aiAnalysisResult.prediction?.sentimentScore || 85}%</span>
                          <span className="text-[11px] text-gray-500">potencial de aceitação</span>
                        </div>
                        <p className="text-[11px] text-gray-500 leading-relaxed">
                          Público-alvo sugerido: <strong className="text-gray-700">{aiAnalysisResult.prediction?.estimatedTargetAudience || "Leitores de Ficção Literária"}</strong>.
                        </p>
                      </div>

                      {/* Summary Insights */}
                      <div className="p-4 bg-gray-50 border border-[#ece9dc] rounded-2xl space-y-1.5">
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">Análise de Estilo Literário</span>
                        <p className="text-[11px] text-gray-600 italic leading-relaxed">
                          "{aiAnalysisResult.prediction?.styleInsights || "Estilo fluido, com tom reflexivo e riqueza no desenvolvimento de personagens."}"
                        </p>
                      </div>
                    </div>

                    {/* Meta Fields Comparison */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-serif font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-1.5">Metadados Sugeridos para Otimização</h4>

                      {/* Field: Category */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start border-b border-gray-50 pb-3">
                        <div className="md:col-span-3 flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={aiApplyingFields.includes("category")}
                            onChange={(e) => {
                              if (e.target.checked) setAiApplyingFields(prev => [...prev, "category"]);
                              else setAiApplyingFields(prev => prev.filter(f => f !== "category"));
                            }}
                            className="rounded text-amber-500 focus:ring-amber-500 h-3.5 w-3.5 cursor-pointer"
                            id="apply-field-category"
                          />
                          <label htmlFor="apply-field-category" className="text-xs font-bold text-gray-700 cursor-pointer">Categoria</label>
                        </div>
                        <div className="md:col-span-4 bg-gray-100 px-3 py-1.5 rounded-lg text-xs text-gray-400 line-clamp-1">
                          Atual: {selectedBookForAi.category || "Sem Categoria"}
                        </div>
                        <div className="md:col-span-5 bg-amber-50 border border-amber-200/60 px-3 py-1.5 rounded-lg text-xs text-amber-900 font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" /> Sugerido: {aiAnalysisResult.suggestedCategory || "Ficção / Clássicos"}
                        </div>
                      </div>

                      {/* Field: Tags */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start border-b border-gray-50 pb-3">
                        <div className="md:col-span-3 flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={aiApplyingFields.includes("tags")}
                            onChange={(e) => {
                              if (e.target.checked) setAiApplyingFields(prev => [...prev, "tags"]);
                              else setAiApplyingFields(prev => prev.filter(f => f !== "tags"));
                            }}
                            className="rounded text-amber-500 focus:ring-amber-500 h-3.5 w-3.5 cursor-pointer"
                            id="apply-field-tags"
                          />
                          <label htmlFor="apply-field-tags" className="text-xs font-bold text-gray-700 cursor-pointer">Tags</label>
                        </div>
                        <div className="md:col-span-4 bg-gray-100 px-3 py-1.5 rounded-lg text-xs text-gray-400 flex flex-wrap gap-1 max-h-[36px] overflow-y-auto">
                          Atual: {selectedBookForAi.tags && selectedBookForAi.tags.length > 0 ? selectedBookForAi.tags.join(", ") : "Nenhuma"}
                        </div>
                        <div className="md:col-span-5 bg-amber-50 border border-amber-200/60 px-3 py-1.5 rounded-lg text-xs text-amber-900 font-bold flex flex-wrap gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 self-center flex-shrink-0" />
                          Sugestão: {aiAnalysisResult.suggestedTags && aiAnalysisResult.suggestedTags.length > 0 ? aiAnalysisResult.suggestedTags.map((t: string) => (
                            <span key={t} className="bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded text-[9px] font-mono">{t}</span>
                          )) : "Ficção, Literatura"}
                        </div>
                      </div>

                      {/* Field: Description */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                        <div className="md:col-span-3 flex items-center gap-2 pt-1">
                          <input
                            type="checkbox"
                            checked={aiApplyingFields.includes("metadata")} // map metadata -> description
                            onChange={(e) => {
                              if (e.target.checked) setAiApplyingFields(prev => [...prev, "metadata"]);
                              else setAiApplyingFields(prev => prev.filter(f => f !== "metadata"));
                            }}
                            className="rounded text-amber-500 focus:ring-amber-500 h-3.5 w-3.5 cursor-pointer"
                            id="apply-field-metadata"
                          />
                          <label htmlFor="apply-field-metadata" className="text-xs font-bold text-gray-700 cursor-pointer">Descrição Otimizada</label>
                        </div>
                        <div className="md:col-span-9 space-y-2">
                          <div className="bg-amber-50 border border-amber-200/60 p-3 rounded-xl text-xs text-amber-900 font-sans leading-relaxed">
                            <strong className="text-[10px] text-amber-800 block uppercase tracking-wider mb-1 font-serif">Otimização Gerada:</strong>
                            {typeof aiAnalysisResult.suggestedMetadata === "object"
                              ? (aiAnalysisResult.suggestedMetadata?.description || aiAnalysisResult.suggestedMetadata?.shortSummary)
                              : (aiAnalysisResult.suggestedMetadata || "Um clássico literário inesquecível, enriquecido por descrições profundas e complexidade psicológica que capta a essência da condição humana.")}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="pt-4 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                      <button
                        onClick={() => handleAnalyzeSingleBook(selectedBookForAi, true)}
                        disabled={isApplyingSuggestions}
                        className="text-xs text-amber-600 hover:text-amber-800 font-bold underline bg-transparent border-none cursor-pointer flex items-center gap-1"
                      >
                        <RefreshCcw className="w-3 h-3" /> Recalcular Sugestões (Bypass Cache)
                      </button>

                      <div className="flex gap-2 w-full md:w-auto">
                        <button
                          onClick={() => {
                            setSelectedBookForAi(null);
                            setAiAnalysisResult(null);
                          }}
                          className="flex-1 md:flex-none border border-gray-200 hover:bg-gray-50 text-gray-700 px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
                        >
                          Descartar
                        </button>
                        <button
                          onClick={handleApplyAiSuggestions}
                          disabled={isApplyingSuggestions || aiApplyingFields.length === 0}
                          className="flex-1 md:flex-none bg-amber-500 hover:bg-amber-600 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          {isApplyingSuggestions ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Aplicando...
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" /> Aplicar {aiApplyingFields.length} Sugestões
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* TAB 8: REGRAS & CONVERSÃO */}
        {activeTab === 'rules' && (
          <div className="space-y-10 text-left animate-fadeIn" id="tab-rules-and-conversion">
            {/* Top Banner */}
            <div className="bg-gradient-to-br from-zinc-50 to-zinc-100 border border-zinc-200 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-zinc-600" />
                  <span className="text-[10px] text-zinc-800 bg-zinc-200 px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider">Diretivas de Engenharia</span>
                </div>
                <h2 className="text-2xl font-serif font-bold text-gray-900">Regras de Armazenamento & Conversão</h2>
                <p className="text-xs text-gray-500 max-w-2xl">
                  Configure as regras de armazenamento do Firestore, padrões de formatação em Markdown e simule a quebra de página automática do motor de leitura do BookVerse.
                </p>
              </div>
            </div>

            {/* Grid 1: Documentation and Rules Editor */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left col: selector and markdown edit */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-white border border-[#ece9dc] rounded-3xl p-6 space-y-4 shadow-sm">
                  <h3 className="text-sm font-serif font-bold text-[#2d291c] border-b border-[#ece9dc] pb-3">Documentação de Diretivas</h3>
                  
                  {/* Navigation Buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => {
                        setSelectedRulesDoc('firestore');
                        setIsEditingRules(false);
                      }}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer text-center ${
                        selectedRulesDoc === 'firestore'
                          ? "bg-zinc-900 text-white"
                          : "bg-gray-50 hover:bg-gray-100 text-gray-600"
                      }`}
                    >
                      Firestore DB
                    </button>
                    <button
                      onClick={() => {
                        setSelectedRulesDoc('markdown');
                        setIsEditingRules(false);
                      }}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer text-center ${
                        selectedRulesDoc === 'markdown'
                          ? "bg-zinc-900 text-white"
                          : "bg-gray-50 hover:bg-gray-100 text-gray-600"
                      }`}
                    >
                      Markdown
                    </button>
                    <button
                      onClick={() => {
                        setSelectedRulesDoc('conversion');
                        setIsEditingRules(false);
                      }}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer text-center ${
                        selectedRulesDoc === 'conversion'
                          ? "bg-zinc-900 text-white"
                          : "bg-gray-50 hover:bg-gray-100 text-gray-600"
                      }`}
                    >
                      Conversão
                    </button>
                  </div>

                  {/* Editor / Viewer Container */}
                  <div className="space-y-4">
                    {isEditingRules ? (
                      <div className="space-y-3">
                        <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Editor de Diretiva</label>
                        <textarea
                          value={rulesEditContent}
                          onChange={(e) => setRulesEditContent(e.target.value)}
                          className="w-full h-80 p-4 border border-zinc-300 rounded-2xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-zinc-500 bg-white text-zinc-950 placeholder-zinc-400"
                          placeholder="Escreva as diretivas em Markdown..."
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setRulesDocs(prev => ({ ...prev, [selectedRulesDoc]: rulesEditContent }));
                              setIsEditingRules(false);
                              setSuccessMsg("Diretiva atualizada com sucesso no ambiente administrativo.");
                              setTimeout(() => setSuccessMsg(""), 4000);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" /> Salvar Alterações
                          </button>
                          <button
                            onClick={() => setIsEditingRules(false)}
                            className="border border-gray-200 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Visualizando Guia</span>
                          <button
                            onClick={() => {
                              setRulesEditContent(rulesDocs[selectedRulesDoc]);
                              setIsEditingRules(true);
                            }}
                            className="text-xs text-zinc-600 hover:text-zinc-900 font-bold flex items-center gap-1 bg-zinc-50 hover:bg-zinc-100 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Escrever / Alterar
                          </button>
                        </div>
                        
                        <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100 max-h-80 overflow-y-auto text-xs prose prose-sm prose-zinc text-zinc-700 font-serif">
                          <ReactMarkdown>{rulesDocs[selectedRulesDoc]}</ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right col: Explanation of conversion rules */}
              <div className="lg:col-span-7">
                <div className="bg-[#FAF9F5] border border-[#ece9dc] rounded-3xl p-6 h-full flex flex-col justify-between space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 bg-amber-50 text-amber-700 rounded-lg"><Info className="w-4 h-4" /></span>
                      <h4 className="text-sm font-serif font-bold text-[#2d291c]">O Fluxo de Armazenamento do Livro</h4>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      No BookVerse, um livro não é apenas um grande bloco de texto único. Para assegurar uma paginação limpa e excelente desempenho móvel, o livro é fatiado em <strong>páginas otimizadas</strong>. 
                      Este fatiamento respeita marcações manuais de quebra de página (<code className="bg-amber-100/50 px-1 py-0.2 rounded font-mono">---</code>) ou calcula limites de caracteres de forma a evitar interrupção de palavras.
                    </p>
                    <div className="bg-white border border-[#ece9dc] p-4 rounded-2xl space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#2d291c]">
                        <span className="w-2 h-2 bg-[#8a7e58] rounded-full"></span>
                        <span>Conversão de EPUB / Textos:</span>
                      </div>
                      <p className="text-[11px] text-gray-500 leading-relaxed pl-4">
                        Adicione tags <code className="bg-gray-100 px-1 py-0.2 rounded font-mono"># Capítulo X</code> para gerar sumários. O sistema paginará o livro de acordo com as especificações do leitor de forma transparente.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-zinc-900 text-zinc-300 rounded-2xl text-[11px] font-mono space-y-1">
                    <span className="text-zinc-400 block font-sans font-bold uppercase text-[9px] mb-1">Simulação do Modelo de Dados (JSON / Firestore)</span>
                    <div>{"{"}</div>
                    <div className="pl-4">"id": "livro-modelo",</div>
                    <div className="pl-4">"title": "Exemplo de Título",</div>
                    <div className="pl-4">"pages": [</div>
                    <div className="pl-8">"&lt;h1&gt;Capítulo I&lt;/h1&gt;&lt;p&gt;Conteúdo da página 1...&lt;/p&gt;",</div>
                    <div className="pl-8">"&lt;p&gt;Continuação e conteúdo da página 2...&lt;/p&gt;"</div>
                    <div className="pl-4">],</div>
                    <div className="pl-4">"pagesCount": 2</div>
                    <div>{"}"}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: INTERACTIVE BOOK CONVERTER & PAGINATOR */}
            <div className="bg-white border border-[#ece9dc] rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
              <div className="border-b border-[#ece9dc] pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-base font-serif font-bold text-[#2d291c] flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#8a7e58]" />
                    Conversor & Editor de Livro Interativo (Fatiador por Páginas)
                  </h3>
                  <p className="text-xs text-gray-500">
                    Escreva ou cole seu manuscrito em Markdown abaixo. Configure as regras de quebra e veja o texto se paginar instantaneamente no simulador ao lado.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* Left Column: Input and configuration */}
                <div className="xl:col-span-6 space-y-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1">Título do Livro para Simulação</label>
                      <input
                        type="text"
                        value={rawBookTitle}
                        onChange={(e) => setRawBookTitle(e.target.value)}
                        className="w-full px-4 py-2.5 border border-zinc-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-zinc-500 bg-white text-zinc-950 placeholder-zinc-400"
                        placeholder="Ex: Dom Casmurro"
                      />
                    </div>

                    {/* Config card */}
                    <div className="bg-gray-100/50 border border-zinc-200 p-4 rounded-2xl grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1.5">Limite de Caracteres por Página</label>
                        <select
                          value={pageSizeLimit}
                          onChange={(e) => setPageSizeLimit(Number(e.target.value))}
                          className="w-full px-3 py-2 border border-zinc-300 rounded-xl bg-white text-xs focus:outline-none cursor-pointer text-zinc-950 focus:ring-2 focus:ring-zinc-500"
                        >
                          <option value="300" className="text-zinc-950">300 (Páginas Curtas / Telas Pequenas)</option>
                          <option value="600" className="text-zinc-950">600 (Recomendado - Celular)</option>
                          <option value="1200" className="text-zinc-950">1200 (Recomendado - Desktop/Tablet)</option>
                          <option value="2000" className="text-zinc-950">2000 (Páginas Longas)</option>
                        </select>
                      </div>

                      <div className="flex flex-col justify-center">
                        <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-2">Quebra no Título do Capítulo (#)</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="autoSplitChapters"
                            checked={autoSplitChapters}
                            onChange={(e) => setAutoSplitChapters(e.target.checked)}
                            className="rounded text-[#8a7e58] focus:ring-[#8a7e58] cursor-pointer"
                          />
                          <label htmlFor="autoSplitChapters" className="text-xs text-gray-700 font-bold cursor-pointer">
                            Auto-quebrar em #
                          </label>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-gray-700 block">Manuscrito Original em Markdown (Permite Alterar)</label>
                        <span className="text-[10px] text-gray-500 font-mono">{rawBookContent.length} caracteres</span>
                      </div>
                      <textarea
                        value={rawBookContent}
                        onChange={(e) => setRawBookContent(e.target.value)}
                        className="w-full h-80 p-4 border border-zinc-300 rounded-2xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-zinc-500 bg-white text-zinc-950 placeholder-zinc-400"
                        placeholder="Digite ou cole aqui o texto com marcações # de capitulo e --- de quebra de pagina..."
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column: Generated Pages & Live Simulator Preview */}
                <div className="xl:col-span-6 space-y-6">
                  <div className="bg-[#FAF9F5] border border-[#ece9dc] rounded-3xl p-6 space-y-5">
                    <div className="flex items-center justify-between border-b border-[#ece9dc] pb-3">
                      <div>
                        <span className="text-[10px] text-[#8a7e58] font-bold uppercase tracking-wider block">Fatiamento Concluído</span>
                        <span className="text-sm font-serif font-bold text-[#2d291c]">{generatedPages.length} Páginas Geradas</span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            setPreviewTheme('light');
                          }}
                          className={`w-6 h-6 rounded-full border text-[10px] font-bold cursor-pointer transition flex items-center justify-center ${
                            previewTheme === 'light' ? 'bg-white border-[#8a7e58] text-[#8a7e58]' : 'bg-white border-gray-200 text-gray-400'
                          }`}
                          title="Modo Claro"
                        >
                          A
                        </button>
                        <button
                          onClick={() => {
                            setPreviewTheme('sepia');
                          }}
                          className={`w-6 h-6 rounded-full border text-[10px] font-bold cursor-pointer transition flex items-center justify-center ${
                            previewTheme === 'sepia' ? 'bg-[#f4ecd8] border-[#8a7e58] text-[#5c4033]' : 'bg-[#f4ecd8] border-gray-200 text-gray-400'
                          }`}
                          title="Modo Sepia"
                        >
                          S
                        </button>
                        <button
                          onClick={() => {
                            setPreviewTheme('dark');
                          }}
                          className={`w-6 h-6 rounded-full border text-[10px] font-bold cursor-pointer transition flex items-center justify-center ${
                            previewTheme === 'dark' ? 'bg-zinc-900 border-[#8a7e58] text-white' : 'bg-zinc-900 border-gray-200 text-gray-400'
                          }`}
                          title="Modo Escuro"
                        >
                          N
                        </button>
                      </div>
                    </div>

                    {/* Dynamic pagination index tabs */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
                      {generatedPages.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedPreviewPage(idx)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                            selectedPreviewPage === idx
                              ? "bg-[#8a7e58] text-white shadow-xs"
                              : "bg-white border border-[#ece9dc] hover:bg-gray-50 text-gray-600"
                          }`}
                        >
                          Pág. {idx + 1}
                        </button>
                      ))}
                    </div>

                    {/* Live Page Content Editor */}
                    <div className="space-y-3 bg-white p-4 border border-[#ece9dc] rounded-2xl">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                          Editar Conteúdo da Página {selectedPreviewPage + 1} Diretamente
                        </label>
                        <span className="text-[10px] text-emerald-600 font-bold">Edição Direta e Intuitiva</span>
                      </div>
                      <textarea
                        value={generatedPages[selectedPreviewPage] || ""}
                        onChange={(e) => {
                          const updated = [...generatedPages];
                          updated[selectedPreviewPage] = e.target.value;
                          setGeneratedPages(updated);
                          
                          // Re-assemble raw content if edited page by page to keep it updated!
                          const assembled = updated.join("\n---\n");
                          setRawBookContent(assembled);
                        }}
                        className="w-full h-28 p-3 border border-[#ece9dc] rounded-xl text-xs font-mono focus:outline-none focus:ring-1 focus:ring-zinc-400 bg-zinc-50/30 text-zinc-800"
                        placeholder="Adicione ou remova text para esta página..."
                      />
                    </div>

                    {/* Simulated elegant reader frame */}
                    <div className="space-y-2">
                      <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Pré-visualização do Leitor do BookVerse</span>
                      
                      <div 
                        className={`border border-[#ece9dc] rounded-2xl shadow-md min-h-64 p-6 relative overflow-hidden transition-colors duration-200 flex flex-col justify-between ${
                          previewTheme === 'light' ? 'bg-white text-zinc-800' :
                          previewTheme === 'sepia' ? 'bg-[#fbf6ec] text-[#2d2319]' :
                          'bg-zinc-900 text-zinc-100'
                        }`}
                      >
                        {/* Book Title Header */}
                        <div className="text-[10px] border-b border-gray-200/40 pb-1.5 flex justify-between items-center tracking-wide font-sans font-bold text-gray-400 uppercase">
                          <span>{rawBookTitle}</span>
                          <span>Capítulo {selectedPreviewPage + 1}</span>
                        </div>

                        {/* Render Markdown on the Page */}
                        <div 
                          className={`py-4 flex-1 text-left prose prose-sm leading-relaxed max-w-none ${
                            previewFontFamily === 'serif' ? 'font-serif' : 'font-sans'
                          }`}
                          style={{ fontSize: `${previewFontSize}px` }}
                        >
                          {generatedPages[selectedPreviewPage] ? (
                            <ReactMarkdown>{generatedPages[selectedPreviewPage]}</ReactMarkdown>
                          ) : (
                            <p className="text-gray-400 italic">Sem conteúdo nesta página.</p>
                          )}
                        </div>

                        {/* Footer Paging and Controls */}
                        <div className="border-t border-gray-200/40 pt-2 flex items-center justify-between">
                          <button
                            disabled={selectedPreviewPage === 0}
                            onClick={() => setSelectedPreviewPage(prev => Math.max(0, prev - 1))}
                            className="p-1 rounded-lg hover:bg-black/5 disabled:opacity-30 cursor-pointer"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          
                          <span className="text-[10px] font-sans font-bold text-gray-400">
                            Página {selectedPreviewPage + 1} de {generatedPages.length}
                          </span>

                          <button
                            disabled={selectedPreviewPage === generatedPages.length - 1}
                            onClick={() => setSelectedPreviewPage(prev => Math.min(generatedPages.length - 1, prev + 1))}
                            className="p-1 rounded-lg hover:bg-black/5 disabled:opacity-30 cursor-pointer"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Formatting adjust bar */}
                      <div className="flex items-center justify-between text-[11px] text-gray-500 bg-white p-3 border border-[#ece9dc] rounded-2xl">
                        <div className="flex items-center gap-3">
                          <span>Fonte:</span>
                          <button
                            onClick={() => setPreviewFontFamily('serif')}
                            className={`px-2 py-0.5 rounded ${previewFontFamily === 'serif' ? 'bg-zinc-200 font-bold' : ''}`}
                          >
                            Serif
                          </button>
                          <button
                            onClick={() => setPreviewFontFamily('sans')}
                            className={`px-2 py-0.5 rounded ${previewFontFamily === 'sans' ? 'bg-zinc-200 font-bold' : ''}`}
                          >
                            Sans
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <span>Tamanho:</span>
                          <button
                            onClick={() => setPreviewFontSize(prev => Math.max(12, prev - 1))}
                            className="w-5 h-5 bg-zinc-100 hover:bg-zinc-200 rounded font-bold cursor-pointer"
                          >
                            -
                          </button>
                          <span>{previewFontSize}px</span>
                          <button
                            onClick={() => setPreviewFontSize(prev => Math.min(20, prev + 1))}
                            className="w-5 h-5 bg-zinc-100 hover:bg-zinc-200 rounded font-bold cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 9: CHAMADOS DE SUPORTE */}
        {activeTab === 'support' && (
          <div className="space-y-6 text-left animate-fadeIn" id="tab-support-tickets">
            <div className="bg-gradient-to-br from-zinc-50 to-zinc-100 border border-zinc-200 rounded-3xl p-6 md:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-zinc-600" />
                  <span className="text-[10px] text-zinc-800 bg-zinc-200 px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider">Suporte Técnico</span>
                </div>
                <h2 className="text-2xl font-serif font-bold text-gray-900">Gerenciamento de Suporte</h2>
                <p className="text-xs text-gray-500 max-w-2xl">
                  Acompanhe e responda dúvidas, sugestões e solicitações enviadas diretamente pelos leitores da plataforma.
                </p>
              </div>
            </div>

            {/* Support Statistics cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white border border-[#ece9dc] p-5 rounded-2xl shadow-xs">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Total de Chamados</span>
                <span className="text-2xl font-serif font-bold text-gray-900 mt-1 block">{supportTickets.length}</span>
              </div>
              <div className="bg-white border border-[#ece9dc] p-5 rounded-2xl shadow-xs">
                <span className="text-[10px] text-amber-600 font-bold uppercase tracking-wider block">Em Aberto</span>
                <span className="text-2xl font-serif font-bold text-amber-600 mt-1 block">
                  {supportTickets.filter(t => t.status === "Aberto").length}
                </span>
              </div>
              <div className="bg-white border border-[#ece9dc] p-5 rounded-2xl shadow-xs">
                <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider block">Resolvidos</span>
                <span className="text-2xl font-serif font-bold text-emerald-600 mt-1 block">
                  {supportTickets.filter(t => t.status === "Resolvido").length}
                </span>
              </div>
            </div>

            {/* Tickets table or card deck */}
            <div className="bg-white border border-[#ece9dc] rounded-3xl overflow-hidden shadow-sm">
              <div className="p-6 border-b border-[#ece9dc] flex justify-between items-center bg-gray-50/50">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Fila de Chamados Recentes</h3>
                <button
                  onClick={async () => {
                    const res = await fetch("/api/support/tickets");
                    const data = await res.json();
                    setSupportTickets(data);
                  }}
                  className="text-[11px] text-[#8a7e58] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  Atualizar Lista
                </button>
              </div>

              {supportTickets.length === 0 ? (
                <div className="p-12 text-center text-gray-400">
                  <HelpCircle className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-xs font-bold uppercase tracking-wider">Nenhum chamado de suporte encontrado</p>
                  <p className="text-[11px] text-gray-500 mt-1">Dúvidas enviadas por usuários serão exibidas nesta fila.</p>
                </div>
              ) : (
                <div className="divide-y divide-[#ece9dc]">
                  {supportTickets.map((ticket) => (
                    <div key={ticket.id} className="p-6 hover:bg-gray-50/40 transition flex flex-col md:flex-row items-start justify-between gap-4">
                      <div className="space-y-2 max-w-3xl">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            ticket.status === "Aberto" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                          }`}>
                            {ticket.status}
                          </span>
                          <span className="text-xs font-bold text-gray-750 font-serif">{ticket.subject}</span>
                          <span className="text-[10px] text-gray-400 font-mono">ID: {ticket.id}</span>
                        </div>

                        <p className="text-xs text-gray-650 bg-gray-50 p-3 rounded-xl border border-gray-100 leading-relaxed">
                          {ticket.message}
                        </p>

                        <div className="flex items-center gap-4 text-[10px] text-gray-400">
                          <div>
                            <span className="font-semibold text-gray-500">Remetente:</span> {ticket.name} ({ticket.email})
                          </div>
                          <div className="w-1 h-1 bg-gray-300 rounded-full" />
                          <div>
                            <span className="font-semibold text-gray-500">Data:</span> {new Date(ticket.createdAt).toLocaleString("pt-BR")}
                          </div>
                          {ticket.userId && (
                            <>
                              <div className="w-1 h-1 bg-gray-300 rounded-full" />
                              <div>
                                <span className="font-semibold text-gray-500">Usuário ID:</span> {ticket.userId}
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {ticket.status === "Aberto" && (
                        <button
                          onClick={() => handleResolveTicket(ticket.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3.5 rounded-xl text-xs transition cursor-pointer flex-shrink-0 flex items-center gap-1.5 active:scale-95 shadow-sm"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Marcar Resolvido
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Action Confirmation Modal */}
      <AnimatePresence>
        {confirmAction && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-sm w-full border border-[#dad5bf] p-6 shadow-2xl relative"
            >
              <div className="flex items-center gap-3 text-amber-600 mb-3">
                <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                <h3 className="font-serif font-bold text-base text-gray-900 leading-tight">
                  {confirmAction.title}
                </h3>
              </div>

              <p className="text-gray-600 text-xs leading-relaxed mb-6">
                {confirmAction.message}
              </p>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setConfirmAction(null)}
                  className="px-3.5 py-2 border border-[#ece9dc] text-gray-600 hover:bg-gray-50 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  {confirmAction.cancelText || "Cancelar"}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const action = confirmAction.onConfirm;
                    setConfirmAction(null);
                    await action();
                  }}
                  className="px-3.5 py-2 bg-zinc-800 hover:bg-[#1f1e1a] text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  {confirmAction.confirmText || "Confirmar"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
