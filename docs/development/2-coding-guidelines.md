# Coding Guidelines

## Tech Stack

- **Runtime**: Bun
- **Language**: TypeScript
- **CLI Framework**: Ink (React for CLI)
- **SDK**: `@opencode-ai/sdk`

## Style Guide

- **Strict Typing**: Avoid `any`. Use interfaces and types defined in `src/types/`.
- **Functional Patterns**: Prefer pure functions where possible, especially for data transformation.
- **Async/Await**: Use modern async patterns. Ensure `AbortSignal` is passed to long-running operations.

## Architecture Patterns

- **Agent Pattern**: Follow the `Agent` class structure in `src/runtime/`.
    - State is managed via `messages` history.
    - Tools are executed in a loop until the LLM yields.
- **Manager Pattern**: Use "Managers" (e.g., `ProductManager`, `GitManager`) for domain-specific logic.
- **Event Driven**: Agents emit events (`data`, `tool_call`) that the UI subscribes to.

## Linting

Run the linter before committing:

```bash
bun run lint  # (Assuming script exists, verify in package.json)
```
