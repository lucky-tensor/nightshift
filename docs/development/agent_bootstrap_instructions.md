# Agent Bootstrap Instructions

## Overview

This document guides an AI agent on how to "Bootstrap" an existing repository into the **Dark Factory Methodology**.

## Instructions for the Agent

If a user asks you to "Bootstrap this repo using Dark Factory", follow these steps:

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

### 4. Update Navigation

- Link all new docs in `START_HERE.md`.
- Create `QUICK_START.md` files in major source directories (e.g., `src/`, `scripts/`) that link back to `START_HERE.md`.

### 5. Git-Brain Protocol

Inform the user that future commits should follow the **Git-Brain** standard:

- Conventional Commit header.
- Hidden `GIT_BRAIN_METADATA` HTML comment footer containing the `retroactive_prompt` used to generate the change.
