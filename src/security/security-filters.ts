const SECRET_PATTERNS = [
  'AKIA[0-9A-Z]{16}',
  'ghp_[0-9a-zA-Z]{36}',
  'eyJ[a-zA-Z0-9_-]*\\.eyJ[a-zA-Z0-9_-]*\\.[a-zA-Z0-9_-]*',
  'Bearer [a-zA-Z0-9_-]',
  'api[_-]?key[=:]?["\']?[0-9a-zA-Z_-]{16,}["\']?',
  'password[=:]?["\']?[^"\'\\s]{8,}["\']?',
  'secret[=:]?["\']?[^"\'\\s]{8,}["\']?',
  'token[=:]?["\']?[a-zA-Z0-9_-]{20,}["\']?',
];

const PII_PATTERNS = [
  '\\b\\d{3}[-.]?\\d{3}[-.]?\\d{4}\\b',
  '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b',
  '\\b\\d{3}[-\\s]?\\d{2}[-\\s]?\\d{4}\\b',
  '\\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14})\\b',
];

export interface ScanResult {
  hasSecrets: boolean;
  hasPII: boolean;
  redactedContent: string;
  detectedSecrets: DetectedItem[];
  detectedPII: DetectedItem[];
}

export interface DetectedItem {
  type: string;
  value: string;
  position: { start: number; end: number };
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface FilterOptions {
  redactSecrets: boolean;
  redactPII: boolean;
  maskCharacter: string;
  maxSeverity: 'critical' | 'high' | 'medium' | 'low';
}

export const DEFAULT_FILTER_OPTIONS: FilterOptions = {
  redactSecrets: true,
  redactPII: true,
  maskCharacter: '█',
  maxSeverity: 'medium',
};

export class SecurityFilter {
  private secretPatterns: RegExp[];
  private piiPatterns: RegExp[];
  private customPatterns: Map<string, RegExp>;

  constructor() {
    this.secretPatterns = SECRET_PATTERNS.map((p: string) => new RegExp(p, 'gi'));
    this.piiPatterns = PII_PATTERNS.map((p: string) => new RegExp(p, 'gi'));
    this.customPatterns = new Map();
  }

  registerPattern(name: string, pattern: string): void {
    this.customPatterns.set(name, new RegExp(pattern, 'gi'));
  }

  unregisterPattern(name: string): void {
    this.customPatterns.delete(name);
  }

  scan(content: string, options: Partial<FilterOptions> = {}): ScanResult {
    const opts = { ...DEFAULT_FILTER_OPTIONS, ...options };
    let redactedContent = content;
    const detectedSecrets: DetectedItem[] = [];
    const detectedPII: DetectedItem[] = [];

    for (let i = 0; i < this.secretPatterns.length; i++) {
      const pattern = this.secretPatterns[i];
      const patternString = SECRET_PATTERNS[i] ?? '';
      let match: RegExpExecArray | null;

      if (!pattern) continue;
      pattern.lastIndex = 0;
      while ((match = pattern.exec(content)) !== null) {
        detectedSecrets.push({
          type: this.getSecretType(patternString),
          value: match[0],
          position: { start: match.index, end: match.index + match[0].length },
          severity: this.getSecretSeverity(patternString),
        });

        if (opts.redactSecrets) {
          redactedContent = this.redactMatch(
            redactedContent,
            match.index,
            match[0].length,
            opts.maskCharacter
          );
        }
      }
    }

    for (let i = 0; i < this.piiPatterns.length; i++) {
      const pattern = this.piiPatterns[i];
      const patternString = PII_PATTERNS[i] ?? '';
      let match: RegExpExecArray | null;

      if (!pattern) continue;
      pattern.lastIndex = 0;
      while ((match = pattern.exec(content)) !== null) {
        detectedPII.push({
          type: this.getPIIType(patternString),
          value: match[0],
          position: { start: match.index, end: match.index + match[0].length },
          severity: this.getPIIseverity(patternString),
        });

        if (opts.redactPII) {
          redactedContent = this.redactMatch(
            redactedContent,
            match.index,
            match[0].length,
            opts.maskCharacter
          );
        }
      }
    }

    for (const [name, pattern] of this.customPatterns) {
      let match: RegExpExecArray | null;

      pattern.lastIndex = 0;
      while ((match = pattern.exec(content)) !== null) {
        detectedSecrets.push({
          type: name,
          value: match[0],
          position: { start: match.index, end: match.index + match[0].length },
          severity: 'high',
        });

        if (opts.redactSecrets) {
          redactedContent = this.redactMatch(
            redactedContent,
            match.index,
            match[0].length,
            opts.maskCharacter
          );
        }
      }
    }

    return {
      hasSecrets: detectedSecrets.length > 0,
      hasPII: detectedPII.length > 0,
      redactedContent,
      detectedSecrets,
      detectedPII,
    };
  }

  redact(content: string, options: Partial<FilterOptions> = {}): string {
    const result = this.scan(content, options);
    return result.redactedContent;
  }

  private redactMatch(content: string, start: number, length: number, maskChar: string): string {
    const before = content.slice(0, start);
    const match = content.slice(start, start + length);
    const after = content.slice(start + length);
    const masked = maskChar.repeat(match.length);
    return before + masked + after;
  }

  private getSecretType(pattern: string): string {
    if (pattern.includes('AKIA') || pattern.includes('aws')) return 'AWS Access Key';
    if (pattern.includes('ghp_') || pattern.includes('github')) return 'GitHub Token';
    if (pattern.includes('eyJ') || pattern.includes('jwt')) return 'JWT Token';
    if (pattern.includes('Bearer')) return 'Bearer Token';
    if (pattern.includes('api[_-]?key')) return 'API Key';
    return 'Secret';
  }

  private getSecretSeverity(pattern: string): 'critical' | 'high' | 'medium' | 'low' {
    if (pattern.includes('AKIA') || pattern.includes('ghp_')) return 'critical';
    if (pattern.includes('eyJ') || pattern.includes('Bearer')) return 'high';
    return 'medium';
  }

  private getPIIType(pattern: string): string {
    if (pattern.includes('d{3')) return 'Phone Number';
    if (pattern.includes('@')) return 'Email Address';
    return 'PII';
  }

  private getPIIseverity(pattern: string): 'critical' | 'high' | 'medium' | 'low' {
    if (pattern.includes('d{3')) return 'high';
    return 'medium';
  }

  filterForLLM(content: string): string {
    return this.redact(content, {
      redactSecrets: true,
      redactPII: true,
      maskCharacter: '█',
      maxSeverity: 'medium',
    });
  }
}

export const securityFilter = new SecurityFilter();
