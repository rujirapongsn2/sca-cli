import * as fs from 'fs';
import * as path from 'path';
import { SearchResult } from './types.js';

export interface GrepOptions {
  pattern: string;
  path?: string;
  extensions?: string[];
  ignoreCase?: boolean;
  useRegex?: boolean;
  maxResults?: number;
}

export class FileGrep {
  private readonly MAX_DEPTH = 10;
  private readonly MAX_FILES = 1000;

  search(options: GrepOptions): SearchResult[] {
    const {
      pattern,
      path: searchPath = process.cwd(),
      extensions = [],
      ignoreCase = false,
      useRegex = true,
      maxResults = 500,
    } = options;

    const results: SearchResult[] = [];
    const regex = this.createRegex(pattern, useRegex, ignoreCase);

    this.searchDirectory(searchPath, regex, extensions, results, 0, searchPath);

    return results.slice(0, maxResults);
  }

  private createRegex(pattern: string, useRegex: boolean, ignoreCase: boolean): RegExp {
    const flags = ignoreCase ? 'i' : '';
    if (useRegex) {
      return new RegExp(pattern, flags);
    }
    return new RegExp(this.escapeRegex(pattern), flags);
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private searchDirectory(
    dirPath: string,
    regex: RegExp,
    extensions: string[],
    results: SearchResult[],
    depth: number,
    rootPath: string
  ): void {
    if (depth > this.MAX_DEPTH) return;
    if (results.length >= this.MAX_FILES) return;

    let entries: string[];

    try {
      entries = fs.readdirSync(dirPath);
    } catch {
      return;
    }

    for (const entry of entries) {
      if (
        entry.startsWith('.') ||
        entry === 'node_modules' ||
        entry === 'dist' ||
        entry === 'build'
      ) {
        continue;
      }

      const entryPath = path.join(dirPath, entry);

      try {
        const stats = fs.statSync(entryPath);

        if (stats.isDirectory()) {
          this.searchDirectory(entryPath, regex, extensions, results, depth + 1, rootPath);
        } else if (stats.isFile()) {
          if (this.shouldSearchFile(entry, extensions)) {
            this.searchFile(entryPath, regex, results, rootPath);
          }
        }
      } catch {
        continue;
      }
    }
  }

  private shouldSearchFile(fileName: string, extensions: string[]): boolean {
    if (extensions.length === 0) return true;

    const ext = path.extname(fileName).toLowerCase();
    return extensions.includes(ext);
  }

  private searchFile(
    filePath: string,
    regex: RegExp,
    results: SearchResult[],
    rootPath: string
  ): void {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line && regex.test(line)) {
          const relativePath = path.relative(rootPath, filePath);
          const match = line.match(regex)?.[0] || line;

          results.push({
            file: relativePath,
            line: i + 1,
            content: line.trim(),
            match,
          });
        }
      }
    } catch {}
  }

  findFunctionDefinitions(searchPath: string, functionName: string): SearchResult[] {
    const pattern = `function\\s+${this.escapeRegex(functionName)}|const\\s+${this.escapeRegex(functionName)}\\s*=|def\\s+${this.escapeRegex(functionName)}`;

    return this.search({
      pattern,
      path: searchPath,
      extensions: ['.ts', '.js', '.py', '.go', '.java'],
      useRegex: true,
    });
  }

  findImportStatements(searchPath: string, moduleName: string): SearchResult[] {
    const pattern = `import.*from.*['"]${this.escapeRegex(moduleName)}['"]|require\\(['"]${this.escapeRegex(moduleName)}['"]\\)`;

    return this.search({
      pattern,
      path: searchPath,
      useRegex: true,
    });
  }

  getContext(result: SearchResult, content: string, contextLines = 2): string {
    const lines = content.split('\n');
    const start = Math.max(0, result.line - contextLines - 1);
    const end = Math.min(lines.length, result.line + contextLines);

    return lines.slice(start, end).join('\n');
  }
}
