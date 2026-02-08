In the "Real Ralph Loop" (the Ralph Wiggum technique), **`AGENTS.md`** is updated at the **end of a successful iteration**, right after the verification step but before the session terminates.

While the exact timing can vary based on the specific script or orchestrator (e.g., `snarktank/ralph` vs. a custom Bash loop), here is the industry-standard "Ralph" lifecycle for that file:

### 1. The Trigger: "Discovered Knowledge"

The update happens when the agent realizes it has encountered information that isn't in the code or the PRD but is necessary for future success. This usually occurs after:

* **A "Fix" following a failure:** The agent tried to run tests, they failed because of a hidden dependency, the agent fixed it, and now it needs to "remember" that dependency.
* **Architecture Mapping:** The agent spent 500 tokens exploring the file tree to find where the API routes are. To save those tokens in the next loop, it writes the "map" to `AGENTS.md`.
* **Pattern Recognition:** The agent notices, *"Oh, this project uses `pnpm` but I've been trying `npm`."* It writes: `Use pnpm for all commands` to the file.

### 2. The Sequential Flow

In a well-structured Ralph Loop, the update sequence looks like this:

1. **Work:** Agent modifies code.
2. **Verify:** Agent runs `npm test` or `lint`.
3. **Reflect (The Update):** If successful, the agent is prompted (or self-directs) to: **"Update AGENTS.md with any new patterns or gotchas discovered."**
4. **Commit:** The changes to the code, `prd.json`, and `AGENTS.md` are all committed to Git in one "turn."
5. **Exit/Loop:** The agent exits; the loop restarts; the *new* agent instance reads the updated `AGENTS.md` as its new "System Prompt extension."

### 3. Why it’s updated then (and not later)

The "Real Ralph" philosophy relies on **Statelessness**.

* Because the loop **kills the process** after every task to clear "context rot," the agent will have total amnesia in the next minute.
* If it doesn't write to `AGENTS.md` **before it exits**, that "learned" knowledge is lost forever.
* It acts as the agent's **Long-Term Memory (LTM)**, while the `progress.txt` is its **Short-Term Memory (STM)** of what just happened in the last 10 minutes.

### 4. What actually goes inside?

When the agent updates the file, it typically follows these categories:
| Category | Example Entry |
| :--- | :--- |
| **Commands** | "Run `docker-compose up -d` before running integration tests." |
| **Conventions** | "Always use Arrow Functions for React components in this repo." |
| **Gotchas** | "The `User` model is in `src/legacy/models`, not `src/models`." |
| **Boundaries** | "Do not modify `config/secrets.yml` under any circumstances." |

### 5. Managing "File Bloat"

Because the loop can run hundreds of times, `AGENTS.md` can become a "wall of text." Advanced Ralph setups include instructions to:

* **Prune/Refactor:** Every 10 iterations, the agent is asked to "clean up" the file, merging duplicate rules and deleting obsolete info.
* **Nested Files:** In monorepos, agents update the *nearest* `AGENTS.md` (e.g., `apps/web/AGENTS.md`) so that local knowledge doesn't clutter the root project.

**Would you like me to generate a template for an `AGENTS.md` file that you can drop into your project today?**