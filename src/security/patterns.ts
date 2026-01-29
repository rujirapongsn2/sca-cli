export const SECRET_PATTERNS = [
  'AKIA[0-9A-Z]{16}',
  'ghp_[0-9a-zA-Z]{36}',
  'eyJ[a-zA-Z0-9_-]*\\.eyJ[a-zA-Z0-9_-]*\\.[a-zA-Z0-9_-]*',
  'Bearer [a-zA-Z0-9_-]',
  'api[_-]?key[=:]?["\']?[0-9a-zA-Z_-]{16,}["\']?',
  'password[=:]?["\']?[^"\'\\s]{8,}["\']?',
  'secret[=:]?["\']?[^"\'\\s]{8,}["\']?',
  'token[=:]?["\']?[a-zA-Z0-9_-]{20,}["\']?',
];

export const PII_PATTERNS = [
  '\\b\\d{3}[-.]?\\d{3}[-.]?\\d{4}\\b',
  '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b',
  '\\b\\d{3}[-\\s]?\\d{2}[-\\s]?\\d{4}\\b',
  '\\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14})\\b',
];

export const SUSPICIOUS_PATTERNS = [
  '\\$\\{.*\\}',
  '\\$\\(.*\\)',
  'eval\\s*\\(',
  'exec\\s*\\(',
  'subprocess',
  'os\\.system',
  'os\\.popen',
  'process\\.exec',
  'child_process',
];
