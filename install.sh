#!/bin/bash
set -e

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR"

# Define source paths
SOURCE_FILE="$PROJECT_ROOT/src/tasks_ai.ts"
SKILL_SOURCE_DIR="$PROJECT_ROOT/skills/tasks-ai"

# Define destination paths
OPENCODE_CONFIG_DIR="$HOME/.config/opencode"
SKILL_DEST_DIR="$OPENCODE_CONFIG_DIR/skills/tasks-ai"
PLUGIN_DEST_DIR="$OPENCODE_CONFIG_DIR/plugins"

# Check if source exists
if [ ! -f "$SOURCE_FILE" ]; then
    echo "Error: Source file not found at $SOURCE_FILE"
    exit 1
fi

# Create destination directories
echo "Creating destination directories..."
mkdir -p "$SKILL_DEST_DIR"
mkdir -p "$PLUGIN_DEST_DIR"

# Copy skill files
echo "Updating skill files in $SKILL_DEST_DIR..."
# Update the script within the skill
mkdir -p "$SKILL_DEST_DIR/scripts"
cp "$SOURCE_FILE" "$SKILL_DEST_DIR/scripts/tasks_ai.ts"
# Copy other skill assets (SKILL.md, etc.)
cp "$SKILL_SOURCE_DIR/SKILL.md" "$SKILL_DEST_DIR/" 2>/dev/null || true

# Copy plugin file
echo "Updating plugin in $PLUGIN_DEST_DIR..."
cp "$SOURCE_FILE" "$PLUGIN_DEST_DIR/tasks_ai.ts"

echo "Installation successful!"
