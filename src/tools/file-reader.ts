import * as fs from 'fs';

export interface ReadOptions {
  path: string;
  offset?: number;
  limit?: number;
  encoding?: BufferEncoding;
}

export interface ReadResult {
  path: string;
  content: string;
  lines: {
    start: number;
    end: number;
    total: number;
  };
  size: number;
  truncated: boolean;
  budgetUsed: number;
}

export class FileReader {
  private readonly DEFAULT_CHUNK_SIZE = 1000;
  private readonly MAX_FILE_SIZE = 1024 * 1024;
  private readonly MAX_LINES = 10000;

  read(options: ReadOptions): ReadResult {
    const {
      path: filePath,
      offset = 0,
      limit = this.DEFAULT_CHUNK_SIZE,
      encoding = 'utf-8',
    } = options;

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const stats = fs.statSync(filePath);

    if (stats.size > this.MAX_FILE_SIZE) {
      throw new Error(`File too large: ${stats.size} bytes (max: ${this.MAX_FILE_SIZE} bytes)`);
    }

    const content = fs.readFileSync(filePath, { encoding });

    const allLines = content.split('\n');
    const totalLines = allLines.length;

    if (totalLines > this.MAX_LINES) {
      throw new Error(`File too long: ${totalLines} lines (max: ${this.MAX_LINES} lines)`);
    }

    const startLine = offset;
    const endLine = Math.min(offset + limit, totalLines);
    const selectedLines = allLines.slice(offset, endLine);
    const slicedContent = selectedLines.join('\n');

    const budgetUsed = this.estimateTokenBudget(slicedContent);

    return {
      path: filePath,
      content: slicedContent,
      lines: {
        start: startLine + 1,
        end: endLine,
        total: totalLines,
      },
      size: Buffer.byteLength(slicedContent, encoding),
      truncated: endLine < totalLines,
      budgetUsed,
    };
  }

  readSafe(path: string, offset = 0, limit = 500): ReadResult {
    return this.read({ path, offset, limit });
  }

  private estimateTokenBudget(content: string): number {
    return Math.ceil(content.length / 4);
  }

  canRead(path: string): boolean {
    if (!fs.existsSync(path)) return false;

    const stats = fs.statSync(path);
    return stats.size <= this.MAX_FILE_SIZE;
  }

  getFileInfo(path: string): { size: number; lines: number; exists: boolean } {
    if (!fs.existsSync(path)) {
      return { size: 0, lines: 0, exists: false };
    }

    const stats = fs.statSync(path);
    const content = fs.readFileSync(path, 'utf-8');
    const lines = content.split('\n').length;

    return { size: stats.size, lines, exists: true };
  }
}
