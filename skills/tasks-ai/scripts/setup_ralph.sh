#!/bin/bash
# Setup script for Tasks AI Ralph Loop
# Usage: ./setup_ralph.sh [project_root]

set -e

PROJECT_ROOT="${1:-.}"
SKILL_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Ensure project root exists
if [ ! -d "$PROJECT_ROOT" ]; then
    echo "Error: Project root '$PROJECT_ROOT' does not exist."
    exit 1
fi

echo "Setting up Tasks AI Ralph Loop in '$PROJECT_ROOT'..."

# 1. Setup Task Scripts
TASKS_DIR="$PROJECT_ROOT/scripts/tasks"
mkdir -p "$TASKS_DIR"

echo "Copying task management scripts to '$TASKS_DIR'..."
# We use the CLI.js from the skill directory.
if [ -f "$SKILL_SCRIPT_DIR/cli.js" ]; then
    cp "$SKILL_SCRIPT_DIR/cli.js" "$TASKS_DIR/"
else
    echo "Error: cli.js not found in '$SKILL_SCRIPT_DIR'."
    exit 1
fi

# Create a local tasks.sh that points to the local cli.js
cat > "$TASKS_DIR/tasks.sh" << 'EOF'
#!/usr/bin/env bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
node "$DIR/cli.js" "$@"
EOF
chmod +x "$TASKS_DIR/tasks.sh"

# 2. Create Ralph Script
RALPH_DIR="$PROJECT_ROOT/scripts"
mkdir -p "$RALPH_DIR"
RALPH_SCRIPT="$RALPH_DIR/ralph.sh"

echo "Creating '$RALPH_SCRIPT'..."

cat > "$RALPH_SCRIPT" << 'EOF'
#!/bin/bash
# Ralph Loop for Tasks AI
# Iterates through pending tasks and executes them using an AI agent.

set -e

# Configuration
AGENT="opencode"
if [ -n "$TASKS_AI_AGENT" ]; then
    AGENT="$TASKS_AI_AGENT"
fi

MODEL=""
MAX_ITERATIONS=10
TASKS_SCRIPT="$(dirname "$0")/tasks/tasks.sh"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --model)
      MODEL="$2"
      shift 2
      ;;
    --model=*)
      MODEL="${1#*=}"
      shift
      ;;
    --agent)
      AGENT="$2"
      shift 2
      ;;
    --max-iterations)
      MAX_ITERATIONS="$2"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

# Check if agent exists
if ! command -v "$AGENT" &> /dev/null; then
    echo "Error: Agent '$AGENT' not found. Please install it or set TASKS_AI_AGENT environment variable."
    exit 1
fi

# Check if tasks script exists
if [ ! -f "$TASKS_SCRIPT" ]; then
    echo "Error: Tasks script not found at '$TASKS_SCRIPT'. Please run setup."
    exit 1
fi

echo "Starting Ralph Loop..."
echo "Agent: $AGENT"
[ -n "$MODEL" ] && echo "Model: $MODEL"

for i in $(seq 1 $MAX_ITERATIONS); do
    echo ""
    echo "==============================================================="
    echo "  Ralph Iteration $i of $MAX_ITERATIONS"
    echo "==============================================================="

    # Get next pending task
    # We use jq to parse the JSON output from the tasks script
    # tasks.sh list pending returns a JSON array of tasks
    
    TASKS_JSON=$("$TASKS_SCRIPT" list pending)
    
    # Check if we got valid JSON
    if ! echo "$TASKS_JSON" | jq empty 2>/dev/null; then
        echo "Error: Failed to retrieve tasks or invalid JSON."
        echo "Output: $TASKS_JSON"
        exit 1
    fi

    # Extract the first pending task
    TASK_ID=$(echo "$TASKS_JSON" | jq -r '.[0].id // empty')
    TASK_DESC=$(echo "$TASKS_JSON" | jq -r '.[0].content // empty')
    
    if [ -z "$TASK_ID" ]; then
        echo "No pending tasks found. All done!"
        exit 0
    fi

    echo "Found Task: $TASK_DESC (ID: $TASK_ID)"
    
    # Construct the prompt for the agent
    PROMPT="Please complete the following task:\n\nTitle: $TASK_DESC\n\nTask ID: $TASK_ID\n\nWhen you are done, please mark the task as complete using the task management tools or by running: $TASKS_SCRIPT complete $TASK_ID"

    # Run the agent
    echo "Running agent on task..."
    
    # Construct command args
    ARGS=()
    if [ -n "$MODEL" ]; then
        ARGS+=("--model" "$MODEL")
    fi
    
    # Execute agent with prompt
    # We use -p for opencode if available, otherwise try generic
    if [[ "$AGENT" == *"opencode"* ]]; then
         "$AGENT" "${ARGS[@]}" -p "$PROMPT"
    elif [[ "$AGENT" == *"claude"* ]]; then
         # Claude might not support -p directly in all versions, but typically does or uses stdin
         echo -e "$PROMPT" | "$AGENT" "${ARGS[@]}"
    else
         # Fallback generic
         "$AGENT" "${ARGS[@]}" "$PROMPT"
    fi
    
    # Verify completion
    # Reload tasks to check status
    TASK_STATUS=$("$TASKS_SCRIPT" list | jq -r ".[] | select(.id == \"$TASK_ID\") | .status")
    
    if [ "$TASK_STATUS" == "completed" ]; then
        echo "Task $TASK_ID completed successfully."
    else
        echo "Warning: Task $TASK_ID is still $TASK_STATUS. The agent might have failed or forgot to mark it complete."
        echo "Stopping loop to prevent infinite retries on the same task."
        exit 1
    fi
    
    sleep 2
done

echo ""
echo "Ralph reached max iterations ($MAX_ITERATIONS)."
exit 1
EOF

chmod +x "$RALPH_SCRIPT"

echo "Setup complete!"
echo "You can now run the loop with: ./scripts/ralph.sh"
