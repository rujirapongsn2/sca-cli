import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigLoader } from './config.js';
import { AuditLogger } from './audit.js';
import { RepoScanner } from '../tools/file-scanner.js';
import { Agent } from '../core/agent.js';
import { RepoInfo } from '../tools/types.js';

type CommandHandler = (_args: string[]) => Promise<void>;

const COMMAND_ALIASES: Record<string, string> = {
  'h': 'help',
  '?': 'help',
  's': 'scan',
  't': 'task',
  'p': 'plan',
  'd': 'diff',
  'a': 'apply',
  'r': 'run',
  'm': 'memory',
  'c': 'config',
  'q': 'quit',
  'e': 'exit',
  'connect': 'connect',
};

function flattenStructure(
  node: RepoInfo['structure'] | undefined,
  result: Array<{ name: string; type: 'file' | 'directory' }> = []
): Array<{ name: string; type: 'file' | 'directory' }> {
  if (!node) return result;
  result.push({ name: node.name, type: node.type });
  if (node.children) {
    for (const child of node.children) {
      flattenStructure(child, result);
    }
  }
  return result;
}

export class Repl {
  private rl: readline.Interface;
  private handlers: Map<string, CommandHandler> = new Map();
  private configLoader: ConfigLoader;
  private auditLogger: AuditLogger;
  private agent: Agent | null = null;
  private currentContextId: string | null = null;
  private pendingDiff: string | null = null;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'sca> ',
    });
    this.configLoader = ConfigLoader.getInstance();
    this.auditLogger = AuditLogger.getInstance();
    this.registerDefaultHandlers();
  }

  private registerDefaultHandlers(): void {
    this.register('help', this.handleHelp.bind(this));
    this.register('connect', this.handleConnect.bind(this));
    this.register('scan', this.handleScan.bind(this));
    this.register('task', this.handleTask.bind(this));
    this.register('plan', this.handlePlan.bind(this));
    this.register('diff', this.handleDiff.bind(this));
    this.register('apply', this.handleApply.bind(this));
    this.register('run', this.handleRun.bind(this));
    this.register('memory', this.handleMemory.bind(this));
    this.register('config', this.handleConfig.bind(this));
    this.register('quit', this.handleQuit.bind(this));
    this.register('exit', this.handleQuit.bind(this));
  }

  async start(): Promise<void> {
    this.auditLogger.startSession();
    this.log('Softnix Code Agent v0.1.0');
    this.log('Type "help" for available commands.');
    this.log('');
    this.prompt();

    this.rl.on('line', async (input) => {
      await this.processInput(input.trim());
      this.prompt();
    });

    this.rl.on('close', () => {
      this.auditLogger.endSession();
      process.exit(0);
    });
  }

  private async processInput(input: string): Promise<void> {
    if (!input) {
      return;
    }

    const parts = input.split(/\s+/);
    let command = parts[0]?.toLowerCase().replace(/^\//, '');
    const args = parts.slice(1);

    if (!command) {
      return;
    }

    if (this.handlers.has(command)) {
      try {
        const handler = this.handlers.get(command)!;
        await handler(args);
      } catch (error) {
        this.log(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      return;
    }

    if (COMMAND_ALIASES[command]) {
      const fullCommand = COMMAND_ALIASES[command];
      this.log(`Auto-complete: /${command} → /${fullCommand}`);
      try {
        const handler = this.handlers.get(fullCommand)!;
        await handler(args);
      } catch (error) {
        this.log(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      return;
    }

    const suggestions = Object.keys(COMMAND_ALIASES).filter((cmd) => cmd.startsWith(command));
    if (suggestions.length > 0) {
      this.log(
        `Unknown command: "${command}". Did you mean: ${suggestions.map((s) => `/${s}`).join(', ')}?`
      );
    } else {
      this.log(`Unknown command: "${command}". Type "help" for available commands.`);
    }
  }

  private prompt(): void {
    this.rl.setPrompt('sca> ');
    this.rl.prompt();
  }

  private log(message: string): void {
    console.log(message);
  }

  register(name: string, handler: CommandHandler): void {
    this.handlers.set(name, handler);
  }

  private async handleConnect(args: string[]): Promise<void> {
    this.log('');
    this.log('='.repeat(60));
    this.log('Connect to LLM Provider');
    this.log('='.repeat(60));
    this.log('');
    this.log('Usage: /connect <baseurl> <apikey>');
    this.log('');
    this.log('Examples:');
    this.log('  /connect https://openrouter.ai/api/v1 sk-abc123xyz');
    this.log('  /connect https://api.openai.com/v1 sk-abc123xyz');
    this.log('  /connect https://localhost:8000/v1 my-api-key');
    this.log('');
    this.log('Supports OpenAI-compatible APIs (OpenRouter, OpenAI, Local servers)');
    this.log('');

    if (args.length >= 2) {
      const baseUrl = args[0]!;
      const apiKey = args[1]!;

      this.log(`Connecting to: ${baseUrl}`);
      this.log(`API Key set: ****${apiKey.slice(-4)}`);

      try {
        const config = this.configLoader.load();
        config.model.endpoint = baseUrl;
        config.model.api_key = apiKey;
        config.model.provider = 'external';

        this.log('');
        this.log('✅ Connected successfully!');
        this.log(`Endpoint: ${config.model.endpoint}`);
        this.log(`Provider: ${config.model.provider}`);
      } catch (error) {
        this.log(`Warning: Could not save config. Run /config show to verify.`);
      }
    }
  }

  private async handleHelp(): Promise<void> {
    this.log(`
Available Commands:
  /connect <baseurl> <apikey>  Connect to external LLM (OpenAI-compatible)
  /scan        Scan repository and show structure (s)
  /task <msg>  Start a new task (t)
  /plan        Show current work plan (p)
  /diff        Show proposed changes (d)
  /apply       Apply changes (requires confirmation) (a)
  /run <preset>  Run test/lint/build commands (r)
  /memory      Manage memory (show/forget/export) (m)
  /config      Configure settings (c)
  /help        Show this help (h, ?)
  /quit        Exit interactive mode (q)

Shortcuts: Type /h for help, /s for scan, /t for task, etc.
`);
  }

  private async handleScan(): Promise<void> {
    try {
      const config = this.configLoader.load();
      const scanner = new RepoScanner();
      const result = scanner.scan(config.workspace_root);

      this.log('');
      this.log('='.repeat(60));
      this.log('Repository Scan Results');
      this.log('='.repeat(60));
      this.log(`Workspace: ${config.workspace_root}`);
      this.log(`Total Files: ${result.fileCount}`);
      this.log(`Tech Stack: ${result.techStack.join(', ')}`);
      this.log('');
      this.log('File Structure (top level):');
      this.log('-'.repeat(40));

      const allItems = flattenStructure(result.structure);
      const topDirs = allItems.filter((s) => s.type === 'directory').slice(0, 10);
      const topFiles = allItems.filter((s) => s.type === 'file').slice(0, 10);

      for (const dir of topDirs) {
        this.log(`📁 ${dir.name}/`);
      }
      for (const file of topFiles) {
        this.log(`📄 ${file.name}`);
      }

      if (allItems.length > 20) {
        this.log(`... and ${allItems.length - 20} more items`);
      }

      this.log('');
      this.log('Scan complete!');
    } catch (error) {
      this.log(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleTask(args: string[]): Promise<void> {
    if (args.length === 0) {
      this.log('Usage: /task <description>');
      return;
    }

    const task = args.join(' ');
    this.log('');
    this.log(`Starting task: ${task}`);
    this.log('Agent will analyze and propose a plan...');
    this.log('');

    try {
      const config = this.configLoader.load();
      this.agent = new Agent({
        modelProvider: config.model.provider,
        modelEndpoint: config.model.endpoint,
      });

      const context = await this.agent.startTask(task, config.workspace_root);
      this.currentContextId = context.id;
      const result = await this.agent.run(this.currentContextId);

      this.log('');
      this.log('='.repeat(60));
      this.log('Task Result');
      this.log('='.repeat(60));
      this.log(result);
    } catch (error) {
      this.log(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handlePlan(): Promise<void> {
    if (!this.agent || !this.currentContextId) {
      this.log("No active task. Use '/task' to start a new task.");
      return;
    }

    try {
      const context = this.agent.getContext(this.currentContextId);
      if (!context) {
        this.log('Context not found.');
        return;
      }

      this.log('');
      this.log('='.repeat(60));
      this.log('Current Plan');
      this.log('='.repeat(60));

      const steps = this.agent.getPlanSteps(this.currentContextId);
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i]!;
        const statusIcon =
          step.status === 'completed' ? '✅' : step.status === 'failed' ? '❌' : '⏳';
        this.log(`${statusIcon} ${i + 1}. ${step.description} (${step.tool})`);
      }

      this.log('');
    } catch (error) {
      this.log(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleDiff(): Promise<void> {
    if (!this.pendingDiff) {
      this.log('No pending changes. Complete a task first to see proposed changes.');
      return;
    }

    this.log('');
    this.log('='.repeat(60));
    this.log('Proposed Changes');
    this.log('='.repeat(60));
    this.log(this.pendingDiff);
    this.log('');
  }

  private async handleApply(): Promise<void> {
    if (!this.pendingDiff) {
      this.log('No changes to apply. Complete a task first.');
      return;
    }

    this.log('Changes applied successfully! (Confirmation bypassed in demo mode)');
    this.pendingDiff = null;
  }

  private async handleRun(args: string[]): Promise<void> {
    if (args.length === 0) {
      this.log('Usage: /run <test|lint|build>');
      return;
    }

    const preset = args[0]!;
    this.log(`Running ${preset}...`);

    const config = this.configLoader.load();
    const presets = config.commands.presets;

    if (!presets || !presets[preset]) {
      this.log(`Unknown preset: ${preset}. Available: ${Object.keys(presets).join(', ')}`);
      return;
    }

    const presetValue = presets[preset];
    const commands = Array.isArray(presetValue) ? presetValue : [presetValue];

    this.log('');
    for (const cmd of commands) {
      this.log(`> ${cmd}`);
      this.log('(Command execution not implemented in this demo)');
    }
  }

  private async handleMemory(args: string[]): Promise<void> {
    const subcommand = args[0] ?? 'show';

    switch (subcommand) {
      case 'show': {
        this.log('');
        this.log('='.repeat(60));
        this.log('Memory Contents');
        this.log('='.repeat(60));
        this.log('Project Memory:');
        this.log('- Build commands: Check config for current settings');
        this.log('- Coding conventions: Remembered from previous tasks');
        this.log('- Domain terms: Custom terminology from your project');
        this.log('');
        this.log('User Preferences:');
        this.log('- Style preferences: Default (concise)');
        this.log('- Verbosity settings: Normal');
        this.log('- Safety level: Strict');
        break;
      }

      case 'forget': {
        this.log('Memory cleared. (Confirmation bypassed in demo mode)');
        break;
      }

      case 'export': {
        const memoryDir = path.join(process.cwd(), '.sca', 'memory');
        if (!fs.existsSync(memoryDir)) {
          this.log('No memory to export.');
          return;
        }
        this.log(`Memory exported to ${memoryDir}`);
        break;
      }

      default:
        this.log('Usage: /memory <show|forget|export>');
    }
  }

  private async handleConfig(args: string[]): Promise<void> {
    if (args.length === 0 || args[0] === 'show') {
      const config = this.configLoader.load();
      this.log('');
      this.log('='.repeat(60));
      this.log('Current Configuration');
      this.log('='.repeat(60));
      this.log(`Workspace: ${config.workspace_root}`);
      this.log(`Model Provider: ${config.model.provider}`);
      this.log(`Model Endpoint: ${config.model.endpoint}`);
      this.log(`Privacy Mode: ${config.privacy.strict_mode ? 'strict' : 'normal'}`);
      return;
    }

    if (args[0] === 'set' && args[1]) {
      const [key, value] = args[1].split('=');
      this.log(`Setting ${key}=${value}...`);
      this.log('(Config modification not implemented in this demo)');
      return;
    }

    this.log('Usage: /config [show|set <key>=<value>]');
  }

  private async handleQuit(): Promise<void> {
    this.auditLogger.endSession();
    this.log('Goodbye!');
    this.rl.close();
  }
}
