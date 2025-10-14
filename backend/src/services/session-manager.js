const crypto = require('crypto');

/**
 * Session Manager Service
 * Manages Q&A sessions with fileIds and conversation history
 */

class SessionManager {
  constructor() {
    // In-memory storage for sessions
    // In production, use Redis or similar
    this.sessions = new Map();

    // Default TTL: 24 hours
    this.defaultTTL = 24 * 60 * 60 * 1000;

    // Max conversation history entries
    this.maxHistorySize = 10;

    // Start cleanup interval (every hour)
    this.startCleanupInterval();

    console.log('📋 Session Manager initialized');
  }

  /**
   * Generate unique session ID
   * @returns {string}
   */
  generateSessionId() {
    return crypto.randomUUID();
  }

  /**
   * Create or retrieve a session
   * @param {string} paperId - Paper identifier
   * @param {string} fileId - DashScope file ID
   * @param {object} metadata - Additional metadata
   * @returns {object} - Session object
   */
  createSession(paperId, fileId, metadata = {}) {
    // Check if active session exists for this paper
    const existingSession = this.findSessionByPaperId(paperId);
    if (existingSession && !this.isExpired(existingSession)) {
      console.log(`♻️  Reusing existing session for paper ${paperId}`);
      return existingSession;
    }

    const sessionId = this.generateSessionId();
    const now = Date.now();

    const session = {
      sessionId,
      paperId,
      fileId,
      createdAt: now,
      lastAccessedAt: now,
      expiresAt: now + this.defaultTTL,
      conversationHistory: [],
      metadata: {
        paperTitle: metadata.paperTitle || 'Unknown',
        pdfUrl: metadata.pdfUrl || '',
        ...metadata
      }
    };

    this.sessions.set(sessionId, session);
    console.log(`✨ Created new session ${sessionId} for paper ${paperId}`);

    return session;
  }

  /**
   * Get session by ID
   * @param {string} sessionId
   * @returns {object|null}
   */
  getSession(sessionId) {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return null;
    }

    if (this.isExpired(session)) {
      console.log(`⏰ Session ${sessionId} has expired`);
      this.deleteSession(sessionId);
      return null;
    }

    // Update last accessed time
    session.lastAccessedAt = Date.now();

    return session;
  }

  /**
   * Find session by paper ID
   * @param {string} paperId
   * @returns {object|null}
   */
  findSessionByPaperId(paperId) {
    for (const session of this.sessions.values()) {
      if (session.paperId === paperId && !this.isExpired(session)) {
        return session;
      }
    }
    return null;
  }

  /**
   * Add conversation entry to session
   * @param {string} sessionId
   * @param {string} role - 'user' or 'assistant'
   * @param {string} content
   */
  addConversation(sessionId, role, content) {
    const session = this.getSession(sessionId);

    if (!session) {
      throw new Error(`Session ${sessionId} not found or expired`);
    }

    const entry = {
      role,
      content,
      timestamp: Date.now()
    };

    session.conversationHistory.push(entry);

    // Limit history size
    if (session.conversationHistory.length > this.maxHistorySize) {
      session.conversationHistory = session.conversationHistory.slice(-this.maxHistorySize);
    }

    session.lastAccessedAt = Date.now();

    console.log(`💬 Added ${role} message to session ${sessionId} (history: ${session.conversationHistory.length})`);
  }

  /**
   * Get conversation history for session
   * @param {string} sessionId
   * @param {number} limit - Max number of entries (default: all)
   * @returns {array}
   */
  getConversationHistory(sessionId, limit = null) {
    const session = this.getSession(sessionId);

    if (!session) {
      return [];
    }

    const history = session.conversationHistory;

    if (limit && limit > 0) {
      return history.slice(-limit);
    }

    return history;
  }

  /**
   * Get fileId for a session
   * @param {string} sessionId
   * @returns {string|null}
   */
  getFileId(sessionId) {
    const session = this.getSession(sessionId);
    return session ? session.fileId : null;
  }

  /**
   * Check if session is expired
   * @param {object} session
   * @returns {boolean}
   */
  isExpired(session) {
    return Date.now() > session.expiresAt;
  }

  /**
   * Delete session
   * @param {string} sessionId
   */
  deleteSession(sessionId) {
    const deleted = this.sessions.delete(sessionId);
    if (deleted) {
      console.log(`🗑️  Deleted session ${sessionId}`);
    }
    return deleted;
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpired() {
    const now = Date.now();
    let cleaned = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (this.isExpired(session)) {
        this.sessions.delete(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} expired sessions`);
    }

    return cleaned;
  }

  /**
   * Start periodic cleanup interval
   */
  startCleanupInterval() {
    // Run cleanup every hour
    setInterval(() => {
      this.cleanupExpired();
    }, 60 * 60 * 1000);
  }

  /**
   * Get statistics
   * @returns {object}
   */
  getStats() {
    const now = Date.now();
    let activeSessions = 0;
    let expiredSessions = 0;
    let totalConversations = 0;

    for (const session of this.sessions.values()) {
      if (this.isExpired(session)) {
        expiredSessions++;
      } else {
        activeSessions++;
        totalConversations += session.conversationHistory.length;
      }
    }

    return {
      activeSessions,
      expiredSessions,
      totalConversations,
      avgConversationsPerSession: activeSessions > 0
        ? (totalConversations / activeSessions).toFixed(2)
        : 0
    };
  }

  /**
   * Clear all sessions (for testing)
   */
  clearAll() {
    const count = this.sessions.size;
    this.sessions.clear();
    console.log(`🧹 Cleared all ${count} sessions`);
    return count;
  }
}

module.exports = new SessionManager();
