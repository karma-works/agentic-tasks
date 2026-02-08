# `tool.execute.after` Documentation

The `tool.execute.after` hook is a critical lifecycle event in the **OpenCode** plugin ecosystem. It allows developers to intercept, monitor, and react to tool executions performed by the AI agent. This hook is extensively used for tracking progress, ensuring compliance, and implementing multi-agent loops.

---

## 📋 Overview

The `tool.execute.after` event triggers immediately after a tool (e.g., `bash`, `edit`, `read`, `glob`) has finished its execution. It provides the final output of the tool, along with metadata about the context of the call.

### Key Use Cases
1. **Output Transformation:** Modifying or formatting tool results before they are returned to the agent.
2. **Automated Verification:** Triggering secondary actions like running a linter or tests after a file modification.
3. **Session Tracking:** Monitoring agent performance, execution duration, and tool usage patterns.
4. **Multi-Agent Orchestration:** Using the output to update external state machines or progress trackers (as seen in `OpenCoder`).
5. **Compliance Scoring:** Evaluating the "safety" or "relevance" of an action immediately after it completes (as seen in `OpenAgentsControl`).

---

## 🛠️ Hook Signature & Payload

When implementing the hook, you receive an `input` object containing the following properties:

| Field | Type | Description |
| --- | --- | --- |
| `tool` | `string` | The name of the tool that was executed (e.g., `bash`, `write`). |
| `sessionId` | `string` | Unique identifier for the current agent session. |
| `callId` | `string` | Unique identifier for this specific tool invocation. |
| `output` | `string \| object` | The result of the tool execution. **Note:** See the "Output Format Anomaly" below. |
| `outputLength` | `number` | The character length or byte size of the output. |

### Example Implementation

```typescript
export default {
  "tool.execute.after": async (input) => {
    // 1. Log the completion
    console.log(`[LOG]: Tool '${input.tool}' completed in session ${input.sessionId}`);

    // 2. Handle the result
    if (input.tool === 'edit') {
      // Logic to run a linter after an edit
    }

    return input; // Always return the input (or modified version) to proceed
  }
};
```

---

## ⚠️ The "Output Format Anomaly" (Issue #2897)

A known inconsistency exists in the OpenCode core (tracked in **Issue #2897**) regarding the `output` format in this hook. Depending on the environment or the specific tool type, the `output` field may arrive as:

1.  **Raw String:** A plain text representation of the result.
2.  **Structured Object:** A JSON object such as `{ content: string, status: string, error?: string }`.

### Best Practice: Defensive Coding
To ensure your plugin remains stable, always check the type of the `output` field before processing:

```typescript
const toolResult = typeof input.output === 'string' 
  ? input.output 
  : input.output?.content || JSON.stringify(input.output);
```

---

## 🔍 Real-World Examples

### 1. OpenCoder: Multi-Agent Progress Tracking
In the `opencode-plugin-opencoder`, the hook is used to maintain a "task state". After every tool execution, the plugin evaluates if the agent is moving closer to the goal. If a `bash` command returns an error, the plugin can use this hook to inject additional context or "hints" to help the agent recover autonomously.

### 2. OpenAgentsControl: Compliance Tracking
`OpenAgentsControl` uses `tool.execute.after` to calculate a **compliance score**. It checks if the tool output matches the expected behavior defined in the initial plan. If a tool like `rm` is used outside of an approved scope, the hook can flag the session for manual review or log a violation.

### 3. Automated Post-Edit Verification
A common pattern for robust development is to run tests automatically after any code change:

```typescript
export default {
  "tool.execute.after": async (input) => {
    if (input.tool === 'edit' || input.tool === 'write') {
      // Trigger a non-blocking test run in the background
      await ctx.$`npm test -- ${input.filePath}`.quiet();
    }
    return input;
  }
};
```

---

## 💡 When NOT to use `tool.execute.after`

*   **Blocking execution:** If you need to stop a tool from running, use `tool.execute.before`.
*   **Modifying Arguments:** If you need to change the parameters *sent* to the tool, use `tool.execute.before`.
*   **Global Events:** For session-level events like `session.idle` or `session.created`, use the standard `event` handler.

---

## 🔗 References
* [Anomalyco OpenCode Repository](https://github.com/anomalyco/opencode)
* [OpenCoder Plugin Example](https://github.com/anomalyco/opencode-plugin-opencoder)
* [OpenAgentsControl Framework](https://github.com/darrenhinde/OpenAgentsControl)
