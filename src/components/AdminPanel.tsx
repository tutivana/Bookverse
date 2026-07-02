import React, { useState } from "react";
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
  FileUp
} from "lucide-react";
import { Book } from "../types";
import { adminCreateBook, adminDeleteBook, adminUpdateBook } from "../lib/api";

interface AdminPanelProps {
  books: Book[];
  onBackToLibrary: () => void;
  onRefreshBooks: () => void;
}

export default function AdminPanel({ books, onBackToLibrary, onRefreshBooks }: AdminPanelProps) {
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

  // Admin List Filters & Pagination states
  const [adminSearch, setAdminSearch] = useState("");
  const [adminCategory, setAdminCategory] = useState("Todas");
  const [adminLanguage, setAdminLanguage] = useState("Todos");
  const [adminPage, setAdminPage] = useState(1);
  const booksPerPage = 5;

  // PDF & EPUB File Parsing States
  const [isParsingBookFile, setIsParsingBookFile] = useState(false);
  const [parsingStatus, setParsingStatus] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Load CDN scripts on-demand
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
    // Sort by path name naturally
    htmlFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

    const pages: string[] = [];
    const domParser = new DOMParser();
    const totalFiles = htmlFiles.length;

    for (let idx = 0; idx < totalFiles; idx++) {
      const htmlFile = htmlFiles[idx];
      setParsingStatus(`Decodificando tags e limpando HTML: Capítulo ${idx + 1} de ${totalFiles}...`);
      const doc = domParser.parseFromString(htmlFile.content, "text/html");
      const bodyText = doc.body?.innerText || doc.body?.textContent || "";
      const clean = bodyText.replace(/\s+/g, " ").trim();
      if (clean && clean.length > 40) {
        pages.push(clean);
      }
    }

    return { title: docTitle, author: docAuthor, pages };
  };

  // Handles raw book file import (PDF or EPUB)
  const handleBookFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setSuccessMsg("");
    setIsParsingBookFile(true);
    setParsingStatus("Iniciando leitura do arquivo...");

    const fileExt = file.name.split(".").pop()?.toLowerCase();

    try {
      if (fileExt === "pdf") {
        const pdfPages = await extractPDFPages(file);
        if (pdfPages.length === 0) {
          throw new Error("Não foi possível extrair nenhum texto legível deste PDF. Certifique-se de que não seja um PDF escaneado (imagem).");
        }
        setPagesRawContent(pdfPages.join("\n\n"));
        
        // Auto-fill title from filename
        const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
        setTitle(cleanName.replace(/\b\w/g, c => c.toUpperCase()));
        
        setSuccessMsg(`PDF carregado e processado com sucesso! Extraídas ${pdfPages.length} páginas de texto.`);
      } else if (fileExt === "epub") {
        const epubData = await extractEPUBPages(file);
        if (epubData.pages.length === 0) {
          throw new Error("Não foi possível extrair conteúdo legível deste EPUB.");
        }
        setPagesRawContent(epubData.pages.join("\n\n"));
        
        if (epubData.title) setTitle(epubData.title.trim());
        else {
          const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
          setTitle(cleanName.replace(/\b\w/g, c => c.toUpperCase()));
        }

        if (epubData.author) setAuthor(epubData.author.trim());

        setSuccessMsg(`EPUB carregado e processado com sucesso! Extraídos ${epubData.pages.length} capítulos/páginas de texto.`);
      } else {
        throw new Error("Formato inválido. Por favor, envie um arquivo .pdf ou .epub.");
      }
    } catch (err: any) {
      console.error(err);
      setError("Erro ao processar livro: " + err.message);
    } finally {
      setIsParsingBookFile(false);
      setParsingStatus("");
    }
  };

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
    setError("");
    setSuccessMsg("");
  };

  // Dynamic template downloads for JSON and Plain Text formats
  const downloadTemplate = (format: "json" | "txt") => {
    let content = "";
    let filename = "";
    let mimeType = "";
    
    if (format === "json") {
      content = JSON.stringify({
        title: "Exemplo de Título",
        author: "Nome do Autor",
        category: "Clássico",
        language: "Português",
        publishDate: "2026",
        description: "Este é um resumo ou sinopse do livro que aparecerá no catálogo da plataforma.",
        coverUrl: "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=600&auto=format&fit=crop",
        audiobookAvailable: true,
        audioDuration: "2h 30m",
        pdfContent: [
          "Conteúdo da primeira página do livro... Escreva o texto principal aqui.",
          "Conteúdo da segunda página do livro... Continue o texto aqui.",
          "Conteúdo da terceira página do livro... Fim do exemplo."
        ]
      }, null, 2);
      filename = "modelo_livro.json";
      mimeType = "application/json";
    } else {
      content = `Título: Exemplo de Título
Autor: Nome do Autor
Categoria: Clássico
Idioma: Português
Ano de Publicação: 2026
Capa: https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=600&auto=format&fit=crop
Audiobook: Sim
Duração: 2h 30m

Sinopse:
Este é um resumo ou sinopse do livro que aparecerá no catálogo da plataforma.

Conteúdo:
[Página 1]
Conteúdo da primeira página do livro... Escreva o texto principal aqui.

---
[Página 2]
Conteúdo da segunda página do livro... Continue o texto aqui.

---
[Página 3]
Conteúdo da terceira página do livro... Fim do exemplo.`;
      filename = "modelo_livro.txt";
      mimeType = "text/plain";
    }
    
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Convert uploaded cover image to Base64 data URL
  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith("image/")) {
      setError("O arquivo selecionado deve ser uma imagem válida (PNG, JPG, WEBP).");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setError("A imagem de capa não deve exceder 8MB.");
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setCoverUrl(event.target.result as string);
        setSuccessMsg("Imagem de capa carregada e convertida com sucesso!");
      }
    };
    reader.onerror = () => {
      setError("Erro ao ler o arquivo de imagem.");
    };
    reader.readAsDataURL(file);
  };

  // Parses unstructured and structured text or JSON files
  const parseTemplateText = (text: string) => {
    const result = {
      title: "",
      author: "",
      category: "Clássico",
      language: "Português",
      publishDate: "2026",
      description: "",
      coverUrl: "",
      audiobookAvailable: false,
      audioDuration: "45m",
      pdfContent: [] as string[]
    };

    const trimmedText = text.trim();

    // 1. JSON Parsing Check
    if (trimmedText.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmedText);
        result.title = parsed.title || parsed.titulo || "";
        result.author = parsed.author || parsed.autor || "";
        result.category = parsed.category || parsed.categoria || "Clássico";
        result.language = parsed.language || parsed.idioma || "Português";
        result.publishDate = String(parsed.publishDate || parsed.publish_date || parsed.ano || parsed.publishYear || "2026");
        result.description = parsed.description || parsed.sinopse || parsed.resumo || "";
        result.coverUrl = parsed.coverUrl || parsed.cover_url || parsed.capa || "";
        result.audiobookAvailable = !!(parsed.audiobookAvailable || parsed.audiobook_available || parsed.audiobook);
        result.audioDuration = parsed.audioDuration || parsed.audio_duration || parsed.duracao || "45m";
        
        const rawPages = parsed.pdfContent || parsed.pdf_content || parsed.paginas || parsed.pages;
        if (Array.isArray(rawPages)) {
          result.pdfContent = rawPages;
        } else if (typeof rawPages === "string") {
          result.pdfContent = rawPages.split("\n\n").map((p: string) => p.trim()).filter(Boolean);
        }
        return result;
      } catch (e: any) {
        throw new Error("Formato JSON inválido: " + e.message);
      }
    }

    // 2. Plain Text / Markdown Parsing
    const lines = text.split("\n");
    let currentSection: "meta" | "synopsis" | "content" = "meta";
    let synopsisLines: string[] = [];
    let contentLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Check section transitions
      if (/^(sinopse|resumo|descrição|description|synopsis):/i.test(trimmed)) {
        currentSection = "synopsis";
        const val = trimmed.replace(/^(sinopse|resumo|descrição|description|synopsis):/i, "").trim();
        if (val) synopsisLines.push(val);
        continue;
      }

      if (/^(conteúdo|conteudo|conteúdos|content|páginas|paginas|pages):/i.test(trimmed)) {
        currentSection = "content";
        const val = trimmed.replace(/^(conteúdo|conteudo|conteúdos|content|páginas|paginas|pages):/i, "").trim();
        if (val) contentLines.push(val);
        continue;
      }

      if (currentSection === "synopsis") {
        synopsisLines.push(line);
        continue;
      }

      if (currentSection === "content") {
        contentLines.push(line);
        continue;
      }

      // Metadata properties (Key: Value)
      const colonIndex = trimmed.indexOf(":");
      if (colonIndex !== -1 && currentSection === "meta") {
        const key = trimmed.substring(0, colonIndex).trim().toLowerCase();
        const val = trimmed.substring(colonIndex + 1).trim();

        if (key === "título" || key === "titulo" || key === "title") {
          result.title = val;
        } else if (key === "autor" || key === "author") {
          result.author = val;
        } else if (key === "categoria" || key === "category") {
          const normalized = val.toLowerCase();
          if (normalized.includes("clás") || normalized.includes("clas")) result.category = "Clássico";
          else if (normalized.includes("fic")) result.category = "Ficção";
          else if (normalized.includes("fant")) result.category = "Fantasia";
          else if (normalized.includes("sat") || normalized.includes("sát")) result.category = "Sátira";
          else if (normalized.includes("desenv") || normalized.includes("pess")) result.category = "Desenvolvimento";
          else result.category = val;
        } else if (key === "idioma" || key === "language") {
          result.language = val;
        } else if (key === "ano" || key === "ano de publicação" || key === "ano de publicacao" || key === "publicação" || key === "publicacao" || key === "publishdate" || key === "date") {
          result.publishDate = val;
        } else if (key === "capa" || key === "cover" || key === "coverurl" || key === "cover_url") {
          result.coverUrl = val;
        } else if (key === "audiobook" || key === "audiobook_available" || key === "audiobookavailable") {
          result.audiobookAvailable = val.toLowerCase() === "sim" || val.toLowerCase() === "true" || val === "1";
        } else if (key === "duracao" || key === "duração" || key === "duration" || key === "audioduration" || key === "audio_duration") {
          result.audioDuration = val;
        }
      }
    }

    result.description = synopsisLines.join("\n").trim();

    const fullContent = contentLines.join("\n").trim();
    if (fullContent) {
      if (fullContent.includes("---")) {
        result.pdfContent = fullContent
          .split("---")
          .map((p) => p.trim())
          .filter(Boolean);
      } else {
        result.pdfContent = fullContent
          .split("\n\n")
          .map((p) => p.trim())
          .filter(Boolean);
      }
    }

    return result;
  };

  // Handles drag-and-drop or select file event for model templates
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setSuccessMsg("");

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      try {
        const data = parseTemplateText(text);
        
        if (data.title) setTitle(data.title);
        if (data.author) setAuthor(data.author);
        if (data.category) setCategory(data.category);
        if (data.language) setLanguage(data.language);
        if (data.publishDate) setPublishDate(data.publishDate);
        if (data.description) setDescription(data.description);
        if (data.coverUrl) setCoverUrl(data.coverUrl);
        if (data.audiobookAvailable !== undefined) {
          setAudiobookAvailable(data.audiobookAvailable);
          if (data.audioDuration) setAudioDuration(data.audioDuration);
        }
        if (data.pdfContent && data.pdfContent.length > 0) {
          setPagesRawContent(data.pdfContent.join("\n\n"));
        }
        
        setSuccessMsg("Arquivo modelo importado com sucesso! Dados carregados nos campos do formulário.");
      } catch (err: any) {
        setError("Erro ao ler o arquivo modelo: " + err.message);
      }
    };
    reader.onerror = () => {
      setError("Erro ao ler o arquivo de modelo.");
    };
    reader.readAsText(file);
  };

  const handleCreateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      if (!title || !author || !description || !pagesRawContent.trim()) {
        throw new Error("Por favor, preencha todos os campos obrigatórios e adicione o conteúdo do livro.");
      }

      // Split raw content by double-newline to represent pages
      const pdfContent = pagesRawContent
        .split("\n\n")
        .map((p) => p.trim())
        .filter(Boolean);

      if (pdfContent.length === 0) {
        throw new Error("O conteúdo do livro precisa possuir pelo menos uma página.");
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
        pdfContent,
        pages: pdfContent.length,
      };

      await adminCreateBook(payload);
      setSuccessMsg(`Livro "${title}" adicionado com sucesso!`);
      resetForm();
      setIsAdding(false);
      onRefreshBooks();
    } catch (err: any) {
      setError(err.message || "Falha ao adicionar livro");
    } finally {
      setLoading(false);
    }
  };

  const handleEditBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditing) return;
    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      if (!title || !author || !description || !pagesRawContent.trim()) {
        throw new Error("Por favor, preencha todos os campos obrigatórios e adicione o conteúdo do livro.");
      }

      // Split raw content by double-newline to represent pages
      const pdfContent = pagesRawContent
        .split("\n\n")
        .map((p) => p.trim())
        .filter(Boolean);

      if (pdfContent.length === 0) {
        throw new Error("O conteúdo do livro precisa possuir pelo menos uma página.");
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
        pdfContent,
        pages: pdfContent.length,
      };

      await adminUpdateBook(isEditing, payload);
      setSuccessMsg(`Livro "${title}" atualizado com sucesso!`);
      resetForm();
      setIsEditing(null);
      onRefreshBooks();
    } catch (err: any) {
      setError(err.message || "Falha ao atualizar livro");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBook = async (bookId: string, bookTitle: string) => {
    if (!confirm(`Deseja realmente excluir o livro "${bookTitle}"? Esta ação removerá o livro, progresso de leitura, favoritos e avaliações.`)) {
      return;
    }

    try {
      await adminDeleteBook(bookId);
      onRefreshBooks();
      alert("Livro removido com sucesso!");
    } catch (err: any) {
      alert("Erro ao remover livro: " + err.message);
    }
  };

  // Get filtered books
  const filteredBooks = books.filter((b) => {
    const matchesSearch = b.title.toLowerCase().includes(adminSearch.toLowerCase()) ||
                         b.author.toLowerCase().includes(adminSearch.toLowerCase()) ||
                         b.id.toLowerCase().includes(adminSearch.toLowerCase());
    const matchesCategory = adminCategory === "Todas" || b.category === adminCategory;
    const matchesLanguage = adminLanguage === "Todos" || b.language === adminLanguage;
    return matchesSearch && matchesCategory && matchesLanguage;
  });

  // Calculate pagination details
  const totalFiltered = filteredBooks.length;
  const totalPages = Math.ceil(totalFiltered / booksPerPage) || 1;
  const safePage = Math.min(adminPage, totalPages);
  const startIndex = (safePage - 1) * booksPerPage;
  const paginatedBooks = filteredBooks.slice(startIndex, startIndex + booksPerPage);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 font-sans selection:bg-[#dad5bf]">
      {/* Header operations */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#2d291c] tracking-tight">Painel Administrativo</h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie o acervo da plataforma, envie arquivos (PDFs/Capas) e monitore o banco de dados.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              resetForm();
              setIsAdding(true);
            }}
            className="bg-[#8a7e58] hover:bg-[#4a432d] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Adicionar Novo Livro
          </button>
          
          <button
            onClick={onBackToLibrary}
            className="bg-transparent hover:bg-gray-100 border border-[#dad5bf] text-gray-700 px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Voltar para Biblioteca
          </button>
        </div>
      </div>

      {/* Database/Storage/RLS security diagnostics row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {/* Supabase connection health status card */}
        <div className="bg-white border border-[#ece9dc] rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Status do Backend</span>
            <span className="text-sm font-serif font-bold text-[#2d291c] flex items-center gap-1.5">
              Supabase PostgreSQL
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </span>
          </div>
        </div>

        {/* Supabase storage files status */}
        <div className="bg-white border border-[#ece9dc] rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Supabase Storage</span>
            <span className="text-sm font-serif font-bold text-[#2d291c]">
              /books, /covers, /audiobooks
            </span>
          </div>
        </div>

        {/* Supabase Row Level Security configuration */}
        <div className="bg-white border border-[#ece9dc] rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 bg-yellow-50 text-yellow-600 rounded-xl flex items-center justify-center border border-yellow-100">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Segurança Supabase RLS</span>
            <span className="text-sm font-serif font-bold text-[#2d291c] text-emerald-700 flex items-center gap-1">
              <Check className="w-4 h-4 text-emerald-600" />
              Ativo e Protegido
            </span>
          </div>
        </div>
      </div>

      {/* Book Catalog list Table */}
      <div className="bg-white border border-[#ece9dc] rounded-3xl overflow-hidden shadow-sm mb-12">
        <div className="p-6 border-b border-[#f6f5ee] flex justify-between items-center bg-[#f6f5ee]/45">
          <div>
            <h3 className="font-serif font-bold text-lg text-[#2d291c]">Acervo de Livros Ativo ({books.length})</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Gerenciamento de publicações, volumes e áudios vinculados.</p>
          </div>
          <button
            onClick={onRefreshBooks}
            className="p-2 text-gray-400 hover:text-[#8a7e58] rounded-xl hover:bg-gray-50 transition cursor-pointer"
            title="Recarregar acervo"
          >
            <RefreshCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Filtros de Listagem na Área Administrativa */}
        <div className="p-4 bg-gray-50/50 border-b border-[#ece9dc] grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar por Título, Autor ou ID..."
              className="w-full bg-white border border-[#ece9dc] rounded-xl pl-9 pr-4 py-2 text-xs outline-none focus:ring-1 focus:ring-[#8a7e58] text-gray-900"
              value={adminSearch}
              onChange={(e) => {
                setAdminSearch(e.target.value);
                setAdminPage(1); // Reset page on filter change
              }}
            />
          </div>
          <div className="md:col-span-3">
            <select
              className="w-full bg-white border border-[#ece9dc] rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-[#8a7e58] text-gray-900"
              value={adminCategory}
              onChange={(e) => {
                setAdminCategory(e.target.value);
                setAdminPage(1); // Reset page on filter change
              }}
            >
              <option value="Todas">Todas as Categorias</option>
              {Array.from(new Set(books.map((b) => b.category).filter(Boolean))).map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-3">
            <select
              className="w-full bg-white border border-[#ece9dc] rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-[#8a7e58] text-gray-900"
              value={adminLanguage}
              onChange={(e) => {
                setAdminLanguage(e.target.value);
                setAdminPage(1); // Reset page on filter change
              }}
            >
              <option value="Todos">Todos os Idiomas</option>
              {Array.from(new Set(books.map((b) => b.language).filter(Boolean))).map((lang) => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-1 flex justify-center">
            {(adminSearch || adminCategory !== "Todas" || adminLanguage !== "Todos") && (
              <button
                onClick={() => {
                  setAdminSearch("");
                  setAdminCategory("Todas");
                  setAdminLanguage("Todos");
                  setAdminPage(1);
                }}
                className="text-xs text-red-500 hover:text-red-700 font-bold hover:underline transition cursor-pointer"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        {books.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">Nenhum livro no catálogo. Adicione um novo clicando no botão acima.</div>
        ) : filteredBooks.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">
            <p className="mb-2 text-gray-500 font-semibold">Nenhum livro corresponde aos filtros selecionados.</p>
            <button
              onClick={() => {
                setAdminSearch("");
                setAdminCategory("Todas");
                setAdminLanguage("Todos");
                setAdminPage(1);
              }}
              className="text-xs bg-[#8a7e58]/10 text-[#8a7e58] hover:bg-[#8a7e58]/20 px-3 py-1.5 rounded-lg transition font-bold cursor-pointer"
            >
              Limpar Filtros
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#f6f5ee] border-b border-[#ece9dc] text-gray-500 font-semibold uppercase tracking-wider">
                    <th className="p-4 pl-6">Capa & Título</th>
                    <th className="p-4">Autor</th>
                    <th className="p-4">Categoria</th>
                    <th className="p-4">Páginas</th>
                    <th className="p-4">Audiobook</th>
                    <th className="p-4 text-right pr-6">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f6f5ee]">
                  {paginatedBooks.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50/50 transition">
                      <td className="p-4 pl-6 flex items-center gap-3 min-w-[200px]">
                        <img
                          src={b.coverUrl}
                          alt={b.title}
                          className="w-10 h-14 object-cover rounded shadow-sm border border-gray-100 flex-shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <span className="font-serif font-bold text-gray-900 block truncate">{b.title}</span>
                          <span className="text-[10px] text-gray-400 block font-mono">{b.id}</span>
                        </div>
                      </td>
                      <td className="p-4 text-gray-700">{b.author}</td>
                      <td className="p-4">
                        <span className="bg-[#f6f5ee] border border-[#dad5bf] text-[#8a7e58] px-2.5 py-0.5 rounded-full font-semibold">
                          {b.category}
                        </span>
                      </td>
                      <td className="p-4 font-semibold text-gray-800">{b.pages} pgs</td>
                      <td className="p-4">
                        {b.audiobookAvailable ? (
                          <span className="text-emerald-700 font-bold flex items-center gap-1">
                            <Headphones className="w-3.5 h-3.5" />
                            Sim ({b.audioDuration})
                          </span>
                        ) : (
                          <span className="text-gray-400">Não</span>
                        )}
                      </td>
                      <td className="p-4 text-right pr-6">
                        <div className="flex justify-end gap-1.5">
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
                              setIsEditing(b.id);
                            }}
                            className="p-2 text-gray-400 hover:text-[#8a7e58] hover:bg-amber-50/50 rounded-lg transition cursor-pointer"
                            title="Editar livro"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteBook(b.id, b.title)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition cursor-pointer"
                            title="Excluir livro"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
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
                  className="p-2 border border-[#ece9dc] rounded-xl hover:bg-white text-gray-600 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer flex items-center gap-1 text-[11px] font-bold"
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
                  className="p-2 border border-[#ece9dc] rounded-xl hover:bg-white text-gray-600 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                >
                  Próximo
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Create / Edit Book Dialog / Modal Overlay */}
      <AnimatePresence>
        {(isAdding || isEditing) && (
          <div className="fixed inset-0 bg-[#2d291c]/30 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-[#ece9dc] rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative max-h-[90vh] flex flex-col text-gray-900"
            >
              {/* Modal header */}
              <div className="p-6 border-b border-[#f6f5ee] flex justify-between items-center bg-[#f6f5ee]">
                <h3 className="font-serif font-bold text-[#2d291c] text-lg flex items-center gap-1.5">
                  <BookOpen className="w-5 h-5 text-[#8a7e58]" />
                  {isEditing ? `Editar Livro: ${title}` : "Adicionar Novo Livro ao Catálogo"}
                </h3>
                <button
                  onClick={() => {
                    setIsAdding(false);
                    setIsEditing(null);
                    resetForm();
                  }}
                  className="text-xs text-gray-500 hover:text-gray-800 font-bold"
                >
                  Fechar
                </button>
              </div>

              {/* Form viewport */}
              <form onSubmit={isEditing ? handleEditBook : handleCreateBook} className="flex-grow overflow-y-auto p-6 space-y-4 text-xs">
                {error && <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-600">{error}</div>}
                {successMsg && <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-600 font-semibold">{successMsg}</div>}

                 {/* Template & Direct PDF/EPUB Import Section */}
                 {!isEditing && (
                   <div className="p-4 bg-amber-50/20 border border-amber-100 rounded-2xl space-y-3">
                     <div className="flex justify-between items-center border-b border-[#ece9dc] pb-2">
                       <h4 className="font-serif font-bold text-[#8a7e58] text-sm flex items-center gap-1.5">
                         <Sparkles className="w-4 h-4 text-[#8a7e58]" />
                         Preenchimento Automático Avançado
                       </h4>
                       
                       {/* Tab Selector Buttons */}
                       <div className="flex gap-2">
                         <button
                           type="button"
                           onClick={() => setImportTab('template')}
                           className={`px-3 py-1 text-[10px] font-bold rounded-lg transition border cursor-pointer ${
                             importTab === 'template'
                               ? "bg-[#8a7e58] text-white border-[#8a7e58]"
                               : "bg-white text-gray-500 border-[#ece9dc] hover:text-gray-700"
                           }`}
                         >
                           Metadados (JSON/TXT)
                         </button>
                         <button
                           type="button"
                           onClick={() => setImportTab('direct')}
                           className={`px-3 py-1 text-[10px] font-bold rounded-lg transition border cursor-pointer flex items-center gap-1 ${
                             importTab === 'direct'
                               ? "bg-[#8a7e58] text-white border-[#8a7e58]"
                               : "bg-white text-gray-500 border-[#ece9dc] hover:text-gray-700"
                           }`}
                         >
                           <FileText className="w-3 h-3" />
                           Livro Inteiro (PDF/EPUB)
                         </button>
                       </div>
                     </div>

                     {importTab === 'template' ? (
                       <div className="space-y-3">
                         <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                           <p className="text-[10px] text-gray-500">
                             Arraste um arquivo modelo estruturado (.json ou .txt) para preencher todos os metadados, sinopse e páginas de uma só vez.
                           </p>
                           <div className="flex gap-1.5 self-start sm:self-auto flex-shrink-0">
                             <button
                               type="button"
                               onClick={() => downloadTemplate("json")}
                               className="text-[10px] bg-white hover:bg-[#f6f5ee] text-gray-700 font-bold py-1 px-2 border border-[#dad5bf] rounded-lg transition cursor-pointer flex items-center gap-1"
                             >
                               <Download className="w-3 h-3 text-[#8a7e58]" />
                               Modelo JSON
                             </button>
                             <button
                               type="button"
                               onClick={() => downloadTemplate("txt")}
                               className="text-[10px] bg-white hover:bg-[#f6f5ee] text-gray-700 font-bold py-1 px-2 border border-[#dad5bf] rounded-lg transition cursor-pointer flex items-center gap-1"
                             >
                               <Download className="w-3 h-3 text-[#8a7e58]" />
                               Modelo TXT
                             </button>
                           </div>
                         </div>

                         {/* Dropzone Area */}
                         <div className="border border-dashed border-[#dad5bf] hover:border-[#8a7e58] rounded-xl p-4 text-center bg-white transition relative">
                           <input
                             type="file"
                             accept=".json,.txt,.md"
                             onChange={handleFileImport}
                             className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                             title="Selecione um arquivo modelo"
                           />
                           <div className="flex flex-col items-center justify-center gap-1.5 py-1">
                             <Upload className="w-5 h-5 text-gray-400 animate-bounce" />
                             <p className="text-xs font-semibold text-gray-600">
                               Arraste ou clique para selecionar seu arquivo modelo (.json, .txt, .md)
                             </p>
                             <p className="text-[10px] text-gray-400">
                               O formulário será preenchido automaticamente com as informações importadas.
                             </p>
                           </div>
                         </div>
                       </div>
                     ) : (
                       <div className="space-y-3">
                         <p className="text-[10px] text-gray-500">
                           Carregue um arquivo .pdf ou .epub para ler e extrair texto real. O extrator local irá preencher as páginas (com quebras de página nativas) e metadados básicos.
                         </p>

                         {/* PDF/EPUB Dropzone Area */}
                         <div className="border border-dashed border-[#dad5bf] hover:border-[#8a7e58] rounded-xl p-4 text-center bg-white transition relative min-h-[100px] flex flex-col items-center justify-center">
                           {isParsingBookFile ? (
                             <div className="flex flex-col items-center justify-center gap-2 py-2">
                               <div className="w-5 h-5 border-2 border-[#8a7e58] border-t-transparent rounded-full animate-spin"></div>
                               <div className="text-center">
                                 <p className="text-[11px] font-bold text-[#8a7e58]">Processando livro...</p>
                                 <p className="text-[9px] text-gray-400 mt-0.5 animate-pulse">{parsingStatus}</p>
                               </div>
                             </div>
                           ) : (
                             <>
                               <input
                                 type="file"
                                 accept=".pdf,.epub"
                                 onChange={handleBookFileImport}
                                 className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                 title="Selecione um arquivo PDF ou EPUB"
                               />
                               <div className="flex flex-col items-center justify-center gap-1.5">
                                 <FileUp className="w-5 h-5 text-[#8a7e58] animate-bounce" />
                                 <p className="text-xs font-semibold text-gray-600">
                                   Arraste ou clique para selecionar o livro (.pdf, .epub)
                                 </p>
                                 <p className="text-[9px] text-gray-400">
                                   Requer PDFs de texto (não escaneados). EPUBs extrairão capítulos ordenadamente.
                                 </p>
                               </div>
                             </>
                           )}
                         </div>
                       </div>
                     )}
                   </div>
                 )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Title */}
                  <div className="space-y-1">
                    <label className="block font-semibold text-gray-600">Título do Livro *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Memorias Postumas de Bras Cubas"
                      className="w-full bg-gray-50 border border-[#ece9dc] rounded-xl py-2.5 px-3 outline-none focus:bg-white focus:ring-1 focus:ring-[#8a7e58] focus:border-[#8a7e58] text-gray-900"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>

                  {/* Author */}
                  <div className="space-y-1">
                    <label className="block font-semibold text-gray-600">Autor *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Machado de Assis"
                      className="w-full bg-gray-50 border border-[#ece9dc] rounded-xl py-2.5 px-3 outline-none focus:bg-white focus:ring-1 focus:ring-[#8a7e58] focus:border-[#8a7e58] text-gray-900"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Category */}
                  <div className="space-y-1">
                    <label className="block font-semibold text-gray-600">Categoria *</label>
                    <select
                      className="w-full bg-gray-50 border border-[#ece9dc] rounded-xl py-2.5 px-3 outline-none focus:bg-white focus:ring-1 focus:ring-[#8a7e58] text-gray-900"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option value="Clássico">Clássico</option>
                      <option value="Ficção">Ficção</option>
                      <option value="Fantasia">Fantasia</option>
                      <option value="Sátira">Sátira</option>
                      <option value="Desenvolvimento">Desenvolvimento</option>
                    </select>
                  </div>

                  {/* Language */}
                  <div className="space-y-1">
                    <label className="block font-semibold text-gray-600">Idioma *</label>
                    <input
                      type="text"
                      required
                      className="w-full bg-gray-50 border border-[#ece9dc] rounded-xl py-2.5 px-3 outline-none focus:bg-white focus:ring-1 focus:ring-[#8a7e58] text-gray-900"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                    />
                  </div>

                  {/* Publish Date */}
                  <div className="space-y-1">
                    <label className="block font-semibold text-gray-600">Ano de Publicação *</label>
                    <input
                      type="text"
                      required
                      className="w-full bg-gray-50 border border-[#ece9dc] rounded-xl py-2.5 px-3 outline-none focus:bg-white focus:ring-1 focus:ring-[#8a7e58] text-gray-900"
                      value={publishDate}
                      onChange={(e) => setPublishDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="block font-semibold text-gray-600">Descrição/Sinopse *</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Escreva um resumo cativante sobre o enredo da obra..."
                    className="w-full bg-gray-50 border border-[#ece9dc] rounded-xl py-2.5 px-3 outline-none focus:bg-white focus:ring-1 focus:ring-[#8a7e58] text-gray-900"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                {/* Cover URL and File Upload Combined */}
                <div className="space-y-2">
                  <label className="block font-semibold text-gray-600">Capa do Livro *</label>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    {/* Option 1: File Upload */}
                    <div className="sm:col-span-5">
                      <div className="border border-dashed border-[#dad5bf] hover:border-[#8a7e58] rounded-xl p-3 text-center bg-gray-50/50 hover:bg-white transition relative flex flex-col items-center justify-center min-h-[92px]">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleCoverUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          title="Selecione a imagem de capa"
                        />
                        <Upload className="w-5 h-5 text-gray-400 mb-1" />
                        <span className="text-[10px] font-bold text-[#8a7e58] block">Fazer Upload de Capa</span>
                        <span className="text-[9px] text-gray-400 block">PNG, JPG, WEBP</span>
                      </div>
                    </div>

                    {/* OR Separator */}
                    <div className="hidden sm:flex sm:col-span-1 items-center justify-center h-[92px] text-gray-400 font-bold text-[10px]">
                      OU
                    </div>

                    {/* Option 2: Cover URL */}
                    <div className="sm:col-span-6 space-y-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-gray-400 block">Inserir URL de Capa Existente</label>
                        <input
                          type="url"
                          placeholder="https://images.unsplash.com/photo-..."
                          className="w-full bg-gray-50 border border-[#ece9dc] rounded-xl py-2.5 px-3 outline-none focus:bg-white focus:ring-1 focus:ring-[#8a7e58] text-gray-900"
                          value={coverUrl}
                          onChange={(e) => setCoverUrl(e.target.value)}
                        />
                      </div>
                      
                      {/* Cover Preview */}
                      {coverUrl && (
                        <div className="flex items-center gap-2 bg-[#f6f5ee]/50 p-1.5 border border-[#ece9dc] rounded-xl">
                          <img
                            src={coverUrl}
                            alt="Preview da capa"
                            className="w-8 h-11 object-cover rounded shadow-xs border border-gray-100 flex-shrink-0 bg-white"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=600&auto=format&fit=crop";
                            }}
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0 flex-grow">
                            <span className="text-[10px] font-semibold text-gray-600 block truncate">Visualização da Capa</span>
                            <button
                              type="button"
                              onClick={() => setCoverUrl("")}
                              className="text-[9px] text-red-500 hover:text-red-700 font-bold block transition cursor-pointer"
                            >
                              Remover Capa
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Audiobook support toggles */}
                <div className="p-3.5 bg-gray-50 border border-[#ece9dc] rounded-2xl space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="audioCheck"
                      checked={audiobookAvailable}
                      onChange={(e) => setAudiobookAvailable(e.target.checked)}
                      className="rounded text-[#8a7e58] focus:ring-[#8a7e58] cursor-pointer"
                    />
                    <label htmlFor="audioCheck" className="font-semibold text-gray-700 cursor-pointer">
                      Este livro possui suporte a Audiobook narrado?
                    </label>
                  </div>

                  {audiobookAvailable && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block font-semibold text-gray-500">Duração estimada do Audiobook (ex: 2h 15m)</label>
                        <input
                          type="text"
                          className="w-full bg-white border border-[#ece9dc] rounded-xl py-2 px-3 outline-none focus:ring-1 focus:ring-[#8a7e58] text-gray-900"
                          value={audioDuration}
                          onChange={(e) => setAudioDuration(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Book text pages editor */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="block font-semibold text-gray-600">Conteúdo do Livro (Páginas) *</label>
                    <span className="text-[10px] text-gray-400 font-bold">Separe as páginas do livro com um PARÁGRAFO Vazio (Duas quebras de linha)</span>
                  </div>
                  <textarea
                    rows={6}
                    required
                    placeholder="Escreva aqui o conteúdo da Página 1 do livro.&#10;&#10;Escreva aqui o conteúdo da Página 2 do livro..."
                    className="w-full bg-gray-50 border border-[#ece9dc] rounded-xl py-2.5 px-3 outline-none focus:bg-white focus:ring-1 focus:ring-[#8a7e58] font-serif leading-relaxed text-gray-900"
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
                    className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-5 py-3 rounded-xl font-bold transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-[#8a7e58] hover:bg-[#4a432d] text-white px-6 py-3 rounded-xl font-bold transition flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
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
    </div>
  );
}
