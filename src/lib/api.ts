import { User, Book, ReadingProgress, Bookmark, HighlightAndNote, Review, ReadingStats } from "../types";

const BASE_URL = ""; // Relative paths since frontend and backend run on same server

export async function fetchBooks(search?: string, category?: string): Promise<Book[]> {
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  if (category) params.append("category", category);
  
  const res = await fetch(`${BASE_URL}/api/books?${params.toString()}`);
  if (!res.ok) throw new Error("Erro ao carregar livros");
  return res.json();
}

export async function fetchBookById(id: string): Promise<Book> {
  const res = await fetch(`${BASE_URL}/api/books/${id}`);
  if (!res.ok) throw new Error("Erro ao carregar detalhes do livro");
  return res.json();
}

export async function fetchUserProgress(userId: string, bookId: string): Promise<ReadingProgress> {
  const res = await fetch(`${BASE_URL}/api/progress/${userId}/${bookId}`);
  if (!res.ok) throw new Error("Erro ao obter progresso de leitura");
  return res.json();
}

export async function fetchAllUserProgress(userId: string): Promise<ReadingProgress[]> {
  const res = await fetch(`${BASE_URL}/api/progress/${userId}`);
  if (!res.ok) throw new Error("Erro ao carregar lista de progressos");
  return res.json();
}

export async function saveReadingProgress(
  userId: string,
  bookId: string,
  lastPage: number,
  audioPositionSeconds?: number
): Promise<ReadingProgress> {
  const res = await fetch(`${BASE_URL}/api/progress`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, bookId, lastPage, audioPositionSeconds }),
  });
  if (!res.ok) throw new Error("Erro ao salvar progresso de leitura");
  return res.json();
}

export async function saveAudioListeningTime(userId: string, seconds: number): Promise<ReadingStats> {
  const res = await fetch(`${BASE_URL}/api/stats/listen`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, seconds }),
  });
  if (!res.ok) throw new Error("Erro ao registrar estatísticas de áudio");
  return res.json();
}

export async function fetchBookmarks(userId: string, bookId: string): Promise<Bookmark[]> {
  const res = await fetch(`${BASE_URL}/api/bookmarks/${userId}/${bookId}`);
  if (!res.ok) throw new Error("Erro ao carregar marcadores");
  return res.json();
}

export async function toggleBookmark(userId: string, bookId: string, page: number): Promise<{ toggled: string; bookmarks: Bookmark[] }> {
  const res = await fetch(`${BASE_URL}/api/bookmarks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, bookId, page }),
  });
  if (!res.ok) throw new Error("Erro ao gerenciar marcador");
  return res.json();
}

export async function fetchNotes(userId: string, bookId: string): Promise<HighlightAndNote[]> {
  const res = await fetch(`${BASE_URL}/api/notes/${userId}/${bookId}`);
  if (!res.ok) throw new Error("Erro ao obter destaques e anotações");
  return res.json();
}

export async function createNote(
  userId: string,
  bookId: string,
  page: number,
  selectedText: string,
  text: string,
  color: string
): Promise<HighlightAndNote> {
  const res = await fetch(`${BASE_URL}/api/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, bookId, page, selectedText, text, color }),
  });
  if (!res.ok) throw new Error("Erro ao criar anotação");
  return res.json();
}

export async function deleteNote(id: string): Promise<boolean> {
  const res = await fetch(`${BASE_URL}/api/notes/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Erro ao remover destaque");
  return true;
}

export async function fetchReviews(bookId: string): Promise<Review[]> {
  const res = await fetch(`${BASE_URL}/api/reviews/${bookId}`);
  if (!res.ok) throw new Error("Erro ao carregar avaliações");
  return res.json();
}

export async function submitReview(userId: string, bookId: string, rating: number, comment: string): Promise<Review> {
  const res = await fetch(`${BASE_URL}/api/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, bookId, rating, comment }),
  });
  if (!res.ok) throw new Error("Erro ao enviar avaliação");
  return res.json();
}

export async function fetchUserStats(userId: string): Promise<ReadingStats> {
  const res = await fetch(`${BASE_URL}/api/stats/${userId}`);
  if (!res.ok) throw new Error("Erro ao carregar estatísticas do usuário");
  return res.json();
}

// Admin Operations
export async function adminCreateBook(bookData: Partial<Book>): Promise<Book> {
  const res = await fetch(`${BASE_URL}/api/admin/books`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bookData),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Erro ao adicionar livro");
  }
  return res.json();
}

export async function adminUpdateBook(id: string, updates: Partial<Book>): Promise<Book> {
  const res = await fetch(`${BASE_URL}/api/admin/books/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error("Erro ao atualizar livro");
  return res.json();
}

export async function adminDeleteBook(id: string): Promise<boolean> {
  const res = await fetch(`${BASE_URL}/api/admin/books/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Erro ao remover livro");
  return true;
}

// Gemini API Assistant Proxy
export interface AssistantPayload {
  mode: "resumir" | "explicar" | "traduzir" | "qa" | "flashcard";
  bookTitle: string;
  author: string;
  textSnippet: string;
  pageNumber?: number;
  userQuestion?: string;
}

export async function askGeminiAssistant(payload: AssistantPayload): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/gemini/assistant`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Erro de conexão com o assistente inteligente.");
  const data = await res.json();
  return data.result || "Sem resposta do assistente.";
}

export async function generateGeminiTTS(text: string, voice?: string): Promise<{ audio?: string; mock?: boolean; quotaExceeded?: boolean }> {
  const res = await fetch(`${BASE_URL}/api/gemini/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice }),
  });
  if (!res.ok) {
    let errorData: any = null;
    try {
      errorData = await res.json();
    } catch (e) {}
    if (res.status === 429 || (errorData && errorData.quotaExceeded)) {
      throw new Error("QUOTA_EXCEEDED");
    }
    throw new Error(errorData?.error || "Erro de conexão com o sintetizador de voz Gemini.");
  }
  return res.json();
}
