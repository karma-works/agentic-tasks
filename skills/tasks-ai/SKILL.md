---
name: tasks-ai
description: Comprehensive task management system compatible with Claude Code. Use this skill to track progress, manage dependencies, and ensure state is preserved across sessions.
---

# Tasks AI

This skill provides a robust task management system that is file-compatible with Claude Code's task format.

## 3 Ways to Use Tasks AI

1.  **Skill + Plugin (Full Integration - Recommended)**
    -   **Best for**: Interactive sessions where you want the agent to stay focused.
    -   **Advantages**:
        -   **Auto-Context Injection**: The plugin automatically injects the current task context when files are edited.
        -   **Native Tool Access**: The `manage_tasks` tool is available natively, ensuring reliable task updates.
        -   **Real-time Updates**: The plugin monitors `tasks.json` changes and updates the agent immediately.

2.  **Pure Skill (Manual Management)**
    -   **Best for**: Environments without plugin support (e.g., GitHub Copilot CLI) or when you prefer manual control.
    -   **Usage**: Manage tasks via CLI commands (`./scripts/tasks.sh`) or by asking the agent to run them.
    -   **Scheduling**: You decide when to move to the next task.

3.  **Real Ralph (Automated Loop)**
    -   **Best for**: Autonomous execution of a list of tasks.
    -   **Usage**: Define tasks, then run `./scripts/ralph.sh`.
    -   **Mechanism**: The script loops through pending tasks, spawning a new agent instance for each one until all are complete.

## Ralph Loop (Automated Execution)

You can set up an automated "Ralph loop" to execute tasks sequentially using an AI agent.

### Setup
When the user asks to "setup ralph loop" or similar:
1.  Run the setup script:
    ```bash
    ./skills/tasks-ai/scripts/setup_ralph.sh .
    ```
    *(Adjust path to where the skill is installed, e.g., `~/.opencode/skills/tasks-ai/scripts/setup_ralph.sh`)*

2.  This will create `scripts/ralph.sh` and `scripts/tasks/` in the project.

### Usage
Run the loop:
```bash
./scripts/ralph.sh --model google/antigravity-gemini-3-flash
```

#### Ralph Configuration
- **Custom Model**: `--model MODEL_NAME`
- **Custom Agent**: Set `TASKS_AI_AGENT` env var or use `--agent AGENT_NAME` (defaults to `opencode`).
- **Iteration Limit**: `--max-iterations N` (default: 10)
- **Dry Run**: `--dry-run` to see commands without executing.

## Tools & Commands

### Task List Location
Tasks are stored in `~/.claude/tasks/{id}/tasks.json`.
- Default ID: `default`
- Custom ID: Set via `CLAUDE_CODE_TASK_LIST_ID` env var.

### Features
- **Auto-Recovery**: Automatically backups and restores `tasks.json` if corruption is detected.
- **Dependency Management**: Prevents starting tasks if dependencies are not met.
- **Strict Validation**: Ensures strict adherence to the Claude Code task schema.

### Standalone CLI Usage
If you don't have the plugin, you can manage tasks using the bundled CLI script:

```bash
# List Tasks
./scripts/tasks/tasks.sh list

# Add Task
./scripts/tasks/tasks.sh add "Implement feature X" high "feature,important"

# Complete Task
./scripts/tasks/tasks.sh complete <TASK_UUID>
```
