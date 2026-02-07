# Project Plan: tasks-ai Documentation

## Objective
Create a comprehensive `README.md` to guide users on how to install, build, and use the `tasks-ai` project.

## Planned Changes

1.  **Update `package.json`**:
    -   Add `"build": "node build.js"` to the `scripts` section for easier building.

2.  **Create `README.md`**:
    -   **Introduction**: Explain that this is a bridge between Claude Code's task system and OpenCode.
    -   **Prerequisites**: Node.js & npm.
    -   **Setup & Build**:
        -   Steps to install dependencies (`npm install`).
        -   Steps to build the project (`npm run build`).
    -   **Installation**:
        -   **OpenCode Plugin**: Instructions to copy the built artifact (`dist/tasks_ai.js`) to `~/.config/opencode/plugin/tasks_ai.js`.
    -   **Usage**:
        -   **CLI**: Examples of using `npx ts-node src/cli.ts` for managing tasks manually.
        -   **Plugin**: Explanation of the `manage_tasks` tool and the automatic hook that monitors file edits.
    -   **Architecture**: Brief note on the safety features (Zod validation, atomic backups, file locking).

## Verification
-   After creating the README, I will not execute commands since I am documenting usage, but I will ensure the instructions match the actual file paths and script names.

## Next Step
Execute the plan: Update `package.json` and create `README.md`.
