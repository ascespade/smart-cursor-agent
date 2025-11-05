/**
 * Helper utility functions
 */

import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';

/**
 * Get workspace root path
 */
export function getWorkspaceRoot(): string | undefined {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  return workspaceFolder?.uri.fsPath;
}

/**
 * Check if a file exists
 */
export function fileExists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

/**
 * Read a JSON file
 */
export function readJsonFile<T>(filePath: string): T | null {
  try {
    if (!fileExists(filePath)) {
      return null;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (error) {
    console.error(`Failed to read JSON file ${filePath}:`, error);
    return null;
  }
}

/**
 * Write a JSON file
 */
export function writeJsonFile<T>(filePath: string, data: T): boolean {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error(`Failed to write JSON file ${filePath}:`, error);
    return false;
  }
}

/**
 * Format time duration
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)} minutes`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (mins === 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  }
  return `${hours} hour${hours > 1 ? 's' : ''} ${mins} minute${mins > 1 ? 's' : ''}`;
}

/**
 * Format cost
 */
export function formatCost(cost: number): string {
  return `$${cost.toFixed(2)}`;
}

/**
 * Calculate percentage
 */
export function calculatePercentage(part: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
}

/**
 * Sleep/delay function
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get file extension
 */
export function getFileExtension(filePath: string): string {
  return path.extname(filePath).toLowerCase();
}

/**
 * Check if file is TypeScript
 */
export function isTypeScriptFile(filePath: string): boolean {
  const ext = getFileExtension(filePath);
  return ext === '.ts' || ext === '.tsx';
}

/**
 * Check if file is JavaScript
 */
export function isJavaScriptFile(filePath: string): boolean {
  const ext = getFileExtension(filePath);
  return ext === '.js' || ext === '.jsx';
}

/**
 * Sanitize filename
 */
export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
}

/**
 * Generate unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

/**
 * Merge two objects deeply
 */
export function deepMerge<T>(target: T, source: Partial<T>): T {
  const output = { ...target };
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      output[key] = deepMerge(output[key] as any, source[key] as any);
    } else {
      output[key] = source[key] as any;
    }
  }
  return output;
}

/**
 * Truncate string
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * Get relative path from workspace root
 */
export function getRelativePath(filePath: string): string {
  const root = getWorkspaceRoot();
  if (!root) return filePath;
  return path.relative(root, filePath);
}

