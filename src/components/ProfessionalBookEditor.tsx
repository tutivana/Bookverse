import React, { useState, useEffect, useRef } from "react";
import { 
  BookOpen, Plus, Trash2, Edit3, ChevronLeft, ChevronRight, Check, Upload, FileUp, 
  FileText, Database, Sparkles, Info, X, ChevronDown, ChevronUp, RotateCcw, History, 
  Settings, AlertCircle, Eye, Type, Copy, Save, Split, Merge, Layers, Globe, Calendar, 
  Hash, Image, Table, Link, BarChart2, List, ListOrdered, CheckSquare, Quote, StickyNote, 
  HelpCircle, AlertTriangle, Play, RefreshCw, Layers2, FileEdit, CornerDownLeft
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "motion/react";
import { Book, BookHistory, BookStatus } from "../types";
import { adminAiAutocompleteBook, adminAiWritingAssistant } from "../lib/api";

interface ProfessionalBookEditorProps {
  book: Book | null;
  onSave: (updatedBookData: Partial<Book>, options?: { keepOpen?: boolean; silent?: boolean }) => Promise<any>;
  onClose: () => void;
  loading: boolean;
  currentAdmin: { name: string; role: string; email: string };
}

interface EditorPage {
  id: string;
  content: string;
}

interface EditorChapter {
  id: string;
  title: string;
  pages: EditorPage[];
}

interface VersionRecord {
  timestamp: string;
  adminName: string;
  changesDescription: string;
  chapters: EditorChapter[];
  metadata: any;
}

export function getLastOrderedListNumber(markdownContent: string): number {
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

export default function ProfessionalBookEditor({
  book,
  onSave,
  onClose,
  loading: saveLoading,
  currentAdmin
}: ProfessionalBookEditorProps) {
  // WIZARD STATE
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(book ? 3 : 1); // If editing existing, jump directly to editor (step 3)
  const [hasEnteredEditor, setHasEnteredEditor] = useState<boolean>(book ? true : false);

  useEffect(() => {
    if (wizardStep === 3) {
      setHasEnteredEditor(true);
    }
  }, [wizardStep]);
  
  // METADATA STATE
  const [title, setTitle] = useState(book?.title || "");
  const [subtitle, setSubtitle] = useState(book?.description?.split(".")[0] || "");
  const [author, setAuthor] = useState(book?.author || "");
  const [category, setCategory] = useState(book?.category || "Desenvolvimento Pessoal");
  const [language, setLanguage] = useState(book?.language || "Português");
  const [publisher, setPublisher] = useState("BookVerse Editorial");
  const [publishYear, setPublishYear] = useState(book?.publishDate || new Date().getFullYear().toString());
  const [isbn, setIsbn] = useState(book?.isbn || "");
  const [description, setDescription] = useState(book?.description || "");
  const [summaryText, setSummaryText] = useState(book?.description || "");
  const [keywords, setKeywords] = useState(book?.keywords?.join(", ") || "");
  const [tags, setTags] = useState(book?.tags?.join(", ") || "");
  const [coverUrl, setCoverUrl] = useState(book?.coverUrl || "");
  const [bannerUrl, setBannerUrl] = useState("");
  const [audiobookAvailable, setAudiobookAvailable] = useState(book?.audiobookAvailable || false);
  const [audioDuration, setAudioDuration] = useState(book?.audioDuration || "2h 30m");
  const [copyrightStatus, setCopyrightStatus] = useState<"public_domain" | "licensed" | "commercial" | "exclusive">(
    book?.copyright?.status || "commercial"
  );
  const [copyrightLicenseType, setCopyrightLicenseType] = useState<string>(
    book?.copyright?.licenseType || "purchase_required"
  );

  // CONTENT STATE (Structured Chapters & Pages)
  const [chapters, setChapters] = useState<EditorChapter[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState<string>("");
  const [selectedPageId, setSelectedPageId] = useState<string>("");
  
  // IMPORT PROCESS STATE
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState("");
  const [importLogs, setImportLogs] = useState<string[]>([]);
  
  // EDITOR VIEW MODES
  const [viewMode, setViewMode] = useState<"editor" | "reader">("editor");
  const [editorTab, setEditorTab] = useState<"visual" | "markdown">("visual");
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [showSaveDropdown, setShowSaveDropdown] = useState(false);
  const [showStructureSidebar, setShowStructureSidebar] = useState<boolean>(true);
  const [showBlocksSidebar, setShowBlocksSidebar] = useState<boolean>(true);
  const [showMarkdownGuide, setShowMarkdownGuide] = useState<boolean>(false);

  // FONT SIZES & AI STATES
  const [aiWorking, setAiWorking] = useState(false);
  const [editorFontSize, setEditorFontSize] = useState<number>(13); // Default 13px
  const [previewFontSize, setPreviewFontSize] = useState<number>(15); // Default 15px
  const [previewTheme, setPreviewTheme] = useState<"claro" | "sepia" | "escuro">("claro");

  // PREVIEW THEME STYLES MAPPING MATCHING THE MAIN BOOKVERSE READER
  const previewThemeStyles = {
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

  // CUSTOM MARKDOWN RENDERING COMPONENTS FOR FAITHFUL BOOKVERSE PREVIEW
  const getFaithfulMarkdownComponents = (theme: "claro" | "sepia" | "escuro") => ({
    h1: ({ children }: any) => (
      <h1 className={`font-serif font-bold text-2xl md:text-3xl mb-6 tracking-tight pb-3 border-b border-dashed text-left ${
        theme === "escuro" ? "text-[#e2b874] border-zinc-800" : theme === "sepia" ? "text-[#544830] border-[#ebdcb3]" : "text-gray-900 border-gray-200"
      }`}>
        {children}
      </h1>
    ),
    h2: ({ children }: any) => (
      <h2 className={`font-serif font-bold text-lg md:text-xl mt-8 mb-4 tracking-tight text-left ${
        theme === "escuro" ? "text-zinc-100" : theme === "sepia" ? "text-[#544830]" : "text-gray-800"
      }`}>
        {children}
      </h2>
    ),
    h3: ({ children }: any) => (
      <h3 className={`font-serif font-semibold text-base md:text-lg mt-6 mb-3 text-left ${
        theme === "escuro" ? "text-zinc-200" : theme === "sepia" ? "text-[#695d46]" : "text-gray-700"
      }`}>
        {children}
      </h3>
    ),
    p: ({ children }: any) => (
      <p className="mb-5 indent-6 text-justify leading-relaxed text-sm md:text-base">
        {children}
      </p>
    ),
    strong: ({ children }: any) => (
      <strong className={`font-bold ${
        theme === "escuro" ? "text-[#e2b874]" : theme === "sepia" ? "text-[#8a7e58]" : "text-gray-900"
      }`}>
        {children}
      </strong>
    ),
    em: ({ children }: any) => (
      <em className="italic opacity-95">
        {children}
      </em>
    ),
    blockquote: ({ children }: any) => (
      <blockquote className={`pl-4 py-1.5 border-l-4 my-6 italic text-sm md:text-base rounded-r-lg text-left ${
        theme === "escuro"
          ? "border-[#e2b874] bg-[#e2b874]/5 text-zinc-300"
          : theme === "sepia"
            ? "border-[#8a7e58] bg-[#8a7e58]/5 text-[#695c42]"
            : "border-[#8a7e58] bg-gray-50 text-gray-700"
      }`}>
        {children}
      </blockquote>
    ),
    ul: ({ children }: any) => (
      <ul className="book-verse-ul pl-6 my-4 space-y-2 text-sm md:text-base text-left">
        {children}
      </ul>
    ),
    ol: ({ children, start }: any) => {
      const activePageContent = getActivePage()?.content || "";
      let finalStart = start;

      if (activePageContent.includes("<!-- continue-ordered-list -->")) {
        const flatPages: { pageId: string; content: string }[] = [];
        chapters.forEach((c) => {
          c.pages.forEach((p) => {
            flatPages.push({ pageId: p.id, content: p.content });
          });
        });
        const activeIdx = flatPages.findIndex((p) => p.pageId === selectedPageId);
        if (activeIdx > 0) {
          const prevPageContent = flatPages[activeIdx - 1].content;
          const lastNum = getLastOrderedListNumber(prevPageContent);
          if (lastNum > 0) {
            finalStart = lastNum + 1;
          }
        }
      }

      return (
        <ol start={finalStart} className="book-verse-ol pl-6 my-4 space-y-2 text-sm md:text-base text-left">
          {children}
        </ol>
      );
    },
    li: ({ children }: any) => (
      <li className="leading-relaxed">
        {children}
      </li>
    ),
    hr: () => (
      <hr className={`my-8 border-t ${
        theme === "escuro" ? "border-zinc-800" : theme === "sepia" ? "border-[#ebdcb3]" : "border-gray-200"
      }`} />
    ),
  });
  
  // AUTO SAVE INDICATOR
  const [lastSavedText, setLastSavedText] = useState("Salvo localmente");
  const [isDirty, setIsDirty] = useState(false);
  const [autoSaveTimer, setAutoSaveTimer] = useState<number>(0);
  
  // HISTORY / VERSIONS
  const [versions, setVersions] = useState<VersionRecord[]>([]);
  
  // PREVENT MULTIPLE SAVES/CLICKS STATE
  const [isSaving, setIsSaving] = useState(false);
  
  // REFERENCE FOR TEXT SELECTION (WYSIWYG Toolbar Injection)
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const loadedBookIdRef = useRef<string | undefined>(undefined);

  // RECONSTRUCT STRUCTURE FROM EXISTING BOOK (BACKWARDS COMPATIBILITY)
  useEffect(() => {
    if (book) {
      // Only load if it's a completely different book (prevent resetting active user edits on save)
      if (loadedBookIdRef.current === book.id) {
        return;
      }
      loadedBookIdRef.current = book.id;

      const existingPages = book.pdfContent || [];
      const existingSummary = book.summary || [];
      
      if (existingPages.length > 0) {
        const reconstructedChapters: EditorChapter[] = [];
        
        if (existingSummary.length > 0) {
          // Reconstruct using the summary chapter indexes
          for (let i = 0; i < existingSummary.length; i++) {
            const currentSum = existingSummary[i];
            const nextSum = existingSummary[i + 1];
            
            // Convert to 0-based index
            const startIdx = Math.max(0, currentSum.page - 1);
            const endIdx = nextSum ? Math.max(0, nextSum.page - 1) : existingPages.length;
            
            const chapterPages: EditorPage[] = existingPages.slice(startIdx, endIdx).map((content, pIdx) => ({
              id: `page-ch${i}-${pIdx}`,
              content: content
            }));
            
            reconstructedChapters.push({
              id: `chapter-ch${i}`,
              title: currentSum.title,
              pages: chapterPages.length > 0 ? chapterPages : [{ id: `page-empty-ch${i}`, content: "" }]
            });
          }
        } else {
          // No summary available, group pages by 5 or put all in Chapter 1
          const chapterSize = 5;
          let chapterNum = 1;
          for (let i = 0; i < existingPages.length; i += chapterSize) {
            const slice = existingPages.slice(i, i + chapterSize);
            const chapterPages: EditorPage[] = slice.map((content, pIdx) => ({
              id: `page-c${chapterNum}-${pIdx}`,
              content: content
            }));
            reconstructedChapters.push({
              id: `chapter-c${chapterNum}`,
              title: `Capítulo ${chapterNum}`,
              pages: chapterPages
            });
            chapterNum++;
          }
        }
        
        if (reconstructedChapters.length === 0) {
          reconstructedChapters.push({
            id: "chapter-default",
            title: "Capítulo 1",
            pages: [{ id: "page-default", content: "# Bem-vindo\nComece a escrever seu livro aqui..." }]
          });
        }
        
        setChapters(reconstructedChapters);
        
        // Preserve selection if it is still valid, otherwise fall back to first page/chapter
        setSelectedChapterId((prevId) => {
          const exists = reconstructedChapters.some(c => c.id === prevId);
          if (exists && prevId) return prevId;
          return reconstructedChapters[0].id;
        });

        setSelectedPageId((prevPageId) => {
          const exists = reconstructedChapters.some(c => c.pages.some(p => p.id === prevPageId));
          if (exists && prevPageId) return prevPageId;
          return reconstructedChapters[0].pages[0]?.id || "";
        });
      } else {
        // Empty existing book content
        const defaultChapters = [{
          id: "chapter-1-default",
          title: "Capítulo I: A Introdução",
          pages: [{ id: "page-1-default", content: "# Introdução\nEscreva as primeiras linhas do seu romance..." }]
        }];
        setChapters(defaultChapters);
        setSelectedChapterId(defaultChapters[0].id);
        setSelectedPageId(defaultChapters[0].pages[0].id);
      }
    } else {
      // New book - set default structure
      const defaultChapters = [{
        id: "chapter-1-new",
        title: "Capítulo I",
        pages: [{ id: "page-1-new", content: "# Introdução\nInsira seu texto rico aqui." }]
      }];
      setChapters(defaultChapters);
      setSelectedChapterId(defaultChapters[0].id);
      setSelectedPageId(defaultChapters[0].pages[0].id);
    }
  }, [book]);

  // FIREBASE CLOUD SYNC FOR CHAPTER/PAGE MODIFICATIONS
  const saveDraftToCloud = async (currentChapters: EditorChapter[]) => {
    if (!book || !book.id) return;
    
    // Compile Chapters and Pages back to flat pdfContent array and generate table of contents
    const compiledPages: string[] = [];
    const compiledSummary: { title: string; page: number }[] = [];
    
    let currentPageNum = 1;
    currentChapters.forEach((c) => {
      compiledSummary.push({
        title: c.title,
        page: currentPageNum
      });
      c.pages.forEach((p) => {
        compiledPages.push(p.content);
        currentPageNum++;
      });
    });

    let totalWords = 0;
    currentChapters.forEach((c) => {
      c.pages.forEach((p) => {
        const words = p.content.trim().split(/\s+/).filter(Boolean);
        totalWords += words.length;
      });
    });
    const readTimeMins = Math.max(1, Math.ceil(totalWords / 200));

    const payload: Partial<Book> = {
      title: title || book.title || "Manuscrito Sem Título",
      author: author || book.author || "Autor Desconhecido",
      category,
      description,
      coverUrl: coverUrl || "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=600&auto=format&fit=crop",
      language,
      publishDate: publishYear,
      audiobookAvailable,
      audioDuration: audiobookAvailable ? audioDuration : undefined,
      pdfContent: compiledPages,
      pages: compiledPages.length,
      estimatedReadTime: `${readTimeMins} min`,
      isbn: isbn || undefined,
      keywords: keywords ? keywords.split(",").map((k) => k.trim()) : [],
      tags: tags ? tags.split(",").map((t) => t.trim()) : [],
      summary: compiledSummary,
      copyright: {
        status: copyrightStatus,
        licenseType: copyrightLicenseType
      },
      status: book.status || "Draft"
    };

    try {
      setLastSavedText("Sincronizando...");
      await onSave(payload, { keepOpen: true, silent: true });
      const now = new Date();
      setLastSavedText(`Sincronizado às ${now.toLocaleTimeString()}`);
      setIsDirty(false);
    } catch (err) {
      console.error("Erro no auto-save do Firestore:", err);
      setLastSavedText("Erro ao sincronizar");
    }
  };

  const updateChaptersAndSync = (nextChapters: EditorChapter[]) => {
    setChapters(nextChapters);
    setIsDirty(true);
    saveDraftToCloud(nextChapters);
  };

  // Prevent leaving or reloading with unsaved edits
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "Existem alterações não salvas. Tem certeza que deseja sair?";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty]);

  // INITIALIZE AUTO-SAVE SIMULATOR (Stable interval using updated ref closures)
  const autoSaveCallbackRef = useRef<() => void>(undefined);
  
  useEffect(() => {
    autoSaveCallbackRef.current = () => {
      if (isDirty) {
        saveDraftLocally();
      }
    };
  });

  useEffect(() => {
    const interval = setInterval(() => {
      if (autoSaveCallbackRef.current) {
        autoSaveCallbackRef.current();
      }
    }, 10000); // Salva automaticamente a cada 10 segundos se houver alterações
    return () => clearInterval(interval);
  }, []);

  const saveDraftLocally = () => {
    setIsDirty(false);
    const now = new Date();
    setLastSavedText(`Rascunho salvo às ${now.toLocaleTimeString()}`);
    
    // Add to versions list
    const newVersion: VersionRecord = {
      timestamp: now.toLocaleTimeString() + " - " + now.toLocaleDateString(),
      adminName: currentAdmin.name,
      changesDescription: "Auto Save - Edições no manuscrito",
      chapters: JSON.parse(JSON.stringify(chapters)),
      metadata: { title, author, category, description }
    };
    
    setVersions((prev) => {
      const updated = [newVersion, ...prev];
      return updated.slice(0, 10); // Keep last 10 versions
    });

    // Sync to Cloud Firestore if editing an existing book
    if (book && book.id) {
      saveDraftToCloud(chapters);
    }
  };

  // RETRIEVE ACTIVE PAGE OBJECT
  const getActivePage = (): EditorPage | null => {
    const currentChapter = chapters.find((c) => c.id === selectedChapterId);
    if (!currentChapter) return null;
    return currentChapter.pages.find((p) => p.id === selectedPageId) || null;
  };

  // UPDATE CONTENT OF ACTIVE PAGE
  const updateActivePageContent = (newContent: string) => {
    setIsDirty(true);
    setChapters((prevChapters) =>
      prevChapters.map((c) => {
        if (c.id === selectedChapterId) {
          return {
            ...c,
            pages: c.pages.map((p) => {
              if (p.id === selectedPageId) {
                return { ...p, content: newContent };
              }
              return p;
            })
          };
        }
        return c;
      })
    );
  };

  // PROCESS IA WRITING ASSISTANT OPERATIONS
  const handleAiWritingAction = async (action: "improve" | "grammar" | "continue" | "summarize") => {
    const activePage = getActivePage();
    if (!activePage || !activePage.content) return;
    setAiWorking(true);
    try {
      const activeChapter = chapters.find((c) => c.id === selectedChapterId);
      const context = `Obra: "${title}" por ${author || "Desconhecido"}. Capítulo: "${activeChapter?.title || "Sem título"}".`;
      const response = await adminAiWritingAssistant(activePage.content, action, context, language);
      if (response && response.result) {
        updateActivePageContent(response.result);
      }
    } catch (err: any) {
      alert("Erro no assistente de IA: " + err.message);
    } finally {
      setAiWorking(false);
    }
  };

  // AUTOCOMPLETE METADATA WITH IA
  const handleAiAutocomplete = async () => {
    if (!title) {
      alert("Por favor, preencha pelo menos o título do livro para usar a IA.");
      return;
    }
    setAiWorking(true);
    try {
      const data = await adminAiAutocompleteBook(title, author, language);
      if (data) {
        if (data.title) setTitle(data.title);
        if (data.subtitle) setSubtitle(data.subtitle);
        if (data.category) setCategory(data.category);
        if (data.language) setLanguage(data.language);
        if (data.isbn) setIsbn(data.isbn);
        if (data.description) {
          setDescription(data.description);
          setSummaryText(data.description);
        }
        if (data.keywords) setKeywords(data.keywords);
        if (data.tags) setTags(data.tags);
      }
    } catch (err: any) {
      alert("Erro ao autocompletar com IA: " + err.message);
    } finally {
      setAiWorking(false);
    }
  };

  // BOOK STATS COMPUTATION
  const computeStats = () => {
    let totalChapters = chapters.length;
    let totalPages = 0;
    let totalWords = 0;
    let totalCharacters = 0;
    let imagesCount = 0;
    let tablesCount = 0;

    chapters.forEach((c) => {
      totalPages += c.pages.length;
      c.pages.forEach((p) => {
        totalCharacters += p.content.length;
        const words = p.content.trim().split(/\s+/).filter(Boolean);
        totalWords += words.length;
        
        // Count images and tables in markdown
        const imgMatches = p.content.match(/!\[.*?\]\(.*?\)/g);
        if (imgMatches) imagesCount += imgMatches.length;
        
        const tableMatches = p.content.match(/\|.*?\|/g);
        if (tableMatches) tablesCount += 1; // general estimate
      });
    });

    const readTimeMins = Math.max(1, Math.ceil(totalWords / 200));

    return {
      totalChapters,
      totalPages,
      totalWords,
      totalCharacters,
      imagesCount,
      tablesCount,
      estimatedReadTime: `${readTimeMins} min`
    };
  };

  const stats = computeStats();

  // COVER IMAGE COMPRESSION HELPER (Canvas-based, keeping sizes highly optimized for Firestore)
  const compressAndSetCover = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const max_width = 320; // Perfect width for premium book cover thumbnails
        const scale = max_width / img.width;
        canvas.width = max_width;
        canvas.height = img.height * scale;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          // Compress as JPEG with 0.75 quality for beautiful look and tiny payload
          const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
          setCoverUrl(dataUrl);
        } else {
          setCoverUrl(event.target?.result as string);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // WIZARD METADATA VALIDATION
  const handleWizardStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !author || !description) {
      alert("Por favor, preencha os metadados principais (*)");
      return;
    }
    // If we have already entered the editor, go back to step 3. Otherwise, proceed to step 2 to select source.
    if (hasEnteredEditor) {
      setWizardStep(3);
    } else {
      setWizardStep(2);
    }
  };

  // WIZARD SOURCE OPTIONS
  const handleManualCreation = () => {
    setWizardStep(3);
  };

  const handleContinueDraft = () => {
    setWizardStep(3);
  };

  // LOAD EXTERNAL SCRIPTS VIA CDN
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

  // REAL PDF CONTENT EXTRACTOR
  const extractPDFContent = async (file: File): Promise<{ title: string; author: string; chapters: EditorChapter[] }> => {
    setImportStatus("Carregando motor PDF.js via CDN...");
    setImportLogs((prev) => [...prev, "[PDF] Carregando biblioteca pdf.js..."]);
    await loadExternalScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js");
    
    const pdfjsLib = (window as any)['pdfjs-dist/build/pdf'];
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

    setImportStatus("Lendo arquivo PDF e decodificando canais...");
    setImportLogs((prev) => [...prev, "[PDF] Lendo array buffer e decodificando canais..."]);
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    
    setImportLogs((prev) => [...prev, `[PDF] PDF Carregado com sucesso! Total de páginas: ${numPages}`]);
    const extractedPages: string[] = [];

    for (let i = 1; i <= numPages; i++) {
      setImportProgress(Math.floor(15 + (i / numPages) * 75));
      setImportStatus(`Extraindo texto: Página ${i} de ${numPages}...`);
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      
      if (pageText) {
        extractedPages.push(pageText);
      } else {
        extractedPages.push(`[Página ${i} - Página em branco ou contendo apenas imagem não textual]`);
      }
    }

    setImportStatus("Estruturando páginas em capítulos...");
    setImportLogs((prev) => [...prev, "[PDF] Agrupando páginas em capítulos do BookVerse..."]);
    const chaptersList: EditorChapter[] = [];
    const pageSize = 5; // Group every 5 PDF pages into a chapter for better readability
    let chapIndex = 1;
    
    for (let i = 0; i < extractedPages.length; i += pageSize) {
      const slice = extractedPages.slice(i, i + pageSize);
      const editorPages: EditorPage[] = slice.map((content, pIdx) => ({
        id: `page-pdf-${chapIndex}-${pIdx}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        content: `# Página ${i + pIdx + 1}\n\n${content}`
      }));
      
      chaptersList.push({
        id: `chapter-pdf-${chapIndex}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        title: `Capítulo ${chapIndex}: Páginas ${i + 1} - ${Math.min(extractedPages.length, i + pageSize)}`,
        pages: editorPages
      });
      chapIndex++;
    }

    return {
      title: file.name.replace(/\.pdf$/i, ""),
      author: "Importado via PDF",
      chapters: chaptersList
    };
  };

  // REAL EPUB CONTENT EXTRACTOR
  const extractEPUBContent = async (file: File): Promise<{ title: string; author: string; chapters: EditorChapter[] }> => {
    setImportStatus("Carregando JSZip para descompressão...");
    setImportLogs((prev) => [...prev, "[EPUB] Carregando JSZip via CDN..."]);
    await loadExternalScript("https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js");
    
    setImportStatus("Descompactando arquivo EPUB...");
    setImportLogs((prev) => [...prev, "[EPUB] Lendo estrutura de pacotes zip..."]);
    const JSZip = (window as any).JSZip;
    const zip = await JSZip.loadAsync(file);
    
    let docTitle = "";
    let docAuthor = "";
    const htmlFiles: { name: string; content: string }[] = [];

    setImportStatus("Buscando capítulos e metadados OPF...");
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

    setImportLogs((prev) => [...prev, `[EPUB] Metadados extraídos: Título="${docTitle || "Desconhecido"}", Autor="${docAuthor || "Desconhecido"}"`]);
    setImportLogs((prev) => [...prev, `[EPUB] Mapeados ${htmlFiles.length} arquivos textuais de capítulos.`]);

    // Sort chapters
    htmlFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

    const chaptersList: EditorChapter[] = [];
    const domParser = new DOMParser();
    const totalFiles = htmlFiles.length;

    for (let idx = 0; idx < totalFiles; idx++) {
      setImportProgress(Math.floor(25 + (idx / totalFiles) * 70));
      const htmlFile = htmlFiles[idx];
      setImportStatus(`Convertendo capítulo ${idx + 1} de ${totalFiles}...`);
      
      const xmlDoc = domParser.parseFromString(htmlFile.content, "text/html");
      const h1Text = xmlDoc.querySelector("h1, h2, h3, h4")?.textContent?.trim();
      const rawText = xmlDoc.body.textContent || "";
      const cleanedText = rawText.replace(/\s+/g, " ").trim();
      
      if (cleanedText.length < 40) continue; // Skip tiny/meta files

      // Split large chapter text into 1200 character chunks to create logical pages
      const words = cleanedText.split(" ");
      const pages: EditorPage[] = [];
      let currentPageText = "";
      let pageIndex = 1;

      for (const word of words) {
        if (currentPageText.length + word.length > 1200) {
          pages.push({
            id: `page-epub-${idx}-${pageIndex}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            content: `## Capítulo ${idx + 1} - Página ${pageIndex}\n\n${currentPageText.trim()}`
          });
          currentPageText = "";
          pageIndex++;
        }
        currentPageText += word + " ";
      }
      if (currentPageText.trim()) {
        pages.push({
          id: `page-epub-${idx}-${pageIndex}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          content: `## Capítulo ${idx + 1} - Página ${pageIndex}\n\n${currentPageText.trim()}`
        });
      }

      chaptersList.push({
        id: `chapter-epub-${idx}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        title: h1Text || `Capítulo ${idx + 1}: ${htmlFile.name.split('/').pop()?.replace(/\.[^/.]+$/, "")}`,
        pages: pages.length > 0 ? pages : [{ id: `page-empty-${Date.now()}`, content: "# Em branco" }]
      });
    }

    return {
      title: docTitle || file.name.replace(/\.epub$/i, ""),
      author: docAuthor || "Importado via EPUB",
      chapters: chaptersList
    };
  };

  // REAL PLAIN TEXT / MARKDOWN EXTRACTOR WITH ROBUST MD STRUCTURE SUPPORT
  const extractTXTContent = async (file: File): Promise<{ title: string; author: string; chapters: EditorChapter[] }> => {
    const isMd = file.name.toLowerCase().endsWith(".md");
    setImportStatus(isMd ? "Lendo arquivo Markdown (.md)..." : "Lendo arquivo de texto...");
    setImportLogs((prev) => [...prev, isMd ? "[MARKDOWN] Executando leitura local do arquivo .md..." : "[TEXT] Executando leitura local do arquivo..."]);
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        const lines = text.split(/\r?\n/);
        
        // Check if content has markdown headings or explicit page breaks
        const hasChapters = lines.some(line => /^#{1,3}\s+.+/.test(line.trim()));
        const hasPageBreaks = lines.some(line => line.trim() === "---");

        let chaptersList: EditorChapter[] = [];

        if (hasChapters || hasPageBreaks) {
          setImportLogs((prev) => [...prev, "[MARKDOWN] Estrutura Markdown com capítulos ou quebras detectada."]);
          let currentChapterTitle = "Capítulo I: Introdução";
          let currentPages: EditorPage[] = [];
          let currentPageText: string[] = [];
          let pageIndexInChapter = 1;

          const finalizePage = () => {
            const pageContent = currentPageText.join("\n").trim();
            if (pageContent) {
              currentPages.push({
                id: `page-md-${pageIndexInChapter}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                content: pageContent
              });
              pageIndexInChapter++;
            }
            currentPageText = [];
          };

          const finalizeChapter = () => {
            finalizePage();
            if (currentPages.length > 0 || currentChapterTitle) {
              chaptersList.push({
                id: `chapter-md-${chaptersList.length + 1}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                title: currentChapterTitle || `Capítulo ${chaptersList.length + 1}`,
                pages: currentPages.length > 0 ? currentPages : [{ id: `page-empty-${Date.now()}`, content: "# Vazio" }]
              });
            }
            currentPages = [];
            pageIndexInChapter = 1;
          };

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();

            const chapMatch = /^#{1,3}\s+(.+)$/.exec(trimmed);
            if (chapMatch) {
              if (currentPageText.length > 0 || currentPages.length > 0) {
                finalizeChapter();
              }
              currentChapterTitle = chapMatch[1].trim();
              currentPageText.push(line);
            } else if (trimmed === "---") {
              finalizePage();
            } else {
              currentPageText.push(line);
            }
          }

          if (currentPageText.length > 0 || currentPages.length > 0) {
            finalizeChapter();
          }

          if (chaptersList.length === 0) {
            chaptersList.push({
              id: `chapter-empty-${Date.now()}`,
              title: "Capítulo I",
              pages: [{ id: `page-empty-${Date.now()}`, content: "# Vazio" }]
            });
          }
        } else {
          setImportLogs((prev) => [...prev, "[TEXT] Sem tags estruturais de MD. Usando divisão automática por tamanho..."]);
          const pages: EditorPage[] = [];
          let currentPageText = "";
          let pageIndex = 1;

          for (const line of lines) {
            if (currentPageText.length + line.length > 1500) {
              pages.push({
                id: `page-txt-${pageIndex}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                content: `# Página ${pageIndex}\n\n${currentPageText.trim()}`
              });
              currentPageText = "";
              pageIndex++;
            }
            currentPageText += line + "\n";
          }
          if (currentPageText.trim()) {
            pages.push({
              id: `page-txt-${pageIndex}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              content: `# Página ${pageIndex}\n\n${currentPageText.trim()}`
            });
          }

          chaptersList.push({
            id: `chapter-txt-1-${Date.now()}`,
            title: "Capítulo I: Conteúdo Principal",
            pages: pages.length > 0 ? pages : [{ id: `page-empty-${Date.now()}`, content: "# Vazio" }]
          });
        }

        resolve({
          title: file.name.replace(/\.(txt|md)$/i, ""),
          author: isMd ? "Importado via Markdown" : "Importado via Texto",
          chapters: chaptersList
        });
      };
      reader.onerror = () => reject(new Error("Erro ao ler o arquivo TXT/MD."));
      reader.readAsText(file);
    });
  };

  // MAIN FILE IMPORT ENTRYPOINT
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportProgress(10);
    setImportStatus("Analisando tipo de arquivo...");
    setImportLogs([`Arquivo selecionado: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`]);

    try {
      const extension = file.name.split('.').pop()?.toLowerCase();
      let result: { title: string; author: string; chapters: EditorChapter[] };

      if (extension === 'pdf') {
        result = await extractPDFContent(file);
      } else if (extension === 'epub') {
        result = await extractEPUBContent(file);
      } else if (extension === 'txt' || extension === 'md') {
        result = await extractTXTContent(file);
      } else {
        setImportLogs((prev) => [...prev, `[AVISO] Formato .${extension} não possui extrator nativo completo, gerando rascunho estruturado...`]);
        await new Promise((resolve) => setTimeout(resolve, 1500));
        result = {
          title: file.name.replace(/\.[^/.]+$/, ""),
          author: "Importado",
          chapters: [
            {
              id: `chap-imp-1-${Date.now()}`,
              title: "Capítulo I: O Despertar da Aurora",
              pages: [
                {
                  id: `page-imp-1-1-${Date.now()}`,
                  content: `# Capítulo I: O Despertar da Aurora\n\nEra uma manhã fria de outono quando os primeiros raios de sol tocaram os vitrais da antiga biblioteca do BookVerse. O silêncio era absoluto, interrompido apenas pelo farfalhar suave das folhas secas trazidas pelo vento.\n\n> "A leitura é uma viagem de volta, sem que precisemos sair do lugar."\n\nEste livro representa a materialização do conhecimento acumulado ao longo das gerações rurais. Abaixo, listamos os principais elements que exploraremos:\n\n* **A Biblioteca Secreta**: O local onde os manuscritos são guardados.\n* **O Guardião dos Tomos**: Aquele que protege as chaves.\n* **A Conversão Digital**: O processo de fatiamento de páginas que assegura uma fluidez impecável.`
                },
                {
                  id: `page-imp-1-2-${Date.now()}`,
                  content: `### Elementos do Mistério\n\nAbaixo, apresentamos o inventário das obras perdidas recuperadas na primeira expedição:\n\n| Tomo ID | Título Original | Autor Consagrado | Ano Estimado |\n| :--- | :--- | :--- | :--- |\n| #012 | Dom Casmurro | Machado de Assis | 1899 |\n| #045 | Memorial de Aires | Machado de Assis | 1908 |\n| #098 | Quincas Borba | Machado de Assis | 1891 |\n\n:::warning\nApenas administradores de nível Super ou superior possuem acesso irrestrito aos manuscritos com ISBN não catalogado.\n:::\n\nEste foi apenas o primeiro passo da nossa maravilhosa jornada pelas páginas do tempo.`
                }
              ]
            }
          ]
        };
      }

      if (result.chapters.length === 0) {
        throw new Error("Nenhum capítulo legível pôde ser extraído deste arquivo.");
      }

      // Populate states with actual data
      setTitle(result.title);
      setAuthor(result.author);
      setChapters(result.chapters);
      
      setSelectedChapterId(result.chapters[0].id);
      setSelectedPageId(result.chapters[0].pages[0].id);

      setImportProgress(100);
      setImportStatus("Importação finalizada com sucesso!");
      setImportLogs((prev) => [...prev, `[SUCESSO] O arquivo foi totalmente processado e convertido. ${result.chapters.length} capítulo(s) criados.`]);

      setTimeout(() => {
        setImporting(false);
        setWizardStep(3); // Advance to editor view
      }, 1200);

    } catch (err: any) {
      setImportStatus("Falha na importação");
      setImportLogs((prev) => [...prev, `[ERRO CRÍTICO] Falha ao processar arquivo: ${err.message || err}`]);
      setTimeout(() => {
        setImporting(false);
      }, 3000);
    }
  };

  // WYSIWYG TOOLBAR INJECTION HELPERS
  const insertMarkdown = (syntaxBefore: string, syntaxAfter: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(startPos, endPos);

    const replacement = syntaxBefore + (selectedText || "texto") + syntaxAfter;
    const updatedContent = text.substring(0, startPos) + replacement + text.substring(endPos);

    updateActivePageContent(updatedContent);

    // Reset cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        startPos + syntaxBefore.length,
        startPos + syntaxBefore.length + (selectedText || "texto").length
      );
    }, 50);
  };

  // BLOCK CONVERSION VISUALIZER HELPER (Pág. em blocos)
  const parseMarkdownToBlocks = (markdown: string) => {
    const lines = markdown.split("\n");
    const blocks: { type: string; content: string; key: number }[] = [];
    let listItems: string[] = [];
    let inList = false;
    let blockCounter = 0;

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        if (inList) {
          blocks.push({ type: "list", content: listItems.join("\n"), key: blockCounter++ });
          listItems = [];
          inList = false;
        }
        return;
      }

      if (trimmed.startsWith("# ")) {
        blocks.push({ type: "h1", content: trimmed.replace("# ", ""), key: blockCounter++ });
      } else if (trimmed.startsWith("## ")) {
        blocks.push({ type: "h2", content: trimmed.replace("## ", ""), key: blockCounter++ });
      } else if (trimmed.startsWith("### ")) {
        blocks.push({ type: "h3", content: trimmed.replace("### ", ""), key: blockCounter++ });
      } else if (trimmed.startsWith("#### ")) {
        blocks.push({ type: "h4", content: trimmed.replace("#### ", ""), key: blockCounter++ });
      } else if (trimmed.startsWith("> ")) {
        blocks.push({ type: "quote", content: trimmed.replace("> ", ""), key: blockCounter++ });
      } else if (trimmed.startsWith(":::note") || trimmed.startsWith(":::warning") || trimmed.startsWith(":::info")) {
        blocks.push({ type: "note", content: trimmed.replace(/:::(note|warning|info)/, "Destaque:"), key: blockCounter++ });
      } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        inList = true;
        listItems.push(trimmed.substring(2));
      } else if (trimmed.startsWith("1. ")) {
        inList = true;
        listItems.push(trimmed.substring(3));
      } else {
        if (inList) {
          blocks.push({ type: "list", content: listItems.join("\n"), key: blockCounter++ });
          listItems = [];
          inList = false;
        }
        blocks.push({ type: "paragraph", content: trimmed, key: blockCounter++ });
      }
    });

    if (inList && listItems.length > 0) {
      blocks.push({ type: "list", content: listItems.join("\n"), key: blockCounter++ });
    }

    return blocks;
  };

  // CHAPTER MANAGEMENT
  const handleAddChapter = () => {
    const newId = `chapter-${Date.now()}`;
    const newChapterNum = chapters.length + 1;
    const newChapter: EditorChapter = {
      id: newId,
      title: `Capítulo ${newChapterNum}: Novo Capítulo`,
      pages: [
        { id: `page-${Date.now()}`, content: `# Novo Capítulo\nEscreva algo incrível...` }
      ]
    };
    setSelectedChapterId(newId);
    setSelectedPageId(newChapter.pages[0].id);
    updateChaptersAndSync([...chapters, newChapter]);
  };

  const handleRenameChapter = (chapterId: string, newTitle: string) => {
    const nextChapters = chapters.map((c) => (c.id === chapterId ? { ...c, title: newTitle } : c));
    updateChaptersAndSync(nextChapters);
  };

  const handleDeleteChapter = (chapterId: string) => {
    if (chapters.length <= 1) {
      alert("O livro deve possuir pelo menos um capítulo estruturado.");
      return;
    }
    const filtered = chapters.filter((c) => c.id !== chapterId);
    setSelectedChapterId(filtered[0].id);
    setSelectedPageId(filtered[0].pages[0].id);
    updateChaptersAndSync(filtered);
  };

  // PAGE MANAGEMENT
  const handleAddPage = (chapterId: string) => {
    const newPageId = `page-${Date.now()}`;
    const nextChapters = chapters.map((c) => {
      if (c.id === chapterId) {
        const newPage: EditorPage = {
          id: newPageId,
          content: `## Nova Página\nInsira mais conteúdo para este capítulo...`
        };
        return { ...c, pages: [...c.pages, newPage] };
      }
      return c;
    });
    setSelectedChapterId(chapterId);
    setSelectedPageId(newPageId);
    updateChaptersAndSync(nextChapters);
  };

  const handleDeletePage = (chapterId: string, pageId: string) => {
    const chapter = chapters.find((c) => c.id === chapterId);
    if (!chapter) return;
    
    if (chapter.pages.length <= 1) {
      alert("Este capítulo ficaria sem páginas. Exclua o capítulo se ele não for mais necessário.");
      return;
    }

    const nextChapters = chapters.map((c) => {
      if (c.id === chapterId) {
        return { ...c, pages: c.pages.filter((p) => p.id !== pageId) };
      }
      return c;
    });

    const remainingPages = chapter.pages.filter((p) => p.id !== pageId);
    if (remainingPages.length > 0) {
      setSelectedPageId(remainingPages[0].id);
    }
    updateChaptersAndSync(nextChapters);
  };

  const handleDuplicatePage = (chapterId: string, pageObj: EditorPage) => {
    const newPageId = `page-dup-${Date.now()}`;
    const nextChapters = chapters.map((c) => {
      if (c.id === chapterId) {
        const duplicate: EditorPage = {
          id: newPageId,
          content: pageObj.content
        };
        const index = c.pages.findIndex((p) => p.id === pageObj.id);
        const updatedPages = [...c.pages];
        updatedPages.splice(index + 1, 0, duplicate);
        return { ...c, pages: updatedPages };
      }
      return c;
    });
    setSelectedPageId(newPageId);
    updateChaptersAndSync(nextChapters);
  };

  const handleSplitPage = (chapterId: string, pageObj: EditorPage) => {
    const content = pageObj.content;
    const splitIndex = Math.floor(content.length / 2);
    const firstHalf = content.substring(0, splitIndex);
    const secondHalf = content.substring(splitIndex);

    const nextPageId = `page-split-${Date.now()}`;

    const nextChapters = chapters.map((c) => {
      if (c.id === chapterId) {
        const index = c.pages.findIndex((p) => p.id === pageObj.id);
        const updatedPages = [...c.pages];
        // Update first page
        updatedPages[index] = { ...pageObj, content: firstHalf };
        // Insert new second page
        updatedPages.splice(index + 1, 0, { id: nextPageId, content: secondHalf });
        return { ...c, pages: updatedPages };
      }
      return c;
    });
    setSelectedPageId(nextPageId);
    updateChaptersAndSync(nextChapters);
  };

  const handleMergePageWithNext = (chapterId: string, pageObj: EditorPage) => {
    const chapter = chapters.find((c) => c.id === chapterId);
    if (!chapter) return;

    const pageIndex = chapter.pages.findIndex((p) => p.id === pageObj.id);
    if (pageIndex === chapter.pages.length - 1) {
      alert("Não existe uma próxima página para fundir neste capítulo.");
      return;
    }

    const nextPage = chapter.pages[pageIndex + 1];
    const mergedContent = pageObj.content + "\n\n---\n\n" + nextPage.content;

    const nextChapters = chapters.map((c) => {
      if (c.id === chapterId) {
        const updatedPages = c.pages.filter((p) => p.id !== nextPage.id);
        updatedPages[pageIndex] = { ...pageObj, content: mergedContent };
        return { ...c, pages: updatedPages };
      }
      return c;
    });
    updateChaptersAndSync(nextChapters);
  };

  const handleMovePageUp = (chapterId: string, pageId: string) => {
    const chapterIdx = chapters.findIndex((c) => c.id === chapterId);
    if (chapterIdx === -1) return;
    const c = chapters[chapterIdx];
    const idx = c.pages.findIndex((p) => p.id === pageId);

    if (idx === 0) {
      // First page of the chapter - try to move to previous chapter
      if (chapterIdx === 0) {
        alert("Esta já é a primeira página do primeiro capítulo.");
        return;
      }
      if (c.pages.length <= 1) {
        alert("Não é possível mover a única página de um capítulo. Adicione outra página a este capítulo antes de transferi-la.");
        return;
      }
      
      const prevChapter = chapters[chapterIdx - 1];
      const pageToMove = c.pages[0];
      
      const nextChapters = chapters.map((chap, cIdx) => {
        if (cIdx === chapterIdx) {
          return { ...chap, pages: chap.pages.filter((p) => p.id !== pageId) };
        }
        if (cIdx === chapterIdx - 1) {
          return { ...chap, pages: [...chap.pages, pageToMove] };
        }
        return chap;
      });
      setSelectedChapterId(prevChapter.id);
      setSelectedPageId(pageId);
      updateChaptersAndSync(nextChapters);
      return;
    }

    const updated = [...c.pages];
    const temp = updated[idx];
    updated[idx] = updated[idx - 1];
    updated[idx - 1] = temp;

    const nextChapters = chapters.map((chap) => {
      if (chap.id === chapterId) {
        return { ...chap, pages: updated };
      }
      return chap;
    });
    updateChaptersAndSync(nextChapters);
  };

  const handleMovePageDown = (chapterId: string, pageId: string) => {
    const chapterIdx = chapters.findIndex((c) => c.id === chapterId);
    if (chapterIdx === -1) return;
    const c = chapters[chapterIdx];
    const idx = c.pages.findIndex((p) => p.id === pageId);

    if (idx === c.pages.length - 1) {
      // Last page of the chapter - try to move to next chapter
      if (chapterIdx === chapters.length - 1) {
        alert("Esta já é a última página do último capítulo.");
        return;
      }
      if (c.pages.length <= 1) {
        alert("Não é possível mover a única página de um capítulo. Adicione outra página a este capítulo antes de transferi-la.");
        return;
      }
      
      const nextChapter = chapters[chapterIdx + 1];
      const pageToMove = c.pages[idx];
      
      const nextChapters = chapters.map((chap, cIdx) => {
        if (cIdx === chapterIdx) {
          return { ...chap, pages: chap.pages.filter((p) => p.id !== pageId) };
        }
        if (cIdx === chapterIdx + 1) {
          return { ...chap, pages: [pageToMove, ...chap.pages] };
        }
        return chap;
      });
      setSelectedChapterId(nextChapter.id);
      setSelectedPageId(pageId);
      updateChaptersAndSync(nextChapters);
      return;
    }

    const updated = [...c.pages];
    const temp = updated[idx];
    updated[idx] = updated[idx + 1];
    updated[idx + 1] = temp;

    const nextChapters = chapters.map((chap) => {
      if (chap.id === chapterId) {
        return { ...chap, pages: updated };
      }
      return chap;
    });
    updateChaptersAndSync(nextChapters);
  };

  // DRAG & DROP PAGES REORDERING
  const handleDragDropPage = (
    sourceChapterId: string,
    sourcePageId: string,
    targetChapterId: string,
    targetPageId?: string
  ) => {
    if (sourcePageId === targetPageId) return;

    const sourceChapIdx = chapters.findIndex((c) => c.id === sourceChapterId);
    const targetChapIdx = chapters.findIndex((c) => c.id === targetChapterId);
    if (sourceChapIdx === -1 || targetChapIdx === -1) return;

    const sourceChap = chapters[sourceChapIdx];
    const targetChap = chapters[targetChapIdx];

    const sourcePageIdx = sourceChap.pages.findIndex((p) => p.id === sourcePageId);
    if (sourcePageIdx === -1) return;

    const pageToMove = sourceChap.pages[sourcePageIdx];

    if (sourceChapterId === targetChapterId) {
      // Reordering in same chapter
      const updatedPages = [...sourceChap.pages];
      updatedPages.splice(sourcePageIdx, 1);
      
      let targetPageIdx = targetPageId 
        ? updatedPages.findIndex((p) => p.id === targetPageId) 
        : updatedPages.length;
      
      if (targetPageIdx === -1) targetPageIdx = updatedPages.length;

      updatedPages.splice(targetPageIdx, 0, pageToMove);

      const nextChapters = chapters.map((chap) => {
        if (chap.id === sourceChapterId) {
          return { ...chap, pages: updatedPages };
        }
        return chap;
      });

      setSelectedChapterId(targetChapterId);
      setSelectedPageId(sourcePageId);
      updateChaptersAndSync(nextChapters);
    } else {
      // Moving to different chapter
      if (sourceChap.pages.length <= 1) {
        alert("Não é possível mover a única página de um capítulo. Adicione outra página a este capítulo antes de transferi-la.");
        return;
      }

      const nextChapters = chapters.map((chap, idx) => {
        if (idx === sourceChapIdx) {
          return { ...chap, pages: chap.pages.filter((p) => p.id !== sourcePageId) };
        }
        if (idx === targetChapIdx) {
          const updatedPages = [...chap.pages];
          let insertIdx = targetPageId 
            ? updatedPages.findIndex((p) => p.id === targetPageId)
            : updatedPages.length;
          
          if (insertIdx === -1) insertIdx = updatedPages.length;
          updatedPages.splice(insertIdx, 0, pageToMove);
          return { ...chap, pages: updatedPages };
        }
        return chap;
      });

      setSelectedChapterId(targetChapterId);
      setSelectedPageId(sourcePageId);
      updateChaptersAndSync(nextChapters);
    }
  };

  // MERGE / SPLIT CHAPTERS
  const handleSplitChapter = (chapterId: string) => {
    const chapterObj = chapters.find((c) => c.id === chapterId);
    if (!chapterObj || chapterObj.pages.length <= 1) {
      alert("É necessário ter pelo menos 2 páginas no capítulo para dividi-lo.");
      return;
    }

    const midPoint = Math.ceil(chapterObj.pages.length / 2);
    const firstHalfPages = chapterObj.pages.slice(0, midPoint);
    const secondHalfPages = chapterObj.pages.slice(midPoint);

    const nextChapterId = `chapter-split-${Date.now()}`;
    const newChapter: EditorChapter = {
      id: nextChapterId,
      title: `${chapterObj.title} (Parte II)`,
      pages: secondHalfPages
    };

    const chapterIndex = chapters.findIndex((c) => c.id === chapterId);
    const updatedChapters = [...chapters];
    updatedChapters[chapterIndex] = { ...chapterObj, pages: firstHalfPages };
    updatedChapters.splice(chapterIndex + 1, 0, newChapter);

    setSelectedChapterId(nextChapterId);
    setSelectedPageId(secondHalfPages[0].id);
    updateChaptersAndSync(updatedChapters);
  };

  const handleMergeChapterWithNext = (chapterId: string) => {
    const chapterIndex = chapters.findIndex((c) => c.id === chapterId);
    if (chapterIndex === chapters.length - 1) {
      alert("Não existe um próximo capítulo para fundir.");
      return;
    }

    const currentChapter = chapters[chapterIndex];
    const nextChapter = chapters[chapterIndex + 1];

    const mergedPages = [...currentChapter.pages, ...nextChapter.pages];
    const updatedChapters = chapters.filter((c) => c.id !== nextChapter.id);
    updatedChapters[chapterIndex] = { ...currentChapter, pages: mergedPages };

    updateChaptersAndSync(updatedChapters);
  };

  const handleMoveChapterUp = (chapterIndex: number) => {
    if (chapterIndex === 0) return;
    const updated = [...chapters];
    const temp = updated[chapterIndex];
    updated[chapterIndex] = updated[chapterIndex - 1];
    updated[chapterIndex - 1] = temp;
    updateChaptersAndSync(updated);
  };

  const handleMoveChapterDown = (chapterIndex: number) => {
    if (chapterIndex === chapters.length - 1) return;
    const updated = [...chapters];
    const temp = updated[chapterIndex];
    updated[chapterIndex] = updated[chapterIndex + 1];
    updated[chapterIndex + 1] = temp;
    updateChaptersAndSync(updated);
  };

  // PRE-PUBLISH VALIDATIONS
  const validateBeforePublish = () => {
    const checks = {
      cover: !!coverUrl,
      description: description.length > 30,
      summary: summaryText.length > 20,
      category: !!category,
      language: !!language,
      chaptersCount: chapters.length >= 1,
      pagesCount: stats.totalPages >= 1,
      emptyContent: chapters.every(c => c.pages.every(p => p.content.trim().length > 10)),
      isbn: isbn.length > 5
    };

    const allValid = Object.values(checks).every(Boolean);

    return {
      checks,
      allValid
    };
  };

  const validationResult = validateBeforePublish();

  // COMPILE AND PUBLISH (SAVE AND EXPORT WITH ACTIVE STATUS)
  const handlePublishSubmit = async () => {
    if (isSaving || saveLoading) return;
    setIsSaving(true);

    // Compile Chapters and Pages back to flat pdfContent array and generate table of contents
    const compiledPages: string[] = [];
    const compiledSummary: { title: string; page: number }[] = [];
    
    let currentPageNum = 1;
    chapters.forEach((c) => {
      compiledSummary.push({
        title: c.title,
        page: currentPageNum
      });
      c.pages.forEach((p) => {
        compiledPages.push(p.content);
        currentPageNum++;
      });
    });

    const payload: Partial<Book> = {
      title,
      author,
      category,
      description,
      coverUrl: coverUrl || "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=600&auto=format&fit=crop",
      language,
      publishDate: publishYear,
      audiobookAvailable,
      audioDuration: audiobookAvailable ? audioDuration : undefined,
      pdfContent: compiledPages,
      pages: compiledPages.length,
      estimatedReadTime: `${Math.max(1, Math.ceil(stats.totalWords / 200))} min`,
      isbn: isbn || undefined,
      keywords: keywords ? keywords.split(",").map((k) => k.trim()) : [],
      tags: tags ? tags.split(",").map((t) => t.trim()) : [],
      summary: compiledSummary,
      copyright: {
        status: copyrightStatus,
        licenseType: copyrightLicenseType
      },
      status: "Active" // Mark as Active on publish
    };

    try {
      await onSave(payload);
    } catch (err) {
      alert("Falha ao salvar as modificações do livro: " + err);
    } finally {
      setIsSaving(false);
    }
  };

  // COMPILE AND SAVE AS DRAFT
  const handleSaveDraft = async () => {
    if (isSaving || saveLoading) return;
    setIsSaving(true);

    const compiledPages: string[] = [];
    const compiledSummary: { title: string; page: number }[] = [];
    
    let currentPageNum = 1;
    chapters.forEach((c) => {
      compiledSummary.push({
        title: c.title,
        page: currentPageNum
      });
      c.pages.forEach((p) => {
        compiledPages.push(p.content);
        currentPageNum++;
      });
    });

    const payload: Partial<Book> = {
      title: title || "Manuscrito Sem Título",
      author: author || "Autor Desconhecido",
      category,
      description,
      coverUrl: coverUrl || "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=600&auto=format&fit=crop",
      language,
      publishDate: publishYear,
      audiobookAvailable,
      audioDuration: audiobookAvailable ? audioDuration : undefined,
      pdfContent: compiledPages,
      pages: compiledPages.length,
      estimatedReadTime: `${Math.max(1, Math.ceil(stats.totalWords / 200))} min`,
      isbn: isbn || undefined,
      keywords: keywords ? keywords.split(",").map((k) => k.trim()) : [],
      tags: tags ? tags.split(",").map((t) => t.trim()) : [],
      summary: compiledSummary,
      copyright: {
        status: copyrightStatus,
        licenseType: copyrightLicenseType
      },
      status: "Draft" // Mark as Draft
    };

    try {
      await onSave(payload);
      alert("Manuscrito guardado com sucesso como RASCUNHO!");
      onClose();
    } catch (err) {
      alert("Falha ao guardar rascunho: " + err);
    } finally {
      setIsSaving(false);
    }
  };

  // COMPILE AND SAVE KEEPING CURRENT STATUS
  const handleSaveKeepStatus = async () => {
    if (isSaving || saveLoading) return;
    setIsSaving(true);

    const compiledPages: string[] = [];
    const compiledSummary: { title: string; page: number }[] = [];
    
    let currentPageNum = 1;
    chapters.forEach((c) => {
      compiledSummary.push({
        title: c.title,
        page: currentPageNum
      });
      c.pages.forEach((p) => {
        compiledPages.push(p.content);
        currentPageNum++;
      });
    });

    const currentStatus = book?.status || "Draft";

    const payload: Partial<Book> = {
      title: title || book?.title || "Manuscrito Sem Título",
      author: author || book?.author || "Autor Desconhecido",
      category,
      description,
      coverUrl: coverUrl || "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=600&auto=format&fit=crop",
      language,
      publishDate: publishYear,
      audiobookAvailable,
      audioDuration: audiobookAvailable ? audioDuration : undefined,
      pdfContent: compiledPages,
      pages: compiledPages.length,
      estimatedReadTime: `${Math.max(1, Math.ceil(stats.totalWords / 200))} min`,
      isbn: isbn || undefined,
      keywords: keywords ? keywords.split(",").map((k) => k.trim()) : [],
      tags: tags ? tags.split(",").map((t) => t.trim()) : [],
      summary: compiledSummary,
      copyright: {
        status: copyrightStatus,
        licenseType: copyrightLicenseType
      },
      status: currentStatus
    };

    try {
      const savedBook = await onSave(payload, { keepOpen: true });
      if (savedBook && savedBook.id) {
        loadedBookIdRef.current = savedBook.id;
      }
      alert(`Livro guardado com sucesso! Status mantido como: ${currentStatus}`);
    } catch (err) {
      alert("Falha ao guardar o livro: " + err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#121212]/70 backdrop-blur-sm flex items-center justify-center p-0 md:p-4 overflow-hidden">
      <div className="bg-[#FAF9F5] w-full h-full md:max-w-7xl md:h-[95vh] md:rounded-3xl border border-[#ece9dc] shadow-2xl flex flex-col overflow-hidden text-zinc-900">
        
        {/* TOP CONTROL NAVIGATION */}
        <div className="bg-white border-b border-[#ece9dc] px-6 py-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#8a7e58]/10 text-[#8a7e58] rounded-xl border border-[#8a7e58]/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-serif font-bold text-[#2d291c] leading-none">
                  {book ? `Editar Obra: ${book.title}` : "Novo Manuscrito Editorial"}
                </h1>
                <span className="text-[10px] bg-amber-50 border border-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider">
                  Pro-Editor v2.1
                </span>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Ambiente integrado de fatiamento de páginas e sumário dinâmico.</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 justify-end">
            {/* SAVED TIMELINE INDICATOR */}
            <div className="hidden lg:flex items-center gap-1.5 text-[10px] font-mono text-zinc-400 bg-zinc-50 border border-zinc-100 px-3 py-1.5 rounded-xl">
              <span className={`w-1.5 h-1.5 rounded-full ${isDirty ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
              <span>{lastSavedText}</span>
            </div>

            {/* VIEWER SWITCH */}
            <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
              <button
                onClick={() => setViewMode("editor")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  viewMode === "editor" ? "bg-white text-zinc-900 shadow-xs" : "text-gray-500 hover:text-gray-800"
                }`}
              >
                <FileEdit className="w-3.5 h-3.5" /> Editor
              </button>
              <button
                onClick={() => setViewMode("reader")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  viewMode === "reader" ? "bg-white text-zinc-900 shadow-xs" : "text-gray-500 hover:text-gray-800"
                }`}
              >
                <Eye className="w-3.5 h-3.5" /> Leitor
              </button>
            </div>

            {/* BUTTON CONTROLS */}
            <div className="flex items-center gap-2">
              {/* TOOL GROUP (METADATA, STATS, HISTORY) */}
              <div className="flex bg-zinc-100/80 border border-zinc-200/60 p-0.5 rounded-xl items-center gap-0.5 shadow-inner">
                <button
                  onClick={() => setWizardStep(1)}
                  className="px-2.5 py-1.5 hover:bg-white text-zinc-600 hover:text-zinc-900 rounded-lg transition cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                  title="Configurações e Metadados do Livro"
                >
                  <Settings className="w-3.5 h-3.5 text-[#8a7e58]" />
                  <span className="hidden sm:inline">Metadados</span>
                </button>
                
                <div className="w-px h-3 bg-zinc-200/80" />

                <button
                  onClick={() => setShowStatsModal(true)}
                  className="p-1.5 hover:bg-white text-zinc-600 hover:text-zinc-900 rounded-lg transition cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                  title="Métricas em tempo real"
                >
                  <BarChart2 className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="hidden md:inline">Métricas</span>
                </button>

                <div className="w-px h-3 bg-zinc-200/80" />

                <button
                  onClick={() => setShowHistoryModal(true)}
                  className="p-1.5 hover:bg-white text-zinc-600 hover:text-zinc-900 rounded-lg transition cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                  title="Histórico de Versões"
                >
                  <History className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="hidden md:inline">Histórico</span>
                </button>
              </div>

              {/* UNIFIED SAVE & ACTION CONTROL (SPLIT DROPDOWN) */}
              <div className="relative flex items-center bg-[#8a7e58] text-white rounded-xl shadow-sm border border-[#7a6f4a]">
                {/* Main Action: Guardar (keeps current status) */}
                <button
                  onClick={handleSaveKeepStatus}
                  disabled={isSaving || saveLoading}
                  className="px-3 py-2 hover:bg-[#7a6f4a] text-white rounded-l-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border-r border-[#7a6f4a]/60"
                  title={`Guardar Alterações (Mantém status atual: ${book?.status || "Draft"})`}
                >
                  {isSaving ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-zinc-300" />
                  ) : (
                    <Save className="w-3.5 h-3.5 text-amber-100" />
                  )}
                  <span>Guardar</span>
                </button>

                {/* Dropdown Chevron */}
                <button
                  onClick={() => setShowSaveDropdown(!showSaveDropdown)}
                  disabled={isSaving || saveLoading}
                  className="px-2 py-2 hover:bg-[#7a6f4a] text-white rounded-r-xl transition cursor-pointer flex items-center justify-center disabled:opacity-50"
                  title="Mais opções de salvamento"
                >
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showSaveDropdown ? "rotate-180" : ""}`} />
                </button>

                {/* Floating Options Dropdown Menu */}
                <AnimatePresence>
                  {showSaveDropdown && (
                    <>
                      {/* Invisible backdrop helper */}
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setShowSaveDropdown(false)} 
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-64 bg-white border border-[#ece9dc] rounded-2xl shadow-xl py-1.5 z-50 text-left overflow-hidden text-zinc-800"
                      >
                        {/* Option 1: Guardar como Rascunho */}
                        <button
                          onClick={() => {
                            setShowSaveDropdown(false);
                            handleSaveDraft();
                          }}
                          disabled={isSaving || saveLoading}
                          className="w-full px-4 py-2.5 hover:bg-[#FAF9F5] text-xs flex items-center gap-3 transition cursor-pointer text-left disabled:opacity-50"
                        >
                          <div className="p-1.5 bg-zinc-100 text-zinc-600 rounded-lg">
                            <FileText className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-zinc-700">Guardar como Rascunho</span>
                            <span className="text-[9px] text-zinc-400">Status muda para "Draft"</span>
                          </div>
                        </button>

                        <div className="border-t border-zinc-100 my-1" />

                        {/* Option 2: Finalizar & Publicar */}
                        <button
                          onClick={() => {
                            setShowSaveDropdown(false);
                            setShowChecklistModal(true);
                          }}
                          disabled={isSaving || saveLoading}
                          className="w-full px-4 py-2.5 hover:bg-emerald-50 text-xs flex items-center gap-3 transition cursor-pointer text-left disabled:opacity-50"
                        >
                          <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-emerald-800">Finalizar & Publicar</span>
                            <span className="text-[9px] text-emerald-600/80">Valida requisitos e ativa obra</span>
                          </div>
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* CLOSE BUTTON */}
              <button
                onClick={onClose}
                className="p-2 hover:bg-red-50 text-red-500 hover:text-red-700 rounded-xl border border-transparent hover:border-red-100 transition cursor-pointer"
                title="Sair do editor"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* WIZARD SCREENS (Only if creating new book and not in editor step 3 yet) */}
        {wizardStep === 1 && (
          <div className="flex-grow overflow-y-auto p-6 md:p-12 max-w-3xl mx-auto w-full text-left flex flex-col justify-start">
            <div className="space-y-6 bg-white p-8 border border-[#ece9dc] rounded-3xl shadow-sm">
              <div className="border-b border-[#ece9dc] pb-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[#8a7e58] font-bold uppercase tracking-wider font-mono">Etapa 1 de 2</span>
                  <h2 className="text-xl font-serif font-bold text-zinc-900 mt-1">Configurar Ficha Catalográfica</h2>
                  <p className="text-xs text-gray-400 mt-1">Preencha com exatidão as informações bibliográficas da obra.</p>
                </div>
                <button
                  type="button"
                  onClick={handleAiAutocomplete}
                  disabled={aiWorking || !title}
                  className="px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-[#8a7e58] text-[11px] font-bold rounded-xl border border-amber-500/20 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                  title="Gera subtítulo, sinopse, ISBN, categoria e tags baseado no título usando IA"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                  <span>Autocompletar com IA</span>
                </button>
              </div>

              <form onSubmit={handleWizardStep1Submit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 block">Título do Livro *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Dom Casmurro"
                      className="w-full bg-zinc-50 border border-[#ece9dc] focus:bg-white text-zinc-900 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-[#8a7e58]"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 block">Subtítulo (Opcional)</label>
                    <input
                      type="text"
                      placeholder="Ex: Uma reflexão sobre os olhos de ressaca"
                      className="w-full bg-zinc-50 border border-[#ece9dc] focus:bg-white text-zinc-900 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-[#8a7e58]"
                      value={subtitle}
                      onChange={(e) => setSubtitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 block">Autor da Obra *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Machado de Assis"
                      className="w-full bg-zinc-50 border border-[#ece9dc] focus:bg-white text-zinc-900 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-[#8a7e58]"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 block">Categoria Literária *</label>
                    <select
                      className="w-full bg-zinc-50 border border-[#ece9dc] focus:bg-white text-zinc-900 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-[#8a7e58] cursor-pointer font-semibold"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
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
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 block">Idioma *</label>
                    <select
                      className="w-full bg-zinc-50 border border-[#ece9dc] focus:bg-white text-zinc-900 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-[#8a7e58] cursor-pointer font-semibold"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                    >
                      <option value="Português">Português</option>
                      <option value="Inglês">Inglês</option>
                      <option value="Espanhol">Espanhol</option>
                      <option value="Francês">Francês</option>
                      <option value="Alemão">Alemão</option>
                      <option value="Italiano">Italiano</option>
                      <option value="Mandarim">Mandarim</option>
                      <option value="Japonês">Japonês</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 block">Editora Responsável</label>
                    <input
                      type="text"
                      placeholder="Ex: BookVerse Editorial"
                      className="w-full bg-zinc-50 border border-[#ece9dc] focus:bg-white text-zinc-900 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-[#8a7e58]"
                      value={publisher}
                      onChange={(e) => setPublisher(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 block">Ano de Publicação</label>
                    <input
                      type="text"
                      placeholder="Ex: 1899"
                      className="w-full bg-zinc-50 border border-[#ece9dc] focus:bg-white text-zinc-900 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-[#8a7e58]"
                      value={publishYear}
                      onChange={(e) => setPublishYear(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 block">Código ISBN</label>
                    <input
                      type="text"
                      placeholder="Ex: 978-65-00-00000-0"
                      className="w-full bg-zinc-50 border border-[#ece9dc] focus:bg-white text-zinc-900 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-[#8a7e58]"
                      value={isbn}
                      onChange={(e) => setIsbn(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 block">Direitos Autorais / Situação Legal *</label>
                    <select
                      className="w-full bg-zinc-50 border border-[#ece9dc] focus:bg-white text-zinc-900 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-[#8a7e58] cursor-pointer font-semibold"
                      value={copyrightStatus}
                      onChange={(e) => setCopyrightStatus(e.target.value as any)}
                    >
                      <option value="public_domain">Domínio Público (Liberado)</option>
                      <option value="licensed">Licenciado (Distribuição sob regras)</option>
                      <option value="commercial">Comercial (Restrito/Compra Requerida)</option>
                      <option value="exclusive">Exclusivo (Plataforma BookVerse)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 block">Código da Licença / Regra de Acesso</label>
                    <input
                      type="text"
                      placeholder="Ex: creative_commons, standard_platform, purchase_required"
                      className="w-full bg-zinc-50 border border-[#ece9dc] focus:bg-white text-zinc-900 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-[#8a7e58]"
                      value={copyrightLicenseType}
                      onChange={(e) => setCopyrightLicenseType(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 block">Sinopse da Obra (Resumo para leitores) *</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Faça uma breve descrição cativante que será exibida no card do livro..."
                    className="w-full bg-zinc-50 border border-[#ece9dc] focus:bg-white text-zinc-900 rounded-xl p-3 text-xs outline-none focus:ring-1 focus:ring-[#8a7e58]"
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      setSummaryText(e.target.value);
                    }}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 block">Palavras-chave (Separadas por vírgula)</label>
                    <input
                      type="text"
                      placeholder="Ex: realismo, machado de assis, bentinho, capitú"
                      className="w-full bg-zinc-50 border border-[#ece9dc] focus:bg-white text-zinc-900 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-[#8a7e58]"
                      value={keywords}
                      onChange={(e) => setKeywords(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 block">Capa do Livro (Upload ou Link)</label>
                    <div className="flex gap-3 items-start bg-zinc-50/50 p-2 border border-[#ece9dc] rounded-xl">
                      {coverUrl ? (
                        <div className="relative w-14 h-20 border border-zinc-200 rounded-lg overflow-hidden bg-white flex-shrink-0">
                          <img src={coverUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="Capa" />
                          <button
                            type="button"
                            onClick={() => setCoverUrl("")}
                            className="absolute top-0.5 right-0.5 p-0.5 bg-red-600 hover:bg-red-700 text-white rounded-full transition shadow-md cursor-pointer"
                            title="Remover Capa"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-14 h-20 border-2 border-dashed border-zinc-200 rounded-lg bg-zinc-100 flex flex-col items-center justify-center text-zinc-400 flex-shrink-0">
                          <Image className="w-5 h-5 stroke-[1.5]" />
                        </div>
                      )}
                      
                      <div className="flex-grow space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1.5 px-3 py-1.5 bg-[#8a7e58]/10 hover:bg-[#8a7e58]/20 text-[#8a7e58] rounded-lg text-[10px] font-bold cursor-pointer transition border border-[#8a7e58]/20">
                            <Upload className="w-3.5 h-3.5" />
                            Enviar Arquivo de Imagem
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  compressAndSetCover(file);
                                }
                              }}
                            />
                          </label>
                          <span className="text-[9px] text-zinc-400 font-mono">Auto-otimizada &lt; 100KB</span>
                        </div>
                        
                        <input
                          type="url"
                          placeholder="Ou cole a URL da imagem (Ex: https://...)"
                          className="w-full bg-white border border-[#ece9dc] focus:bg-white text-zinc-900 rounded-lg px-2.5 py-1 text-[11px] outline-none focus:ring-1 focus:ring-[#8a7e58]"
                          value={coverUrl && coverUrl.startsWith("data:") ? "" : coverUrl}
                          onChange={(e) => setCoverUrl(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#ece9dc] flex justify-end">
                  <button
                    type="submit"
                    className="bg-[#8a7e58] hover:bg-[#4a432d] text-white px-6 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-1.5"
                  >
                    Prosseguir <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {wizardStep === 2 && (
          <div className="flex-grow overflow-y-auto p-6 md:p-12 max-w-4xl mx-auto w-full text-left flex flex-col justify-start">
            <div className="space-y-6 bg-white p-8 border border-[#ece9dc] rounded-3xl shadow-sm">
              <div className="border-b border-[#ece9dc] pb-4 flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-[#8a7e58] font-bold uppercase tracking-wider font-mono">Etapa 2 de 2</span>
                  <h2 className="text-xl font-serif font-bold text-zinc-900 mt-1">Fonte de Conteúdo do Manuscrito</h2>
                  <p className="text-xs text-gray-400 mt-1">Como você deseja carregar ou iniciar o texto do livro?</p>
                </div>
                <button 
                  onClick={() => setWizardStep(1)}
                  className="text-xs text-gray-500 hover:text-zinc-800 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" /> Voltar Ficha
                </button>
              </div>

              {importing ? (
                <div className="p-8 text-center bg-zinc-50 border border-zinc-100 rounded-2xl space-y-4">
                  <RefreshCw className="w-10 h-10 text-[#8a7e58] animate-spin mx-auto" />
                  <div>
                    <h3 className="text-sm font-serif font-bold text-zinc-800">{importStatus}</h3>
                    <div className="w-full max-w-md bg-gray-200 h-2 rounded-full mx-auto mt-2 overflow-hidden">
                      <div className="bg-[#8a7e58] h-full transition-all duration-300" style={{ width: `${importProgress}%` }}></div>
                    </div>
                  </div>
                  
                  <div className="bg-zinc-900 text-[#ece9dc] font-mono text-[10px] p-4 rounded-xl max-h-40 overflow-y-auto text-left space-y-1.5 shadow-inner">
                    {importLogs.map((log, i) => (
                      <div key={i} className="animate-fadeIn">{log}</div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Option 1: Manual */}
                  <div 
                    onClick={handleManualCreation}
                    className="border border-[#ece9dc] hover:border-[#8a7e58] bg-white hover:bg-zinc-50/50 p-6 rounded-2xl cursor-pointer transition flex flex-col justify-between h-48 group"
                  >
                    <div className="space-y-2">
                      <div className="p-2.5 bg-zinc-100 text-zinc-700 rounded-xl w-fit group-hover:bg-[#8a7e58]/10 group-hover:text-[#8a7e58] transition">
                        <Edit3 className="w-5 h-5" />
                      </div>
                      <h3 className="text-xs font-bold text-zinc-800">Criar Manuscrito Manual</h3>
                      <p className="text-[10px] text-gray-400 leading-relaxed">Abra diretamente um editor rico em branco com um esqueleto de capítulo e escreva do zero.</p>
                    </div>
                    <span className="text-[10px] text-[#8a7e58] font-bold tracking-wider flex items-center gap-1">Iniciar Editor <ChevronRight className="w-3 h-3" /></span>
                  </div>

                  {/* Option 2: Import */}
                  <div className="border border-[#ece9dc] hover:border-[#8a7e58] bg-white hover:bg-zinc-50/50 p-6 rounded-2xl transition flex flex-col justify-between h-48 relative group">
                    <input
                      type="file"
                      accept=".pdf,.epub,.docx,.txt,.md"
                      onChange={handleFileImport}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                    <div className="space-y-2">
                      <div className="p-2.5 bg-zinc-100 text-zinc-700 rounded-xl w-fit group-hover:bg-[#8a7e58]/10 group-hover:text-[#8a7e58] transition">
                        <Upload className="w-5 h-5" />
                      </div>
                      <h3 className="text-xs font-bold text-zinc-800">Importar do Computador</h3>
                      <p className="text-[10px] text-gray-400 leading-relaxed">Suporta arquivos PDF, EPUB, DOCX, TXT e Markdown. Fatiamos o texto automaticamente para você!</p>
                    </div>
                    <span className="text-[10px] text-[#8a7e58] font-bold tracking-wider flex items-center gap-1">Escolher Arquivo <ChevronRight className="w-3 h-3" /></span>
                  </div>

                  {/* Option 3: Continue Draft */}
                  <div 
                    onClick={handleContinueDraft}
                    className="border border-[#ece9dc] hover:border-[#8a7e58] bg-white hover:bg-zinc-50/50 p-6 rounded-2xl cursor-pointer transition flex flex-col justify-between h-48 group"
                  >
                    <div className="space-y-2">
                      <div className="p-2.5 bg-zinc-100 text-zinc-700 rounded-xl w-fit group-hover:bg-[#8a7e58]/10 group-hover:text-[#8a7e58] transition">
                        <History className="w-5 h-5" />
                      </div>
                      <h3 className="text-xs font-bold text-zinc-800">Manter Modelo Atual</h3>
                      <p className="text-[10px] text-gray-400 leading-relaxed">Continua com a formatação padrão em rascunho com o modelo sugerido de leitura do BookVerse.</p>
                    </div>
                    <span className="text-[10px] text-[#8a7e58] font-bold tracking-wider flex items-center gap-1">Seguir Rascunho <ChevronRight className="w-3 h-3" /></span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MAIN WORKSPACE VIEW (STEP 3) */}
        {wizardStep === 3 && (
          <div className="flex-grow flex overflow-hidden">
            
            {/* If closed, show a collapsed toggle handle on the left side */}
            {!showStructureSidebar && viewMode === "editor" && (
              <button
                type="button"
                onClick={() => setShowStructureSidebar(true)}
                className="w-8 border-r border-[#ece9dc] bg-[#FAF9F5] hover:bg-[#FAF9F5]/80 flex flex-col items-center justify-start py-4 text-[#8a7e58] hover:text-[#4a432d] transition cursor-pointer flex-shrink-0 gap-2"
                title="Abrir Estrutura do Livro"
              >
                <ChevronRight className="w-4 h-4" />
                <span className="text-[9px] font-bold uppercase tracking-wider [writing-mode:vertical-lr]">Estrutura</span>
              </button>
            )}

            {/* SIDEBAR NAVIGATION (COLLAPSIBLE / RICH CAPÍTULOS & PÁGINAS) */}
            {viewMode === "editor" && showStructureSidebar && (
              <div className="w-64 border-r border-[#ece9dc] bg-white flex flex-col justify-between flex-shrink-0">
                
                {/* Upper Sidebar: Chapters & Pages list */}
                <div className="flex-grow flex flex-col overflow-hidden">
                  <div className="p-4 border-b border-[#ece9dc] flex justify-between items-center bg-[#FAF9F5]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <button
                        type="button"
                        onClick={() => setShowStructureSidebar(false)}
                        className="p-1 hover:bg-zinc-200 text-gray-500 rounded-lg transition flex-shrink-0"
                        title="Fechar lateralmente"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider truncate">Estrutura</span>
                    </div>
                    <button
                      onClick={handleAddChapter}
                      className="p-1 hover:bg-zinc-100 text-[#8a7e58] rounded-md transition flex items-center gap-0.5 text-[10px] font-bold cursor-pointer border border-[#ece9dc] flex-shrink-0"
                    >
                      <Plus className="w-3 h-3" /> Cap.
                    </button>
                  </div>

                  {/* Chapters Scroll Area */}
                  <div className="flex-grow overflow-y-auto p-2 space-y-3">
                    {chapters.map((chap, chapIdx) => {
                      const isSelectedChapter = chap.id === selectedChapterId;
                      
                      return (
                        <div key={chap.id} className="space-y-1">
                          
                          {/* Chapter Item Header */}
                          <div 
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.currentTarget.classList.add("bg-[#8a7e58]/10", "border-dashed", "border-[#8a7e58]");
                            }}
                            onDragLeave={(e) => {
                              e.currentTarget.classList.remove("bg-[#8a7e58]/10", "border-dashed", "border-[#8a7e58]");
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.currentTarget.classList.remove("bg-[#8a7e58]/10", "border-dashed", "border-[#8a7e58]");
                              try {
                                const dataStr = e.dataTransfer.getData("text/plain");
                                if (dataStr) {
                                  const { chapterId: sourceChapterId, pageId: sourcePageId } = JSON.parse(dataStr);
                                  handleDragDropPage(sourceChapterId, sourcePageId, chap.id, undefined);
                                }
                              } catch (err) {
                                console.error("Erro no drop no capítulo:", err);
                              }
                            }}
                            className={`p-2 rounded-xl flex items-center justify-between gap-1 transition ${
                              isSelectedChapter ? "bg-zinc-100/80 border border-zinc-200" : "hover:bg-zinc-50 border border-transparent"
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0 flex-grow">
                              <span className="text-[10px] text-gray-400 font-mono">#{chapIdx + 1}</span>
                              <input
                                type="text"
                                value={chap.title}
                                onChange={(e) => handleRenameChapter(chap.id, e.target.value)}
                                className={`text-[11px] font-serif font-bold bg-transparent border-none outline-none focus:ring-1 focus:ring-zinc-400 focus:bg-white text-zinc-900 p-0.5 rounded min-w-0 w-full`}
                              />
                            </div>
                            
                            {/* Chapter Actions */}
                            <div className="flex items-center gap-0.5 opacity-60 hover:opacity-100 transition flex-shrink-0">
                              <button 
                                onClick={() => handleMoveChapterUp(chapIdx)}
                                disabled={chapIdx === 0}
                                className="p-0.5 hover:bg-zinc-200 rounded disabled:opacity-30 cursor-pointer"
                                title="Mover Capítulo para Cima"
                              >
                                <ChevronUp className="w-3 h-3" />
                              </button>
                              <button 
                                onClick={() => handleMoveChapterDown(chapIdx)}
                                disabled={chapIdx === chapters.length - 1}
                                className="p-0.5 hover:bg-zinc-200 rounded disabled:opacity-30 cursor-pointer"
                                title="Mover Capítulo para Baixo"
                              >
                                <ChevronDown className="w-3 h-3" />
                              </button>
                              <button 
                                onClick={() => handleSplitChapter(chap.id)}
                                className="p-0.5 hover:bg-zinc-200 rounded cursor-pointer"
                                title="Dividir Capítulo ao Meio"
                              >
                                <Split className="w-3 h-3 text-amber-600" />
                              </button>
                              <button 
                                onClick={() => handleMergeChapterWithNext(chap.id)}
                                disabled={chapIdx === chapters.length - 1}
                                className="p-0.5 hover:bg-zinc-200 rounded disabled:opacity-30 cursor-pointer"
                                title="Mesclar com Próximo Capítulo"
                              >
                                <Merge className="w-3 h-3 text-emerald-600" />
                              </button>
                              <button 
                                onClick={() => handleDeleteChapter(chap.id)}
                                className="p-0.5 hover:bg-red-50 text-red-500 rounded cursor-pointer"
                                title="Excluir Capítulo"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {/* Pages under Chapter (Collapsible or always visible) */}
                          <div className="pl-3 border-l border-[#ece9dc] ml-3.5 space-y-1">
                            {chap.pages.map((page, pageIdx) => {
                              const isSelectedPage = page.id === selectedPageId;
                              return (
                                <div 
                                  key={page.id}
                                  draggable={true}
                                  onDragStart={(e) => {
                                    e.stopPropagation();
                                    e.dataTransfer.setData("text/plain", JSON.stringify({ chapterId: chap.id, pageId: page.id }));
                                    e.dataTransfer.effectAllowed = "move";
                                    e.currentTarget.classList.add("opacity-40", "border-dashed", "border-[#8a7e58]");
                                  }}
                                  onDragEnd={(e) => {
                                    e.stopPropagation();
                                    e.currentTarget.classList.remove("opacity-40", "border-dashed", "border-[#8a7e58]");
                                  }}
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    e.currentTarget.classList.add("bg-[#8a7e58]/10", "border-dashed", "border-[#8a7e58]/30");
                                  }}
                                  onDragLeave={(e) => {
                                    e.stopPropagation();
                                    e.currentTarget.classList.remove("bg-[#8a7e58]/10", "border-dashed", "border-[#8a7e58]/30");
                                  }}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    e.currentTarget.classList.remove("bg-[#8a7e58]/10", "border-dashed", "border-[#8a7e58]/30");
                                    try {
                                      const dataStr = e.dataTransfer.getData("text/plain");
                                      if (dataStr) {
                                        const { chapterId: sourceChapterId, pageId: sourcePageId } = JSON.parse(dataStr);
                                        handleDragDropPage(sourceChapterId, sourcePageId, chap.id, page.id);
                                      }
                                    } catch (err) {
                                      console.error("Erro no drop da página:", err);
                                    }
                                  }}
                                  onClick={() => {
                                    setSelectedChapterId(chap.id);
                                    setSelectedPageId(page.id);
                                  }}
                                  className={`p-1.5 rounded-lg flex items-center justify-between gap-1 cursor-grab active:cursor-grabbing transition text-[10px] select-none ${
                                    isSelectedPage 
                                      ? "bg-[#8a7e58]/15 text-[#8a7e58] border border-[#8a7e58]/20 font-bold" 
                                      : "hover:bg-zinc-100 text-gray-500 hover:text-zinc-800"
                                  }`}
                                  title="Arraste para mover ou reordenar esta página"
                                >
                                  <span className="truncate">
                                    Pág. {pageIdx + 1} - {page.content.substring(0, 15).replace(/[#*_>\[\]]/g, "") || "Vazia..."}
                                  </span>

                                  {/* Page Actions */}
                                  {isSelectedPage && (
                                    <div className="flex items-center gap-0.5 flex-shrink-0 animate-fadeIn">
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleMovePageUp(chap.id, page.id);
                                        }}
                                        disabled={chapIdx === 0 && pageIdx === 0}
                                        className="p-0.5 hover:bg-[#8a7e58]/10 text-zinc-600 rounded disabled:opacity-30 cursor-pointer"
                                        title={pageIdx === 0 ? "Transferir para capítulo anterior" : "Subir página"}
                                      >
                                        <ChevronUp className="w-2.5 h-2.5" />
                                      </button>
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleMovePageDown(chap.id, page.id);
                                        }}
                                        disabled={chapIdx === chapters.length - 1 && pageIdx === chap.pages.length - 1}
                                        className="p-0.5 hover:bg-[#8a7e58]/10 text-zinc-600 rounded disabled:opacity-30 cursor-pointer"
                                        title={pageIdx === chap.pages.length - 1 ? "Transferir para próximo capítulo" : "Descer página"}
                                      >
                                        <ChevronDown className="w-2.5 h-2.5" />
                                      </button>
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDuplicatePage(chap.id, page);
                                        }}
                                        className="p-0.5 hover:bg-[#8a7e58]/10 text-zinc-600 rounded cursor-pointer"
                                        title="Duplicar página"
                                      >
                                        <Copy className="w-2.5 h-2.5" />
                                      </button>
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSplitPage(chap.id, page);
                                        }}
                                        className="p-0.5 hover:bg-[#8a7e58]/10 text-amber-600 rounded cursor-pointer"
                                        title="Fatiar página ao meio"
                                      >
                                        <Split className="w-2.5 h-2.5" />
                                      </button>
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleMergePageWithNext(chap.id, page);
                                        }}
                                        className="p-0.5 hover:bg-[#8a7e58]/10 text-emerald-600 rounded cursor-pointer"
                                        title="Mesclar com próxima página"
                                      >
                                        <Merge className="w-2.5 h-2.5" />
                                      </button>
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeletePage(chap.id, page.id);
                                        }}
                                        className="p-0.5 hover:bg-red-50 text-red-500 rounded cursor-pointer"
                                        title="Excluir página"
                                      >
                                        <Trash2 className="w-2.5 h-2.5" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            <button
                              onClick={() => handleAddPage(chap.id)}
                              className="w-full py-1 mt-1 border border-dashed border-gray-200 hover:border-[#8a7e58] hover:text-[#8a7e58] text-gray-400 rounded-lg text-[9px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" /> Adicionar Página
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Lower Sidebar: Book Stats summary card */}
                <div className="p-3 bg-zinc-50 border-t border-[#ece9dc] space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                    <span>Métricas Totais</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-left">
                    <div className="bg-white border border-[#ece9dc] p-2 rounded-xl">
                      <span className="text-[8px] text-gray-400 font-bold uppercase block">Páginas</span>
                      <span className="text-xs font-serif font-bold text-zinc-900">{stats.totalPages}</span>
                    </div>
                    <div className="bg-white border border-[#ece9dc] p-2 rounded-xl">
                      <span className="text-[8px] text-gray-400 font-bold uppercase block">Palavras</span>
                      <span className="text-xs font-serif font-bold text-zinc-900">{stats.totalWords}</span>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* MAIN WORK AREA */}
            <div className="flex-1 flex flex-col bg-white overflow-hidden text-left">
              
              {viewMode === "editor" ? (
                <>
                  {/* EDIT MODE ACTIONS & FORMATTING TOOLBAR */}
                  <div className="bg-[#FAF9F5] border-b border-[#ece9dc] px-4 py-2 flex flex-wrap items-center justify-between gap-2.5 flex-shrink-0">
                    
                    {/* Visual Tab Mode Selector */}
                    <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                      <button
                        onClick={() => setEditorTab("visual")}
                        className={`px-2.5 py-1 rounded text-[10px] font-bold transition cursor-pointer ${
                          editorTab === "visual" ? "bg-white text-zinc-900 shadow-xs" : "text-gray-500"
                        }`}
                      >
                        Visual Preview
                      </button>
                      <button
                        onClick={() => setEditorTab("markdown")}
                        className={`px-2.5 py-1 rounded text-[10px] font-bold transition cursor-pointer ${
                          editorTab === "markdown" ? "bg-white text-zinc-900 shadow-xs" : "text-gray-500"
                        }`}
                      >
                        Markdown Bruto
                      </button>
                    </div>

                    {/* FORMATTING BUTTONS */}
                    <div className="flex items-center gap-1 overflow-x-auto">
                      <button 
                        onClick={() => insertMarkdown("**", "**")} 
                        className="p-1 hover:bg-zinc-200 rounded text-xs font-bold text-zinc-700 cursor-pointer"
                        title="Negrito"
                      >
                        B
                      </button>
                      <button 
                        onClick={() => insertMarkdown("*", "*")} 
                        className="p-1 hover:bg-zinc-200 rounded text-xs italic text-zinc-700 cursor-pointer"
                        title="Itálico"
                      >
                        I
                      </button>
                      <button 
                        onClick={() => insertMarkdown("<u>", "</u>")} 
                        className="p-1 hover:bg-zinc-200 rounded text-xs underline text-zinc-700 cursor-pointer"
                        title="Sublinhado"
                      >
                        U
                      </button>
                      <button 
                        onClick={() => insertMarkdown("~~", "~~")} 
                        className="p-1 hover:bg-zinc-200 rounded text-xs line-through text-zinc-700 cursor-pointer"
                        title="Tachado"
                      >
                        S
                      </button>
                      <button 
                        onClick={() => insertMarkdown("`", "`")} 
                        className="p-1 hover:bg-zinc-200 rounded text-xs font-mono text-zinc-700 cursor-pointer"
                        title="Código Inline"
                      >
                        &lt;/&gt;
                      </button>

                      <div className="w-px h-4 bg-zinc-200 mx-1"></div>

                      <button 
                        onClick={() => insertMarkdown("# ", "")} 
                        className="p-1 hover:bg-zinc-200 rounded text-xs font-bold text-zinc-700 cursor-pointer"
                        title="Título H1"
                      >
                        H1
                      </button>
                      <button 
                        onClick={() => insertMarkdown("## ", "")} 
                        className="p-1 hover:bg-zinc-200 rounded text-xs font-bold text-zinc-700 cursor-pointer"
                        title="Título H2"
                      >
                        H2
                      </button>
                      <button 
                        onClick={() => insertMarkdown("### ", "")} 
                        className="p-1 hover:bg-zinc-200 rounded text-xs font-bold text-zinc-700 cursor-pointer"
                        title="Título H3"
                      >
                        H3
                      </button>

                      <div className="w-px h-4 bg-zinc-200 mx-1"></div>

                      <button 
                        onClick={() => insertMarkdown("- ", "")} 
                        className="p-1 hover:bg-zinc-200 rounded text-xs text-zinc-700 cursor-pointer"
                        title="Lista de marcadores"
                      >
                        <List className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => insertMarkdown("1. ", "")} 
                        className="p-1 hover:bg-zinc-200 rounded text-xs text-zinc-700 cursor-pointer"
                        title="Lista numerada"
                      >
                        <ListOrdered className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => insertMarkdown("- [ ] ", "")} 
                        className="p-1 hover:bg-zinc-200 rounded text-xs text-zinc-700 cursor-pointer"
                        title="Checklist"
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                      </button>

                      <div className="w-px h-4 bg-zinc-200 mx-1"></div>

                      <button 
                        onClick={() => insertMarkdown("> ", "")} 
                        className="p-1 hover:bg-zinc-200 rounded text-xs text-zinc-700 cursor-pointer"
                        title="Citação"
                      >
                        <Quote className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => insertMarkdown(":::note\n", "\n:::")} 
                        className="p-1 hover:bg-zinc-200 rounded text-xs text-zinc-700 cursor-pointer"
                        title="Nota de Destaque"
                      >
                        <StickyNote className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => insertMarkdown("---", "")} 
                        className="p-1 hover:bg-zinc-200 rounded text-xs text-zinc-700 cursor-pointer"
                        title="Linha Horizontal"
                      >
                        —
                      </button>
                      <button 
                        onClick={() => insertMarkdown("![Descrição da Imagem](https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=400)", "")} 
                        className="p-1 hover:bg-zinc-200 rounded text-xs text-zinc-700 cursor-pointer"
                        title="Inserir Imagem"
                      >
                        <Image className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => insertMarkdown("| Coluna 1 | Coluna 2 |\n| --- | --- |\n| Item A | Item B |", "")} 
                        className="p-1 hover:bg-zinc-200 rounded text-xs text-zinc-700 cursor-pointer"
                        title="Inserir Tabela"
                      >
                        <Table className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => insertMarkdown("[Link Externo](https://bookverse.club)", "")} 
                        className="p-1 hover:bg-zinc-200 rounded text-xs text-zinc-700 cursor-pointer"
                        title="Inserir Link"
                      >
                        <Link className="w-3.5 h-3.5" />
                      </button>

                      <div className="w-px h-4 bg-zinc-200 mx-1"></div>

                      <button 
                        onClick={() => insertMarkdown("<br />\n", "")} 
                        className="p-1 hover:bg-[#8a7e58]/15 rounded text-xs text-zinc-700 cursor-pointer flex items-center gap-0.5"
                        title="Pular 1 Linha (Quebra de Linha)"
                      >
                        <CornerDownLeft className="w-3.5 h-3.5 text-[#8a7e58]" />
                        <span className="text-[9px] font-mono text-[#8a7e58] font-bold">1x</span>
                      </button>
                      <button 
                        onClick={() => insertMarkdown("<br /><br />\n", "")} 
                        className="p-1 hover:bg-[#8a7e58]/15 rounded text-xs text-zinc-700 cursor-pointer flex items-center gap-0.5"
                        title="Pular Várias Linhas (Quebra Múltipla)"
                      >
                        <CornerDownLeft className="w-3.5 h-3.5 text-[#8a7e58]" />
                        <span className="text-[9px] font-mono text-[#8a7e58] font-bold">+</span>
                      </button>
                      <button 
                        onClick={() => insertMarkdown("[Texto do Link](#p5)", "")} 
                        className="p-1 hover:bg-emerald-50 rounded text-xs text-zinc-700 cursor-pointer flex items-center gap-0.5"
                        title="Inserir Link Interno (ex: para Página 5 ou Capítulo)"
                      >
                        <Link className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-[9px] font-mono text-emerald-600 font-bold">Int</span>
                      </button>
                    </div>

                    {/* INDEX SYNC BANNER */}
                    <div className="hidden xl:flex items-center gap-1.5 text-[10px] bg-emerald-50 border border-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>Sumário Sincronizado</span>
                    </div>

                    {/* Toggle de Continuidade de Lista Ordenada */}
                    <button
                      type="button"
                      onClick={() => {
                        const activePage = getActivePage();
                        if (!activePage) return;
                        const currentContent = activePage.content;
                        if (currentContent.includes("<!-- continue-ordered-list -->")) {
                          const updated = currentContent
                            .replace("<!-- continue-ordered-list -->\n", "")
                            .replace("<!-- continue-ordered-list -->", "");
                          updateActivePageContent(updated);
                        } else {
                          const updated = "<!-- continue-ordered-list -->\n" + currentContent;
                          updateActivePageContent(updated);
                        }
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition flex items-center gap-1 cursor-pointer ${
                        getActivePage()?.content.includes("<!-- continue-ordered-list -->")
                          ? "bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200"
                          : "bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-50"
                      }`}
                      title="Clique para alternar se a lista numerada desta página deve continuar a numeração da página anterior"
                    >
                      <ListOrdered className="w-3.5 h-3.5 text-[#8a7e58]" />
                      {getActivePage()?.content.includes("<!-- continue-ordered-list -->")
                        ? "Listas: Continuar Numeração"
                        : "Listas: Reiniciar Numeração"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowMarkdownGuide(true)}
                      className="px-2.5 py-1 bg-[#8a7e58]/10 text-[#8a7e58] hover:bg-[#8a7e58]/20 border border-[#8a7e58]/20 rounded-lg text-[10px] font-bold cursor-pointer transition flex items-center gap-1"
                    >
                      <HelpCircle className="w-3.5 h-3.5" /> Guia Markdown
                    </button>

                  </div>

                  {/* ACTIVE WORKSPACE EDITOR FIELDS */}
                  <div className="flex-grow flex overflow-hidden">
                    
                    {/* Visual Live Editor Render or Markdown Split pane */}
                    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 bg-[#FAF9F5]">
                      {editorTab === "visual" ? (
                        <div className="flex-grow flex flex-col space-y-4 overflow-hidden">
                          <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                            <span className="text-[10px] text-[#8a7e58] font-bold uppercase tracking-wider font-mono">
                              Editor Visual por Páginas - Manuscrito Final
                            </span>
                            <span className="text-[10px] text-zinc-400 font-mono">
                              Caracteres: {getActivePage()?.content.length || 0}
                            </span>
                          </div>

                          <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-6 overflow-hidden">
                            
                            {/* Visual Left Input Area */}
                            <div className="flex flex-col h-full space-y-2">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider block">Inserir Conteúdo Rico</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const activePage = getActivePage();
                                      if (!activePage) return;
                                      const currentContent = activePage.content;
                                      if (currentContent.includes("<!-- continue-ordered-list -->")) {
                                        const updated = currentContent
                                          .replace("<!-- continue-ordered-list -->\n", "")
                                          .replace("<!-- continue-ordered-list -->", "");
                                        updateActivePageContent(updated);
                                      } else {
                                        const updated = "<!-- continue-ordered-list -->\n" + currentContent;
                                        updateActivePageContent(updated);
                                      }
                                    }}
                                    className={`px-1.5 py-0.5 rounded text-[8px] font-bold border transition flex items-center gap-0.5 cursor-pointer ${
                                      getActivePage()?.content.includes("<!-- continue-ordered-list -->")
                                        ? "bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200"
                                        : "bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-50"
                                    }`}
                                    title="Alternar se a lista numerada desta página deve continuar a numeração da anterior"
                                  >
                                    <ListOrdered className="w-2.5 h-2.5 text-[#8a7e58]" />
                                    {getActivePage()?.content.includes("<!-- continue-ordered-list -->")
                                      ? "Continuar Numeração"
                                      : "Reiniciar Numeração"}
                                  </button>
                                </div>
                                <div className="flex items-center gap-1 bg-zinc-100 px-1.5 py-0.5 rounded-lg border border-zinc-200 text-[10px]">
                                  <button
                                    type="button"
                                    onClick={() => setEditorFontSize(prev => Math.max(10, prev - 1))}
                                    className="font-bold text-zinc-600 hover:text-zinc-950 px-1 cursor-pointer"
                                    title="Diminuir tamanho do texto"
                                  >
                                    A-
                                  </button>
                                  <span className="text-[9px] font-bold text-zinc-500 font-mono px-0.5">{editorFontSize}px</span>
                                  <button
                                    type="button"
                                    onClick={() => setEditorFontSize(prev => Math.min(24, prev + 1))}
                                    className="font-bold text-zinc-600 hover:text-zinc-950 px-1 cursor-pointer"
                                    title="Aumentar tamanho do texto"
                                  >
                                    A+
                                  </button>
                                </div>
                              </div>
                              <textarea
                                ref={textareaRef}
                                value={getActivePage()?.content || ""}
                                onChange={(e) => updateActivePageContent(e.target.value)}
                                style={{ fontSize: `${editorFontSize}px` }}
                                className="w-full flex-grow p-4 border border-[#ece9dc] focus:ring-1 focus:ring-zinc-400 rounded-2xl bg-white leading-relaxed text-zinc-900 focus:outline-none resize-none"
                                placeholder="Digite o conteúdo da sua página literária aqui..."
                              />
                            </div>

                            {/* Visual Right Live Render Area */}
                            <div className="flex flex-col h-full space-y-2 overflow-hidden">
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider block">Visualização Real no BookVerse</span>
                                <div className="flex items-center gap-1.5 bg-zinc-100 px-2 py-0.5 rounded-lg border border-zinc-200 text-[10px]">
                                  {/* Theme selectors matching reader */}
                                  <div className="flex items-center gap-1 border-r border-zinc-200 pr-1.5 mr-0.5">
                                    {(["claro", "sepia", "escuro"] as const).map((t) => (
                                      <button
                                        key={t}
                                        type="button"
                                        onClick={() => setPreviewTheme(t)}
                                        className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center cursor-pointer transition ${
                                          t === "claro"
                                            ? "bg-white border-zinc-300"
                                            : t === "sepia"
                                              ? "bg-[#fcf7e8] border-[#ebdcb3]"
                                              : "bg-[#121214] border-zinc-800"
                                        } ${previewTheme === t ? "ring-2 ring-[#e2b874] ring-offset-0.5" : ""}`}
                                        title={t.charAt(0).toUpperCase() + t.slice(1)}
                                      />
                                    ))}
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => setPreviewFontSize(prev => Math.max(12, prev - 1))}
                                    className="font-bold text-zinc-600 hover:text-zinc-950 px-1 cursor-pointer"
                                    title="Diminuir visualização"
                                  >
                                    A-
                                  </button>
                                  <span className="text-[9px] font-bold text-zinc-500 font-mono px-0.5">{previewFontSize}px</span>
                                  <button
                                    type="button"
                                    onClick={() => setPreviewFontSize(prev => Math.min(26, prev + 1))}
                                    className="font-bold text-zinc-600 hover:text-zinc-950 px-1 cursor-pointer"
                                    title="Aumentar visualização"
                                  >
                                    A+
                                  </button>
                                </div>
                              </div>
                              <div 
                                style={{ fontSize: `${previewFontSize}px` }}
                                className={`w-full flex-grow p-6 border rounded-2xl overflow-y-auto shadow-inner leading-relaxed font-serif text-left transition-colors duration-300 ${previewThemeStyles[previewTheme].cardBg}`}
                              >
                                <ReactMarkdown components={getFaithfulMarkdownComponents(previewTheme) as any}>
                                  {preprocessMarkdownLists(getActivePage()?.content || "_Nenhum conteúdo nesta página ainda._")}
                                </ReactMarkdown>
                              </div>
                            </div>

                          </div>
                        </div>
                      ) : (
                        <div className="flex-grow flex flex-col space-y-4 h-full overflow-hidden">
                          <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                            <span className="text-[10px] text-[#8a7e58] font-bold uppercase tracking-wider font-mono">
                              Editor de Código Markdown Puro
                            </span>
                            <span className="text-[10px] text-zinc-400 font-mono">
                              Editor de Bloco Bruto
                            </span>
                          </div>

                          <textarea
                            ref={textareaRef}
                            value={getActivePage()?.content || ""}
                            onChange={(e) => updateActivePageContent(e.target.value)}
                            className="w-full flex-grow p-4 border border-[#ece9dc] focus:ring-1 focus:ring-zinc-400 rounded-2xl bg-zinc-900 text-[#ece9dc] font-mono text-xs leading-relaxed focus:outline-none resize-none"
                            placeholder="Digite o código markdown bruto aqui..."
                          />
                        </div>
                      )}
                    </div>

                    {/* If closed, show a collapsed toggle handle on the right side */}
                    {!showBlocksSidebar && (
                      <button
                        type="button"
                        onClick={() => setShowBlocksSidebar(true)}
                        className="hidden lg:flex w-8 border-l border-[#ece9dc] bg-[#FAF9F5] hover:bg-[#FAF9F5]/80 flex-col items-center justify-start py-4 text-[#8a7e58] hover:text-[#4a432d] transition cursor-pointer flex-shrink-0 gap-2"
                        title="Abrir Modelo em Blocos"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span className="text-[9px] font-bold uppercase tracking-wider [writing-mode:vertical-lr]">Blocos</span>
                      </button>
                    )}

                    {/* DYNAMIC DOCUMENT BLOCKS SIDEBAR (Structured Model) */}
                    {showBlocksSidebar && (
                      <div className="hidden lg:flex w-72 border-l border-[#ece9dc] bg-white flex-col justify-between overflow-hidden flex-shrink-0">
                        <div className="p-4 border-b border-[#ece9dc] bg-[#FAF9F5] flex justify-between items-center">
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1.5 min-w-0">
                            <Database className="w-3.5 h-3.5 text-[#8a7e58] flex-shrink-0" />
                            <span className="truncate">Blocos</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowBlocksSidebar(false)}
                            className="p-1 hover:bg-zinc-200 text-gray-500 rounded-lg transition flex-shrink-0"
                            title="Fechar lateralmente"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>

                      <div className="flex-grow overflow-y-auto p-4 space-y-3">
                        <p className="text-[10px] text-gray-500 leading-relaxed bg-zinc-50 border border-zinc-100 p-2.5 rounded-xl">
                          Nossa engine fatiadora converte seu markdown bruto em blocos de dados estruturados para otimizar o carregamento e renderização móvel.
                        </p>

                        <div className="space-y-2">
                          <span className="text-[9px] text-zinc-400 font-bold uppercase block">Blocos Detectados nesta página:</span>
                          
                          {getActivePage()?.content ? (
                            parseMarkdownToBlocks(getActivePage()!.content).map((block, idx) => (
                              <div key={block.key || idx} className="p-2 border border-zinc-100 bg-zinc-50/50 rounded-lg text-[10px] font-mono space-y-1 flex flex-col text-left">
                                <div className="flex justify-between items-center text-zinc-400 font-sans text-[8px] font-bold uppercase">
                                  <span>Bloco #{idx + 1}</span>
                                  <span className="bg-zinc-200 text-zinc-700 px-1 py-0.2 rounded">{block.type}</span>
                                </div>
                                <span className="text-zinc-600 truncate">{block.content}</span>
                              </div>
                            ))
                          ) : (
                            <span className="text-[10px] text-gray-400 block italic">Nenhum bloco detectado.</span>
                          )}
                        </div>
                      </div>

                      <div className="p-4 border-t border-zinc-100 bg-[#FAF9F5] space-y-3">
                        <div className="text-[10px] text-[#8a7e58] font-bold flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 animate-pulse text-amber-500" />
                          <span>Assistente de Escrita IA</span>
                        </div>
                        <p className="text-[9px] text-gray-400 leading-relaxed">
                          Refine o estilo, corrija grafia ou solicite que a IA continue escrevendo a narrativa da página literária ativa.
                        </p>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            disabled={aiWorking || !getActivePage()?.content}
                            onClick={() => handleAiWritingAction("improve")}
                            className="py-1.5 px-2 bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-700 rounded-lg text-[9px] font-bold cursor-pointer transition disabled:opacity-50 flex items-center justify-center gap-1 shadow-xs"
                          >
                            Melhorar Estilo
                          </button>
                          <button
                            type="button"
                            disabled={aiWorking || !getActivePage()?.content}
                            onClick={() => handleAiWritingAction("grammar")}
                            className="py-1.5 px-2 bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-700 rounded-lg text-[9px] font-bold cursor-pointer transition disabled:opacity-50 flex items-center justify-center gap-1 shadow-xs"
                          >
                            Corrigir Grafia
                          </button>
                          <button
                            type="button"
                            disabled={aiWorking || !getActivePage()?.content}
                            onClick={() => handleAiWritingAction("continue")}
                            className="py-1.5 px-2 bg-[#8a7e58]/10 hover:bg-[#8a7e58]/20 border border-[#8a7e58]/20 text-[#8a7e58] rounded-lg text-[9px] font-bold cursor-pointer transition disabled:opacity-50 flex items-center justify-center gap-1 col-span-2 shadow-xs"
                          >
                            <Sparkles className="w-2.5 h-2.5" />
                            Continuar Escrita...
                          </button>
                        </div>
                        {aiWorking && (
                          <div className="text-[9px] text-amber-600 font-bold flex items-center gap-1.5 justify-center animate-pulse py-1">
                            <RefreshCw className="w-3 h-3 animate-spin text-amber-500" />
                            <span>Processando com IA BookVerse...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  </div>
                </>
              ) : (
                /* READER SIMULATOR VIEW (MODO LEITOR FIEL) */
                <div className={`flex-grow flex items-center justify-center p-6 overflow-y-auto transition-colors duration-300 ${previewThemeStyles[previewTheme].outerBg || "bg-zinc-100/60"}`}>
                  <div className={`w-full max-w-2xl rounded-3xl border shadow-xl p-8 md:p-12 min-h-[500px] flex flex-col justify-between space-y-8 relative transition-colors duration-300 ${previewThemeStyles[previewTheme].cardBg}`}>
                    
                    {/* Simulated Book Top Header */}
                    <div className="flex justify-between items-center border-b border-zinc-200/50 pb-2 text-[10px] text-gray-400 tracking-wider font-sans font-bold uppercase text-left">
                      <div className="flex flex-col">
                        <span className="font-semibold text-zinc-500">{title || "Sem título"}</span>
                        <span className="text-[9px] opacity-75">
                          {chapters.find(c => c.id === selectedChapterId)?.title || "Capítulo"}
                        </span>
                      </div>
                      
                      {/* Interactive Reader Settings in Simulator */}
                      <div className="flex items-center gap-1.5 bg-zinc-100/10 hover:bg-zinc-100/20 px-2 py-0.5 rounded-lg border border-zinc-500/20 text-[10px]">
                        {/* Theme Selectors */}
                        <div className="flex items-center gap-1 border-r border-zinc-500/20 pr-1.5 mr-0.5">
                          {(["claro", "sepia", "escuro"] as const).map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setPreviewTheme(t)}
                              className={`w-3 h-3 rounded-full border flex items-center justify-center cursor-pointer transition ${
                                t === "claro"
                                  ? "bg-white border-zinc-300"
                                  : t === "sepia"
                                    ? "bg-[#fcf7e8] border-[#ebdcb3]"
                                    : "bg-[#121214] border-zinc-800"
                              } ${previewTheme === t ? "ring-1 ring-[#e2b874] ring-offset-0.5" : ""}`}
                              title={t.charAt(0).toUpperCase() + t.slice(1)}
                            />
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => setPreviewFontSize(prev => Math.max(12, prev - 1))}
                          className="font-bold text-zinc-400 hover:text-zinc-100 px-1 cursor-pointer"
                          title="Diminuir texto"
                        >
                          A-
                        </button>
                        <span className="text-[9px] font-bold text-zinc-400 font-mono px-0.5">{previewFontSize}px</span>
                        <button
                          type="button"
                          onClick={() => setPreviewFontSize(prev => Math.min(26, prev + 1))}
                          className="font-bold text-zinc-400 hover:text-zinc-100 px-1 cursor-pointer"
                          title="Aumentar texto"
                        >
                          A+
                        </button>
                      </div>
                    </div>

                    {/* Simulated Book Main Content */}
                    <div 
                      style={{ fontSize: `${previewFontSize}px` }}
                      className="flex-grow py-4 font-serif leading-relaxed text-left max-w-none transition-colors duration-300"
                    >
                      <ReactMarkdown components={getFaithfulMarkdownComponents(previewTheme) as any}>
                        {preprocessMarkdownLists(getActivePage()?.content || "*Sem conteúdo nesta página.*")}
                      </ReactMarkdown>
                    </div>

                    {/* Simulated Book Footer */}
                    <div className="border-t border-zinc-200/50 pt-3 flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase font-sans">
                      <button
                        onClick={() => {
                          const chap = chapters.find(c => c.id === selectedChapterId);
                          if (!chap) return;
                          const pIdx = chap.pages.findIndex(p => p.id === selectedPageId);
                          if (pIdx > 0) {
                            setSelectedPageId(chap.pages[pIdx - 1].id);
                          } else {
                            // Go to previous chapter's last page
                            const cIdx = chapters.findIndex(c => c.id === selectedChapterId);
                            if (cIdx > 0) {
                              const prevChap = chapters[cIdx - 1];
                              setSelectedChapterId(prevChap.id);
                              setSelectedPageId(prevChap.pages[prevChap.pages.length - 1].id);
                            }
                          }
                        }}
                        className="p-1 hover:bg-zinc-100 rounded cursor-pointer"
                      >
                        Pág. Anterior
                      </button>

                      <span>
                        Fatiamento BookVerse • Editor Geral
                      </span>

                      <button
                        onClick={() => {
                          const chap = chapters.find(c => c.id === selectedChapterId);
                          if (!chap) return;
                          const pIdx = chap.pages.findIndex(p => p.id === selectedPageId);
                          if (pIdx < chap.pages.length - 1) {
                            setSelectedPageId(chap.pages[pIdx + 1].id);
                          } else {
                            // Go to next chapter's first page
                            const cIdx = chapters.findIndex(c => c.id === selectedChapterId);
                            if (cIdx < chapters.length - 1) {
                              const nextChap = chapters[cIdx + 1];
                              setSelectedChapterId(nextChap.id);
                              setSelectedPageId(nextChap.pages[0].id);
                            }
                          }
                        }}
                        className="p-1 hover:bg-zinc-100 rounded cursor-pointer"
                      >
                        Próx. Página
                      </button>
                    </div>

                  </div>
                </div>
              )}

            </div>

          </div>
        )}

        {/* MODAL 1: REAL-TIME STATISTICS */}
        <AnimatePresence>
          {showStatsModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-3xl p-6 border border-[#ece9dc] w-full max-w-lg shadow-2xl space-y-4 text-left"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
                  <BarChart2 className="w-5 h-5 text-[#8a7e58]" />
                  <h3 className="font-serif font-bold text-lg text-zinc-900">Análise Narrativa em Tempo Real</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-50 p-3 border border-zinc-100 rounded-xl">
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">Total de Capítulos</span>
                    <span className="text-xl font-serif font-bold text-zinc-900">{stats.totalChapters}</span>
                  </div>
                  <div className="bg-zinc-50 p-3 border border-zinc-100 rounded-xl">
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">Total de Páginas</span>
                    <span className="text-xl font-serif font-bold text-zinc-900">{stats.totalPages}</span>
                  </div>
                  <div className="bg-zinc-50 p-3 border border-zinc-100 rounded-xl">
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">Total de Palavras</span>
                    <span className="text-xl font-serif font-bold text-zinc-900">{stats.totalWords}</span>
                  </div>
                  <div className="bg-zinc-50 p-3 border border-zinc-100 rounded-xl">
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">Média por Página</span>
                    <span className="text-xl font-serif font-bold text-zinc-900">
                      {stats.totalPages > 0 ? Math.round(stats.totalWords / stats.totalPages) : 0} pal.
                    </span>
                  </div>
                  <div className="bg-zinc-50 p-3 border border-zinc-100 rounded-xl">
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">Imagens Incorporadas</span>
                    <span className="text-xl font-serif font-bold text-zinc-900">{stats.imagesCount}</span>
                  </div>
                  <div className="bg-zinc-50 p-3 border border-zinc-100 rounded-xl">
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">Tempo Estimado de Leitura</span>
                    <span className="text-xl font-serif font-bold text-emerald-700">{stats.estimatedReadTime}</span>
                  </div>
                </div>

                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex gap-3 text-xs text-amber-900">
                  <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Padrão de Qualidade:</strong> Um livro de leitura agradável no celular possui em média de 400 a 600 palavras por faturamento de página. Seu livro está excelente!
                  </p>
                </div>

                <div className="flex justify-end pt-2 border-t border-zinc-100">
                  <button
                    onClick={() => setShowStatsModal(false)}
                    className="bg-zinc-900 hover:bg-zinc-800 text-white px-5 py-2 rounded-xl text-xs font-bold cursor-pointer transition"
                  >
                    Fechar Estatísticas
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL 2: VERSION TIMELINE HISTORY */}
        <AnimatePresence>
          {showHistoryModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-3xl p-6 border border-[#ece9dc] w-full max-w-xl shadow-2xl space-y-4 text-left"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
                  <History className="w-5 h-5 text-[#8a7e58]" />
                  <h3 className="font-serif font-bold text-lg text-zinc-900">Linha do Tempo de Versões</h3>
                </div>

                <p className="text-xs text-gray-400 leading-relaxed">
                  Confira as alterações e restaure instantaneamente versões do manuscrito salvas localmente ao longo da sua sessão administrativa ativa.
                </p>

                <div className="max-h-60 overflow-y-auto space-y-2.5 p-1">
                  {versions.length === 0 ? (
                    <div className="p-6 text-center text-gray-400 text-xs italic bg-zinc-50 border border-dashed rounded-2xl">
                      Nenhuma versão histórica registrada nesta sessão de edição. Continue editando para capturar snapshots automáticos.
                    </div>
                  ) : (
                    versions.map((ver, idx) => (
                      <div key={idx} className="bg-zinc-50/70 border border-zinc-100 p-3 rounded-xl flex items-center justify-between gap-4">
                        <div className="space-y-1">
                          <span className="text-[10px] text-[#8a7e58] font-mono font-bold block">{ver.timestamp}</span>
                          <span className="text-xs font-bold text-zinc-800 block">{ver.changesDescription}</span>
                          <span className="text-[10px] text-zinc-400 block">Salvo por {ver.adminName}</span>
                        </div>

                        <button
                          onClick={() => {
                            if (confirm("Deseja realmente restaurar as páginas e metadados desta versão histórica?")) {
                              setChapters(JSON.parse(JSON.stringify(ver.chapters)));
                              setTitle(ver.metadata.title);
                              setAuthor(ver.metadata.author);
                              setCategory(ver.metadata.category);
                              setDescription(ver.metadata.description);
                              setShowHistoryModal(false);
                              setIsDirty(true);
                              alert("Versão restaurada com sucesso no ambiente administrativo local!");
                            }
                          }}
                          className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded-lg text-[10px] font-bold cursor-pointer transition flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" /> Restaurar Snapshot
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex justify-end pt-2 border-t border-zinc-100">
                  <button
                    onClick={() => setShowHistoryModal(false)}
                    className="bg-zinc-900 hover:bg-zinc-800 text-white px-5 py-2 rounded-xl text-xs font-bold cursor-pointer transition"
                  >
                    Fechar Linha do Tempo
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL 3: PRE-PUBLICATION CHECKLIST */}
        <AnimatePresence>
          {showChecklistModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-3xl p-6 border border-[#ece9dc] w-full max-w-lg shadow-2xl space-y-4 text-left"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
                  <Check className="w-5 h-5 text-emerald-600 bg-emerald-50 p-1 rounded-md border border-emerald-100" />
                  <h3 className="font-serif font-bold text-lg text-zinc-900">Análise de Consistência e Checklist</h3>
                </div>

                <p className="text-xs text-gray-400 leading-relaxed">
                  Realizamos uma varredura automática no manuscrito e no sumário para certificar a qualidade da paginação do BookVerse.
                </p>

                <div className="space-y-2 max-h-60 overflow-y-auto p-1">
                  
                  {/* Capa check */}
                  <div className="flex items-center justify-between p-2.5 border border-zinc-100 bg-zinc-50/50 rounded-xl text-xs">
                    <span className="text-zinc-700">Ficha: Capa do Livro vinculada com sucesso?</span>
                    {validationResult.checks.cover ? (
                      <span className="text-emerald-600 font-bold font-mono">OK</span>
                    ) : (
                      <span className="text-amber-600 font-bold font-mono">AVISO (Falta Capa)</span>
                    )}
                  </div>

                  {/* Descricao check */}
                  <div className="flex items-center justify-between p-2.5 border border-zinc-100 bg-zinc-50/50 rounded-xl text-xs">
                    <span className="text-zinc-700">Ficha: Sinopse descritiva robusta (&gt;30 caracteres)?</span>
                    {validationResult.checks.description ? (
                      <span className="text-emerald-600 font-bold font-mono">OK</span>
                    ) : (
                      <span className="text-red-500 font-bold font-mono">PENDENTE</span>
                    )}
                  </div>

                  {/* Chapters count check */}
                  <div className="flex items-center justify-between p-2.5 border border-zinc-100 bg-zinc-50/50 rounded-xl text-xs">
                    <span className="text-zinc-700">Estrutura: Pelo menos um capítulo cadastrado?</span>
                    {validationResult.checks.chaptersCount ? (
                      <span className="text-emerald-600 font-bold font-mono">OK ({chapters.length})</span>
                    ) : (
                      <span className="text-red-500 font-bold font-mono">PENDENTE</span>
                    )}
                  </div>

                  {/* Pages check */}
                  <div className="flex items-center justify-between p-2.5 border border-zinc-100 bg-zinc-50/50 rounded-xl text-xs">
                    <span className="text-zinc-700">Estrutura: Fatiador possui páginas suficientes (&gt;=1)?</span>
                    {validationResult.checks.pagesCount ? (
                      <span className="text-emerald-600 font-bold font-mono">OK ({stats.totalPages})</span>
                    ) : (
                      <span className="text-red-500 font-bold font-mono">PENDENTE</span>
                    )}
                  </div>

                  {/* Empty check */}
                  <div className="flex items-center justify-between p-2.5 border border-zinc-100 bg-zinc-50/50 rounded-xl text-xs">
                    <span className="text-zinc-700">Estrutura: Páginas estão sem conteúdo vazio?</span>
                    {validationResult.checks.emptyContent ? (
                      <span className="text-emerald-600 font-bold font-mono">OK</span>
                    ) : (
                      <span className="text-amber-600 font-bold font-mono">AVISO (Páginas Curtas)</span>
                    )}
                  </div>

                  {/* ISBN check */}
                  <div className="flex items-center justify-between p-2.5 border border-zinc-100 bg-zinc-50/50 rounded-xl text-xs">
                    <span className="text-zinc-700">Ficha: Registro ISBN devidamente informado?</span>
                    {validationResult.checks.isbn ? (
                      <span className="text-emerald-600 font-bold font-mono">OK</span>
                    ) : (
                      <span className="text-zinc-400 font-bold font-mono">OPCIONAL</span>
                    )}
                  </div>

                </div>

                <div className="p-3.5 bg-[#FAF9F5] border border-[#ece9dc] rounded-2xl flex gap-3 text-xs text-zinc-600 leading-relaxed">
                  <Database className="w-4 h-4 flex-shrink-0 text-[#8a7e58] mt-0.5" />
                  <p>
                    Ao salvar, o sistema fará a re-compilação do manuscrito em formato JSON aceito pelo banco de dados NoSQL do BookVerse, gerando automaticamente a tabela de sumário dinâmico.
                  </p>
                </div>

                <div className="flex justify-end gap-2.5 pt-2 border-t border-zinc-100">
                  <button
                    onClick={() => setShowChecklistModal(false)}
                    disabled={isSaving || saveLoading}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition disabled:opacity-50"
                  >
                    Voltar a Editar
                  </button>
                  <button
                    onClick={handleSaveDraft}
                    disabled={isSaving || saveLoading}
                    className="bg-zinc-800 hover:bg-[#1f1e1a] text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-zinc-300" />
                    ) : (
                      <Save className="w-3.5 h-3.5 text-zinc-300" />
                    )}
                    {isSaving ? "Guardando..." : "Guardar Rascunho"}
                  </button>
                  <button
                    onClick={handlePublishSubmit}
                    disabled={isSaving || saveLoading}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving || saveLoading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    {isSaving || saveLoading ? "Salvando..." : "Salvar e Publicar Livro"}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MARKDOWN QUICK GUIDE MODAL */}
        <AnimatePresence>
          {showMarkdownGuide && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="bg-white rounded-2xl max-w-lg w-full border border-[#dad5bf] p-6 shadow-2xl relative flex flex-col max-h-[85vh]"
              >
                <div className="flex items-center justify-between border-b border-[#ece9dc] pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#8a7e58]" />
                    <h3 className="font-serif font-bold text-lg text-gray-900">
                      Guia Rápido de Markdown
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowMarkdownGuide(false)}
                    className="p-1.5 hover:bg-zinc-100 rounded-lg text-gray-400 hover:text-gray-600 transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-grow overflow-y-auto pr-1 text-sm text-gray-600 space-y-4">
                  <p className="text-xs text-gray-500 font-sans">
                    O BookVerse utiliza regras rígidas e claras de Markdown para estruturar e formatar os livros. Siga estas diretrizes para garantir uma formatação perfeita:
                  </p>

                  <div className="grid grid-cols-1 gap-4">
                    {/* REGRA DE CAPÍTULOS */}
                    <div className="border border-[#e1dbbf] rounded-xl p-3 bg-[#faf9f5] space-y-1 text-xs">
                      <span className="font-bold text-[#8a7e58] uppercase text-[10px] block">📌 Regra Rígida: Capítulos (Painel Lateral)</span>
                      <p className="text-gray-700 font-sans leading-relaxed">
                        Para que um capítulo seja reconhecido, mapeado e exibido corretamente no <strong>painel lateral</strong>, ele deve obrigatoriamente iniciar com um título usando H1 ou H2:
                      </p>
                      <p className="font-mono bg-zinc-200/60 px-1 py-0.5 rounded text-zinc-800 w-fit"># Capítulo I: O Início</p>
                      <p className="font-mono bg-zinc-200/60 px-1 py-0.5 rounded text-zinc-800 w-fit">## Capítulo II: A Jornada</p>
                      <span className="text-gray-500 text-[10px] block font-sans">Ao importar um arquivo <strong>.md</strong>, o sistema dividirá automaticamente os capítulos usando esta regra.</span>
                    </div>

                    {/* REGRA DE PARÁGRAFOS */}
                    <div className="border border-red-100 rounded-xl p-3 bg-red-50/50 space-y-1 text-xs">
                      <span className="font-bold text-red-800 uppercase text-[10px] block">🚫 Regra de Parágrafo & Evitar Duplicações</span>
                      <p className="text-gray-700 font-sans leading-relaxed">
                        Use <strong>estritamente uma linha em branco (duplo Enter)</strong> para separar parágrafos.
                      </p>
                      <div className="flex gap-2 font-mono text-[10px] my-1">
                        <div className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded">✅ Correto:<br/>Parágrafo 1<br/>[linha em branco]<br/>Parágrafo 2</div>
                        <div className="bg-red-100 text-red-800 px-2 py-1 rounded">❌ Incorreto:<br/>Parágrafo 1&lt;br&gt;<br/>Parágrafo 2</div>
                      </div>
                      <p className="text-red-700 font-sans leading-relaxed">
                        <strong>É proibido usar tags &lt;br&gt; ou &lt;br /&gt;</strong> em conjunto com linhas em branco. Misturá-los gera espaçamentos duplicados inconsistentes e desnecessários na renderização.
                      </p>
                    </div>

                    {/* REGRA DE QUEBRA DE PÁGINA */}
                    <div className="border border-zinc-100 rounded-xl p-3 bg-zinc-50 space-y-1 text-xs">
                      <span className="font-bold text-[#8a7e58] uppercase text-[10px] block">📄 Quebra de Página</span>
                      <p className="text-gray-700 font-sans leading-relaxed">
                        Para dividir um capítulo em páginas, use exatamente três hífens sozinhos em uma linha:
                      </p>
                      <p className="font-mono bg-zinc-200/60 px-1 py-0.5 rounded text-zinc-800 w-fit">---</p>
                      <span className="text-gray-500 text-[10px] block font-sans">Isso divide o texto e inicia uma nova página limpa no leitor.</span>
                    </div>

                    {/* OUTRAS FORMATAÇÕES */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="border border-zinc-100 rounded-xl p-2.5 bg-zinc-50 text-[11px] space-y-0.5">
                        <span className="font-bold text-zinc-500 uppercase text-[8px] block">Estilos Básicos</span>
                        <p className="font-mono text-zinc-700">**negrito**</p>
                        <p className="font-mono text-zinc-700">*itálico*</p>
                        <p className="font-mono text-zinc-700">~~tachado~~</p>
                      </div>
                      <div className="border border-zinc-100 rounded-xl p-2.5 bg-zinc-50 text-[11px] space-y-0.5">
                        <span className="font-bold text-zinc-500 uppercase text-[8px] block">Estruturas Extras</span>
                        <p className="font-mono text-zinc-700">&gt; Bloco de citação</p>
                        <p className="font-mono text-zinc-700">- Lista de tópicos</p>
                        <p className="font-mono text-zinc-700">:::note ... :::</p>
                      </div>
                    </div>

                    {/* IMPORTAÇÃO DE ARQUIVOS .MD */}
                    <div className="border border-blue-100 rounded-xl p-3 bg-blue-50/50 space-y-1 text-xs">
                      <span className="font-bold text-blue-800 uppercase text-[10px] block">💾 Importação Direta de .md</span>
                      <p className="text-gray-700 font-sans leading-relaxed">
                        Você pode importar arquivos <strong>.md (Markdown)</strong> prontos! O BookVerse analisará a hierarquia de títulos (# ou ##) para estruturar os capítulos, e os hífens (---) para fatiar as páginas perfeitamente.
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-[#ece9dc] pt-3 text-xs text-gray-500 font-sans">
                    <span className="font-semibold text-gray-700 block mb-1">Dica de Edição:</span>
                    O painel lateral reflete dinamicamente a estrutura de capítulos definidos com as regras acima.
                  </div>
                </div>

                <div className="mt-4 border-t border-[#ece9dc] pt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowMarkdownGuide(false)}
                    className="px-4 py-2 bg-[#8a7e58] hover:bg-[#4a432d] text-white font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    Entendi
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
