import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { INITIAL_BOOKS } from "./src/initialBooks";
import { User, Book, ReadingProgress, Bookmark, HighlightAndNote, Review, ReadingStats } from "./src/types";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Initialize File-based database
const DB_DIR = path.join(process.cwd(), "src", "db");
const DB_FILE = path.join(DB_DIR, "db.json");

interface DatabaseSchema {
  users: User[];
  books: Book[];
  progress: ReadingProgress[];
  bookmarks: Bookmark[];
  notes: HighlightAndNote[];
  reviews: Review[];
  stats: ReadingStats[];
}

const DEFAULT_DB: DatabaseSchema = {
  users: [
    {
      id: "demo-user",
      email: "tutojose1@gmail.com",
      name: "Tuto José",
      avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop",
      createdAt: new Date().toISOString(),
    }
  ],
  books: INITIAL_BOOKS,
  progress: [
    {
      userId: "demo-user",
      bookId: "dom-casmurro",
      lastPage: 0,
      progressPercentage: 16,
      lastReadAt: new Date().toISOString(),
      audioPositionSeconds: 0
    }
  ],
  bookmarks: [],
  notes: [],
  reviews: [
    {
      id: "rev1",
      userId: "demo-user",
      bookId: "dom-casmurro",
      userName: "Tuto José",
      rating: 5,
      comment: "Uma obra-prima absoluta da literatura mundial! Capitu e Bentinho vivem nos nossos corações e mentes. A discussão sobre a traição continua viva.",
      createdAt: new Date().toISOString(),
    }
  ],
  stats: [
    {
      userId: "demo-user",
      readingMinutes: 120,
      listeningMinutes: 45,
      booksCompletedCount: 1,
      booksInProgressCount: 2,
      pagesReadCount: 34,
      avgSessionMinutes: 25
    }
  ]
};

function readDb(): DatabaseSchema {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2));
      return DEFAULT_DB;
    }
    const data = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(data) as DatabaseSchema;
  } catch (error) {
    console.error("Error reading database file:", error);
    return DEFAULT_DB;
  }
}

function writeDb(data: DatabaseSchema) {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error writing to database file:", error);
  }
}

// Ensure database file is initialized on startup
readDb();

// Gemini Client initialization
let ai: GoogleGenAI | null = null;
const apiKey = process.env.GEMINI_API_KEY;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
  console.log("Gemini client successfully initialized server-side.");
} else {
  console.warn("GEMINI_API_KEY environment variable is not set. Gemini AI functionalities will operate in mock fallback mode.");
}

// API Routes

// Authentication API
app.post("/api/auth/register", (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    res.status(400).json({ error: "Nome, email e senha são obrigatórios." });
    return;
  }

  const db = readDb();
  const existing = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    res.status(400).json({ error: "Já existe um usuário cadastrado com este email." });
    return;
  }

  const newUser: User = {
    id: "user-" + Math.random().toString(36).substr(2, 9),
    email: email.toLowerCase(),
    name: name,
    avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`,
    createdAt: new Date().toISOString(),
  };

  db.users.push(newUser);
  
  // Initialize default stats for the new user
  const newStats: ReadingStats = {
    userId: newUser.id,
    readingMinutes: 0,
    listeningMinutes: 0,
    booksCompletedCount: 0,
    booksInProgressCount: 0,
    pagesReadCount: 0,
    avgSessionMinutes: 0
  };
  db.stats.push(newStats);
  
  writeDb(db);

  res.status(201).json({ user: newUser });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email e senha são obrigatórios." });
    return;
  }

  const db = readDb();
  // Simple check - in production we'd hash passwords, but for the local sandbox we verify by email match
  const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    res.status(401).json({ error: "Credenciais inválidas ou e-mail não encontrado." });
    return;
  }

  res.json({ user });
});

app.get("/api/auth/me/:userId", (req, res) => {
  const { userId } = req.params;
  const db = readDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    res.status(404).json({ error: "Usuário não encontrado." });
    return;
  }
  res.json({ user });
});

app.post("/api/auth/update-profile", (req, res) => {
  const { userId, name, avatarUrl } = req.body;
  if (!userId) {
    res.status(400).json({ error: "ID do usuário é obrigatório." });
    return;
  }

  const db = readDb();
  const userIndex = db.users.findIndex((u) => u.id === userId);
  if (userIndex === -1) {
    res.status(404).json({ error: "Usuário não encontrado." });
    return;
  }

  if (name) db.users[userIndex].name = name;
  if (avatarUrl) db.users[userIndex].avatarUrl = avatarUrl;

  writeDb(db);
  res.json({ user: db.users[userIndex] });
});

// Books API
app.get("/api/books", (req, res) => {
  const db = readDb();
  const { search, category } = req.query;
  let result = [...db.books];

  if (search) {
    const q = String(search).toLowerCase();
    result = result.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q)
    );
  }

  if (category && category !== "Todas") {
    result = result.filter((b) => b.category === category);
  }

  res.json(result);
});

app.get("/api/books/:id", (req, res) => {
  const db = readDb();
  const book = db.books.find((b) => b.id === req.params.id);
  if (!book) {
    res.status(404).json({ error: "Livro não encontrado." });
    return;
  }
  res.json(book);
});

// Admin Operations for Books Catalog (CRUD)
app.post("/api/admin/books", (req, res) => {
  const { title, author, category, description, pages, estimatedReadTime, audiobookAvailable, audioDuration, coverUrl, language, publishDate, pdfContent, audioChapters } = req.body;
  
  if (!title || !author || !category || !description || !pdfContent || pdfContent.length === 0) {
    res.status(400).json({ error: "Campos obrigatórios ausentes: Título, Autor, Categoria, Descrição ou Conteúdo de páginas." });
    return;
  }

  const db = readDb();
  const newBook: Book = {
    id: "book-" + Math.random().toString(36).substr(2, 9),
    title,
    author,
    category,
    description,
    pages: Number(pages || pdfContent.length),
    estimatedReadTime: estimatedReadTime || `${Math.ceil(pdfContent.length * 5)}m`,
    audiobookAvailable: !!audiobookAvailable,
    audioDuration: audiobookAvailable ? (audioDuration || "30m") : undefined,
    coverUrl: coverUrl || "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=600&auto=format&fit=crop",
    language: language || "Português",
    publishDate: publishDate || new Date().getFullYear().toString(),
    pdfContent,
    audioChapters: audiobookAvailable ? (audioChapters || pdfContent.map((_: any, i: number) => ({ title: `Capítulo ${i + 1}`, startPage: i, durationSeconds: 120 }))) : undefined
  };

  db.books.push(newBook);
  writeDb(db);

  res.status(201).json(newBook);
});

app.put("/api/admin/books/:id", (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const db = readDb();
  const bookIndex = db.books.findIndex((b) => b.id === id);
  if (bookIndex === -1) {
    res.status(404).json({ error: "Livro não encontrado." });
    return;
  }

  db.books[bookIndex] = {
    ...db.books[bookIndex],
    ...updates,
    pages: updates.pdfContent ? updates.pdfContent.length : db.books[bookIndex].pages
  };

  writeDb(db);
  res.json(db.books[bookIndex]);
});

app.delete("/api/admin/books/:id", (req, res) => {
  const { id } = req.params;
  const db = readDb();
  
  const initialLen = db.books.length;
  db.books = db.books.filter((b) => b.id !== id);
  
  if (db.books.length === initialLen) {
    res.status(404).json({ error: "Livro não encontrado." });
    return;
  }

  // Also clean up favorites, progress, bookmarks, notes, reviews related to this book
  db.progress = db.progress.filter((p) => p.bookId !== id);
  db.bookmarks = db.bookmarks.filter((b) => b.bookId !== id);
  db.notes = db.notes.filter((n) => n.bookId !== id);
  db.reviews = db.reviews.filter((r) => r.bookId !== id);

  writeDb(db);
  res.json({ success: true, message: "Livro removido com sucesso." });
});

// Reading Progress API
app.get("/api/progress/:userId/:bookId", (req, res) => {
  const { userId, bookId } = req.params;
  const db = readDb();
  const progress = db.progress.find((p) => p.userId === userId && p.bookId === bookId);
  if (!progress) {
    res.json({
      userId,
      bookId,
      lastPage: 0,
      progressPercentage: 0,
      lastReadAt: new Date().toISOString(),
      audioPositionSeconds: 0
    });
    return;
  }
  res.json(progress);
});

app.get("/api/progress/:userId", (req, res) => {
  const { userId } = req.params;
  const db = readDb();
  const progressList = db.progress.filter((p) => p.userId === userId);
  res.json(progressList);
});

app.post("/api/progress", (req, res) => {
  const { userId, bookId, lastPage, audioPositionSeconds } = req.body;
  if (!userId || !bookId) {
    res.status(400).json({ error: "ID de usuário e ID de livro são obrigatórios." });
    return;
  }

  const db = readDb();
  const book = db.books.find((b) => b.id === bookId);
  if (!book) {
    res.status(404).json({ error: "Livro não encontrado." });
    return;
  }

  const progressIndex = db.progress.findIndex((p) => p.userId === userId && p.bookId === bookId);
  
  // Calculate percentage
  const totalPages = book.pages;
  const progressPercentage = Math.round(((lastPage + 1) / totalPages) * 100);

  const now = new Date().toISOString();

  // Handle Reading Sessions / Statistics increments
  const statsIndex = db.stats.findIndex((s) => s.userId === userId);
  if (statsIndex !== -1) {
    // Increment pages read count if user moves forward
    const oldProgress = db.progress[progressIndex];
    if (!oldProgress) {
      db.stats[statsIndex].booksInProgressCount += 1;
      db.stats[statsIndex].pagesReadCount += (lastPage + 1);
    } else {
      if (lastPage > oldProgress.lastPage) {
        db.stats[statsIndex].pagesReadCount += (lastPage - oldProgress.lastPage);
      }
    }

    // Mark as completed if we hit the final page
    if (progressPercentage >= 100) {
      // Check if it wasn't already completed
      const wasCompleted = oldProgress && oldProgress.progressPercentage >= 100;
      if (!wasCompleted) {
        db.stats[statsIndex].booksCompletedCount += 1;
        db.stats[statsIndex].booksInProgressCount = Math.max(0, db.stats[statsIndex].booksInProgressCount - 1);
      }
    }
  }

  // Record reading session duration simulation
  if (statsIndex !== -1) {
    db.stats[statsIndex].readingMinutes += 3; // simulate 3 minutes per sync update
    db.stats[statsIndex].avgSessionMinutes = Math.round(db.stats[statsIndex].readingMinutes / Math.max(1, db.stats[statsIndex].booksInProgressCount + db.stats[statsIndex].booksCompletedCount));
  }

  if (progressIndex === -1) {
    const newProgress: ReadingProgress = {
      userId,
      bookId,
      lastPage: lastPage || 0,
      progressPercentage,
      lastReadAt: now,
      audioPositionSeconds: audioPositionSeconds || 0,
    };
    db.progress.push(newProgress);
  } else {
    db.progress[progressIndex] = {
      ...db.progress[progressIndex],
      lastPage: lastPage !== undefined ? lastPage : db.progress[progressIndex].lastPage,
      progressPercentage: lastPage !== undefined ? progressPercentage : db.progress[progressIndex].progressPercentage,
      audioPositionSeconds: audioPositionSeconds !== undefined ? audioPositionSeconds : db.progress[progressIndex].audioPositionSeconds,
      lastReadAt: now,
    };
  }

  writeDb(db);
  res.json(progressIndex === -1 ? db.progress[db.progress.length - 1] : db.progress[progressIndex]);
});

// Audiobook session tracker stats
app.post("/api/stats/listen", (req, res) => {
  const { userId, seconds } = req.body;
  if (!userId || !seconds) {
    res.status(400).json({ error: "UserId e segundos são necessários." });
    return;
  }
  const db = readDb();
  const statsIndex = db.stats.findIndex((s) => s.userId === userId);
  if (statsIndex !== -1) {
    db.stats[statsIndex].listeningMinutes += Math.round(seconds / 60);
    writeDb(db);
    res.json(db.stats[statsIndex]);
  } else {
    res.status(404).json({ error: "Stats não encontradas." });
  }
});

// Bookmarks API
app.get("/api/bookmarks/:userId/:bookId", (req, res) => {
  const { userId, bookId } = req.params;
  const db = readDb();
  const bookmarks = db.bookmarks.filter((b) => b.userId === userId && b.bookId === bookId);
  res.json(bookmarks);
});

app.post("/api/bookmarks", (req, res) => {
  const { userId, bookId, page } = req.body;
  if (!userId || !bookId || page === undefined) {
    res.status(400).json({ error: "ID de usuário, ID de livro e página são obrigatórios." });
    return;
  }

  const db = readDb();
  const existingIndex = db.bookmarks.findIndex(
    (b) => b.userId === userId && b.bookId === bookId && b.page === page
  );

  if (existingIndex !== -1) {
    // Toggle behavior: remove if exists
    db.bookmarks.splice(existingIndex, 1);
    writeDb(db);
    res.json({ toggled: "removed", bookmarks: db.bookmarks.filter((b) => b.userId === userId && b.bookId === bookId) });
  } else {
    const newBookmark: Bookmark = {
      id: "bookmark-" + Math.random().toString(36).substr(2, 9),
      userId,
      bookId,
      page,
      createdAt: new Date().toISOString(),
    };
    db.bookmarks.push(newBookmark);
    writeDb(db);
    res.status(201).json({ toggled: "added", bookmark: newBookmark, bookmarks: db.bookmarks.filter((b) => b.userId === userId && b.bookId === bookId) });
  }
});

// Highlights & Notes API
app.get("/api/notes/:userId/:bookId", (req, res) => {
  const { userId, bookId } = req.params;
  const db = readDb();
  const notes = db.notes.filter((n) => n.userId === userId && n.bookId === bookId);
  res.json(notes);
});

app.post("/api/notes", (req, res) => {
  const { userId, bookId, page, selectedText, text, color } = req.body;
  if (!userId || !bookId || page === undefined || !selectedText) {
    res.status(400).json({ error: "ID de usuário, ID de livro, página e texto selecionado são obrigatórios." });
    return;
  }

  const db = readDb();
  const newNote: HighlightAndNote = {
    id: "note-" + Math.random().toString(36).substr(2, 9),
    userId,
    bookId,
    page,
    selectedText,
    text: text || "",
    color: color || "yellow",
    createdAt: new Date().toISOString(),
  };

  db.notes.push(newNote);
  writeDb(db);
  res.status(201).json(newNote);
});

app.delete("/api/notes/:id", (req, res) => {
  const { id } = req.params;
  const db = readDb();
  const initialLen = db.notes.length;
  db.notes = db.notes.filter((n) => n.id !== id);
  if (db.notes.length === initialLen) {
    res.status(404).json({ error: "Destaque/Nota não encontrada." });
    return;
  }
  writeDb(db);
  res.json({ success: true, message: "Destaque removido." });
});

// Reviews API
app.get("/api/reviews/:bookId", (req, res) => {
  const { bookId } = req.params;
  const db = readDb();
  const reviews = db.reviews.filter((r) => r.bookId === bookId);
  res.json(reviews);
});

app.post("/api/reviews", (req, res) => {
  const { userId, bookId, rating, comment } = req.body;
  if (!userId || !bookId || !rating || !comment) {
    res.status(400).json({ error: "UserId, BookId, rating e comment são necessários." });
    return;
  }

  const db = readDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    res.status(404).json({ error: "Usuário não encontrado." });
    return;
  }

  const newReview: Review = {
    id: "rev-" + Math.random().toString(36).substr(2, 9),
    userId,
    bookId,
    userName: user.name,
    rating: Number(rating),
    comment,
    createdAt: new Date().toISOString(),
  };

  db.reviews.push(newReview);
  writeDb(db);
  res.status(201).json(newReview);
});

// Reading Stats API
app.get("/api/stats/:userId", (req, res) => {
  const { userId } = req.params;
  const db = readDb();
  const stats = db.stats.find((s) => s.userId === userId);
  if (!stats) {
    res.json({
      userId,
      readingMinutes: 0,
      listeningMinutes: 0,
      booksCompletedCount: 0,
      booksInProgressCount: 0,
      pagesReadCount: 0,
      avgSessionMinutes: 0
    });
    return;
  }
  res.json(stats);
});

// Gemini Reading Assistant API Integration
app.post("/api/gemini/assistant", async (req, res) => {
  const { mode, bookTitle, author, textSnippet, pageNumber, userQuestion } = req.body;
  
  if (!mode) {
    res.status(400).json({ error: "O modo do assistente é obrigatório (resumir, explicar, traduzir, qa, flashcard)." });
    return;
  }

  if (!ai) {
    // Mock / Offline Fallback responses when GEMINI_API_KEY is not defined
    let fallbackText = "";
    if (mode === "resumir") {
      fallbackText = `💡 **Modo de Demonstração Offline (Chave do Gemini não configurada)**\n\n**Resumo do Capítulo ${pageNumber !== undefined ? pageNumber + 1 : ""} de "${bookTitle}":**\nEste trecho introduz os principais conflitos da narrativa de ${author}. O autor estabelece a ambientação e a voz narrativa única da obra, preparando as tensões dramáticas ou reflexões filosóficas que conduzirão o leitor ao longo do enredo.`;
    } else if (mode === "explicar") {
      fallbackText = `💡 **Modo de Demonstração Offline (Chave do Gemini não configurada)**\n\n**Explicação do termo/trecho:**\nO trecho selecionado demonstra o estilo literário refinado e as escolhas vocabulares de ${author}. No contexto da narrativa, ressalta nuances de humor, melancolia ou subtexto psicológico cruciais para a compreensão da obra.`;
    } else if (mode === "traduzir") {
      fallbackText = `💡 **Modo de Demonstração Offline (Chave do Gemini não configurada)**\n\n**Tradução sugerida (Inglês):**\n"This passage illustrates the emotional weight and specific terminology used in '${bookTitle}' by ${author}."`;
    } else if (mode === "flashcard") {
      fallbackText = `💡 **Modo de Demonstração Offline (Chave do Gemini não configurada)**\n\n**Flashcard de Memorização Gerado:**\n*Pergunta:* Qual o tema central e o impacto do trecho selecionado em '${bookTitle}'?\n*Resposta:* O trecho simboliza o núcleo dramático da obra de ${author}, evidenciando traços estilísticos marcantes e conflitos de personagens.`;
    } else {
      fallbackText = `💡 **Modo de Demonstração Offline (Chave do Gemini não configurada)**\n\n**Resposta:**\nSua pergunta sobre "${bookTitle}": "${userQuestion}".\nNo texto, este momento destaca a profundidade psicológica e as complexidades temáticas características de ${author}. Para respostas baseadas em IA real, ative sua chave da API do Gemini nos segredos do AI Studio.`;
    }
    res.json({ result: fallbackText });
    return;
  }

  try {
    let prompt = "";
    let systemInstruction = "Você é o assistente inteligente de leitura do BookVerse, um app premium de e-books e audiobooks. Responda em português de forma clara, amigável, elegante e concisa, formatando com Markdown.";

    switch (mode) {
      case "resumir":
        prompt = `Você é o assistente de leitura. Por favor, forneça um resumo perspicaz, conciso e elegante do seguinte trecho do livro "${bookTitle}" escrito por ${author} (Página ${pageNumber !== undefined ? pageNumber + 1 : "atual"}):\n\n"${textSnippet}"\n\nDestaque as ideias principais e os sentimentos expressos no trecho de forma estimulante para o leitor.`;
        break;
      case "explicar":
        prompt = `Você é o assistente de leitura. Por favor, explique de forma simples, rica e contextualizada o seguinte termo, palavra ou parágrafo extraído de "${bookTitle}" de ${author}:\n\n"${textSnippet}"\n\nForneça o significado e por que ele é estilisticamente ou historicamente importante no contexto literário nacional/mundial.`;
        break;
      case "traduzir":
        prompt = `Você é o assistente de leitura. Por favor, forneça uma tradução elegante para o inglês (ou mantenha fidelidade poética) do seguinte trecho de "${bookTitle}" de ${author}:\n\n"${textSnippet}"\n\nSe aplicável, explique brevemente qualquer termo idiomático do português que possa se perder na tradução direta.`;
        break;
      case "flashcard":
        prompt = `Você é o assistente de leitura do BookVerse. Crie um Flashcard de memorização ativa com base no seguinte trecho de "${bookTitle}" de ${author}:\n\n"${textSnippet}"\n\nO flashcard deve conter:\n- Uma Pergunta provocativa no topo\n- Uma Resposta explicativa detalhada e concisa no verso\n- Um conceito-chave relacionado.`;
        break;
      case "qa":
        prompt = `Você é o assistente de leitura de "${bookTitle}" por ${author}.\nO leitor está na página ${pageNumber !== undefined ? pageNumber + 1 : "atual"} cujo conteúdo é:\n\n"${textSnippet}"\n\nO leitor perguntou: "${userQuestion}"\n\nResponda à pergunta do leitor com extrema precisão histórica, literária e contextual baseando-se no texto do livro e no seu vasto conhecimento sobre a obra.`;
        break;
      default:
        prompt = `Resuma este trecho de "${bookTitle}" de ${author}: "${textSnippet}"`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      },
    });

    res.json({ result: response.text });
  } catch (error: any) {
    console.error("Gemini assistant error:", error);
    res.status(500).json({ error: "Erro ao consultar o assistente Gemini AI: " + error.message });
  }
});

// Gemini TTS API Integration
app.post("/api/gemini/tts", async (req, res) => {
  const { text, voice } = req.body;
  if (!text) {
    res.status(400).json({ error: "Texto para síntese é obrigatório." });
    return;
  }

  const selectedVoice = voice || "Kore"; // Kore, Puck, Charon, Fenrir, Zephyr

  if (!ai) {
    // Return mock indicator if GEMINI_API_KEY is not defined
    res.json({ mock: true });
    return;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: selectedVoice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      res.json({ audio: base64Audio });
    } else {
      res.status(500).json({ error: "Nenhum dado de áudio retornado pelo modelo Gemini TTS." });
    }
  } catch (error: any) {
    console.error("Gemini TTS error:", error);
    const errMsg = error?.message || "";
    const isQuota = errMsg.includes("quota") || errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || error?.status === 429;
    
    if (isQuota) {
      res.status(429).json({ error: "Limite de quota do narrador IA Gemini excedido para este minuto. Transição automática para o sintetizador local padrão.", quotaExceeded: true });
    } else {
      res.status(500).json({ error: "Erro ao sintetizar voz no servidor: " + errMsg });
    }
  }
});

// Vite & Static file serving integration
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // SPA routing catch-all
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[BookVerse Server] Running at http://localhost:${PORT}`);
  });
}

startServer();
