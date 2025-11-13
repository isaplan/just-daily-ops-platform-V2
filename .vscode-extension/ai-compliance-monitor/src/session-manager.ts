/**
 * Session Manager
 * Manages AI task sessions and history
 */

import { AISession, ComplianceStatus } from './types';

export class SessionManager {
  private sessions: AISession[] = [];
  private currentSession?: AISession;
  private readonly MAX_HISTORY = 50; // Keep last 50 sessions

  /**
   * Generate a unique session ID
   */
  generateSessionId(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let id = '';
    for (let i = 0; i < 6; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
  }

  /**
   * Format timestamp for display
   */
  formatTimestamp(date: Date): string {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  }

  /**
   * Format time (HH:MM:SS only)
   */
  formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  }

  /**
   * Calculate duration in seconds
   */
  calculateDuration(start: Date, end: Date): number {
    return Math.floor((end.getTime() - start.getTime()) / 1000);
  }

  /**
   * Format duration for display
   */
  formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }

  /**
   * Start a new session
   */
  startSession(taskDescription: string): AISession {
    const session: AISession = {
      sessionId: this.generateSessionId(),
      startTime: new Date(),
      taskDescription,
      filesModified: [],
      status: 'checking'
    };

    this.currentSession = session;
    return session;
  }

  /**
   * End the current session
   */
  endSession(filesModified: string[], status: ComplianceStatus): AISession | undefined {
    if (!this.currentSession) {
      return undefined;
    }

    const endTime = new Date();
    this.currentSession.endTime = endTime;
    this.currentSession.filesModified = filesModified;
    this.currentSession.status = status;
    this.currentSession.duration = this.calculateDuration(
      this.currentSession.startTime,
      endTime
    );

    // Add to history
    this.sessions.unshift(this.currentSession);

    // Limit history size
    if (this.sessions.length > this.MAX_HISTORY) {
      this.sessions = this.sessions.slice(0, this.MAX_HISTORY);
    }

    const completedSession = this.currentSession;
    this.currentSession = undefined;

    return completedSession;
  }

  /**
   * Get current session
   */
  getCurrentSession(): AISession | undefined {
    return this.currentSession;
  }

  /**
   * Get session history
   */
  getHistory(limit?: number): AISession[] {
    return limit ? this.sessions.slice(0, limit) : this.sessions;
  }

  /**
   * Get session by ID
   */
  getSessionById(sessionId: string): AISession | undefined {
    return this.sessions.find(s => s.sessionId === sessionId);
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.sessions = [];
  }

  /**
   * Get statistics
   */
  getStatistics() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaySessions = this.sessions.filter(
      s => s.startTime >= today
    );

    const totalViolations = todaySessions.reduce((sum, session) => {
      return sum + (session.postCheckResult?.summary.violationsCount || 0);
    }, 0);

    const criticalViolations = todaySessions.reduce((sum, session) => {
      return sum + (session.postCheckResult?.summary.criticalViolations || 0);
    }, 0);

    const highViolations = todaySessions.reduce((sum, session) => {
      return sum + (session.postCheckResult?.summary.highViolations || 0);
    }, 0);

    const mediumViolations = todaySessions.reduce((sum, session) => {
      return sum + (session.postCheckResult?.summary.mediumViolations || 0);
    }, 0);

    return {
      totalSessions: this.sessions.length,
      todaySessions: todaySessions.length,
      totalViolations,
      criticalViolations,
      highViolations,
      mediumViolations
    };
  }
}







