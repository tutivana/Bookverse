import React, { useState, useEffect } from "react";
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

  // Navigation State
  const [activeTab, setActiveTab] = useState<'books' | 'users' | 'reports' | 'logs' | 'dashboard' | 'notifications' | 'ai'>('books');

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

  // Core Dialog States
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [importTab, setImportTab] = useState<'template' | 'direct'>('template');
  
  // Book Form State
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [category, setCategory] = useState("Clássico");
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
  const [batchCategory, setBatchCategory] = useState("Clássico");
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

  // General States
  const [isParsingBookFile, setIsParsingBookFile] = useState(false);
  const [parsingStatus, setParsingStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [tabLoading, setTabLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

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
          setDuplicatePairs(dups.duplicates || []);
        } catch (dupsErr) {
          console.error("Error loading duplicates:", dupsErr);
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
      setDuplicatePairs(res.duplicates || []);
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
    setCategory("Clássico");
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

    const confirmDel = window.confirm(`Deseja REALMENTE excluir permanentemente o livro "${bookTitle}"? Esta ação deletará todos os logs, comentários e progresso de usuários e não poderá ser desfeita.`);
    if (!confirmDel) return;

    try {
      await adminDeleteBook(id, currentAdmin.id);
      triggerSuccess(`Livro "${bookTitle}" removido permanentemente.`);
      onRefreshBooks();
    } catch (err: any) {
      alert(err.message || "Erro ao excluir livro.");
    }
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
    try {
      const updated = await adminUpdateUserStatus(user.id, nextStatus, currentAdmin.id);
      // Update local state
      setUsers(prev => prev.map(u => u.id === user.id ? updated : u));
      triggerSuccess(`Usuário ${user.name} está agora ${nextStatus === "Blocked" ? "BLOQUEADO" : "ATIVO"}.`);
    } catch (err: any) {
      alert(err.message || "Erro ao alterar bloqueio de usuário");
    }
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
    try {
      await adminUpdateReportStatus(reportId, nextStatus, currentAdmin.id);
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: nextStatus } : r));
      triggerSuccess(`Denúncia marcada como "${nextStatus}".`);
    } catch (err: any) {
      alert(err.message || "Erro ao atualizar denúncia");
    }
  };

  const handleDeactivateBookFromReport = async (report: BookReport) => {
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
                      {Array.from(new Set(books.map((b) => b.category).filter(Boolean))).map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
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
                      {Array.from(new Set(books.map((b) => b.language).filter(Boolean))).map((lang) => (
                        <option key={lang} value={lang}>{lang}</option>
                      ))}
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
                        className="bg-white border border-[#ece9dc] rounded-xl px-3 py-1.5 text-xs outline-none text-gray-900"
                        value={batchCategory}
                        onChange={(e) => setBatchCategory(e.target.value)}
                      >
                        <option value="Clássico">Clássico</option>
                        <option value="Ficção Científica">Ficção Científica</option>
                        <option value="Fantasia">Fantasia</option>
                        <option value="Romance">Romance</option>
                        <option value="História">História</option>
                        <option value="Filosofia">Filosofia</option>
                        <option value="Poesia">Poesia</option>
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
                                value={u.role || "Moderador"}
                                disabled={currentAdmin.role !== "Super Administrador"}
                                onChange={(e) => handleUpdateUserRole(u.id, e.target.value)}
                              >
                                <option value="Super Administrador">Super Administrador</option>
                                <option value="Administrador">Administrador</option>
                                <option value="Moderador">Moderador</option>
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
                                  if (confirm(`Tem certeza que deseja forçar o cancelamento da assinatura Premium de ${usr.name}? Isso revogará o acesso dele imediatamente.`)) {
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
                                      } else {
                                        alert(data.error || "Erro ao cancelar");
                                      }
                                    } catch (err) {
                                      alert("Erro de conexão");
                                    } finally {
                                      setSaasActionLoading(null);
                                    }
                                  }
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
                      onChange={(e) => setLogSearch(e.target.value)}
                    />
                  </div>

                  <select
                    className="bg-white border border-[#ece9dc] rounded-xl px-3 py-2 text-xs outline-none text-gray-900"
                    value={logFilterAction}
                    onChange={(e) => setLogFilterAction(e.target.value)}
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
                      {filteredLogs.map((l) => (
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
      
      {/* DIALOG 1: ADD / EDIT BOOK FORM */}
      <AnimatePresence>
        {(isAdding || isEditing) && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl border border-[#ece9dc] w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              id="form-add-edit-book"
            >
              {/* Form header */}
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#f6f5ee]/40">
                <div>
                  <h2 className="text-xl font-serif font-bold text-gray-900">
                    {isEditing ? `Editar Livro: ${title}` : "Publicar Novo Livro no Acervo"}
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">Preencha os metadados bibliográficos e envie os arquivos de conteúdo.</p>
                </div>
                <button
                  onClick={() => {
                    setIsAdding(false);
                    setIsEditing(null);
                    resetForm();
                  }}
                  className="p-1.5 hover:bg-gray-200 rounded-lg transition text-gray-400 hover:text-gray-700 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Direct Parse selector */}
              {!isEditing && (
                <div className="mx-6 mt-6 p-4 bg-amber-50/50 border border-amber-200 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100 flex-shrink-0">
                      <FileUp className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-gray-800 block">Importação Direta de Livros (PDF/EPUB)</span>
                      <span className="text-[10px] text-gray-400 block mt-0.5">Selecione um arquivo PDF ou EPUB para preencher o formulário e extrair as páginas automaticamente!</span>
                    </div>
                  </div>

                  <div className="relative overflow-hidden w-full md:w-auto">
                    <button className="bg-[#8a7e58] hover:bg-[#4a432d] text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer w-full justify-center">
                      <Upload className="w-3.5 h-3.5" />
                      Escolher PDF ou EPUB
                    </button>
                    <input
                      type="file"
                      accept=".pdf,.epub"
                      onChange={handleDirectBookImport}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {/* Progress of Parsing */}
              {isParsingBookFile && (
                <div className="mx-6 mt-4 p-4 bg-[#f6f5ee] border border-[#ece9dc] rounded-2xl flex items-center gap-3">
                  <RefreshCw className="w-4 h-4 text-[#8a7e58] animate-spin flex-shrink-0" />
                  <span className="text-xs font-bold text-gray-600 animate-pulse">{parsingStatus}</span>
                </div>
              )}

              {/* Central Form content */}
              <form onSubmit={handleFormSubmit} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1">
                    <label className="block font-semibold text-gray-600">Título da Obra *</label>
                    <input
                      type="text"
                      required
                      placeholder="ex: Dom Casmurro"
                      className="w-full bg-gray-50 border border-[#ece9dc] rounded-xl py-2.5 px-3 outline-none focus:bg-white focus:ring-1 focus:ring-[#8a7e58] text-gray-900 text-xs"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-semibold text-gray-600">Autor *</label>
                    <input
                      type="text"
                      required
                      placeholder="ex: Machado de Assis"
                      className="w-full bg-gray-50 border border-[#ece9dc] rounded-xl py-2.5 px-3 outline-none focus:bg-white focus:ring-1 focus:ring-[#8a7e58] text-gray-900 text-xs"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-semibold text-gray-600">Categoria literária *</label>
                    <select
                      className="w-full bg-gray-50 border border-[#ece9dc] rounded-xl py-2.5 px-3 outline-none focus:bg-white focus:ring-1 focus:ring-[#8a7e58] text-gray-900 text-xs"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option value="Clássico">Clássico</option>
                      <option value="Ficção Científica">Ficção Científica</option>
                      <option value="Fantasia">Fantasia</option>
                      <option value="Romance">Romance</option>
                      <option value="História">História</option>
                      <option value="Filosofia">Filosofia</option>
                      <option value="Poesia">Poesia</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block font-semibold text-gray-600">Idioma *</label>
                    <input
                      type="text"
                      required
                      placeholder="ex: Português"
                      className="w-full bg-gray-50 border border-[#ece9dc] rounded-xl py-2.5 px-3 outline-none focus:bg-white focus:ring-1 focus:ring-[#8a7e58] text-gray-900 text-xs"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-semibold text-gray-600">Ano de Publicação</label>
                    <input
                      type="text"
                      placeholder="ex: 1899"
                      className="w-full bg-gray-50 border border-[#ece9dc] rounded-xl py-2.5 px-3 outline-none focus:bg-white focus:ring-1 focus:ring-[#8a7e58] text-gray-900 text-xs"
                      value={publishDate}
                      onChange={(e) => setPublishDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-semibold text-gray-600">Código ISBN</label>
                    <input
                      type="text"
                      placeholder="ex: 978-65-8600-00-0"
                      className="w-full bg-gray-50 border border-[#ece9dc] rounded-xl py-2.5 px-3 outline-none focus:bg-white focus:ring-1 focus:ring-[#8a7e58] text-gray-900 text-xs"
                      value={isbn}
                      onChange={(e) => setIsbn(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-gray-600">Tags / Palavras-chave (Separadas por vírgula)</label>
                  <input
                    type="text"
                    placeholder="ex: machado de assis, realismo brasileiro, bruxo do cosme velho"
                    className="w-full bg-gray-50 border border-[#ece9dc] rounded-xl py-2.5 px-3 outline-none focus:bg-white focus:ring-1 focus:ring-[#8a7e58] text-gray-900 text-xs"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-gray-600">Descrição/Sinopse *</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Escreva um resumo cativante sobre o enredo da obra..."
                    className="w-full bg-gray-50 border border-[#ece9dc] rounded-xl py-2.5 px-3 outline-none focus:bg-white focus:ring-1 focus:ring-[#8a7e58] text-gray-900 text-xs"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                {/* Cover uploading combined row */}
                <div className="space-y-2">
                  <label className="block font-semibold text-gray-600">Capa do Livro *</label>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    <div className="sm:col-span-5">
                      <div className="border border-dashed border-[#dad5bf] hover:border-[#8a7e58] rounded-xl p-3 text-center bg-gray-50/50 hover:bg-white transition relative flex flex-col items-center justify-center min-h-[92px]">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleCoverUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <Upload className="w-5 h-5 text-gray-400 mb-1" />
                        <span className="text-[10px] font-bold text-[#8a7e58] block">Upload de Imagem</span>
                      </div>
                    </div>

                    <div className="hidden sm:flex sm:col-span-1 items-center justify-center text-gray-400 text-[10px] font-bold">OU</div>

                    <div className="sm:col-span-6 space-y-2">
                      <input
                        type="url"
                        placeholder="https://images.unsplash.com/photo-..."
                        className="w-full bg-gray-50 border border-[#ece9dc] rounded-xl py-2.5 px-3 outline-none focus:bg-white focus:ring-1 focus:ring-[#8a7e58] text-gray-900 text-xs"
                        value={coverUrl}
                        onChange={(e) => setCoverUrl(e.target.value)}
                      />
                      {coverUrl && (
                        <div className="flex items-center gap-2 bg-[#f6f5ee]/50 p-1.5 border border-[#ece9dc] rounded-xl">
                          <img
                            src={coverUrl}
                            alt="Capa"
                            className="w-8 h-11 object-cover rounded shadow-xs border border-gray-100 flex-shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=600&auto=format&fit=crop";
                            }}
                          />
                          <div className="min-w-0">
                            <span className="text-[10px] font-semibold text-gray-500 truncate block">Preview da Capa</span>
                            <button type="button" onClick={() => setCoverUrl("")} className="text-[9px] text-red-500 font-bold">Remover</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Audiobook support toggles */}
                <div className="p-4 bg-gray-50 border border-[#ece9dc] rounded-2xl space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="audioCheck"
                      checked={audiobookAvailable}
                      onChange={(e) => setAudiobookAvailable(e.target.checked)}
                      className="rounded text-[#8a7e58] focus:ring-[#8a7e58] cursor-pointer"
                    />
                    <label htmlFor="audioCheck" className="font-semibold text-gray-700 cursor-pointer text-xs">
                      Este livro possui suporte a Audiobook narrado de forma inteligente?
                    </label>
                  </div>

                  {audiobookAvailable && (
                    <div className="space-y-1 max-w-sm">
                      <label className="block font-semibold text-gray-500 text-xs">Duração estimada do Audiobook (ex: 2h 15m)</label>
                      <input
                        type="text"
                        className="w-full bg-white border border-[#ece9dc] rounded-xl py-2 px-3 outline-none focus:ring-1 focus:ring-[#8a7e58] text-gray-900 text-xs"
                        value={audioDuration}
                        onChange={(e) => setAudioDuration(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                {/* Content pages text input */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="block font-semibold text-gray-600">Conteúdo do Livro (Páginas) *</label>
                    <span className="text-[10px] text-gray-400 font-bold">Separe páginas com um parágrafo em branco (duas quebras de linha)</span>
                  </div>
                  <textarea
                    rows={8}
                    required
                    placeholder="Escreva o conteúdo da Página 1 do livro aqui.&#10;&#10;Escreva o conteúdo da Página 2 do livro aqui..."
                    className="w-full bg-gray-50 border border-[#ece9dc] rounded-xl py-2.5 px-3 outline-none focus:bg-white focus:ring-1 focus:ring-[#8a7e58] font-serif text-xs leading-relaxed text-gray-900"
                    value={pagesRawContent}
                    onChange={(e) => setPagesRawContent(e.target.value)}
                  />
                </div>

                {/* Submission footer */}
                <div className="pt-4 border-t border-gray-100 flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdding(false);
                      setIsEditing(null);
                      resetForm();
                    }}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-5 py-3 rounded-xl font-bold transition cursor-pointer text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-[#8a7e58] hover:bg-[#4a432d] text-white px-6 py-3 rounded-xl font-bold transition flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50 text-xs"
                  >
                    {loading ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    ) : (
                      <>
                        <Check className="w-4.5 h-4.5" />
                        {isEditing ? "Salvar Alterações" : "Confirmar e Publicar"}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
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
                  <span className="font-bold text-[#8a7e58] block mt-0.5">{selectedUserDetails.role || "Moderador"}</span>
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
                    {selectedUserDetails.favorites.map((favId) => {
                      const bookName = books.find(b => b.id === favId)?.title || `Livro ID: ${favId}`;
                      return (
                        <span key={favId} className="bg-[#f6f5ee] border border-[#dad5bf] text-[#2d291c] px-2 py-0.5 rounded-lg font-bold text-[10px]">
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
                            {aiAnalysisResult.suggestedMetadata || "Um clássico literário inesquecível, enriquecido por descrições profundas e complexidade psicológica que capta a essência da condição humana."}
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
      </AnimatePresence>

    </div>
  );
}
