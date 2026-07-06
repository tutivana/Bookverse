export type UserStatus = "Active" | "Blocked";
export type UserRole = "Super Administrador" | "Administrador" | "Moderador" | "Leitor";

export interface UserActivity {
  action: string;
  timestamp: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  createdAt: string;
  status?: UserStatus; // Default to "Active"
  role?: UserRole; // Default to "Super Administrador" for demo-user, "Moderador" or "Administrador" for testing
  activities?: UserActivity[];
  lastAccess?: string;
  booksReadCount?: number;
  favorites?: string[];
  reportsMadeCount?: number;
  username?: string;
  bio?: string;
  isBannedFromCommenting?: boolean;
  subscription?: {
    plan: "FREE" | "PREMIUM";
    status: "active" | "canceled" | "past_due" | "expired" | "trial";
    expiresAt: string;
    autoRenew: boolean;
    paymentMethod?: { brand: string; last4: string };
    priceId?: string;
    billingInterval?: "monthly" | "yearly";
  };
  preferences?: {
    language?: string;
    theme?: string;
    fontSize?: string;
    layoutMode?: string;
    notifyPush?: boolean;
    notifyEmail?: boolean;
    audioSpeed?: string;
    notifyInApp?: {
      newBooks?: boolean;
      newAudiobooks?: boolean;
      commentReplies?: boolean;
      bookAvailable?: boolean;
      recommendations?: boolean;
      readingReminders?: boolean;
      platformAnnouncements?: boolean;
    };
    notifyPushPrefs?: {
      newBooks?: boolean;
      newAudiobooks?: boolean;
      commentReplies?: boolean;
      bookAvailable?: boolean;
      recommendations?: boolean;
      readingReminders?: boolean;
      platformAnnouncements?: boolean;
    };
  };
  pushTokens?: string[];
  security?: {
    twoFactorEnabled?: boolean;
    devices?: string[];
    sessions?: { id: string; name: string; ip: string; lastActive: string }[];
  };
  privacy?: {
    accountPrivate?: boolean;
    showStats?: boolean;
  };
}

export type BookStatus = "Draft" | "Pending Review" | "Active" | "Inactive" | "Rejected" | "Archived";

export interface BookHistoryChanges {
  field: string;
  old: any;
  new: any;
}

export interface BookHistory {
  id: string;
  adminId: string;
  adminName: string;
  action: string; // e.g. "Ativar", "Desativar", "Criar", "Editar"
  timestamp: string;
  changes?: BookHistoryChanges[];
  reason?: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  description: string;
  pages: number;
  estimatedReadTime: string;
  audiobookAvailable: boolean;
  audioDuration?: string;
  coverUrl: string;
  language: string;
  publishDate: string;
  pdfContent: string[]; // Content of the pages (indexed 0 to pages-1)
  audioChapters?: { title: string; startPage: number; durationSeconds: number }[];
  summary?: { title: string; page: number }[];
  // Expanded administrative fields
  status?: BookStatus; // Default to "Active"
  accessType?: "free" | "premium"; // Default to "free"
  isFeatured?: boolean; // Highlight on home page
  isbn?: string;
  keywords?: string[];
  tags?: string[];
  createdAt?: string;
  readsCount?: number;
  favoritesCount?: number;
  ratingsCount?: number;
  avgRating?: number;
  listenersCount?: number;
  lastReadAt?: string;
  history?: BookHistory[];
  aiAnalysis?: BookAIAnalysis;
  copyright?: {
    status: "public_domain" | "licensed" | "commercial" | "exclusive";
    licenseType: string;
  };
}

export interface BookAIAnalysis {
  suggestedCategories: string[];
  autoTags: {
    themes: string[];
    emotions: string[];
    targetAudience: string;
    complexity: string;
  };
  suggestedMetadata: {
    description: string;
    shortSummary: string;
    fullSummary: string;
    keywords: string[];
    alternativeTitle?: string;
    detectedLanguage: string;
    estimatedYear?: string;
  };
  qualityMetrics: {
    status: "OK" | "Revisão necessária" | "Rejeitar sugestão";
    corruptedText: boolean;
    duplicatedPages: boolean;
    inconsistentFormatting: boolean;
    unreadableFile: boolean;
    inappropriateContent: boolean;
    lowPdfQuality: boolean;
    details?: string;
  };
  potentialPopularity: {
    readingPotential: "Baixo" | "Médio" | "Alto";
    retentionProbability: "Baixa" | "Média" | "Alta";
    relevanceIndex: number; // 0-100
    interestTrend: string;
  };
  featuredSuggestions: {
    recommendationReason: string;
    homepageSuitability: "Baixa" | "Média" | "Alta" | "Excelente";
    campaignIdea?: string;
    trendingPotential: boolean;
  };
  processedAt: string;
}

export interface ReadingProgress {
  userId: string;
  bookId: string;
  lastPage: number; // 0-indexed page number
  progressPercentage: number;
  lastReadAt: string;
  audioPositionSeconds?: number; // Last position in the audiobook
}

export interface Bookmark {
  id: string;
  userId: string;
  bookId: string;
  page: number;
  createdAt: string;
}

export interface HighlightAndNote {
  id: string;
  userId: string;
  bookId: string;
  page: number;
  selectedText: string;
  text?: string; // Optional user note associated with this highlight
  color: string; // e.g. 'yellow', 'green', 'blue', 'pink'
  createdAt: string;
}

export interface ReviewReply {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  comment: string;
  createdAt: string;
}

export interface CommentReport {
  id: string;
  commentId: string;
  userId: string;
  userName: string;
  reason: string;
  description: string;
  date: string;
}

export interface Review {
  id: string;
  userId: string;
  bookId: string;
  userName: string;
  userAvatar?: string;
  rating?: number; // 1-5 (optional)
  comment: string;
  createdAt: string;
  likes?: string[]; // array of userIds who liked
  replies?: ReviewReply[];
  status?: "active" | "hidden"; // Default to "active"
  reports?: CommentReport[];
  bookTitle?: string; // cached for easy reporting admin view
}

export interface ReadingStats {
  userId: string;
  readingMinutes: number;
  listeningMinutes: number;
  booksCompletedCount: number;
  booksInProgressCount: number;
  pagesReadCount: number;
  avgSessionMinutes: number;
}

export type ReportStatus = "Pending" | "Ignored" | "Resolved";

export interface BookReport {
  id: string;
  bookId: string;
  bookTitle: string;
  userId: string;
  userName: string;
  reason: string;
  description: string;
  date: string;
  status: ReportStatus;
}

export interface AdminLog {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: string; // e.g. "Criação de Livro", "Ativação", "Bloqueio de Usuário"
  details: string; // details of the action
  timestamp: string;
  ip?: string;
}

export interface BookNotification {
  id: string;
  userId: string;
  bookId?: string;
  bookTitle?: string;
  title: string;
  message: string;
  type: "books" | "reading" | "interactions" | "account" | "admin" | "system";
  category: string;
  icon?: string;
  destinationLink?: string;
  priority: "low" | "medium" | "high";
  read: boolean;
  createdAt: string;
  readAt?: string | null;
  origin: "system" | "admin" | "automatic";
}

export interface PaymentHistoryItem {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  interval: "monthly" | "yearly";
  status: "succeeded" | "failed";
  date: string;
  receiptUrl?: string;
  planName: string;
}



