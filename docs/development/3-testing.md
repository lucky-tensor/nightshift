# Testing Strategy

## Overview

We use the native **Bun test runner** for unit and integration testing.

## Running Tests

Run all tests:

```bash
bun test
```

Run specific test file:

```bash
bun test path/to/file.test.ts
```

## Testing Standards

### Unit Tests

- Place tests alongside source files (e.g., `src/agent/tests/`).
- Mock external dependencies (LLM APIs, Git operations) using `bun:test` mocks.

### Integration Tests

- Test the `Agent.run` loop with mock providers.
- Verify Git Worktree creation and teardown in a temporary directory.

### CLI Tests

- Test Ink components using `ink-testing-library` (if applicable).
