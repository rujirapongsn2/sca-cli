import { spawn } from 'child_process';
import * as path from 'path';

export interface ExecOptions {
  command: string;
  args?: string[];
  cwd?: string;
  timeout?: number;
  env?: Record<string, string>;
}

export interface ExecResult {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
  command: string;
}

export interface SandboxOptions {
  allowedCommands?: string[];
  allowedPaths?: string[];
  deniedEnvVars?: string[];
  maxOutputSize?: number;
}

export class CommandExecutor {
  private readonly defaultAllowedCommands = [
    'npm',
    'yarn',
    'pnpm',
    'pytest',
    'go',
    'cargo',
    'make',
    'git',
    'ls',
    'cat',
    'grep',
    'find',
    'echo',
    'node',
    'python',
    'python3',
    'tsc',
    'eslint',
    'prettier',
  ];

  private sandboxOptions: SandboxOptions;
  private defaultCwd: string;

  constructor(sandboxOptions: SandboxOptions = {}, defaultCwd = process.cwd()) {
    this.sandboxOptions = {
      allowedCommands: sandboxOptions.allowedCommands || this.defaultAllowedCommands,
      allowedPaths: sandboxOptions.allowedPaths || [defaultCwd],
      deniedEnvVars: sandboxOptions.deniedEnvVars || [
        'AWS_SECRET_ACCESS_KEY',
        'GITHUB_TOKEN',
        'API_KEY',
        'SECRET',
      ],
      maxOutputSize: sandboxOptions.maxOutputSize || 1024 * 1024,
    };
    this.defaultCwd = defaultCwd;
  }

  async execute(options: ExecOptions, dryRun = false): Promise<ExecResult> {
    const { command, args = [], cwd = this.defaultCwd, timeout = 30000, env = {} } = options;

    const startTime = Date.now();

    if (!this.isCommandAllowed(command)) {
      return {
        success: false,
        exitCode: 1,
        stdout: '',
        stderr: `Command not allowed: ${command}`,
        duration: Date.now() - startTime,
        command: this.buildCommand(command, args),
      };
    }

    if (!this.isPathAllowed(cwd)) {
      return {
        success: false,
        exitCode: 1,
        stdout: '',
        stderr: `Path not allowed: ${cwd}`,
        duration: Date.now() - startTime,
        command: this.buildCommand(command, args),
      };
    }

    if (dryRun) {
      return {
        success: true,
        exitCode: 0,
        stdout: `Dry run: Would execute ${this.buildCommand(command, args)}`,
        stderr: '',
        duration: 0,
        command: this.buildCommand(command, args),
      };
    }

    const sanitizedEnv = this.sanitizeEnv(env);

    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      const outputLimit = this.sandboxOptions.maxOutputSize || 1024 * 1024;

      const child = spawn(command, args, {
        cwd,
        env: sanitizedEnv,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      child.stdout.on('data', (data) => {
        const chunk = data.toString();
        stdout += chunk;
        if (stdout.length > outputLimit) {
          stdout = stdout.slice(0, outputLimit) + '\n[output truncated]';
          child.kill();
        }
      });

      child.stderr.on('data', (data) => {
        const chunk = data.toString();
        stderr += chunk;
        if (stderr.length > outputLimit) {
          stderr = stderr.slice(0, outputLimit) + '\n[output truncated]';
          child.kill();
        }
      });

      const timeoutId = setTimeout(() => {
        child.kill();
        resolve({
          success: false,
          exitCode: 143,
          stdout: stdout + '\n[timeout]',
          stderr: stderr + '\n[command timed out]',
          duration: Date.now() - startTime,
          command: this.buildCommand(command, args),
        });
      }, timeout);

      child.on('close', (code) => {
        clearTimeout(timeoutId);
        resolve({
          success: (code ?? 0) === 0,
          exitCode: code ?? -1,
          stdout,
          stderr,
          duration: Date.now() - startTime,
          command: this.buildCommand(command, args),
        });
      });

      child.on('error', (error) => {
        clearTimeout(timeoutId);
        resolve({
          success: false,
          exitCode: 1,
          stdout,
          stderr: `Execution error: ${error.message}`,
          duration: Date.now() - startTime,
          command: this.buildCommand(command, args),
        });
      });
    });
  }

  async runPreset(
    presetName: string,
    presets: Record<string, string[][]> = this.getDefaultPresets()
  ): Promise<ExecResult[]> {
    const preset = presets[presetName];

    if (!preset) {
      return [
        {
          success: false,
          exitCode: 1,
          stdout: '',
          stderr: `Unknown preset: ${presetName}`,
          duration: 0,
          command: '',
        },
      ];
    }

    const results: ExecResult[] = [];

    for (const cmdArgs of preset) {
      const cmd = cmdArgs[0] ?? '';
      const args = cmdArgs.slice(1);
      const result = await this.execute({ command: cmd, args: args });
      results.push(result);

      if (!result.success && presetName === 'test') {
        break;
      }
    }

    return results;
  }

  private isCommandAllowed(command: string): boolean {
    const baseCommand = path.basename(command);
    return this.sandboxOptions.allowedCommands?.includes(baseCommand) || false;
  }

  private isPathAllowed(pathToCheck: string): boolean {
    if (this.sandboxOptions.allowedPaths?.length === 0) return true;

    return (
      this.sandboxOptions.allowedPaths?.some((allowed) => pathToCheck.startsWith(allowed)) || false
    );
  }

  private sanitizeEnv(env: Record<string, string>): Record<string, string> {
    const sanitized: Record<string, string> = {};
    const processEnv = process.env || {};

    for (const [key, value] of Object.entries(processEnv)) {
      if (value !== undefined) {
        sanitized[key] = value;
      }
    }

    for (const key of Object.keys(sanitized)) {
      const lowerKey = key.toUpperCase();
      for (const denied of this.sandboxOptions.deniedEnvVars || []) {
        if (lowerKey.includes(denied.toUpperCase())) {
          delete sanitized[key];
        }
      }
    }

    for (const [key, value] of Object.entries(env)) {
      if (value !== undefined) {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private buildCommand(command: string, args: string[]): string {
    return args.length > 0 ? `${command} ${args.join(' ')}` : command;
  }

  getDefaultPresets(): Record<string, string[][]> {
    return {
      test: [['npm', 'test'], ['pytest'], ['go', 'test'], ['make', 'test'], ['cargo', 'test']],
      lint: [
        ['eslint', '.'],
        ['prettier', '--check', '.'],
        ['npm', 'run', 'lint'],
      ],
      build: [['npm', 'run', 'build'], ['make', 'build'], ['tsc'], ['cargo', 'build']],
    };
  }

  addAllowedCommand(command: string): void {
    if (!this.sandboxOptions.allowedCommands) {
      this.sandboxOptions.allowedCommands = [];
    }
    if (!this.sandboxOptions.allowedCommands.includes(command)) {
      this.sandboxOptions.allowedCommands.push(command);
    }
  }

  addAllowedPath(path: string): void {
    if (!this.sandboxOptions.allowedPaths) {
      this.sandboxOptions.allowedPaths = [];
    }
    if (!this.sandboxOptions.allowedPaths.includes(path)) {
      this.sandboxOptions.allowedPaths.push(path);
    }
  }
}
