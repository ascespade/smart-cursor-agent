/**
 * Progress tracker for execution monitoring
 */

import { AgentStatus, ProgressInfo, LogEntry } from '../../types/ui';
import { Logger } from '../../utils/logger';

export interface ProgressUpdate {
  agentId: string;
  errorsFixed: number;
  filesModified: number;
  currentTask: string;
  status: 'idle' | 'working' | 'completed' | 'error';
}

export class ProgressTracker {
  private agents: Map<string, AgentStatus> = new Map();
  private logs: LogEntry[] = [];
  private startTime: Date | null = null;
  private totalErrors: number = 0;
  private errorsFixed: number = 0;

  constructor(private logger: Logger) {}

  /**
   * Initialize tracking
   */
  initialize(totalErrors: number, agentIds: string[]): void {
    this.startTime = new Date();
    this.totalErrors = totalErrors;
    this.errorsFixed = 0;

    agentIds.forEach(id => {
      this.agents.set(id, {
        id,
        name: `Agent ${id}`,
        model: 'Unknown',
        status: 'idle',
        progress: 0,
        currentTask: 'Initializing...',
        errorsFixed: 0,
        filesModified: 0
      });
    });

    this.addLog('info', 'Progress tracking initialized', {
      totalErrors,
      agents: agentIds.length
    });
  }

  /**
   * Update agent progress
   */
  updateAgent(update: ProgressUpdate): void {
    const agent = this.agents.get(update.agentId);
    if (!agent) {
      this.logger.warn(`Agent ${update.agentId} not found`);
      return;
    }

    agent.status = update.status;
    agent.currentTask = update.currentTask;
    agent.errorsFixed = update.errorsFixed;
    agent.filesModified = update.filesModified;

    // Calculate progress percentage
    if (this.totalErrors > 0) {
      agent.progress = Math.round((update.errorsFixed / this.totalErrors) * 100);
    }

    // Update total errors fixed
    this.errorsFixed = Array.from(this.agents.values())
      .reduce((sum, a) => sum + a.errorsFixed, 0);

    this.addLog('info', `Agent ${update.agentId}: ${update.currentTask}`, {
      agent: update.agentId,
      errorsFixed: update.errorsFixed,
      filesModified: update.filesModified
    });
  }

  /**
   * Get overall progress
   */
  getProgress(): ProgressInfo {
    const agents = Array.from(this.agents.values());
    const completedAgents = agents.filter(a => a.status === 'completed').length;

    // Calculate overall progress
    let overall = 0;
    if (this.totalErrors > 0) {
      overall = Math.round((this.errorsFixed / this.totalErrors) * 100);
    } else if (agents.length > 0) {
      overall = Math.round((completedAgents / agents.length) * 100);
    }

    // Calculate ETA
    const elapsed = this.startTime
      ? (Date.now() - this.startTime.getTime()) / 1000 / 60 // minutes
      : 0;

    const speed = elapsed > 0 ? this.errorsFixed / elapsed : 0; // errors per minute
    const remaining = this.totalErrors - this.errorsFixed;
    const eta = speed > 0 ? remaining / speed : 0; // minutes

    return {
      overall,
      eta: Math.round(eta),
      errorsRemaining: remaining,
      errorsFixed: this.errorsFixed,
      speed: Math.round(speed * 10) / 10
    };
  }

  /**
   * Get all agent statuses
   */
  getAgentStatuses(): AgentStatus[] {
    return Array.from(this.agents.values());
  }

  /**
   * Add log entry
   */
  addLog(
    level: 'info' | 'warning' | 'error' | 'success',
    message: string,
    metadata?: Record<string, any>
  ): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      metadata
    };

    this.logs.push(entry);

    // Keep only last 1000 logs
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000);
    }

    // Log to output channel
    switch (level) {
      case 'info':
        this.logger.info(message, metadata);
        break;
      case 'warning':
        this.logger.warn(message, metadata);
        break;
      case 'error':
        this.logger.error(message, undefined, metadata);
        break;
      case 'success':
        this.logger.success(message, metadata);
        break;
    }
  }

  /**
   * Get logs
   */
  getLogs(limit?: number): LogEntry[] {
    if (limit) {
      return this.logs.slice(-limit);
    }
    return this.logs;
  }

  /**
   * Reset tracker
   */
  reset(): void {
    this.agents.clear();
    this.logs = [];
    this.startTime = null;
    this.totalErrors = 0;
    this.errorsFixed = 0;
  }
}

