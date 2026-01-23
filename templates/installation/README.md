# Nightshift Installation Guide

This guide explains how to install the Nightshift methodology into any project using any AI coding agent.

## Quick Install (Recommended)

The install script downloads templates via GitHub tarball (no git clone required), ensuring a clean `.nightshift/` folder with no `.git` directory that could cause conflicts.

```bash
# OpenCode (default)
curl -fsSL https://raw.githubusercontent.com/lucky-tensor/nightshift/main/install-templates.sh | bash

# Claude Code
curl -fsSL https://raw.githubusercontent.com/lucky-tensor/nightshift/main/install-templates.sh | bash -s -- claude

# Cursor
curl -fsSL https://raw.githubusercontent.com/lucky-tensor/nightshift/main/install-templates.sh | bash -s -- cursor

# Gemini CLI
curl -fsSL https://raw.githubusercontent.com/lucky-tensor/nightshift/main/install-templates.sh | bash -s -- gemini

# OpenAI Codex CLI
curl -fsSL https://raw.githubusercontent.com/lucky-tensor/nightshift/main/install-templates.sh | bash -s -- codex
```

## Architecture

Nightshift uses a **canonical + shim** architecture:

```
YOUR_PROJECT/
├── .nightshift/              # Canonical templates (clean copy, NO .git)
│   ├── AGENTS.md             # Core protocol rules
│   ├── agents/               # Persona templates
│   ├── commands/             # SOPs (Standard Operating Procedures)
│   ├── nags/                 # Quality gate definitions
│   ├── hooks/                # Git hooks (copy to .git/hooks/)
│   └── state/                # Runtime state (forward-prompt, nag-status)
│
├── opencode.json             # OpenCode shim (references .nightshift/)
├── .claude/CLAUDE.md         # Claude Code shim (references .nightshift/)
└── .cursorrules              # Cursor shim (references .nightshift/)
```

**The shim** is a vendor-specific config file that points the AI agent to the canonical `.nightshift/` templates.

**Important**: The `.nightshift/` folder is a clean copy with NO `.git` directory, so it won't cause git conflicts or confusion in your project.

---

## For AI Agents: Bootstrap Instructions

If you are an AI agent installing Nightshift, use the install script:

```bash
curl -fsSL https://raw.githubusercontent.com/lucky-tensor/nightshift/main/install-templates.sh | bash -s -- opencode
```

**Do NOT use `git clone`** - this can cause:

1. Access issues with temp directories
2. Nested git repositories
3. Git conflicts in the developer's project

The install script downloads a tarball and extracts only what's needed.

---

## Manual Installation

If you prefer to install manually without the script:

### Step 1: Download and Extract Templates

Use the GitHub tarball (NO git clone - avoids nested .git issues):

```bash
# Download and extract to a temp location
curl -fsSL https://github.com/lucky-tensor/nightshift/archive/refs/heads/main.tar.gz | tar -xz

# Copy the .nightshift folder (clean, no .git)
cp -r nightshift-main/templates/installation/nightshift .nightshift

# Copy your vendor shim (example: OpenCode)
cp nightshift-main/templates/installation/shims/opencode.json opencode.json

# Clean up
rm -rf nightshift-main
```

This gives you:

| Directory               | Purpose                                    |
| ----------------------- | ------------------------------------------ |
| `.nightshift/AGENTS.md` | Core protocol - agent reads this first     |
| `.nightshift/agents/`   | Persona templates (engineer, planner)      |
| `.nightshift/commands/` | SOPs for git-brain commits, nag updates    |
| `.nightshift/nags/`     | Quality gate definitions                   |
| `.nightshift/hooks/`    | Git hooks source files                     |
| `.nightshift/state/`    | Runtime state (forward-prompt, nag-status) |

### Step 2: Install Git Hooks

Git hooks enforce the nag protocol - you cannot commit if any nag is `NOK`.

```bash
cp .nightshift/hooks/pre-commit .git/hooks/pre-commit
cp .nightshift/hooks/commit-msg .git/hooks/commit-msg
chmod +x .git/hooks/pre-commit .git/hooks/commit-msg
```

**Bypass** (for human-supervised commits only):

```bash
NIGHTSHIFT_BYPASS=1 git commit -m "emergency fix"
```

### Step 3: Install Vendor Shim

Choose your AI coding agent and install the appropriate shim.

---

## OpenCode

Install using the script (recommended):

```bash
curl -fsSL https://raw.githubusercontent.com/lucky-tensor/nightshift/main/install-templates.sh | bash
```

The shim configures:

- **Instructions**: Points to `.nightshift/AGENTS.md`
- **Agents**: `nightshift` (primary), `nightshift-planner` (subagent)
- **Commands**: `/git-brain-commit`, `/update-nag-status`, `/nag-check`, `/forward-prompt`, `/session-start`

### OpenCode Commands

| Command              | Description                                          |
| -------------------- | ---------------------------------------------------- |
| `/session-start`     | Initialize a Nightshift session, read forward-prompt |
| `/nag-check`         | Run all quality checks (build, test, lint)           |
| `/update-nag-status` | Update nag-status.json after fixes                   |
| `/git-brain-commit`  | Create commit with reasoning metadata                |
| `/forward-prompt`    | Update forward-prompt with current state             |

### Verify Installation

1. Start OpenCode: `opencode`
2. Run `/session-start`
3. The agent should read `.nightshift/AGENTS.md` and report the protocol

---

## Claude Code

Install the Claude Code shim:

```bash
./install-templates.sh claude
```

This installs:

- `.claude/CLAUDE.md` - Protocol instructions for Claude
- `.claude/settings.json` - Permissions configuration

### Usage

1. Start Claude Code: `claude`
2. Claude will automatically read `.claude/CLAUDE.md`
3. Ask: "Read .nightshift/AGENTS.md and initialize a session"

### Key Features

- Claude reads `CLAUDE.md` at startup automatically
- The shim points Claude to the canonical `.nightshift/` templates
- Settings.json grants read access to `.nightshift/**` and edit access to `.nightshift/state/**`

---

## Cursor

Install the Cursor shim:

```bash
./install-templates.sh cursor
```

This installs:

- `.cursorrules` - Basic protocol instructions
- `.cursor/rules/nightshift.mdc` - Detailed rule file with glob pattern

### Usage

1. Open your project in Cursor
2. Cursor will automatically read `.cursorrules` and rules in `.cursor/rules/`
3. The agent should follow Nightshift Protocol automatically

---

## Gemini CLI

Install the Gemini CLI shim:

```bash
./install-templates.sh gemini
```

This installs:

- `GEMINI.md` - Protocol instructions for Gemini CLI

### Usage

1. Start Gemini CLI: `gemini`
2. Gemini will automatically read `GEMINI.md`
3. Ask: "Read .nightshift/AGENTS.md and initialize a session"

### Key Features

- Gemini CLI reads `GEMINI.md` at startup automatically
- Use `/save` for conversation checkpointing
- Forward-prompt enables context continuity between sessions

---

## OpenAI Codex CLI

Install the Codex CLI shim:

```bash
./install-templates.sh codex
```

This installs:

- `AGENTS.md` - Protocol instructions (Codex uses same file name as OpenCode)

### Usage

1. Start Codex: `codex`
2. Codex will automatically read `AGENTS.md`
3. Use appropriate approval mode based on nag status

### Approval Modes

- `codex --approval-mode suggest` - During development (safer)
- `codex --approval-mode auto-edit` - For file changes with review
- `codex --approval-mode full-auto` - Only after all nags are OK

---

## Verification

After installation, verify everything works:

### 1. Check Protocol Understanding

Ask your agent:

> "What are the 5 operating principles of the Nightshift Engineer?"

It should recite: Autonomy, Safety, Quality, Git Discipline, Continuity.

### 2. Check Nag Enforcement

```bash
# Set a nag to NOK
echo '{"sessionId":"test","nags":{"test-nag":"NOK"},"lastUpdated":""}' > .nightshift/state/nag-status.json

# Try to commit (should fail)
git commit --allow-empty -m "test commit"
# Expected: ❌ COMMIT BLOCKED - INCOMPLETE NAGS

# Set nag to OK
echo '{"sessionId":"test","nags":{"test-nag":"OK"},"lastUpdated":""}' > .nightshift/state/nag-status.json

# Try again (should succeed)
git commit --allow-empty -m "test commit works"
```

### 3. Check Forward Prompt

Ask your agent to update the forward prompt. Verify `.nightshift/state/forward-prompt.md` is updated.

---

## Gitignore Recommendations

Add to `.gitignore`:

```gitignore
# Nightshift state (optional - some teams commit these)
# .nightshift/state/nag-status.json
# .nightshift/state/forward-prompt.md
```

**Note**: Whether to commit state files depends on your workflow:

- **Commit them**: Enables true agent handoff between sessions/developers
- **Ignore them**: Cleaner git history, each session starts fresh

---

## Updating Nightshift

To update to the latest templates:

```bash
git clone https://github.com/lucky-tensor/nightshift.git /tmp/nightshift
cp -r /tmp/nightshift/templates/installation/nightshift/agents .nightshift/
cp -r /tmp/nightshift/templates/installation/nightshift/commands .nightshift/
cp -r /tmp/nightshift/templates/installation/nightshift/nags .nightshift/
cp -r /tmp/nightshift/templates/installation/nightshift/hooks .nightshift/
cp /tmp/nightshift/templates/installation/nightshift/AGENTS.md .nightshift/

# Re-install hooks
cp .nightshift/hooks/pre-commit .git/hooks/pre-commit
cp .nightshift/hooks/commit-msg .git/hooks/commit-msg
chmod +x .git/hooks/pre-commit .git/hooks/commit-msg
```

---

## Troubleshooting

### Hooks not running

```bash
# Check hooks are executable
ls -la .git/hooks/pre-commit .git/hooks/commit-msg

# Make executable
chmod +x .git/hooks/pre-commit .git/hooks/commit-msg
```

### Agent not reading protocol

- Verify `.nightshift/AGENTS.md` exists
- Verify the vendor shim points to it correctly
- Try explicit: "Read `.nightshift/AGENTS.md` and follow the protocol"

### Nag check failing unexpectedly

```bash
# Check current nag status
cat .nightshift/state/nag-status.json

# Reset to clean state
echo '{"sessionId":"","nags":{},"lastUpdated":""}' > .nightshift/state/nag-status.json
```
