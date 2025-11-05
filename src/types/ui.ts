/**
 * Type definitions for UI components
 */

export interface DashboardData {
  agents: AgentStatus[];
  progress: ProgressInfo;
  logs: LogEntry[];
  errors: ErrorBreakdown;
  metrics: Metrics;
}

export interface AgentStatus {
  id: string;
  name: string;
  model: string;
  status: 'idle' | 'working' | 'completed' | 'error';
  progress: number;
  currentTask: string;
  errorsFixed: number;
  filesModified: number;
}

export interface ProgressInfo {
  overall: number;
  eta: number;
  errorsRemaining: number;
  errorsFixed: number;
  speed: number; // errors per minute
}

export interface LogEntry {
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  agent?: string;
  metadata?: Record<string, any>;
}

export interface Metrics {
  cost: number;
  time: number;
  efficiency: number;
  quality: number;
}

export interface ErrorBreakdown {
  typescript: number;
  eslint: number;
  warnings: number;
  byFile: Record<string, number>;
  byType: Record<string, number>;
}

