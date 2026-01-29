import * as fs from 'fs';
import * as path from 'path';
import Database from 'better-sqlite3';
import { ToolMetadata, PolicyConfig, PolicyCheck, DEFAULT_POLICY, TOOL_REGISTRY } from './types.js';

export interface CheckOptions {
  user_id?: string;
  project_id?: string;
  skip_confirmation?: boolean;
}

export interface AuditEvent {
  id: string;
  timestamp: Date;
  tool: string;
  action: string;
  parameters: Record<string, unknown>;
  result: 'allowed' | 'denied' | 'approved' | 'rejected';
  reason?: string;
  user_id?: string;
  project_id?: string;
  duration_ms?: number;
}

export class PolicyGate {
  private config: PolicyConfig;
  private toolRegistry: Record<string, ToolMetadata>;
  private auditLog: AuditEvent[];
  private userConfirmations: Map<string, Set<string>>;
  private db: Database.Database | null = null;

  constructor(config?: Partial<PolicyConfig>, dbPath?: string) {
    this.config = { ...DEFAULT_POLICY, ...config };
    this.toolRegistry = { ...TOOL_REGISTRY };
    this.auditLog = [];
    this.userConfirmations = new Map();
    this.initDatabase(dbPath);
  }

  private initDatabase(dbPath?: string): void {
    const dbDir = path.dirname(dbPath || '.sca/policy.db');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    this.db = new Database(dbPath || '.sca/policy.db');

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS policy_audit (
        id TEXT PRIMARY KEY,
        timestamp INTEGER,
        tool TEXT,
        action TEXT,
        parameters TEXT,
        result TEXT,
        reason TEXT,
        user_id TEXT,
        project_id TEXT,
        duration_ms INTEGER
      )
    `);
  }

  canCallTool(
    toolName: string,
    parameters: Record<string, unknown>,
    options: CheckOptions = {}
  ): PolicyCheck {
    const metadata = this.toolRegistry[toolName];

    if (!metadata) {
      return {
        allowed: false,
        reason: `Unknown tool: ${toolName}`,
        suggestions: [`Use a registered tool from ${Object.keys(this.toolRegistry).join(', ')}`],
      };
    }

    const check = this.checkRisk(metadata, parameters);
    if (!check.allowed) {
      return check;
    }

    const scopeCheck = this.checkScope(metadata, parameters);
    if (!scopeCheck.allowed) {
      return scopeCheck;
    }

    if (metadata.confirmation !== 'none') {
      const confirmationKey = `${options.user_id || 'anonymous'}:${toolName}`;
      const confirmed = this.userConfirmations
        .get(options.user_id || 'global')
        ?.has(confirmationKey);

      if (!confirmed && !options.skip_confirmation) {
        return {
          allowed: false,
          reason: `Tool "${toolName}" requires user confirmation`,
          suggestions: [
            `This tool has "${metadata.confirmation}" confirmation mode`,
            'Approve this tool call to proceed',
          ],
        };
      }
    }

    return { allowed: true };
  }

  private checkRisk(metadata: ToolMetadata, parameters: Record<string, unknown>): PolicyCheck {
    if (metadata.risk_level === 'network' && this.config.deny_network) {
      return {
        allowed: false,
        reason: 'Network access is denied in strict mode',
        suggestions: ['Use local tools instead', 'Disable strict mode to allow network'],
      };
    }

    if (metadata.risk_level === 'exec') {
      const command = parameters.command as string;
      if (command) {
        if (this.config.command_denylist.some((cmd) => command.includes(cmd))) {
          return {
            allowed: false,
            reason: `Command "${command}" is in the deny list`,
            suggestions: ['Use a safe alternative command'],
          };
        }

        if (this.config.command_allowlist.length > 0) {
          const basename = path.basename(command.split(' ')[0] || '');
          if (!this.config.command_allowlist.includes(basename)) {
            return {
              allowed: false,
              reason: `Command "${basename}" is not in the allowed list`,
              suggestions: [`Allowed commands: ${this.config.command_allowlist.join(', ')}`],
            };
          }
        }
      }
    }

    return { allowed: true };
  }

  private checkScope(metadata: ToolMetadata, parameters: Record<string, unknown>): PolicyCheck {
    const scope = metadata.scope;
    const filePath =
      parameters.path || parameters.filePath || parameters.original || parameters.patched;

    if (filePath && typeof filePath === 'string') {
      for (const denied of this.config.path_denylist) {
        if (filePath.includes(denied)) {
          return {
            allowed: false,
            reason: `Path "${filePath}" is in the deny list`,
            suggestions: ['Access a file outside the denied paths'],
          };
        }
      }

      if (scope.path_denylist) {
        for (const denied of scope.path_denylist) {
          if (filePath.includes(denied)) {
            return {
              allowed: false,
              reason: `Path "${filePath}" is not allowed for this tool`,
              suggestions: ['Use a path within the allowed scope'],
            };
          }
        }
      }

      if (scope.path_allowlist && scope.path_allowlist.length > 0) {
        if (!scope.path_allowlist.some((allowed) => filePath.startsWith(allowed))) {
          return {
            allowed: false,
            reason: `Path "${filePath}" is not in the tool's allow list`,
            suggestions: [`Allowed paths: ${scope.path_allowlist.join(', ')}`],
          };
        }
      }
    }

    if (scope.max_file_size && typeof filePath === 'string') {
      try {
        const stats = fs.statSync(filePath);
        if (stats.size > scope.max_file_size) {
          return {
            allowed: false,
            reason: `File size (${stats.size}) exceeds limit (${scope.max_file_size})`,
            suggestions: ['Use a smaller file or use chunking'],
          };
        }
      } catch {}
    }

    return { allowed: true };
  }

  approveToolCall(toolName: string, userId: string = 'global'): void {
    if (!this.userConfirmations.has(userId)) {
      this.userConfirmations.set(userId, new Set());
    }
    this.userConfirmations.get(userId)?.add(`${userId}:${toolName}`);
  }

  rejectToolCall(toolName: string, userId: string = 'global'): void {
    this.userConfirmations.get(userId)?.delete(`${userId}:${toolName}`);
  }

  clearConfirmations(userId: string = 'global'): void {
    this.userConfirmations.delete(userId);
  }

  logAudit(event: Omit<AuditEvent, 'id' | 'timestamp'>): void {
    const auditEvent: AuditEvent = {
      ...event,
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      timestamp: new Date(),
    };

    this.auditLog.push(auditEvent);

    try {
      if (this.db) {
        this.db
          .prepare(
            `
          INSERT INTO policy_audit (id, timestamp, tool, action, parameters, result, reason, user_id, project_id, duration_ms)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
          )
          .run(
            auditEvent.id,
            auditEvent.timestamp.getTime(),
            auditEvent.tool,
            auditEvent.action,
            JSON.stringify(auditEvent.parameters),
            auditEvent.result,
            auditEvent.reason || null,
            auditEvent.user_id || null,
            auditEvent.project_id || null,
            auditEvent.duration_ms || null
          );
      }
    } catch (error) {
      console.error('Failed to write audit log:', error);
    }
  }

  getAuditLog(filters?: {
    tool?: string;
    user_id?: string;
    start_date?: Date;
    end_date?: Date;
    result?: string;
  }): AuditEvent[] {
    let logs = [...this.auditLog];

    if (filters) {
      if (filters.tool) {
        logs = logs.filter((log) => log.tool === filters.tool);
      }
      if (filters.user_id) {
        logs = logs.filter((log) => log.user_id === filters.user_id);
      }
      if (filters.result) {
        logs = logs.filter((log) => log.result === filters.result);
      }
      if (filters.start_date) {
        logs = logs.filter((log) => log.timestamp >= filters.start_date!);
      }
      if (filters.end_date) {
        logs = logs.filter((log) => log.timestamp <= filters.end_date!);
      }
    }

    return logs;
  }

  registerTool(name: string, metadata: ToolMetadata): void {
    this.toolRegistry[name] = metadata;
  }

  unregisterTool(name: string): void {
    delete this.toolRegistry[name];
  }

  getToolRegistry(): Record<string, ToolMetadata> {
    return { ...this.toolRegistry };
  }

  getPolicyConfig(): PolicyConfig {
    return { ...this.config };
  }

  updatePolicy(config: Partial<PolicyConfig>): void {
    this.config = { ...this.config, ...config };
  }

  close(): void {
    if (this.db) {
      this.db.close();
    }
  }
}
