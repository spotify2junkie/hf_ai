import React, { useState, useEffect, useRef } from 'react';
import { Paper } from '../types';
import MarkdownRenderer from './MarkdownRenderer';

interface AIInterpretationModalProps {
  isOpen: boolean;
  onClose: () => void;
  paper: Paper | null;
}

type Status = 'idle' | 'downloading' | 'uploading' | 'analyzing' | 'complete' | 'error';

const AIInterpretationModal: React.FC<AIInterpretationModalProps> = ({ isOpen, onClose, paper }) => {
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (isOpen && paper?.pdf_url) {
      startAnalysis();
    }

    return () => {
      // Clean up EventSource on unmount
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [isOpen, paper]);

  const startAnalysis = async () => {
    try {
      setStatus('idle');
      setContent('');
      setError(null);

      if (!paper?.pdf_url) {
        setError('No PDF URL available for this paper');
        setStatus('error');
        return;
      }

      console.log('🚀 Starting AI interpretation for:', paper.title);

      // Create POST request to initiate analysis
      const response = await fetch('/api/ai-interpretation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pdf_url: paper.pdf_url,
          paper_id: paper.paper_id,
          paper_title: paper.title
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Setup EventSource to receive SSE stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body available');
      }

      // Read stream
      const processStream = async () => {
        let buffer = '';

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
                  setStatus(parsed.status);
                  console.log(`📊 Status: ${parsed.status}`);
                }

                if (parsed.chunk) {
                  setContent(prev => prev + parsed.chunk);
                }

                if (parsed.error) {
                  setError(parsed.error);
                  setStatus('error');
                  console.error('❌ Error:', parsed.error);
                }

              } catch (parseError) {
                console.warn('Failed to parse SSE data:', data);
              }
            }
          }
        }
      };

      await processStream();

    } catch (err: any) {
      console.error('❌ Analysis failed:', err);
      setError(err.message || 'Analysis failed. Please try again.');
      setStatus('error');
    }
  };

  const handleRetry = () => {
    startAnalysis();
  };

  const handleClose = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    setContent('');
    setStatus('idle');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  const getStatusMessage = () => {
    switch (status) {
      case 'downloading':
        return '⬇️ Downloading PDF...';
      case 'uploading':
        return '📤 Uploading to AI service...';
      case 'analyzing':
        return '🤖 Analyzing paper (this may take 2-3 minutes)...';
      case 'complete':
        return '✅ Analysis complete!';
      case 'error':
        return '❌ Analysis failed';
      default:
        return '🚀 Preparing...';
    }
  };

  const isLoading = ['idle', 'downloading', 'uploading', 'analyzing'].includes(status);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-6xl h-[90vh] mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900">AI Paper Interpretation</h2>
            <p className="text-sm text-gray-600 mt-1 truncate">{paper?.title}</p>
          </div>
          <button
            onClick={handleClose}
            className="ml-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Status Bar */}
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              {getStatusMessage()}
            </span>
            {isLoading && (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>

          {/* Progress bar */}
          {isLoading && (
            <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
              <div className="bg-blue-600 h-1.5 rounded-full animate-pulse" style={{ width: '45%' }}></div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error ? (
            <div className="text-center py-12">
              <div className="text-red-600 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Analysis Failed</h3>
              <p className="text-gray-600 mb-6">{error}</p>
              <button
                onClick={handleRetry}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                🔄 Retry
              </button>
            </div>
          ) : content ? (
            <MarkdownRenderer content={content} className="prose max-w-none" />
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-500">Waiting for AI analysis...</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-500">
            Powered by Alibaba Cloud DashScope (Qwen-Long)
          </div>
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIInterpretationModal;
