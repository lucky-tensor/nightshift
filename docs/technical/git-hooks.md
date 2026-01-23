# Nags Specification

Nightshift implements a **nags** system for automated code quality enforcement. Nags are quality checks that run at specific git lifecycle stages (pre-commit, pre-push) to ensure code meets defined standards.

## Nags vs Traditional Hooks

Unlike simple shell script hooks, nags are a structured specification that supports two execution models:

| Type           | Description                                            | Execution                |
| -------------- | ------------------------------------------------------ | ------------------------ |
| **Tool Nags**  | Execute real commands (linters, formatters, compilers) | Direct command execution |
| **Agent Nags** | Evaluated by an AI agent as **OK** or **NOK**          | Agent-based judgment     |

## Nag Structure

```typescript
interface BaseNag {
    id: string;
    name: string;
    description: string;
    stage: "pre-commit" | "pre-push";
    type: "tool" | "agent";
    enabled: boolean;
    severity: "error" | "warning" | "info";
    blocking: boolean;
}
```

### Tool Nag

```typescript
interface ToolNag extends BaseNag {
    type: "tool";
    command: string; // Command to execute
    workingDirectory?: string; // Working directory
    timeout?: number; // Timeout in seconds
    successCriteria?: // How to determine success
        "exit_code_zero" | "output_contains" | "output_not_contains";
    expectedOutput?: string; // Expected output for criteria
}
```

### Agent Nag

```typescript
interface AgentNag extends BaseNag {
    type: "agent";
    prompt: string; // Evaluation prompt
    agentId?: string; // Agent persona to use
    evaluationCriteria?: string; // What to evaluate
    maxTokens?: number; // Token limit
}
```

## Nag Execution Flow

### Pre-commit Stage

Pre-commit nags run before a commit is finalized. They are designed to:

- **Auto-fix issues** where possible (formatting, simple linting)
- **Not block** the commit on non-critical issues
- **Run quickly** to not interrupt developer flow

**Default pre-commit nags by project type:**

| Project Type | Tool Nags                            |
| ------------ | ------------------------------------ |
| Node.js/Bun  | `prettier --write`, `eslint --fix`   |
| Rust         | `cargo fmt`, `cargo clippy --fix`    |
| Python       | `ruff check --fix`, `black`, `isort` |

### Pre-push Stage

Pre-push nags run before code is pushed to remote. They are designed to:

- **Strictly validate** all code quality standards
- **Block push** if any check fails
- **Include slow checks** that aren't appropriate for pre-commit

**Default pre-push nags by project type:**

| Project Type | Tool Nags                                          |
| ------------ | -------------------------------------------------- |
| Node.js/Bun  | `tsc --noEmit`, `eslint`, `prettier --check`       |
| Rust         | `cargo check`, `cargo fmt --check`, `cargo clippy` |
| Python       | `ruff check`, `black --check`, `mypy`              |

## Agent Nags

Agent nags enable AI-powered quality evaluation that goes beyond simple command outputs:

```typescript
{
    id: "code-review-agent",
    name: "AI Code Review",
    description: "Review code for best practices",
    stage: "pre-push",
    type: "agent",
    enabled: true,
    severity: "warning",
    blocking: false,
    prompt: "Review the staged changes for code quality, performance issues, and adherence to best practices. Return OK if the code meets standards, NOK with specific issues if it doesn't.",
    agentId: "reviewer"
}
```

**Agent nag evaluation:**

- The agent reviews the code and returns **OK** or **NOK**
- The evaluation is based on the provided prompt criteria
- Results are included in the nag report

## Nag Management Tools

### Installation

```typescript
// Install hooks and initialize default nags
await nags_install({});

// Install specific hook only
await nags_install({ hook: "pre-commit" });
await nags_install({ hook: "pre-push" });
```

### Status

```typescript
// Check hook and nag status
const status = await nags_status({});
// Returns: project type, hook installation status, nag counts
```

### Adding Nags

**Tool-based nag:**

```typescript
await nags_add_tool({
    id: "custom-lint",
    name: "Custom Linter",
    description: "Run custom linting rules",
    stage: "pre-push",
    command: "npm run lint:custom",
    blocking: true,
    severity: "error",
});
```

**Agent-based nag:**

```typescript
await nags_add_agent({
    id: "security-review",
    name: "Security Review",
    description: "AI security evaluation",
    stage: "pre-push",
    prompt: "Review staged changes for security vulnerabilities. Flag any potential issues.",
    agentId: "security-expert",
    blocking: false,
});
```

### Running Nags Manually

```typescript
// Test nags for a stage
const report = await nags_run({ stage: "pre-commit" });
// Returns detailed execution report
```

### Configuration Export/Import

```typescript
// Export current nags configuration
const config = await nags_export({});

// Import configuration
await nags_import({ config: exportedJson });
```

## Configuration File

Nags are stored in `.nightshift/nags/nags.json`:

```json
{
    "version": "1.0.0",
    "projectType": "nodejs",
    "nags": [
        {
            "id": "format-prettier",
            "name": "Prettier Format",
            "description": "Format code with Prettier",
            "stage": "pre-commit",
            "type": "tool",
            "enabled": true,
            "severity": "warning",
            "blocking": false,
            "command": "bunx prettier --write .",
            "successCriteria": "exit_code_zero"
        }
    ],
    "defaults": {
        "preCommit": {
            "autoFix": true,
            "blocking": false
        },
        "prePush": {
            "strict": true,
            "blocking": true
        }
    }
}
```

## Best Practices

### Pre-commit Nags

1. **Keep them fast** - Don't run slow checks in pre-commit
2. **Auto-fix when possible** - Format, simple lint fixes
3. **Non-blocking by default** - Let developers decide
4. **Examples:** prettier, cargo fmt, ruff --fix

### Pre-push Nags

1. **Be thorough** - This is the final quality gate
2. **Fail on issues** - Blocking is appropriate here
3. **Include slow checks** - Type checking, full linting
4. **Examples:** tsc --noEmit, cargo clippy, mypy

### Agent Nags

1. **Use for subjective evaluation** - Code review, architecture checks
2. **Provide clear prompts** - Agents need specific criteria
3. **Set appropriate expectations** - Agent evaluation is slower
4. **Usually non-blocking** - Let humans make final judgment

## Troubleshooting

### Nags not running

Check if hooks are installed:

```bash
cat .git/hooks/pre-commit
```

### Project type not detected

Verify indicator files exist:

- Node.js/Bun: `package.json` or `bun.lockb`
- Rust: `Cargo.toml`
- Python: `pyproject.toml` or `requirements.txt`

### Agent nags skipped

Agent nags require an agent runtime. In standalone hook execution, they are skipped. Use `nags_run` tool for full agent nag execution.

## Integration with Nightshift Workflow

When a project is created via nightshift:

1. **Auto-detection** identifies project type
2. **Default nags** are applied based on project type
3. **Hooks are installed** automatically
4. **Agents can customize** nags via tools as needed

The nags system provides a flexible, extensible foundation for maintaining code quality across all projects in the factory.
