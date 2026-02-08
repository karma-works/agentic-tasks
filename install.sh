#!/bin/bash
set -e

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR"

# Define source paths
PLUGIN_SOURCE_DIR="$PROJECT_ROOT/plugin"
SKILL_SOURCE_DIR="$PROJECT_ROOT/skills/tasks-ai"

# Define destination paths
OPENCODE_CONFIG_DIR="$HOME/.config/opencode"
SKILL_DEST_DIR="$OPENCODE_CONFIG_DIR/skills/tasks-ai"
PLUGIN_DEST_DIR="$OPENCODE_CONFIG_DIR/plugins"

# Check if source exists
if [ ! -d "$SKILL_SOURCE_DIR" ]; then
    echo "Error: Skill source directory not found at $SKILL_SOURCE_DIR"
    exit 1
fi

if [ ! -f "$PLUGIN_SOURCE_DIR/tasks_ai.ts" ]; then
    echo "Error: Plugin source file not found at $PLUGIN_SOURCE_DIR/tasks_ai.ts"
    exit 1
fi

# Create destination directories
echo "Creating destination directories..."
mkdir -p "$SKILL_DEST_DIR"
mkdir -p "$PLUGIN_DEST_DIR"

# Clean up existing JS artifacts in destination
echo "Cleaning up existing JS artifacts in destination..."
rm -f "$PLUGIN_DEST_DIR/tasks_ai.js"
rm -f "$PLUGIN_DEST_DIR/tasks-ai.js"
rm -f "$PLUGIN_DEST_DIR/tasks_ai_plugin.js"

# Copy skill files
echo "Copying skill files to $SKILL_DEST_DIR..."
# Remove existing destination to ensure clean install
rm -rf "$SKILL_DEST_DIR"
mkdir -p "$SKILL_DEST_DIR"
cp -R "$SKILL_SOURCE_DIR/"* "$SKILL_DEST_DIR/"

# Copy plugin files (TS version)
echo "Copying plugin to $PLUGIN_DEST_DIR..."
cp "$PLUGIN_SOURCE_DIR/tasks_ai.ts" "$PLUGIN_DEST_DIR/"
# Note: cli.ts is NOT a plugin and should not be in the plugins folder

echo "Installation successful!"
