import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { AuditEvent, SessionState } from './types.js';

export class AuditLogger {
  private static instance: AuditLogger;
  private logDir: string;
  private currentSession: SessionState | null = null;

  private constructor() {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    this.logDir = path.join(homeDir, '.softnix-code-agent', 'logs');
    this.ensureLogDir();
  }

  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  private ensureLogDir(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  startSession(workspace?: string): string {
    const sessionId = crypto.randomUUID();
    this.currentSession = {
      id: sessionId,
      start_time: new Date(),
      workspace,
      actions: [],
    };
    this.log('session_start', { sessionId, workspace });
    return sessionId;
  }

  logEvent(type: string, details: Record<string, unknown>, approved: boolean): void {
    if (!this.currentSession) {
      return;
    }

    const event: AuditEvent = {
      timestamp: new Date(),
      type,
      details: {
        ...details,
        diff_hash: details.diff
          ? crypto.createHash('sha256').update(JSON.stringify(details.diff)).digest('hex')
          : undefined,
      },
      approved,
    };

    this.currentSession.actions.push(event);
    this.log(type, { sessionId: this.currentSession.id, ...event });
  }

  private log(type: string, data: Record<string, unknown>): void {
    const timestamp = new Date().toISOString();
    const logLine = JSON.stringify({ timestamp, type, ...data });
    const logFile = path.join(this.logDir, `audit-${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFileSync(logFile, logLine + '\n');
  }

  endSession(): void {
    if (this.currentSession) {
      this.log('session_end', { sessionId: this.currentSession.id });
      this.currentSession = null;
    }
  }

  getSessionState(): SessionState | null {
    return this.currentSession;
  }

  getRecentLogs(count: number = 50): string[] {
    const logs: string[] = [];
    const files = fs
      .readdirSync(this.logDir)
      .filter((f) => f.startsWith('audit-'))
      .sort();
    for (const file of files.slice(-5)) {
      const content = fs.readFileSync(path.join(this.logDir, file), 'utf-8');
      logs.push(...content.trim().split('\n').slice(-count));
    }
    return logs.slice(-count);
  }
}
