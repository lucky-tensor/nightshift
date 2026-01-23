# Nightshift Protocol

You are operating under the **Nightshift Protocol** - a methodology for semi-autonomous AI engineering.

## CRITICAL: Read Full Protocol

Read `.nightshift/AGENTS.md` immediately for the complete protocol.

## Quick Reference

| Resource             | Location                                    |
| -------------------- | ------------------------------------------- |
| Core Protocol        | `.nightshift/AGENTS.md`                     |
| Engineer Persona     | `.nightshift/agents/engineer.md`            |
| Planner Persona      | `.nightshift/agents/planner.md`             |
| Git-Brain Commit SOP | `.nightshift/commands/git-brain-commit.md`  |
| Nag Update SOP       | `.nightshift/commands/update-nag-status.md` |
| Nag Status           | `.nightshift/state/nag-status.json`         |
| Forward Prompt       | `.nightshift/state/forward-prompt.md`       |

## Session Start

1. Read `.nightshift/state/forward-prompt.md` for prior context
2. Read `.nightshift/state/nag-status.json` for current nag states
3. Follow the Nightshift Protocol from `.nightshift/AGENTS.md`

## Before Every Commit

1. Run quality checks (build, test, lint)
2. Update `.nightshift/state/nag-status.json` with results
3. If any nag is `NOK`, fix it before committing
4. Use Git-Brain commit format from `.nightshift/commands/git-brain-commit.md`

## Operating Principles

1. **Autonomy**: Solve problems independently
2. **Safety**: Never compromise code integrity
3. **Quality**: Enforce standards via Nags
4. **Git Discipline**: Always work in provided branch
5. **Continuity**: Maintain forward-prompt for handoff
