Technical Specification: Claude Code Task System (v2.1)
1. Overview

As of version 2.1, Claude Code has transitioned from a simple checklist to a structured Task Event Bus. This allows external applications (IDEs, dashboards, CI runners) to monitor, validate, and synchronize task states via JSON payloads.
2. File Format & Schema

The task list is persisted as a JSON array. By default, the state is stored at: `~/.claude/tasks/{project_name}/tasks.json` (where `{project_name}` is derived from your project directory). You can override this ID via the environment variable `CLAUDE_CODE_TASK_LIST_ID`.
JSON Schema Example
JSON

{
  "tasks": [
    {
      "id": "task_1738950000",
      "subject": "Implement OAuth2 Callback",
      "status": "in_progress",
      "owner": "subagent-alpha",
      "priority": "high",
      "dependencies": ["task_1738948000"],
      "metadata": {
        "created_at": "2026-02-06T10:00:00Z",
        "updated_at": "2026-02-06T10:05:00Z",
        "retry_count": 0
      }
    }
  ]
}

3. Tool Primitives (LLM Interface)

Claude interacts with the task list using four primary tools. External apps can intercept these via the PreToolUse or PostToolUse hooks.
Tool	Input Parameters	Description
TaskCreate	subject, description?, deps?	Adds a new entry. Returns the new task_id.
TaskUpdate	id, status, notes?	Updates state (e.g., pending → completed).
TaskList	filter? (status/owner)	Returns the JSON array to the context window.
TaskGet	id	Returns the full object including hidden metadata.
4. External Integration (Hooks)

The most reliable way to sync this list to an external app (like Jira or a custom UI) is via the SubagentStop hook in your global or project-level settings.
Configuration (~/.claude/settings.json)
JSON

{
  "hooks": {
    "SubagentStop": [
      {
        "type": "command",
        "command": "node ./scripts/sync-external-tasks.js"
      }
    ]
  }
}

Technical Function:

    When a task completes or a subagent finishes its routine, Claude Code serializes the entire task list as JSON.

    It pipes this JSON into the stdin of your specified command.

    Your script can then parse the JSON and update your external database or local log.

5. Advanced Environment Variables
Variable	Effect
CLAUDE_CODE_TASK_LIST_ID	Overrides the default project-based ID. Sets a persistent ID so multiple CLI sessions share the same JSON task file.
CLAUDE_CODE_OUTPUT_FORMAT=json	Forces the entire CLI output to be a stream of JSON objects (useful for headless automation).
Implementation Tip

If you are building a real-time dashboard, use the PostToolUse hook with a matcher for TaskUpdate. This ensures your UI updates the moment Claude marks a task as "In Progress" or "Done" without waiting for the entire session to end.
