export interface FileInfo {
  path: string;
  content: string;
  size: number;
  lines: number;
  extension: string;
}

export interface DirectoryNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: DirectoryNode[];
  size?: number;
}

export interface SearchResult {
  file: string;
  line: number;
  content: string;
  match: string;
}

export interface RepoInfo {
  root: string;
  structure: DirectoryNode;
  fileCount: number;
  languageStats: Record<string, number>;
  techStack: string[];
  entryPoints: string[];
}

export interface Patch {
  originalContent: string;
  patchedContent: string;
  diff: string;
  filePath: string;
  hunks: Hunk[];
}

export interface Hunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: string[];
}

export interface ExecResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
}

export interface GitStatus {
  modified: string[];
  staged: string[];
  untracked: string[];
  branch: string;
  ahead: number;
  behind: number;
}

export interface ToolMetadata {
  name: string;
  risk_level: 'read' | 'write' | 'exec' | 'network';
  description: string;
  parameters: Record<string, unknown>;
}

export const TOOL_REGISTRY: Record<string, ToolMetadata> = {
  scan_repo: {
    name: 'scan_repo',
    risk_level: 'read',
    description: 'Scan repository and return structure overview',
    parameters: { path: 'optional path to scan' },
  },
  read_file: {
    name: 'read_file',
    risk_level: 'read',
    description: 'Read file content with optional line range',
    parameters: { path: 'file path', offset: 'optional line offset', limit: 'optional line limit' },
  },
  search_files: {
    name: 'search_files',
    risk_level: 'read',
    description: 'Search for pattern in files',
    parameters: {
      pattern: 'regex pattern',
      path: 'optional search path',
      extensions: 'optional file extensions',
    },
  },
  generate_diff: {
    name: 'generate_diff',
    risk_level: 'read',
    description: 'Generate unified diff from original to patched content',
    parameters: { original: 'original file path', patched: 'patched file path' },
  },
  apply_patch: {
    name: 'apply_patch',
    risk_level: 'write',
    description: 'Apply unified diff patch to file',
    parameters: { filePath: 'target file path', patch: 'patch content' },
  },
  safe_edit: {
    name: 'safe_edit',
    risk_level: 'write',
    description: 'Safely edit file with line range validation',
    parameters: {
      path: 'file path',
      startLine: 'start line',
      endLine: 'end line',
      newContent: 'new content',
    },
  },
  execute_command: {
    name: 'execute_command',
    risk_level: 'exec',
    description: 'Execute command with sandbox restrictions',
    parameters: {
      command: 'command to execute',
      args: 'command arguments',
      timeout: 'optional timeout ms',
    },
  },
  git_status: {
    name: 'git_status',
    risk_level: 'read',
    description: 'Show git working tree status',
    parameters: {},
  },
  git_diff: {
    name: 'git_diff',
    risk_level: 'read',
    description: 'Show staged/unstaged changes',
    parameters: { staged: 'show staged changes only' },
  },
};
