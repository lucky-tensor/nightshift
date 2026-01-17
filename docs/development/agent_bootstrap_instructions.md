# Agent Bootstrap Instructions

## Overview

This document guides an AI agent on how to "Bootstrap" an existing repository into the **Nightshift Methodology**.

## Instructions for the Agent

If a user asks you to "Bootstrap this repo using Nightshift", follow these steps:

### 1. Create the Anchor

Create a file named `START_HERE.md` at the root of the repository. This is the entry point for all future agents.

### 2. Establish Canonical Documentation

Create the following directory structure in `docs/` and move/create relevant markdown files:

```
docs/
├── product_vision/      # High-level goals (1-vision.md)
├── product_features/    # Functional specs (1-features.md)
├── technical/           # Architecture & Constraints (1-technical-challenges.md)
├── development/         # Guides & Process (1-quickstart.md)
└── tasks/               # Work tracking (1-todo.md, 2-done.md)
```

**Task**: Scan existing docs (README, wikis) and populate these files.

### 3. Install Templates

Create a `templates/` directory to store agent instructions.

- **`templates/nags/`**: Create `javascript-nag.md` (or python/rust equivalent) with a checklist for building, testing, and linting.
- **`templates/commands/`**: Create `git-brain-commit.md` containing the protocol for "Reasoning Ledger" commits.

### 4. Install Quality Gate Hooks

Install git hooks that enforce nag completion before commits. This ensures agents cannot skip quality checks.

**Create `.nightshift/hooks/` directory:**

```bash
mkdir -p .nightshift/hooks
```

**Create `.nightshift/nag-status.json`:**

```json
{
  "sessionId": "manual",
  "nags": {},
  "lastUpdated": ""
}
```

**Create `.nightshift/hooks/pre-commit.js`:**

```javascript
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const NAG_STATUS = path.join(process.cwd(), '.nightshift', 'nag-status.json');

if (process.env.NIGHTSHIFT_BYPASS) {
    console.log('⚠️  Nightshift nag check bypassed');
    process.exit(0);
}

if (!fs.existsSync(NAG_STATUS)) process.exit(0);

try {
    const status = JSON.parse(fs.readFileSync(NAG_STATUS, 'utf-8'));
    const incomplete = Object.entries(status.nags || {})
        .filter(([_, nag]) => !nag.completed)
        .map(([name]) => name);
    
    if (incomplete.length > 0) {
        console.error('❌ COMMIT BLOCKED - Incomplete nags:', incomplete.join(', '));
        console.error('Run: node .nightshift/hooks/nag-helper.js complete');
        console.error('Or bypass: NIGHTSHIFT_BYPASS=1 git commit ...');
        process.exit(1);
    }
} catch (err) {}
```

**Create `.nightshift/hooks/nag-helper.js`:**

Copy from `templates/hooks/nag-helper.js` in the Nightshift repository. This provides:
- `node .nightshift/hooks/nag-helper.js register` - Auto-detect and register nags
- `node .nightshift/hooks/nag-helper.js complete` - Mark all nags complete
- `node .nightshift/hooks/nag-helper.js status` - Show current status
- `node .nightshift/hooks/nag-helper.js reset` - Reset nags for new session

**Copy pre-commit hook to `.git/hooks/pre-commit`:**

Git hooks can be pure JavaScript with `#!/usr/bin/env node` shebang - no shell wrapper needed. Copy `templates/hooks/pre-commit` from the Nightshift repository to `.git/hooks/pre-commit`.

**Make hooks executable:**

```bash
chmod +x .git/hooks/pre-commit
chmod +x .git/hooks/commit-msg  # if using
```

### 5. Update Navigation

- Link all new docs in `START_HERE.md`.
- Create `QUICK_START.md` files in major source directories (e.g., `src/`, `scripts/`) that link back to `START_HERE.md`.

### 6. Git-Brain Protocol

Inform the user that future commits should follow the **Git-Brain** standard:

- Conventional Commit header.
- Hidden `GIT_BRAIN_METADATA` HTML comment footer containing the `retroactive_prompt` used to generate the change.

### 7. Forward Prompt Initialization

Create `.nightshift/forward-prompt.md` to enable agent continuity:

```markdown
# Forward Prompt

> This document describes the state of work for the next agent to continue.
> Last updated: [timestamp]

## Objective

[Current high-level goal]

## Current Status

[What has been accomplished]

## Next Steps

1. [Most important next action]
2. [Second priority]

## Blockers

- [Any issues preventing progress]

## Context Notes

[Important context for the next agent]
```

Instruct the agent to update this file regularly throughout their session.

