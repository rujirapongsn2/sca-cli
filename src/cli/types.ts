export interface Config {
  workspace_root: string;
  model: ModelConfig;
  policies: PolicyConfig;
  commands: CommandConfig;
  memory: MemoryConfig;
  privacy: PrivacyConfig;
}

export interface ModelConfig {
  provider: 'local' | 'external';
  endpoint: string;
  model?: string;
  api_key?: string;
}

export interface PolicyConfig {
  exec_allowlist: string[];
  path_allowlist: string[];
  path_denylist: string[];
}

export interface CommandConfig {
  presets: Record<string, string[]>;
}

export interface MemoryConfig {
  mode: 'off' | 'project' | 'project+user';
}

export interface PrivacyConfig {
  strict_mode: boolean;
}

export interface SessionState {
  id: string;
  start_time: Date;
  workspace?: string;
  last_task?: string;
  actions: AuditEvent[];
}

export interface AuditEvent {
  timestamp: Date;
  type: string;
  details: Record<string, unknown>;
  approved: boolean;
}

export type RiskLevel = 'read' | 'write' | 'exec' | 'network';
