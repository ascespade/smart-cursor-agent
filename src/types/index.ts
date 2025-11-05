/**
 * Core type definitions for Cursor Smart Agent Extension
 */

export interface ProjectAnalysis {
  errors: {
    typescript: number;
    eslint: number;
    warnings: number;
    total: number;
    breakdown: ErrorBreakdown[];
  };
  size: {
    files: number;
    linesOfCode: number;
    testFiles: number;
  };
  dependencies: {
    total: number;
    dev: number;
    prod: number;
    outdated: number;
  };
  complexity: ComplexityLevel;
  errorDensity: number;
  timestamp: Date;
  projectType: ProjectType;
}

export type ComplexityLevel = 'low' | 'medium' | 'high' | 'very-high';
export type ProjectType = 'production' | 'development' | 'experimental' | 'learning';

export interface ErrorBreakdown {
  type: string;
  count: number;
  severity: 'critical' | 'error' | 'warning';
  files: string[];
}

export interface AgentRecommendation {
  total: number;
  perModel: number;
  models: ModelConfig[];
  strategy: ExecutionStrategy;
  estimatedTime: number;
  estimatedCost: number;
  reasoning: string[];
  confidence: number;
}

export interface ModelConfig {
  name: 'ChatGPT' | 'Claude' | 'DeepSeek' | 'Gemini';
  agents: number;
  tasks: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  branch: string;
}

export interface ExecutionStrategy {
  type: 'sequential' | 'parallel' | 'hybrid';
  phases: Phase[];
  conflictResolution: 'manual' | 'auto';
}

export interface Phase {
  name: string;
  models: string[];
  agents: number;
  estimatedTime: number;
  dependencies: string[];
}

export interface ModeConfig {
  name: string;
  enabled: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settings: Record<string, any>;
}

export interface UserHistory {
  projects: ProjectSession[];
  preferences: UserPreferences;
  learning: LearningData;
}

export interface ProjectSession {
  path: string;
  analyzed: Date;
  errors: { before: number; after: number };
  strategy: AgentRecommendation;
  duration: number;
  cost: number;
  success: boolean;
  userModifications: string[];
}

export interface UserPreferences {
  defaultMode: string;
  preferredAgentCount: number;
  preferredModels: string[];
  autoAnalyze: boolean;
  nonStopEnabled: boolean;
}

export interface LearningData {
  patterns: Record<string, string>;
  weights: Record<string, number>;
  successRates: Record<string, number>;
}

export interface FileChange {
  path: string;
  type: 'added' | 'modified' | 'deleted';
  linesChanged: number;
}

export interface ConflictInfo {
  file: string;
  type: 'merge' | 'rebase';
  severity: 'low' | 'medium' | 'high';
}

export interface SecurityIssue {
  type: 'secret' | 'sql-injection' | 'xss' | 'dangerous' | 'dependency';
  severity: 'critical' | 'high' | 'medium' | 'low';
  file: string;
  line: number;
  description: string;
  remediation: string;
}

export interface SecurityReport {
  issues: SecurityIssue[];
  score: number;
  timestamp: Date;
  passed: boolean;
}

