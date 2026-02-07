---
name: tasks-ai
description: Comprehensive task management system compatible with Claude Code. Use this skill to track progress, manage dependencies, and ensure state is preserved across sessions.
---

# Tasks AI

This skill provides a robust task management system that is file-compatible with Claude Code's task format.

## When to Use

Use this skill when:
- The user has a complex, multi-step goal.
- You need to track progress and state across multiple turns or sessions.
- You want to ensure tasks are completed in the correct order (dependency management).

## Tools & Commands

While this skill primarily operates via the OpenCode plugin hooks, you can also interact with it manually using the provided scripts or CLI if needed.

### Task List Location
Tasks are stored in `~/.claude/tasks/{id}/tasks.json`.
- Default ID: `default`
- Custom ID: Set via `CLAUDE_CODE_TASK_LIST_ID` env var.

### Features
- **Auto-Recovery**: Automatically backups and restores `tasks.json` if corruption is detected.
- **Dependency Management**: Prevents starting tasks if dependencies are not met.
- **Strict Validation**: Ensures strict adherence to the Claude Code task schema.
- **Auto-Hook**: Monitors file edits and reminds the agent of active tasks (Requires Plugin).

## Installation

To use this skill's plugin in OpenCode:

1.  Copy the `assets/tasks_ai_plugin.js` file to your OpenCode plugins directory:
    ```bash
    cp assets/tasks_ai_plugin.js ~/.config/opencode/plugin/tasks_ai.js
    ```
2.  Restart OpenCode.
3.  The tool `manage_tasks` will be available, and the agent will receive automatic updates when editing files.

## Standalone Usage (Without Plugin)

If the `manage_tasks` tool is not available (e.g., you are using the skill without installing the plugin), you can manage tasks manually using the bundled CLI script.

**Important**: This method does **not** provide automatic reminders or file monitoring. You must manually invoke the script to update task status.

### Usage
Run the script `scripts/tasks.sh` using the `bash` tool.

**Examples:**
-   **List Tasks**: `./scripts/tasks.sh list`
-   **Add Task**: `./scripts/tasks.sh add "Implement feature X" high "feature,important"`
-   **Complete Task**: `./scripts/tasks.sh complete <TASK_UUID>`
-   **Remove Task**: `./scripts/tasks.sh remove <TASK_UUID>`
