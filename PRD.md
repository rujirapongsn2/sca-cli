
## 1) เป้าหมายของระบบ (Product Shape)

**Softnix Code Agent CLI (Local-first)**

* รันบนเครื่อง Dev ของผู้ใช้ (macOS/Windows/Linux)
* ทำงานกับ repo ในเครื่อง: อ่านไฟล์, แก้ไฟล์แบบ patch, รัน test/lint/build
* มี **policy gate** ทุก action ที่เสี่ยง (write/exec/network)
* รองรับทั้ง **Local LLM** (เช่น Ollama/vLLM) และ **External LLM** (optional, ผ่าน proxy/policy)

---

## 2) Architecture ระดับสูง (Local-first)

### 2.1 Process ภายในเครื่อง

1. **CLI/TUI Layer**

* interactive REPL + commands (`/plan`, `/diff`, `/apply`, `/run`, `/config`, `/memory`)
* session management (save/restore)

2. **Agent Runtime (Letta via letta-code-sdk)**

* loop: *analyze → plan → tool-call → observe → iterate → finalize*
* support “sub-agent” (Refactor Agent, Test Agent) แบบ lightweight
* reference : https://github.com/letta-ai/letta-code-sdk

3. **Tooling Layer (คุณเขียนเอง + register ให้ agent เรียก)**

* File Tools: repo scan, read, grep, tree, chunking
* Patch Tools: apply unified diff, safe edit by ranges, conflict handling
* Exec Tools: run commands ผ่าน sandbox/allowlist
* Git Tools: status, diff, commit message suggestion (commit ต้อง manual/confirm)

4. **Memory Layer (local)**

* เก็บเป็น SQLite/JSONL/LMDB ใน `~/.softnix-code-agent/`
* แยก 2 ชั้น:

  * **Project Memory**: build commands, coding conventions, domain terms
  * **User Preference**: style, verbosity, safety level
* มี “redaction filter” ก่อนบันทึก (กัน secrets)

5. **Model Provider Layer**

* Adapter: Local LLM endpoint (Ollama/vLLM/OpenAI-compatible) + External provider (optional)
* Policy: ห้ามส่งไฟล์/โค้ดออกนอกเครื่องถ้าอยู่โหมด strict

---

## 3) Security & Governance (หัวใจของ Local-first)

### 3.1 Policy Gate (ก่อน tool-call)

บังคับให้ทุก tool มี metadata:

* `risk_level`: read / write / exec / network
* `scope`: path allowlist, command allowlist
* `requires_confirmation`: true/false

**ตัวอย่างกฎ**

* write: อนุญาตเฉพาะใน workspace repo และต้อง “show diff” ก่อน apply
* exec: อนุญาตเฉพาะคำสั่งใน allowlist (เช่น `pytest`, `npm test`, `go test`, `make test`)
* network: default = deny (สำหรับ local-first) ยกเว้นให้ user เปิดเอง

### 3.2 Secret/PII Protection

* ก่อนส่ง prompt เข้า LLM: run **secret scanner** (regex + entropy) + `.env` denylist
* ก่อนเขียน memory: redaction + exclude paths (`.env`, `secrets/`, keyfiles)

### 3.3 Audit Log

* เก็บ event log ทุก tool-call: เวลา, ผู้ใช้อนุมัติ/ไม่อนุมัติ, diff hash, command executed
* ช่วย compliance + debug

---

## 4) UX/Command Design (CLI ที่ใช้งานได้จริง)

### 4.1 คำสั่งหลัก (MVP)

* `sca init` : สร้าง config + policy + memory store
* `sca` : เข้า interactive mode
* `/scan` : สรุป repo map + tech stack + entry points
* `/task <ข้อความ>` : ให้ agent ทำงาน
* `/plan` : แสดงแผนงาน
* `/diff` : แสดง patch ที่จะเปลี่ยน
* `/apply` : apply patch (ต้อง confirm)
* `/run <preset>` : run test/lint/build ตาม preset
* `/memory show|forget|export`
* `/config set <key>=<value>`

### 4.2 Flow มาตรฐาน (เหมือน Claude Code)

1. user: `/task Fix failing tests in module X`
2. agent: `/scan` + `/plan`
3. agent: propose diff → `/diff`
4. user confirm → `/apply`
5. agent: `/run test`
6. iterate จนผ่าน → summary + next steps

---

## 5) File/Repo Handling Strategy (สำคัญมาก)

* สร้าง **Repo Index** (ไม่ต้อง vector ก่อนก็ได้)

  * tree + file types + key files + symbols (optional)
* อ่านไฟล์แบบ chunking + budget control
* “Edit strategy” ที่ปลอดภัย:

  * agent สร้าง unified diff
  * CLI แสดง diff + ให้ user confirm
  * apply ด้วย patch engine (กันพังไฟล์)

---

## 6) Project Config (ตัวอย่างที่ควรมี)

ไฟล์: `.sca/config.yml`

* `workspace_root`
* `model.provider`: `local|external`
* `model.endpoint`
* `policies.exec_allowlist`
* `policies.path_allowlist/denylist`
* `commands.presets`: test/lint/build
* `memory.mode`: `off|project|project+user`
* `privacy.strict_mode`: true/false

---

## 7) Tech Stack แนะนำ (ให้ทำได้เร็วและเสถียร)

* **Language**: TypeScript/Node (ทำ CLI/TUI ง่าย) หรือ Python (ถ้าทีมถนัด)
* **CLI Framework**: Ink (React TUI) / oclif / commander
* **Patch Engine**: ใช้ lib apply diff ที่เชื่อถือได้ (หรือเรียก `git apply --check` + `git apply`)
* **Exec Sandbox**:

  * ขั้นต้น: allowlist + cwd จำกัด + env scrub
  * ขั้นสูง: container sandbox (optional) สำหรับคำสั่งเสี่ยง
* **Memory Store**: SQLite (แนะนำ) + encryption-at-rest (optional)

---

## 8) Roadmap แนะนำ

### Phase 1 (MVP – ใช้งานได้จริง)

* CLI interactive, repo scan, propose diff, apply diff, run tests (allowlist)
* memory: project-level basics
* audit log

### Phase 2 (Product-grade)

* sub-agents (Test Agent, Refactor Agent)
* better repo indexing (symbols, dependency graph)
* secret scanner + strict mode + network deny
* cross-platform packaging (single binary)

### Phase 3 (Enterprise add-ons)

* policy pack แบบองค์กร, signed policies
* remote update channel
* optional local model bundle / hardware detection
* integration กับ internal tools (ticket/Jira/GitLab) แบบ controlled

---

## 9) Acceptance Criteria (นิยาม “เสร็จแล้ว” ของ MVP)

* ทำงานบน macOS/Windows ได้
* แก้ไฟล์ได้เฉพาะใน repo และต้องมี diff + confirm
* รัน test ได้เฉพาะคำสั่ง allowlist
* มี session + audit log + basic memory
* โหมด strict: ไม่ส่งโค้ดออก network

---
