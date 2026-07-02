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
      subscriptionPrices: { monthly: 9.99, yearly: 89.99 },
      aiEnabled: true
    };
    let foundAny = false;

    // 1. Fetch Users
    const usersSnap = await getDocs(collection(firestoreDb, "users"));
    if (!usersSnap.empty) {
      foundAny = true;
      loadedData.users = usersSnap.docs.map(docSnap => docSnap.data());
    }

    // 2. Fetch Books
    const booksSnap = await getDocs(collection(firestoreDb, "books"));
    if (!booksSnap.empty) {
      foundAny = true;
      loadedData.books = booksSnap.docs.map(docSnap => docSnap.data());
    }

    // 3. Fetch Logs
    const logsSnap = await getDocs(collection(firestoreDb, "logs"));
    if (!logsSnap.empty) {
      foundAny = true;
      loadedData.logs = logsSnap.docs.map(docSnap => docSnap.data());
    }

    // 4. Fetch Premium Requests
    const reqsSnap = await getDocs(collection(firestoreDb, "premiumRequests"));
    if (!reqsSnap.empty) {
      foundAny = true;
      loadedData.premiumRequests = reqsSnap.docs.map(docSnap => docSnap.data());
    }

    // 5. Fetch Settings
    const settingsSnap = await getDocs(collection(firestoreDb, "settings"));
    if (!settingsSnap.empty) {
      foundAny = true;
      settingsSnap.docs.forEach(docSnap => {
        const id = docSnap.id;
        const data = docSnap.data();
        if (id === "prices") {
          loadedData.subscriptionPrices = data.subscriptionPrices || { monthly: 9.99, yearly: 89.99 };
        } else if (id === "global") {
          loadedData.aiEnabled = data.aiEnabled !== undefined ? data.aiEnabled : true;
        }
      });
    }

    // 6. Fetch subcollections via collectionGroup for modular, unlimited list capacities
    const subcollections = [
      { name: "progress", targetKey: "progress" },
      { name: "bookmarks", targetKey: "bookmarks" },
      { name: "notes", targetKey: "notes" },
      { name: "reviews", targetKey: "reviews" },
      { name: "stats", targetKey: "stats" },
      { name: "reports", targetKey: "reports" },
      { name: "notifications", targetKey: "notifications" },
      { name: "payments", targetKey: "payments" }
    ];

    for (const sub of subcollections) {
      const snap = await getDocs(collectionGroup(firestoreDb, sub.name));
      if (!snap.empty) {
        foundAny = true;
        loadedData[sub.targetKey] = snap.docs.map(docSnap => docSnap.data());
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
    console.log("[pushToFirestore] Starting Cloud Firestore synchronization (Subcollections)...");

    // Helper to delete document refs
    const safeDelete = async (ref: any) => {
      try {
        await deleteDoc(ref);
      } catch (e) {
        console.warn(`[pushToFirestore] Failed to delete ref: ${ref.path}`, e);
      }
    };

    // Helper to write document refs
    const safeSet = async (ref: any, data: any) => {
      try {
        await setDoc(ref, data);
      } catch (e) {
        console.error(`[pushToFirestore] Failed to set ref: ${ref.path}`, e);
      }
    };

    // --- 1. USERS & User-specific Subcollections ---
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
    for (const user of users) {
      const userRef = doc(firestoreDb, "users", user.id);
      await safeSet(userRef, user);
    }

    // Clean and sync Reading Progress (subcollection users/{userId}/progress/{bookId})
    const progressSnap = await getDocs(collectionGroup(firestoreDb, "progress"));
    const localProgressKeys = new Set(progress.map((p: any) => `${p.userId}_${p.bookId}`));
    for (const docSnap of progressSnap.docs) {
      const d = docSnap.data();
      const key = `${d.userId}_${d.bookId}`;
      if (!localProgressKeys.has(key)) {
        await safeDelete(docSnap.ref);
      }
    }
    for (const p of progress) {
      if (p.userId && p.bookId) {
        const pRef = doc(firestoreDb, "users", p.userId, "progress", p.bookId);
        await safeSet(pRef, p);
      }
    }

    // Clean and sync Bookmarks (subcollection users/{userId}/bookmarks/{bookmarkId})
    const bookmarksSnap = await getDocs(collectionGroup(firestoreDb, "bookmarks"));
    const localBookmarkIds = new Set(bookmarks.map((b: any) => b.id));
    for (const docSnap of bookmarksSnap.docs) {
      if (!localBookmarkIds.has(docSnap.id)) {
        await safeDelete(docSnap.ref);
      }
    }
    for (const b of bookmarks) {
      if (b.userId && b.id) {
        const bRef = doc(firestoreDb, "users", b.userId, "bookmarks", b.id);
        await safeSet(bRef, b);
      }
    }

    // Clean and sync Notes (subcollection users/{userId}/notes/{noteId})
    const notesSnap = await getDocs(collectionGroup(firestoreDb, "notes"));
    const localNoteIds = new Set(notes.map((n: any) => n.id));
    for (const docSnap of notesSnap.docs) {
      if (!localNoteIds.has(docSnap.id)) {
        await safeDelete(docSnap.ref);
      }
    }
    for (const n of notes) {
      if (n.userId && n.id) {
        const nRef = doc(firestoreDb, "users", n.userId, "notes", n.id);
        await safeSet(nRef, n);
      }
    }

    // Clean and sync Notifications (subcollection users/{userId}/notifications/{notifId})
    const notificationsSnap = await getDocs(collectionGroup(firestoreDb, "notifications"));
    const localNotifIds = new Set(notifications.map((n: any) => n.id));
    for (const docSnap of notificationsSnap.docs) {
      if (!localNotifIds.has(docSnap.id)) {
        await safeDelete(docSnap.ref);
      }
    }
    for (const n of notifications) {
      if (n.userId && n.id) {
        const nRef = doc(firestoreDb, "users", n.userId, "notifications", n.id);
        await safeSet(nRef, n);
      }
    }

    // Clean and sync Payments (subcollection users/{userId}/payments/{payId})
    const paymentsSnap = await getDocs(collectionGroup(firestoreDb, "payments"));
    const localPaymentIds = new Set(payments.map((p: any) => p.id));
    for (const docSnap of paymentsSnap.docs) {
      if (!localPaymentIds.has(docSnap.id)) {
        await safeDelete(docSnap.ref);
      }
    }
    for (const p of payments) {
      if (p.userId && p.id) {
        const pRef = doc(firestoreDb, "users", p.userId, "payments", p.id);
        await safeSet(pRef, p);
      }
    }

    // Clean and sync Stats (subcollection users/{userId}/stats/main)
    const statsSnap = await getDocs(collectionGroup(firestoreDb, "stats"));
    const localStatsUserIds = new Set(stats.map((s: any) => s.userId));
    for (const docSnap of statsSnap.docs) {
      const d = docSnap.data();
      if (!localStatsUserIds.has(d.userId)) {
        await safeDelete(docSnap.ref);
      }
    }
    for (const s of stats) {
      if (s.userId) {
        const sRef = doc(firestoreDb, "users", s.userId, "stats", "main");
        await safeSet(sRef, s);
      }
    }

    // --- 2. BOOKS & Book-specific Subcollections ---
    const books = dbData.books || [];
    const reviews = dbData.reviews || [];
    const reports = dbData.reports || [];

    // Clean deleted books from Firestore
    const currentBooksSnap = await getDocs(collection(firestoreDb, "books"));
    const localBookIds = new Set(books.map((b: any) => b.id));
    for (const docSnap of currentBooksSnap.docs) {
      if (!localBookIds.has(docSnap.id)) {
        await safeDelete(docSnap.ref);
      }
    }

    // Save existing books
    for (const b of books) {
      const bookRef = doc(firestoreDb, "books", b.id);
      await safeSet(bookRef, b);
    }

    // Clean and sync Reviews (subcollection books/{bookId}/reviews/{reviewId})
    const reviewsSnap = await getDocs(collectionGroup(firestoreDb, "reviews"));
    const localReviewIds = new Set(reviews.map((r: any) => r.id));
    for (const docSnap of reviewsSnap.docs) {
      if (!localReviewIds.has(docSnap.id)) {
        await safeDelete(docSnap.ref);
      }
    }
    for (const r of reviews) {
      if (r.bookId && r.id) {
        const rRef = doc(firestoreDb, "books", r.bookId, "reviews", r.id);
        await safeSet(rRef, r);
      }
    }

    // Clean and sync Book Reports (subcollection books/{bookId}/reports/{reportId})
    const reportsSnap = await getDocs(collectionGroup(firestoreDb, "reports"));
    const localReportIds = new Set(reports.map((r: any) => r.id));
    for (const docSnap of reportsSnap.docs) {
      if (!localReportIds.has(docSnap.id)) {
        await safeDelete(docSnap.ref);
      }
    }
    for (const r of reports) {
      if (r.bookId && r.id) {
        const rRef = doc(firestoreDb, "books", r.bookId, "reports", r.id);
        await safeSet(rRef, r);
      }
    }

    // --- 3. AUDIT LOGS, PREMIUM REQUESTS & SETTINGS ---
    const logs = dbData.logs || [];
    const premiumRequests = dbData.premiumRequests || [];

    // Clean and sync premiumRequests
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

    // Clean and sync logs
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

    // Settings
    const pricesRef = doc(firestoreDb, "settings", "prices");
    await safeSet(pricesRef, {
      subscriptionPrices: dbData.subscriptionPrices || { monthly: 9.99, yearly: 89.99 }
    });

    const globalRef = doc(firestoreDb, "settings", "global");
    await safeSet(globalRef, {
      aiEnabled: dbData.aiEnabled !== undefined ? dbData.aiEnabled : true
    });

    console.log("[pushToFirestore] Cloud Firestore subcollections synchronized successfully!");
  } catch (err) {
    console.error("[pushToFirestore Error] Failed to write to Firestore subcollections:", err);
  }
}
