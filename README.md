# Agentic Tasks

**Agentic Tasks** is a high-performance, persistent task management system designed for AI agents. It brings advanced dependency modeling and autonomous execution loops to any environment, while maintaining 100% file format compatibility with **Claude Code**.

## Main Strengths

-   **Deep Dependency Modeling**: Unlike simple todo lists, Agentic Tasks supports complex task graphs. Tasks can be `blocked` by others, ensuring agents follow a logical execution order.
-   **Parallel-Ready**: The system identifies which tasks are unblocked and ready for work, enabling multiple agents or parallel processes to operate on the same project without conflict.
-   **Persistent State**: Task state is stored in a standardized JSON format (`tasks.json`), allowing you to pause a session in one agent (e.g., Claude Code) and resume it in another (e.g., OpenCode or a custom CLI agent).
-   **Autonomous Execution (Ralph Loop)**: Includes a built-in "Ralph Loop" that can automatically iterate through pending tasks, spawning agents until the entire task list is completed.
-   **Safety First**:
    -   **Strict Validation**: Uses [Zod](https://zod.dev/) to enforce schema compliance.
    -   **Auto-Recovery**: Automatically creates backups (`tasks.json.bak`) and restores from them if corruption is detected.
    -   **Concurrency**: Uses file locking to prevent race conditions.

## Compatibility & Usage

Agentic Tasks is designed to be universal:
-   **Claude Code**: Fully compatible with Claude Code's task system (`~/.claude/tasks/`).
-   **OpenCode Plugin**: Injects task context directly into the agent's environment and provides a native `manage_tasks` tool.
-   **Universal Skill**: Can be loaded as a "skill" in any agent system that supports markdown-based tool definitions.
-   **Standalone CLI**: Manage tasks from any terminal using bundled Bash or PowerShell scripts.

## Comparison: Agentic Tasks vs. OpenCode Internal Todo System

| Feature | OpenCode Internal System | Agentic Tasks |
| :--- | :--- | :--- |
| **Persistence** | Session-based / Simple List | Persistent JSON (Cross-agent) |
| **Dependencies** | Linear / No dependencies | **Blocked/Dependent Tasks** |
| **Parallelism** | Single-threaded focus | **Multi-task Parallel Processing** |
| **Compatibility** | OpenCode Only | **Claude Code Compatible** |
| **Automation** | Manual | **Autonomous Ralph Loop** |

While OpenCode's built-in system is great for quick notes, **Agentic Tasks** is designed for complex engineering projects where tasks have strict order requirements and benefit from automated, multi-step execution.

## Installation & Build

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/karma-works/agentic-tasks.git
    cd agentic-tasks
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Build the project**:
    ```bash
    npm run build
    ```

4. **Install Plugin and Skill in OpenCode**
```bash
install.sh
```

## 3 Ways to Use Agentic Tasks

### 1. Skill + Plugin (Full Integration - Recommended)
The plugin automatically injects the current task context when files are edited and provides the `manage_tasks` tool natively.

### 2. Pure Skill (Manual Management)
Use the skill in environments without plugin support. Manage tasks via CLI commands or by asking the agent to run the provided scripts.

### 3. Ralph Loop (Automated Execution)
Define a list of tasks, then run the Ralph script to have an agent execute them one-by-one automatically:
```bash
./scripts/ralph.sh --model google/antigravity-gemini-3-flash
```

## Architecture

-   **`src/agentic_tasks.ts`**: Unified plugin and manager logic.
-   **`skills/agentic-tasks/`**: The standalone skill package containing bundled CLI scripts and instructions.
-   **`bin/`**: Global CLI wrappers for manual task management.

---

## Configuration

### Setting up the Ralph Loop

For autonomous execution (Mode 3), you can set up the Ralph loop in any project:

1. Run the setup script provided by the skill:
   ```bash
   # From your project root
   ./skills/agentic-tasks/scripts/setup_ralph.sh .
   ```

2. This creates `scripts/ralph.sh` and `scripts/tasks/` in your project.

3. Run the loop:
   ```bash
   ./scripts/ralph.sh --model google/antigravity-gemini-3-flash
   ```

#### Ralph Configuration

- **Custom Model**: Specify which model the agent should use:
  ```bash
  ./scripts/ralph.sh --model google/antigravity-gemini-3-flash
  ```
- **Custom Agent**: Change the underlying AI agent command (defaults to `opencode`). This can be set via environment variable or CLI flag:
  ```bash
  export AGENTIC_TASKS_AGENT="custom-agent"
  ./scripts/ralph.sh
  # OR
  ./scripts/ralph.sh --agent custom-agent
  ```
- **Max Iterations**: Limit the number of tasks processed in a single loop (default: 10):
  ```bash
  ./scripts/ralph.sh --max-iterations 5
  ```
- **Dry Run**: See what commands would be executed without actually running the agent:
  ```bash
  ./scripts/ralph.sh --dry-run
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

- `list [status]`: List all tasks (optionally filter by status: pending, in_progress, completed, blocked).
- `add <description> [priority] [tags] [deps]`: Create a new task.
  - Priority: low, medium, high.
  - Tags: comma-separated string.
  - Deps: comma-separated string of Task IDs.
- `start <id>`: Mark a task as in progress.
- `complete <id>`: Mark a task as completed (unblocks dependent tasks).
- `update <id> [description] [status] [priority]`: Update task fields.
- `remove <id>`: Remove a task (fails if other tasks depend on it).

## License

MIT