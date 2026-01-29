export interface SecretPattern {
  name: string;
  pattern: RegExp;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface RedactionRule {
  pattern: RegExp;
  replacement: string;
}

export class MemoryProtection {
  private secretPatterns: SecretPattern[] = [
    {
      name: 'AWS Access Key',
      pattern: /AKIA[0-9A-Z]{16}/,
      severity: 'critical',
    },
    {
      name: 'AWS Secret Key',
      pattern: /[\w+]{40}/,
      severity: 'critical',
    },
    {
      name: 'GitHub Token',
      pattern: /(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,}/,
      severity: 'critical',
    },
    {
      name: 'Generic API Key',
      pattern: /api[_-]?key['"]?\s*[:=]\s*['"]?[A-Za-z0-9_-]{20,}['"]?/gi,
      severity: 'high',
    },
    {
      name: 'Bearer Token',
      pattern: /Bearer\s+[A-Za-z0-9_\-\.]+/gi,
      severity: 'high',
    },
    {
      name: 'Database URL',
      pattern: /(mongodb(\+srv)?|postgres|postgresql|mysql|redis):\/\/[^\s"'<>]+/gi,
      severity: 'high',
    },
    {
      name: 'Private Key',
      pattern: /-----BEGIN\s+(?:RSA|DSA|EC|PGP|OPENSSH)?\s+PRIVATE KEY-----/g,
      severity: 'critical',
    },
    {
      name: 'JWT Token',
      pattern: /eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/g,
      severity: 'high',
    },
  ];

  private redactionRules: RedactionRule[] = [
    { pattern: /[A-Za-z0-9]{32}/g, replacement: '[HASH]' },
    { pattern: /[A-Za-z0-9+\/]{40,}={0,2}/g, replacement: '[TOKEN]' },
    { pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, replacement: '[PHONE]' },
    { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: '[EMAIL]' },
  ];

  private excludedPaths = [
    '.env',
    '.env.local',
    '.env.*.local',
    'secrets/',
    'private/',
    'keys/',
    'credentials/',
    '.aws/',
    '.ssh/',
    '.gnupg/',
  ];

  private excludedFiles = [
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    'bun.lockb',
    '*.min.js',
    '*.min.css',
  ];

  scanForSecrets(content: string): { found: string[]; cleanedContent: string } {
    const found: string[] = [];
    let cleanedContent = content;

    for (const secretPattern of this.secretPatterns) {
      const matches = content.match(secretPattern.pattern);
      if (matches) {
        for (const match of matches) {
          found.push(`${secretPattern.name} (${secretPattern.severity})`);
          cleanedContent = cleanedContent.replace(match, `[REDACTED ${secretPattern.name.toUpperCase().replace(' ', '_')}]`);
        }
      }
    }

    return { found, cleanedContent };
  }

  redact(content: string): string {
    let redacted = content;

    for (const rule of this.redactionRules) {
      redacted = redacted.replace(rule.pattern, rule.replacement);
    }

    return redacted;
  }

  isPathExcluded(filePath: string): boolean {
    const fileName = filePath.split('/').pop() || '';

    for (const excludedPath of this.excludedPaths) {
      if (filePath.includes(excludedPath)) {
        return true;
      }
    }

    for (const excludedFile of this.excludedFiles) {
      if (excludedFile.startsWith('*.')) {
        const ext = excludedFile.slice(1);
        if (fileName.endsWith(ext)) {
          return true;
        }
      } else if (fileName === excludedFile) {
        return true;
      }
    }

    return false;
  }

  shouldStoreContent(filePath: string, content: string): { allowed: boolean; reason?: string } {
    if (this.isPathExcluded(filePath)) {
      return { allowed: false, reason: 'Path is excluded for security reasons' };
    }

    const { found } = this.scanForSecrets(content);
    if (found.length > 0) {
      return { allowed: false, reason: `Content contains secrets: ${found.join(', ')}` };
    }

    return { allowed: true };
  }

  createSafeMemoryBlock(content: string, _label: string): { safe: boolean; content: string; warnings: string[] } {
    const warnings: string[] = [];
    const { found, cleanedContent } = this.scanForSecrets(content);

    if (found.length > 0) {
      warnings.push(`Secrets detected and will be redacted: ${found.join(', ')}`);
    }

    const redactedContent = this.redact(cleanedContent);

    return {
      safe: warnings.length === 0,
      content: redactedContent,
      warnings,
    };
  }

  addExcludedPath(path: string): void {
    if (!this.excludedPaths.includes(path)) {
      this.excludedPaths.push(path);
    }
  }

  addSecretPattern(name: string, pattern: RegExp, severity: 'critical' | 'high' | 'medium' | 'low'): void {
    this.secretPatterns.push({ name, pattern, severity });
  }

  addRedactionRule(pattern: RegExp, replacement: string): void {
    this.redactionRules.push({ pattern, replacement });
  }

  getSecurityReport(): {
    totalPatterns: number;
    excludedPaths: number;
    redactionRules: number;
  } {
    return {
      totalPatterns: this.secretPatterns.length,
      excludedPaths: this.excludedPaths.length,
      redactionRules: this.redactionRules.length,
    };
  }
}