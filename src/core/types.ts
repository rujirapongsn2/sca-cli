import * as path from 'path';
import Database from 'better-sqlite3';

export interface AgentContext {
  id: string;
  task: string;
  workspace: string;
  messages: Message[];
  tools: string[];
  state: AgentState;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  timestamp: Date;
}

export interface ToolCall {
  name: string;
  parameters: Record<string, unknown>;
  id?: string;
}

export interface ToolResult {
  tool: string;
  success: boolean;
  result?: string;
  error?: string;
  timestamp: Date;
}

export type AgentState =
  | 'idle'
  | 'analyzing'
  | 'planning'
  | 'executing'
  | 'observing'
  | 'iterating'
  | 'finalizing'
  | 'completed'
  | 'error';

export interface AgentConfig {
  modelProvider: string;
  modelEndpoint?: string;
  systemPrompt?: string;
  maxIterations?: number;
  timeout?: number;
}

export interface PlanStep {
  id: string;
  description: string;
  tool: string;
  parameters: Record<string, unknown>;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: string;
  timestamp: Date;
}

export interface MemoryBlock {
  id: string;
  label: string;
  content: string;
  type: 'persona' | 'human' | 'project' | 'custom';
  projectId?: string;
  userId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectInfo {
  id: string;
  name: string;
  path: string;
  techStack: string[];
  buildCommands: string[];
  testCommands: string[];
  conventions: string[];
  domainTerms: Record<string, string>;
}

export interface UserPreferences {
  id: string;
  userId: string;
  style: 'concise' | 'detailed' | 'minimal';
  verbosity: 'low' | 'medium' | 'high';
  safetyLevel: 'permissive' | 'normal' | 'strict';
  preferredLanguage: string;
  autoConfirm: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class AgentContextManager {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const defaultPath = path.join(process.cwd(), '.sca', 'memory.db');
    this.db = new Database(dbPath || defaultPath);
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agent_contexts (
        id TEXT PRIMARY KEY,
        task TEXT NOT NULL,
        workspace TEXT NOT NULL,
        tools TEXT,
        state TEXT DEFAULT 'idle',
        created_at INTEGER,
        updated_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        context_id TEXT,
        role TEXT NOT NULL,
        content TEXT,
        tool_calls TEXT,
        tool_results TEXT,
        timestamp INTEGER,
        FOREIGN KEY (context_id) REFERENCES agent_contexts(id)
      );

      CREATE TABLE IF NOT EXISTS plan_steps (
        id TEXT PRIMARY KEY,
        context_id TEXT,
        description TEXT,
        tool TEXT,
        parameters TEXT,
        status TEXT DEFAULT 'pending',
        result TEXT,
        timestamp INTEGER,
        FOREIGN KEY (context_id) REFERENCES agent_contexts(id)
      );

      CREATE TABLE IF NOT EXISTS memory_blocks (
        id TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        content TEXT NOT NULL,
        type TEXT NOT NULL,
        project_id TEXT,
        user_id TEXT,
        created_at INTEGER,
        updated_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS project_info (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        path TEXT NOT NULL UNIQUE,
        tech_stack TEXT,
        build_commands TEXT,
        test_commands TEXT,
        conventions TEXT,
        domain_terms TEXT
      );

      CREATE TABLE IF NOT EXISTS user_preferences (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        style TEXT DEFAULT 'medium',
        verbosity TEXT DEFAULT 'medium',
        safety_level TEXT DEFAULT 'normal',
        preferred_language TEXT DEFAULT 'typescript',
        auto_confirm INTEGER DEFAULT 0,
        created_at INTEGER,
        updated_at INTEGER
      );
    `);
  }

  createContext(task: string, workspace: string, tools: string[] = []): AgentContext {
    const id = `ctx_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const context: AgentContext = {
      id,
      task,
      workspace,
      messages: [],
      tools,
      state: 'idle',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.db
      .prepare(
        `
      INSERT INTO agent_contexts (id, task, workspace, tools, state, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(id, task, workspace, JSON.stringify(tools), 'idle', Date.now(), Date.now());

    return context;
  }

  getContext(id: string): AgentContext | null {
    const row = this.db.prepare('SELECT * FROM agent_contexts WHERE id = ?').get(id) as any;
    if (!row) return null;

    return {
      id: row.id,
      task: row.task,
      workspace: row.workspace,
      messages: this.loadMessages(id),
      tools: JSON.parse(row.tools || '[]'),
      state: row.state as AgentState,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private loadMessages(contextId: string): Message[] {
    const rows = this.db
      .prepare('SELECT * FROM messages WHERE context_id = ? ORDER BY timestamp')
      .all(contextId) as any[];
    return rows.map((row) => ({
      role: row.role,
      content: row.content,
      toolCalls: row.tool_calls ? JSON.parse(row.tool_calls) : undefined,
      toolResults: row.tool_results ? JSON.parse(row.tool_results) : undefined,
      timestamp: new Date(row.timestamp),
    }));
  }

  addMessage(contextId: string, message: Message): void {
    this.db
      .prepare(
        `
      INSERT INTO messages (context_id, role, content, tool_calls, tool_results, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        contextId,
        message.role,
        message.content,
        JSON.stringify(message.toolCalls || []),
        JSON.stringify(message.toolResults || []),
        message.timestamp.getTime()
      );
  }

  updateState(contextId: string, state: AgentState): void {
    this.db
      .prepare('UPDATE agent_contexts SET state = ?, updated_at = ? WHERE id = ?')
      .run(state, Date.now(), contextId);
  }

  addPlanStep(contextId: string, step: PlanStep): void {
    this.db
      .prepare(
        `
      INSERT INTO plan_steps (id, context_id, description, tool, parameters, status, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        step.id,
        contextId,
        step.description,
        step.tool,
        JSON.stringify(step.parameters),
        step.status,
        step.timestamp.getTime()
      );
  }

  getPlanSteps(contextId: string): PlanStep[] {
    const rows = this.db
      .prepare('SELECT * FROM plan_steps WHERE context_id = ? ORDER BY timestamp')
      .all(contextId) as any[];
    return rows.map((row) => ({
      id: row.id,
      description: row.description,
      tool: row.tool,
      parameters: JSON.parse(row.parameters || '{}'),
      status: row.status as PlanStep['status'],
      result: row.result,
      timestamp: new Date(row.timestamp),
    }));
  }

  updatePlanStepStatus(
    contextId: string,
    stepId: string,
    status: PlanStep['status'],
    result?: string
  ): void {
    this.db
      .prepare('UPDATE plan_steps SET status = ?, result = ? WHERE id = ? AND context_id = ?')
      .run(status, result, stepId, contextId);
  }

  close(): void {
    this.db.close();
  }
}

export class MemoryStore {
  private db: Database.Database;
  private contextManager: AgentContextManager;

  constructor(dbPath?: string) {
    this.contextManager = new AgentContextManager(dbPath);
    this.db = this.contextManager['db'] as Database.Database;
  }

  saveMemoryBlock(block: Omit<MemoryBlock, 'createdAt' | 'updatedAt'>): string {
    const id = block.id || `mem_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const now = Date.now();

    this.db
      .prepare(
        `
      INSERT OR REPLACE INTO memory_blocks (id, label, content, type, project_id, user_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        id,
        block.label,
        block.content,
        block.type,
        block.projectId || null,
        block.userId || null,
        now,
        now
      );

    return id;
  }

  getMemoryBlock(id: string): MemoryBlock | null {
    const row = this.db.prepare('SELECT * FROM memory_blocks WHERE id = ?').get(id) as any;
    if (!row) return null;

    return {
      id: row.id,
      label: row.label,
      content: row.content,
      type: row.type as MemoryBlock['type'],
      projectId: row.project_id,
      userId: row.user_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  getMemoryByLabel(label: string, projectId?: string): MemoryBlock[] {
    const rows = projectId
      ? this.db
          .prepare(
            'SELECT * FROM memory_blocks WHERE label = ? AND project_id = ? ORDER BY updated_at DESC'
          )
          .all(label, projectId)
      : this.db
          .prepare('SELECT * FROM memory_blocks WHERE label = ? ORDER BY updated_at DESC')
          .all(label);

    return rows.map((row: any) => ({
      id: row.id,
      label: row.label,
      content: row.content,
      type: row.type as MemoryBlock['type'],
      projectId: row.project_id,
      userId: row.user_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));
  }

  deleteMemoryBlock(id: string): void {
    this.db.prepare('DELETE FROM memory_blocks WHERE id = ?').run(id);
  }

  saveProjectInfo(info: Omit<ProjectInfo, 'id'> & { id?: string }): string {
    const id = info.id || `proj_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    this.db
      .prepare(
        `
      INSERT OR REPLACE INTO project_info (id, name, path, tech_stack, build_commands, test_commands, conventions, domain_terms)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        id,
        info.name,
        info.path,
        JSON.stringify(info.techStack),
        JSON.stringify(info.buildCommands),
        JSON.stringify(info.testCommands),
        JSON.stringify(info.conventions),
        JSON.stringify(info.domainTerms)
      );

    return id;
  }

  getProjectInfo(path: string): ProjectInfo | null {
    const row = this.db.prepare('SELECT * FROM project_info WHERE path = ?').get(path) as any;
    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      path: row.path,
      techStack: JSON.parse(row.tech_stack || '[]'),
      buildCommands: JSON.parse(row.build_commands || '[]'),
      testCommands: JSON.parse(row.test_commands || '[]'),
      conventions: JSON.parse(row.conventions || '[]'),
      domainTerms: JSON.parse(row.domain_terms || '{}'),
    };
  }

  saveUserPreferences(
    prefs: Omit<UserPreferences, 'id' | 'createdAt' | 'updatedAt'>,
    userId = 'default'
  ): string {
    const id = `pref_${userId}`;
    const now = Date.now();

    this.db
      .prepare(
        `
      INSERT OR REPLACE INTO user_preferences (id, user_id, style, verbosity, safety_level, preferred_language, auto_confirm, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        id,
        userId,
        prefs.style,
        prefs.verbosity,
        prefs.safetyLevel,
        prefs.preferredLanguage,
        prefs.autoConfirm ? 1 : 0,
        now,
        now
      );

    return id;
  }

  getUserPreferences(userId = 'default'): UserPreferences | null {
    const row = this.db
      .prepare('SELECT * FROM user_preferences WHERE user_id = ?')
      .get(userId) as any;
    if (!row) return null;

    return {
      id: row.id,
      userId: row.user_id,
      style: row.style as UserPreferences['style'],
      verbosity: row.verbosity as UserPreferences['verbosity'],
      safetyLevel: row.safety_level as UserPreferences['safetyLevel'],
      preferredLanguage: row.preferred_language,
      autoConfirm: Boolean(row.auto_confirm),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  close(): void {
    this.contextManager.close();
  }
}
