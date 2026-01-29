# Architecture

Technical architecture documentation for Softnix Code Agent.

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Softnix Code Agent                               │
├─────────────────────────────────────────────────────────────────────────┤
│  CLI Layer                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │   REPL     │  │    Init     │  │   Audit     │  │   Config    │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │
├─────────────────────────────────────────────────────────────────────────┤
│  Agent Runtime                                                         │
│  ┌───────────────────────────────────────────────────────────────┐     │
│  │                    Agent Loop                                 │     │
│  │  analyze → plan → tool-call → observe → iterate → finalize  │     │
│  └───────────────────────────────────────────────────────────────┘     │
│                         │                                             │
│                         ▼                                             │
│  ┌───────────────────────────────────────────────────────────────┐     │
│  │                   Context Manager                             │     │
│  └───────────────────────────────────────────────────────────────┘     │
├─────────────────────────────────────────────────────────────────────────┤
│  Tooling Layer                                                        │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌────────┐ │
│  │ File      │ │ Patch     │ │ Exec      │ │ Git       │ │ Scan   │ │
│  │ Tools     │ │ Tools     │ │ Tools     │ │ Tools     │ │ Tools  │ │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘ └────────┘ │
├─────────────────────────────────────────────────────────────────────────┤
│  Memory Layer                                                         │
│  ┌───────────────────────────────────────────────────────────────┐     │
│  │                    Memory Store                               │     │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │     │
│  │  │ Project     │  │ User        │  │ Session             │  │     │
│  │  │ Memory      │  │ Preferences │  │ Memory              │  │     │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘  │     │
│  └───────────────────────────────────────────────────────────────┘     │
├─────────────────────────────────────────────────────────────────────────┤
│  Security Layer                                                       │
│  ┌───────────────────────────────────────────────────────────────┐     │
│  │                   Policy Gate                                 │     │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │     │
│  │  │ Tool        │  │ Security    │  │ Audit               │  │     │
│  │  │ Registry    │  │ Filters     │  │ Logger              │  │     │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘  │     │
│  └───────────────────────────────────────────────────────────────┘     │
├─────────────────────────────────────────────────────────────────────────┤
│  Model Provider Layer                                                 │
│  ┌───────────────────────────────────────────────────────────────┐     │
│  │                   Model Provider Interface                     │     │
│  │  ┌───────────┐  ┌───────────┐  ┌─────────────────────────┐  │     │
│  │  │ Local     │  │ OpenAI    │  │ Custom External        │  │     │
│  │  │ LLM       │  │ Provider  │  │ Provider               │  │     │
│  │  └───────────┘  └───────────┘  └─────────────────────────┘  │     │
│  └───────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────────┘
```

## Component Descriptions

### CLI Layer

The entry point for user interaction.

| Component | Responsibility                 |
| --------- | ------------------------------ |
| REPL      | Interactive command processing |
| Init      | Project initialization         |
| Audit     | Audit log viewing              |
| Config    | Configuration management       |

### Agent Runtime

The core execution engine.

```typescript
class Agent {
  private contextManager: AgentContextManager;
  private memoryStore: MemoryStore;
  private policyGate: PolicyGate;

  async startTask(task: string, workspace: string): Promise<AgentContext>;
  async run(contextId: string): Promise<string>;
  getPlanSteps(contextId: string): PlanStep[];
}
```

**Agent Loop:**

1. **Analyze**: Parse user intent and task
2. **Plan**: Generate step-by-step plan
3. **Tool-Call**: Execute tools based on plan
4. **Observe**: Collect results from tool execution
5. **Iterate**: Continue with next steps or adjust plan
6. **Finalize**: Return summary to user

### Tooling Layer

File operations and command execution.

| Tool Category | Tools                                 | Risk Level |
| ------------- | ------------------------------------- | ---------- |
| File          | read_file, search_files, scan_repo    | read       |
| Patch         | apply_patch, safe_edit, generate_diff | write      |
| Exec          | execute_command, run_preset           | exec       |
| Git           | git_status, git_diff, git_commit_msg  | read       |
| Scan          | file_tree, repo_scanner               | read       |

### Memory Layer

Persistent storage for context and preferences.

```typescript
class MemoryStore {
  saveProjectInfo(key: string, value: unknown): void;
  getProjectInfo(key: string): unknown;
  saveUserPreference(key: string, value: unknown): void;
  getUserPreference(key: string): unknown;
  searchContext(query: string): MemoryItem[];
}
```

### Security Layer

Enforcement of security policies.

```typescript
class PolicyGate {
  canCallTool(toolName: string, parameters: Record<string, unknown>): PolicyCheck;
  approveToolCall(toolName: string, userId: string): void;
  logAudit(event: AuditEvent): void;
}
```

### Model Provider Layer

LLM integration interface.

```typescript
abstract class ModelProvider {
  abstract chat(messages: Message[]): Promise<ChatCompletion>;
  abstract healthCheck(): Promise<ProviderHealth>;
}
```

## Data Flow

### Task Execution Flow

```
User Input
    │
    ▼
┌─────────────┐
│   CLI/REPL  │ Parse command
└─────────────┘
    │
    ▼
┌─────────────┐
│   Agent     │ Create context, analyze task
└─────────────┘
    │
    ▼
┌─────────────┐
│   Planner   │ Generate plan steps
└─────────────┘
    │
    ▼
┌─────────────┐
│ Policy Gate │ Validate each tool call
└─────────────┘
    │
    ▼
┌─────────────┐
│ Tool Layer   │ Execute approved tools
└─────────────┘
    │
    ▼
┌─────────────┐
│   Memory    │ Save context, preferences
└─────────────┘
    │
    ▼
┌─────────────┐
│   Audit     │ Log all actions
└─────────────┘
    │
    ▼
┌─────────────┐
│    User     │ Return results
└─────────────┘
```

## Configuration

### Project Configuration (`.sca/config.yml`)

```yaml
workspace_root: /path/to/project
model:
  provider: local
  endpoint: http://localhost:11434
  model: llama3
policies:
  exec_allowlist: []
  exec_denylist: []
  path_allowlist: []
  path_denylist: []
commands:
  presets: {}
memory:
  mode: project
privacy:
  strict_mode: true
```

### Global Configuration (`~/.softnix-code-agent/config.yml`)

User-level settings that override defaults.

## File Structure

```
softnix-code-agent/
├── src/
│   ├── cli/               # CLI interface
│   │   ├── index.ts       # Entry point
│   │   ├── repl.ts        # Interactive mode
│   │   ├── audit.ts       # Audit logging
│   │   └── config.ts      # Config loader
│   ├── core/              # Agent runtime
│   │   ├── agent.ts       # Main agent
│   │   └── types.ts       # Type definitions
│   ├── tools/             # Tool implementations
│   │   ├── file-tools.ts
│   │   ├── patch-tools.ts
│   │   ├── exec-tools.ts
│   │   └── git-tools.ts
│   ├── memory/            # Memory system
│   ├── security/          # Security layer
│   │   ├── policy-gate.ts
│   │   ├── security-filters.ts
│   │   └── audit.ts
│   └── providers/         # LLM providers
│       └── types.ts
├── docs/                  # Documentation
├── __tests__/             # Tests
├── package.json
├── tsconfig.json
└── jest.config.js
```

## Performance Considerations

### Resource Limits

| Operation       | Limit  |
| --------------- | ------ |
| File read size  | 1MB    |
| Output size     | 1MB    |
| Lines per file  | 10,000 |
| Plan steps      | 50     |
| Task iterations | 10     |

### Optimization Strategies

- **Lazy loading**: Load tools on demand
- **Caching**: Cache file reads and git status
- **Chunking**: Process large files in chunks
- **Streaming**: Stream LLM responses when available

## Extensibility

### Adding New Tools

1. Create tool class in `src/tools/`
2. Register in `src/security/types.ts` TOOL_REGISTRY
3. Add to Agent's available tools
4. Write unit tests
5. Document in commands.md

### Adding New Providers

1. Extend ModelProvider abstract class
2. Implement chat() and healthCheck()
3. Register in createProvider()
4. Test with sample prompts

## Dependencies

### External Dependencies

| Dependency     | Version  | Purpose     |
| -------------- | -------- | ----------- |
| Node.js        | >=18.0.0 | Runtime     |
| TypeScript     | ^5.0.0   | Language    |
| Jest           | ^29.0.0  | Testing     |
| Better-SQLite3 | ^7.0.0   | Persistence |

### Optional Dependencies

| Dependency | Purpose      |
| ---------- | ------------ |
| Ollama     | Local LLM    |
| vLLM       | Local LLM    |
| OpenAI SDK | External LLM |

## See Also

- [README](../README.md) - Main documentation
- [Commands](commands.md) - CLI command reference
- [Security](security.md) - Security documentation
