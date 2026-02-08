#!/bin/bash
# Ralph Loop for Tasks AI - With Discovered Knowledge Learning
# Iterates through pending tasks and executes them using an AI agent.
# Implements the "Real Ralph" philosophy with reflection and knowledge capture.

set -e

# =============================================================================
# Configuration
# =============================================================================

AGENT="opencode"
if [ -n "$AGENTIC_TASKS_AGENT" ]; then
    AGENT="$AGENTIC_TASKS_AGENT"
fi

MODEL=""
MAX_ITERATIONS=10
MAX_RETRIES=3          # Max retries per task before marking as blocked
PRUNE_INTERVAL=10      # Consolidate AGENTS.md every N successful iterations
DRY_RUN=false
TASKS_SCRIPT="$(dirname "$0")/tasks/tasks.sh"
PROJECT_ROOT="$(pwd)"
AGENTS_MD="$PROJECT_ROOT/AGENTS.md"
PROGRESS_FILE="$PROJECT_ROOT/.opencode/progress.txt"

# Runtime state
SUCCESS_COUNT=0
CURRENT_TASK_ID=""
CURRENT_RETRY_COUNT=0
RETRY_FILE="$PROJECT_ROOT/.opencode/retry_counts.txt"

# =============================================================================
# Argument Parsing
# =============================================================================

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
    --max-retries)
      MAX_RETRIES="$2"
      shift 2
      ;;
    --prune-interval)
      PRUNE_INTERVAL="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --help)
      echo "Usage: ralph.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --agent <name>          Agent to use (default: opencode)"
      echo "  --model <model>         Model to use with the agent"
      echo "  --max-iterations <n>    Maximum loop iterations (default: 10)"
      echo "  --max-retries <n>       Max retries per task before blocking (default: 3)"
      echo "  --prune-interval <n>    Consolidate AGENTS.md every N successes (default: 10)"
      echo "  --dry-run               Show what would be executed without running"
      echo "  --help                  Show this help message"
      exit 0
      ;;
    *)
      shift
      ;;
  esac
done

# =============================================================================
# Validation
# =============================================================================

# Check if agent exists (extract first word for command check)
AGENT_CMD=$(echo "$AGENT" | awk '{print $1}')
if ! command -v "$AGENT_CMD" &> /dev/null; then
    echo "Error: Agent '$AGENT_CMD' not found. Please install it or set AGENTIC_TASKS_AGENT environment variable."
    exit 1
fi

# Check if tasks script exists
if [ ! -f "$TASKS_SCRIPT" ]; then
    echo "Error: Tasks script not found at '$TASKS_SCRIPT'. Please run setup."
    exit 1
fi

# Ensure .opencode directory exists for progress file
mkdir -p "$(dirname "$PROGRESS_FILE")"

# Initialize AGENTS.md if it doesn't exist
if [ ! -f "$AGENTS_MD" ]; then
    cat > "$AGENTS_MD" << 'EOF'
# Project Knowledge Base

This file is automatically updated by the Ralph Loop to capture discovered knowledge.

## Commands
<!-- CLI commands and workflows specific to this project -->

## Conventions
<!-- Code patterns and architectural decisions -->

## Gotchas
<!-- Hidden dependencies, traps, and non-obvious behaviors -->

## Boundaries
<!-- Files and areas that should not be modified -->

EOF
    echo "Created $AGENTS_MD"
fi

# =============================================================================
# Helper Functions
# =============================================================================

# Get retry count for a task (Bash 3 compatible - uses file-based storage)
get_retry_count() {
    local task_id="$1"
    if [ -f "$RETRY_FILE" ]; then
        local count=$(grep "^${task_id}:" "$RETRY_FILE" 2>/dev/null | cut -d: -f2)
        echo "${count:-0}"
    else
        echo "0"
    fi
}

# Set retry count for a task
set_retry_count() {
    local task_id="$1"
    local count="$2"
    mkdir -p "$(dirname "$RETRY_FILE")"
    
    if [ -f "$RETRY_FILE" ]; then
        # Remove existing entry for this task
        grep -v "^${task_id}:" "$RETRY_FILE" > "${RETRY_FILE}.tmp" 2>/dev/null || true
        mv "${RETRY_FILE}.tmp" "$RETRY_FILE"
    fi
    
    # Add new entry
    echo "${task_id}:${count}" >> "$RETRY_FILE"
}

# Run the agent with a given prompt
run_agent() {
    local prompt="$1"
    local description="${2:-Agent task}"
    
    echo "  → $description"
    
    # Parse agent command and its arguments
    local agent_args=($AGENT)
    local agent_bin="${agent_args[0]}"
    local agent_extra_args=("${agent_args[@]:1}")
    
    # Construct model args
    local args=()
    if [ -n "$MODEL" ]; then
        args+=("--model" "$MODEL")
    fi
    
    if [ "$DRY_RUN" = true ]; then
        echo "    DRY RUN: Would execute agent with prompt: ${prompt:0:100}..."
        return 0
    fi
    
    # Execute based on agent type
    if [[ "$AGENT" == *"opencode"* ]]; then
        "$agent_bin" "${agent_extra_args[@]}" "${args[@]}" run "$prompt"
    elif [[ "$AGENT" == *"claude"* ]]; then
        echo -e "$prompt" | "$agent_bin" "${agent_extra_args[@]}" "${args[@]}"
    else
        "$agent_bin" "${agent_extra_args[@]}" "${args[@]}" "$prompt"
    fi
}

# Append to progress file (short-term memory)
log_progress() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $message" >> "$PROGRESS_FILE"
}

# Run reflection phase
run_reflect() {
    local status="$1"  # "success" or "failure"
    local task_id="$2"
    local task_desc="$3"
    
    echo ""
    echo "  ┌─────────────────────────────────────────┐"
    echo "  │  REFLECT PHASE ($status)               "
    echo "  └─────────────────────────────────────────┘"
    
    local reflect_prompt=""
    
    if [ "$status" == "success" ]; then
        reflect_prompt="You just successfully completed a task: '$task_desc'

Review what you learned during this task:
1. Check the git diff: \`git diff HEAD~1\` (if changes were committed)
2. Review any commands or patterns you discovered

Now UPDATE the file $AGENTS_MD with any discovered knowledge. Add entries under the appropriate sections:
- **Commands**: CLI commands or workflows (e.g., 'Run pnpm, not npm')
- **Conventions**: Codebase patterns (e.g., 'API routes are in src/server/api')
- **Gotchas**: Hidden dependencies or traps discovered
- **Boundaries**: Files that should not be modified

Rules:
- Keep entries concise (one line each)
- Do NOT duplicate existing entries
- Only add genuinely new discoveries
- If nothing new was learned, do not modify the file"
    else
        reflect_prompt="A task just FAILED: '$task_desc'

This reflection is CRITICAL. The next iteration will read what you write here.

1. Review what was attempted
2. Check error messages and logs
3. Identify why it failed

Update TWO files:

1. **$PROGRESS_FILE** - Add a detailed entry about:
   - What approach was tried
   - What error occurred
   - What the NEXT iteration should try differently
   
2. **$AGENTS_MD** - If you discovered permanent knowledge:
   - Add 'Do NOT...' entries for approaches that will never work
   - Add gotchas about hidden dependencies or requirements
   - Add any commands needed before this task can succeed

Be specific. The next agent has total amnesia - only what you write here will survive."
    fi
    
    run_agent "$reflect_prompt" "Capturing discovered knowledge..."
    log_progress "Reflect ($status): Task $task_id - $task_desc"
}

# Run prune phase to consolidate AGENTS.md
run_prune() {
    echo ""
    echo "  ┌─────────────────────────────────────────┐"
    echo "  │  PRUNE PHASE                            │"
    echo "  └─────────────────────────────────────────┘"
    
    local prune_prompt="Review and consolidate $AGENTS_MD:

1. **Merge duplicates**: Combine entries that say the same thing differently
2. **Remove obsolete**: Delete entries about files/patterns that no longer exist
3. **Improve clarity**: Rewrite vague entries to be specific and actionable
4. **Organize**: Ensure entries are under the correct section headings
5. **Trim**: Keep the file under 100 lines while preserving ALL unique knowledge

Check that referenced files/paths still exist before keeping entries about them.
Output the cleaned, consolidated version of the file."

    run_agent "$prune_prompt" "Consolidating knowledge base..."
    log_progress "Prune: Consolidated AGENTS.md"
}

# Mark task as blocked
mark_task_blocked() {
    local task_id="$1"
    "$TASKS_SCRIPT" update "$task_id" --status blocked 2>/dev/null || true
}

# =============================================================================
# Main Loop
# =============================================================================

echo "Starting Ralph Loop..."
echo "Agent: $AGENT"
[ -n "$MODEL" ] && echo "Model: $MODEL"
echo "Max Iterations: $MAX_ITERATIONS"
echo "Max Retries per Task: $MAX_RETRIES"
echo "Prune Interval: Every $PRUNE_INTERVAL successful iterations"
echo "Knowledge Base: $AGENTS_MD"
[ "$DRY_RUN" = true ] && echo "Dry Run Mode: Enabled"
echo ""

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
        echo ""
        echo "Summary:"
        echo "  Successful iterations: $SUCCESS_COUNT"
        echo "  Knowledge base: $AGENTS_MD"
        exit 0
    fi

    # Get current retry count for this task
    CURRENT_RETRIES=$(get_retry_count "$TASK_ID")
    
    echo "Task: $TASK_DESC"
    echo "ID: $TASK_ID"
    echo "Attempt: $((CURRENT_RETRIES + 1)) of $MAX_RETRIES"
    
    # Check if we've exceeded max retries
    if [ "$CURRENT_RETRIES" -ge "$MAX_RETRIES" ]; then
        echo ""
        echo "Warning: Task has exceeded max retries ($MAX_RETRIES). Marking as blocked."
        mark_task_blocked "$TASK_ID"
        log_progress "BLOCKED: Task $TASK_ID after $MAX_RETRIES retries - $TASK_DESC"
        
        # Reset retry count and continue to next task
        set_retry_count "$TASK_ID" 0
        continue
    fi

    # =========================================================================
    # WORK PHASE
    # =========================================================================
    echo ""
    echo "  ┌─────────────────────────────────────────┐"
    echo "  │  WORK PHASE                             │"
    echo "  └─────────────────────────────────────────┘"
    
    # Build context from progress file if it exists and has relevant content
    CONTEXT=""
    if [ -f "$PROGRESS_FILE" ]; then
        RECENT_PROGRESS=$(tail -20 "$PROGRESS_FILE" 2>/dev/null | grep -i "$TASK_ID" || true)
        if [ -n "$RECENT_PROGRESS" ]; then
            CONTEXT="

Previous attempts on this task:
$RECENT_PROGRESS

Learn from these attempts. Try a DIFFERENT approach if previous ones failed."
        fi
    fi
    
    WORK_PROMPT="Complete the following task:

Title: $TASK_DESC
Task ID: $TASK_ID

Instructions:
1. Read AGENTS.md for project-specific knowledge and constraints
2. Implement the task
3. Run relevant tests/linters to verify your changes
4. When successful, mark the task complete: $TASKS_SCRIPT complete $TASK_ID
$CONTEXT"

    log_progress "START: Task $TASK_ID (attempt $((CURRENT_RETRIES + 1))) - $TASK_DESC"
    run_agent "$WORK_PROMPT" "Working on task..."
    
    # =========================================================================
    # VERIFY & REFLECT
    # =========================================================================
    
    # Reload tasks to check status
    TASK_STATUS=$("$TASKS_SCRIPT" list | jq -r ".[] | select(.id == \"$TASK_ID\") | .status")
    
    if [ "$TASK_STATUS" == "completed" ]; then
        echo ""
        echo "Task $TASK_ID completed successfully!"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        set_retry_count "$TASK_ID" 0  # Reset retry count
        
        # Run success reflection
        run_reflect "success" "$TASK_ID" "$TASK_DESC"
        
        # Check if it's time to prune
        if [ $((SUCCESS_COUNT % PRUNE_INTERVAL)) -eq 0 ] && [ "$SUCCESS_COUNT" -gt 0 ]; then
            echo ""
            echo "Reached $SUCCESS_COUNT successful iterations - time to consolidate knowledge."
            run_prune
        fi
        
    else
        echo ""
        echo "Task $TASK_ID is still '$TASK_STATUS'"
        
        # Increment retry count
        NEW_RETRY_COUNT=$((CURRENT_RETRIES + 1))
        set_retry_count "$TASK_ID" "$NEW_RETRY_COUNT"
        
        # Run failure reflection - this is CRITICAL
        run_reflect "failure" "$TASK_ID" "$TASK_DESC"
        
        echo ""
        echo "  Will retry in next iteration ($NEW_RETRY_COUNT/$MAX_RETRIES attempts used)"
    fi
    
    # Brief pause between iterations
    sleep 2
done

echo ""
echo "==============================================================="
echo "  Ralph Loop Complete"
echo "==============================================================="
echo "Reached max iterations ($MAX_ITERATIONS)"
echo "Successful tasks: $SUCCESS_COUNT"
echo "Knowledge base updated: $AGENTS_MD"

# Exit with error if we hit max iterations without completing all tasks
REMAINING=$("$TASKS_SCRIPT" list pending | jq 'length')
if [ "$REMAINING" -gt 0 ]; then
    echo "Warning: $REMAINING tasks still pending"
    exit 1
fi

exit 0
