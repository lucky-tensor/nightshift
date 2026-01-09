# Technical Challenges & Architecture

## System Architecture

### Hierarchy

The system follows a strict hierarchy:
`Factory (Singleton) -> Products -> Projects (Worktrees) -> Tasks`

### Data Flow

1.  **Product Creation**: Factory initializes a git repo and generates `PRD.md`.
2.  **Planning**: Planner Agent generates `PLAN.md`.
3.  **Execution**: PM Agent selects projects, Git Manager creates worktrees, Coder Agents execute tasks.
4.  **Merge**: Knowledge Base Curator merges project documentation back to the product root.

## Core Components

### 1. Agent Runtime (TypeScript)

- **Agent Class**: Manages session state, cancellation, and the "ReAct" loop.
- **Provider Interface**: Wraps LLM interactions (streaming, tool calling).
- **Persistence**: SQLite database for session and message history.

### 2. TUI (Ink + React)

- **Entry Point**: `src/cli.tsx`
- **Components**: Dashboard, Project Creation forms.
- **Communication**: Subscribes to Agent event emitters for real-time updates.

### 3. File System & Git

- **Isolation**: Heavily relies on `git worktree` to allow multiple agents to work on the same repo without file locking issues.
- **Storage**: YAML-based metadata storage in `~/.dark-factory/`.

## Technical Constraints

1.  **Language**: Core system must be TypeScript (Bun runtime).
2.  **No Remote Push**: Agents cannot push to remote without explicit human approval.
3.  **12-Hour Limit**: Hard timeout for agent sessions to prevent infinite loops/cost runaways.
4.  **Concurrency**: Limited to 2 parallel branches per decision to manage resource usage.

## Open Questions

- Determining "low confidence" thresholds for branching.
- Handling merge conflicts between divergent decision branches.
- Optimal frequency for PM check-ins.
