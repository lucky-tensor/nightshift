# Feature: Nags (Quality Gates)

Nags are Nightshift's mandatory quality enforcement system. They act as "Gateways of Last Resort" that ensure code quality standards are met before commits and pushes.

## Problem

Autonomous agents frequently suffer from:

- **Task Amnesia**: Declaring tasks complete without verification
- **Skipped Checks**: Not running tests, linters, or formatters
- **Build Failures**: Ignoring compilation errors
- **Missing Context**: Overlooking edge cases from requirements

## Solution: The Nag System

Nags are structured quality checks that run at specific git lifecycle stages:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Git Lifecycle                             │
│                                                                  │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌────────┐   │
│   │  Edit    │───▶│ Commit   │───▶│  Push    │───▶│ Remote │   │
│   │  Code    │    │          │    │          │    │         │   │
│   └──────────┘    └──────────┘    └──────────┘    └────────┘   │
│                     │      │            │               │       │
│                     ▼      ▼            ▼               ▼       │
│              ┌─────────────────────────────────────────────┐    │
│              │              Nags Execution                  │    │
│              │  pre-commit: auto-fix      pre-push: strict │    │
│              └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## Nag Types

### Tool Nags

Execute real commands (linters, formatters, compilers):

```typescript
{
    id: "format-prettier",
    name: "Prettier Format",
    description: "Format code with Prettier",
    stage: "pre-commit",
    type: "tool",
    enabled: true,
    severity: "warning",
    blocking: false,
    command: "bunx prettier --write .",
    successCriteria: "exit_code_zero"
}
```

**Characteristics:**

- Fast execution
- Deterministic results
- No agent runtime required
- Best for: formatting, simple linting, type checking

### Agent Nags

Evaluated by AI agent as **OK** or **NOK**:

```typescript
{
    id: "security-review",
    name: "Security Review",
    description: "AI security evaluation",
    stage: "pre-push",
    type: "agent",
    enabled: true,
    severity: "info",
    blocking: false,
    prompt: "Review staged changes for security vulnerabilities. Flag any potential issues.",
    agentId: "security-expert"
}
```

**Characteristics:**

- AI-powered judgment
- Context-aware evaluation
- Requires agent runtime
- Best for: code review, architecture checks, security analysis

## Execution Stages

### Pre-commit Stage

**Purpose:** Auto-fix issues without blocking commits

**Characteristics:**

- Non-blocking by default
- Fast execution (< 5 seconds)
- Auto-fix enabled
- Developer flow not interrupted

**Default Pre-commit Nags:**

| Project Type | Nags                           |
| ------------ | ------------------------------ |
| Node.js/Bun  | prettier --write, eslint --fix |
| Rust         | cargo fmt, cargo clippy --fix  |
| Python       | ruff --fix, black, isort       |

### Pre-push Stage

**Purpose:** Strict validation before remote upload

**Characteristics:**

- Blocking by default
- Thorough checking
- Can include slow checks
- Final quality gate

**Default Pre-push Nags:**

| Project Type | Nags                                         |
| ------------ | -------------------------------------------- |
| Node.js/Bun  | tsc --noEmit, eslint, prettier --check       |
| Rust         | cargo check, cargo fmt --check, cargo clippy |
| Python       | ruff check, black --check, mypy              |

## Supported Project Types

Nightshift auto-detects project type and applies appropriate defaults:

| Type        | Indicators       | Pre-commit       | Pre-push            |
| ----------- | ---------------- | ---------------- | ------------------- |
| **Bun**     | `bun.lockb`      | prettier, eslint | tsc, eslint         |
| **Node.js** | `package.json`   | prettier, eslint | tsc, eslint         |
| **Rust**    | `Cargo.toml`     | cargo fmt        | cargo check, clippy |
| **Python**  | `pyproject.toml` | black, isort     | ruff, mypy          |

## Agent Tools for Nag Management

Agents can manage nags using these tools:

### Installation & Status

```typescript
// Install hooks and initialize default nags for project type
await nags_install({});

// Check current nag configuration
await nags_status({});

// List all configured nags
await nags_list({});

// Apply default nags for detected project type
await nags_defaults({});
```

### Adding Nags

```typescript
// Add a tool-based nag
await nags_add_tool({
    id: "custom-lint",
    name: "Custom Linter",
    description: "Run custom linting rules",
    stage: "pre-push",
    command: "npm run lint:custom",
    blocking: true,
    severity: "error",
});

// Add an agent-based nag
await nags_add_agent({
    id: "code-review",
    name: "AI Code Review",
    description: "Review code for best practices",
    stage: "pre-push",
    prompt: "Review changes for code quality and best practices. Return OK or NOK with reasons.",
    agentId: "reviewer",
    blocking: false,
});
```

### Removal & Testing

```typescript
// Remove a nag by ID
await nags_remove({ id: "custom-lint" });

// Test nags for a stage
await nags_run({ stage: "pre-commit" });
```

### Configuration Management

```typescript
// Export nags configuration as JSON
const config = await nags_export({});

// Import nags configuration
await nags_import({ config: jsonString });
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
        },
        {
            "id": "security-review",
            "name": "Security Review",
            "description": "AI security evaluation",
            "stage": "pre-push",
            "type": "agent",
            "enabled": true,
            "severity": "info",
            "blocking": false,
            "prompt": "Review staged changes for security issues.",
            "agentId": "security-expert"
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

## Nag Result Types

| Status      | Description                                       |
| ----------- | ------------------------------------------------- |
| **passed**  | Nag completed successfully                        |
| **failed**  | Nag check failed                                  |
| **skipped** | Nag was skipped (e.g., agent nag without runtime) |
| **error**   | Nag execution encountered an error                |

## Best Practices

### Pre-commit Nags

1. **Keep them fast** - Maximum 5 seconds execution
2. **Auto-fix when possible** - Format, simple lint fixes
3. **Non-blocking** - Let developers work efficiently
4. **Coverage:** formatting, import sorting, simple linting

### Pre-push Nags

1. **Be thorough** - This is the final quality gate
2. **Fail on issues** - Blocking is appropriate here
3. **Include slow checks** - Full type checking, security scans
4. **Coverage:** type safety, security, performance, architecture

### Agent Nags

1. **Clear prompts** - Agents need specific evaluation criteria
2. **Appropriate expectations** - Slower than tool nags
3. **Usually non-blocking** - Human judgment matters
4. **Use cases:** code review, security analysis, architecture review

## Troubleshooting

### Hooks not running

```bash
# Check if hooks are installed
cat .git/hooks/pre-commit
```

### Project type not detected

Ensure indicator files exist:

- Bun: `bun.lockb`
- Node.js: `package.json`
- Rust: `Cargo.toml`
- Python: `pyproject.toml` or `requirements.txt`

### Agent nags skipped

Agent nags require an agent runtime. Use `nags_run` tool for full execution:

```typescript
await nags_run({ stage: "pre-push" });
```

## Integration with Nightshift

When creating projects via Nightshift:

1. Project type is auto-detected
2. Default nags are applied
3. Git hooks are installed
4. Agents can customize nags as needed

## Related Documentation

- [Technical Specification: Nags](./technical/git-hooks.md)
- [Architecture Overview](./technical/architecture.md)
- [Agent Bootstrap Instructions](../development/agent_bootstrap_instructions.md)
