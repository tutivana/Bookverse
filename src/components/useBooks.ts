import { useState, useEffect, useCallback } from "react";
import { Book } from "../types";

export function useBooks(searchTerm: string, selectedCategory: string, limit: number = 20) {
  const [books, setBooks] = useState<Book[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastVisible, setLastVisible] = useState<string | null>(null);

  const fetchPage = useCallback(async (isInitial: boolean, cursorId?: string | null) => {
    try {
      if (isInitial) {
        setLoadingInitial(true);
      } else {
        setLoadingMore(true);
      }

      const params = new URLSearchParams();
      params.append("limit", String(limit));
      if (selectedCategory && selectedCategory !== "Todas") {
        params.append("category", selectedCategory);
      }
      if (searchTerm) {
        params.append("search", searchTerm);
      }
      if (cursorId) {
        params.append("startAfterId", cursorId);
      }

      const res = await fetch(`/api/books?${params.toString()}`);
      if (!res.ok) throw new Error("Erro ao buscar livros");
      const data = await res.json();

      const fetchedBooks: Book[] = data.books || [];
      const newLastVisible = data.lastVisibleId || null;
      const newHasMore = data.hasMore ?? false;

      setBooks(prev => {
        if (isInitial) {
          return fetchedBooks;
        } else {
          // Prevenir duplicatas de livros
          const existingIds = new Set(prev.map(b => b.id));
          const filteredNew = fetchedBooks.filter(b => !existingIds.has(b.id));
          return [...prev, ...filteredNew];
        }
      });

      setLastVisible(newLastVisible);
      setHasMore(newHasMore);
    } catch (err) {
      console.error("Erro ao carregar livros:", err);
    } finally {
      if (isInitial) {
        setLoadingInitial(false);
      } else {
        setLoadingMore(false);
      }
    }
  }, [searchTerm, selectedCategory, limit]);

  // Recarregar os livros quando filtros mudarem
  useEffect(() => {
    fetchPage(true, null);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || loadingInitial) return;
    fetchPage(false, lastVisible);
  }, [fetchPage, loadingMore, hasMore, loadingInitial, lastVisible]);

  return {
    books,
    loadingInitial,
    loadingMore,
    hasMore,
    loadMore,
    reload: () => fetchPage(true, null)
  };
}
