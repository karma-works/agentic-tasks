#!/bin/bash
set -e

# Define destination paths
OPENCODE_CONFIG_DIR="$HOME/.config/opencode"
SKILL_DEST_DIR="$OPENCODE_CONFIG_DIR/skills/agentic-tasks"
PLUGIN_DEST_DIR="$OPENCODE_CONFIG_DIR/plugins"

# Remove skill files
if [ -d "$SKILL_DEST_DIR" ]; then
    echo "Removing skill files from $SKILL_DEST_DIR..."
    rm -rf "$SKILL_DEST_DIR"
else
    echo "Skill directory not found, skipping..."
fi

# Remove plugin files
echo "Removing plugin files from $PLUGIN_DEST_DIR..."
rm -f "$PLUGIN_DEST_DIR/agentic_tasks.ts"
rm -f "$PLUGIN_DEST_DIR/agentic_tasks.js"

# Remove plugin directory if empty
if [ -d "$PLUGIN_DEST_DIR" ] && [ -z "$(ls -A "$PLUGIN_DEST_DIR")" ]; then
    echo "Removing empty plugin directory..."
    rmdir "$PLUGIN_DEST_DIR"
fi

echo "Uninstallation successful!"
