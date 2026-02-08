# Tasks AI

**Tasks AI** is a robust task management system designed to bring **Claude Code**'s task features to **OpenCode**. It ensures 100% file format compatibility with Claude Code's task system, allowing you to maintain state and context across different agent sessions.

## Features

-   **Cross-Compatible**: Reads and writes `~/.claude/tasks/{id}/tasks.json`, fully compatible with Claude Code.
-   **Safety First**:
    -   **Strict Validation**: Uses [Zod](https://zod.dev/) to enforce schema compliance.
    -   **Auto-Recovery**: Automatically creates backups (`tasks.json.bak`) and restores from them if corruption is detected.
    -   **Concurrency**: Uses file locking to prevent race conditions between agents or processes.
-   **Dual Mode**:
    1.  **Plugin Mode** (Recommended): Exposes a `manage_tasks` tool and auto-monitors file edits.
    2.  **Skill Mode** (Standalone): Allows manual task management via bundled CLI scripts without installing the plugin.

## Prerequisites

-   Node.js (v18 or higher)
-   npm

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

3.  **Build the project**:
    This compiles the TypeScript source into bundled JavaScript files (`dist/tasks_ai.js`, `dist/cli.js`, and `skills/tasks-ai/scripts/cli.js`).
    ```bash
    npm run build
    cp dist/cli.js skills/tasks-ai/scripts/cli.js
    ```

## Usage Option 1: Full Plugin Installation (Recommended)

To get the best experience with automatic reminders and integrated tools:

1.  Ensure your OpenCode plugin directory exists:
    ```bash
    mkdir -p ~/.config/opencode/plugin
    ```

2.  Copy the built plugin:
    ```bash
    cp dist/tasks_ai.js ~/.config/opencode/plugin/tasks_ai.js
    ```

3.  **Restart OpenCode**. The plugin will load automatically.

The agent will have access to the `manage_tasks` tool and will receive automatic reminders when editing files for active tasks.

## Usage Option 2: Skill-Only Installation (Limited Functionality)

If you cannot or do not wish to install the plugin, you can use the skill in standalone mode. This provides manual task management via CLI scripts but lacks automatic reminders.

1.  Copy the entire `skills/tasks-ai` directory to your OpenCode skills folder:
    ```bash
    mkdir -p ~/.opencode/skills
    cp -r skills/tasks-ai ~/.opencode/skills/
    ```

2.  When interacting with the agent, ask it to "use the tasks-ai skill". The agent will read the instructions in `SKILL.md` and use the bundled `scripts/tasks.sh` to manage tasks.

### Setting up the Ralph Loop

For autonomous execution (Mode 3), you can set up the Ralph loop in any project:

1.  Run the setup script provided by the skill:
    ```bash
    # From your project root
    ~/.opencode/skills/tasks-ai/scripts/setup_ralph.sh .
    ```

2.  This creates `scripts/ralph.sh` and `scripts/tasks/` in your project.

3.  Run the loop:
    ```bash
    ./scripts/ralph.sh --model <model_name>
    ```

### Manual CLI Usage

You can manage tasks directly from the command line using the provided wrapper scripts in `bin/`. These do **not** require the OpenCode plugin to be running.

**Bash (Linux/macOS)**:
```bash
./bin/tasks.sh list
./bin/tasks.sh add "Fix critical bug" high "bug,urgent"
./bin/tasks.sh complete <TASK_UUID>
```

**PowerShell (Windows)**:
```powershell
./bin/tasks.ps1 list
./bin/tasks.ps1 add "Fix critical bug" high "bug,urgent"
```

### Supported Commands

-   `list [status]`: List all tasks (optionally filter by status: pending, in_progress, completed, blocked).
-   `add <description> [priority] [tags] [deps]`: Create a new task.
    -   Priority: low, medium, high.
    -   Tags: comma-separated string.
    -   Deps: comma-separated string of Task IDs.
-   `complete <id>`: Mark a task as completed (unblocks dependent tasks).
-   `remove <id>`: Remove a task (fails if other tasks depend on it).

## Architecture

-   **`src/schema.ts`**: Zod definitions for the Task JSON format.
-   **`src/store.ts`**: Handles file I/O, locking, and the backup/restore logic.
-   **`src/task-manager.ts`**: Core business logic (dependency validation, status updates).
-   **`.opencode/plugin/tasks_ai.ts`**: The OpenCode plugin definition.
-   **`skills/tasks-ai/`**: The standalone skill package containing bundled CLI scripts.

## License

ISC
