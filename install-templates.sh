#!/bin/bash
#
# Nightshift Installation Script
# 
# Installs the Nightshift methodology into the current project.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/lucky-tensor/nightshift/main/install-templates.sh | bash -s -- [vendor]
#

set -e

# Configuration
REPO_URL="https://github.com/lucky-tensor/nightshift.git"
VENDOR="${1:-opencode}"
TEMP_DIR=".ns_install_$(date +%s)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║              Nightshift Template Installer                 ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if we're in a git repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}Error: Not in a git repository.${NC}"
    echo "Please run this script from within a git project."
    exit 1
fi

PROJECT_ROOT=$(git rev-parse --show-toplevel)
cd "$PROJECT_ROOT"

echo -e "${YELLOW}Vendor:${NC} $VENDOR"
echo -e "${YELLOW}Project:${NC} $PROJECT_ROOT"
echo ""

# Bootstrap logic
echo -e "${BLUE}Downloading Nightshift templates via git-sparse...${NC}"
git clone --depth 1 --filter=blob:none --sparse "$REPO_URL" "$TEMP_DIR" 2>/dev/null
cd "$TEMP_DIR"
git sparse-checkout set templates/installation/nightshift templates/installation/shims
cd ..

# Copy .nightshift directory
echo -e "${BLUE}Installing .nightshift/ templates...${NC}"
if [ -d ".nightshift" ]; then
    echo -e "${YELLOW}Warning: .nightshift/ already exists. Backing up to .nightshift.bak${NC}"
    mv .nightshift .nightshift.bak
fi
cp -r "$TEMP_DIR/templates/installation/nightshift" .nightshift

# Install vendor shim
echo -e "${BLUE}Installing $VENDOR shim...${NC}"
case "$VENDOR" in
    opencode)
        [ -f "opencode.json" ] && mv opencode.json opencode.json.bak
        cp "$TEMP_DIR/templates/installation/shims/opencode.json" opencode.json
        echo -e "${GREEN}Installed: opencode.json${NC}"
        ;;
    claude)
        mkdir -p .claude
        [ -f ".claude/CLAUDE.md" ] && mv .claude/CLAUDE.md .claude/CLAUDE.md.bak
        cp "$TEMP_DIR/templates/installation/shims/claude/CLAUDE.md" .claude/CLAUDE.md
        echo -e "${GREEN}Installed: .claude/CLAUDE.md${NC}"
        ;;
    cursor)
        [ -f ".cursorrules" ] && mv .cursorrules .cursorrules.bak
        cp "$TEMP_DIR/templates/installation/shims/cursor/.cursorrules" .cursorrules
        echo -e "${GREEN}Installed: .cursorrules${NC}"
        ;;
    gemini)
        [ -f "GEMINI.md" ] && mv GEMINI.md GEMINI.md.bak
        cp "$TEMP_DIR/templates/installation/shims/gemini/GEMINI.md" GEMINI.md
        echo -e "${GREEN}Installed: GEMINI.md${NC}"
        ;;
    codex)
        [ -f "CODEX.md" ] && mv CODEX.md CODEX.md.bak
        cp "$TEMP_DIR/templates/installation/shims/codex/CODEX.md" CODEX.md
        echo -e "${GREEN}Installed: CODEX.md${NC}"
        ;;
    *)
        echo -e "${RED}Unknown vendor: $VENDOR${NC}"
        rm -rf "$TEMP_DIR"
        exit 1
        ;;
esac

# Install git hooks
echo -e "${BLUE}Installing git hooks...${NC}"
cp .nightshift/hooks/pre-commit .git/hooks/pre-commit
cp .nightshift/hooks/commit-msg .git/hooks/commit-msg
chmod +x .git/hooks/pre-commit .git/hooks/commit-msg

# Cleanup
rm -rf "$TEMP_DIR"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              Nightshift Installation Complete!             ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Protocol definitions: ${BLUE}.nightshift/AGENTS.md${NC}"
echo ""
