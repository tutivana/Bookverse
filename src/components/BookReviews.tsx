import React, { useState, useEffect } from "react";
import { 
  fetchReviews, 
  submitReview, 
  editReview, 
  deleteReview, 
  toggleReviewLike, 
  reportReview, 
  submitReply, 
  deleteReply 
} from "../lib/api";
import { 
  savePendingReview, 
  getOfflineReviews, 
  saveOfflineReviews 
} from "../lib/offlineStore";
import { 
  Star, 
  Heart, 
  MessageSquare, 
  Send, 
  Trash2, 
  Edit3, 
  AlertTriangle, 
  CheckCircle, 
  CornerDownRight, 
  WifiOff, 
  Loader2 
} from "lucide-react";
import { Review, ReviewReply, User } from "../types";

interface BookReviewsProps {
  bookId: string;
  userId?: string;
  user?: User | null; // current user
}

export default function BookReviews({ bookId, userId, user }: BookReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

  // New review form
  const [rating, setRating] = useState<number>(5);
  const [commentText, setCommentText] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Edit review state
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [editingRating, setEditingRating] = useState<number>(5);

  // Reply states
  const [replyingReviewId, setReplyingReviewId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  // Report states
  const [reportingReviewId, setReportingReviewId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("Spam");
  const [reportDetails, setReportDetails] = useState("");
  const [reportSuccess, setReportSuccess] = useState(false);

  useEffect(() => {
    loadReviews();

    const handleOnline = () => {
      setIsOnline(true);
      loadReviews();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [bookId]);

  const loadReviews = async () => {
    setLoading(true);
    try {
      if (navigator.onLine) {
        const data = await fetchReviews(bookId);
        // Clean and ensure active status
        const activeReviews = data.filter(r => r.status !== "hidden");
        setReviews(activeReviews);
        // Cache locally
        await saveOfflineReviews(bookId, activeReviews);
      } else {
        const offlineData = await getOfflineReviews(bookId);
        setReviews(offlineData);
      }
    } catch (err) {
      console.error("Erro ao carregar avaliações:", err);
      // Fallback to cache
      const offlineData = await getOfflineReviews(bookId);
      setReviews(offlineData);
    } finally {
      setLoading(false);
    }
  };

  // Average calculations
  const ratedReviews = reviews.filter((r) => r.rating && r.rating > 0);
  const avgRating = ratedReviews.length > 0 
    ? ratedReviews.reduce((acc, r) => acc + (r.rating || 0), 0) / ratedReviews.length 
    : 0;

  // Submit comment / review
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    if (!user || !userId) {
      window.dispatchEvent(new CustomEvent("open-auth", { detail: { mode: "login" } }));
      return;
    }

    if (user.isBannedFromCommenting) {
      setErrorMsg("Sua conta está suspensa de publicar comentários ou avaliações.");
      return;
    }

    setSubmitLoading(true);
    setErrorMsg(null);

    try {
      if (isOnline) {
        const newReview = await submitReview(userId, bookId, rating || undefined, commentText);
        setReviews((prev) => [newReview, ...prev]);
        setCommentText("");
        setRating(5);
        // Reload reviews to get seeded fields correctly
        loadReviews();
      } else {
        // Offline flow
        const tempId = "temp_" + Date.now();
        const pendingItem = {
          id: tempId,
          bookId,
          userId,
          rating,
          comment: commentText,
          userName: user.name,
          userAvatar: user.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150",
          createdAt: new Date().toISOString(),
          likes: [],
          replies: [],
          reports: [],
          status: "active" as const,
          isPendingSync: true,
        };

        // Save to indexedDB as pending
        await savePendingReview(pendingItem);
        // Optimistic UI update
        setReviews((prev) => [pendingItem as unknown as Review, ...prev]);
        setCommentText("");
        setRating(5);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Ocorreu um erro ao enviar.");
    } finally {
      setSubmitLoading(false);
    }
  };

  // Toggle Like
  const handleLike = async (reviewId: string) => {
    if (reviewId.startsWith("temp_")) {
      alert("Aguarde a sincronização do comentário para curtir.");
      return;
    }
    try {
      const updated = await toggleReviewLike(reviewId, userId);
      setReviews((prev) => prev.map((r) => (r.id === reviewId ? updated : r)));
    } catch (err) {
      console.error(err);
    }
  };

  // Edit Review
  const handleStartEdit = (r: Review) => {
    setEditingReviewId(r.id);
    setEditingText(r.comment);
    setEditingRating(r.rating || 5);
  };

  const handleSaveEdit = async (reviewId: string) => {
    try {
      const updated = await editReview(reviewId, userId, editingRating, editingText);
      setReviews((prev) => prev.map((r) => (r.id === reviewId ? { ...r, ...updated } : r)));
      setEditingReviewId(null);
    } catch (err: any) {
      alert(err.message || "Erro ao editar.");
    }
  };

  // Delete Review
  const handleDelete = async (reviewId: string) => {
    if (confirm("Deseja realmente excluir este comentário?")) {
      try {
        await deleteReview(reviewId, userId);
        setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      } catch (err: any) {
        alert(err.message || "Erro ao excluir.");
      }
    }
  };

  // Submit Reply
  const handleReply = async (reviewId: string) => {
    if (!replyText.trim()) return;
    if (user.isBannedFromCommenting) {
      alert("Sua conta está suspensa de publicar comentários ou respostas.");
      return;
    }
    try {
      const updated = await submitReply(reviewId, userId, replyText);
      setReviews((prev) => prev.map((r) => (r.id === reviewId ? updated : r)));
      setReplyText("");
      setReplyingReviewId(null);
    } catch (err: any) {
      alert(err.message || "Erro ao responder.");
    }
  };

  // Delete Reply
  const handleDeleteReply = async (reviewId: string, replyId: string) => {
    if (confirm("Deseja excluir sua resposta?")) {
      try {
        const updated = await deleteReply(reviewId, replyId, userId);
        setReviews((prev) => prev.map((r) => (r.id === reviewId ? updated : r)));
      } catch (err: any) {
        alert(err.message || "Erro ao excluir.");
      }
    }
  };

  // Report
  const handleOpenReport = (reviewId: string) => {
    setReportingReviewId(reviewId);
    setReportReason("Spam");
    setReportDetails("");
    setReportSuccess(false);
  };

  const handleSubmitReport = async () => {
    if (!reportingReviewId) return;
    try {
      await reportReview(reportingReviewId, userId, reportReason, reportDetails);
      setReportSuccess(true);
      setTimeout(() => {
        setReportingReviewId(null);
        setReportSuccess(false);
      }, 2000);
    } catch (err: any) {
      alert(err.message || "Erro ao enviar denúncia.");
    }
  };

  return (
    <div className="space-y-4 font-sans text-left text-zinc-200">
      {/* OFFLINE WARNING HEADER */}
      {!isOnline && (
        <div className="p-2 bg-amber-950/20 border border-amber-900/30 text-amber-400 rounded-xl text-[10px] font-bold flex items-center gap-1.5">
          <WifiOff className="w-3.5 h-3.5" />
          MODO OFFLINE — Avaliações salvas localmente
        </div>
      )}

      {/* RATING SUMMARY CONTAINER */}
      <div className="p-3.5 bg-zinc-900/40 border border-zinc-850 rounded-xl flex items-center justify-between">
        <div>
          <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Nota Média</span>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-xl font-serif font-bold text-zinc-100">
              {avgRating > 0 ? avgRating.toFixed(1) : "—"}
            </span>
            <div className="flex items-center text-amber-500">
              {avgRating > 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <Star 
                    key={`star-avg-${i}`} 
                    className={`w-3.5 h-3.5 ${i < Math.round(avgRating) ? "fill-amber-500 text-amber-500" : "text-zinc-600"}`} 
                  />
                ))
              ) : (
                <span className="text-[10px] text-zinc-500">Ainda não avaliado</span>
              )}
            </div>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Total de Notas</span>
          <span className="text-sm font-serif font-bold text-zinc-300 block mt-0.5">
            {ratedReviews.length} avaliações
          </span>
        </div>
      </div>

      {/* NEW REVIEW FORM */}
      {!user ? (
        <div className="p-4 bg-zinc-900/40 border border-zinc-850 rounded-xl text-center space-y-3">
          <p className="text-xs text-zinc-400">Você precisa estar conectado para avaliar ou comentar sobre este livro.</p>
          <div className="flex justify-center gap-2">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("open-auth", { detail: { mode: "login" } }))}
              className="px-3.5 py-1.5 bg-[#e2b874] text-zinc-950 font-bold text-xs rounded-lg hover:bg-[#c59e5f] transition cursor-pointer"
            >
              Fazer Login
            </button>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("open-auth", { detail: { mode: "register" } }))}
              className="px-3.5 py-1.5 bg-zinc-800 text-zinc-300 font-bold text-xs rounded-lg hover:bg-zinc-700 transition cursor-pointer"
            >
              Criar Conta
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="p-3 bg-zinc-900/30 border border-zinc-850 rounded-xl space-y-2.5">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Publicar Avaliação:</span>
            
            {/* Stars selector */}
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <button
                  type="button"
                  key={`star-rating-btn-${i}`}
                  onClick={() => setRating(i + 1)}
                  className="text-amber-500 hover:scale-110 transition cursor-pointer"
                >
                  <Star className={`w-4 h-4 ${i < rating ? "fill-amber-500 text-amber-500" : "text-zinc-700"}`} />
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <textarea
              placeholder="O que achou deste livro? Escreva seu comentário..."
              className="w-full bg-zinc-950 border border-zinc-850 hover:border-zinc-800 focus:border-[#e2b874] text-xs p-2.5 rounded-lg outline-none transition text-zinc-200 resize-none h-16"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
            <button
              type="submit"
              disabled={submitLoading || !commentText.trim()}
              className="absolute bottom-2.5 right-2.5 p-1.5 bg-[#e2b874] hover:bg-[#d4a863] text-zinc-950 rounded-md transition disabled:opacity-30 disabled:hover:bg-[#e2b874]"
            >
              {submitLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </button>
          </div>

          {errorMsg && (
            <p className="text-[10px] text-red-400 font-bold">{errorMsg}</p>
          )}
        </form>
      )}

      {/* COMMENTS LIST */}
      <div className="space-y-3.5 max-h-[400px] overflow-y-auto pr-1">
        {loading && reviews.length === 0 ? (
          <div className="text-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-[#e2b874] mx-auto" />
            <span className="text-[10px] text-zinc-500 font-medium mt-1.5 block">Carregando comentários...</span>
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-zinc-850 rounded-xl text-zinc-500 text-xs">
            <MessageSquare className="w-6 h-6 text-zinc-700 mx-auto mb-1" />
            Nenhum comentário publicado. Seja o primeiro!
          </div>
        ) : (
          reviews.map((r) => {
            const isOwn = r.userId === userId;
            const hasLiked = r.likes?.includes(userId);
            const isEditing = editingReviewId === r.id;

            return (
              <div 
                key={r.id} 
                className={`p-3 bg-zinc-900/10 border rounded-xl space-y-2 transition ${
                  (r as any).isPendingSync 
                    ? "border-amber-900/30 bg-amber-950/5" 
                    : "border-zinc-850 hover:border-zinc-800"
                }`}
              >
                {/* COMMENT AUTHOR HEADER */}
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <img 
                      src={r.userAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150"} 
                      alt={r.userName} 
                      className="w-6 h-6 rounded-full object-cover border border-zinc-800"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-zinc-300">{r.userName}</span>
                        {(r as any).isPendingSync && (
                          <span className="text-[8px] bg-amber-950/40 border border-amber-900/30 text-amber-400 font-mono font-bold px-1.5 py-0.2 rounded">
                            PENDENTE
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-zinc-500 block">
                        {new Date(r.createdAt).toLocaleDateString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>

                  {/* Rating Badge */}
                  {r.rating && r.rating > 0 && (
                    <div className="flex items-center text-amber-500">
                      <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                      <span className="text-[10px] font-bold ml-0.5">{r.rating}</span>
                    </div>
                  )}
                </div>

                {/* EDITING MODE VS TEXT VIEW */}
                {isEditing ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-zinc-400 font-bold uppercase">Nota:</span>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <button
                            type="button"
                            key={`star-edit-btn-${i}`}
                            onClick={() => setEditingRating(i + 1)}
                            className="text-amber-500"
                          >
                            <Star className={`w-3.5 h-3.5 ${i < editingRating ? "fill-amber-500 text-amber-500" : "text-zinc-700"}`} />
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea
                      className="w-full bg-zinc-950 border border-zinc-800 text-xs p-2 rounded-lg outline-none text-zinc-200 resize-none h-14"
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                    />
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => setEditingReviewId(null)}
                        className="px-2 py-1 bg-zinc-800 hover:bg-zinc-750 text-zinc-400 text-[10px] font-bold rounded-md"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleSaveEdit(r.id)}
                        className="px-2 py-1 bg-[#e2b874] text-zinc-950 text-[10px] font-bold rounded-md"
                      >
                        Salvar
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-300 leading-relaxed break-words">{r.comment}</p>
                )}

                {/* ACTION ROW (LIKE, REPLY, REPORT, DELETE, EDIT) */}
                {!isEditing && (
                  <div className="flex items-center gap-3.5 pt-1.5 border-t border-zinc-900/60 text-[10px] font-bold text-zinc-500">
                    {/* Like button */}
                    <button
                      onClick={() => handleLike(r.id)}
                      className={`flex items-center gap-1 transition cursor-pointer ${
                        hasLiked ? "text-red-400" : "hover:text-zinc-300"
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${hasLiked ? "fill-red-400 text-red-400" : ""}`} />
                      <span>{r.likes?.length || 0}</span>
                    </button>

                    {/* Reply trigger */}
                    <button
                      onClick={() => {
                        setReplyingReviewId(replyingReviewId === r.id ? null : r.id);
                        setReplyText("");
                      }}
                      className="flex items-center gap-1 hover:text-zinc-300 cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{r.replies?.length || 0}</span>
                    </button>

                    {/* Report button */}
                    {!isOwn && (
                      <button
                        onClick={() => handleOpenReport(r.id)}
                        className="text-zinc-500 hover:text-amber-400 flex items-center gap-1 ml-auto cursor-pointer"
                        title="Denunciar este comentário"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Denunciar</span>
                      </button>
                    )}

                    {/* Edit & Delete own buttons */}
                    {isOwn && (
                      <>
                        <button
                          onClick={() => handleStartEdit(r)}
                          className="hover:text-[#e2b874] flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="hover:text-red-400 flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Excluir</span>
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* INLINE REPORT COMPONENT PANEL */}
                {reportingReviewId === r.id && (
                  <div className="p-2.5 bg-zinc-950/60 border border-zinc-850 rounded-lg mt-2 space-y-2 text-xs">
                    {reportSuccess ? (
                      <div className="text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4" />
                        Denúncia registrada com sucesso!
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-[#e2b874]">Denunciar Comentário:</span>
                          <button onClick={() => setReportingReviewId(null)} className="text-zinc-500 hover:text-zinc-300">X</button>
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-[10px] text-zinc-400">Motivo:</label>
                          <select
                            className="w-full bg-zinc-900 border border-zinc-800 text-xs p-1.5 rounded outline-none text-zinc-300"
                            value={reportReason}
                            onChange={(e) => setReportReason(e.target.value)}
                          >
                            <option value="Spam">Spam / Link Suspeito</option>
                            <option value="Offensive Language">Linguagem Ofensiva / Abuso</option>
                            <option value="Harassment">Assédio / Perseguição</option>
                            <option value="Spoilers">Spoilers não avisados</option>
                            <option value="Other">Outro motivo</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-[10px] text-zinc-400">Descrição adicional:</label>
                          <input
                            type="text"
                            placeholder="Descreva brevemente..."
                            className="w-full bg-zinc-900 border border-zinc-800 text-xs p-1.5 rounded outline-none text-zinc-300"
                            value={reportDetails}
                            onChange={(e) => setReportDetails(e.target.value)}
                          />
                        </div>
                        <button
                          onClick={handleSubmitReport}
                          className="w-full bg-[#e2b874] text-zinc-950 text-[10px] font-bold py-1.5 rounded transition cursor-pointer"
                        >
                          Enviar Denúncia
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* INLINE REPLIES BOX */}
                {replyingReviewId === r.id && (
                  <div className="flex gap-2.5 pt-2 border-t border-zinc-900">
                    <input
                      type="text"
                      placeholder="Escreva uma resposta..."
                      className="flex-1 bg-zinc-950 border border-zinc-850 hover:border-zinc-800 text-[11px] px-2.5 py-1.5 rounded-lg outline-none text-zinc-200"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                    />
                    <button
                      onClick={() => handleReply(r.id)}
                      disabled={!replyText.trim()}
                      className="px-2.5 bg-[#e2b874] hover:bg-[#d4a863] text-zinc-950 text-[10px] font-bold rounded-lg transition disabled:opacity-30"
                    >
                      Responder
                    </button>
                  </div>
                )}

                {/* NESTED REPLIES LIST */}
                {r.replies && r.replies.length > 0 && (
                  <div className="pl-3 border-l-2 border-zinc-850 mt-2.5 space-y-2">
                    {r.replies.map((reply) => {
                      const isReplyOwn = reply.userId === userId;
                      return (
                        <div key={reply.id} className="p-2 bg-zinc-950/20 border border-zinc-900 rounded-lg text-xs space-y-1">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-1.5">
                              <img 
                                src={reply.userAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150"} 
                                alt={reply.userName} 
                                className="w-4 h-4 rounded-full object-cover border border-zinc-850"
                                referrerPolicy="no-referrer"
                              />
                              <span className="font-bold text-zinc-300 text-[10px]">{reply.userName}</span>
                              <span className="text-[8px] text-zinc-500">
                                {new Date(reply.createdAt).toLocaleDateString("pt-BR")}
                              </span>
                            </div>
                            {isReplyOwn && (
                              <button
                                onClick={() => handleDeleteReply(r.id, reply.id)}
                                className="text-zinc-600 hover:text-red-400 transition"
                                title="Excluir resposta"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <p className="text-zinc-400 text-[10.5px] pl-5 break-words">{reply.comment}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
