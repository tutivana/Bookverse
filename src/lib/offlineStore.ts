import { Book, ReadingProgress, Review, Bookmark, HighlightAndNote } from "../types";

const DB_NAME = "bookverse_offline_db";
const DB_VERSION = 1;

export interface OfflineBookMeta {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  downloadedAt: string;
  sizeBytes: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains("books")) {
        db.createObjectStore("books", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("progress")) {
        db.createObjectStore("progress", { keyPath: "bookId" });
      }
      if (!db.objectStoreNames.contains("reviews")) {
        db.createObjectStore("reviews", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("bookmarks")) {
        db.createObjectStore("bookmarks", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("notes")) {
        db.createObjectStore("notes", { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Check if IndexedDB is supported
export function isStorageSupported(): boolean {
  return typeof window !== "undefined" && "indexedDB" in window;
}

// 1. Download & Save Book Offline
export async function saveBookOffline(book: Book): Promise<number> {
  if (!isStorageSupported()) return 0;
  const db = await openDB();
  
  // Calculate size in bytes
  const bookStr = JSON.stringify(book);
  const sizeBytes = new Blob([bookStr]).size;

  const offlinePayload = {
    ...book,
    downloadedAt: new Date().toISOString(),
    sizeBytes,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction("books", "readwrite");
    const store = tx.objectStore("books");
    const request = store.put(offlinePayload);

    request.onsuccess = () => resolve(sizeBytes);
    request.onerror = () => reject(request.error);
  });
}

// 2. Get Book Offline
export async function getBookOffline(bookId: string): Promise<Book | null> {
  if (!isStorageSupported()) return null;
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction("books", "readonly");
    const store = tx.objectStore("books");
    const request = store.get(bookId);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

// 3. Delete Individual Download
export async function deleteBookOffline(bookId: string): Promise<void> {
  if (!isStorageSupported()) return;
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction("books", "readwrite");
    const store = tx.objectStore("books");
    const request = store.delete(bookId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// 4. Get List of Downloaded Books Meta
export async function getDownloadedBooksMeta(): Promise<OfflineBookMeta[]> {
  if (!isStorageSupported()) return [];
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction("books", "readonly");
    const store = tx.objectStore("books");
    const request = store.getAll();

    request.onsuccess = () => {
      const books = request.result as (Book & { downloadedAt: string; sizeBytes: number })[];
      const meta = books.map((b) => ({
        id: b.id,
        title: b.title,
        author: b.author,
        coverUrl: b.coverUrl,
        downloadedAt: b.downloadedAt || new Date().toISOString(),
        sizeBytes: b.sizeBytes || 1024 * 10,
      }));
      resolve(meta);
    };
    request.onerror = () => reject(request.error);
  });
}

// 5. Clear All Downloads
export async function clearAllDownloads(): Promise<void> {
  if (!isStorageSupported()) return;
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction("books", "readwrite");
    const store = tx.objectStore("books");
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// 6. Save Pending Progress (when offline)
export async function savePendingProgress(progress: ReadingProgress): Promise<void> {
  if (!isStorageSupported()) return;
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction("progress", "readwrite");
    const store = tx.objectStore("progress");
    const request = store.put(progress);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Get Pending Progress List
export async function getPendingProgressList(): Promise<ReadingProgress[]> {
  if (!isStorageSupported()) return [];
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction("progress", "readonly");
    const store = tx.objectStore("progress");
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

// Remove Pending Progress
export async function deletePendingProgress(bookId: string): Promise<void> {
  if (!isStorageSupported()) return;
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction("progress", "readwrite");
    const store = tx.objectStore("progress");
    const request = store.delete(bookId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// 7. Save Pending Reviews (when offline)
export async function savePendingReview(review: Review): Promise<void> {
  if (!isStorageSupported()) return;
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction("reviews", "readwrite");
    const store = tx.objectStore("reviews");
    const request = store.put(review);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Get Pending Reviews List
export async function getPendingReviewsList(): Promise<Review[]> {
  if (!isStorageSupported()) return [];
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction("reviews", "readonly");
    const store = tx.objectStore("reviews");
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

// Delete Pending Review
export async function deletePendingReview(reviewId: string): Promise<void> {
  if (!isStorageSupported()) return;
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction("reviews", "readwrite");
    const store = tx.objectStore("reviews");
    const request = store.delete(reviewId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// 8. Offline Bookmarks and Notes caching (readonly / local)
export async function saveOfflineBookmark(bookmark: Bookmark): Promise<void> {
  if (!isStorageSupported()) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("bookmarks", "readwrite");
    tx.objectStore("bookmarks").put(bookmark);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getOfflineBookmarks(bookId: string): Promise<Bookmark[]> {
  if (!isStorageSupported()) return [];
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("bookmarks", "readonly");
    const request = tx.objectStore("bookmarks").getAll();
    request.onsuccess = () => {
      const all = request.result as Bookmark[];
      resolve(all.filter((b) => b.bookId === bookId));
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveOfflineNote(note: HighlightAndNote): Promise<void> {
  if (!isStorageSupported()) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("notes", "readwrite");
    tx.objectStore("notes").put(note);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getOfflineNotes(bookId: string): Promise<HighlightAndNote[]> {
  if (!isStorageSupported()) return [];
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("notes", "readonly");
    const request = tx.objectStore("notes").getAll();
    request.onsuccess = () => {
      const all = request.result as HighlightAndNote[];
      resolve(all.filter((n) => n.bookId === bookId));
    };
    request.onerror = () => reject(request.error);
  });
}

// 9. Cache Synced Reviews & Comments Offline
export async function saveOfflineReviews(bookId: string, reviews: Review[]): Promise<void> {
  if (!isStorageSupported()) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("reviews", "readwrite");
    const store = tx.objectStore("reviews");
    
    // Put each non-pending review
    reviews.forEach((r) => {
      // Avoid overwriting a pending review
      if (!r.id.startsWith("temp_")) {
        store.put({ ...r, isCachedOnly: true });
      }
    });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getOfflineReviews(bookId: string): Promise<Review[]> {
  if (!isStorageSupported()) return [];
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("reviews", "readonly");
    const store = tx.objectStore("reviews");
    const request = store.getAll();

    request.onsuccess = () => {
      const all = request.result as (Review & { isCachedOnly?: boolean; bookId: string })[];
      // Filter by bookId
      const filtered = all.filter((r) => r.bookId === bookId);
      resolve(filtered);
    };
    request.onerror = () => reject(request.error);
  });
}

// 10. Get all full Book objects saved offline
export async function getDownloadedBooks(): Promise<Book[]> {
  if (!isStorageSupported()) return [];
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("books", "readonly");
    const store = tx.objectStore("books");
    const request = store.getAll();
    request.onsuccess = () => {
      resolve(request.result as Book[]);
    };
    request.onerror = () => reject(request.error);
  });
}
