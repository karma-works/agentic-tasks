#!/usr/bin/env bash
# Standalone CLI Wrapper for Tasks AI Skill
# This script is part of the 'tasks-ai' skill, enabling manual task management without the full plugin.

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

# Check if cli.ts exists, otherwise fallback to cli.js (if somehow still there) or error
if [ -f "$DIR/cli.ts" ]; then
    npx ts-node "$DIR/cli.ts" "$@"
elif [ -f "$DIR/cli.js" ]; then
    node "$DIR/cli.js" "$@"
else
    echo "Error: cli engine not found in $DIR"
    exit 1
fi
