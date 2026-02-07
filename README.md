# Tasks AI

**Tasks AI** is a robust task management system designed to bring **Claude Code**'s task features to **OpenCode**. It ensures 100% file format compatibility with Claude Code's task system, allowing you to maintain state and context across different agent sessions.

## Features

-   **Cross-Compatible**: Reads and writes `~/.claude/tasks/{id}/tasks.json`, fully compatible with Claude Code.
-   **Safety First**:
    -   **Strict Validation**: Uses [Zod](https://zod.dev/) to enforce schema compliance.
    -   **Auto-Recovery**: Automatically creates backups (`tasks.json.bak`) and restores from them if corruption is detected.
    -   **Concurrency**: Uses file locking to prevent race conditions between agents or processes.
-   **OpenCode Plugin**:
    -   Exposes a `manage_tasks` tool for agents.
    -   **Auto-Hook**: Monitors file edits (`write`, `edit`) and proactively reminds the agent of active (`in_progress`) tasks.

## Prerequisites

-   Node.js (v18 or higher)
-   npm

## Installation & Build

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/your-username/tasks-ai.git
    cd tasks-ai
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Build the plugin**:
    This compiles the TypeScript source into a single bundled JavaScript file.
    ```bash
    npm run build
    ```
    The output will be at `dist/tasks_ai.js`.

## Installing the OpenCode Plugin

To use this with OpenCode:

1.  Ensure your OpenCode plugin directory exists:
    ```bash
    mkdir -p ~/.config/opencode/plugin
    ```

2.  Copy the built plugin:
    ```bash
    cp dist/tasks_ai.js ~/.config/opencode/plugin/tasks_ai.js
    ```

3.  **Restart OpenCode**. The plugin will load automatically.

## Usage

### Using the Plugin (in OpenCode)

Once installed, the agent will have access to the `manage_tasks` tool.

-   **Add a task**: "Add a task to refactor the login page."
-   **List tasks**: "What tasks are pending?"
-   **Complete a task**: "Mark the login refactor task as complete."

**Automatic Reminders**: If you (or the agent) edit a file while a task is marked `in_progress`, the plugin will inject a subtle reminder into the context, ensuring the agent stays focused on the active task.

### Using the CLI (Manual Management)

You can manage tasks directly from the command line without starting OpenCode.

```bash
# List all tasks
npx ts-node src/cli.ts list

# Add a new task (Description, Priority, Tags, Dependencies)
npx ts-node src/cli.ts add "Fix critical bug" high "bug,urgent"

# Complete a task
npx ts-node src/cli.ts complete <TASK_UUID>

# Remove a task
npx ts-node src/cli.ts remove <TASK_UUID>
```

## Architecture

-   **`src/schema.ts`**: Zod definitions for the Task JSON format.
-   **`src/store.ts`**: Handles file I/O, locking, and the backup/restore logic.
-   **`src/task-manager.ts`**: Core business logic (dependency validation, status updates).
-   **`.opencode/plugin/tasks_ai.ts`**: The OpenCode plugin definition.

## License

ISC
