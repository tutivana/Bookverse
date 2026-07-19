import { initializeApp } from "firebase/app";
import { 
  initializeFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs, 
  deleteDoc, 
  collectionGroup,
  setLogLevel
} from "firebase/firestore";
import fs from "fs";
import path from "path";

// Initialize Firebase configuration from the generated json file
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
let firebaseApp: any = null;
let firestoreDb: any = null;

if (fs.existsSync(configPath)) {
  try {
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
    firebaseApp = initializeApp(firebaseConfig);
    // Suppress benign connection stream logging warnings
    setLogLevel("silent");
    // Use custom database ID from config or fall back to default
    const dbId = firebaseConfig.firestoreDatabaseId || "(default)";
    firestoreDb = initializeFirestore(firebaseApp, {
      experimentalForceLongPolling: true,
    }, dbId);
    console.log(`[Firebase init] Connected successfully to project: ${firebaseConfig.projectId}, database: ${dbId}`);
  } catch (err) {
    console.error("[Firebase init Error] Failed to initialize Firebase:", err);
  }
} else {
  console.warn("[Firebase init Warning] firebase-applet-config.json not found.");
}

// In-memory cache of the last synchronized state of each document to prevent redundant Firestore writes
export const syncCache: Record<string, string> = {};

function cacheDocs(docs: any[]) {
  docs.forEach(docSnap => {
    syncCache[docSnap.ref.path] = JSON.stringify(docSnap.data());
  });
}

function sanitize(val: any): any {
  if (val === undefined) return null;
  if (Array.isArray(val)) return val.map(sanitize);
  if (val !== null && typeof val === "object") {
    const clean: any = {};
    for (const key of Object.keys(val)) {
      const v = val[key];
      if (v !== undefined) {
        clean[key] = sanitize(v);
      }
    }
    return clean;
  }
  return val;
}

const DEFAULT_TIMEOUT_MS = 3000;

export function withTimeout<T>(promise: Promise<T>, ms = DEFAULT_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Firestore operation timed out after ${ms}ms`));
      }, ms);
      if (timer && typeof timer.unref === "function") {
        timer.unref();
      }
    })
  ]);
}

/**
 * Loads database collections from Firestore subcollections and individual documents.
 * If Firestore has no documents, returns null (so we can fall back to local seed data).
 */
export async function pullFromFirestore(): Promise<any> {
  if (!firestoreDb) {
    console.warn("[pullFromFirestore] Firestore is not initialized.");
    return null;
  }

  try {
    const loadedData: any = {
      users: [],
      books: [],
      progress: [],
      bookmarks: [],
      notes: [],
      reviews: [],
      stats: [],
      reports: [],
      logs: [],
      notifications: [],
      payments: [],
      premiumRequests: [],
      supportTickets: [],
      passwordRecoveryRequests: [],
      subscriptionPrices: { monthly: 9.99, yearly: 89.99 },
      aiEnabled: true
    };
    let foundAny = false;

    // Helper helper to deduplicate by ID if present
    const uniqueById = (arr: any[]) => {
      const seen = new Set();
      return arr.filter(item => {
        if (!item) return false;
        if (item.id === undefined) return true;
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
    };

    // 1. Fetch Users
    const usersSnap = await withTimeout(getDocs(collection(firestoreDb, "users")));
    if (!usersSnap.empty) {
      foundAny = true;
      cacheDocs(usersSnap.docs);
      const rawUsers = usersSnap.docs.map(docSnap => {
        const data = docSnap.data();
        // Fallbacks for display fields to maximize consistency
        if (data.displayName && !data.name) {
          data.name = data.displayName;
        }
        if (data.photoURL && !data.avatarUrl) {
          data.avatarUrl = data.photoURL;
        }
        return data;
      });
      loadedData.users = uniqueById(rawUsers);
    }

    // 2. Fetch Books
    const booksSnap = await withTimeout(getDocs(collection(firestoreDb, "books")));
    if (!booksSnap.empty) {
      foundAny = true;
      cacheDocs(booksSnap.docs);
      const rawBooks = booksSnap.docs.map(docSnap => {
        const data = docSnap.data();
        // Fallbacks to maximize compatibility with original fields
        if (data.publishedAt && !data.publishDate) {
          data.publishDate = data.publishedAt;
        }
        if (data.premium !== undefined && data.accessType === undefined) {
          data.accessType = data.premium ? "premium" : "free";
        }
        return data;
      });
      loadedData.books = uniqueById(rawBooks);
    }

    // 3. Fetch Reports (from root collection)
    const reportsSnap = await withTimeout(getDocs(collection(firestoreDb, "reports")));
    if (!reportsSnap.empty) {
      foundAny = true;
      cacheDocs(reportsSnap.docs);
      loadedData.reports = uniqueById(reportsSnap.docs.map(docSnap => docSnap.data()));
    }

    // 4. Fetch Logs (from root collection)
    const logsSnap = await withTimeout(getDocs(collection(firestoreDb, "logs")));
    if (!logsSnap.empty) {
      foundAny = true;
      cacheDocs(logsSnap.docs);
      loadedData.logs = uniqueById(logsSnap.docs.map(docSnap => docSnap.data()));
    }

    // 5. Fetch Premium Requests (from root collection)
    const reqsSnap = await withTimeout(getDocs(collection(firestoreDb, "premiumRequests")));
    if (!reqsSnap.empty) {
      foundAny = true;
      cacheDocs(reqsSnap.docs);
      loadedData.premiumRequests = uniqueById(reqsSnap.docs.map(docSnap => docSnap.data()));
    }

    // 5b. Fetch Support Tickets (from root collection)
    const ticketsSnap = await withTimeout(getDocs(collection(firestoreDb, "supportTickets")));
    if (!ticketsSnap.empty) {
      foundAny = true;
      cacheDocs(ticketsSnap.docs);
      loadedData.supportTickets = uniqueById(ticketsSnap.docs.map(docSnap => docSnap.data()));
    }

    // 5c. Fetch Password Recovery Requests (from root collection)
    const recoverySnap = await withTimeout(getDocs(collection(firestoreDb, "passwordRecovery")));
    if (!recoverySnap.empty) {
      foundAny = true;
      cacheDocs(recoverySnap.docs);
      loadedData.passwordRecoveryRequests = uniqueById(recoverySnap.docs.map(docSnap => docSnap.data()));
    }

    // 6. Fetch Settings (from settings/app)
    const settingsAppDoc = await withTimeout(getDoc(doc(firestoreDb, "settings", "app")));
    if (settingsAppDoc.exists()) {
      foundAny = true;
      syncCache[settingsAppDoc.ref.path] = JSON.stringify(settingsAppDoc.data());
      const sData = settingsAppDoc.data();
      loadedData.subscriptionPrices = sData.subscriptionPrices || { monthly: 9.99, yearly: 89.99 };
      loadedData.aiEnabled = sData.aiEnabled !== undefined ? sData.aiEnabled : true;
    } else {
      // Fallbacks to legacy/prices documents
      const pricesDoc = await withTimeout(getDoc(doc(firestoreDb, "settings", "prices")));
      if (pricesDoc.exists()) {
        foundAny = true;
        syncCache[pricesDoc.ref.path] = JSON.stringify(pricesDoc.data());
        loadedData.subscriptionPrices = pricesDoc.data().subscriptionPrices || { monthly: 9.99, yearly: 89.99 };
      }
      const globalDoc = await withTimeout(getDoc(doc(firestoreDb, "settings", "global")));
      if (globalDoc.exists()) {
        foundAny = true;
        syncCache[globalDoc.ref.path] = JSON.stringify(globalDoc.data());
        loadedData.aiEnabled = globalDoc.data().aiEnabled !== undefined ? globalDoc.data().aiEnabled : true;
      }
    }

    // 7. Fetch subcollections via collectionGroup for user and book data
    const subcollections = [
      { name: "progress", targetKey: "progress" },
      { name: "bookmarks", targetKey: "bookmarks" },
      { name: "notes", targetKey: "notes" },
      { name: "reviews", targetKey: "reviews" },
      { name: "stats", targetKey: "stats" },
      { name: "notifications", targetKey: "notifications" },
      { name: "payments", targetKey: "payments" }
    ];

    for (const sub of subcollections) {
      const snap = await withTimeout(getDocs(collectionGroup(firestoreDb, sub.name)));
      if (!snap.empty) {
        foundAny = true;
        cacheDocs(snap.docs);
        const rawItems = snap.docs.map(docSnap => docSnap.data());
        loadedData[sub.targetKey] = uniqueById(rawItems);
      }
    }

    // Fallback for reports group
    if (loadedData.reports.length === 0) {
      const repsGroupSnap = await withTimeout(getDocs(collectionGroup(firestoreDb, "reports")));
      if (!repsGroupSnap.empty) {
        cacheDocs(repsGroupSnap.docs);
        loadedData.reports = uniqueById(repsGroupSnap.docs.map(docSnap => docSnap.data()));
      }
    }

    if (!foundAny) {
      console.log("[pullFromFirestore] No data found in Firestore (database is empty).");
      return null;
    }

    console.log("[pullFromFirestore] Database loaded successfully from Cloud Firestore (Subcollection architecture)!");
    return loadedData;
  } catch (err) {
    console.error("[pullFromFirestore Error] Error pulling from Firestore:", err);
    return null;
  }
}

/**
 * Saves database collections to Firestore subcollections and individual documents.
 */
export async function pushToFirestore(dbData: any): Promise<void> {
  if (!firestoreDb) return;

  try {
    console.log("[pushToFirestore] Starting Cloud Firestore synchronization (New Collection Architecture)...");

    // Helper to delete document refs
    const safeDelete = async (ref: any) => {
      try {
        await deleteDoc(ref);
        delete syncCache[ref.path];
      } catch (e) {
        console.warn(`[pushToFirestore] Failed to delete ref: ${ref.path}`, e);
      }
    };

    // Helper to write document refs
    const safeSet = async (ref: any, data: any) => {
      const sanitized = sanitize(data);
      const dataStr = JSON.stringify(sanitized);
      if (syncCache[ref.path] === dataStr) {
        // Skip writing because it is unchanged in cache!
        return;
      }

      try {
        await setDoc(ref, sanitized);
        syncCache[ref.path] = dataStr;
      } catch (e) {
        console.error(`[pushToFirestore] Failed to set ref: ${ref.path}`, e);
      }
    };

    // Helper to slugify names safely
    const slugify = (text: string) => {
      if (!text) return "unknown";
      return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
    };

    // --- 1. SETTINGS & STATS ---
    // Settings: settings/app
    const settingsAppRef = doc(firestoreDb, "settings", "app");
    await safeSet(settingsAppRef, {
      subscriptionPrices: dbData.subscriptionPrices || { monthly: 9.99, yearly: 89.99 },
      aiEnabled: dbData.aiEnabled !== undefined ? dbData.aiEnabled : true
    });

    // Global stats: stats/global
    const statsGlobalRef = doc(firestoreDb, "stats", "global");
    const totalBooks = (dbData.books || []).length;
    const totalUsers = (dbData.users || []).length;
    const totalReviews = (dbData.reviews || []).length;
    const activeReports = (dbData.reports || []).filter((r: any) => r.status === "Pending").length;
    await safeSet(statsGlobalRef, {
      totalBooks,
      totalUsers,
      totalReviews,
      activeReports,
      updatedAt: new Date().toISOString()
    });

    // --- 2. AUTHORS, CATEGORIES & COLLECTIONS ---
    const books = dbData.books || [];
    const uniqueAuthors = new Map();
    const uniqueCategories = new Map();

    for (const b of books) {
      if (b.author) {
        const aId = slugify(b.author);
        uniqueAuthors.set(aId, b.author);
      }
      if (b.category) {
        const cId = slugify(b.category);
        uniqueCategories.set(cId, b.category);
      }
    }

    // Write extracted authors
    for (const [aId, aName] of uniqueAuthors.entries()) {
      const authorRef = doc(firestoreDb, "authors", aId);
      await safeSet(authorRef, {
        id: aId,
        name: aName,
        createdAt: new Date().toISOString()
      });
    }

    // Write extracted categories
    for (const [cId, cName] of uniqueCategories.entries()) {
      const categoryRef = doc(firestoreDb, "categories", cId);
      await safeSet(categoryRef, {
        id: cId,
        name: cName,
        createdAt: new Date().toISOString()
      });
    }

    // --- 3. BOOKS & Book-specific Subcollections ---
    const reviews = dbData.reviews || [];

    // Clean deleted books from Firestore
    const currentBooksSnap = await getDocs(collection(firestoreDb, "books"));
    const localBookIds = new Set(books.map((b: any) => b.id));
    for (const docSnap of currentBooksSnap.docs) {
      if (!localBookIds.has(docSnap.id)) {
        await safeDelete(docSnap.ref);
      }
    }

    // Save existing books and their subcollections
    for (const b of books) {
      const bookRef = doc(firestoreDb, "books", b.id);
      
      const authorId = slugify(b.author);
      const categoryId = slugify(b.category);

      const bookDocData = {
        ...b,
        authorId,
        categoryIds: [categoryId],
        premium: b.accessType === "premium",
        publishedAt: b.publishDate || "",
        updatedAt: b.updatedAt || b.createdAt || new Date().toISOString()
      };
      
      const bookStr = JSON.stringify(sanitize(bookDocData));
      const isBookUnchanged = syncCache[bookRef.path] === bookStr;

      await safeSet(bookRef, bookDocData);

      if (isBookUnchanged) {
        // Skip syncing chapters, audiobook, and reviews since book is unchanged!
        continue;
      }

      // Subcollection: chapters
      if (Array.isArray(b.pdfContent)) {
        for (let i = 0; i < b.pdfContent.length; i++) {
          const chapRef = doc(firestoreDb, "books", b.id, "chapters", `p${i}`);
          const summaryItem = b.summary?.find((s: any) => s.page === i);
          await safeSet(chapRef, {
            id: `p${i}`,
            title: summaryItem?.title || `Página ${i + 1}`,
            content: b.pdfContent[i],
            pageIndex: i
          });
        }
      }

      // Subcollection: audiobook
      if (Array.isArray(b.audioChapters)) {
        for (let i = 0; i < b.audioChapters.length; i++) {
          const audioRef = doc(firestoreDb, "books", b.id, "audiobook", `ch${i}`);
          await safeSet(audioRef, b.audioChapters[i]);
        }
      }

      // Subcollection: reviews
      const bookReviews = reviews.filter((r: any) => r.bookId === b.id);
      for (const r of bookReviews) {
        const rRef = doc(firestoreDb, "books", b.id, "reviews", r.id);
        await safeSet(rRef, r);
      }
    }

    // --- 4. USERS & User-specific Subcollections ---
    const users = dbData.users || [];
    const progress = dbData.progress || [];
    const bookmarks = dbData.bookmarks || [];
    const notes = dbData.notes || [];
    const notifications = dbData.notifications || [];
    const payments = dbData.payments || [];
    const stats = dbData.stats || [];

    // Clean deleted users from Firestore
    const currentUsersSnap = await getDocs(collection(firestoreDb, "users"));
    const localUserIds = new Set(users.map((u: any) => u.id));
    for (const docSnap of currentUsersSnap.docs) {
      if (!localUserIds.has(docSnap.id)) {
        await safeDelete(docSnap.ref);
      }
    }

    // Save existing users
    for (const u of users) {
      const userRef = doc(firestoreDb, "users", u.id);
      const userDocData = {
        ...u,
        displayName: u.name,
        photoURL: u.avatarUrl || ""
      };
      await safeSet(userRef, userDocData);

      // Map administrative roles into the admins collection
      if (u.role === "Super Administrador" || u.role === "Administrador" || u.role === "Moderador") {
        const adminRef = doc(firestoreDb, "admins", u.id);
        await safeSet(adminRef, {
          id: u.id,
          cargo: u.role,
          permissões: u.role === "Super Administrador" ? ["all"] : ["moderate", "read"],
          data_de_criação: u.createdAt || new Date().toISOString(),
          último_acesso: u.lastAccess || new Date().toISOString(),
          status: u.status || "Active"
        });
      } else {
        const adminRef = doc(firestoreDb, "admins", u.id);
        await safeDelete(adminRef);
      }

      // Subcollection: progress (users/{userId}/progress/{bookId})
      const userProgress = progress.filter((p: any) => p.userId === u.id);
      for (const p of userProgress) {
        const pRef = doc(firestoreDb, "users", u.id, "progress", p.bookId);
        await safeSet(pRef, p);
      }

      // Subcollection: bookmarks (users/{userId}/bookmarks/{bookmarkId})
      const userBookmarks = bookmarks.filter((b: any) => b.userId === u.id);
      for (const b of userBookmarks) {
        const bRef = doc(firestoreDb, "users", u.id, "bookmarks", b.id);
        await safeSet(bRef, b);
      }

      // Subcollection: library (users/{userId}/library/{bookId})
      if (Array.isArray(u.favorites)) {
        for (const favBookId of u.favorites) {
          const favRef = doc(firestoreDb, "users", u.id, "library", favBookId);
          await safeSet(favRef, {
            bookId: favBookId,
            addedAt: u.createdAt || new Date().toISOString()
          });
        }
      }

      // Subcollection: notes and highlights (users/{userId}/notes/{noteId} & users/{userId}/highlights/{highlightId})
      const userNotes = notes.filter((n: any) => n.userId === u.id);
      for (const n of userNotes) {
        const nRef = doc(firestoreDb, "users", u.id, "notes", n.id);
        await safeSet(nRef, n);
        const hRef = doc(firestoreDb, "users", u.id, "highlights", n.id);
        await safeSet(hRef, n);
      }

      // Subcollection: notifications (users/{userId}/notifications/{notifId})
      const userNotifs = notifications.filter((n: any) => n.userId === u.id);
      for (const n of userNotifs) {
        const nRef = doc(firestoreDb, "users", u.id, "notifications", n.id);
        await safeSet(nRef, n);
      }

      // Subcollection: payments (users/{userId}/payments/{payId})
      const userPayments = payments.filter((p: any) => p.userId === u.id);
      for (const p of userPayments) {
        const pRef = doc(firestoreDb, "users", u.id, "payments", p.id);
        await safeSet(pRef, p);
      }

      // Subcollection: stats (users/{userId}/stats/main)
      const userStats = stats.find((s: any) => s.userId === u.id);
      if (userStats) {
        const sRef = doc(firestoreDb, "users", u.id, "stats", "main");
        await safeSet(sRef, userStats);
      }
    }

    // --- 5. GLOBAL ROOT COLLECTIONS: REPORTS, LOGS, PREMIUM REQUESTS ---
    const reports = dbData.reports || [];
    const logs = dbData.logs || [];
    const premiumRequests = dbData.premiumRequests || [];

    // Sync Reports (reports/{reportId})
    const currentReportsSnap = await getDocs(collection(firestoreDb, "reports"));
    const localReportIds = new Set(reports.map((r: any) => r.id));
    for (const docSnap of currentReportsSnap.docs) {
      if (!localReportIds.has(docSnap.id)) {
        await safeDelete(docSnap.ref);
      }
    }
    for (const r of reports) {
      const rRef = doc(firestoreDb, "reports", r.id);
      await safeSet(rRef, r);
    }

    // Sync Logs (logs/{logId})
    const currentLogsSnap = await getDocs(collection(firestoreDb, "logs"));
    const localLogIds = new Set(logs.map((l: any) => l.id));
    for (const docSnap of currentLogsSnap.docs) {
      if (!localLogIds.has(docSnap.id)) {
        await safeDelete(docSnap.ref);
      }
    }
    for (const l of logs) {
      const lRef = doc(firestoreDb, "logs", l.id);
      await safeSet(lRef, l);
    }

    // Sync Premium Requests (premiumRequests/{requestId})
    const currentReqsSnap = await getDocs(collection(firestoreDb, "premiumRequests"));
    const localReqIds = new Set(premiumRequests.map((r: any) => r.id));
    for (const docSnap of currentReqsSnap.docs) {
      if (!localReqIds.has(docSnap.id)) {
        await safeDelete(docSnap.ref);
      }
    }
    for (const r of premiumRequests) {
      const rRef = doc(firestoreDb, "premiumRequests", r.id);
      await safeSet(rRef, r);
    }

    // Sync Support Tickets (supportTickets/{ticketId})
    const supportTickets = dbData.supportTickets || [];
    const currentTicketsSnap = await getDocs(collection(firestoreDb, "supportTickets"));
    const localTicketIds = new Set(supportTickets.map((t: any) => t.id));
    for (const docSnap of currentTicketsSnap.docs) {
      if (!localTicketIds.has(docSnap.id)) {
        await safeDelete(docSnap.ref);
      }
    }
    for (const t of supportTickets) {
      const tRef = doc(firestoreDb, "supportTickets", t.id);
      await safeSet(tRef, t);
    }

    // Sync Password Recovery Requests (passwordRecovery/{requestId})
    const passwordRecoveryRequests = dbData.passwordRecoveryRequests || [];
    const currentRecoverySnap = await getDocs(collection(firestoreDb, "passwordRecovery"));
    const localRecoveryIds = new Set(passwordRecoveryRequests.map((r: any) => r.id));
    for (const docSnap of currentRecoverySnap.docs) {
      if (!localRecoveryIds.has(docSnap.id)) {
        await safeDelete(docSnap.ref);
      }
    }
    for (const r of passwordRecoveryRequests) {
      const rRef = doc(firestoreDb, "passwordRecovery", r.id);
      await safeSet(rRef, r);
    }

    console.log("[pushToFirestore] Cloud Firestore synchronized successfully under the new collection architecture!");
  } catch (err) {
    console.error("[pushToFirestore Error] Failed to write to Firestore under the new collection architecture:", err);
  }
}
