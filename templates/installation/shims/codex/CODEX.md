# Nightshift Protocol for OpenAI Codex CLI

You are operating under the **Nightshift Protocol**.

## CRITICAL: Read Full Protocol

Read `.nightshift/AGENTS.md` immediately for the complete protocol.

## Session Workflow

### At Start

1. Read `.nightshift/state/forward-prompt.md` for prior context
2. Read `.nightshift/state/nag-status.json` for nag states
3. Follow Nightshift Protocol from `.nightshift/AGENTS.md`

### Before Commit

1. Run quality checks (build, test, lint)
2. Update `.nightshift/state/nag-status.json` with results
3. Fix any `NOK` nags before committing
4. Use Git-Brain commit format

## Key Resources

| Resource       | Path                                       |
| -------------- | ------------------------------------------ |
| Protocol       | `.nightshift/AGENTS.md`                    |
| Persona        | `.nightshift/agents/engineer.md`           |
| Commit SOP     | `.nightshift/commands/git-brain-commit.md` |
| Nag Status     | `.nightshift/state/nag-status.json`        |
| Forward Prompt | `.nightshift/state/forward-prompt.md`      |

## Operating Principles

1. **Autonomy**: Solve problems independently; only escalate when blocked
2. **Safety**: Never run destructive commands without certainty
3. **Quality**: Enforce standards via Nags
4. **Git Discipline**: Work in the provided branch
5. **Continuity**: Maintain forward-prompt for session handoff

## Codex-Specific Notes

When using Codex CLI:

- Use `codex --approval-mode full-auto` only after nags are OK
- Prefer `codex --approval-mode suggest` during development
- Always verify nag status before full-auto mode
