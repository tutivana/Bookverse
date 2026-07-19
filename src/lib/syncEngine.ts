import { Bookmark, HighlightAndNote, ReadingProgress } from "../types";
import { 
  getPendingProgressList, 
  savePendingProgress, 
  getAllOfflineBookmarks, 
  saveOfflineBookmark, 
  deleteOfflineBookmark,
  getAllOfflineNotes, 
  saveOfflineNote, 
  deleteOfflineNote 
} from "./offlineStore";
import { updateUserProfile, saveReadingProgress } from "./api";

// Simple helper to check network status
export function isOnline(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

export interface SyncResult {
  success: boolean;
  progressCount: number;
  bookmarksCount: number;
  notesCount: number;
  favoritesSynced: boolean;
  message?: string;
}

export async function syncUserData(userId: string, currentFavorites: string[], onFavoritesSynced?: (favs: string[]) => void): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    progressCount: 0,
    bookmarksCount: 0,
    notesCount: 0,
    favoritesSynced: false,
  };

  if (!isOnline() || !userId) {
    return { ...result, message: "Dispositivo está offline ou usuário não identificado." };
  }

  try {
    // 1. SYNC FAVORITES
    // Load local favorites
    const localFavsKey = `bookverse_favs_${userId}`;
    const localFavsStr = localStorage.getItem(localFavsKey);
    const localFavs: string[] = localFavsStr ? JSON.parse(localFavsStr) : currentFavorites;
    const localFavsTimestamp = Number(localStorage.getItem(`bookverse_favs_updated_${userId}`) || "0");

    // Fetch server user profile to get server favorites and subscription info
    const profileRes = await fetch(`/api/auth/me/${userId}`);
    if (profileRes.ok) {
      const data = await profileRes.json();
      const serverUser = data.user;
      if (serverUser) {
        const serverFavs: string[] = serverUser.favorites || [];
        const serverFavsTimestamp = serverUser.favoritesUpdatedAt ? new Date(serverUser.favoritesUpdatedAt).getTime() : 0;

        let finalFavs = [...localFavs];

        if (localFavsTimestamp > serverFavsTimestamp) {
          // Local is newer, upload to server
          await updateUserProfile(userId, { favorites: localFavs });
          result.favoritesSynced = true;
        } else if (serverFavsTimestamp > localFavsTimestamp) {
          // Server is newer, update local
          finalFavs = serverFavs;
          localStorage.setItem(localFavsKey, JSON.stringify(serverFavs));
          localStorage.setItem(`bookverse_favs_updated_${userId}`, String(serverFavsTimestamp));
          if (onFavoritesSynced) onFavoritesSynced(serverFavs);
          result.favoritesSynced = true;
        } else {
          // Timestamps equal or not defined, merge them
          const merged = Array.from(new Set([...localFavs, ...serverFavs]));
          if (merged.length !== localFavs.length || merged.length !== serverFavs.length) {
            finalFavs = merged;
            localStorage.setItem(localFavsKey, JSON.stringify(merged));
            const nowMs = Date.now();
            localStorage.setItem(`bookverse_favs_updated_${userId}`, String(nowMs));
            await updateUserProfile(userId, { favorites: merged });
            if (onFavoritesSynced) onFavoritesSynced(merged);
            result.favoritesSynced = true;
          }
        }
      }
    }

    // 2. SYNC READING PROGRESS (by comparing timestamps)
    // Fetch all local progress from IndexedDB
    const localProgressList = await getPendingProgressList();
    
    // Fetch server progress list
    const serverProgressRes = await fetch(`/api/progress/${userId}`);
    if (serverProgressRes.ok) {
      const serverProgressList: ReadingProgress[] = await serverProgressRes.json();

      // Combine and compare
      const allBookIds = Array.from(new Set([
        ...localProgressList.map(p => p.bookId),
        ...serverProgressList.map(p => p.bookId)
      ]));

      for (const bookId of allBookIds) {
        const local = localProgressList.find(p => p.bookId === bookId);
        const server = serverProgressList.find(p => p.bookId === bookId);

        if (local && !server) {
          // Push local to server
          await saveReadingProgress(userId, bookId, local.lastPage, local.audioPositionSeconds);
          result.progressCount++;
        } else if (!local && server) {
          // Pull server to local
          await savePendingProgress(server);
          result.progressCount++;
        } else if (local && server) {
          const localTime = local.lastReadAt ? new Date(local.lastReadAt).getTime() : 0;
          const serverTime = server.lastReadAt ? new Date(server.lastReadAt).getTime() : 0;

          if (localTime > serverTime) {
            // Local is newer, upload
            await saveReadingProgress(userId, bookId, local.lastPage, local.audioPositionSeconds);
            result.progressCount++;
          } else if (serverTime > localTime) {
            // Server is newer, pull
            await savePendingProgress(server);
            result.progressCount++;
          }
        }
      }
    }

    // 3. SYNC BOOKMARKS
    // Load local bookmarks
    const localBookmarks = await getAllOfflineBookmarks();

    // We can fetch bookmarks for the user. Note: `/api/bookmarks/:userId/:bookId` is book-specific,
    // but we can query them or sync those flagged with `isPendingSync`
    for (const bm of localBookmarks) {
      if (bm.isPendingSync) {
        // Check if bookmark already exists on the server for this page to avoid toggle-deleting it
        const checkRes = await fetch(`/api/bookmarks/${userId}/${bm.bookId}`);
        if (checkRes.ok) {
          const serverBookmarks: Bookmark[] = await checkRes.json();
          const exists = serverBookmarks.some(b => b.page === bm.page);
          if (!exists) {
            // Safe to push
            await fetch("/api/bookmarks", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId, bookId: bm.bookId, page: bm.page }),
            });
          }
        }
        // Mark as synced locally
        const updatedBm = { ...bm };
        delete updatedBm.isPendingSync;
        await saveOfflineBookmark(updatedBm);
        result.bookmarksCount++;
      }
    }

    // Pull missing bookmarks from server to cache
    // Let's get bookIds from bookmarks
    const bookIdsWithLocalBookmarks = Array.from(new Set(localBookmarks.map(b => b.bookId)));
    for (const bId of bookIdsWithLocalBookmarks) {
      const serverBmRes = await fetch(`/api/bookmarks/${userId}/${bId}`);
      if (serverBmRes.ok) {
        const serverBookmarks: Bookmark[] = await serverBmRes.json();
        for (const sBm of serverBookmarks) {
          const localExists = localBookmarks.some(l => l.bookId === bId && l.page === sBm.page);
          if (!localExists) {
            await saveOfflineBookmark(sBm);
            result.bookmarksCount++;
          }
        }
      }
    }

    // 4. SYNC HIGHLIGHTS AND NOTES
    // Fetch local notes
    const localNotes = await getAllOfflineNotes();

    // Push local pending highlights to server
    for (const note of localNotes) {
      if (note.isPendingSync || note.id.startsWith("local-note-")) {
        // Upload to server
        const nRes = await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            bookId: note.bookId,
            page: note.page,
            selectedText: note.selectedText,
            text: note.text,
            color: note.color,
          }),
        });
        if (nRes.ok) {
          const newServerNote = await nRes.json();
          // Remove local temp note and save server note to sync IDs
          await deleteOfflineNote(note.id);
          await saveOfflineNote(newServerNote);
          result.notesCount++;
        }
      }
    }

    // Pull missing notes from server to local cache
    const bookIdsWithLocalNotes = Array.from(new Set(localNotes.map(n => n.bookId)));
    for (const bId of bookIdsWithLocalNotes) {
      const serverNotesRes = await fetch(`/api/notes/${userId}/${bId}`);
      if (serverNotesRes.ok) {
        const serverNotes: HighlightAndNote[] = await serverNotesRes.json();
        for (const sNote of serverNotes) {
          const localExists = localNotes.some(l => l.id === sNote.id || (l.bookId === bId && l.page === sNote.page && l.selectedText === sNote.selectedText));
          if (!localExists) {
            await saveOfflineNote(sNote);
            result.notesCount++;
          }
        }
      }
    }

    result.success = true;
    return result;

  } catch (err: any) {
    console.error("Erro durante a sincronização de dados:", err);
    return { ...result, success: false, message: `Falha na sincronização: ${err.message || err}` };
  }
}
