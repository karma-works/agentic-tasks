# OpenCode Todo System Documentation

OpenCode provides a structured, session-aware todo system designed to help the AI agent organize complex, multi-step tasks. This system ensures that long-running operations are broken down into manageable units of work and that progress is preserved and visible to the user.

## Core Tools

The todo system is comprised of two primary tools used by the AI:

### 1. `todowrite`
Used to create, update, and manage the task list. 

*   **Function**: Adds new tasks, updates the status of existing tasks (e.g., from `pending` to `in_progress` or `completed`), and organizes tasks by priority.
*   **Best Practice**: The agent should update task statuses in real-time. Only **one** task should be marked as `in_progress` at any given time.
*   **Permission**: Controlled by the `"todowrite"` key in `opencode.json`.

### 2. `todoread`
Used by the agent to retrieve the current state of the task list.

*   **Function**: Returns the JSON array of tasks, allowing the agent to determine what to do next.
*   **Permission**: Controlled by the `"todoread"` key in `opencode.json`.

## Task Structure

Each task in the todo list typically follows this structure:

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | String | A unique identifier for the task. |
| `content` | String | A brief, actionable description of the work. |
| `status` | Enum | The current state: `pending`, `in_progress`, `completed`, or `cancelled`. |
| `priority` | Enum | Importance level: `high`, `medium`, or `low`. |

## Status Transitions

To maintain a clean and effective workflow, the system follows these rules:
1.  **Pending**: The default state for new tasks.
2.  **In Progress**: Set when the agent begins working on a specific task.
3.  **Completed**: Set immediately after a task's requirements are met.
4.  **Cancelled**: Used if a task is determined to be no longer necessary.

## Usage in Subagents

By default, todo tools are **disabled** for subagents (specialized agents launched via the `task` tool) to prevent them from overwriting the main agent's task list. However, they can be enabled manually in the configuration if a subagent needs to manage its own sub-tasks.

## Configuration & Permissions

You can manage the behavior of the todo system in your `opencode.json` file:

```json
{
  "permission": {
    "todowrite": "allow",
    "todoread": "allow"
  }
}
```

*   **`allow`**: The agent can manage tasks silently (Default).
*   **`ask`**: The agent must ask for permission before every task update.
*   **`deny`**: Disables the todo system for the agent.

## Persistence

The todo list is session-specific. It helps the agent maintain context across multiple turns within a single session but is cleared once the session is terminated, unless otherwise handled by a specific plugin or external integration.
