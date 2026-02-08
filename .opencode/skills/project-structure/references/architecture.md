# Project Architecture: tasks-ai

This document describes the architectural decisions and patterns found in the `tasks-ai` project.

## Core Components

### 1. OpenCode Plugin (`src/tasks_ai.ts`)
The plugin is the primary interface for users within the OpenCode environment.
- **Constraints**: Must be a self-contained single file (or bundle) to avoid loading errors.
- **Issue**: Previously, `manager.ts` was a separate file in the `plugins` directory. OpenCode attempted to load it as a plugin, leading to a `TypeError`.
- **Solution**: Consolidate all logic (Manager, Store, Schemas) into `tasks_ai.ts`.

### 2. Task Management CLI (`skills/tasks-ai/scripts/tasks-cli.cjs`)
A standalone CLI for managing tasks from the shell, used by the Ralph loop.
- **Constraints**: Must be portable and fast.
- **Solution**: Bundled with `esbuild` into a single CommonJS file. This avoids `ts-node` overhead and ESM/CJS compatibility issues in target projects.

### 3. Ralph Loop (`scripts/ralph.sh`)
An automation script that iterates through pending tasks and invokes an AI agent (like `opencode`) to solve them.

## Deployment Patterns

### Installation (`install.sh`)
Deploys the plugin to `~/.config/opencode/plugins/` and the skill to `~/.config/opencode/skills/tasks-ai/`.
- **Cleanliness**: Always ensure `manager.ts` is removed from the plugins directory to prevent boot errors.

### Project Setup (`setup_ralph.sh`)
Integrates the task system into a target project.
- **Location**: Typically creates `scripts/tasks/` in the target project.
- **Bundled CLI**: Copies `tasks-cli.cjs` and a wrapper `tasks.sh`.

## Dependency Management
- **Zod**: Used for task schema validation.
- **@opencode-ai/plugin**: The core SDK for plugin development.
