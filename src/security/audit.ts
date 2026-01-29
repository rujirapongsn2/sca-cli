import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import Database from 'better-sqlite3';

export interface PolicyAuditEvent {
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

export interface ExtendedAuditEvent {
  timestamp: Date;
  type: string;
  session_id: string;
  workspace?: string;
  details: Record<string, unknown>;
  approved: boolean;
}

export class ExtendedAuditLogger {
  private static instance: ExtendedAuditLogger;
  private logDir: string;
  private db: Database.Database | null = null;
  private currentSessionId: string | null = null;

  private constructor() {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    this.logDir = path.join(homeDir, '.softnix-code-agent', 'logs');
    this.ensureLogDir();
    this.initDatabase();
  }

  static getInstance(): ExtendedAuditLogger {
    if (!ExtendedAuditLogger.instance) {
      ExtendedAuditLogger.instance = new ExtendedAuditLogger();
    }
    return ExtendedAuditLogger.instance;
  }

  private ensureLogDir(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private initDatabase(): void {
    try {
      const dbPath = path.join(this.logDir, 'audit.db');
      this.db = new Database(dbPath);
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
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          start_time INTEGER,
          end_time INTEGER,
          workspace TEXT,
          actions_count INTEGER
        )
      `);
    } catch (error) {
      console.error('Failed to initialize audit database:', error);
    }
  }

  startSession(workspace?: string): string {
    const sessionId = crypto.randomUUID();
    this.currentSessionId = sessionId;

    if (this.db) {
      this.db
        .prepare(
          `
        INSERT INTO sessions (id, start_time, workspace, actions_count)
        VALUES (?, ?, ?, 0)
      `
        )
        .run(sessionId, Date.now(), workspace || null);
    }

    this.logToFile('session_start', { sessionId, workspace });
    return sessionId;
  }

  logPolicyEvent(event: Omit<PolicyAuditEvent, 'id' | 'timestamp'>): void {
    const fullEvent: PolicyAuditEvent = {
      ...event,
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      timestamp: new Date(),
    };

    if (this.db) {
      try {
        this.db
          .prepare(
            `
          INSERT INTO policy_audit (id, timestamp, tool, action, parameters, result, reason, user_id, project_id, duration_ms)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
          )
          .run(
            fullEvent.id,
            fullEvent.timestamp.getTime(),
            fullEvent.tool,
            fullEvent.action,
            JSON.stringify(fullEvent.parameters),
            fullEvent.result,
            fullEvent.reason || null,
            fullEvent.user_id || null,
            fullEvent.project_id || null,
            fullEvent.duration_ms || null
          );

        this.db
          .prepare(
            `
          UPDATE sessions SET actions_count = actions_count + 1 WHERE id = ?
        `
          )
          .run(this.currentSessionId);
      } catch (error) {
        console.error('Failed to write policy audit event:', error);
      }
    }

    this.logToFile('policy_event', fullEvent as unknown as Record<string, unknown>);
  }

  logEvent(type: string, details: Record<string, unknown>, approved: boolean): void {
    if (!this.currentSessionId) return;

    const event: ExtendedAuditEvent = {
      timestamp: new Date(),
      type,
      session_id: this.currentSessionId,
      details,
      approved,
    };

    this.logToFile(type, event as unknown as Record<string, unknown>);
  }

  private logToFile(type: string, data: Record<string, unknown>): void {
    try {
      const timestamp = new Date().toISOString();
      const logLine = JSON.stringify({ timestamp, type, ...data });
      const logFile = path.join(this.logDir, `audit-${new Date().toISOString().split('T')[0]}.log`);
      fs.appendFileSync(logFile, logLine + '\n');
    } catch (error) {
      console.error('Failed to write audit log to file:', error);
    }
  }

  endSession(): void {
    if (this.currentSessionId && this.db) {
      this.db
        .prepare(
          `
        UPDATE sessions SET end_time = ? WHERE id = ?
      `
        )
        .run(Date.now(), this.currentSessionId);

      this.logToFile('session_end', { sessionId: this.currentSessionId });
      this.currentSessionId = null;
    }
  }

  getPolicyAuditLogs(filters?: {
    tool?: string;
    user_id?: string;
    start_date?: Date;
    end_date?: Date;
    result?: string;
  }): PolicyAuditEvent[] {
    if (!this.db) return [];

    let query = 'SELECT * FROM policy_audit WHERE 1=1';
    const params: unknown[] = [];

    if (filters?.tool) {
      query += ' AND tool = ?';
      params.push(filters.tool);
    }
    if (filters?.user_id) {
      query += ' AND user_id = ?';
      params.push(filters.user_id);
    }
    if (filters?.result) {
      query += ' AND result = ?';
      params.push(filters.result);
    }
    if (filters?.start_date) {
      query += ' AND timestamp >= ?';
      params.push(filters.start_date.getTime());
    }
    if (filters?.end_date) {
      query += ' AND timestamp <= ?';
      params.push(filters.end_date.getTime());
    }

    query += ' ORDER BY timestamp DESC LIMIT 1000';

    const rows = this.db.prepare(query).all(...params) as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      id: row.id as string,
      timestamp: new Date(row.timestamp as number),
      tool: row.tool as string,
      action: row.action as string,
      parameters: JSON.parse(row.parameters as string),
      result: row.result as 'allowed' | 'denied' | 'approved' | 'rejected',
      reason: row.reason as string | undefined,
      user_id: row.user_id as string | undefined,
      project_id: row.project_id as string | undefined,
      duration_ms: row.duration_ms as number | undefined,
    }));
  }

  getRecentLogs(count: number = 50): string[] {
    const logs: string[] = [];
    const files = fs
      .readdirSync(this.logDir)
      .filter((f) => f.startsWith('audit-') && f.endsWith('.log'))
      .sort();

    for (const file of files.slice(-5)) {
      try {
        const content = fs.readFileSync(path.join(this.logDir, file), 'utf-8');
        logs.push(...content.trim().split('\n').slice(-count));
      } catch {}
    }

    return logs.slice(-count);
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export const auditLogger = ExtendedAuditLogger.getInstance();
