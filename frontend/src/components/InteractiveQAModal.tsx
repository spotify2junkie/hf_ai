import React, { useEffect, useRef } from 'react';
import { Paper } from '../types';
import { useQASession } from '../hooks/useQASession';
import PromptSelector from './PromptSelector';
import MarkdownRenderer from './MarkdownRenderer';

interface InteractiveQAModalProps {
  isOpen: boolean;
  onClose: () => void;
  paper: Paper | null;
  initialAnalysis: string;
}

const InteractiveQAModal: React.FC<InteractiveQAModalProps> = ({
  isOpen,
  onClose,
  paper,
  initialAnalysis
}) => {
  const {
    sessionId,
    conversationHistory,
    availablePrompts,
    status,
    error,
    currentResponse,
    initSession,
    askQuestion,
    clearSession
  } = useQASession();

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initialize session when modal opens
  useEffect(() => {
    if (isOpen && paper) {
      initSession(
        paper.paper_id || '',
        paper.pdf_url || undefined,
        paper.title
      ).catch(err => {
        console.error('Failed to initialize session:', err);
      });
    }

    return () => {
      if (!isOpen) {
        clearSession();
      }
    };
  }, [isOpen, paper]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationHistory, currentResponse]);

  const handleSelectPrompt = (promptText: string) => {
    askQuestion(promptText);
  };

  const handleClose = () => {
    clearSession();
    onClose();
  };

  if (!isOpen || !paper) return null;

  const isProcessing = status === 'processing' || status === 'streaming';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-7xl h-[90vh] mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900">交互式论文问答</h2>
            <p className="text-sm text-gray-600 mt-1 truncate">{paper.title}</p>
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

        {/* Session Status */}
        {!sessionId && status === 'processing' && (
          <div className="px-4 py-2 bg-blue-50 border-b border-blue-100">
            <div className="flex items-center text-sm text-blue-700">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700 mr-2"></div>
              正在初始化问答会话...
            </div>
          </div>
        )}

        {/* Main Content - Split View */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Original Analysis */}
          <div className="w-1/2 border-r border-gray-200 flex flex-col">
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700">原始分析</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {initialAnalysis ? (
                <MarkdownRenderer content={initialAnalysis} className="prose max-w-none" />
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <p>没有可用的分析内容</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Q&A Interface */}
          <div className="w-1/2 flex flex-col">
            {/* Chat History */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              {conversationHistory.length === 0 && !currentResponse && (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500">开始提问以了解更多论文细节</p>
                </div>
              )}

              {/* Conversation Messages */}
              {conversationHistory.map((entry, index) => (
                <div
                  key={index}
                  className={`mb-4 ${entry.role === 'user' ? 'flex justify-end' : 'flex justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-4 py-2 ${
                      entry.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-200 text-gray-900'
                    }`}
                  >
                    <div className="text-sm whitespace-pre-wrap break-words">
                      {entry.role === 'assistant' ? (
                        <MarkdownRenderer content={entry.content} className="prose prose-sm max-w-none" />
                      ) : (
                        entry.content
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Current Response (Streaming) */}
              {currentResponse && (
                <div className="mb-4 flex justify-start">
                  <div className="max-w-[85%] rounded-lg px-4 py-2 bg-white border border-gray-200 text-gray-900">
                    <MarkdownRenderer content={currentResponse} className="prose prose-sm max-w-none" />
                    <div className="inline-block w-2 h-4 bg-blue-600 animate-pulse ml-1"></div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && status === 'error' && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Prompt Selector */}
            <div className="border-t border-gray-200 p-4 bg-white max-h-96 overflow-y-auto">
              {sessionId && availablePrompts.length > 0 ? (
                <PromptSelector
                  categories={availablePrompts}
                  onSelectPrompt={handleSelectPrompt}
                  disabled={isProcessing}
                />
              ) : (
                <div className="text-center py-4 text-gray-400">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-2"></div>
                  <p className="text-sm">加载问题模板...</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-500">
            {sessionId ? (
              <span>✅ 会话已激活 - {conversationHistory.length} 条对话</span>
            ) : (
              <span>⚡ Powered by Alibaba Cloud DashScope (Qwen-Long)</span>
            )}
          </div>
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

export default InteractiveQAModal;
