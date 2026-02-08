# OpenCode Plugin Architecture & Development Guide

This document provides a comprehensive overview of how OpenCode plugins are structured, developed, and installed, based on the `opencode-plugin-opencoder` implementation.

## Overview

An OpenCode plugin extends the capabilities of the OpenCode CLI by providing lifecycle hooks and custom agents. It follows a specific API that allows it to intercept events and tool executions, and it typically bundles one or more autonomous agents.

## Project Structure

A typical OpenCode plugin project (using Bun and TypeScript) is structured as follows:

```
plugin-repo/
├── agents/                    # Agent markdown files
│   ├── main-agent.md
│   └── sub-agent.md
├── src/
│   ├── index.ts              # Main entry: exports plugin + metadata
│   ├── plugin.ts             # Plugin implementation (hooks)
│   ├── metadata.ts           # Metadata (name, version, agents)
│   └── paths.mjs             # Path utilities for scripts
├── postinstall.mjs           # Installation script (copies agents)
├── preuninstall.mjs          # Uninstallation script (removes agents)
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
└── biome.json                # Linter/Formatter configuration
```

## Plugin Architecture

### 1. The Plugin Function

The core of a plugin is an asynchronous function that follows the `@opencode-ai/plugin` API.

```typescript
import type { Plugin, PluginInput, Hooks } from "@opencode-ai/plugin";

export const MyPlugin: Plugin = async (ctx: PluginInput): Promise<Hooks> => {
  // Initialization logic
  return {
    event: async ({ event }) => {
      // Intercept session events
    },
    "tool.execute.before": async (data, output) => {
      // Intercept tool execution before it starts
    },
    "tool.execute.after": async (data, output) => {
      // Intercept tool execution after it completes
    }
  };
};
```

### 2. Metadata

Plugins must export metadata for introspection and compatibility.

```typescript
export const name = "my-plugin";
export const version = "0.1.0";
export const description = "A brief description of the plugin";
export const agents = ["agent-name"];
```

### 3. Lifecycle Hooks

The `Hooks` object returned by the plugin function allows for fine-grained control:

- **`event`**: Triggered on session creation, message receipt, etc.
- **`tool.execute.before`**: Allows logging or modifying tool calls before they run.
- **`tool.execute.after`**: Allows capturing tool output for logging or analysis.

## Agent Format

Agents are defined in Markdown files with a YAML frontmatter. They are usually placed in an `agents/` directory.

### Frontmatter Fields

- **`version`**: Semantic version of the agent.
- **`requires`**: Compatibility range for OpenCode.
- **`updated`**: Last update date.

### Content Structure

- **Role Definition**: "You are [Agent Name]..."
- **Core Instructions**: Critical rules and behaviors.
- **Tools & Workflow**: How the agent uses available tools or subagents.
- **Examples**: Demonstrations of expected behavior.

Example:
```markdown
---
version: 1.0.0
requires: ">=0.1.0"
updated: 2026-02-08
---

# My Agent

You are a specialized agent that...
```

## Installation Mechanism

Since the OpenCode plugin API currently focuses on hooks, agents are typically installed by copying them to the user's local configuration directory.

### 1. `postinstall.mjs`

Triggered by `npm install`, this script copies agents to `~/.config/opencode/agents/`.

```javascript
// postinstall.mjs
import { copyFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const targetDir = join(homedir(), ".config", "opencode", "agents");
// Logic to copy .md files from agents/ to targetDir
```

### 2. `package.json` Configuration

```json
{
  "scripts": {
    "postinstall": "node postinstall.mjs",
    "preuninstall": "node preuninstall.mjs"
  }
}
```

## Dependencies & Installation

OpenCode plugins leverage standard package management while following specific patterns for agent distribution.

### 1. Dependency Management
- **Runtime**: The project uses **Bun** as the primary runtime for its speed and integrated toolchain.
- **Core Library**: `@opencode-ai/plugin` is the main dependency providing types and API interfaces.
- **Peer Dependencies**: `opencode` is often listed as a peer dependency to ensure compatibility with the host environment.
- **Development Tools**:
    - **TypeScript**: Used for all source files.
    - **Biome**: Employed for linting and formatting, ensuring high-performance code quality checks.
    - **Node.js Built-ins**: When using Node.js modules (like `node:fs`), the `node:` prefix is preferred.

### 2. Installation Lifecycle
The installation process is automated through `package.json` hooks:

- **`postinstall`**: Runs a Node.js script (e.g., `postinstall.mjs`) to copy agent markdown files to the OpenCode configuration directory (`~/.config/opencode/agents/`). This step is crucial because the plugin API does not yet support dynamic agent registration.
- **`preuninstall`**: Runs a cleanup script (e.g., `preuninstall.mjs`) to remove the agents from the configuration directory when the plugin is removed.

### 3. Insights from the Project
- **Agent Distribution**: Currently, agents are "installed" by physically copying Markdown files. This bypasses the need for the host `opencode` process to "require" the plugin to see the agents.
- **Version Compatibility**: Agents include a `requires` field in their frontmatter to specify which versions of OpenCode they support.
- **Atomic Workflows**: The orchestrator/subagent pattern (Planner -> Builder) allows for complex, autonomous workflows while keeping individual agent instructions focused and manageable.
- **Verification Loop**: The Builder agent is instructed to run specific project-level commands (e.g., `bun test`, `bun run lint`) to verify its own work before committing, mimicking a human developer's local workflow.

## Tools & Development Workflow

### Recommended Stack

- **Runtime**: [Bun](https://bun.sh/) for fast execution and testing.
- **Language**: TypeScript for type safety.
- **Linter/Formatter**: [Biome](https://biomejs.dev/) for high-performance linting.
- **API Library**: `@opencode-ai/plugin`.

### Common Commands

- `bun install`: Install dependencies and run `postinstall`.
- `bun test`: Run unit tests for plugin logic and agent validation.
- `bun run typecheck`: Verify TypeScript types.
- `bun run lint`: Check for code style issues.

## Best Practices

1. **Proactiveness**: Agents should be designed to move tasks forward without constant user intervention.
2. **Context Management**: Use summaries and clear state transitions to avoid context bloat.
3. **Conventional Commits**: When agents modify code, they should use conventional commit messages.
4. **Safety**: Plugins should log critical actions but never expose secrets.
5. **Idempotency**: Installation scripts should be safe to run multiple times.
