# Nightshift Installation Guide

This guide explains how to install the Nightshift methodology into any project using any AI coding agent.

## Architecture

Nightshift uses a **canonical + shim** architecture:

```
YOUR_PROJECT/
├── .nightshift/              # Canonical templates (copied)
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

---

## Quick Install (OpenCode)

```bash
# 1. Clone Nightshift
git clone https://github.com/lucky-tensor/nightshift.git /tmp/nightshift

# 2. Copy templates to your project
cp -r /tmp/nightshift/templates/installation/nightshift .nightshift

# 3. Copy the OpenCode shim
cp /tmp/nightshift/templates/installation/shims/opencode.json opencode.json

# 4. Install git hooks
cp .nightshift/hooks/pre-commit .git/hooks/pre-commit
cp .nightshift/hooks/commit-msg .git/hooks/commit-msg
chmod +x .git/hooks/pre-commit .git/hooks/commit-msg

# 5. Start OpenCode
opencode
```

---

## Detailed Installation

### Step 1: Install Templates

Copy the `.nightshift/` directory to your project root:

```bash
git clone https://github.com/lucky-tensor/nightshift.git /tmp/nightshift
cp -r /tmp/nightshift/templates/installation/nightshift .nightshift
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

Copy the OpenCode shim to your project root:

```bash
cp /tmp/nightshift/templates/installation/shims/opencode.json opencode.json
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

## Claude Code (Coming Soon)

Create `.claude/CLAUDE.md` that references `.nightshift/`:

```markdown
# Nightshift Protocol

You are operating under the Nightshift Protocol.

CRITICAL: Read `.nightshift/AGENTS.md` immediately for full protocol.

## Quick Reference

- Persona: `.nightshift/agents/engineer.md`
- Commands: `.nightshift/commands/`
- Nags: `.nightshift/nags/`
- State: `.nightshift/state/`
```

---

## Cursor (Coming Soon)

Create `.cursorrules` that references `.nightshift/`:

```markdown
You are operating under the Nightshift Protocol.
Read `.nightshift/AGENTS.md` for full protocol instructions.
```

---

## Gemini CLI (Coming Soon)

Create `GEMINI.md` that references `.nightshift/`:

```markdown
# Nightshift Protocol

Read `.nightshift/AGENTS.md` for full protocol.
```

---

## OpenAI Codex (Coming Soon)

Configuration TBD - will follow similar pattern.

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
