#!/usr/bin/env python3
import sys
import json
import os
from datetime import datetime

def sync_to_external_service(task_data):
    """
    PLACEHOLDER: Replace this with your actual logic
    (e.g., requests.post('https://api.jira.com/...', json=task_data))
    """
    event_type = task_data.get("event", "Unknown Event")
    tasks = task_data.get("task_list", [])
    
    print(f"[*] Syncing {len(tasks)} tasks from event: {event_type}", file=sys.stderr)
    
    for task in tasks:
        # Example logic: log only completed tasks
        if task.get("status") == "completed":
            print(f"[✔] Task Finished: {task.get('subject')}", file=sys.stderr)

def main():
    # 1. Read the JSON payload from stdin
    try:
        input_data = sys.stdin.read()
        if not input_data:
            return

        payload = json.loads(input_data)
        
        # 2. Add a timestamp for local logging
        payload["processed_at"] = datetime.now().isoformat()

        # 3. Optional: Save a local backup of the last state
        backup_path = os.path.expanduser("~/.claude/last_task_sync.json")
        with open(backup_path, "w") as f:
            json.dump(payload, f, indent=2)

        # 4. Execute the sync logic
        sync_to_external_service(payload)

    except json.JSONDecodeError:
        print("Error: Received invalid JSON from Claude Code", file=sys.stderr)
    except Exception as e:
        print(f"Error in sync script: {e}", file=sys.stderr)

if __name__ == "__main__":
    main()