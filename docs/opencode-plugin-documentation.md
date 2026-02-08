Writing plugins for **OpenCode** allows you to extend the AI's capabilities by adding custom tools, intercepting system events, and modifying the agent's behavior.

Below is a comprehensive guide to building your own plugins.

---

### 1. 📂 Getting Started: Plugin Locations

OpenCode looks for plugins in two specific directories. You can create a `.ts` or `.js` file in either:

* **Global Plugins:** `~/.config/opencode/plugins/` (Available in every project).
* **Project-specific Plugins:** `<your-project>/.opencode/plugins/` (Only loaded for that project).

### 2. 🛠️ The Plugin Structure

A plugin is a TypeScript/JavaScript module that exports a `Plugin` function. This function is called when OpenCode starts and receives a context object (`ctx`) containing the SDK client, shell access, and project metadata.

```typescript
import { Plugin, tool } from '@opencode-ai/plugin';

export const MyAwesomePlugin: Plugin = async ({ client, $, project }) => {
  // 1. You can run setup logic here (e.g., checking for installed binaries)
  
  return {
    // 2. Define custom tools for the AI
    tool: {
      myCustomTool: tool({
        description: 'Describe what the tool does for the AI',
        args: {
          inputPath: tool.schema.string().describe('Path to the file'),
        },
        async execute({ inputPath }) {
          // Use ctx.$ for shell commands
          const result = await $`ls ${inputPath}`; 
          return result.text();
        }
      })
    },

    // 3. Listen to system events
    event: async ({ event }) => {
      if (event.type === 'session.created') {
        await client.app.log({ body: { message: 'Plugin Initialized!' } });
      }
    }
  };
};

```

### 3. ⚡ Key Hooks & Capabilities

Plugins can hook into various parts of the OpenCode lifecycle:

| Hook Category | Description |
| --- | --- |
| **`tool.execute.before`** | Intercept or block tools (e.g., block `rm -rf` or validate inputs). |
| **`tool.execute.after`** | Run logic after a tool finishes (e.g., auto-run `npm test` after an `edit`). |
| **`event`** | React to `session.idle`, `message.updated`, or `file.edited`. |
| **`auth`** | Provide custom authentication handlers for third-party services. |
| **`experimental.chat.system.transform`** | Append custom rules or context directly to the AI's system prompt. |

### 4. 📦 Dependencies & Setup

If your plugin needs external npm packages:

1. Create a `package.json` inside your `.opencode/` folder.
2. OpenCode uses **Bun** internally; it will automatically run `bun install` at startup if it detects new dependencies.

### 5. 🔗 Essential Reference Links

* **Official Documentation:** [opencode.ai/docs/plugins](https://opencode.ai/docs/plugins) — Detailed hook references and API info.
* **JS/TS SDK Docs:** [opencode.ai/docs/sdk](https://opencode.ai/docs/sdk) — Methods for `client.session`, `client.file`, etc.
* **Plugin Template:** [zenobi-us/opencode-plugin-template](https://github.com/zenobi-us/opencode-plugin-template) — A scaffold to get started quickly.
* **Awesome OpenCode:** [github.com/awesome-opencode](https://github.com/awesome-opencode/awesome-opencode) — A curated list of community plugins you can use as code references.
