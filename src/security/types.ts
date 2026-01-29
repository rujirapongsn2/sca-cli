export type RiskLevel = 'read' | 'write' | 'exec' | 'network';
export type ConfirmationMode = 'none' | 'once' | 'always';

export interface ToolMetadata {
  name: string;
  risk_level: RiskLevel;
  description: string;
  parameters: Record<string, ParameterMetadata>;
  scope: ToolScope;
  confirmation: ConfirmationMode;
}

export interface ParameterMetadata {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  description?: string;
  sensitive?: boolean;
}

export interface ToolScope {
  path_allowlist?: string[];
  path_denylist?: string[];
  command_allowlist?: string[];
  command_denylist?: string[];
  max_file_size?: number;
  max_output_size?: number;
}

export interface PolicyCheck {
  allowed: boolean;
  reason?: string;
  suggestions?: string[];
}

export interface PolicyConfig {
  default_confirmation: ConfirmationMode;
  deny_network: boolean;
  max_file_size: number;
  max_output_size: number;
  path_allowlist: string[];
  path_denylist: string[];
  command_allowlist: string[];
  command_denylist: string[];
  secret_patterns: string[];
  pii_patterns: string[];
}

export const DEFAULT_POLICY: PolicyConfig = {
  default_confirmation: 'once',
  deny_network: true,
  max_file_size: 1024 * 1024,
  max_output_size: 1024 * 1024,
  path_allowlist: [],
  path_denylist: ['.env', 'secrets/', 'credentials/', '.ssh/', '.aws/'],
  command_allowlist: ['echo', 'ls', 'cat', 'grep', 'find', 'pytest', 'npm', 'go', 'cargo', 'make'],
  command_denylist: ['rm', 'dd', 'mkfs', 'format', 'chmod', 'chown'],
  secret_patterns: ['AKIA', 'ghp_', 'eyJ', 'Bearer', 'api[_-]?key'],
  pii_patterns: [
    '\\b\\d{3}[-.]?\\d{3}[-.]?\\d{4}\\b',
    '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b',
  ],
};

export const TOOL_REGISTRY: Record<string, ToolMetadata> = {
  scan_repo: {
    name: 'scan_repo',
    risk_level: 'read',
    description: 'Scan repository structure and return overview',
    parameters: {
      path: { type: 'string', required: false, description: 'Path to scan', sensitive: false },
    },
    scope: {
      path_allowlist: ['/'],
      path_denylist: ['.git/', 'node_modules/', 'dist/', 'build/'],
    },
    confirmation: 'none',
  },
  read_file: {
    name: 'read_file',
    risk_level: 'read',
    description: 'Read file content with optional line range',
    parameters: {
      path: { type: 'string', required: true, description: 'File path' },
      offset: { type: 'number', required: false, description: 'Start line' },
      limit: { type: 'number', required: false, description: 'Max lines' },
    },
    scope: {
      path_allowlist: [],
      path_denylist: ['.env', 'secrets/', 'credentials/'],
      max_file_size: 1024 * 1024,
    },
    confirmation: 'none',
  },
  search_files: {
    name: 'search_files',
    risk_level: 'read',
    description: 'Search for pattern in files',
    parameters: {
      pattern: { type: 'string', required: true, description: 'Regex pattern' },
      path: { type: 'string', required: false, description: 'Search path' },
      extensions: { type: 'array', required: false, description: 'File extensions' },
    },
    scope: {
      path_allowlist: [],
      path_denylist: ['.env', 'secrets/', 'node_modules/'],
    },
    confirmation: 'none',
  },
  generate_diff: {
    name: 'generate_diff',
    risk_level: 'read',
    description: 'Generate unified diff from original to patched content',
    parameters: {
      original: { type: 'string', required: true, description: 'Original file path' },
      patched: { type: 'string', required: true, description: 'Patched file path' },
    },
    scope: {
      path_allowlist: [],
      path_denylist: ['.env', 'secrets/'],
    },
    confirmation: 'none',
  },
  apply_patch: {
    name: 'apply_patch',
    risk_level: 'write',
    description: 'Apply unified diff patch to file',
    parameters: {
      filePath: { type: 'string', required: true, description: 'Target file path' },
      patch: { type: 'string', required: true, description: 'Patch content' },
    },
    scope: {
      path_allowlist: [],
      path_denylist: ['.env', 'secrets/', 'credentials/', '.git/'],
    },
    confirmation: 'once',
  },
  safe_edit: {
    name: 'safe_edit',
    risk_level: 'write',
    description: 'Safely edit file with line range validation',
    parameters: {
      path: { type: 'string', required: true, description: 'File path' },
      startLine: { type: 'number', required: true, description: 'Start line' },
      endLine: { type: 'number', required: true, description: 'End line' },
      newContent: { type: 'string', required: true, description: 'New content' },
    },
    scope: {
      path_allowlist: [],
      path_denylist: ['.env', 'secrets/', 'credentials/', '.git/'],
    },
    confirmation: 'once',
  },
  execute_command: {
    name: 'execute_command',
    risk_level: 'exec',
    description: 'Execute command with sandbox restrictions',
    parameters: {
      command: { type: 'string', required: true, description: 'Command to execute' },
      args: { type: 'array', required: false, description: 'Command arguments' },
      timeout: { type: 'number', required: false, description: 'Timeout in ms' },
    },
    scope: {
      command_allowlist: [
        'echo',
        'ls',
        'cat',
        'grep',
        'find',
        'pytest',
        'npm',
        'go',
        'cargo',
        'make',
        'git',
      ],
      command_denylist: ['rm', 'dd', 'mkfs', 'format', 'chmod', 'chown', 'sudo', 'su'],
      max_output_size: 1024 * 1024,
    },
    confirmation: 'always',
  },
  git_status: {
    name: 'git_status',
    risk_level: 'read',
    description: 'Show git working tree status',
    parameters: {},
    scope: {
      path_allowlist: [],
      path_denylist: ['.git/'],
    },
    confirmation: 'none',
  },
  git_diff: {
    name: 'git_diff',
    risk_level: 'read',
    description: 'Show staged/unstaged changes',
    parameters: {
      staged: { type: 'boolean', required: false, description: 'Show staged only' },
    },
    scope: {
      path_allowlist: [],
      path_denylist: ['.git/'],
    },
    confirmation: 'none',
  },
  scan: {
    name: 'scan',
    risk_level: 'read',
    description: 'Scan repository structure',
    parameters: {
      path: { type: 'string', required: false, description: 'Path to scan' },
    },
    scope: {
      path_allowlist: ['/'],
      path_denylist: ['.git/', 'node_modules/', 'dist/', 'build/'],
    },
    confirmation: 'none',
  },
  read: {
    name: 'read',
    risk_level: 'read',
    description: 'Read file content',
    parameters: {
      path: { type: 'string', required: true, description: 'File path' },
    },
    scope: {
      path_allowlist: [],
      path_denylist: ['.env', 'secrets/', 'credentials/'],
      max_file_size: 1024 * 1024,
    },
    confirmation: 'none',
  },
  grep: {
    name: 'grep',
    risk_level: 'read',
    description: 'Search for pattern in files',
    parameters: {
      pattern: { type: 'string', required: true, description: 'Regex pattern' },
      path: { type: 'string', required: false, description: 'Search path' },
    },
    scope: {
      path_allowlist: [],
      path_denylist: ['.env', 'secrets/', 'node_modules/'],
    },
    confirmation: 'none',
  },
  edit: {
    name: 'edit',
    risk_level: 'write',
    description: 'Safely edit file',
    parameters: {
      path: { type: 'string', required: true, description: 'File path' },
      startLine: { type: 'number', required: true, description: 'Start line' },
      endLine: { type: 'number', required: true, description: 'End line' },
      newContent: { type: 'string', required: true, description: 'New content' },
    },
    scope: {
      path_allowlist: [],
      path_denylist: ['.env', 'secrets/', 'credentials/', '.git/'],
    },
    confirmation: 'once',
  },
  run: {
    name: 'run',
    risk_level: 'exec',
    description: 'Execute command',
    parameters: {
      command: { type: 'string', required: true, description: 'Command to execute' },
      preset: { type: 'string', required: false, description: 'Preset command name' },
    },
    scope: {
      command_allowlist: [
        'echo',
        'ls',
        'cat',
        'grep',
        'find',
        'pytest',
        'npm',
        'go',
        'cargo',
        'make',
        'git',
      ],
      command_denylist: ['rm', 'dd', 'mkfs', 'format', 'chmod', 'chown', 'sudo', 'su'],
      max_output_size: 1024 * 1024,
    },
    confirmation: 'always',
  },
};
