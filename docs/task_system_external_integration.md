# Technical Specification: Claude Code Task System (JSON)

This document describes the internal file format and API primitives for the Claude Code Task System as of February 2026.

## 1. Data Schema (The `.json` Format)
Each task is represented as a structured object. When exported or read from the internal state, it follows this schema:

```json
{
  "id": "task_1738950000",
  "subject": "Implement OAuth2 Callback",
  "description": "Handle the redirect from the provider and exchange code for token.",
  "status": "in_progress",
  "priority": "high",
  "dependencies": ["task_1738949000"],
  "blockedBy": [],
  "metadata": {
    "subagent_id": "worker-alpha",
    "created_at": "2026-02-06T20:41:00Z",
    "updated_at": "2026-02-06T20:45:12Z"
  }
}
```

### Field Definitions:
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | String | Unique identifier (often a timestamp or slug). |
| `status` | Enum | `pending`, `in_progress`, `completed`, `blocked`, `cancelled`. |
| `dependencies` | Array | IDs of tasks that must be completed before this one starts. |
| `metadata` | Object | Tracks which subagent is assigned and timing data. |

---

## 2. Technical Primitives (Tool Access)
Claude Code exposes the task list to its model (and subagents) through the following internal tools. These can be observed by external applications via **Hook Interception**.

### `TaskCreate`
* **Function:** Initializes a new entry in the task list.
* **Input:** `{ subject: string, description?: string, dependencies?: string[] }`

### `TaskUpdate`
* **Function:** Transitions the state of a task.
* **Input:** `{ id: string, status: StatusEnum, notes?: string }`

### `TaskList`
* **Function:** Returns the full array of tasks in the current session context.
* **Output:** `Task[]` (JSON Array)

---

## 3. External Access & Integration
To access this data programmatically, use the **Lifecycle Hooks** configured in `~/.claude/settings.json`.

### Subagent Lifecycle Hook
When a subagent completes a task, Claude Code can pipe the result to an external script:

```json
{
  "hooks": {
    "SubagentStop": [
      {
        "type": "command",
        "command": "node ./scripts/sync-jira.js"
      }
    ]
  }
}
```

### Technical Flow:
1.  **Event Triggers:** Claude finishes a sub-task.
2.  **JSON Injection:** Claude Code serializes the current `Task[]` list and writes it to the `stdin` of your command.
3.  **Process:** Your script (e.g., `sync-jira.js`) reads `fs.readFileSync(0)` to get the JSON, parses it, and updates your external database or UI.

---

## 4. Performance & Persistence
* **Session Isolation:** By default, tasks are scoped to a session ID to prevent "context pollution" across different features.
* **Shared State:** Setting `CLAUDE_CODE_TASK_LIST_ID=shared-feature` allows multiple independent Claude instances to read/write to the same JSON task file simultaneously.