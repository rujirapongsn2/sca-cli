# Changelog

## v0.1.0 (January 2026) - Initial Release

First stable release of the Softnix Code Agent (MVP).

### Features

- **Interactive CLI Mode**
  - `/scan` - Search and analyze codebase
  - `/task` - Execute development tasks
  - `/plan` - Create execution plans
  - `/diff` - Review pending changes
  - `/apply` - Apply approved changes
  - `/run` - Execute shell commands
  - `/memory` - View memory system
  - `/config` - Manage configuration

- **File Operations**
  - `read_file` - Safe file reading with path validation
  - `grep_search` - Content search with regex support
  - `glob_files` - Pattern-based file discovery
  - `edit_file` - Safe string replacements
  - `list_dir` - Directory listing
  - `get_file_info` - File metadata

- **Patch Management**
  - `apply_patch` - Apply git-style patches
  - `create_patch` - Generate diffs
  - `view_patch` - Inspect patch contents

- **Execution Tools**
  - `exec_command` - Sandboxed command execution
  - `exec_python` - Python script execution
  - `exec_bash` - Bash script execution

- **Git Integration**
  - `git_status` - Repository status
  - `git_diff` - Uncommitted changes
  - `git_log` - Commit history
  - `git_checkout` - Branch switching

- **Model Providers**
  - `LocalLLMProvider` - Ollama, vLLM compatible
  - `OpenAIProvider` - OpenAI API integration
  - Abstract provider interface

### Security

- **Policy Gate System**
  - Default deny policy
  - Tool risk classification (low/medium/high/critical)
  - Path traversal prevention
  - Command injection protection

- **Security Filters**
  - Automatic secret detection and redaction
  - PII pattern matching (email, SSN, phone, etc.)
  - AES-encrypted memory storage

- **Audit System**
  - SQLite-backed logging
  - Tool execution records
  - Policy decisions tracking

### Memory System

- **Project Memory**
  - `CLAUDE.md` equivalent
  - Project patterns and conventions
  - Task history

- **User Preferences**
  - Command aliases
  - Default configurations
  - Style preferences

### Configuration

- `sca init` - Initialize project configuration
- YAML-based config format
- Local-first (`.sca/config.yaml`)
- Global fallback (`~/.config/sca/config.yaml`)

### Testing

- Jest-based test suite
- 21 passing tests
- Integration tests
- Security policy tests

### Bug Fixes

- Path traversal vulnerabilities patched
- Memory protection system implemented
- Tool execution sandboxing fixed

### Known Limitations

- Limited to local-first models (Ollama/vLLM)
- No remote model support (future v0.2.0)
- Limited IDE integrations (future roadmap)

---

## Roadmap

| Version | Target   | Features                         |
| ------- | -------- | -------------------------------- |
| v0.1.0  | Jan 2026 | MVP - Core CLI, Security, Memory |
| v0.2.0  | Q2 2026  | Remote models, IDE plugins       |
| v1.0.0  | Q4 2026  | Full feature parity, enterprise  |

---

## Installation

```bash
npm install -g softnix-code-agent
sca init
```

## Requirements

- Node.js >= 18.0.0
- npm >= 9.0.0
- Optional: Ollama (local LLM)
