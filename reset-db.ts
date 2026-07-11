import fs from "fs";
import path from "path";
import { INITIAL_BOOKS } from "./src/initialBooks";
import { pushToFirestore } from "./src/db/serverFirebase";

const DB_DIR = path.join(process.cwd(), "src", "db");
const DB_FILE = path.join(DB_DIR, "db.json");

const DEFAULT_DB = {
  users: [
    {
      id: "demo-user",
      email: "tutojose1@gmail.com",
      name: "Tuto José",
      avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop",
      createdAt: new Date("2026-07-03T05:50:46.858Z").toISOString(),
      status: "Active",
      role: "Super Administrador",
      activities: [
        { action: "Login no sistema", timestamp: new Date().toISOString() }
      ],
      lastAccess: new Date().toISOString(),
      booksReadCount: 3,
      favorites: ["dom-casmurro"],
      reportsMadeCount: 0,
      subscription: {
        plan: "PREMIUM",
        status: "active",
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        autoRenew: true,
        billingInterval: "monthly",
        paymentMethod: { brand: "visa", last4: "4242" }
      }
    },
    {
      id: "admin-user",
      email: "admin@bookverse.com",
      name: "Ana Administradora",
      avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop",
      createdAt: new Date().toISOString(),
      status: "Active",
      role: "Administrador",
      activities: [
        { action: "Login no painel administrativo", timestamp: new Date().toISOString() }
      ],
      lastAccess: new Date().toISOString(),
      booksReadCount: 0,
      favorites: [],
      reportsMadeCount: 0,
      subscription: {
        plan: "PREMIUM",
        status: "active",
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        autoRenew: true,
        billingInterval: "monthly",
        paymentMethod: { brand: "mastercard", last4: "8888" }
      }
    },
    {
      id: "moderador-user",
      email: "moderador@bookverse.com",
      name: "Marcos Moderador",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop",
      createdAt: new Date().toISOString(),
      status: "Active",
      role: "Moderador",
      activities: [
        { action: "Login na plataforma", timestamp: new Date().toISOString() }
      ],
      lastAccess: new Date().toISOString(),
      booksReadCount: 1,
      favorites: [],
      reportsMadeCount: 0
    },
    {
      id: "leitor-user",
      email: "leitor@bookverse.com",
      name: "Lucas Leitor",
      avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150&auto=format&fit=crop",
      createdAt: new Date().toISOString(),
      status: "Active",
      role: "Moderador",
      activities: [
        { action: "Login na biblioteca pública", timestamp: new Date().toISOString() }
      ],
      lastAccess: new Date().toISOString(),
      booksReadCount: 2,
      favorites: ["memorias-postumas"],
      reportsMadeCount: 0,
      subscription: {
        plan: "FREE",
        status: "active",
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        autoRenew: false
      }
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
  ],
  reports: [
    {
      id: "rep-1",
      bookId: "memorias-postumas",
      bookTitle: "Memórias Póstumas de Brás Cubas",
      userId: "demo-user",
      userName: "Tuto José",
      reason: "Conteúdo inadequado",
      description: "Contém termos arcaicos que geram debate conceitual.",
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      status: "Pending"
    }
  ],
  logs: [
    {
      id: "log-1",
      userId: "demo-user",
      userName: "Tuto José",
      userEmail: "tutojose1@gmail.com",
      action: "Logins administrativos",
      details: "Super Administrador Tuto José realizou login no painel.",
      timestamp: new Date().toISOString()
    }
  ],
  notifications: [],
  payments: [
    {
      id: "pay-1",
      userId: "demo-user",
      amount: 9.99,
      currency: "BRL",
      interval: "monthly",
      status: "succeeded",
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      planName: "Premium Mensal",
      receiptUrl: "#"
    }
  ],
  subscriptionPrices: { monthly: 9.99, yearly: 89.99 },
  premiumRequests: [],
  supportTickets: [],
  aiEnabled: true
};

async function runReset() {
  try {
    console.log("[Reset Script] Overwriting local database with DEFAULT_DB...");
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2));
    console.log("[Reset Script] Local database db.json successfully reset.");

    console.log("[Reset Script] Synchronizing clean database to Firestore...");
    await pushToFirestore(DEFAULT_DB);
    console.log("[Reset Script] Database fully synchronized to Firestore!");
    console.log("[Reset Script] Reset completed successfully!");
  } catch (error) {
    console.error("[Reset Script] Error during reset operation:", error);
    process.exit(1);
  }
}

runReset();
