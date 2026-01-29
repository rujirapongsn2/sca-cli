import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface GitStatus {
  branch: string;
  modified: string[];
  staged: string[];
  untracked: string[];
  ahead: number;
  behind: number;
  clean: boolean;
}

export interface GitDiff {
  staged: string[];
  unstaged: string[];
  diff: string;
}

export interface CommitSuggestion {
  type: string;
  scope: string;
  subject: string;
  body: string;
  conventional: string;
}

export class GitTools {
  private cwd: string;

  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
  }

  getStatus(): GitStatus {
    if (!this.isGitRepo()) {
      throw new Error('Not a git repository');
    }

    const branch = this.getBranch();
    const modified = this.getModifiedFiles();
    const staged = this.getStagedFiles();
    const untracked = this.getUntrackedFiles();
    const { ahead, behind } = this.getAheadBehind();

    return {
      branch,
      modified,
      staged,
      untracked,
      ahead,
      behind,
      clean: modified.length === 0 && untracked.length === 0 && staged.length === 0,
    };
  }

  getDiff(_staged = false): GitDiff {
    if (!this.isGitRepo()) {
      throw new Error('Not a git repository');
    }

    const diffOutput = this.execGit(['diff']).stdout;

    return {
      staged: this.getStagedFiles(),
      unstaged: this.getModifiedFiles(),
      diff: diffOutput,
    };
  }

  getModifiedFiles(): string[] {
    try {
      const output = this.execGit(['diff', '--name-only']).stdout;
      return output.split('\n').filter((f) => f.length > 0);
    } catch {
      return [];
    }
  }

  getStagedFiles(): string[] {
    try {
      const output = this.execGit(['diff', '--cached', '--name-only']).stdout;
      return output.split('\n').filter((f) => f.length > 0);
    } catch {
      return [];
    }
  }

  getUntrackedFiles(): string[] {
    try {
      const output = this.execGit(['ls-files', '--others', '--exclude-standard']).stdout;
      return output.split('\n').filter((f) => f.length > 0);
    } catch {
      return [];
    }
  }

  getBranch(): string {
    try {
      const output = this.execGit(['rev-parse', '--abbrev-ref', 'HEAD']).stdout.trim();
      return output;
    } catch {
      return 'unknown';
    }
  }

  private getAheadBehind(): { ahead: number; behind: number } {
    try {
      const output = this.execGit(['rev-list', '--count', '--left-right', '@{upstream}...HEAD']).stdout.trim();
      const [behind, ahead] = output.split('\t');
      return { ahead: parseInt(ahead ?? '0', 10) || 0, behind: parseInt(behind ?? '0', 10) || 0 };
    } catch {
      return { ahead: 0, behind: 0 };
    }
  }

  getFileDiff(filePath: string): string {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const relativePath = path.relative(this.cwd, filePath);
    return this.execGit(['diff', relativePath]).stdout;
  }

  suggestCommitMessage(diff: string): CommitSuggestion {
    const changes = this.analyzeChanges(diff);

    const type = this.determineChangeType(changes);
    const scope = this.determineScope(changes);
    const subject = this.generateSubject(changes, type);

    const conventional = `${type}${scope ? `(${scope})` : ''}: ${subject}`;

    return {
      type,
      scope,
      subject,
      body: this.generateBody(changes),
      conventional,
    };
  }

  private analyzeChanges(diff: string): { files: string[]; additions: number; deletions: number } {
    const files = new Set<string>();
    let additions = 0;
    let deletions = 0;

    const lines = diff.split('\n');
    for (const line of lines) {
      if (line.startsWith('+++') || line.startsWith('---')) {
        const match = line.match(/\/[ab]\/(.+)/);
        if (match && match[1]) {
          files.add(match[1]);
        }
      }
      if (line.startsWith('+') && !line.startsWith('+++')) additions++;
      if (line.startsWith('-') && !line.startsWith('---')) deletions++;
    }

    return {
      files: Array.from(files),
      additions,
      deletions,
    };
  }

  private determineChangeType(changes: { files: string[] }): string {
    const hasTests = changes.files.some((f) => f.includes('test') || f.includes('spec'));
    const hasDocs = changes.files.some((f) => f.endsWith('.md') || f.endsWith('.txt'));
    const hasConfig = changes.files.some((f) => f.includes('config') || f.includes('.json') || f.includes('.yaml'));

    if (hasTests && !hasDocs && !hasConfig) return 'test';
    if (hasDocs && !hasTests) return 'docs';
    if (hasConfig) return 'chore';

    return 'feat';
  }

  private determineScope(changes: { files: string[] }): string {
    if (changes.files.length === 0) return '';

    const rootDirs = new Set<string>();
    for (const file of changes.files) {
      const parts = file.split('/');
      if (parts.length > 1 && parts[0] !== undefined) {
        rootDirs.add(parts[0]!);
      }
    }

    if (rootDirs.size === 1) {
      const firstDir = Array.from(rootDirs)[0];
      return firstDir ?? '';
    }

    return '';
  }

  private generateSubject(changes: { files: string[] }, _type: string): string {
    const action = 'update';

    if (changes.files.length === 0) {
      return `${action} changes`;
    }

    const fileNames = changes.files.slice(0, 3).map((f) => path.basename(f)).join(', ');

    if (changes.files.length > 3) {
      return `${action} ${fileNames} and ${changes.files.length - 3} more files`;
    }

    return `${action} ${fileNames}`;
  }

  private generateBody(changes: { additions: number; deletions: number }): string {
    const lines = [`- ${changes.additions} additions`, `- ${changes.deletions} deletions`];

    if (changes.additions > 100 || changes.deletions > 100) {
      lines.push('');
      lines.push('Large changes detected. Consider breaking into smaller commits.');
    }

    return lines.join('\n');
  }

  requireConfirmation(): boolean {
    return true;
  }

  private isGitRepo(): boolean {
    try {
      this.execGit(['rev-parse', '--git-dir']);
      return true;
    } catch {
      return false;
    }
  }

  private execGit(args: string[]): { stdout: string; stderr: string } {
    try {
      const result = execSync(`git ${args.join(' ')}`, {
        cwd: this.cwd,
        encoding: 'utf-8',
        maxBuffer: 1024 * 1024,
      });
      return { stdout: result, stderr: '' };
    } catch (error) {
      return { stdout: '', stderr: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}