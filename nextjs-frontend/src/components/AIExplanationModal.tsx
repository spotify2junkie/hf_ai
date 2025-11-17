'use client'

import { useState, useEffect, useRef } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Paper } from '@/types'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface AIExplanationModalProps {
  isOpen: boolean
  onClose: () => void
  paper: Paper
}

export function AIExplanationModal({ isOpen, onClose, paper }: AIExplanationModalProps) {
  const [status, setStatus] = useState<'idle' | 'downloading' | 'processing' | 'analyzing' | 'complete' | 'error'>('idle')
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const contentEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Auto-scroll to bottom when new content arrives
  useEffect(() => {
    if (isStreaming) {
      contentEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [content, isStreaming])

  // Cleanup on unmount or modal close
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
    }
  }, [])

  // Start AI interpretation when modal opens
  useEffect(() => {
    if (isOpen && status === 'idle') {
      startInterpretation()
    }
  }, [isOpen])

  const startInterpretation = async () => {
    try {
      setStatus('downloading')
      setContent('')
      setError(null)
      setIsStreaming(true)

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const url = `${apiUrl}/api/ai-interpretation`

      // Create abort controller for cleanup
      const abortController = new AbortController()
      abortControllerRef.current = abortController

      // Use fetch for POST with SSE
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pdf_url: paper.pdf_url,
          paper_id: paper.paper_id,
          paper_title: paper.title
        }),
        signal: abortController.signal
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      if (!response.body) {
        throw new Error('No response body')
      }

      // Read the stream
      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      const readStream = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read()

            if (done) {
              console.log('Stream complete')
              if (status !== 'complete' && status !== 'error') {
                setStatus('complete')
              }
              setIsStreaming(false)
              break
            }

            // Decode the chunk
            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split('\n\n')

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6)

                // Skip heartbeat and [DONE]
                if (data.trim() === '' || data === '[DONE]') {
                  continue
                }

                try {
                  const parsed = JSON.parse(data)

                  // Handle different status updates
                  if (parsed.status === 'downloading') {
                    setStatus('downloading')
                  } else if (parsed.status === 'processing') {
                    setStatus('processing')
                  } else if (parsed.status === 'analyzing') {
                    setStatus('analyzing')
                  } else if (parsed.status === 'complete') {
                    setStatus('complete')
                    setIsStreaming(false)
                  } else if (parsed.status === 'error' || parsed.error) {
                    setStatus('error')
                    setError(parsed.error || 'An error occurred during interpretation')
                    setIsStreaming(false)
                  } else if (parsed.chunk) {
                    // Append content chunk
                    setContent((prev) => prev + parsed.chunk)
                  }
                } catch (e) {
                  console.error('Failed to parse SSE data:', e, data)
                }
              }
            }
          }
        } catch (err) {
          console.error('Stream reading error:', err)
          setStatus('error')
          setError('Failed to read stream. Please try again.')
          setIsStreaming(false)
        }
      }

      readStream()

    } catch (err) {
      console.error('Failed to start interpretation:', err)
      setStatus('error')
      setError('Failed to start interpretation. Please try again.')
      setIsStreaming(false)
    }
  }

  const handleClose = () => {
    // Abort fetch if still running
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsStreaming(false)
    setStatus('idle')
    setContent('')
    setError(null)
    onClose()
  }

  const handleRetry = () => {
    setStatus('idle')
    setContent('')
    setError(null)
    startInterpretation()
  }

  const getStatusDisplay = () => {
    switch (status) {
      case 'downloading':
        return (
          <div className="flex items-center gap-2 text-blue-600">
            <Loader2 size={16} className="animate-spin" />
            <span>下载论文PDF中...</span>
          </div>
        )
      case 'processing':
        return (
          <div className="flex items-center gap-2 text-blue-600">
            <Loader2 size={16} className="animate-spin" />
            <span>处理PDF文件中...</span>
          </div>
        )
      case 'analyzing':
        return (
          <div className="flex items-center gap-2 text-blue-600">
            <Loader2 size={16} className="animate-spin" />
            <span>AI分析中，请稍候...</span>
          </div>
        )
      case 'complete':
        return (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle size={16} />
            <span>分析完成</span>
          </div>
        )
      case 'error':
        return (
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle size={16} />
            <span>分析失败</span>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`AI深度解读: ${paper.title}`} size="xl">
      <div className="space-y-4">
        {/* Status Bar */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
          {getStatusDisplay()}
          {status === 'error' && (
            <button
              onClick={handleRetry}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              重试
            </button>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Content */}
        {content && (
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
            <div ref={contentEndRef} />
          </div>
        )}

        {/* Loading placeholder */}
        {!content && status !== 'error' && status !== 'idle' && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Loader2 size={32} className="animate-spin mb-4" />
            <p>正在准备AI解读...</p>
          </div>
        )}
      </div>
    </Modal>
  )
}
