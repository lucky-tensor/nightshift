# Nightshift: Agent Configuration & Methodology

This document guides you (or your agent) on how to install the Nightshift methodology into your specific AI coding environment.

## 1. Methodology & Components

The **Nightshift** methodology transforms standard AI coding assistants into semi-autonomous engineers by enforcing strict protocols for memory, quality assurance, and version control. It consists of four key component types:

### A. Persona Templates (`templates/agents/`)
Defines *who* the agent is. It sets the operating principles (Autonomy, Safety, Quality) and the primary loop (Research -> Plan -> Execute -> Verify).
- **Aim**: To keep the agent properly role-playing as a senior engineer rather than a passive chatbot.

### B. Nags (`templates/nags/`)
The "Gateway of Last Resort". A Nag is a **Single-Task State Machine Check**.
- **The Rule**: You cannot commit code if any active Nag is not "OK".
- **The Protocol**:
  1. **Receive**: You trigger a Nag (e.g., via a failed pre-commit check).
  2. **Evaluate**: You read the specific Nag Template (e.g., `javascript-nag.md`). provides a single question (e.g., "Is the build clean?").
  3. **Act**:
     - If **FAIL**: Fix the code. Update status to `NOK`.
     - If **PASS**: Update status to `OK`.
  4. **Record**: You **MUST** write the status to `.nightshift/nag-status.json`:
     ```json
     { "nags": { "<nag-id>": "OK" } }
     ```
  5. **Commit**: The `git commit` hook allows the commit only if the status is exactly `"OK"`.

- **Types**:
  - **Quality Nag**: (`javascript-nag`) Checks build/test/lint.
  - **Memory Nag**: (`forward-prompt`) Checks context updates.
  - **Discipline Nag**: (`commit-discipline-nag`) Checks commit size.
- **Aim**: Mechanical, binary enforcement of engineering standards.

### C. Commands (`templates/commands/`)
Standard Operating Procedures (SOPs) for specific actions.
- **Aim**: To standardize complex operations like "Git-Brain Commits" so they are performed consistently across different sessions.

### D. Enforcers (`templates/hooks/`)
OS-level scripts that mechanically prevent rule-breaking.
- **Aim**: To act as a hard barrier. You cannot commit code if you haven't satisfied the active Nags.

---

## 2. Installation Guide (Canonical)

The repository provides a bootstrap script that installs the Nightshift Protocol into any project. This installs the `.nightshift/` directory (canonical documentation) and the vendor-specific shim.

### Step 1: Run the Bootstrap One-Liner

Run this command in your project root:

```bash
# Replace [vendor] with: opencode, claude, cursor, gemini, or codex
curl -fsSL https://raw.githubusercontent.com/lucky-tensor/nightshift/main/install-templates.sh | bash -s -- [vendor]
```

### Step 2: Protocol Files

This command creates the following structure in your project:

| Location | Purpose |
|----------|---------|
| `.nightshift/AGENTS.md` | **The Core Protocol**. Read this first. |
| `.nightshift/agents/` | Persona definitions (Engineer, Planner). |
| `.nightshift/commands/` | SOPs for commits, nags, and session handoff. |
| `.nightshift/nags/` | Quality gate definitions (checks). |
| `.nightshift/hooks/` | Bash scripts for pre-commit enforcement. |
| `.nightshift/state/` | Runtime memory (Forward Prompt, Nag Status). |

### Step 3: Git Hooks Enforcement

The installer automatically links the hooks to `.git/hooks/`. These hooks prevent you from committing if any Quality Nag in `.nightshift/state/nag-status.json` is set to `"NOK"`.

---

## 3. Tool-Specific Shims

The shim connects your AI tool to the canonical `.nightshift/` directory.

- **OpenCode**: `opencode.json` (created in root)
- **Claude Code**: `.claude/CLAUDE.md`
- **Cursor**: `.cursorrules`
- **Gemini CLI**: `GEMINI.md`

---

## 4. Verification

To verify the installation:

1. **Protocol Check**: Ask your agent: "What are the 5 operating principles of the Nightshift Engineer?"
2. **Nag Block Check**:
   - Set a nag to NOK: `echo '{"nags":{"test":"NOK"}}' > .nightshift/state/nag-status.json`
   - Try to commit: `git commit --allow-empty -m "test"` (It should be blocked)
3. **Nag Pass Check**:
   - Set nag to OK: `echo '{"nags":{"test":"OK"}}' > .nightshift/state/nag-status.json`
   - Try to commit again (It should pass)
