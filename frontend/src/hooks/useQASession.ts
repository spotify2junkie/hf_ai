import { useState, useCallback, useRef } from 'react';
import {
  QASessionResponse,
  ConversationEntry,
  PromptCategory,
  QAStatus
} from '../types';

interface UseQASessionResult {
  sessionId: string | null;
  fileId: string | null;
  conversationHistory: ConversationEntry[];
  availablePrompts: PromptCategory[];
  status: QAStatus;
  error: string | null;
  currentResponse: string;
  initSession: (paperId: string, pdfUrl?: string, paperTitle?: string) => Promise<void>;
  askQuestion: (question: string) => Promise<void>;
  clearSession: () => void;
}

export const useQASession = (): UseQASessionResult => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [fileId, setFileId] = useState<string | null>(null);
  const [conversationHistory, setConversationHistory] = useState<ConversationEntry[]>([]);
  const [availablePrompts, setAvailablePrompts] = useState<PromptCategory[]>([]);
  const [status, setStatus] = useState<QAStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [currentResponse, setCurrentResponse] = useState<string>('');

  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Initialize or retrieve Q&A session
   */
  const initSession = useCallback(async (
    paperId: string,
    pdfUrl?: string,
    paperTitle?: string
  ) => {
    try {
      setStatus('processing');
      setError(null);

      const response = await fetch('/api/qa/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paper_id: paperId,
          pdf_url: pdfUrl,
          paper_title: paperTitle
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create session');
      }

      const data: QASessionResponse = await response.json();

      setSessionId(data.sessionId);
      setFileId(data.fileId);
      setConversationHistory(data.conversationHistory || []);
      setAvailablePrompts(data.availablePrompts || []);
      setStatus('idle');

      console.log('✅ Q&A session initialized:', data.sessionId);

    } catch (err: any) {
      console.error('❌ Session initialization error:', err);
      setError(err.message || 'Failed to initialize session');
      setStatus('error');
      throw err;
    }
  }, []);

  /**
   * Ask a question and stream the response
   */
  const askQuestion = useCallback(async (question: string) => {
    if (!sessionId) {
      setError('No active session');
      return;
    }

    if (!question.trim()) {
      setError('Question cannot be empty');
      return;
    }

    try {
      setStatus('processing');
      setError(null);
      setCurrentResponse('');

      // Add user message to conversation history immediately
      const userMessage: ConversationEntry = {
        role: 'user',
        content: question,
        timestamp: Date.now()
      };
      setConversationHistory(prev => [...prev, userMessage]);

      // Create abort controller for this request
      abortControllerRef.current = new AbortController();

      const response = await fetch('/api/qa/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          question
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to ask question');
      }

      setStatus('streaming');

      // Process SSE stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body available');
      }

      let buffer = '';
      let assistantContent = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          console.log('✅ Stream complete');
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE messages
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);

            // Skip heartbeat
            if (data.trim() === '' || line.startsWith(': heartbeat')) {
              continue;
            }

            try {
              const parsed = JSON.parse(data);

              if (parsed.status) {
                if (parsed.status === 'complete') {
                  setStatus('complete');
                } else if (parsed.status === 'timeout') {
                  setStatus('timeout');
                } else if (parsed.status === 'error') {
                  setStatus('error');
                  setError(parsed.message || 'Unknown error');
                }
              }

              if (parsed.chunk) {
                assistantContent += parsed.chunk;
                setCurrentResponse(assistantContent);
              }

              if (parsed.error) {
                setError(parsed.error);
                setStatus('error');
                console.error('❌ Stream error:', parsed.error);
              }

            } catch (parseError) {
              console.warn('Failed to parse SSE data:', data);
            }
          }
        }
      }

      // Add assistant response to conversation history
      if (assistantContent) {
        const assistantMessage: ConversationEntry = {
          role: 'assistant',
          content: assistantContent,
          timestamp: Date.now()
        };
        setConversationHistory(prev => [...prev, assistantMessage]);
      }

      setCurrentResponse('');
      setStatus('complete');

    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('⚠️  Request aborted');
        setStatus('idle');
      } else {
        console.error('❌ Question error:', err);
        setError(err.message || 'Failed to process question');
        setStatus('error');
      }
    }
  }, [sessionId]);

  /**
   * Clear current session
   */
  const clearSession = useCallback(() => {
    // Abort any ongoing requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setSessionId(null);
    setFileId(null);
    setConversationHistory([]);
    setAvailablePrompts([]);
    setStatus('idle');
    setError(null);
    setCurrentResponse('');

    console.log('🧹 Session cleared');
  }, []);

  return {
    sessionId,
    fileId,
    conversationHistory,
    availablePrompts,
    status,
    error,
    currentResponse,
    initSession,
    askQuestion,
    clearSession
  };
};
