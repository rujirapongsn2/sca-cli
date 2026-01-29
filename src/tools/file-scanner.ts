import * as fs from 'fs';
import * as path from 'path';
import { DirectoryNode, RepoInfo } from './types.js';

export class RepoScanner {
  private ignoredPatterns = [
    'node_modules',
    '.git',
    'dist',
    'build',
    '.cache',
    'coverage',
    '*.log',
    '.env',
    '__pycache__',
    '.next',
    'out',
  ];

  private languageExtensions: Record<string, string[]> = {
    TypeScript: ['.ts', '.tsx'],
    JavaScript: ['.js', '.jsx'],
    Python: ['.py'],
    Go: ['.go'],
    Rust: ['.rs'],
    Java: ['.java'],
    C: ['.c', '.h'],
    Cpp: ['.cpp', '.hpp', '.cc', '.cxx'],
    Ruby: ['.rb'],
    PHP: ['.php'],
    HTML: ['.html', '.htm'],
    CSS: ['.css', '.scss', '.sass'],
    JSON: ['.json'],
    YAML: ['.yaml', '.yml'],
    Markdown: ['.md', '.markdown'],
    SQL: ['.sql'],
  };

  private entryPointPatterns = [
    'package.json',
    'pyproject.toml',
    'requirements.txt',
    'go.mod',
    'Cargo.toml',
    'pom.xml',
    'build.gradle',
    'tsconfig.json',
    'next.config.js',
    'vite.config.ts',
    'index.ts',
    'index.js',
    'main.ts',
    'main.py',
    'app.py',
    'main.go',
  ];

  scan(rootPath: string): RepoInfo {
    const structure = this.buildTree(rootPath, rootPath);
    const languageStats = this.countLanguages(rootPath);
    const entryPoints = this.findEntryPoints(rootPath);
    const techStack = this.detectTechStack(languageStats, rootPath);

    return {
      root: rootPath,
      structure,
      fileCount: this.countFiles(structure),
      languageStats,
      techStack,
      entryPoints,
    };
  }

  private buildTree(rootPath: string, currentPath: string): DirectoryNode {
    const name = path.basename(currentPath);
    const stats = fs.statSync(currentPath);

    if (!stats.isDirectory()) {
      return {
        name,
        path: currentPath.replace(rootPath, ''),
        type: 'file',
        size: stats.size,
      };
    }

    const children: DirectoryNode[] = [];
    const entries = fs.readdirSync(currentPath);

    for (const entry of entries) {
      if (this.shouldIgnore(entry)) continue;

      const entryPath = path.join(currentPath, entry);
      children.push(this.buildTree(rootPath, entryPath));
    }

    children.sort((a, b) => {
      if (a.type === 'directory' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'directory') return 1;
      return a.name.localeCompare(b.name);
    });

    return {
      name,
      path: currentPath.replace(rootPath, ''),
      type: 'directory',
      children,
    };
  }

  private shouldIgnore(name: string): boolean {
    for (const pattern of this.ignoredPatterns) {
      if (pattern.startsWith('*')) {
        if (name.endsWith(pattern.slice(1))) return true;
      } else if (pattern.startsWith('.')) {
        if (name.startsWith(pattern)) return true;
      } else if (name === pattern) return true;
    }
    return false;
  }

  private countLanguages(rootPath: string): Record<string, number> {
    const counts: Record<string, number> = {};

    const countInDir = (dirPath: string): void => {
      const entries = fs.readdirSync(dirPath);

      for (const entry of entries) {
        if (this.shouldIgnore(entry)) continue;

        const entryPath = path.join(dirPath, entry);
        const stats = fs.statSync(entryPath);

        if (stats.isDirectory()) {
          countInDir(entryPath);
        } else {
          const ext = path.extname(entry).toLowerCase();

          for (const [lang, extensions] of Object.entries(this.languageExtensions)) {
            if (extensions.includes(ext)) {
              counts[lang] = (counts[lang] || 0) + 1;
              break;
            }
          }
        }
      }
    };

    countInDir(rootPath);
    return counts;
  }

  private countFiles(node: DirectoryNode): number {
    if (node.type === 'file') return 1;

    return node.children?.reduce((sum, child) => sum + this.countFiles(child), 0) || 0;
  }

  private findEntryPoints(rootPath: string): string[] {
    const found: string[] = [];

    for (const pattern of this.entryPointPatterns) {
      const files = this.findFiles(rootPath, pattern);
      found.push(...files);
    }

    return [...new Set(found)];
  }

  private findFiles(rootPath: string, pattern: string): string[] {
    const found: string[] = [];

    const searchInDir = (dirPath: string): void => {
      const entries = fs.readdirSync(dirPath);

      for (const entry of entries) {
        if (this.shouldIgnore(entry)) continue;

        const entryPath = path.join(dirPath, entry);
        const stats = fs.statSync(entryPath);

        if (stats.isDirectory()) {
          searchInDir(entryPath);
        } else if (entry === pattern) {
          found.push(entryPath.replace(rootPath, ''));
        }
      }
    };

    searchInDir(rootPath);
    return found;
  }

  private detectTechStack(languageStats: Record<string, number>, rootPath: string): string[] {
    const stack: string[] = [];

    const topLanguages = Object.entries(languageStats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    for (const [lang] of topLanguages) {
      if ((languageStats[lang] ?? 0) > 0) stack.push(lang);
    }

    const configFiles = fs
      .readdirSync(rootPath)
      .filter((f) =>
        [
          'package.json',
          'pyproject.toml',
          'go.mod',
          'Cargo.toml',
          'pom.xml',
          'tsconfig.json',
        ].includes(f)
      );

    for (const config of configFiles) {
      const name = config.replace(/\.(toml|json)$/, '');
      if (!stack.includes(name)) stack.push(name);
    }

    return stack;
  }

  getSummary(repoInfo: RepoInfo): string {
    const lines = [
      `Repository: ${repoInfo.root}`,
      `Files: ${repoInfo.fileCount}`,
      '',
      'Languages:',
    ];

    for (const [lang, count] of Object.entries(repoInfo.languageStats)) {
      lines.push(`  ${lang}: ${count} files`);
    }

    if (repoInfo.techStack.length > 0) {
      lines.push('', 'Tech Stack:', `  ${repoInfo.techStack.join(', ')}`);
    }

    if (repoInfo.entryPoints.length > 0) {
      lines.push('', 'Entry Points:');
      for (const entry of repoInfo.entryPoints.slice(0, 5)) {
        lines.push(`  ${entry}`);
      }
    }

    return lines.join('\n');
  }
}
