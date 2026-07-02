export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  createdAt: string;
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

export interface Review {
  id: string;
  userId: string;
  bookId: string;
  userName: string;
  rating: number; // 1-5
  comment: string;
  createdAt: string;
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
