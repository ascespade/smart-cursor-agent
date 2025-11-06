/**
 * Error grouper - builds tree structure from error breakdown
 */

import { ErrorBreakdown } from '../../types';

export interface ErrorNode {
  type: 'folder' | 'file';
  name: string;
  path: string;
  count: number;
  children?: ErrorNode[];
  errors?: ErrorDetail[];
}

export interface ErrorDetail {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning' | 'critical';
  rule?: string;
  type: string;
}

export class ErrorGrouper {
  /**
   * Group errors by directory structure
   */
  groupByDirectory(breakdown: ErrorBreakdown[]): ErrorNode {
    const root: ErrorNode = {
      type: 'folder',
      name: 'Project Root',
      path: '/',
      count: 0,
      children: []
    };

    // Process each error type
    breakdown.forEach(error => {
      error.files.forEach(filePath => {
        this.addToTree(root, filePath, error);
      });
    });

    // Calculate total counts
    this.calculateCounts(root);

    // Sort tree by count (descending)
    this.sortTree(root);

    return root;
  }

  /**
   * Add file path to tree
   */
  private addToTree(node: ErrorNode, filePath: string, error: ErrorBreakdown): void {
    // Clean path: remove leading ./ or /
    const cleanPath = filePath.replace(/^\.\//, '').replace(/^\//, '');
    const parts = cleanPath.split('/');

    this.addPath(node, parts, error);
  }

  /**
   * Add path parts recursively to tree
   */
  private addPath(node: ErrorNode, parts: string[], error: ErrorBreakdown): void {
    if (parts.length === 0) return;

    const [current, ...rest] = parts;

    // Last part = file
    if (rest.length === 0) {
      let fileNode = node.children?.find(c => c.name === current && c.type === 'file');

      if (!fileNode) {
        fileNode = {
          type: 'file',
          name: current,
          path: node.path + current,
          count: 0,
          errors: []
        };

        if (!node.children) node.children = [];
        node.children.push(fileNode);
      }

      // Add errors to file
      for (let i = 0; i < error.count; i++) {
        fileNode.errors!.push({
          line: 0, // Can be extracted from deeper analysis
          column: 0,
          message: error.type,
          severity: error.severity,
          type: error.type,
          rule: error.type
        });
      }

      return;
    }

    // Folder
    let folderNode = node.children?.find(c => c.name === current && c.type === 'folder');

    if (!folderNode) {
      folderNode = {
        type: 'folder',
        name: current,
        path: node.path + current + '/',
        count: 0,
        children: []
      };

      if (!node.children) node.children = [];
      node.children.push(folderNode);
    }

    // Continue recursively
    this.addPath(folderNode, rest, error);
  }

  /**
   * Calculate total counts for each node
   */
  private calculateCounts(node: ErrorNode): number {
    if (node.type === 'file') {
      node.count = node.errors?.length || 0;
      return node.count;
    }

    // Folder: sum of all children
    node.count = 0;
    if (node.children) {
      for (const child of node.children) {
        node.count += this.calculateCounts(child);
      }
    }

    return node.count;
  }

  /**
   * Sort tree by error count (descending)
   */
  private sortTree(node: ErrorNode): void {
    if (!node.children || node.children.length === 0) return;

    // Sort children
    node.children.sort((a, b) => {
      // Folders first
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }

      // Then by count (descending)
      return b.count - a.count;
    });

    // Sort children recursively
    for (const child of node.children) {
      this.sortTree(child);
    }
  }

  /**
   * Flatten tree to array (for searching)
   */
  flatten(node: ErrorNode, result: ErrorNode[] = []): ErrorNode[] {
    result.push(node);

    if (node.children) {
      for (const child of node.children) {
        this.flatten(child, result);
      }
    }

    return result;
  }

  /**
   * Search tree
   */
  search(node: ErrorNode, query: string): ErrorNode[] {
    const flat = this.flatten(node);
    const lowerQuery = query.toLowerCase();

    return flat.filter(n =>
      n.name.toLowerCase().includes(lowerQuery) ||
      n.path.toLowerCase().includes(lowerQuery)
    );
  }
}

