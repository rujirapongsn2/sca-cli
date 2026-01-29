# Security Policy

Comprehensive documentation of Softnix Code Agent's security model, policies, and protections.

## Security Principles

### 1. Local-First Architecture

All processing happens on the local machine:

- No data is sent to external servers (unless explicitly configured)
- LLM inference runs locally or via configured endpoints
- All file operations are local
- Memory is stored locally in SQLite

### 2. Deny-by-Default Security

Default security posture is restrictive:

- Network access is blocked by default
- Dangerous commands are blocked by default
- Sensitive paths are protected by default
- Write operations require confirmation

### 3. Transparency & Auditability

All actions are logged and traceable:

- Complete audit trail in SQLite
- Human-readable audit logs
- Configurable log retention
- Export capabilities for compliance

## Policy Gate

The Policy Gate is the central security enforcement point.

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                    Tool Execution Request                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Policy Gate Check                        │
├─────────────────────────────────────────────────────────────┤
│  1. Tool Metadata Validation                                │
│  2. Risk Level Assessment (read/write/exec/network)        │
│  3. Scope Validation (paths, commands)                      │
│  4. Confirmation Requirements                               │
│  5. Policy Rules Engine                                    │
└─────────────────────────────────────────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            ▼                               ▼
    ┌───────────────┐               ┌───────────────┐
    │   ALLOWED    │               │    DENIED    │
    └───────────────┘               └───────────────┘
            │                               │
            ▼                               ▼
    ┌───────────────┐               ┌───────────────┐
    │  Execute &   │               │  Log &       │
    │  Log Result  │               │  Reject     │
    └───────────────┘               └───────────────┘
```

### Tool Metadata

Every tool has metadata that determines its security profile:

```typescript
interface ToolMetadata {
  name: string;
  risk_level: 'read' | 'write' | 'exec' | 'network';
  description: string;
  parameters: Record<string, ParameterMetadata>;
  scope: ToolScope;
  confirmation: 'none' | 'once' | 'always';
}
```

### Risk Levels

| Level     | Description          | Examples                 |
| --------- | -------------------- | ------------------------ |
| `read`    | Read-only operations | file reading, grep, scan |
| `write`   | File modification    | edit, apply_patch        |
| `exec`    | Command execution    | run, execute_command     |
| `network` | Network access       | http requests, API calls |

### Confirmation Modes

| Mode     | Behavior                 |
| -------- | ------------------------ |
| `none`   | No confirmation required |
| `once`   | Confirm once per session |
| `always` | Confirm every execution  |

## Default Security Configuration

```yaml
policies:
  # Network access
  deny_network: true # Block all network by default

  # File path restrictions
  path_allowlist: []
  path_denylist:
    - .env
    - secrets/
    - credentials/
    - .ssh/
    - .aws/
    - .gnupg/

  # Command allowlist/denylist
  command_allowlist:
    - echo
    - ls
    - cat
    - grep
    - find
    - pytest
    - npm
    - go
    - cargo
    - make
    - git
  command_denylist:
    - rm
    - dd
    - mkfs
    - format
    - chmod
    - chown
    - sudo
    - su
```

## Security Filters

### Secret Detection

Automatic scanning for sensitive data:

```typescript
const SECRET_PATTERNS = [
  'AKIA[0-9A-Z]{16}', // AWS Access Key
  'ghp_[0-9a-zA-Z]{36}', // GitHub Token
  'eyJ[a-zA-Z0-9_-]*\\.eyJ.*', // JWT Token
  'Bearer [a-zA-Z0-9_-]', // Bearer Token
  'api[_-]?key[=:]?["\']?', // Generic API Key
  'password[=:]?', // Password
  'secret[=:]?', // Secret
  'token[=:]?', // Token
];
```

### PII Detection

Automatic scanning for personally identifiable information:

```typescript
const PII_PATTERNS = [
  '\\d{3}[-.]?\\d{3}[-.]?\\d{4}', // Phone numbers
  '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}', // Email
  '\\d{3}[-\\s]?\\d{2}[-\s]?\\d{4}', // SSN pattern
  '(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14})', // Credit card
];
```

### Memory Protection

Automatic redaction before storing in memory:

```typescript
class MemoryProtection {
  scanForSecrets(content: string): DetectedItem[];
  redact(content: string): string;
  isPathExcluded(filePath: string): boolean;
}
```

## Audit Logging

### Schema

```sql
CREATE TABLE policy_audit (
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
);
```

### Log Fields

| Field         | Description                      |
| ------------- | -------------------------------- |
| `id`          | Unique audit event ID            |
| `timestamp`   | Event timestamp (Unix epoch)     |
| `tool`        | Tool that was executed           |
| `action`      | Description of action            |
| `parameters`  | JSON-encoded parameters          |
| `result`      | allowed/denied/approved/rejected |
| `reason`      | Reason for decision              |
| `user_id`     | User identifier                  |
| `duration_ms` | Execution time                   |

### Viewing Audit Logs

```bash
# View all logs
sca audit view

# Filter by tool
sca audit view --tool read_file

# Filter denied operations
sca audit view --result denied --limit 50
```

## Security Best Practices

### 1. Keep strict_mode enabled

```yaml
privacy:
  strict_mode: true
```

This ensures no data leaves your machine.

### 2. Review audit logs regularly

```bash
sca audit view --result denied
```

### 3. Customize command allowlist

Only allow commands specific to your project:

```yaml
policies:
  command_allowlist:
    - pytest # Only pytest for testing
    - npm # npm for package management
    - make # make for builds
```

### 4. Protect sensitive paths

```yaml
policies:
  path_denylist:
    - .env
    - .secrets/
    - credentials/
    - keys/
```

## Threat Model

### Protected Against

- **Accidental file deletion**: rm in denylist
- **Unauthorized code execution**: Command allowlist
- **Data exfiltration**: Network deny-by-default
- **Credential leakage**: Secret scanning and redaction
- **Path traversal attacks**: Path normalization and validation

### Not Protected Against (Limitations)

- Malicious user input in allowed commands
- Vulnerabilities in LLM prompts (prompt injection)
- Compromised local LLM endpoint
- Social engineering attacks

## Compliance

### GDPR Considerations

- All data processing is local (no data transfer)
- Memory can be exported and deleted
- Audit logs can be exported for compliance

### SOC 2 Considerations

- Complete audit trail maintained
- Access control through policy gate
- Separation of duties through confirmation requirements

## Reporting Security Issues

For security vulnerabilities, please contact:

- **Email**: security@softnix.io
- **PGP**: Available on our website

## Changelog

| Version | Date     | Changes                                     |
| ------- | -------- | ------------------------------------------- |
| 0.1.0   | Jan 2026 | Initial release with core security features |

## See Also

- [README](../README.md) - Main documentation
- [Commands](commands.md) - CLI command reference
- [Architecture](architecture.md) - Technical architecture
