import { PolicyGate } from '../../src/security/policy-gate.js';
import * as path from 'path';
import * as fs from 'fs';

describe('PolicyGate Basic Tests', () => {
  let policyGate: PolicyGate;
  const testDbPath = path.join(process.cwd(), '.sca_test_policy_basic.db');

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
  });

  beforeEach(() => {
    policyGate = new PolicyGate(undefined, testDbPath);
  });

  afterEach(() => {
    policyGate.close();
  });

  test('should allow read_file tool with valid path', () => {
    const check = policyGate.canCallTool('read_file', { path: '/test/file.ts' });
    expect(check.allowed).toBe(true);
  });

  test('should deny read_file tool with path in denylist', () => {
    const check = policyGate.canCallTool('read_file', { path: '/test/.env' });
    expect(check.allowed).toBe(false);
  });

  test('should deny unknown tool', () => {
    const check = policyGate.canCallTool('unknown_tool', {});
    expect(check.allowed).toBe(false);
  });

  test('should allow execute_command with safe command but require confirmation', () => {
    const check = policyGate.canCallTool('execute_command', { command: 'echo hello' });
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain('user confirmation');
  });

  test('should have default tool registry', () => {
    const registry = policyGate.getToolRegistry();
    expect(registry['read_file']).toBeDefined();
    expect(registry['execute_command']).toBeDefined();
    expect(registry['apply_patch']).toBeDefined();
  });
});
