# Git Hooks & Nags

## What Are Nags?

**Nags** are mandatory quality gates that enforce standards before code can be committed. They're called "nags" because they persistently remind agents (and humans) to maintain quality - like a helpful colleague who won't let you merge broken code.

Think of them as **"Gateways of Last Resort"** - automated checklists that prevent common failures.

## Why Nags Matter

AI agents can:

- Say "tests pass" when they don't
- Skip the build step
- Ignore linting errors
- Fake test results

Nags solve this by **enforcing verification at the git level**. If a nag fails, the commit is blocked. Period.

## How Nags Work

### 1. Nag Status File

Agents maintain `.nightshift/state/nag-status.json`:

```json
{
    "sessionId": "abc-123",
    "nags": {
        "javascript-nag": "OK",
        "python-nag": "NOK"
    },
    "lastUpdated": "2024-01-23T10:30:00Z"
}
```

- `"OK"` - Check passed, safe to commit
- `"NOK"` - Check failed, must fix before commit

### 2. Pre-Commit Hook

The git pre-commit hook (`.git/hooks/pre-commit`) runs before every commit:

```bash
# Check nag status
if any nag is "NOK":
    Block commit with error message
    Tell agent which nags failed
else:
    Allow commit
```

**Example blocked commit:**

```
╔════════════════════════════════════════════════════════════╗
║            ❌ COMMIT BLOCKED - INCOMPLETE NAGS             ║
╠════════════════════════════════════════════════════════════╣
║  • javascript-nag                                          ║
║  • python-nag                                              ║
╠════════════════════════════════════════════════════════════╣
║  Fix issues, then run: /update-nag-status                  ║
║                                                            ║
║  To bypass (human-supervised only):                        ║
║    NIGHTSHIFT_BYPASS=1 git commit ...                      ║
╚════════════════════════════════════════════════════════════╝
```

### 3. Commit-Msg Hook

The commit-msg hook (`.git/hooks/commit-msg`) validates commit message quality:

- Requires minimum 10 characters
- Encourages descriptive messages
- Prevents empty or vague commits

## Example: JavaScript Nag

From `.nightshift/nags/javascript-nag.md`:

```markdown
## Checks

1. **Build**: `npm run build` must succeed
2. **Tests**: `npm test` must pass (or skip if no tests)
3. **Lint**: `npm run lint` must pass

## Update Status

After running checks:

- All pass → Set "javascript-nag": "OK"
- Any fail → Set "javascript-nag": "NOK" with reason
```

## Workflow

### For Agents

1. **Before committing**:

    ```
    /nag-check
    ```

2. **Agent runs**:
    - `npm run build`
    - `npm test`
    - `npm run lint`

3. **Agent updates** `.nightshift/state/nag-status.json`:

    ```json
    { "sessionId": "...", "nags": { "javascript-nag": "OK" }, ... }
    ```

4. **Agent commits**:

    ```
    git commit -m "feat: add user authentication"
    ```

5. **Hook validates**: Checks nag-status.json → Allows commit

### For Humans

Same workflow, or bypass if you know what you're doing:

```bash
NIGHTSHIFT_BYPASS=1 git commit -m "emergency hotfix"
```

## Available Nags

| Nag                     | Purpose                        | Checks                    |
| ----------------------- | ------------------------------ | ------------------------- |
| `javascript-nag`        | JavaScript/TypeScript projects | Build, test, lint         |
| `python-nag`            | Python projects                | pytest, mypy, black       |
| `forward-prompt`        | Session continuity             | Forward-prompt updated    |
| `commit-discipline-nag` | Git hygiene                    | Working on correct branch |

**See `.nightshift/nags/` for nag definitions.**

## Creating Custom Nags

1. Create `.nightshift/nags/my-nag.md`
2. Define checks and update procedure
3. Reference in agent commands

## Benefits

✅ **Prevents fake tests** - Hook verifies actual results
✅ **Enforces standards** - Build, test, lint must pass
✅ **Agent accountability** - Can't fake status file (hook checks it)
✅ **Human override** - NIGHTSHIFT_BYPASS for emergencies
✅ **Session handoff** - Next agent sees what's broken

## Hook Installation

Hooks are installed automatically by the install script:

```bash
cp .nightshift/hooks/pre-commit .git/hooks/pre-commit
cp .nightshift/hooks/commit-msg .git/hooks/commit-msg
chmod +x .git/hooks/pre-commit .git/hooks/commit-msg
```

**See `.nightshift/hooks/` for hook source code.**

## Bypassing Nags (Human-Supervised Only)

**⚠️ WARNING**: Only bypass nags when you understand the consequences.

```bash
# Bypass for one commit
NIGHTSHIFT_BYPASS=1 git commit -m "emergency fix"

# Check what's broken first
cat .nightshift/state/nag-status.json
```

Bypassing should be rare and documented in commit messages.

## Philosophy

> "The factory must not catch fire."

Nags are the fire suppression system. They're annoying when they go off, but they prevent disasters. AI agents need them because they don't have the human instinct to "just check one more time."
