/**
 * Type definitions for AI Compliance Monitor
 */

export interface ComplianceConfig {
  enabled: boolean;
  autoRunPreCheck: boolean;
  autoRunPostCheck: boolean;
  showNotifications: boolean;
  notificationLevel: 'all' | 'warnings' | 'violations';
  debounceMs: number;
}

export interface ComplianceViolation {
  type: string;
  file?: string;
  message: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  requiredAction: string;
  linesChanged?: number;
  maxAllowed?: number;
  count?: number;
}

export interface PreCheckResult {
  status: 'PASS' | 'WARN' | 'BLOCK';
  message: string;
  timestamp: string;
  existingCode: string[];
  violations: ComplianceViolation[];
  requiredAction: string;
  registry: {
    completedFunctionsCount: number;
    protectedFiles: string[];
  };
}

export interface PostCheckResult {
  status: 'PASS' | 'WARN' | 'VIOLATIONS' | 'ERROR';
  message: string;
  timestamp: string;
  summary: {
    totalFilesModified: number;
    totalLinesChanged: number;
    violationsCount: number;
    criticalViolations: number;
    highViolations: number;
    mediumViolations: number;
  };
  violations: ComplianceViolation[];
  modifiedFiles: string[];
  requiredAction: string;
  fixes?: FixSuggestion[];
}

export interface FixSuggestion {
  violation: string;
  action: string;
  description: string;
  command?: string;
  suggestion?: string;
}

export type ComplianceStatus = 'idle' | 'checking' | 'pass' | 'warn' | 'violations' | 'blocked' | 'disabled';

export interface AISession {
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  taskDescription: string;
  filesModified: string[];
  preCheckResult?: PreCheckResult;
  postCheckResult?: PostCheckResult;
  status: ComplianceStatus;
  duration?: number; // in seconds
}

export interface SessionHistory {
  sessions: AISession[];
  currentSession?: AISession;
}

export interface ComplianceState {
  status: ComplianceStatus;
  lastPreCheck?: PreCheckResult;
  lastPostCheck?: PostCheckResult;
  isAIWorking: boolean;
  modifiedFiles: Set<string>;
  currentSession?: AISession;
  sessionHistory: AISession[];
}

