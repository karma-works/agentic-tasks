#!/bin/bash
# Ralph Loop for Tasks AI
# Iterates through pending tasks and executes them using an AI agent.

set -e

# Configuration
AGENT="opencode"
if [ -n "$AGENTIC_TASKS_AGENT" ]; then
    AGENT="$AGENTIC_TASKS_AGENT"
fi

MODEL=""
MAX_ITERATIONS=10
DRY_RUN=false
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
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    *)
      shift
      ;;
  esac
done

# Check if agent exists
if ! command -v "$AGENT" &> /dev/null; then
    echo "Error: Agent '$AGENT' not found. Please install it or set AGENTIC_TASKS_AGENT environment variable."
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
[ "$DRY_RUN" = true ] && echo "Dry Run Mode: Enabled"

for i in $(seq 1 $MAX_ITERATIONS); do
    echo ""
    echo "==============================================================="
    echo "  Ralph Iteration $i of $MAX_ITERATIONS"
    echo "==============================================================="

    # Get next pending task
    TASKS_JSON=$("$TASKS_SCRIPT" list pending 2>/tmp/ralph_err) || {
        echo "Error: Failed to retrieve tasks."
        cat /tmp/ralph_err
        exit 1
    }
    
    # Check if we got valid JSON
    if ! echo "$TASKS_JSON" | jq empty 2>/dev/null; then
        echo "Error: Invalid JSON received from tasks script."
        echo "Output: $TASKS_JSON"
        exit 1
    fi

    # Extract the first pending task
    TASK_ID=$(echo "$TASKS_JSON" | jq -r '.[0].id // empty')
    TASK_DESC=$(echo "$TASKS_JSON" | jq -r '.[0].description // empty')
    
    if [ -z "$TASK_ID" ]; then
        echo "No pending tasks found. All done!"
        exit 0
    fi

    echo "Found Task: $TASK_DESC (ID: $TASK_ID)"
    
    # Construct the prompt for the agent
    PROMPT="Please complete the following task:\n\nTitle: $TASK_DESC\n\nTask ID: $TASK_ID\n\nWhen you are done, please mark the task as complete using the task management tools or by running: $TASKS_SCRIPT complete $TASK_ID"

    # Construct command args
    ARGS=()
    if [ -n "$MODEL" ]; then
        ARGS+=("--model" "$MODEL")
    fi
    
    # Handle dry run
    if [ "$DRY_RUN" = true ]; then
        echo "DRY RUN: Would execute command:"
        if [[ "$AGENT" == *"opencode"* ]]; then
             echo "$AGENT ${ARGS[@]} run \"$PROMPT\""
        elif [[ "$AGENT" == *"claude"* ]]; then
             echo "echo -e \"$PROMPT\" | $AGENT ${ARGS[@]}"
        else
             echo "$AGENT ${ARGS[@]} \"$PROMPT\""
        fi
        exit 0
    fi

    # Run the agent
    echo "Running agent on task..."
    
    # Execute agent with prompt
    if [[ "$AGENT" == *"opencode"* ]]; then
         "$AGENT" "${ARGS[@]}" run "$PROMPT"
    elif [[ "$AGENT" == *"claude"* ]]; then
         echo -e "$PROMPT" | "$AGENT" "${ARGS[@]}"
    else
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
