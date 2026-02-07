# Plan: Enhance tasks-ai for Standalone Skill Usage

## Objective
Enable the `tasks-ai` skill to function independently of the OpenCode plugin, providing "limited functionality" (manual task management via CLI) directly through the skill definition. Update documentation accordingly.

## Limitations of Standalone Mode
-   **No Auto-Hook**: The agent will not receive automatic reminders when editing files.
-   **Manual Invocation**: The agent must explicitly run bash commands (e.g., `tasks.sh list`) instead of using a high-level `manage_tasks` tool.

## Implementation Steps

### 1. Bundle CLI with Skill
To make the skill self-contained:
-   Copy the built CLI artifact `dist/cli.js` to `skills/tasks-ai/scripts/cli.js`.
-   Create a wrapper script `skills/tasks-ai/scripts/tasks.sh` that executes `node scripts/cli.js`.
    -   *Why?* Simplifies the command for the agent (`./scripts/tasks.sh list` vs `node path/to/cli.js list`).

### 2. Update `SKILL.md`
-   Add a **"Standalone Usage"** section.
-   Instruct the agent: "If the `manage_tasks` tool is not available, use the provided script `scripts/tasks.sh` via the `bash` tool."
-   List the CLI commands (`add`, `list`, `complete`, `remove`) with examples.

### 3. Update `README.md`
-   Add a **"Skill-Only Installation"** section.
    -   Instructions to install the skill directory to `~/.opencode/skills/tasks-ai`.
    -   Explain that this mode provides manual task management without the background monitoring plugin.

## Verification
-   Verify that `skills/tasks-ai/scripts/tasks.sh` correctly invokes `cli.js` relative to itself.
-   Review `README.md` for clarity on the two installation methods (Full Plugin vs. Skill Only).

## Next Step
Execute the bundling and documentation updates.
