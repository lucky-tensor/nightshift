#!/usr/bin/env bash
set -e

# Nightshift Development Installation Script
#
# This script sets up Nightshift for local development by:
# 1. Building the plugin with all dependencies bundled
# 2. Linking the built file to OpenCode's global config
# 3. Linking templates and commands
#
# After running this, you can use `bun run dev` to watch for changes

OPENCODE_CONFIG="${HOME}/.config/opencode"
PLUGIN_DIR="${OPENCODE_CONFIG}/plugin/nightshift"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "🏭 Nightshift Development Installation"
echo "========================================"
echo ""
echo "Project root: ${PROJECT_ROOT}"
echo "OpenCode config: ${OPENCODE_CONFIG}"
echo ""

# Step 1: Build the plugin
echo "📦 Building plugin..."
cd "${PROJECT_ROOT}"
bun run build

if [ ! -f "${PROJECT_ROOT}/dist/index.js" ]; then
    echo "❌ Build failed - dist/index.js not found"
    exit 1
fi

echo "✅ Build complete ($(du -h "${PROJECT_ROOT}/dist/index.js" | cut -f1))"
echo ""

# Step 2: Create OpenCode config directories
echo "📁 Creating OpenCode config directories..."
mkdir -p "${OPENCODE_CONFIG}/plugin"
mkdir -p "${OPENCODE_CONFIG}/command"
mkdir -p "${PLUGIN_DIR}"

# Step 3: Link the main plugin file
echo "🔗 Linking plugin file..."
PLUGIN_LINK="${OPENCODE_CONFIG}/plugin/nightshift.js"

if [ -e "${PLUGIN_LINK}" ] || [ -L "${PLUGIN_LINK}" ]; then
    rm -rf "${PLUGIN_LINK}"
    echo "   Removed existing file/link"
fi

ln -s "${PROJECT_ROOT}/dist/index.js" "${PLUGIN_LINK}"
echo "   ${PLUGIN_LINK} -> ${PROJECT_ROOT}/dist/index.js"

# Step 4: Link templates directory
echo "🔗 Linking templates..."
TEMPLATES_LINK="${PLUGIN_DIR}/templates"

if [ -e "${TEMPLATES_LINK}" ] || [ -L "${TEMPLATES_LINK}" ]; then
    rm -rf "${TEMPLATES_LINK}"
    echo "   Removed existing directory/link"
fi

ln -s "${PROJECT_ROOT}/templates" "${TEMPLATES_LINK}"
echo "   ${TEMPLATES_LINK} -> ${PROJECT_ROOT}/templates"

# Step 5: Link command files
echo "🔗 Linking commands..."
for cmd in "${PROJECT_ROOT}/commands"/*.md; do
    if [ -f "${cmd}" ]; then
        cmd_name=$(basename "${cmd}")
        cmd_link="${OPENCODE_CONFIG}/command/${cmd_name}"

        if [ -e "${cmd_link}" ] || [ -L "${cmd_link}" ]; then
            rm -rf "${cmd_link}"
        fi

        ln -s "${cmd}" "${cmd_link}"
        echo "   ${cmd_name} -> ${cmd}"
    fi
done

echo ""
echo "✅ Development installation complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Run 'bun run dev' to start watch mode (auto-rebuild on changes)"
echo "   2. Any changes to src/ will trigger a rebuild"
echo "   3. OpenCode will use the linked plugin automatically"
echo ""
echo "🔍 Verify installation:"
echo "   ls -la ${OPENCODE_CONFIG}/plugin/nightshift.js"
echo "   ls -la ${PLUGIN_DIR}/templates"
echo ""
