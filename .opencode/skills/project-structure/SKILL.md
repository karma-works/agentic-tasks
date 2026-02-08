---
name: project-structure
description: Information about the agentic-tasks project structure, plugin architecture, and deployment patterns. Use this when working on the agentic-tasks codebase or when deploying it to other projects.
---

# Project Structure Skill

This skill documents the findings regarding the `agentic-tasks` project structure and deployment patterns.

## Project Findings

- **Plugin Architecture**: The OpenCode plugin must be a single-file implementation. Avoid splitting logic into multiple files in the `plugins` directory, as OpenCode will attempt to load each as a separate plugin.
- **CLI Bundling**: The task management CLI is bundled into `tasks-cli.cjs` to ensure portability and avoid ESM/CJS compatibility issues when deployed to other projects.
- **Ralph Loop**: Integration with other projects is handled via `setup_ralph.sh`, which sets up a local `scripts/tasks` directory.

## Architecture Reference

For detailed architectural information, see [architecture.md](references/architecture.md).

## Common Tasks

- **Updating the Plugin**: Modify `src/agentic_tasks.ts` and run `install.sh`.
- **Updating the CLI**: Modify `skills/agentic-tasks/scripts/cli.ts` or `manager.ts`, re-bundle with `esbuild`, and run `install.sh`.
- **Deploying to a Project**: Run `install.sh` then `~/.config/opencode/skills/agentic-tasks/scripts/setup_ralph.sh <project_path>`.
