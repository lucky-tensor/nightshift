# Feature: Nags (Agent Recall & Quality Enforcement)

## Problem

Autonomous agents frequently suffer from "task amnesia" or "premature completion." They may declare a task "done" after writing the code but before verifying it. Common failures include:

- Forgetting to run tests.
- Forgetting to lint or format.
- Ignoring build errors.
- Failing to check edge cases defined in the original requirements.

## Solution: The "Nag" System

"Nags" are specialized, mandatory checklists injected into the context at specific lifecycle events (usually just before a task is marked as `completed`). They act as a "Gateway of Last Resort."

### How It Works

1.  **Trigger**: Agent attempts to call `completeTask()` or `submitPR()`.
2.  **Interception**: The system intercepts the call and checks if the relevant "Nag" has been satisfied.
3.  **The Nag**: If unsatisfied, the system responds with a **Nag Template** (e.g., "You forgot to lint. Do it now.").
4.  **Resolution**: The agent must perform the actions, check the boxes, and resubmit.

## Nag Templates

Nags are stored as markdown templates in `templates/nags/`. Users can define custom nags for different languages, project types, or specific sensitive modules.

### Standard Nags

- **`javascript-nag.md`**: Enforces `npm test`, `npm run lint`, `npm run build`.
- **`security-nag.md`**: Reminds agents to check for secrets in code, input validation, etc.
- **`documentation-nag.md`**: Ensures docs were updated along with code.

## Integration

- **CLI**: Users can manually "nag" an agent: `nightshift nag <agent-id> --template javascript`.
- **Automated**: The `Supervisor` agent automatically applies nags based on the file types modified (e.g., if `.ts` files changed, apply `javascript-nag`).
