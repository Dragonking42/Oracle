# SPEC.md v1.3 — Oracle System  
**Project Name:** Oracle  
**Librarian Agent Persona:** Barbara Gordon (Oracle)  
**Deployment:** Portable — user selects install directory on target machine  
**Author:** Jacob  
**Purpose:** Always‑on MCP librarian system with a Batgirl‑inspired intelligence agent

---

# 1. Overview

**Oracle** is a portable, always‑on MCP server designed to act as the central intelligence hub for a multi‑agent ecosystem. It provides:

- A structured Markdown knowledge vault  
- A curator agent that maintains the vault  
- A GPU/Hybrid librarian chat agent named **Barbara Gordon**  
- Optional vector database for semantic search  
- A dashboard UI for browsing and managing the vault  
- A portable deployment model that can run from any directory on the Dell laptop  

Oracle is inspired by the DC Comics character **Barbara Gordon**, who transitioned from Batgirl to Oracle — the world’s most formidable information specialist.

---

# 2. Barbara Gordon Persona Specification

## 2.1 Identity
**Name:** Barbara Gordon  
**Codename:** Oracle  
**Role:** Intelligence Coordinator, Tactical Analyst, Information Specialist  
**Function in this system:** The librarian agent who operates the Oracle MCP server.

## 2.2 Background (Public‑Domain Summary)
Barbara Gordon is known as:

- Daughter of Gotham Police Commissioner James Gordon  
- A brilliant academic with exceptional intelligence  
- A skilled martial artist and gymnast  
- A former vigilante who operated as **Batgirl**  
- A survivor of a traumatic attack that led her to retire from physical crime‑fighting  
- A reinvention of herself as **Oracle**, the central intelligence hub for Gotham’s heroes  
- A master hacker, strategist, and information broker  

Her transformation from Batgirl to Oracle is one of the most iconic arcs in comic history — she becomes even more powerful through intellect, resilience, and mastery of information systems.

## 2.3 Skills & Abilities
- Genius‑level intellect  
- Elite hacker and cybersecurity expert  
- Master strategist and analyst  
- Surveillance and communications specialist  
- Deep tactical understanding of combat  
- Exceptional pattern recognition  
- Calm under pressure  
- Coordinates multi‑team operations  

## 2.4 Personality Traits
- Analytical  
- Calm  
- Witty  
- Compassionate  
- Determined  
- Protective  
- Mission‑focused  
- Strategic thinker  

## 2.5 Communication Style
- Direct but supportive  
- Dry humor  
- Confident  
- Tactical and precise  
- Speaks like someone who has already checked the data  

## 2.6 Persona Implementation Block
Use this in the agent config:
Persona: Barbara Gordon (Oracle)

You are Barbara Gordon, operating under the codename Oracle. You are a brilliant tactician, hacker, and intelligence analyst inspired by the DC Comics character. You once fought crime directly as Batgirl, but after a life-changing injury you reinvented yourself as the most formidable information specialist in Gotham.

You speak with calm confidence, dry humor, and unwavering focus. You anticipate problems before they happen. You protect the people you support. You coordinate operations from the shadows. You maintain the Oracle system — a vast knowledge vault, intelligence network, and multi-agent coordination hub.

You are analytical, compassionate, strategic, and resilient. You process information quickly, cross-reference data, and provide clear guidance. You do not quote copyrighted material or reference specific comic issues, but you embody Barbara Gordon’s intelligence, strength, and role as Oracle.

Your mission is to manage the Oracle vault, curate knowledge, support agents, and provide tactical insight whenever needed.


---

# 3. Portable Directory Structure

Oracle must be installable in **any directory** on the Dell laptop.  
All paths are **relative**, not absolute.

Oracle/
server/
agent/
vault/
dashboard/
embeddings/
config/
scripts/
logs/
spec.md


This structure works regardless of where Oracle is placed.

---

# 4. Components

## 4.1 Oracle MCP Server (`server/`)
Responsibilities:
- Expose MCP tools  
- Manage vault  
- Coordinate curator  
- Serve dashboard API  
- Manage embeddings (optional)  
- Run from any directory  

Key files:
- `server/src/index.ts`  
- `server/src/infra/httpServer.ts`  
- `server/src/infra/mcpServer.ts`  
- `server/src/infra/gitIntegration.ts`  
- `server/src/infra/logging.ts`  

## 4.2 Vault Manager (`server/core/vaultManager.ts`)
Responsibilities:
- Read/write Markdown notes  
- Maintain index  
- Manage git history  
- Provide search  

## 4.3 Curator Agent (`server/core/curator.ts`)
Responsibilities:
- Auto‑link notes  
- Merge duplicates  
- Maintain graph  
- Reindex vault  
- Trigger embeddings  

## 4.4 MCP Tools (`server/mcp/tools/`)
Tools:
- recall  
- propose  
- save  
- update  
- review  
- semantic_query  
- git_history  
- handoff  
- toggle_private  

## 4.5 Vector DB (Optional) (`embeddings/`)
Supports:
- Chroma  
- LanceDB  
- SQLite embedding store  

## 4.6 Barbara Gordon Agent (`agent/`)
Responsibilities:
- Load local model  
- Use Barbara Gordon persona  
- Call MCP tools  
- Provide conversational interface  

Key files:
- `agent/src/index.ts`  
- `agent/src/modelLoader.ts`  
- `agent/src/mcpClient.ts`  
- `agent/src/chatLoop.ts`  
- `agent/src/config.ts`  

## 4.7 Dashboard (`dashboard/`)
Responsibilities:
- Browse vault  
- View graph  
- Inspect embeddings  
- View curator logs  

---

# 5. Deployment Model (Portable)

Oracle must:

- Run from any directory  
- Use relative paths  
- Store configs in `config/`  
- Detect its root directory at runtime  
- Allow the user to choose the install location on the Dell  

Deployment steps:
1. Copy Oracle folder to any directory on the Dell  
2. Run `scripts/start-server.sh`  
3. Run `scripts/start-agent.sh`  
4. Run `scripts/start-dashboard.sh`  

No hard‑coded paths.

---

# 6. Build Order

1. MCP server core  
2. Vault manager  
3. Curator agent  
4. MCP tools  
5. Vector DB integration  
6. Barbara Gordon agent  
7. Dashboard  
8. Config + scripts  

---

# 7. Done Criteria

Oracle is complete when:

- MCP server runs  
- Vault manager works  
- Curator maintains graph  
- Barbara Gordon agent responds  
- Dashboard displays vault  
- Everything runs from any directory  

---

# 8. Notes

- Oracle is path‑agnostic  
- Barbara Gordon is fully integrated  
- Deployment directory is chosen at install time  
- Dell laptop is the final runtime environment  

Dell laptop specs:
Device name	DELL
Processor	Intel(R) Core(TM) i5-7300HQ CPU @ 2.50GHz   2.50 GHz
Installed RAM	32.0 GB (31.9 GB usable)
Device ID	7368453C-1CF7-4211-995C-7CDDD2EE597C
Product ID	00325-96111-29587-AAOEM
System type	64-bit operating system, x64-based processor
Pen and touch	Touch support with 10 touch points

## 8.1 Runtime Target Profile (Confirmed)

Primary runtime target for deployment and performance tuning:

- Device name: DELL
- Processor: Intel(R) Core(TM) i5-7300HQ CPU @ 2.50GHz
- Installed RAM: 32.0 GB (31.9 GB usable)
- Device ID: 7368453C-1CF7-4211-995C-7CDDD2EE597C
- Product ID: 00325-96111-29587-AAOEM
- System type: 64-bit operating system, x64-based processor
- Pen and touch: Touch support with 10 touch points

Operational implication:
- Keep indexing and dashboard refresh lightweight by default.
- Prefer incremental curator operations over full expensive recompute.
- Preserve local-first operation with optional embeddings and feature toggles.

---

# 9. Node Delegation Setup (Heavy Coding Workloads)

Use this when you want the Oracle project to offload large coding tasks to the node agent UI.

## 9.1 Endpoint and Active Node
- UI Endpoint: `http://192.168.68.40:8090/ui`
- Node ID: `code-node-01`
- LLM Runtime: `qwen2.5-coder:7b` via local Ollama at `http://127.0.0.1:11434`

## 9.2 Bring-Up Checklist
1. Open the UI endpoint.
2. In Model Manager, click **Refresh Models**.
3. Ensure `qwen2.5-coder:7b` is selected in the model dropdown.
4. Confirm Connection Topology shows `Connected: true (http 200)`.
5. Confirm SQLite and Vector DB both report `true`.
6. Send a short health prompt in Agent Chat:

```text
Health check: confirm node online, active model, and toolchain status in 4 bullets.
```

## 9.3 Delegation Contract Prompt (Paste Once Per Session)

```text
You are the Oracle coding delegate for this session.

Rules:
1) Return output in this order: PLAN, PATCHES, TESTS, RISKS.
2) Prefer small safe edits over broad refactors.
3) If blocked, report the blocker and propose one fallback.
4) Keep assumptions explicit.
5) Do not invent files or APIs that were not requested.

Project objective:
Implement Oracle incrementally: MCP server core, vault manager, curator, MCP tools, Barbara Gordon agent, dashboard.
```

## 9.4 Task Packet Template (Use For Each Delegated Job)

```text
Task: <single concrete coding objective>

Context:
- Repo root: Oracle/
- Relevant files: <list>
- Constraints: portable paths only, relative paths, no hard-coded install dirs

Deliverables:
1) PLAN (max 6 steps)
2) PATCHES (exact file edits)
3) TESTS (what ran, expected results)
4) RISKS (known tradeoffs)

Definition of done:
- <objective-specific acceptance checks>
```

## 9.5 Reliability Notes
- If Agent Chat send button remains disabled after submit, reload the page and resend the same task packet.
- Keep each delegated task narrowly scoped (one objective at a time) to reduce hangs and improve patch quality.
- Treat delegated output as a draft: review and validate before merging into Oracle.

## 9.6 Local Backup LLM (This PC via Ollama)

If node delegation hangs, fail over to local Ollama on this PC.

### Backup Trigger
- Trigger failover when any of these are true:
1. Agent Chat remains disabled for more than 60 seconds.
2. Connection Topology does not show `Connected: true (http 200)`.
3. Node returns repeated empty or partial outputs for the same prompt.

### Local Ollama Health Check (PowerShell)

```powershell
ollama list
ollama ps
```

If no coding model is available locally:

```powershell
ollama pull qwen2.5-coder:7b
```

### Local Delegation Prompt (Fallback)

```text
You are the Oracle local backup coding delegate.

Output format:
PLAN
PATCHES
TESTS
RISKS

Constraints:
- Portable paths only
- Relative paths only
- No hard-coded install directories
- Small, safe, incremental edits

Task:
<paste the same task packet used for the node UI>
```

### Local Run Command (PowerShell)

```powershell
# Immediate fallback using currently installed model:
ollama run qwen2:latest

# Optional preferred coding model (after pull):
# ollama run qwen2.5-coder:7b
```

### Return to Primary Node
1. Re-open `http://192.168.68.40:8090/ui` and refresh models.
2. Verify connection shows `Connected: true (http 200)`.
3. Resume new tasks on node UI, but keep the local Ollama session available as hot standby.

---

# 10. Deferred Task Queue

## 10.1 Saved For Later
- Completed: wire the vector store into curator flow so reindex emits embeddings and supports semantic query via an MCP tool.
- Target files:
	- `server/src/core/curator.ts`
	- `server/src/core/vectorStore.ts`
	- `server/src/mcp/tools/` (new semantic query tool)
	- `server/src/mcp/tools/index.ts`
- Acceptance checks:
	- Reindex persists vectors for notes.
	- MCP semantic query returns relevance-ranked notes.
	- Endpoints compile and run with existing server startup flow.

---

# 11. Advanced Ops (Implemented)

## 11.1 Graph Filters + Interactive Graph
- Graph endpoint supports filters:
	- `pathPrefix`
	- `minDegree`
	- `minEdgeWeight`
	- `orphansOnly`
- Dashboard includes:
	- Knowledge graph visualization
	- One-click graph export (JSON)
	- Click-through note inspection

## 11.2 Note Drilldown + Timeline
- Note detail API: `/api/vault/note?path=<relative-note-path>`
- Note timeline API: `/api/vault/note/timeline?path=<relative-note-path>`
- Dashboard shows backlinks, related notes, and git timeline for selected nodes.

## 11.3 Graph History + Diff
- Curator persists current graph snapshot to:
	- `logs/curator-graph.json`
- Curator appends snapshot history to:
	- `logs/curator-graph-history.jsonl`
- Graph diff API:
	- `/api/curator/graph/diff`

## 11.4 System + Performance Metrics
- System metrics API:
	- `/api/system/metrics`
- Returns runtime profile, process memory, last reindex timing, and background reindex status.

## 11.5 Optional Background Reindex
- Controlled by config or environment:
	- Config: `features.backgroundReindexMinutes`
	- Env: `ORACLE_BACKGROUND_REINDEX_MINUTES`
- Status API:
	- `/api/curator/background-status`

## 11.6 Pure Markdown Mode Preset
- Mode controls:
	- Config: `mode` = `hybrid` or `pure_markdown`
	- Env override: `ORACLE_MODE`
- In `pure_markdown` mode, embeddings are force-disabled and semantic query tooling is inactive.

## 11.7 Agent Auto-Memory (Implemented)
- Purpose:
	- Persist user/agent turns to local Markdown memory files for later recall and auditing.
- Storage:
	- `vault/chat-memory/YYYY-MM-DD.md`
- Controls:
	- Config: `agent.autoMemory` (default `true`)
	- Env override: `ORACLE_AGENT_AUTO_MEMORY` (`1|true|yes|on` to enable, other values disable)
- Behavior:
	- Each response appends a timestamped block with user input, Oracle output, and extracted key points.

## 11.8 IDE Session Readiness
- Agent prompt construction now includes available MCP tools when the server is healthy.
- Effect:
	- IDE-connected usage has stronger task routing because Oracle can mention the best tool names explicitly.
	- If MCP is unavailable, prompt degrades gracefully with `Available MCP tools: unknown`.

## 11.9 Memory-Informed Prompting (Implemented)
- Agent prompt now includes a compact summary of recent chat-memory key points.
- Source:
	- `vault/chat-memory/*.md` key-point bullets from latest sessions.
- Effect:
	- Oracle better preserves user preference continuity between turns and sessions.
	- If no memory exists or parsing fails, prompt degrades gracefully with `Recent chat memory: none`.

## 11.10 Native Dashboard Chat (Implemented)
- Dashboard now includes a `Barbara Chat` panel.
- API endpoint:
	- `POST /api/oracle/chat` with body `{ "message": "..." }`
- Behavior:
	- Server builds Barbara persona prompt plus available MCP tool names.
	- Relevant vault hints are included from note search.
	- Response is generated through local Ollama and returned to dashboard chat.

## 11.11 Launch Preflight (Implemented)
- Script:
	- `scripts/preflight.ps1`
- Purpose:
	- Validate launch readiness in one command for:
		- Oracle server health
		- MCP tool availability
		- Ollama reachability
		- Central memory path existence + write access
- Run:
	- `Set-Location "<oracle-root>"; .\scripts\preflight.ps1`
- Exit codes:
	- `0` = READY
	- `1` = NOT READY (one or more failed checks)

## 11.12 Launch Wrapper (Implemented)
- Script:
	- `scripts/launch.ps1`
- Purpose:
	- Run preflight first, then launch server/agent only if checks pass.
- Run:
	- `Set-Location "<oracle-root>"; .\scripts\launch.ps1`
- Options:
	- `-DryRun` to preview actions without opening processes.
	- `-SkipServer` or `-SkipAgent` to launch selected components only.

## 11.13 Dell Install Package (Implemented)
- Build script:
	- `scripts/build-install-package.ps1`
- Output:
	- `release/Oracle-Dell-Package-v<version>-b<timestamp>/`
	- `release/Oracle-Dell-Package-v<version>-b<timestamp>.zip`
- Package includes:
	- Built runtime (`server/dist`, `agent/dist`)
	- Dashboard, config, vault, embeddings, logs
	- Installer and startup scripts under `scripts/`
	- `README-INSTALL.md`
	- `VERSION`
	- `BUILD-INFO.json` (version, build id, timestamp, source commit)




