# Softnix Code Agent - Development Plan

## Overview
แผนดำเนินการพัฒนา Softnix Code Agent CLI (Local-first) แบ่งตาม Phase จาก PRD.md

---

## Phase 0: Project Foundation (Week 1) - Quick Win ✅ COMPLETED

### 0.1 Repository Setup
- [x] Initialize TypeScript/Node.js project (หรือ Python ตามทีมถนัด)
- [x] Setup ESLint/Prettier ตาม code conventions
- [x] Configure TypeScript strict mode
- [x] Setup Git hooks (husky) สำหรับ commit standards
- [x] Create Makefile สำหรับ development tasks
- [x] Setup CI pipeline (GitHub Actions)

### 0.2 Documentation & Requirements
- [x] อ่านและทำความเข้าใจ PRD.md ฉบับเต็ม
- [ ] สร้าง API documentation structure
- [x] วาง folder structure ตาม architecture:
  ```
  src/
    ├── cli/          # CLI/TUI Layer
    ├── core/         # Agent Runtime
    ├── tools/        # Tooling Layer
    ├── memory/       # Memory Layer
    ├── security/     # Policy Gate
    └── providers/    # Model Provider
  ```

---

## Phase 1: Core Infrastructure & CLI (Week 2) - Quick Win ✅ COMPLETED

### 1.1 CLI Framework Setup
- [x] เลือกและ setup CLI framework (Ink/React TUI หรือ oclif/commander)
- [x] Implement `sca init` command
- [x] Create config directory `~/.softnix-code-agent/`
- [x] Generate default config.yaml
- [x] Setup policy template
- [x] Implement `sca` interactive mode (basic REPL)
- [x] Add help command และ command documentation

### 1.2 Configuration System
- [x] Create ConfigLoader class
- [x] Implement `.sca/config.yml` parsing
- [x] Config structure support:
  - [x] `workspace_root`
  - [x] `model.provider` (local/external)
  - [x] `model.endpoint`
  - [x] `policies.exec_allowlist`
  - [x] `policies.path_allowlist/denylist`
  - [x] `commands.presets`
  - [x] `memory.mode`
  - [x] `privacy.strict_mode`

### 1.3 Session Management (Basic)
- [x] Implement session start/end logging
- [x] Create session state tracking
- [x] Setup audit log directory

**Deliverable Phase 1:** ✅ CLI ที่รันได้, `sca init` สร้าง config สำเร็จ, interactive mode แสดง prompt ได้

---

## Phase 2: Tooling Layer - Core Tools (Week 3-4) - Quick Win ✅ COMPLETED

### 2.1 File Tools
- [x] Implement `RepoScanner` - repo scan และ map structure
- [x] Implement `FileReader` - read file with chunking
- [x] Implement `FileGrep` - search content in files
- [x] Implement `FileTree` - directory tree visualization
- [x] Add budget control สำหรับ file reading (ไม่เกิน token limit)

### 2.2 Patch Tools
- [x] Implement `DiffGenerator` - generate unified diff
- [x] Implement `PatchApplier` - safe apply diff
- [x] Implement `SafeEditor` - edit by line ranges
- [x] Implement conflict handling เบื้องต้น
- [x] Add `git apply --check` validation before apply

### 2.3 Exec Tools (Sandbox)
- [x] Implement `CommandExecutor` with sandbox
- [x] Create allowlist mechanism สำหรับ exec commands
- [x] Implement cwd restriction
- [x] Add environment variable scrubbing
- [x] Support preset commands (test/lint/build)

### 2.4 Git Tools
- [x] Implement `GitStatus` - show working tree status
- [x] Implement `GitDiff` - show staged/unstaged changes
- [x] Implement `GitCommitMsg` - suggest commit messages
- [x] Enforce manual/confirm สำหรับ actual commit

**Deliverable Phase 2:** ✅ อ่านไฟล์ได้, generate diff ได้, apply patch ได้, รัน test command (allowlist) ได้

**Test Results (Jan 29, 2026):** 11/11 tests passed ✅
- FileReader: Read with chunking & budget control
- RepoScanner: Found 45 files, Tech: TypeScript, JSON, Markdown
- FileGrep: Search content with regex
- DiffGenerator: Generate unified diffs
- SafeEditor: Safe file editing with line validation
- CommandExecutor: Sandbox allows echo, blocks rm
- GitStatus/GitDiff/GitCommitMsg: Working correctly

---

## Phase 3: Agent Runtime & Memory (Week 5) - Quick Win

### 3.1 Agent Runtime Core
- [ ] Study Letta SDK (https://github.com/letta-ai/letta-code-sdk)
- [ ] Implement Agent loop: analyze → plan → tool-call → observe → iterate → finalize
- [ ] Create Agent base class พร้อม context management
- [ ] Implement sub-agent support (lightweight) สำหรับ:
  - [ ] Refactor Agent
  - [ ] Test Agent
- [ ] Setup message passing between main agent และ sub-agents

### 3.2 Memory Layer
- [ ] Design memory schema (SQLite recommended)
- [ ] Implement MemoryStore base class
- [ ] Implement **Project Memory**:
  - [ ] Build commands storage
  - [ ] Coding conventions storage
  - [ ] Domain terms storage
- [ ] Implement **User Preference** storage:
  - [ ] Style preferences
  - [ ] Verbosity settings
  - [ ] Safety level preferences
- [ ] Add memory CRUD operations

### 3.3 Memory Protection
- [ ] Implement redaction filter (ก่อนบันทึก)
- [ ] Add exclude paths configuration (`.env`, `secrets/`)
- [ ] Implement secret scanner (regex + entropy)
- [ ] Add `.env` denylist support

**Deliverable Phase 3:** Agent ทำงาน loop ได้, memory save/load ได้, project/user preferences จำได้

---

## Phase 4: Security & Policy Gate (Week 6) - Critical

### 4.1 Policy Gate System
- [ ] Create PolicyGate middleware
- [ ] Implement tool metadata system:
  - [ ] `risk_level`: read/write/exec/network
  - [ ] `scope`: path allowlist, command allowlist
  - [ ] `requires_confirmation`: true/false
- [ ] Implement policy check before every tool-call
- [ ] Add deny-by-default สำหรับ network (local-first)

### 4.2 Security Filters
- [ ] Implement secret scanner (ก่อนส่ง prompt เข้า LLM)
- [ ] Add PII detection (basic patterns)
- [ ] Implement memory redaction (ก่อนเขียน memory)
- [ ] Create path exclusion mechanism

### 4.3 Audit System
- [ ] Design audit log schema
- [ ] Implement event logging:
  - [ ] Timestamp
  - [ ] User approval status
  - [ ] Diff hash
  - [ ] Command executed
- [ ] Create audit log viewer command

**Deliverable Phase 4:** Policy gate ทำงาน, ทุก action ผ่าน security check, มี audit log ครบถ้วน

---

## Phase 5: UX/Commands & Integration (Week 7-8) - Quick Win

### 5.1 Interactive Commands
- [ ] Implement `/scan` command - repo map + tech stack summary
- [ ] Implement `/task <text>` - task assignment to agent
- [ ] Implement `/plan` - show work plan
- [ ] Implement `/diff` - show proposed patch
- [ ] Implement `/apply` - apply patch with confirmation
- [ ] Implement `/run <preset>` - run test/lint/build
- [ ] Implement `/memory show|forget|export`
- [ ] Implement `/config set <key>=<value>`

### 5.2 Standard Flow Implementation
- [ ] Implement complete flow:
  ```
  user: /task Fix failing tests
  agent: /scan + /plan
  agent: propose diff → /diff
  user confirm → /apply
  agent: /run test
  iterate จนผ่าน
  ```
- [ ] Add confirmation prompts สำหรับ risky operations
- [ ] Implement progress feedback และ status updates

### 5.3 Model Provider Integration
- [ ] Create ModelProvider abstract interface
- [ ] Implement Local LLM adapter (Ollama/vLLM/OpenAI-compatible)
- [ ] Implement External provider adapter (optional)
- [ ] Add policy check: ห้ามส่งโค้ดออกนอกเครื่องใน strict mode
- [ ] Setup connection to LLM endpoint

**Deliverable Phase 5:** Commands ทั้งหมดทำงานได้, interactive flow สมบูรณ์, LLM integration พร้อมใช้

---

## Phase 6: Testing & Validation (Week 9) - Critical

### 6.1 Unit Tests
- [ ] Write tests for CLI commands
- [ ] Write tests for Tooling Layer (File, Patch, Exec tools)
- [ ] Write tests for Agent Runtime
- [ ] Write tests for Memory Layer
- [ ] Write tests for Security/Policy Gate
- [ ] Aim for 80% coverage minimum

### 6.2 Integration Tests
- [ ] Test complete workflow: task → plan → diff → apply → run
- [ ] Test policy gate ทุก case
- [ ] Test memory save/restore
- [ ] Test cross-platform (macOS/Windows/Linux if possible)

### 6.3 Acceptance Criteria Validation
- [ ] Verify: ทำงานบน macOS/Windows ได้
- [ ] Verify: แก้ไฟล์ได้เฉพาะใน repo + diff + confirm
- [ ] Verify: รัน test ได้เฉพาะ allowlist
- [ ] Verify: มี session + audit log + basic memory
- [ ] Verify: โหมด strict: ไม่ส่งโค้ดออก network

### 6.4 Security Testing
- [ ] Penetration test policy gate
- [ ] Test secret scanner กับ sample data
- [ ] Test memory redaction
- [ ] Test audit logging

**Deliverable Phase 6:** Tests ผ่านทั้งหมด, ผ่าน acceptance criteria, พร้อม MVP release

---

## Phase 7: Documentation & Release Prep (Week 10)

### 7.1 Documentation
- [ ] Write README.md (installation, quick start)
- [ ] Write CLI commands documentation
- [ ] Write architecture documentation
- [ ] Write security policy documentation
- [ ] Create example use cases

### 7.2 Packaging
- [ ] Setup single binary packaging (if using Go/Rust) หรือ
- [ ] Setup npm package distribution
- [ ] Test installation process
- [ ] Verify all commands work after install

### 7.3 Release
- [ ] Tag version v0.1.0 (MVP)
- [ ] Create release notes
- [ ] Publish to distribution channel

---

## Quick Win Summary

| Phase | Quick Win | Status | Completion Date |
|-------|-----------|--------|-----------------|
| Phase 0 | Project foundation + setup | ✅ Completed | Week 1 (Jan 2026) |
| Phase 1 | CLI interactive + config system | ✅ Completed | Week 2 (Jan 2026) |
| Phase 2 | Core tools (read/write/exec) | ✅ Completed | Week 4 (Jan 2026) |
| Phase 3 | Agent loop + memory layer | ⬜ Pending | End Week 5 |
| Phase 4 | Security policy gate | ⬜ Pending | End Week 6 |
| Phase 5 | All commands + LLM integration | ⬜ Pending | End Week 8 |
| Phase 6 | Tests + MVP validation | ⬜ Pending | End Week 9 |
| Phase 7 | Docs + Release | ⬜ Pending | End Week 10 |

---

## Tracking

Update progress ทุกวันศุกร์:
- [x] ตรวจสอบ checklist ที่ทำเสร็จ
- [ ] บันทึก blockers และ dependencies
- [ ] Adjust timeline ตามความเป็นจริง
- [ ] Report สรุปความคืบหน้า

---

## Dependencies & Risks

### Key Dependencies
- Letta SDK availability และ compatibility
- LLM endpoint (Ollama/vLLM) configuration
- Cross-platform testing resources

### Potential Risks
- Complexity ของ sandbox/exec อาจใช้เวลามากกว่าคาด
- Memory layer performance อาจต้อง optimize
- Policy gate edge cases อาจพบช้า

### Mitigation
- เริ่มจาก simple allowlist ก่อน ค่อยเพิ่ม sandbox
- Use SQLite ที่เสถียรและ performance ดี
- ทำ policy testing ตั้งแต่เริ่ม Phase 4

---

## Next Steps

1. ✅ Review และ approve PLAN.md นี้
2. ✅ Complete Phase 0: Project Foundation
3. ✅ Complete Phase 1: CLI Framework & Core Infrastructure
4. ✅ Complete Phase 2: Tooling Layer - Core Tools
5. 🔄 Start Phase 3: Agent Runtime & Memory
6. ⬜ Weekly check-ins every Friday
7. ⬜ Demo ทุก 2 weeks