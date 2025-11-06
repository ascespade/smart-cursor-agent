/**
 * Main project analyzer
 */

import { ErrorCounter } from './errorCounter';
import { ComplexityCalculator } from './complexityCalculator';
import { ErrorDetailsCollector } from './errorDetails';
import { getWorkspaceRoot, readJsonFile } from '../../utils/helpers';
import * as fs from 'fs';
import * as path from 'path';
import fg from 'fast-glob';
import { ProjectAnalysis, ProjectType } from '../../types';

export class ProjectAnalyzer {
  private workspaceRoot: string;

  constructor() {
    const root = getWorkspaceRoot();
    if (!root) {
      throw new Error('No workspace folder open');
    }
    this.workspaceRoot = root;
  }

  /**
   * Analyze the entire project
   */
  async analyze(): Promise<ProjectAnalysis> {
    // Run all analyzers in parallel
    const [errors, complexity, size, dependencies, projectType] = await Promise.all([
      this.analyzeErrors(),
      this.analyzeComplexity(),
      this.analyzeSize(),
      this.analyzeDependencies(),
      this.determineProjectType()
    ]);

      const errorDensity = size.linesOfCode > 0
      ? (errors.total / size.linesOfCode) * 1000
      : 0;

    // Collect detailed error information
    // Note: Error details collection is available but not currently used in analysis
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let _errorDetails = null;
    try {
      const detailsCollector = new ErrorDetailsCollector();
      _errorDetails = await detailsCollector.collectDetails();
    } catch (error) {
      // If details collection fails, continue without details
      console.warn('Failed to collect error details:', error);
    }

    const analysis: ProjectAnalysis = {
      errors,
      size,
      dependencies,
      complexity: complexity.level,
      errorDensity: Math.round(errorDensity * 100) / 100,
      timestamp: new Date(),
      projectType
    };

    // Log final analysis for debugging
    console.log('Final Project Analysis:', JSON.stringify({
      errors: {
        typescript: analysis.errors.typescript,
        eslint: analysis.errors.eslint,
        warnings: analysis.errors.warnings,
        total: analysis.errors.total
      },
      size: analysis.size,
      complexity: analysis.complexity,
      errorDensity: analysis.errorDensity,
      projectType: analysis.projectType
    }, null, 2));

    return analysis;
  }

  /**
   * Analyze errors
   */
  private async analyzeErrors() {
    const counter = new ErrorCounter();
    return counter.countErrors();
  }

  /**
   * Analyze complexity
   */
  private async analyzeComplexity() {
    const calculator = new ComplexityCalculator();
    return calculator.calculate();
  }

  /**
   * Analyze project size
   */
  private async analyzeSize(): Promise<{ files: number; linesOfCode: number; testFiles: number }> {
    const patterns = [
      '**/*.ts',
      '**/*.tsx',
      '**/*.js',
      '**/*.jsx'
    ];

    const ignore = [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.git/**',
      '**/coverage/**'
    ];

    try {
      const files = await fg(patterns, {
        cwd: this.workspaceRoot,
        ignore,
        absolute: true
      });

      let totalLines = 0;
      let testFiles = 0;

      for (const file of files) {
        try {
          const content = fs.readFileSync(file, 'utf-8');
          const lines = content.split('\n').length;
          totalLines += lines;

          if (file.includes('.test.') || file.includes('.spec.') || file.includes('__tests__')) {
            testFiles++;
          }
        } catch (error) {
          // Skip files that can't be read
          continue;
        }
      }

      return {
        files: files.length,
        linesOfCode: totalLines,
        testFiles
      };
    } catch (error) {
      return {
        files: 0,
        linesOfCode: 0,
        testFiles: 0
      };
    }
  }

  /**
   * Analyze dependencies
   */
  private async analyzeDependencies(): Promise<{
    total: number;
    dev: number;
    prod: number;
    outdated: number;
  }> {
    const packageJsonPath = path.join(this.workspaceRoot, 'package.json');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const packageJson = readJsonFile<any>(packageJsonPath);

    if (!packageJson) {
      return {
        total: 0,
        dev: 0,
        prod: 0,
        outdated: 0
      };
    }

    const dependencies = Object.keys(packageJson.dependencies || {}).length;
    const devDependencies = Object.keys(packageJson.devDependencies || {}).length;

    return {
      total: dependencies + devDependencies,
      prod: dependencies,
      dev: devDependencies,
      outdated: 0 // Would require npm outdated check
    };
  }

  /**
   * Determine project type
   */
  private async determineProjectType(): Promise<ProjectType> {
    const packageJsonPath = path.join(this.workspaceRoot, 'package.json');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const packageJson = readJsonFile<any>(packageJsonPath);

    if (!packageJson) {
      return 'learning';
    }

    // Check for production indicators
    const hasProductionScripts = packageJson.scripts && (
      packageJson.scripts.build ||
      packageJson.scripts.start ||
      packageJson.scripts.deploy
    );

    const hasTests = fs.existsSync(path.join(this.workspaceRoot, 'test')) ||
                     fs.existsSync(path.join(this.workspaceRoot, 'tests')) ||
                     fs.existsSync(path.join(this.workspaceRoot, '__tests__'));

    const hasCI = fs.existsSync(path.join(this.workspaceRoot, '.github')) ||
                  fs.existsSync(path.join(this.workspaceRoot, '.gitlab-ci.yml')) ||
                  fs.existsSync(path.join(this.workspaceRoot, 'circleci'));

    if (hasProductionScripts && hasTests && hasCI) {
      return 'production';
    } else if (hasProductionScripts) {
      return 'development';
    } else {
      return 'experimental';
    }
  }
}

