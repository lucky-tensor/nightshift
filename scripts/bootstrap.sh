#!/bin/bash
#
# Nightshift Agent Bootstrapper
# 
# A lightweight, git-based installer for the Nightshift Protocol.
# Designed to be run by AI agents to initialize the protocol in any project.
#
# Usage:
#   curl -sSL https://raw.githubusercontent.com/lucky-tensor/nightshift/main/scripts/bootstrap.sh | bash -s -- [vendor]
#

set -e

# Configuration
REPO_URL="https://github.com/lucky-tensor/nightshift.git"
VENDOR="${1:-opencode}"
INSTALL_DIR=".nightshift"
TEMP_DIR=".ns_bootstrap_$(date +%s)"

# Colors for output
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}Initializing Nightshift Protocol (Vendor: $VENDOR)...${NC}"

# 1. Clean clone of templates using sparse checkout
echo -e "${BLUE}Pulling templates from $REPO_URL...${NC}"
git clone --depth 1 --filter=blob:none --sparse "$REPO_URL" "$TEMP_DIR" 2>/dev/null
cd "$TEMP_DIR"
git sparse-checkout set templates/installation/nightshift templates/installation/shims scripts/hooks
cd ..

# 2. Setup .nightshift directory
if [ -d "$INSTALL_DIR" ]; then
    echo -e "${YELLOW}Warning: $INSTALL_DIR already exists. Updating in place...${NC}"
    # Merge strategy: copy everything, but keep existing state if it exists
    mkdir -p "$INSTALL_DIR/state"
    [ -f "$INSTALL_DIR/state/nag-status.json" ] && cp "$INSTALL_DIR/state/nag-status.json" "$INSTALL_DIR/state/nag-status.json.bak"
fi

mkdir -p "$INSTALL_DIR"
cp -r "$TEMP_DIR/templates/installation/nightshift/." "$INSTALL_DIR/"

# 3. Install vendor shim
case "$VENDOR" in
    opencode) cp "$TEMP_DIR/templates/installation/shims/opencode.json" ./ ;;
    claude)   mkdir -p .claude && cp "$TEMP_DIR/templates/installation/shims/claude/CLAUDE.md" .claude/CLAUDE.md ;;
    cursor)   cp "$TEMP_DIR/templates/installation/shims/cursor/.cursorrules" ./ ;;
    gemini)   cp "$TEMP_DIR/templates/installation/shims/gemini/GEMINI.md" ./ ;;
    codex)    cp "$TEMP_DIR/templates/installation/shims/codex/CODEX.md" ./ ;;
    *)        echo -e "${YELLOW}Unknown vendor $VENDOR, skipping shim installation.${NC}" ;;
esac

# 4. Install Git Hooks
if [ -d ".git" ]; then
    echo -e "${BLUE}Installing git hooks...${NC}"
    mkdir -p .git/hooks
    
    # Use the Bash versions from the template (dependency free)
    cp "$INSTALL_DIR/hooks/pre-commit" .git/hooks/pre-commit
    cp "$INSTALL_DIR/hooks/commit-msg" .git/hooks/commit-msg
    chmod +x .git/hooks/pre-commit .git/hooks/commit-msg
    
    echo -e "${GREEN}Hooks installed to .git/hooks/${NC}"
else
    echo -e "${YELLOW}Warning: Not a git repository. Skipping hook installation.${NC}"
fi

# 5. Cleanup
rm -rf "$TEMP_DIR"

echo -e "${GREEN}Nightshift Protocol installed successfully!${NC}"
echo -e "Protocol definitions: ${BLUE}$INSTALL_DIR/AGENTS.md${NC}"
echo ""
