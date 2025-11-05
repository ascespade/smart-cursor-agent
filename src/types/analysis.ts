/**
 * Type definitions for analysis components
 */

export interface AnalysisResult {
  success: boolean;
  data: any;
  errors: string[];
  warnings: string[];
  duration: number;
}

export interface ErrorPattern {
  regex: RegExp;
  type: string;
  severity: 'critical' | 'error' | 'warning';
}

export interface ComplexityMetrics {
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  maintainabilityIndex: number;
  technicalDebt: number;
}

export interface PatternMatch {
  pattern: string;
  file: string;
  line: number;
  context: string;
  confidence: number;
}

