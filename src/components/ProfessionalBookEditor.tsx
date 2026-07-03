import React, { useState, useEffect, useRef } from "react";
import { 
  BookOpen, Plus, Trash2, Edit3, ChevronLeft, ChevronRight, Check, Upload, FileUp, 
  FileText, Database, Sparkles, Info, X, ChevronDown, ChevronUp, RotateCcw, History, 
  Settings, AlertCircle, Eye, Type, Copy, Save, Split, Merge, Layers, Globe, Calendar, 
  Hash, Image, Table, Link, BarChart2, List, ListOrdered, CheckSquare, Quote, StickyNote, 
  HelpCircle, AlertTriangle, Play, RefreshCw, Layers2, FileEdit
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "motion/react";
import { Book, BookHistory, BookStatus } from "../types";

interface ProfessionalBookEditorProps {
  book: Book | null;
  onSave: (updatedBookData: Partial<Book>) => Promise<void>;
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

export default function ProfessionalBookEditor({
  book,
  onSave,
  onClose,
  loading: saveLoading,
  currentAdmin
}: ProfessionalBookEditorProps) {
  // WIZARD STATE
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(book ? 3 : 1); // If editing existing, jump directly to editor (step 3)
  
  // METADATA STATE
  const [title, setTitle] = useState(book?.title || "");
  const [subtitle, setSubtitle] = useState(book?.description?.split(".")[0] || "");
  const [author, setAuthor] = useState(book?.author || "");
  const [category, setCategory] = useState(book?.category || "Clássico");
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
  
  // AUTO SAVE INDICATOR
  const [lastSavedText, setLastSavedText] = useState("Salvo localmente");
  const [isDirty, setIsDirty] = useState(false);
  const [autoSaveTimer, setAutoSaveTimer] = useState<number>(0);
  
  // HISTORY / VERSIONS
  const [versions, setVersions] = useState<VersionRecord[]>([]);
  
  // REFERENCE FOR TEXT SELECTION (WYSIWYG Toolbar Injection)
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // RECONSTRUCT STRUCTURE FROM EXISTING BOOK (BACKWARDS COMPATIBILITY)
  useEffect(() => {
    if (book) {
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
              id: `page-${currentSum.title.replace(/\s+/g, "-")}-${pIdx}-${Date.now()}`,
              content: content
            }));
            
            reconstructedChapters.push({
              id: `chapter-${currentSum.title.replace(/\s+/g, "-")}-${Date.now()}`,
              title: currentSum.title,
              pages: chapterPages.length > 0 ? chapterPages : [{ id: `page-empty-${Date.now()}`, content: "" }]
            });
          }
        } else {
          // No summary available, group pages by 5 or put all in Chapter 1
          const chapterSize = 5;
          let chapterNum = 1;
          for (let i = 0; i < existingPages.length; i += chapterSize) {
            const slice = existingPages.slice(i, i + chapterSize);
            const chapterPages: EditorPage[] = slice.map((content, pIdx) => ({
              id: `page-c${chapterNum}-${pIdx}-${Date.now()}`,
              content: content
            }));
            reconstructedChapters.push({
              id: `chapter-c${chapterNum}-${Date.now()}`,
              title: `Capítulo ${chapterNum}`,
              pages: chapterPages
            });
            chapterNum++;
          }
        }
        
        if (reconstructedChapters.length === 0) {
          reconstructedChapters.push({
            id: `chapter-default-${Date.now()}`,
            title: "Capítulo 1",
            pages: [{ id: `page-default-${Date.now()}`, content: "# Bem-vindo\nComece a escrever seu livro aqui..." }]
          });
        }
        
        setChapters(reconstructedChapters);
        setSelectedChapterId(reconstructedChapters[0].id);
        setSelectedPageId(reconstructedChapters[0].pages[0]?.id || "");
      } else {
        // Empty existing book content
        const defaultChapters = [{
          id: `chapter-1-${Date.now()}`,
          title: "Capítulo I: A Introdução",
          pages: [{ id: `page-1-${Date.now()}`, content: "# Introdução\nEscreva as primeiras linhas do seu romance..." }]
        }];
        setChapters(defaultChapters);
        setSelectedChapterId(defaultChapters[0].id);
        setSelectedPageId(defaultChapters[0].pages[0].id);
      }
    } else {
      // New book - set default structure
      const defaultChapters = [{
        id: `chapter-1-${Date.now()}`,
        title: "Capítulo I",
        pages: [{ id: `page-1-${Date.now()}`, content: "# Introdução\nInsira seu texto rico aqui." }]
      }];
      setChapters(defaultChapters);
      setSelectedChapterId(defaultChapters[0].id);
      setSelectedPageId(defaultChapters[0].pages[0].id);
    }
  }, [book]);

  // INITIALIZE AUTO-SAVE SIMULATOR
  useEffect(() => {
    const interval = setInterval(() => {
      setAutoSaveTimer((prev) => {
        if (prev >= 14) {
          if (isDirty) {
            saveDraftLocally();
          }
          return 0;
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isDirty, chapters, title, author, category, description]);

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

  // WIZARD METADATA VALIDATION
  const handleWizardStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !author || !description) {
      alert("Por favor, preencha os metadados principais (*)");
      return;
    }
    setWizardStep(2);
  };

  // WIZARD SOURCE OPTIONS
  const handleManualCreation = () => {
    setWizardStep(3);
  };

  const handleContinueDraft = () => {
    setWizardStep(3);
  };

  // FILE IMPORT SIMULATION
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportProgress(10);
    setImportStatus("Carregando arquivo...");
    setImportLogs([`Arquivo selecionado: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`]);

    const steps = [
      { p: 30, s: "Analisando cabeçalhos e estrutura de tags...", log: "Identificado formato docx/pdf com codificação UTF-8." },
      { p: 55, s: "Extraindo capítulos e títulos da obra...", log: "Localizado 3 capítulos distintos através de tags hierárquicas." },
      { p: 80, s: "Formatando parágrafos e citações em Markdown...", log: "Conversão WYSIWYG para blocos Markdown finalizada." },
      { p: 100, s: "Concluído com sucesso!", log: "Fatiamento em 6 páginas concluído com base no limite de 600 caracteres." }
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        const step = steps[currentStep];
        setImportProgress(step.p);
        setImportStatus(step.s);
        setImportLogs((prev) => [...prev, `[PROCESSADOR] ${step.log}`]);
        currentStep++;
      } else {
        clearInterval(interval);
        
        // Populate with mock structured content parsed from file
        const importedChapters: EditorChapter[] = [
          {
            id: `chap-imp-1-${Date.now()}`,
            title: "Capítulo I: O Despertar da Aurora",
            pages: [
              {
                id: `page-imp-1-1-${Date.now()}`,
                content: `# Capítulo I: O Despertar da Aurora\n\nEra uma manhã fria de outono quando os primeiros raios de sol tocaram os vitrais da antiga biblioteca do BookVerse. O silêncio era absoluto, interrompido apenas pelo farfalhar suave das folhas secas trazidas pelo vento.\n\n> "A leitura é uma viagem de volta, sem que precisemos sair do lugar."\n\nEste livro representa a materialização do conhecimento acumulado ao longo das gerações rurais. Abaixo, listamos os principais elementos que exploraremos:\n\n* **A Biblioteca Secreta**: O local onde os manuscritos são guardados.\n* **O Guardião dos Tomos**: Aquele que protege as chaves.\n* **A Conversão Digital**: O processo de fatiamento de páginas que assegura uma fluidez impecável.`
              },
              {
                id: `page-imp-1-2-${Date.now()}`,
                content: `### Elementos do Mistério\n\nAbaixo, apresentamos o inventário das obras perdidas recuperadas na primeira expedição:\n\n| Tomo ID | Título Original | Autor Consagrado | Ano Estimado |\n| :--- | :--- | :--- | :--- |\n| #012 | Dom Casmurro | Machado de Assis | 1899 |\n| #045 | Memorial de Aires | Machado de Assis | 1908 |\n| #098 | Quincas Borba | Machado de Assis | 1891 |\n\n:::warning\nApenas administradores de nível Super ou superior possuem acesso irrestrito aos manuscritos com ISBN não catalogado.\n:::\n\nEste foi apenas o primeiro passo da nossa maravilhosa jornada pelas páginas do tempo.`
              }
            ]
          },
          {
            id: `chap-imp-2-${Date.now()}`,
            title: "Capítulo II: O Guardião das Chaves",
            pages: [
              {
                id: `page-imp-2-1-${Date.now()}`,
                content: `# Capítulo II: O Guardião das Chaves\n\nNo segundo capítulo, conhecemos o ancião que habita a torre sul. Suas mãos calejadas revelavam décadas de manuseio cuidadoso de folhas de pergaminho.\n\n### As Três Regras do Guardião:\n\n1. Nunca ler em voz alta após a meia-noite.\n2. Manter as lâmpadas de óleo sempre carregadas.\n3. Certificar-se de que cada página possua um fatiador ativo.\n\n- [x] Conferir fechaduras da ala norte\n- [x] Catalogar novos rascunhos\n- [ ] Realizar a quebra de página manual para revisão`
              }
            ]
          }
        ];

        setChapters(importedChapters);
        setSelectedChapterId(importedChapters[0].id);
        setSelectedPageId(importedChapters[0].pages[0].id);
        
        setTimeout(() => {
          setImporting(false);
          setWizardStep(3);
        }, 1200);
      }
    }, 1000);
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

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) {
        if (inList) {
          blocks.push({ type: "list", content: listItems.join("\n"), key: index });
          listItems = [];
          inList = false;
        }
        return;
      }

      if (trimmed.startsWith("# ")) {
        blocks.push({ type: "h1", content: trimmed.replace("# ", ""), key: index });
      } else if (trimmed.startsWith("## ")) {
        blocks.push({ type: "h2", content: trimmed.replace("## ", ""), key: index });
      } else if (trimmed.startsWith("### ")) {
        blocks.push({ type: "h3", content: trimmed.replace("### ", ""), key: index });
      } else if (trimmed.startsWith("#### ")) {
        blocks.push({ type: "h4", content: trimmed.replace("#### ", ""), key: index });
      } else if (trimmed.startsWith("> ")) {
        blocks.push({ type: "quote", content: trimmed.replace("> ", ""), key: index });
      } else if (trimmed.startsWith(":::note") || trimmed.startsWith(":::warning") || trimmed.startsWith(":::info")) {
        blocks.push({ type: "note", content: trimmed.replace(/:::(note|warning|info)/, "Destaque:"), key: index });
      } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        inList = true;
        listItems.push(trimmed.substring(2));
      } else if (trimmed.startsWith("1. ")) {
        inList = true;
        listItems.push(trimmed.substring(3));
      } else {
        if (inList) {
          blocks.push({ type: "list", content: listItems.join("\n"), key: index });
          listItems = [];
          inList = false;
        }
        blocks.push({ type: "paragraph", content: trimmed, key: index });
      }
    });

    if (inList && listItems.length > 0) {
      blocks.push({ type: "list", content: listItems.join("\n"), key: lines.length });
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
    setChapters([...chapters, newChapter]);
    setSelectedChapterId(newId);
    setSelectedPageId(newChapter.pages[0].id);
    setIsDirty(true);
  };

  const handleRenameChapter = (chapterId: string, newTitle: string) => {
    setChapters(
      chapters.map((c) => (c.id === chapterId ? { ...c, title: newTitle } : c))
    );
    setIsDirty(true);
  };

  const handleDeleteChapter = (chapterId: string) => {
    if (chapters.length <= 1) {
      alert("O livro deve possuir pelo menos um capítulo estruturado.");
      return;
    }
    const filtered = chapters.filter((c) => c.id !== chapterId);
    setChapters(filtered);
    setSelectedChapterId(filtered[0].id);
    setSelectedPageId(filtered[0].pages[0].id);
    setIsDirty(true);
  };

  // PAGE MANAGEMENT
  const handleAddPage = (chapterId: string) => {
    const newPageId = `page-${Date.now()}`;
    setChapters(
      chapters.map((c) => {
        if (c.id === chapterId) {
          const newPage: EditorPage = {
            id: newPageId,
            content: `## Nova Página\nInsira mais conteúdo para este capítulo...`
          };
          return { ...c, pages: [...c.pages, newPage] };
        }
        return c;
      })
    );
    setSelectedChapterId(chapterId);
    setSelectedPageId(newPageId);
    setIsDirty(true);
  };

  const handleDeletePage = (chapterId: string, pageId: string) => {
    const chapter = chapters.find((c) => c.id === chapterId);
    if (!chapter) return;
    
    if (chapter.pages.length <= 1) {
      alert("Este capítulo ficaria sem páginas. Exclua o capítulo se ele não for mais necessário.");
      return;
    }

    setChapters(
      chapters.map((c) => {
        if (c.id === chapterId) {
          return { ...c, pages: c.pages.filter((p) => p.id !== pageId) };
        }
        return c;
      })
    );

    const updatedChapter = chapters.find((c) => c.id === chapterId);
    const remainingPages = updatedChapter?.pages.filter((p) => p.id !== pageId) || [];
    if (remainingPages.length > 0) {
      setSelectedPageId(remainingPages[0].id);
    }
    setIsDirty(true);
  };

  const handleDuplicatePage = (chapterId: string, pageObj: EditorPage) => {
    const newPageId = `page-dup-${Date.now()}`;
    setChapters(
      chapters.map((c) => {
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
      })
    );
    setSelectedPageId(newPageId);
    setIsDirty(true);
  };

  const handleSplitPage = (chapterId: string, pageObj: EditorPage) => {
    const content = pageObj.content;
    const splitIndex = Math.floor(content.length / 2);
    const firstHalf = content.substring(0, splitIndex);
    const secondHalf = content.substring(splitIndex);

    const nextPageId = `page-split-${Date.now()}`;

    setChapters(
      chapters.map((c) => {
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
      })
    );
    setSelectedPageId(nextPageId);
    setIsDirty(true);
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

    setChapters(
      chapters.map((c) => {
        if (c.id === chapterId) {
          const updatedPages = c.pages.filter((p) => p.id !== nextPage.id);
          updatedPages[pageIndex] = { ...pageObj, content: mergedContent };
          return { ...c, pages: updatedPages };
        }
        return c;
      })
    );
    setIsDirty(true);
  };

  const handleMovePageUp = (chapterId: string, pageId: string) => {
    setChapters(
      chapters.map((c) => {
        if (c.id === chapterId) {
          const idx = c.pages.findIndex((p) => p.id === pageId);
          if (idx === 0) return c;
          const updated = [...c.pages];
          const temp = updated[idx];
          updated[idx] = updated[idx - 1];
          updated[idx - 1] = temp;
          return { ...c, pages: updated };
        }
        return c;
      })
    );
    setIsDirty(true);
  };

  const handleMovePageDown = (chapterId: string, pageId: string) => {
    setChapters(
      chapters.map((c) => {
        if (c.id === chapterId) {
          const idx = c.pages.findIndex((p) => p.id === pageId);
          if (idx === c.pages.length - 1) return c;
          const updated = [...c.pages];
          const temp = updated[idx];
          updated[idx] = updated[idx + 1];
          updated[idx + 1] = temp;
          return { ...c, pages: updated };
        }
        return c;
      })
    );
    setIsDirty(true);
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

    setChapters(updatedChapters);
    setSelectedChapterId(nextChapterId);
    setSelectedPageId(secondHalfPages[0].id);
    setIsDirty(true);
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

    setChapters(updatedChapters);
    setIsDirty(true);
  };

  const handleMoveChapterUp = (chapterIndex: number) => {
    if (chapterIndex === 0) return;
    const updated = [...chapters];
    const temp = updated[chapterIndex];
    updated[chapterIndex] = updated[chapterIndex - 1];
    updated[chapterIndex - 1] = temp;
    setChapters(updated);
    setIsDirty(true);
  };

  const handleMoveChapterDown = (chapterIndex: number) => {
    if (chapterIndex === chapters.length - 1) return;
    const updated = [...chapters];
    const temp = updated[chapterIndex];
    updated[chapterIndex] = updated[chapterIndex + 1];
    updated[chapterIndex + 1] = temp;
    setChapters(updated);
    setIsDirty(true);
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

  // COMPILE AND PUBLISH (SAVE AND EXPORT)
  const handlePublishSubmit = async () => {
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
      status: book?.status || "Draft" // Keep status or default to Draft
    };

    try {
      await onSave(payload);
    } catch (err) {
      alert("Falha ao salvar as modificações do livro: " + err);
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
            <button
              onClick={() => setShowStatsModal(true)}
              className="p-2 bg-white border border-[#ece9dc] hover:bg-zinc-50 text-zinc-600 rounded-xl transition cursor-pointer"
              title="Métricas em tempo real"
            >
              <BarChart2 className="w-4 h-4" />
            </button>

            <button
              onClick={() => setShowHistoryModal(true)}
              className="p-2 bg-white border border-[#ece9dc] hover:bg-zinc-50 text-zinc-600 rounded-xl transition cursor-pointer"
              title="Histórico de Versões"
            >
              <History className="w-4 h-4" />
            </button>

            <button
              onClick={() => setShowChecklistModal(true)}
              className="bg-[#8a7e58] hover:bg-[#4a432d] text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Check className="w-3.5 h-3.5" /> Finalizar & Publicar
            </button>

            <button
              onClick={onClose}
              className="p-2 hover:bg-red-50 text-red-500 hover:text-red-700 rounded-xl border border-transparent hover:border-red-100 transition cursor-pointer"
              title="Sair do editor"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* WIZARD SCREENS (Only if creating new book and not in editor step 3 yet) */}
        {wizardStep === 1 && (
          <div className="flex-grow overflow-y-auto p-6 md:p-12 max-w-3xl mx-auto w-full text-left flex flex-col justify-center">
            <div className="space-y-6 bg-white p-8 border border-[#ece9dc] rounded-3xl shadow-sm">
              <div className="border-b border-[#ece9dc] pb-4">
                <span className="text-[10px] text-[#8a7e58] font-bold uppercase tracking-wider font-mono">Etapa 1 de 2</span>
                <h2 className="text-xl font-serif font-bold text-zinc-900 mt-1">Configurar Ficha Catalográfica</h2>
                <p className="text-xs text-gray-400 mt-1">Preencha com exatidão as informações bibliográficas da obra.</p>
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
                      className="w-full bg-zinc-50 border border-[#ece9dc] focus:bg-white text-zinc-900 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-[#8a7e58] cursor-pointer"
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
                    <label className="text-xs font-bold text-gray-500 block">Idioma *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Português"
                      className="w-full bg-zinc-50 border border-[#ece9dc] focus:bg-white text-zinc-900 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-[#8a7e58]"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                    />
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
                    <label className="text-xs font-bold text-gray-500 block">URL da Capa do Livro</label>
                    <input
                      type="url"
                      placeholder="Ex: https://images.unsplash.com/photo-..."
                      className="w-full bg-zinc-50 border border-[#ece9dc] focus:bg-white text-zinc-900 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-[#8a7e58]"
                      value={coverUrl}
                      onChange={(e) => setCoverUrl(e.target.value)}
                    />
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
          <div className="flex-grow overflow-y-auto p-6 md:p-12 max-w-4xl mx-auto w-full text-left flex flex-col justify-center">
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
            
            {/* SIDEBAR NAVIGATION (COLLAPSIBLE / RICH CAPÍTULOS & PÁGINAS) */}
            {viewMode === "editor" && (
              <div className="w-64 border-r border-[#ece9dc] bg-white flex flex-col justify-between flex-shrink-0">
                
                {/* Upper Sidebar: Chapters & Pages list */}
                <div className="flex-grow flex flex-col overflow-hidden">
                  <div className="p-4 border-b border-[#ece9dc] flex justify-between items-center bg-[#FAF9F5]">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Estrutura do Livro</span>
                    <button
                      onClick={handleAddChapter}
                      className="p-1 hover:bg-zinc-100 text-[#8a7e58] rounded-md transition flex items-center gap-0.5 text-[10px] font-bold cursor-pointer border border-[#ece9dc]"
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
                          <div className={`p-2 rounded-xl flex items-center justify-between gap-1 transition ${
                            isSelectedChapter ? "bg-zinc-100/80 border border-zinc-200" : "hover:bg-zinc-50 border border-transparent"
                          }`}>
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
                                  onClick={() => {
                                    setSelectedChapterId(chap.id);
                                    setSelectedPageId(page.id);
                                  }}
                                  className={`p-1.5 rounded-lg flex items-center justify-between gap-1 cursor-pointer transition text-[10px] ${
                                    isSelectedPage 
                                      ? "bg-[#8a7e58]/15 text-[#8a7e58] border border-[#8a7e58]/20 font-bold" 
                                      : "hover:bg-zinc-100 text-gray-500 hover:text-zinc-800"
                                  }`}
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
                                        disabled={pageIdx === 0}
                                        className="p-0.5 hover:bg-[#8a7e58]/10 text-zinc-600 rounded disabled:opacity-30 cursor-pointer"
                                        title="Subir página"
                                      >
                                        <ChevronUp className="w-2.5 h-2.5" />
                                      </button>
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleMovePageDown(chap.id, page.id);
                                        }}
                                        disabled={pageIdx === chap.pages.length - 1}
                                        className="p-0.5 hover:bg-[#8a7e58]/10 text-zinc-600 rounded disabled:opacity-30 cursor-pointer"
                                        title="Descer página"
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
                    </div>

                    {/* INDEX SYNC BANNER */}
                    <div className="hidden xl:flex items-center gap-1.5 text-[10px] bg-emerald-50 border border-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>Sumário Sincronizado</span>
                    </div>

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
                              <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider block">Inserir Conteúdo Rico</span>
                              <textarea
                                ref={textareaRef}
                                value={getActivePage()?.content || ""}
                                onChange={(e) => updateActivePageContent(e.target.value)}
                                className="w-full flex-grow p-4 border border-[#ece9dc] focus:ring-1 focus:ring-zinc-400 rounded-2xl bg-white text-xs font-serif leading-relaxed text-zinc-900 focus:outline-none resize-none"
                                placeholder="Digite o conteúdo da sua página literária aqui..."
                              />
                            </div>

                            {/* Visual Right Live Render Area */}
                            <div className="flex flex-col h-full space-y-2 overflow-hidden">
                              <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider block">Visualização Real no BookVerse</span>
                              <div className="w-full flex-grow p-6 border border-[#ece9dc] rounded-2xl bg-white text-zinc-800 overflow-y-auto shadow-inner prose prose-sm leading-relaxed font-serif text-left">
                                <ReactMarkdown>{getActivePage()?.content || "_Nenhum conteúdo nesta página ainda._"}</ReactMarkdown>
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

                    {/* DYNAMIC DOCUMENT BLOCKS SIDEBAR (Structured Model) */}
                    <div className="hidden lg:flex w-72 border-l border-[#ece9dc] bg-white flex-col justify-between overflow-hidden">
                      <div className="p-4 border-b border-[#ece9dc] bg-[#FAF9F5]">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                          <Database className="w-3.5 h-3.5 text-[#8a7e58]" />
                          Modelo Estruturado em Blocos
                        </span>
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

                      <div className="p-4 border-t border-zinc-100 bg-zinc-50">
                        <div className="text-[10px] text-[#8a7e58] font-bold flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Pronto para futuras IAs</span>
                        </div>
                        <p className="text-[9px] text-gray-400 mt-1 leading-relaxed">
                          Cada bloco possui identificador único no Firestore que possibilita futuras ferramentas de tradução automática e revisão estrutural de narrativa.
                        </p>
                      </div>
                    </div>

                  </div>
                </>
              ) : (
                /* READER SIMULATOR VIEW (MODO LEITOR FIEL) */
                <div className="flex-grow flex items-center justify-center p-6 bg-zinc-100/60 overflow-y-auto">
                  <div className="w-full max-w-2xl bg-white rounded-3xl border border-[#ece9dc] shadow-xl p-8 md:p-12 min-h-[500px] flex flex-col justify-between space-y-8 relative">
                    
                    {/* Simulated Book Top Header */}
                    <div className="flex justify-between items-center border-b border-zinc-200/50 pb-2 text-[10px] text-gray-400 tracking-wider font-sans font-bold uppercase text-left">
                      <span>{title || "Sem título"}</span>
                      <span>
                        {chapters.find(c => c.id === selectedChapterId)?.title || "Capítulo"}
                      </span>
                    </div>

                    {/* Simulated Book Main Content */}
                    <div className="flex-grow py-4 prose prose-zinc font-serif text-zinc-800 leading-relaxed text-left max-w-none">
                      <ReactMarkdown>{getActivePage()?.content || "*Sem conteúdo nesta página.*"}</ReactMarkdown>
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
                    className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition"
                  >
                    Voltar a Editar
                  </button>
                  <button
                    onClick={handlePublishSubmit}
                    disabled={saveLoading}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-1"
                  >
                    {saveLoading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    Salvar e Publicar Livro
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
