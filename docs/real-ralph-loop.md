The "**Real Ralph Loop**" (officially known as the **Ralph Wiggum Technique**) is an autonomous development methodology for AI coding agents. Popularized by Geoffrey Huntley and formalized in repositories like `snarktank/ralph`, it transforms an AI from a "chat partner" into an "autonomous worker" that can run for hours or days without human intervention.

The name comes from Ralph Wiggum from *The Simpsons*—a character who is often confused or makes mistakes but remains persistently optimistic and keeps trying. In the context of AI, it represents the philosophy that **iteration beats perfection.**

### 1. The Core Architecture

At its simplest, a Ralph Loop is a **Bash script** that repeatedly invokes an AI agent (like Claude Code or Amp) with the exact same prompt in a cycle.

#### The State Management (Memory)

Because each iteration of the loop starts a "fresh" agent instance to avoid "context rot" (where the AI gets confused by long conversations), the agent relies on the local filesystem for memory:

* **`prd.json`**: The source of truth. It contains a list of tasks/stories with a `passes: false/true` status.
* **`progress.txt`**: A log where the AI records what it attempted, what failed, and what it learned about the codebase.
* **`CLAUDE.md` / `AGENTS.md**`: A "manual" for the AI, where it writes down reusable patterns (e.g., "Always use this specific API for database calls").
* **Git History**: The AI reads its own previous commits to see what changed in the last "turn."

### 2. The Detailed Feedback Loop

The "magic" of Ralph isn't in the AI's intelligence alone, but in the **forced external feedback loop**. Here is exactly how a single iteration works:

1. **Ingestion:** The script starts the agent and feeds it a prompt: *"Look at the PRD, pick the highest priority unfinished task, and implement it."*
2. **Observation:** The agent reads the `prd.json` and `progress.txt` to understand its current state.
3. **Execution:** The agent modifies the code to implement the feature.
4. **Verification (The "Hard" Feedback):** This is the critical step. The agent **must** run:
* **Linter/Typechecker:** Does the code break the build?
* **Unit Tests:** Does the logic actually work?
* **Browser Tests:** In advanced setups (like the `snarktank` version), the agent uses tools like Playwright to actually "look" at the UI to see if it works.


5. **Persistence:**
* **If tests pass:** The agent commits the code, marks the task as `passes: true` in `prd.json`, and appends "Success" to `progress.txt`.
* **If tests fail:** The agent documents the error in `progress.txt`, does **not** mark the task as done, and may even revert its changes to try a different approach in the next loop.


6. **Termination/Re-entry:**
* Normally, an AI agent would stop and wait for you.
* In a Ralph Loop, a **Stop Hook** (often using Exit Code 2) intercepts the agent's attempt to quit.
* The Bash script sees the agent finished, checks if the PRD is 100% complete, and if not, **immediately restarts the loop** with the same prompt.



### 3. "Real Ralph" vs. Official Plugins

The Reddit thread you referenced highlights a distinction between the "Real Ralph" (the original Bash script philosophy) and some simplified plugins:

* **The Original "Real" Way:** Spawns a **fresh process** every time. This is preferred by power users because it completely wipes the AI's short-term memory, preventing it from getting "stuck" in a mental loop or hallucinating based on a mistake it made 10 minutes ago.
* **The Plugin Way:** Sometimes keeps the same session alive and just "re-prompts." This is faster but risks "context rot," where the AI becomes less capable as the conversation gets longer.

### 4. Why it is effective

* **Context Management:** By breaking a massive project into 50 tiny "vertical slices" (tasks), the AI only needs to think about 2% of the project at a time.
* **Self-Correction:** If the AI makes a mistake in Iteration 5, the test suite catches it. In Iteration 6, the AI reads the error log it wrote itself and fixes the bug.
* **AFK Development:** You can start a Ralph Loop on a Friday night with a 50-task PRD. By Saturday morning, the AI may have gone through 200 iterations (including failures and fixes) and finished the entire feature set.

### Summary of the "Real Ralph" Rules:

1. **Work on ONE task** per iteration.
2. **Run tests/linters** every single time.
3. **Never commit broken code** (keep the CI green).
4. **Update the "Learnings"** so the next version of yourself (the next loop) is smarter.