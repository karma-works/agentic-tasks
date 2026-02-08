#!/bin/bash
# Setup script for Agentic Tasks Ralph Loop
# Usage: ./setup_ralph.sh [project_root]

set -e

PROJECT_ROOT="${1:-.}"
SKILL_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Ensure project root exists
if [ ! -d "$PROJECT_ROOT" ]; then
    echo "Error: Project root '$PROJECT_ROOT' does not exist."
    exit 1
fi

echo "Setting up Agentic Tasks Ralph Loop in '$PROJECT_ROOT'..."

# 1. Setup Task Scripts
TASKS_DIR="$PROJECT_ROOT/scripts/tasks"
mkdir -p "$TASKS_DIR"

echo "Copying task management scripts to '$TASKS_DIR'..."

# Prefer the bundled CLI if available
if [ -f "$SKILL_SCRIPT_DIR/tasks-cli.cjs" ]; then
    cp "$SKILL_SCRIPT_DIR/tasks-cli.cjs" "$TASKS_DIR/"
    
    # Create a local tasks.sh that points to the bundled JS
    cat > "$TASKS_DIR/tasks.sh" << 'EOF'
#!/usr/bin/env bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
node "$DIR/tasks-cli.cjs" "$@"
EOF
elif [ -f "$SKILL_SCRIPT_DIR/cli.ts" ]; then
    cp "$SKILL_SCRIPT_DIR/cli.ts" "$TASKS_DIR/"
    cp "$SKILL_SCRIPT_DIR/agentic_tasks.ts" "$TASKS_DIR/"
    [ -f "$SKILL_SCRIPT_DIR/manager.ts" ] && cp "$SKILL_SCRIPT_DIR/manager.ts" "$TASKS_DIR/"
    
    # Create a local tasks.sh that uses ts-node
    cat > "$TASKS_DIR/tasks.sh" << 'EOF'
#!/usr/bin/env bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
npx ts-node --transpile-only "$DIR/cli.ts" "$@"
EOF
fi

chmod +x "$TASKS_DIR/tasks.sh"

# 2. Create Ralph Script
RALPH_DIR="$PROJECT_ROOT/scripts"
mkdir -p "$RALPH_DIR"
RALPH_SCRIPT="$RALPH_DIR/ralph.sh"

echo "Copying '$RALPH_SCRIPT'..."
cp "$SKILL_SCRIPT_DIR/ralph.sh" "$RALPH_SCRIPT"
chmod +x "$RALPH_SCRIPT"

echo "Setup complete!"
echo "You can now run the loop with: ./scripts/ralph.sh"
