# Claude Code Task System - Technical Specification

## Overview

This document provides the technical specification for Claude Code's task system file format, enabling third-party implementations (Skills, external applications) to maintain 100% compatibility.

## File Location

Tasks are stored in JSON format at:

```
~/.claude/tasks/{task-list-id}/tasks.json
```

### Task List Identification

The task list ID is determined in the following order of precedence:
1. `CLAUDE_CODE_TASK_LIST_ID` environment variable.
2. The current project name (derived from `package.json` or `.git` parent directory).
3. The current directory name.
4. "default" (fallback).

**Shared Tasks (Project-based):**
- By default, tasks are shared across sessions for the same project.
- Stored in `~/.claude/tasks/{project-name}/tasks.json`.

**Custom Named Tasks:**
- Set via `CLAUDE_CODE_TASK_LIST_ID` environment variable to override the project name.
- Example: `CLAUDE_CODE_TASK_LIST_ID=shared-session claude`.
- Enables cross-session task sharing
- Allows external application access

## JSON Schema

### Root Object

```json
{
  "tasks": [TaskObject],
  "version": number,
  "last_updated": string (ISO 8601 timestamp)
}
```

### Task Object

```json
{
  "id": string (UUID or unique identifier),
  "description": string (markdown supported),
  "status": "pending" | "in_progress" | "completed" | "blocked",
  "created_at": string (ISO 8601 timestamp),
  "updated_at": string (ISO 8601 timestamp),
  "assignee": string (optional, agent ID or name),
  "dependencies": [string] (optional, array of task IDs),
  "parent_id": string (optional, for subtasks),
  "metadata": {
    "priority": "low" | "medium" | "high",
    "tags": [string],
    "source": string (e.g., "user", "agent", "hook"),
    "custom_fields": object
  }
}
```

### Complete Example

```json
{
  "tasks": [
    {
      "id": "task-001",
      "description": "Set up project structure",
      "status": "completed",
      "created_at": "2025-02-06T10:00:00Z",
      "updated_at": "2025-02-06T10:30:00Z",
      "assignee": null,
      "dependencies": [],
      "metadata": {
        "priority": "high",
        "tags": ["setup", "infrastructure"]
      }
    },
    {
      "id": "task-002",
      "description": "Implement authentication module",
      "status": "in_progress",
      "created_at": "2025-02-06T10:05:00Z",
      "updated_at": "2025-02-06T11:00:00Z",
      "assignee": "agent-123",
      "dependencies": ["task-001"],
      "metadata": {
        "priority": "high",
        "tags": ["backend", "security"]
      }
    },
    {
      "id": "task-003",
      "description": "Create user dashboard",
      "status": "blocked",
      "created_at": "2025-02-06T10:10:00Z",
      "updated_at": "2025-02-06T10:10:00Z",
      "assignee": null,
      "dependencies": ["task-002"],
      "metadata": {
        "priority": "medium",
        "tags": ["frontend", "ui"]
      }
    }
  ],
  "version": 2,
  "last_updated": "2025-02-06T11:00:00Z"
}
```

## Field Specifications

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (UUID v4 recommended) |
| `description` | string | Task description (supports markdown) |
| `status` | string | Current task state |
| `created_at` | string | ISO 8601 timestamp of creation |
| `updated_at` | string | ISO 8601 timestamp of last modification |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `assignee` | string \| null | ID of assigned agent or user |
| `dependencies` | string[] | IDs of tasks that must complete first |
| `parent_id` | string | Parent task ID for subtasks |
| `metadata` | object | Additional structured data |

### Status Values

| Status | Description |
|--------|-------------|
| `pending` | Task waiting to be started |
| `in_progress` | Task currently being worked on |
| `completed` | Task finished successfully |
| `blocked` | Cannot proceed due to unmet dependencies |

**Status Transition Rules:**
- A task can only be `in_progress` if all dependencies are `completed`
- A task becomes `blocked` if any dependency is not `completed`
- Setting a task to `completed` may unblock dependent tasks

### Dependencies

The dependencies feature allows tasks to specify prerequisites:

```json
{
  "id": "task-b",
  "description": "Build API endpoints",
  "dependencies": ["task-a", "task-c"],
  "status": "pending"
}
```

**Dependency Rules:**
- Circular dependencies are invalid and should be rejected
- A task with dependencies can only start when all dependencies are `completed`
- File locking is used to prevent race conditions when multiple agents claim tasks

## Tools API

### TodoWrite

Creates or updates a task in the task list.

**Parameters:**
```json
{
  "id": string (optional, generates UUID if omitted),
  "description": string (required),
  "status": string (optional, defaults to "pending"),
  "dependencies": [string] (optional),
  "assignee": string (optional),
  "metadata": object (optional)
}
```

**Behavior:**
- If `id` exists: updates the task
- If `id` omitted: creates new task with auto-generated UUID
- Automatically updates `updated_at` timestamp
- Validates dependency references exist
- Prevents circular dependencies

### TodoRead

Reads tasks from the task list with optional filtering.

**Parameters:**
```json
{
  "status": string (optional, filter by status),
  "assignee": string (optional, filter by assignee),
  "include_completed": boolean (optional, default false)
}
```

**Returns:**
```json
{
  "tasks": [TaskObject],
  "count": number,
  "pending_count": number,
  "in_progress_count": number,
  "completed_count": number,
  "blocked_count": number
}
```

## SubagentStop Integration

The `SubagentStop` event fires when a subagent completes its work. It can interact with the task system:

**Hook Input:**
```json
{
  "session_id": string,
  "transcript_path": string,
  "cwd": string,
  "permission_mode": string,
  "hook_event_name": "SubagentStop",
  "agent_type": string,
  "agent_id": string,
  "tasks_completed": [string] (task IDs),
  "result": object
}
```

**Decision Control:**
```json
{
  "decision": "block",
  "reason": string,
  "hookSpecificOutput": {
    "hookEventName": "SubagentStop",
    "tasks_to_update": [
      {
        "task_id": string,
        "status": "completed"
      }
    ]
  }
}
```

## File Locking & Concurrency

Claude Code uses file locking to prevent race conditions:

```javascript
// Pseudocode for safe task updates
const fd = fs.openSync(tasksPath, 'r+');
try {
  fs.flockSync(fd, 'ex'); // Exclusive lock
  const tasks = JSON.parse(fs.readFileSync(fd, 'utf8'));
  // ... modify tasks ...
  fs.writeFileSync(tasksPath, JSON.stringify(tasks, null, 2));
} finally {
  fs.flockSync(fd, 'un'); // Unlock
  fs.closeSync(fd);
}
```

## Implementation Guidelines for Skills

### 100% Compatibility Requirements

1. **File Path Resolution:**
   - Respect `CLAUDE_CODE_TASK_LIST_ID` environment variable
   - Default to session-specific or project-specific ID
   - Store in `~/.claude/tasks/{id}/tasks.json`

2. **JSON Format:**
   - Use exact field names (snake_case)
   - ISO 8601 timestamps with 'Z' suffix
   - Pretty-print with 2-space indentation (for human readability)

3. **Status Management:**
   - Implement dependency validation
   - Auto-update `blocked` status based on dependencies
   - Update `updated_at` on every modification

4. **Error Handling:**
   - Validate JSON schema before writing
   - Handle file locking gracefully
   - Provide clear error messages for invalid operations

### Example Skill Implementation

```yaml
---
name: task-manager
description: Manage Claude Code tasks independently
---

You are a task management assistant that reads and writes to Claude Code's task file format.

**File Location:**
- Check `CLAUDE_CODE_TASK_LIST_ID` env var for named task list
- Default path: `~/.claude/tasks/{id}/tasks.json`

**Supported Operations:**

1. **List Tasks:**
   - Read tasks.json
   - Filter by status if requested
   - Display with dependency information

2. **Create Task:**
   - Generate UUID if no ID provided
   - Set default status to "pending"
   - Validate dependencies exist
   - Update file with proper locking

3. **Update Task:**
   - Modify status, description, or assignee
   - Update `updated_at` timestamp
   - Recalculate blocked status for dependents

4. **Complete Task:**
   - Set status to "completed"
   - Check for unblocked dependent tasks
   - Notify if other tasks can now start

**Always:**
- Use file locking for concurrent access
- Maintain version field in root object
- Validate dependencies (no circular refs)
- Pretty-print JSON output
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `CLAUDE_CODE_TASK_LIST_ID` | Named task list identifier |
| `CLAUDE_CODE_ENABLE_TASKS` | Set to `false` to disable (reverts to legacy TODO) |
| `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` | Enable agent team shared task lists |

## References

- [Claude Code Interactive Mode](https://code.claude.com/docs/en/interactive-mode.md)
- [Claude Code Agent Teams](https://code.claude.com/docs/en/agent-teams.md)
- [Claude Code Hooks](https://code.claude.com/docs/en/hooks.md)
- [Claude Code Skills](https://code.claude.com/docs/en/skills.md)

## Version History

| Version | Changes |
|---------|---------|
| 1 | Initial task format |
| 2 | Added dependencies support, metadata field |

---

**Note:** This specification is based on reverse-engineering from Claude Code documentation and behavior. The exact implementation details may vary. For the most up-to-date information, refer to the official Claude Code documentation.
