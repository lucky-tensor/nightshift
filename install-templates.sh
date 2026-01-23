#!/bin/bash
#
# Nightshift Installation Script
# 
# Installs the Nightshift methodology into the current project.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/lucky-tensor/nightshift/main/install-templates.sh | bash
#
# Or:
#   ./install-templates.sh [vendor]
#
# Vendors: opencode (default), claude, cursor, gemini, codex
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

VENDOR="${1:-opencode}"
NIGHTSHIFT_REPO="https://github.com/lucky-tensor/nightshift.git"
TEMP_DIR=$(mktemp -d)

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

# Clone Nightshift repo
echo -e "${BLUE}Downloading Nightshift templates...${NC}"
git clone --depth 1 "$NIGHTSHIFT_REPO" "$TEMP_DIR" 2>/dev/null

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
        if [ -f "opencode.json" ]; then
            echo -e "${YELLOW}Warning: opencode.json exists. Backing up to opencode.json.bak${NC}"
            mv opencode.json opencode.json.bak
        fi
        cp "$TEMP_DIR/templates/installation/shims/opencode.json" opencode.json
        echo -e "${GREEN}Installed: opencode.json${NC}"
        ;;
    claude)
        mkdir -p .claude
        if [ -f ".claude/CLAUDE.md" ]; then
            echo -e "${YELLOW}Warning: .claude/CLAUDE.md exists. Backing up.${NC}"
            mv .claude/CLAUDE.md .claude/CLAUDE.md.bak
        fi
        cp "$TEMP_DIR/templates/installation/shims/claude/CLAUDE.md" .claude/CLAUDE.md
        echo -e "${GREEN}Installed: .claude/CLAUDE.md${NC}"
        # Also install settings.json if it exists
        if [ -f "$TEMP_DIR/templates/installation/shims/claude/settings.json" ]; then
            if [ -f ".claude/settings.json" ]; then
                echo -e "${YELLOW}Warning: .claude/settings.json exists. Backing up.${NC}"
                mv .claude/settings.json .claude/settings.json.bak
            fi
            cp "$TEMP_DIR/templates/installation/shims/claude/settings.json" .claude/settings.json
            echo -e "${GREEN}Installed: .claude/settings.json${NC}"
        fi
        ;;
    cursor)
        mkdir -p .cursor/rules
        if [ -f ".cursorrules" ]; then
            echo -e "${YELLOW}Warning: .cursorrules exists. Backing up.${NC}"
            mv .cursorrules .cursorrules.bak
        fi
        cp "$TEMP_DIR/templates/installation/shims/cursor/.cursorrules" .cursorrules
        echo -e "${GREEN}Installed: .cursorrules${NC}"
        # Also install .mdc rule file
        if [ -f "$TEMP_DIR/templates/installation/shims/cursor/nightshift.mdc" ]; then
            cp "$TEMP_DIR/templates/installation/shims/cursor/nightshift.mdc" .cursor/rules/nightshift.mdc
            echo -e "${GREEN}Installed: .cursor/rules/nightshift.mdc${NC}"
        fi
        ;;
    gemini)
        if [ -f "GEMINI.md" ]; then
            echo -e "${YELLOW}Warning: GEMINI.md exists. Backing up.${NC}"
            mv GEMINI.md GEMINI.md.bak
        fi
        cp "$TEMP_DIR/templates/installation/shims/gemini/GEMINI.md" GEMINI.md
        echo -e "${GREEN}Installed: GEMINI.md${NC}"
        ;;
    codex)
        # Codex uses AGENTS.md (same as OpenCode)
        if [ -f "AGENTS.md" ]; then
            echo -e "${YELLOW}Warning: AGENTS.md exists. Backing up.${NC}"
            mv AGENTS.md AGENTS.md.bak
        fi
        cp "$TEMP_DIR/templates/installation/shims/codex/AGENTS.md" AGENTS.md
        echo -e "${GREEN}Installed: AGENTS.md${NC}"
        ;;
    *)
        echo -e "${RED}Unknown vendor: $VENDOR${NC}"
        echo "Valid options: opencode, claude, cursor, gemini, codex"
        rm -rf "$TEMP_DIR"
        exit 1
        ;;
esac

# Install git hooks
echo -e "${BLUE}Installing git hooks...${NC}"
cp .nightshift/hooks/pre-commit .git/hooks/pre-commit
cp .nightshift/hooks/commit-msg .git/hooks/commit-msg
chmod +x .git/hooks/pre-commit .git/hooks/commit-msg
echo -e "${GREEN}Installed: .git/hooks/pre-commit${NC}"
echo -e "${GREEN}Installed: .git/hooks/commit-msg${NC}"

# Cleanup
rm -rf "$TEMP_DIR"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              Nightshift Installation Complete!             ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Installed files:${NC}"
echo "  .nightshift/          - Templates, commands, nags, hooks"
case "$VENDOR" in
    opencode) echo "  opencode.json         - OpenCode configuration shim" ;;
    claude)   echo "  .claude/CLAUDE.md     - Claude Code configuration shim"
              echo "  .claude/settings.json - Claude Code settings" ;;
    cursor)   echo "  .cursorrules          - Cursor configuration shim"
              echo "  .cursor/rules/nightshift.mdc - Cursor rule file" ;;
    gemini)   echo "  GEMINI.md             - Gemini CLI configuration shim" ;;
    codex)    echo "  AGENTS.md             - Codex CLI configuration shim" ;;
esac
echo "  .git/hooks/pre-commit - Nag enforcement hook"
echo "  .git/hooks/commit-msg - Commit message validation hook"
echo ""
echo -e "${BLUE}Next steps:${NC}"
case "$VENDOR" in
    opencode)
        echo "  1. Run: opencode"
        echo "  2. Type: /session-start"
        ;;
    *)
        echo "  1. Start your AI coding agent"
        echo "  2. Ask it to read .nightshift/AGENTS.md"
        ;;
esac
echo ""
echo -e "${YELLOW}Bypass git hooks (human-supervised only):${NC}"
echo "  NIGHTSHIFT_BYPASS=1 git commit -m \"message\""
echo ""
