import { User, Book, ReadingProgress, Bookmark, HighlightAndNote, Review, ReadingStats, BookNotification } from "../types";

const BASE_URL = ""; // Relative paths since frontend and backend run on same server

export async function fetchBooks(search?: string, category?: string): Promise<Book[]> {
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  if (category) params.append("category", category);
  
  try {
    const res = await fetch(`${BASE_URL}/api/books?${params.toString()}`);
    if (!res.ok) throw new Error("Erro ao carregar livros");
    const data = await res.json();
    if (data && typeof data === "object" && Array.isArray(data.books)) {
      return data.books;
    }
    return data;
  } catch (err) {
    console.warn("fetchBooks falhou, tentando IndexedDB local:", err);
    try {
      const { getDownloadedBooks } = await import("./offlineStore");
      let localBooks = await getDownloadedBooks();
      if (search) {
        const q = search.toLowerCase();
        localBooks = localBooks.filter(b => (b.title || "").toLowerCase().includes(q) || (b.author || "").toLowerCase().includes(q));
      }
      if (category) {
        localBooks = localBooks.filter(b => b.category === category);
      }
      return localBooks;
    } catch (dbErr) {
      console.error("Erro ao ler livros do IndexedDB:", dbErr);
      return [];
    }
  }
}

export async function fetchBookById(id: string, userId?: string): Promise<Book> {
  const url = userId ? `${BASE_URL}/api/books/${id}?userId=${userId}` : `${BASE_URL}/api/books/${id}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Erro ao carregar detalhes do livro");
    return await res.json();
  } catch (err) {
    console.warn("fetchBookById falhou, tentando IndexedDB local:", err);
    try {
      const { getBookOffline } = await import("./offlineStore");
      const localBook = await getBookOffline(id);
      if (localBook) return localBook;
    } catch (dbErr) {
      console.error("Erro ao ler livro do IndexedDB:", dbErr);
    }
    throw err;
  }
}

export async function fetchUserProgress(userId: string, bookId: string): Promise<ReadingProgress> {
  const res = await fetch(`${BASE_URL}/api/progress/${userId}/${bookId}`);
  if (!res.ok) throw new Error("Erro ao obter progresso de leitura");
  return res.json();
}

export async function fetchAllUserProgress(userId: string): Promise<ReadingProgress[]> {
  if (!userId || userId === "undefined" || userId === "null" || userId.trim() === "") {
    return [];
  }
  try {
    const res = await fetch(`${BASE_URL}/api/progress/${userId}`);
    if (!res.ok) throw new Error("Erro ao carregar lista de progressos");
    return await res.json();
  } catch (err) {
    console.warn("fetchAllUserProgress falhou, retornando lista de progressos do IndexedDB:", err);
    try {
      const { getPendingProgressList } = await import("./offlineStore");
      return await getPendingProgressList();
    } catch (dbErr) {
      console.error("Erro ao ler progressos do IndexedDB:", dbErr);
      return [];
    }
  }
}

export async function saveReadingProgress(
  userId: string,
  bookId: string,
  lastPage: number,
  audioPositionSeconds?: number,
  readingSeconds?: number
): Promise<ReadingProgress> {
  try {
    const res = await fetch(`${BASE_URL}/api/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, bookId, lastPage, audioPositionSeconds, readingSeconds }),
    });
    if (!res.ok) throw new Error("Erro ao salvar progresso de leitura");
    return await res.json();
  } catch (err) {
    console.warn("saveReadingProgress falhou, salvando progresso pendente no IndexedDB:", err);
    try {
      const { savePendingProgress } = await import("./offlineStore");
      const progress: ReadingProgress = {
        userId,
        bookId,
        lastPage,
        progressPercentage: 0,
        lastReadAt: new Date().toISOString(),
        audioPositionSeconds
      };
      await savePendingProgress(progress);
      return progress;
    } catch (dbErr) {
      console.error("Erro ao salvar progresso pendente no IndexedDB:", dbErr);
      throw err;
    }
  }
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
  if (!bookId || bookId === "undefined" || bookId === "null" || bookId.trim() === "") {
    return [];
  }
  const res = await fetch(`${BASE_URL}/api/reviews/${bookId}`);
  if (!res.ok) throw new Error("Erro ao carregar avaliações");
  return res.json();
}

export async function submitReview(userId: string, bookId: string, rating: number | undefined, comment: string): Promise<Review> {
  try {
    const res = await fetch(`${BASE_URL}/api/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, bookId, rating, comment }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Erro ao enviar comentário/avaliação");
    }
    return await res.json();
  } catch (err) {
    console.warn("submitReview falhou, salvando comentário offline:", err);
    try {
      const { savePendingReview } = await import("./offlineStore");
      let name = "Usuário";
      let avatar = "";
      try {
        const savedUser = localStorage.getItem("bookverse_user");
        if (savedUser) {
          const parsed = JSON.parse(savedUser);
          name = parsed.name || "Usuário";
          avatar = parsed.avatarUrl || "";
        }
      } catch (storageErr) {
        console.error("Erro ao ler usuário do localStorage para comentário offline:", storageErr);
      }

      const tempReview: Review = {
        id: "temp_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
        userId,
        bookId,
        userName: name,
        userAvatar: avatar,
        rating: rating,
        comment,
        status: "active",
        likes: [],
        reports: [],
        replies: [],
        createdAt: new Date().toISOString()
      };
      await savePendingReview(tempReview);
      return tempReview;
    } catch (dbErr) {
      console.error("Erro ao salvar comentário pendente no IndexedDB:", dbErr);
      throw err;
    }
  }
}

export async function editReview(id: string, userId: string, rating: number | undefined, comment: string): Promise<Review> {
  const res = await fetch(`${BASE_URL}/api/reviews/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, rating, comment }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Erro ao editar comentário/avaliação");
  }
  return res.json();
}

export async function deleteReview(id: string, userId: string): Promise<boolean> {
  const res = await fetch(`${BASE_URL}/api/reviews/${id}?userId=${encodeURIComponent(userId)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Erro ao excluir comentário");
  }
  return true;
}

export async function toggleReviewLike(id: string, userId: string): Promise<Review> {
  const res = await fetch(`${BASE_URL}/api/reviews/${id}/like`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) throw new Error("Erro ao curtir comentário");
  return res.json();
}

export async function reportReview(id: string, userId: string, reason: string, description: string): Promise<boolean> {
  const res = await fetch(`${BASE_URL}/api/reviews/${id}/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, reason, description }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Erro ao denunciar comentário");
  }
  return true;
}

export async function submitReply(id: string, userId: string, comment: string): Promise<Review> {
  const res = await fetch(`${BASE_URL}/api/reviews/${id}/replies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, comment }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Erro ao responder comentário");
  }
  return res.json();
}

export async function deleteReply(id: string, replyId: string, userId: string): Promise<Review> {
  const res = await fetch(`${BASE_URL}/api/reviews/${id}/replies/${replyId}?userId=${encodeURIComponent(userId)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Erro ao excluir resposta");
  }
  return res.json();
}

// Admin comments management
export async function adminFetchReportedComments(): Promise<Review[]> {
  const res = await fetch(`${BASE_URL}/api/admin/comments/reported`);
  if (!res.ok) throw new Error("Erro ao carregar comentários denunciados");
  return res.json();
}

export async function adminUpdateCommentStatus(id: string, status: "active" | "hidden", adminId: string): Promise<Review> {
  const res = await fetch(`${BASE_URL}/api/admin/comments/${id}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, adminId }),
  });
  if (!res.ok) throw new Error("Erro ao moderar comentário");
  return res.json();
}

export async function adminToggleUserCommentBan(userId: string, adminId: string): Promise<{ success: boolean; isBannedFromCommenting: boolean }> {
  const res = await fetch(`${BASE_URL}/api/admin/users/${userId}/ban-comment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminId }),
  });
  if (!res.ok) throw new Error("Erro ao banir/desbanir usuário de comentar");
  return res.json();
}

export async function fetchUserStats(userId: string): Promise<ReadingStats> {
  if (!userId || userId === "undefined" || userId === "null" || userId.trim() === "") {
    return {
      userId: userId || "",
      readingMinutes: 0,
      listeningMinutes: 0,
      booksCompletedCount: 0,
      booksInProgressCount: 0,
      pagesReadCount: 0,
      avgSessionMinutes: 0
    };
  }
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

export async function adminDeleteBook(id: string, adminId: string): Promise<boolean> {
  const res = await fetch(`${BASE_URL}/api/admin/books/${id}?adminId=${encodeURIComponent(adminId)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Erro ao remover livro");
  }
  return true;
}

export async function adminUpdateBookStatus(id: string, status: string, reason: string, adminId: string): Promise<Book> {
  const res = await fetch(`${BASE_URL}/api/admin/books/${id}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, reason, adminId })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Erro ao atualizar status do livro");
  }
  const result = await res.json();
  return result.book;
}

export async function adminUpdateBookFeatured(id: string, isFeatured: boolean, adminId: string): Promise<Book> {
  const res = await fetch(`${BASE_URL}/api/admin/books/${id}/featured`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isFeatured, adminId })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Erro ao atualizar destaque do livro");
  }
  const result = await res.json();
  return result.book;
}

export async function adminExecuteBatchAction(
  bookIds: string[],
  action: string,
  category: string,
  language: string,
  adminId: string,
  reason: string
): Promise<{ success: boolean; count: number }> {
  const res = await fetch(`${BASE_URL}/api/admin/books/batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bookIds, action, category, language, adminId, reason })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Erro ao processar ação em lote");
  }
  return res.json();
}

export async function adminFetchUsers(): Promise<User[]> {
  const res = await fetch(`${BASE_URL}/api/admin/users`);
  if (!res.ok) throw new Error("Erro ao carregar usuários");
  return res.json();
}

export async function adminUpdateUserStatus(id: string, status: string, adminId: string): Promise<User> {
  const res = await fetch(`${BASE_URL}/api/admin/users/${id}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, adminId })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Erro ao atualizar status de usuário");
  }
  const result = await res.json();
  return result.user;
}

export async function adminUpdateUserRole(id: string, role: string, adminId: string): Promise<User> {
  const res = await fetch(`${BASE_URL}/api/admin/users/${id}/role`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role, adminId })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Erro ao atualizar permissão do usuário");
  }
  const result = await res.json();
  return result.user;
}

export async function submitBookReport(bookId: string, userId: string, reason: string, description: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/books/${bookId}/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, reason, description })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Erro ao enviar denúncia");
  }
  return res.json();
}

export async function adminFetchReports(): Promise<any[]> {
  const res = await fetch(`${BASE_URL}/api/admin/reports`);
  if (!res.ok) throw new Error("Erro ao carregar denúncias");
  return res.json();
}

export async function adminUpdateReportStatus(id: string, status: string, adminId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/admin/reports/${id}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, adminId })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Erro ao gerenciar status da denúncia");
  }
  return res.json();
}

export async function adminFetchLogs(): Promise<any[]> {
  const res = await fetch(`${BASE_URL}/api/admin/logs`);
  if (!res.ok) throw new Error("Erro ao carregar histórico de auditoria");
  return res.json();
}

export async function adminFetchDashboard(): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/admin/dashboard`);
  if (!res.ok) throw new Error("Erro ao carregar dados do dashboard expandido");
  return res.json();
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

export async function fetchNotifications(userId: string): Promise<BookNotification[]> {
  if (!userId || userId === "undefined" || userId === "null" || userId.trim() === "") {
    return [];
  }
  const res = await fetch(`${BASE_URL}/api/notifications/${userId}`);
  if (!res.ok) throw new Error("Erro ao carregar notificações.");
  return res.json();
}

export async function markNotificationsAsRead(userId: string): Promise<boolean> {
  const res = await fetch(`${BASE_URL}/api/notifications/mark-read`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) throw new Error("Erro ao marcar notificações como lidas.");
  const data = await res.json();
  return data.success;
}

export async function markSingleNotificationAsRead(notificationId: string, userId: string): Promise<boolean> {
  const res = await fetch(`${BASE_URL}/api/notifications/mark-single-read`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notificationId, userId }),
  });
  if (!res.ok) throw new Error("Erro ao marcar notificação como lida.");
  const data = await res.json();
  return data.success;
}

export async function deleteNotification(notificationId: string, userId: string): Promise<boolean> {
  const res = await fetch(`${BASE_URL}/api/notifications/delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notificationId, userId }),
  });
  if (!res.ok) throw new Error("Erro ao deletar notificação.");
  const data = await res.json();
  return data.success;
}

export async function registerDeviceToken(userId: string, token: string): Promise<boolean> {
  const res = await fetch(`${BASE_URL}/api/notifications/register-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, token }),
  });
  if (!res.ok) throw new Error("Erro ao registrar token de push.");
  const data = await res.json();
  return data.success;
}

export async function updateNotificationPreferences(userId: string, data: { notifyInApp?: any; notifyPushPrefs?: any; readingReminderEnabled?: boolean; readingReminderTime?: string }): Promise<boolean> {
  const res = await fetch(`${BASE_URL}/api/notifications/preferences`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, ...data }),
  });
  if (!res.ok) throw new Error("Erro ao atualizar preferências de notificação.");
  const responseData = await res.json();
  return responseData.success;
}

export async function sendAdminBroadcastNotification(adminId: string, params: { title: string; message: string; category?: string; priority?: string; destinationLink?: string }): Promise<boolean> {
  const res = await fetch(`${BASE_URL}/api/notifications/admin/broadcast`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminId, ...params }),
  });
  if (!res.ok) throw new Error("Erro ao disparar transmissão de notificações.");
  const data = await res.json();
  return data.success;
}

export async function fetchAdminNotifications(): Promise<BookNotification[]> {
  const res = await fetch(`${BASE_URL}/api/notifications/admin/list`);
  if (!res.ok) throw new Error("Erro ao buscar notificações administrativas.");
  return res.json();
}

export async function updateUserProfile(userId: string, data: Partial<User>): Promise<User> {
  const res = await fetch(`${BASE_URL}/api/auth/update-profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, ...data }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Erro ao atualizar perfil.");
  }
  const result = await res.json();
  return result.user;
}

export async function fetchUserReviews(userId: string): Promise<any[]> {
  const res = await fetch(`${BASE_URL}/api/user/reviews/${userId}`);
  if (!res.ok) throw new Error("Erro ao carregar avaliações do usuário.");
  return res.json();
}

export async function fetchUserNotes(userId: string): Promise<any[]> {
  const res = await fetch(`${BASE_URL}/api/user/notes/${userId}`);
  if (!res.ok) throw new Error("Erro ao carregar notas do usuário.");
  return res.json();
}

export async function deleteUserAccount(userId: string, email: string): Promise<boolean> {
  const res = await fetch(`${BASE_URL}/api/user/delete-account`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, email }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Erro ao excluir conta.");
  }
  const result = await res.json();
  return result.success;
}

// Admin AI endpoints
export async function adminFetchAiConfig(): Promise<{ aiEnabled: boolean }> {
  const res = await fetch(`${BASE_URL}/api/admin/ai/config`);
  if (!res.ok) throw new Error("Erro ao carregar configurações de IA.");
  return res.json();
}

export async function adminUpdateAiConfig(adminId: string, aiEnabled: boolean): Promise<{ success: boolean; aiEnabled: boolean }> {
  const res = await fetch(`${BASE_URL}/api/admin/ai/config`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminId, aiEnabled }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Erro ao atualizar configuração de IA.");
  }
  return res.json();
}

export async function adminAnalyzeBook(id: string, adminId: string, force?: boolean): Promise<{ success: boolean; analysis: any; cached: boolean }> {
  const res = await fetch(`${BASE_URL}/api/admin/ai/analyze-book/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminId, force }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Erro ao executar análise de livro.");
  }
  return res.json();
}

export async function adminAnalyzeCatalog(adminId: string): Promise<{ success: boolean; count: number }> {
  const res = await fetch(`${BASE_URL}/api/admin/ai/analyze-catalog`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminId }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Erro ao executar análise de catálogo.");
  }
  return res.json();
}

export async function adminApplyAiSuggestions(adminId: string, bookId: string, fields: string[]): Promise<{ success: boolean; book: Book }> {
  const res = await fetch(`${BASE_URL}/api/admin/ai/apply-suggestions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminId, bookId, fields }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Erro ao aplicar sugestões da IA.");
  }
  return res.json();
}

export async function adminDetectDuplicates(adminId: string): Promise<{ duplicates: any[] }> {
  const res = await fetch(`${BASE_URL}/api/admin/ai/detect-duplicates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminId }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Erro ao detectar duplicados.");
  }
  return res.json();
}

export async function adminAiAssistantChat(adminId: string, message: string): Promise<{ result: string }> {
  const res = await fetch(`${BASE_URL}/api/admin/ai/assistant/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminId, message }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Erro no chat do assistente de IA.");
  }
  return res.json();
}

export async function adminAiAutocompleteBook(title: string, author: string, language?: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/admin/ai/autocomplete-book`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, author, language }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Erro ao autocompletar dados do livro com IA.");
  }
  return res.json();
}

export async function adminAiWritingAssistant(content: string, action: string, context?: string, language?: string): Promise<{ result: string }> {
  const res = await fetch(`${BASE_URL}/api/admin/ai/writing-assistant`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, action, context, language }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Erro no assistente de escrita da IA.");
  }
  return res.json();
}

export async function createSupportTicket(ticketData: { name: string; email: string; subject: string; message: string; userId?: string }): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/api/support/ticket`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ticketData),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Erro ao enviar chamado de suporte.");
  }
  return res.json();
}

export async function fetchSupportTickets(): Promise<any[]> {
  const res = await fetch(`${BASE_URL}/api/support/tickets`);
  if (!res.ok) throw new Error("Erro ao buscar chamados de suporte");
  return res.json();
}

export async function resolveSupportTicket(id: string): Promise<any[]> {
  const res = await fetch(`${BASE_URL}/api/support/tickets/${id}/resolve`, {
    method: "POST"
  });
  if (!res.ok) throw new Error("Erro ao marcar chamado como resolvido");
  return res.json();
}


