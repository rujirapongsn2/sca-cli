import { AgentContextManager, AgentContext, Message, PlanStep, AgentConfig } from './types.js';
import { MemoryStore } from './types.js';
import { CommandExecutor } from '../tools/exec-tools.js';
import { RepoScanner, FileReader, FileGrep } from '../tools/file-tools.js';
import { DiffGenerator, SafeEditor } from '../tools/patch-tools.js';
import { GitTools } from '../tools/git-tools.js';

export interface ToolResult {
  success: boolean;
  result?: string;
  error?: string;
}

export type ToolName = 
  | 'scan'
  | 'read'
  | 'grep'
  | 'edit'
  | 'diff'
  | 'apply'
  | 'run'
  | 'git_status'
  | 'git_diff'
  | 'list_files';

export class Agent {
  private contextManager: AgentContextManager;
  private memoryStore: MemoryStore;
  private executor: CommandExecutor;
  private repoScanner: RepoScanner;
  private fileReader: FileReader;
  private fileGrep: FileGrep;
  private diffGenerator: DiffGenerator;
  private safeEditor: SafeEditor;
  private gitTools: GitTools;
  private config: AgentConfig;

  constructor(config?: Partial<AgentConfig>) {
    this.config = {
      modelProvider: config?.modelProvider || 'local',
      modelEndpoint: config?.modelEndpoint || 'http://localhost:11434',
      systemPrompt: config?.systemPrompt,
      maxIterations: config?.maxIterations || 10,
      timeout: config?.timeout || 30000,
    };

    this.contextManager = new AgentContextManager();
    this.memoryStore = new MemoryStore();
    this.executor = new CommandExecutor({});
    this.repoScanner = new RepoScanner();
    this.fileReader = new FileReader();
    this.fileGrep = new FileGrep();
    this.diffGenerator = new DiffGenerator();
    this.safeEditor = new SafeEditor();
    this.gitTools = new GitTools();
  }

  async startTask(task: string, workspace: string = process.cwd()): Promise<AgentContext> {
    const context = this.contextManager.createContext(task, workspace, this.getAvailableTools());

    const systemMessage: Message = {
      role: 'system',
      content: this.getSystemPrompt(),
      timestamp: new Date(),
    };

    this.contextManager.addMessage(context.id, systemMessage);

    const userMessage: Message = {
      role: 'user',
      content: task,
      timestamp: new Date(),
    };

    this.contextManager.addMessage(context.id, userMessage);

    return context;
  }

  private getSystemPrompt(): string {
    if (this.config.systemPrompt) {
      return this.config.systemPrompt;
    }

    return `You are Softnix Code Agent, a local-first AI code assistant.

## Your Capabilities
- Scan and understand codebases
- Read, search, and edit files
- Generate and apply code changes
- Run tests and build commands
- Work with Git

## Guidelines
- Always verify changes before applying
- Ask for confirmation before risky operations
- Use appropriate tools for the task
- Keep responses concise and helpful
- Remember important context for future reference

## Safety Rules
- Never modify files outside the workspace
- Always show diffs before applying changes
- Ask for confirmation before running destructive commands
- Report security concerns immediately`;
  }

  private getAvailableTools(): string[] {
    return ['scan', 'read', 'grep', 'edit', 'diff', 'apply', 'run', 'git_status', 'git_diff'];
  }

  async run(contextId: string): Promise<string> {
    const context = this.contextManager.getContext(contextId);
    if (!context) {
      throw new Error(`Context not found: ${contextId}`);
    }

    this.contextManager.updateState(contextId, 'analyzing');

    const analysis = await this.analyzeTask(context);
    this.contextManager.updateState(contextId, 'planning');

    const plan = await this.createPlan(context, analysis);

    for (const step of plan) {
      this.contextManager.addPlanStep(contextId, step);
    }

    this.contextManager.updateState(contextId, 'executing');

    for (const step of plan) {
      this.contextManager.updatePlanStepStatus(contextId, step.id, 'in_progress');

      try {
        const result = await this.executeStep(context, step);
        this.contextManager.updatePlanStepStatus(contextId, step.id, 'completed', result);

        const toolResult: ToolResult = {
          success: true,
          result: result,
        };

        this.addToolResultMessage(contextId, step.tool, toolResult);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.contextManager.updatePlanStepStatus(contextId, step.id, 'failed', errorMessage);

        const toolResult: ToolResult = {
          success: false,
          error: errorMessage,
        };

        this.addToolResultMessage(contextId, step.tool, toolResult);
      }
    }

    this.contextManager.updateState(contextId, 'finalizing');

    const summary = await this.finalize(context);

    this.contextManager.updateState(contextId, 'completed');

    return summary;
  }

  private async analyzeTask(context: AgentContext): Promise<string> {
    const task = context.task.toLowerCase();

    if (task.includes('fix bug') || task.includes('fix error') || task.includes('debug')) {
      return 'bug_fix';
    } else if (task.includes('test') || task.includes('coverage')) {
      return 'testing';
    } else if (task.includes('refactor') || task.includes('improve') || task.includes('optimize')) {
      return 'refactoring';
    } else if (task.includes('add feature') || task.includes('implement') || task.includes('new')) {
      return 'feature';
    } else if (task.includes('docs') || task.includes('documentation') || task.includes('readme')) {
      return 'documentation';
    } else if (task.includes('build') || task.includes('compile') || task.includes('deploy')) {
      return 'build';
    }

    return 'general';
  }

  private async createPlan(context: AgentContext, analysis: string): Promise<PlanStep[]> {
    const workspace = context.workspace;
    const plan: PlanStep[] = [];
    const timestamp = new Date();

    switch (analysis) {
      case 'bug_fix':
        plan.push({
          id: `step_${Date.now()}_1`,
          description: 'Scan repository to understand structure',
          tool: 'scan',
          parameters: { path: workspace },
          status: 'pending',
          timestamp,
        });
        plan.push({
          id: `step_${Date.now()}_2`,
          description: 'Find the bug location using grep',
          tool: 'grep',
          parameters: { pattern: context.task, path: workspace },
          status: 'pending',
          timestamp,
        });
        plan.push({
          id: `step_${Date.now()}_3`,
          description: 'Read the problematic file',
          tool: 'read',
          parameters: { path: workspace },
          status: 'pending',
          timestamp,
        });
        plan.push({
          id: `step_${Date.now()}_4`,
          description: 'Apply the fix',
          tool: 'edit',
          parameters: {},
          status: 'pending',
          timestamp,
        });
        plan.push({
          id: `step_${Date.now()}_5`,
          description: 'Run tests to verify the fix',
          tool: 'run',
          parameters: { preset: 'test' },
          status: 'pending',
          timestamp,
        });
        break;

      case 'testing':
        plan.push({
          id: `step_${Date.now()}_1`,
          description: 'Scan test directory structure',
          tool: 'scan',
          parameters: { path: workspace },
          status: 'pending',
          timestamp,
        });
        plan.push({
          id: `step_${Date.now()}_2`,
          description: 'Run test suite',
          tool: 'run',
          parameters: { preset: 'test' },
          status: 'pending',
          timestamp,
        });
        break;

      case 'refactoring':
        plan.push({
          id: `step_${Date.now()}_1`,
          description: 'Scan codebase to identify refactoring targets',
          tool: 'scan',
          parameters: { path: workspace },
          status: 'pending',
          timestamp,
        });
        plan.push({
          id: `step_${Date.now()}_2`,
          description: 'Search for code to refactor',
          tool: 'grep',
          parameters: { pattern: 'TODO|FIXME|refactor', path: workspace },
          status: 'pending',
          timestamp,
        });
        plan.push({
          id: `step_${Date.now()}_3`,
          description: 'Apply refactoring changes',
          tool: 'edit',
          parameters: {},
          status: 'pending',
          timestamp,
        });
        plan.push({
          id: `step_${Date.now()}_4`,
          description: 'Run tests to verify changes',
          tool: 'run',
          parameters: { preset: 'test' },
          status: 'pending',
          timestamp,
        });
        break;

      case 'feature':
        plan.push({
          id: `step_${Date.now()}_1`,
          description: 'Scan repository structure',
          tool: 'scan',
          parameters: { path: workspace },
          status: 'pending',
          timestamp,
        });
        plan.push({
          id: `step_${Date.now()}_2`,
          description: 'Read relevant files',
          tool: 'read',
          parameters: { path: workspace },
          status: 'pending',
          timestamp,
        });
        plan.push({
          id: `step_${Date.now()}_3`,
          description: 'Implement the feature',
          tool: 'edit',
          parameters: {},
          status: 'pending',
          timestamp,
        });
        plan.push({
          id: `step_${Date.now()}_4`,
          description: 'Run tests',
          tool: 'run',
          parameters: { preset: 'test' },
          status: 'pending',
          timestamp,
        });
        break;

      default:
        plan.push({
          id: `step_${Date.now()}_1`,
          description: 'Scan repository',
          tool: 'scan',
          parameters: { path: workspace },
          status: 'pending',
          timestamp,
        });
        plan.push({
          id: `step_${Date.now()}_2`,
          description: 'Analyze code',
          tool: 'read',
          parameters: { path: workspace },
          status: 'pending',
          timestamp,
        });
        plan.push({
          id: `step_${Date.now()}_3`,
          description: 'Make necessary changes',
          tool: 'edit',
          parameters: {},
          status: 'pending',
          timestamp,
        });
        plan.push({
          id: `step_${Date.now()}_4`,
          description: 'Run tests to verify',
          tool: 'run',
          parameters: { preset: 'test' },
          status: 'pending',
          timestamp,
        });
    }

    return plan;
  }

  private async executeStep(context: AgentContext, step: PlanStep): Promise<string> {
    const params = step.parameters as Record<string, unknown>;
    const workspace = context.workspace;

    switch (step.tool) {
      case 'scan':
        const repoInfo = this.repoScanner.scan(workspace);
        return `Scanned repository: ${repoInfo.fileCount} files, Tech stack: ${repoInfo.techStack.join(', ')}`;

      case 'read':
        const filePath = params.path as string || workspace;
        const result = this.fileReader.readSafe(filePath);
        return `Read ${result.lines.total} lines from ${filePath}`;

      case 'grep':
        const pattern = params.pattern as string;
        const grepPath = (params.path as string) || workspace;
        const results = this.fileGrep.search({ pattern, path: grepPath });
        return `Found ${results.length} matches for "${pattern}"`;

      case 'edit':
        const editPath = params.path as string;
        const startLine = params.startLine as number;
        const endLine = params.endLine as number;
        const newContent = params.newContent as string;

        if (!editPath || !startLine || !endLine || !newContent) {
          return 'Edit step requires path, startLine, endLine, and newContent parameters';
        }

        const editResult = this.safeEditor.edit(editPath, startLine, endLine, newContent);
        return editResult.success ? `Edited ${editPath} lines ${startLine}-${endLine}` : `Edit failed: ${editResult.message}`;

      case 'diff':
        const originalPath = params.original as string;
        const patchedPath = params.patched as string;
        if (originalPath && patchedPath) {
          const diff = this.diffGenerator.fromFiles(originalPath, patchedPath);
          return `Generated diff:\n${diff}`;
        }
        return 'Diff step requires original and patched paths';

      case 'run':
        const preset = params.preset as string;
        if (preset) {
          const runResults = await this.executor.runPreset(preset);
          const successful = runResults.filter((r) => r.success).length;
          return `Ran ${preset}: ${successful}/${runResults.length} succeeded`;
        }
        return 'Run step requires preset parameter';

      case 'git_status':
        const status = this.gitTools.getStatus();
        return `Git status: ${status.branch}, ${status.modified.length} modified, ${status.untracked.length} untracked`;

      case 'git_diff':
        const gitDiff = this.gitTools.getDiff();
        return `Git diff: ${gitDiff.diff.length} characters`;

      default:
        return `Unknown tool: ${step.tool}`;
    }
  }

  private addToolResultMessage(contextId: string, tool: string, result: ToolResult): void {
    const message: Message = {
      role: 'assistant',
      content: result.success ? `Tool ${tool} completed successfully` : `Tool ${tool} failed`,
      timestamp: new Date(),
    };

    this.contextManager.addMessage(contextId, message);
  }

  private async finalize(context: AgentContext): Promise<string> {
    const steps = this.contextManager.getPlanSteps(context.id);
    const completedSteps = steps.filter((s) => s.status === 'completed').length;
    const failedSteps = steps.filter((s) => s.status === 'failed').length;

    let summary = `Task completed!\n`;
    summary += `- ${completedSteps}/${steps.length} steps completed`;
    if (failedSteps > 0) {
      summary += `, ${failedSteps} failed`;
    }

    if (completedSteps === steps.length) {
      summary += '\n✅ All steps completed successfully';
    } else if (failedSteps === steps.length) {
      summary += '\n❌ All steps failed';
    } else {
      summary += '\n⚠️ Some steps failed';
    }

    const summaryMessage: Message = {
      role: 'assistant',
      content: summary,
      timestamp: new Date(),
    };

    this.contextManager.addMessage(context.id, summaryMessage);

    return summary;
  }

  getContext(contextId: string): AgentContext | null {
    return this.contextManager.getContext(contextId);
  }

  getPlanSteps(contextId: string): PlanStep[] {
    return this.contextManager.getPlanSteps(contextId);
  }

  close(): void {
    this.contextManager.close();
    this.memoryStore.close();
  }
}