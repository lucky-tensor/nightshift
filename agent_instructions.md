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

## 2. Installation Guide

Since every AI tool (Claude, Cursor, Windsurf, generic LLM scripts) handles context differently, you must adapt the destination directories. **The goal is to make these files strictly visible and prioritized in the agent's system prompt or context window.**

### Step 1: Install Git Hooks (Universal)

This step is **mandatory** for all environments. It installs the "Enforcers".

Run the following in your project root:

```bash
# 1. Install git hooks
cp templates/hooks/pre-commit .git/hooks/
cp templates/hooks/commit-msg .git/hooks/
chmod +x .git/hooks/pre-commit .git/hooks/commit-msg

# 2. Initialize the Git-Brain state directory
mkdir -p .nightshift
echo '{"sessionId":"manual","nags":{},"lastUpdated":""}' > .nightshift/nag-status.json

# 3. Initialize the Forward Prompt (Memory Nag)
cp templates/nags/forward-prompt.md .nightshift/forward-prompt.md
```

### Step 2: Install Templates (Tool-Specific)

Copy the contents of `templates/agents`, `templates/nags`, and `templates/commands` to your tool's configuration location.

#### For Claude Code (`.claude/`)
Claude looks for context in `.claude/`.
- Copy `templates/agents/*.md` -> `.claude/`
- Copy `templates/nags/*.md` -> `.claude/nags/`
- Copy `templates/commands/*.md` -> `.claude/commands/`

#### For Cursor (`.cursor/rules/`)
Cursor uses `.mdc` files for rules.
- Copy `templates/agents/engineer.md` -> `.cursor/rules/nightshift-engineer.mdc`
- **Important**: Add the glob pattern `**/*` to the rule so it is always active.

#### For Custom Agents / Other (`.agent/` or similar)
If you are building a custom agent or using a general tool:
- Create a `.agent/` directory.
- Copy all templates there: `cp -r templates/* .agent/`
- **Instruction**: Pre-prompt your agent with:
  > "You are running the Nightshift protocol. Read the context in `.agent/` immediately."

---

## 3. Verification

To verify the installation is working:

1. **Check the Brain**: Ask your agent "What are the 5 operating principles of the Nightshift Engineer?" (It should recite them from the Agent template).
2. **Check the Enforcer (Block)**:
   - Manually set a nag to "NOK": `echo '{"nags":{"test-nag":"NOK"}}' > .nightshift/nag-status.json`
   - Try to commit: `git commit --allow-empty -m "test"`
   - **Result**: The commit MUST fail.

3. **Check the Resolution (Pass)**:
   - Manually set the nag to "OK": `echo '{"nags":{"test-nag":"OK"}}' > .nightshift/nag-status.json`
   - Retry commit: `git commit --allow-empty -m "test"`
   - **Result**: The commit SHOULD succeed.
