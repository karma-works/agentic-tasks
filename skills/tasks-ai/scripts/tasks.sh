#!/usr/bin/env bash
# Standalone CLI Wrapper for Tasks AI Skill
# This script is part of the 'tasks-ai' skill, enabling manual task management without the full plugin.

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
node "$DIR/cli.js" "$@"
