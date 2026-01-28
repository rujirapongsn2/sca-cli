import * as readline from 'readline';
import { ConfigLoader } from './config.js';
import { AuditLogger } from './audit.js';

// eslint-disable-next-line no-unused-vars
type CommandHandler = (_args: string[]) => Promise<void>;

export class Repl {
  private rl: readline.Interface;
  private handlers: Map<string, CommandHandler> = new Map();
  private configLoader: ConfigLoader;
  private auditLogger: AuditLogger;

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
    const command = parts[0]?.toLowerCase();
    const args = parts.slice(1);

    if (!command || !this.handlers.has(command)) {
      this.log(`Unknown command: ${command}. Type "help" for available commands.`);
      return;
    }

    try {
      const handler = this.handlers.get(command)!;
      await handler(args);
    } catch (error) {
      this.log(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  private async handleHelp(): Promise<void> {
    this.log(`
Available Commands:
  scan        Scan repository and show structure
  task <msg>  Start a new task
  plan        Show current work plan
  diff        Show proposed changes
  apply       Apply changes (requires confirmation)
  run <preset>  Run test/lint/build commands
  memory      Manage memory (show/forget/export)
  config      Configure settings
  help        Show this help
  quit        Exit interactive mode
`);
  }

  private async handleScan(): Promise<void> {
    try {
      const config = this.configLoader.load();
      this.log('Scanning repository...');
      this.log(`Workspace: ${config.workspace_root}`);
      this.log('Scan complete. Use /scan command for detailed output.');
    } catch (error) {
      this.log(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleTask(args: string[]): Promise<void> {
    if (args.length === 0) {
      this.log('Usage: task <description>');
      return;
    }
    const task = args.join(' ');
    this.log(`Starting task: ${task}`);
    this.log('Agent will analyze and propose a plan...');
  }

  private async handlePlan(): Promise<void> {
    this.log("No active plan. Use 'task' to start a new task.");
  }

  private async handleDiff(): Promise<void> {
    this.log('No pending changes. Complete a task first.');
  }

  private async handleApply(): Promise<void> {
    this.log('No changes to apply.');
  }

  private async handleRun(args: string[]): Promise<void> {
    if (args.length === 0) {
      this.log('Usage: run <test|lint|build>');
      return;
    }
    const preset = args[0];
    this.log(`Running ${preset} commands...`);
  }

  private async handleMemory(args: string[]): Promise<void> {
    if (args.length === 0 || args[0] === 'show') {
      this.log('Memory is empty. Complete tasks to build memory.');
    } else if (args[0] === 'forget') {
      this.log('Memory cleared.');
    } else if (args[0] === 'export') {
      this.log('Memory exported.');
    }
  }

  // eslint-disable-next-line no-unused-vars
  private async handleConfig(_args: string[]): Promise<void> {
    this.log("Use '/config set <key>=<value>' to modify settings.");
  }

  private async handleQuit(): Promise<void> {
    this.auditLogger.endSession();
    this.log('Goodbye!');
    this.rl.close();
  }
}
