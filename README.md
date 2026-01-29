# Softnix Code Agent

**Local-first AI Code Assistant CLI**

Softnix Code Agent (SCA) is a local-first AI code assistant that helps developers with code analysis, refactoring, testing, and development tasks - all while keeping your code and data secure on your local machine.

![License](https://img.shields.io/badge/License-MIT-blue.svg)
![Node](https://img.shields.io/badge/Node-%3E%3D18.0.0-green.svg)
![Version](https://img.shields.io/badge/Version-0.1.0-yellow.svg)

## Features

### 🔒 Security First

- **Local-first Architecture**: All processing happens on your machine
- **Policy Gate**: Every tool execution is validated against configurable security policies
- **Audit Logging**: Complete audit trail of all actions
- **Secret Detection**: Automatic scanning and redaction of sensitive data
- **Strict Mode**: Optional network isolation for maximum security

### 🛠️ Powerful Tools

- **File Operations**: Read, scan, search, and edit files safely
- **Patch Management**: Generate and apply unified diffs with validation
- **Command Execution**: Sandboxed command execution with allowlist controls
- **Git Integration**: Status, diff, and commit message suggestions
- **Memory System**: Project context and user preferences persistence

### 🤖 AI-Powered

- **Local LLM Support**: Compatible with Ollama, vLLM, and OpenAI-compatible endpoints
- **Task Automation**: Intelligent task decomposition and execution
- **Plan Generation**: Automated work plans based on task analysis
- **Context Awareness**: Learns from your project structure and conventions

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- (Optional) Local LLM endpoint (Ollama, vLLM) for AI features

### Installation

```bash
# Clone the repository
git clone https://github.com/softnix/softnix-code-agent.git
cd softnix-code-agent

# Install dependencies
npm install

# Build the project
npm run build

# Install globally (optional)
npm install -g .

# Initialize configuration
sca init
```

### Alternative: npm Install

```bash
npm install softnix-code-agent
sca init
```

### Quick Usage

```bash
# Start interactive mode
sca

# Scan repository structure
sca> /scan

# Start a task
sca> /task Fix the bug in the login function

# View proposed plan
sca> /plan

# Apply changes (with confirmation)
sca> /apply

# Run tests
sca> /run test
```

## Configuration

Create a `.sca/config.yml` file in your project root:

```yaml
workspace_root: /path/to/your/project
model:
  provider: local # local, openai
  endpoint: http://localhost:11434
  model: llama3
policies:
  exec_allowlist:
    - pytest
    - npm test
    - go test
  path_denylist:
    - .env
    - secrets/
commands:
  presets:
    test:
      - npm test
      - pytest
    lint:
      - eslint .
      - prettier --check .
    build:
      - npm run build
memory:
  mode: project
privacy:
  strict_mode: true
```

## CLI Commands

### Interactive Mode Commands

| Command                             | Description                           |
| ----------------------------------- | ------------------------------------- |
| `/scan`                             | Scan repository and display structure |
| `/task <description>`               | Start a new task for the agent        |
| `/plan`                             | Show current work plan                |
| `/diff`                             | Show proposed changes                 |
| `/apply`                            | Apply changes (requires confirmation) |
| `/run <preset>`                     | Run test/lint/build commands          |
| `/memory [show\|forget\|export]`    | Manage agent memory                   |
| `/config [show\|set <key>=<value>]` | View or modify configuration          |
| `/help`                             | Show available commands               |
| `/quit`                             | Exit interactive mode                 |

### Standalone Commands

```bash
# Initialize configuration
sca init

# View audit logs
sca audit view --tool read_file --limit 50

# Run in interactive mode
sca interactive
```

## Architecture

```
softnix-code-agent/
├── src/
│   ├── cli/           # CLI/TUI Layer
│   │   ├── index.ts   # Entry point
│   │   ├── repl.ts    # Interactive REPL
│   │   ├── audit.ts    # Audit logging
│   │   └── config.ts  # Configuration management
│   ├── core/          # Agent Runtime
│   │   ├── agent.ts    # Main agent implementation
│   │   └── types.ts   # Core type definitions
│   ├── tools/          # Tooling Layer
│   │   ├── file-tools.ts    # File operations
│   │   ├── patch-tools.ts    # Diff/patch management
│   │   ├── exec-tools.ts     # Command execution
│   │   └── git-tools.ts      # Git integration
│   ├── memory/         # Memory Layer
│   ├── security/       # Policy Gate
│   │   ├── policy-gate.ts    # Policy enforcement
│   │   ├── security-filters.ts  # Secret/PII scanning
│   │   └── audit.ts           # Audit logging
│   └── providers/      # Model Provider
│       └── types.ts          # LLM interfaces
└── tests/              # Test suites
```

## Security Model

### Policy Gate

Every tool execution goes through the Policy Gate:

1. **Risk Assessment**: Tool is classified by risk level (read/write/exec/network)
2. **Scope Check**: Validates against path and command allowlists/denylists
3. **Confirmation**: Requires user approval for high-risk operations
4. **Audit Logging**: All decisions are logged for accountability

### Default Security Policy

```yaml
# Deny network by default (local-first)
deny_network: true

# Block dangerous commands
command_denylist:
  - rm
  - dd
  - mkfs
  - format
  - chmod
  - chown

# Protect sensitive paths
path_denylist:
  - .env
  - secrets/
  - credentials/
  - .ssh/
  - .aws/

# Require confirmation for exec
execute_command:
  confirmation: always
```

### Audit Log

All actions are logged to `~/.softnix-code-agent/logs/audit.db`:

```json
{
  "timestamp": "2026-01-29T10:00:00Z",
  "tool": "read_file",
  "action": "Read configuration file",
  "parameters": { "path": "/project/config.yml" },
  "result": "allowed",
  "user_id": "anonymous",
  "duration_ms": 5
}
```

## Memory System

### Project Memory

Stores project-specific context:

- Build commands and scripts
- Coding conventions and style preferences
- Domain-specific terminology
- Architectural decisions

### User Preferences

Per-user settings:

- Verbosity level (concise/detailed)
- Safety preferences (strict/relaxed)
- Preferred commands and workflows

### Privacy Protection

- Automatic secret detection and redaction
- Configurable exclude paths
- Memory encryption support

## LLM Integration

### Local LLM (Recommended)

```yaml
model:
  provider: local
  endpoint: http://localhost:11434 # Ollama default
  model: llama3
```

Supported local endpoints:

- **Ollama**: `http://localhost:11434`
- **vLLM**: `http://localhost:8000`
- **LocalAI**: `http://localhost:8080`

### External Providers (Optional)

```yaml
model:
  provider: openai
  endpoint: https://api.openai.com/v1
  model: gpt-4
```

**Note**: External providers require `OPENAI_API_KEY` environment variable and disable strict mode.

## Development

### Setup

```bash
git clone https://github.com/softnix/softnix-code-agent.git
cd softnix-code-agent
npm install
```

### Commands

```bash
# Build
npm run build

# Run tests
npm test

# Lint
npm run lint

# Format code
npm run format

# Type check
npm run check
```

### Adding New Tools

1. Implement tool in `src/tools/`
2. Register in `src/security/types.ts` TOOL_REGISTRY
3. Add policy metadata (risk_level, scope, confirmation)
4. Write tests
5. Document in this README

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run lint and tests
6. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- 📧 Email: support@softnix.io
- 📖 Docs: https://docs.softnix.io
- 🐛 Issues: https://github.com/softnix/softnix-code-agent/issues

---

**Built with ❤️ by Softnix**
