# CLI Commands Reference

Complete reference for all Softnix Code Agent CLI commands.

## Command Overview

```bash
sca [command] [options]
```

## Global Commands

### init

Initialize Softnix Code Agent configuration in the current project.

```bash
sca init
```

**Options:**

- `--force` - Overwrite existing configuration

**Example:**

```bash
$ sca init
✓ Configuration created at /project/.sca/config.yml
  Workspace: /project
  Model Provider: local
  Privacy Mode: strict
```

### audit view

View audit logs with filtering options.

```bash
sca audit view [options]
```

**Options:**

- `--tool <name>` - Filter by tool name
- `--result <type>` - Filter by result (allowed/denied/approved/rejected)
- `--limit <n>` - Maximum logs to show (default: 50)
- `--json` - Output as JSON

**Examples:**

```bash
# View all logs
sca audit view

# Filter by tool
sca audit view --tool read_file

# Filter denied operations
sca audit view --result denied --limit 20

# JSON output
sca audit view --json
```

### help

Show help information.

```bash
sca --help
sca help
```

### version

Show version information.

```bash
sca --version
sca version
```

## Interactive Mode Commands

Start interactive mode by running `sca` without arguments:

```bash
sca
```

The prompt will change to `sca>` where you can enter commands.

### /scan

Scan repository and display structure summary.

```bash
sca> /scan
```

**Output includes:**

- Repository structure overview
- File count
- Technology stack detection
- Directory tree visualization

**Example:**

```
============================================================
Repository Scan Results
============================================================
Workspace: /project
Total Files: 156
Tech Stack: TypeScript, React, Node.js

File Structure (top level):
📁 src/
📁 components/
📁 utils/
📄 package.json
📄 tsconfig.json
...
```

### /task `<description>`

Start a new task for the agent to execute.

```bash
sca> /task <description>
```

**Example:**

```bash
sca> /task Fix the authentication bug in login.ts
```

**What happens:**

1. Agent analyzes the task
2. Creates a work plan
3. Executes steps one by one
4. Reports results

### /plan

Show the current work plan.

```bash
sca> /plan
```

**Output includes:**

- Step-by-step plan
- Current status of each step
- Tool to be used for each step

**Example:**

```
============================================================
Current Plan
============================================================
✅ 1. Scan repository structure (scan)
⏳ 2. Find the bug location (grep)
⏳ 3. Read the problematic file (read)
⏳ 4. Apply the fix (edit)
⏳ 5. Run tests (run)
```

### /diff

Show proposed changes before applying.

```bash
sca> /diff
```

**Output includes:**

- Unified diff of all proposed changes
- File paths affected
- Line-by-line changes

### /apply

Apply proposed changes.

```bash
sca> /apply
```

**Behavior:**

- Requires explicit confirmation for write operations
- Applies all pending changes
- Updates audit log

**Example:**

```
Applying changes...
✓ Changes applied successfully!
```

### /run `<preset>`

Execute predefined command presets.

```bash
sca> /run <preset>
```

**Available presets** (configured in `.sca/config.yml`):

- `test` - Run test suites
- `lint` - Run linters
- `build` - Build the project

**Examples:**

```bash
sca> /run test
sca> /run lint
sca> /run build
```

### /memory `<action>`

Manage agent memory.

```bash
sca> /memory <action>
```

**Actions:**

- `show` - Display current memory contents
- `forget` - Clear all memory
- `export` - Export memory to file

**Examples:**

```bash
sca> /memory show
sca> /memory forget
sca> /memory export
```

### /config `<action>`

View or modify configuration.

```bash
sca> /config [action] [key=value]
```

**Actions:**

- (none) - Show current configuration
- `set` - Set a configuration value

**Examples:**

```bash
sca> /config
sca> /config set model.endpoint=http://localhost:11434
```

### /help

Show available commands in interactive mode.

```bash
sca> /help
```

**Output:**

```
Available Commands:
  /scan        Scan repository and show structure
  /task <msg>  Start a new task
  /plan        Show current work plan
  /diff        Show proposed changes
  /apply       Apply changes (requires confirmation)
  /run <preset>  Run test/lint/build commands
  /memory      Manage memory (show/forget/export)
  /config      Configure settings
  /help        Show this help
  /quit        Exit interactive mode
```

### /quit

Exit interactive mode.

```bash
sca> /quit
sca> /exit
```

## Command Reference Table

| Command          | Description           | Risk Level |
| ---------------- | --------------------- | ---------- |
| `/scan`          | Scan repository       | Read       |
| `/task <text>`   | Start task execution  | Read/Write |
| `/plan`          | Show work plan        | Read       |
| `/diff`          | Show proposed changes | Read       |
| `/apply`         | Apply changes         | Write      |
| `/run <preset>`  | Execute commands      | Exec       |
| `/memory show`   | Display memory        | Read       |
| `/memory forget` | Clear memory          | Write      |
| `/memory export` | Export memory         | Read       |
| `/config show`   | Show configuration    | Read       |
| `/config set`    | Modify configuration  | Write      |

## Exit Codes

| Code | Meaning                      |
| ---- | ---------------------------- |
| 0    | Success                      |
| 1    | General error                |
| 2    | Invalid command or arguments |
| 3    | Policy violation             |

## Configuration

See [Configuration Guide](config.md) for detailed configuration options.

## See Also

- [README](../README.md) - Main documentation
- [Security Policy](security.md) - Security documentation
- [Architecture](architecture.md) - Technical architecture
