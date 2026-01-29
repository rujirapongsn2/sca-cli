import { PolicyGate, AuditEvent } from '../../src/security/policy-gate.js';
import {
  ToolMetadata,
  PolicyConfig,
  DEFAULT_POLICY,
  TOOL_REGISTRY,
} from '../../src/security/types.js';
import * as path from 'path';
import * as fs from 'fs';

describe('PolicyGate', () => {
  let policyGate: PolicyGate;
  const testDbPath = path.join(process.cwd(), '.sca_test_policy.db');

  beforeAll(() => {
    const testDir = path.dirname(testDbPath);
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    const testDir = path.dirname(testDbPath);
    if (fs.existsSync(testDir) && fs.readdirSync(testDir).length === 0) {
      fs.rmdirSync(testDir);
    }
  });

  beforeEach(() => {
    policyGate = new PolicyGate(undefined, testDbPath);
  });

  afterEach(() => {
    policyGate.close();
  });

  describe('canCallTool', () => {
    it('should allow read_file tool with valid path', () => {
      const check = policyGate.canCallTool('read_file', { path: '/test/file.ts' });
      expect(check.allowed).toBe(true);
    });

    it('should deny read_file tool with path in denylist', () => {
      const check = policyGate.canCallTool('read_file', { path: '/test/.env' });
      expect(check.allowed).toBe(false);
      expect(check.reason).toContain('deny list');
    });

    it('should deny unknown tool', () => {
      const check = policyGate.canCallTool('unknown_tool', {});
      expect(check.allowed).toBe(false);
      expect(check.reason).toContain('Unknown tool');
    });

    it('should deny execute_command with dangerous command', () => {
      const check = policyGate.canCallTool('execute_command', { command: 'rm -rf /' });
      expect(check.allowed).toBe(false);
      expect(check.reason).toContain('deny list');
    });

    it('should allow execute_command with allowed command', () => {
      const check = policyGate.canCallTool('execute_command', { command: 'echo "hello"' });
      expect(check.allowed).toBe(true);
    });

    it('should require confirmation for write tools', () => {
      const check = policyGate.canCallTool('apply_patch', {
        filePath: '/test/file.ts',
        patch: 'diff',
      });
      expect(check.allowed).toBe(false);
      expect(check.reason).toContain('requires confirmation');
    });

    it('should allow write tools after approval', () => {
      policyGate.approveToolCall('apply_patch', 'test-user');
      const check = policyGate.canCallTool(
        'apply_patch',
        { filePath: '/test/file.ts', patch: 'diff' },
        { user_id: 'test-user' }
      );
      expect(check.allowed).toBe(true);
    });

    it('should deny network access in strict mode', () => {
      const strictConfig: Partial<PolicyConfig> = {
        ...DEFAULT_POLICY,
        deny_network: true,
      };
      const strictGate = new PolicyGate(strictConfig, testDbPath);

      const check = strictGate.canCallTool('network_request', { url: 'http://example.com' });
      expect(check.allowed).toBe(false);
      expect(check.reason).toContain('Network access is denied');

      strictGate.close();
    });

    it('should check file size limits', () => {
      const smallConfig: Partial<PolicyConfig> = {
        ...DEFAULT_POLICY,
        max_file_size: 100,
      };
      const smallGate = new PolicyGate(smallConfig, testDbPath);

      const mockStat = jest.spyOn(fs, 'statSync').mockReturnValue({ size: 200 } as fs.Stats);
      const check = smallGate.canCallTool('read_file', { path: '/test/large-file.ts' });
      expect(check.allowed).toBe(false);
      expect(check.reason).toContain('exceeds limit');

      mockStat.mockRestore();
      smallGate.close();
    });
  });

  describe('approveToolCall', () => {
    it('should store user confirmations', () => {
      policyGate.approveToolCall('execute_command', 'user1');
      expect(policyGate.getToolRegistry()['execute_command']).toBeDefined();
    });
  });

  describe('rejectToolCall', () => {
    it('should remove user confirmations', () => {
      policyGate.approveToolCall('execute_command', 'user1');
      policyGate.rejectToolCall('execute_command', 'user1');
      const check = policyGate.canCallTool(
        'execute_command',
        { command: 'echo test' },
        { user_id: 'user1' }
      );
      expect(check.allowed).toBe(false);
    });
  });

  describe('clearConfirmations', () => {
    it('should clear all confirmations for a user', () => {
      policyGate.approveToolCall('execute_command', 'user1');
      policyGate.approveToolCall('read_file', 'user1');
      policyGate.clearConfirmations('user1');

      const cmdCheck = policyGate.canCallTool(
        'execute_command',
        { command: 'echo test' },
        { user_id: 'user1' }
      );
      expect(cmdCheck.allowed).toBe(false);
    });
  });

  describe('registerTool', () => {
    it('should register new custom tool', () => {
      const customTool: ToolMetadata = {
        name: 'custom_tool',
        risk_level: 'read',
        description: 'Custom test tool',
        parameters: {},
        scope: {},
        confirmation: 'none',
      };

      policyGate.registerTool('custom_tool', customTool);
      const registry = policyGate.getToolRegistry();
      expect(registry['custom_tool']).toBeDefined();
      expect(registry['custom_tool'].name).toBe('custom_tool');
    });
  });

  describe('unregisterTool', () => {
    it('should unregister existing tool', () => {
      policyGate.unregisterTool('execute_command');
      const registry = policyGate.getToolRegistry();
      expect(registry['execute_command']).toBeUndefined();
    });
  });

  describe('logAudit', () => {
    it('should log audit events to database', () => {
      policyGate.logAudit({
        tool: 'read_file',
        action: 'test read',
        parameters: { path: '/test.ts' },
        result: 'allowed',
        user_id: 'test-user',
      });

      const logs = policyGate.getAuditLog({ tool: 'read_file' });
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].tool).toBe('read_file');
    });

    it('should filter audit logs by result', () => {
      policyGate.logAudit({ tool: 'read_file', action: 'test', parameters: {}, result: 'allowed' });
      policyGate.logAudit({ tool: 'write_file', action: 'test', parameters: {}, result: 'denied' });

      const allowedLogs = policyGate.getAuditLog({ result: 'allowed' });
      expect(allowedLogs.every((log) => log.result === 'allowed')).toBe(true);
    });
  });

  describe('getPolicyConfig', () => {
    it('should return current policy configuration', () => {
      const config = policyGate.getPolicyConfig();
      expect(config).toHaveProperty('command_allowlist');
      expect(config).toHaveProperty('path_denylist');
      expect(config).toHaveProperty('deny_network');
    });
  });

  describe('updatePolicy', () => {
    it('should update policy configuration', () => {
      policyGate.updatePolicy({ deny_network: false });
      const config = policyGate.getPolicyConfig();
      expect(config.deny_network).toBe(false);
    });
  });

  describe('Tool Registry', () => {
    it('should have default tool registry', () => {
      const registry = policyGate.getToolRegistry();
      const tools = Object.keys(registry);

      expect(tools).toContain('read_file');
      expect(tools).toContain('execute_command');
      expect(tools).toContain('apply_patch');
      expect(tools).toContain('scan_repo');
    });

    it('should have correct risk levels for tools', () => {
      const registry = policyGate.getToolRegistry();

      expect(registry['read_file'].risk_level).toBe('read');
      expect(registry['execute_command'].risk_level).toBe('exec');
      expect(registry['apply_patch'].risk_level).toBe('write');
    });
  });
});
