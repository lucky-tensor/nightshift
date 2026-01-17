# Feature: Nags (Agent Recall & Quality Enforcement)

## Problem

Autonomous agents frequently suffer from "task amnesia" or "premature completion." They may declare a task "done" after writing the code but before verifying it. Common failures include:

- Forgetting to run tests.
- Forgetting to lint or format.
- Ignoring build errors.
- Failing to check edge cases defined in the original requirements.

## Solution: The "Nag" System

"Nags" are specialized, mandatory **single-task** interventions injected into the agent's context. They act as binary "Gateways of Last Resort."

### Core Philosophy

1.  **Single Task**: A Nag represents ONE specific verification (e.g., "Is the build clean?"). It is not a sprawling checklist.
2.  **Binary Protocol**: The agent must respond with exactly **"OK"** or **"NOK"**.
    - **OK**: The condition is satisfied.
    - **NOK**: The condition is failed.
3.  **Hard Enforcement**: The OS-level Git hooks (`pre-commit`) parse this status. If the status is not "OK", the commit is mechanically blocked.

### How It Works (The Protocol)

The Nag system implements a strict **State Machine Protocol**.

1.  **Challenge**: The system (or supervisor) injects a Nag Template and sets its status to "NOK" in `.nightshift/nag-status.json`.
    ```json
    { "nags": { "javascript-nag": "NOK" } }
    ```
2.  **Gate**: The agent attempts to `git commit`. The `pre-commit` hook reads the file. Seeing "NOK", it **blocks** the commit.
3.  **Action**: The agent must:
    - Read the Nag Template (Question).
    - Perform the verification (Work).
    - **Update the JSON File** (Answer).
4.  **Acceptance**: The agent writes:
    ```json
    { "nags": { "javascript-nag": "OK" } }
    ```
5.  **Pass**: The next `git commit` attempt reads "OK" and allows the commit to proceed.

## Nag Templates

Nags are stored as markdown templates in `templates/nags/`. Each template must specify its **Nag ID** and the exact JSON update command required.

### Types of Nags

#### 1. Quality Nags
Enforce code integrity.
- **`javascript-nag.md`**: "Is the project building and passing tests?" (OK/NOK)

#### 2. Memory Nags
Enforce context continuity.
- **`forward-prompt.md`**: "Have you updated the `forward-prompt.md` file with your latest state?" (OK/NOK)

#### 3. Discipline Nags
Enforce process hygiene.
- **`commit-discipline-nag.md`**: "Are you committing too many files at once?" (OK/NOK)

## Integration

- **Manual**: User invokes: `nightshift nag <agent-id> --template javascript`.
- **Automated Hooks**: The `.nightshift/hooks/pre-commit` script reads `.nightshift/nag-status.json` and prevents `git commit` until the active nag is "OK".
