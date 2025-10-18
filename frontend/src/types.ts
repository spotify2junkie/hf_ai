// TypeScript type definitions for the MVP

export interface Paper {
  title: string;
  authors: string[];
  abstract: string;
  abstract_zh?: string; // Chinese translation (optional)
  pdf_url: string | null;
  topics: string[];
  published_date: string;
  paper_id?: string | null;
}

export interface ApiResponse {
  success: boolean;
  date: string;
  count: number;
  papers: Paper[];
}

export interface ApiError {
  error: string;
  details?: string;
  provided?: string;
  example?: string;
}

export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

// Q&A Types
export interface Prompt {
  id: string;
  text: string;
  description: string;
}

export interface PromptCategory {
  id: string;
  label: string;
  icon: string;
  description: string;
  prompts: Prompt[];
}

export interface ConversationEntry {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface QASession {
  sessionId: string;
  paperId: string;
  fileId: string;
  createdAt: number;
  lastAccessedAt: number;
  expiresAt: number;
  conversationHistory: ConversationEntry[];
  metadata: {
    paperTitle: string;
    pdfUrl: string;
  };
}

export interface QASessionResponse {
  success: boolean;
  sessionId: string;
  fileId: string;
  paperId: string;
  createdAt: number;
  expiresAt: number;
  availablePrompts: PromptCategory[];
  conversationHistory: ConversationEntry[];
}

export type QAStatus = 'idle' | 'processing' | 'streaming' | 'complete' | 'timeout' | 'error';