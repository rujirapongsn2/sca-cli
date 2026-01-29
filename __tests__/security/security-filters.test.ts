import { SecurityFilter, ScanResult } from '../../src/security/security-filters.js';

describe('SecurityFilter', () => {
  let filter: SecurityFilter;

  beforeEach(() => {
    filter = new SecurityFilter();
  });

  describe('scan', () => {
    it('should detect AWS access keys', () => {
      const content = 'AKIAIOSFODNN7EXAMPLE';
      const result = filter.scan(content);
      expect(result.hasSecrets).toBe(true);
      expect(result.detectedSecrets.length).toBeGreaterThan(0);
      expect(result.detectedSecrets[0].severity).toBe('critical');
    });

    it('should detect GitHub tokens', () => {
      const content = 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
      const result = filter.scan(content);
      expect(result.hasSecrets).toBe(true);
      expect(result.detectedSecrets[0].type).toBe('GitHub Token');
    });

    it('should detect JWT tokens', () => {
      const content =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ';
      const result = filter.scan(content);
      expect(result.hasSecrets).toBe(true);
    });

    it('should detect API keys', () => {
      const content = 'api_key=abcdefghijklmnopqrstuv';
      const result = filter.scan(content);
      expect(result.hasSecrets).toBe(true);
    });

    it('should detect email addresses (PII)', () => {
      const content = 'Contact: user@example.com';
      const result = filter.scan(content);
      expect(result.hasPII).toBe(true);
      expect(result.detectedPII[0].type).toBe('Email Address');
    });

    it('should detect phone numbers (PII)', () => {
      const content = 'Call me at 555-123-4567';
      const result = filter.scan(content);
      expect(result.hasPII).toBe(true);
      expect(result.detectedPII[0].type).toBe('Phone Number');
    });

    it('should return hasSecrets=false for clean content', () => {
      const content = 'This is clean code with no secrets.';
      const result = filter.scan(content);
      expect(result.hasSecrets).toBe(false);
      expect(result.hasPII).toBe(false);
    });

    it('should detect multiple secrets', () => {
      const content = `
        AWS_KEY=AKIAIOSFODNN7EXAMPLE
        GITHUB_TOKEN=ghp_xxxxxxxxxxxxx
        api_key=mysecretapikey123
      `;
      const result = filter.scan(content);
      expect(result.hasSecrets).toBe(true);
      expect(result.detectedSecrets.length).toBeGreaterThanOrEqual(3);
    });

    it('should include position information for detected secrets', () => {
      const content = 'password=secret123';
      const result = filter.scan(content);
      expect(result.detectedSecrets.length).toBeGreaterThan(0);
      expect(result.detectedSecrets[0].position).toBeDefined();
      expect(result.detectedSecrets[0].position.start).toBeGreaterThanOrEqual(0);
      expect(result.detectedSecrets[0].position.end).toBeGreaterThan(
        result.detectedSecrets[0].position.start
      );
    });
  });

  describe('redact', () => {
    it('should redact secrets with default mask character', () => {
      const content = 'password=secret123';
      const redacted = filter.redact(content);
      expect(redacted).not.toContain('secret123');
      expect(redacted).toContain('█');
    });

    it('should redact with custom mask character', () => {
      const content = 'password=secret123';
      const redacted = filter.redact(content, { maskCharacter: '*' });
      expect(redacted).not.toContain('secret123');
      expect(redacted).toContain('*');
    });

    it('should redact PII', () => {
      const content = 'Email: user@example.com';
      const redacted = filter.redact(content);
      expect(redacted).not.toContain('user@example.com');
    });
  });

  describe('filterForLLM', () => {
    it('should redact both secrets and PII', () => {
      const content = `
        API Key: sk-abc123def456
        Email: user@example.com
        Phone: 555-123-4567
      `;
      const filtered = filter.filterForLLM(content);
      expect(filtered).not.toContain('sk-abc123def456');
      expect(filtered).not.toContain('user@example.com');
      expect(filtered).not.toContain('555-123-4567');
    });

    it('should preserve structure of code', () => {
      const content = `
        function authenticate() {
          const apiKey = 'REDACTED';
          return true;
        }
      `;
      const filtered = filter.filterForLLM(content);
      expect(filtered).toContain('function');
      expect(filtered).toContain('authenticate');
    });
  });

  describe('registerPattern', () => {
    it('should register custom secret pattern', () => {
      filter.registerPattern('CUSTOM_SECRET', 'CUSTOM_[A-Z]+');
      const content = 'CUSTOM_MYSECRETVALUE';
      const result = filter.scan(content);
      expect(result.detectedSecrets.some((s) => s.type === 'CUSTOM_SECRET')).toBe(true);
    });
  });

  describe('unregisterPattern', () => {
    it('should remove custom pattern', () => {
      filter.registerPattern('TEST_PATTERN', 'TEST_[0-9]+');
      filter.unregisterPattern('TEST_PATTERN');
      const content = 'TEST_12345';
      const result = filter.scan(content);
      expect(result.detectedSecrets.some((s) => s.type === 'TEST_PATTERN')).toBe(false);
    });
  });

  describe('ScanResult structure', () => {
    it('should return proper ScanResult structure', () => {
      const content = 'password=secret';
      const result = filter.scan(content);
      expect(result).toHaveProperty('hasSecrets');
      expect(result).toHaveProperty('hasPII');
      expect(result).toHaveProperty('redactedContent');
      expect(result).toHaveProperty('detectedSecrets');
      expect(result).toHaveProperty('detectedPII');
    });
  });
});
