---
name: project-structure
description: Information about the tasks-ai project structure, plugin architecture, and deployment patterns. Use this when working on the tasks-ai codebase or when deploying it to other projects.
---

# Project Structure Skill

This skill documents the findings regarding the `tasks-ai` project structure and deployment patterns.

## Project Findings

- **Plugin Architecture**: The OpenCode plugin must be a single-file implementation. Avoid splitting logic into multiple files in the `plugins` directory, as OpenCode will attempt to load each as a separate plugin.
- **CLI Bundling**: The task management CLI is bundled into `tasks-cli.cjs` to ensure portability and avoid ESM/CJS compatibility issues when deployed to other projects.
- **Ralph Loop**: Integration with other projects is handled via `setup_ralph.sh`, which sets up a local `scripts/tasks` directory.

## Architecture Reference

For detailed architectural information, see [architecture.md](references/architecture.md).

## Common Tasks

- **Updating the Plugin**: Modify `src/tasks_ai.ts` and run `install.sh`.
- **Updating the CLI**: Modify `skills/tasks-ai/scripts/cli.ts` or `manager.ts`, re-bundle with `esbuild`, and run `install.sh`.
- **Deploying to a Project**: Run `install.sh` then `~/.config/opencode/skills/tasks-ai/scripts/setup_ralph.sh <project_path>`.
