import * as fs from 'fs';
import * as path from 'path';
import { DirectoryNode } from './types.js';

export interface TreeOptions {
  path: string;
  maxDepth?: number;
  showHidden?: boolean;
  exclude?: string[];
}

export class FileTree {
  private readonly MAX_DEPTH = 10;
  private readonly DEFAULT_EXCLUDE = [
    'node_modules',
    '.git',
    'dist',
    'build',
    '.cache',
    '__pycache__',
  ];

  build(options: TreeOptions): DirectoryNode {
    const {
      path: rootPath,
      maxDepth = this.MAX_DEPTH,
      showHidden = false,
      exclude = this.DEFAULT_EXCLUDE,
    } = options;

    if (!fs.existsSync(rootPath)) {
      throw new Error(`Path not found: ${rootPath}`);
    }

    const stats = fs.statSync(rootPath);
    if (!stats.isDirectory()) {
      return {
        name: path.basename(rootPath),
        path: rootPath,
        type: 'file',
        size: stats.size,
      };
    }

    return this.buildTree(rootPath, rootPath, 0, maxDepth, new Set(exclude), showHidden);
  }

  private buildTree(
    rootPath: string,
    currentPath: string,
    currentDepth: number,
    maxDepth: number,
    excludeSet: Set<string>,
    showHidden: boolean
  ): DirectoryNode {
    const name = path.basename(currentPath);
    const entries = fs.readdirSync(currentPath);

    const children: DirectoryNode[] = [];
    let fileCount = 0;
    let dirCount = 0;

    for (const entry of entries) {
      if (!showHidden && entry.startsWith('.')) continue;
      if (excludeSet.has(entry)) continue;

      const entryPath = path.join(currentPath, entry);
      const stats = fs.statSync(entryPath);

      if (stats.isDirectory()) {
        if (currentDepth < maxDepth) {
          const child = this.buildTree(
            rootPath,
            entryPath,
            currentDepth + 1,
            maxDepth,
            excludeSet,
            showHidden
          );
          if (child) {
            children.push(child);
            dirCount++;
          }
        }
      } else {
        children.push({
          name: entry,
          path: path.relative(rootPath, entryPath),
          type: 'file',
          size: stats.size,
        });
        fileCount++;
      }
    }

    children.sort((a, b) => {
      if (a.type === 'directory' && b.type !== 'directory') return -1;
      if (a.type !== 'directory' && b.type === 'directory') return 1;
      return a.name.localeCompare(b.name);
    });

    const stats = fs.statSync(currentPath);

    return {
      name,
      path: path.relative(rootPath, currentPath),
      type: 'directory',
      children: children.length > 0 ? children : undefined,
      size: stats.size,
    };
  }

  toString(tree: DirectoryNode, indent = '  ', prefix = ''): string {
    const lines: string[] = [];
    const items = tree.children || [];

    items.forEach((item, index) => {
      const isLast = index === items.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      const newPrefix = prefix + (isLast ? '    ' : '│   ');

      if (item.type === 'file') {
        lines.push(`${prefix}${connector}${item.name}`);
      } else {
        lines.push(`${prefix}${connector}${item.name}/`);
        if (item.children && item.children.length > 0) {
          lines.push(this.toString(item as DirectoryNode, indent, newPrefix));
        }
      }
    });

    return lines.join('\n');
  }

  render(options: TreeOptions): string {
    const tree = this.build(options);

    if (tree.type === 'file') {
      return tree.name;
    }

    const lines = [`${path.basename(options.path)}/`];

    if (tree.children) {
      for (let i = 0; i < tree.children.length; i++) {
        const child = tree.children[i]!;
        const isLast = i === tree.children.length - 1;
        const prefix = isLast ? '└── ' : '├── ';

        if (child.type === 'file') {
          lines.push(prefix + child.name);
        } else {
          lines.push(prefix + child.name + '/');
          if (child.children) {
            const childLines = this.renderChildTree(child, isLast ? '    ' : '│   ');
            lines.push(...childLines);
          }
        }
      }
    }

    return lines.join('\n');
  }

  private renderChildTree(tree: DirectoryNode, indent: string): string[] {
    const lines: string[] = [];
    const items = tree.children || [];

    items.forEach((item, index) => {
      const isLast = index === items.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      const newIndent = indent + (isLast ? '    ' : '│   ');

      if (item.type === 'file') {
        lines.push(indent + connector + item.name);
      } else {
        lines.push(indent + connector + item.name + '/');
        if (item.children && item.children.length > 0) {
          lines.push(...this.renderChildTree(item as DirectoryNode, newIndent));
        }
      }
    });

    return lines;
  }

  getFileCount(tree: DirectoryNode): number {
    let count = 0;
    const countRecursive = (node: DirectoryNode): void => {
      if (node.type === 'file') {
        count++;
      } else if (node.children) {
        node.children.forEach(countRecursive);
      }
    };
    countRecursive(tree);
    return count;
  }

  getDirectoryCount(tree: DirectoryNode): number {
    let count = 0;
    const countRecursive = (node: DirectoryNode): void => {
      if (node.type === 'directory') {
        count++;
        if (node.children) {
          node.children.forEach(countRecursive);
        }
      }
    };
    countRecursive(tree);
    return count;
  }

  getStats(tree: DirectoryNode): { files: number; directories: number; size: number } {
    let files = 0;
    let directories = 0;
    let totalSize = 0;

    const statsRecursive = (node: DirectoryNode): void => {
      if (node.type === 'file') {
        files++;
        totalSize += node.size || 0;
      } else {
        directories++;
        if (node.size) totalSize += node.size;
        if (node.children) {
          node.children.forEach(statsRecursive);
        }
      }
    };

    statsRecursive(tree);
    return { files, directories, size: totalSize };
  }
}
