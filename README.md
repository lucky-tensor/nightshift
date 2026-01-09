# Dark Factory

**Autonomous AI Software Factory**

Dark Factory is a methodology and toolset for enabling autonomous AI agents to build, maintain, and document large software projects. It shifts the focus from human-readable code to machine-reproducible "Reasoning Ledgers."

## Two Ways to Use

### 1. The Methodology (Quickstart)

**For: Users with existing AI coding assistants (Cursor, Windsurf, Cody, etc.)**

You don't need to install any new software. You simply adopt the **Dark Factory Standard** to give your agents better memory, context, and quality control.

**Copy/Paste this prompt to your Agent:**

> "Agent, I want to adopt the Dark Factory methodology for this repository. Please read the bootstrapping guide at [https://github.com/opencode-ai/dark-factory/blob/main/docs/development/agent_bootstrap_instructions.md](https://github.com/opencode-ai/dark-factory/blob/main/docs/development/agent_bootstrap_instructions.md) and execute the steps to restructure my documentation, create the START_HERE.md anchor, and install the 'Nag' quality gates."

### 2. The Service (Advanced)

**For: Users who want fully autonomous, long-running orchestration.**

The Dark Factory Service is a standalone CLI/TUI that manages multiple agents, handles API costs, and runs while you sleep.

**Features**

- 🖥️ **TUI Dashboard** - Real-time factory monitoring.
- 📦 **Project Isolation** - Git worktree sandboxing.
- 💰 **Finance Management** - Automatic provider switching and budget tracking.

**Installation**

```bash
bun install
bun run start
```

## Core Concepts

- **Git-Brain**: Commits are a "Reasoning Ledger." We store the _prompt_ and _intent_ in hidden metadata to allow perfect replayability.
- **Access Paths**: Git branches are named like file paths (`df/session/option-a`) to show lineage.
- **Nags**: Mandatory "Gateways of Last Resort" checklists that agents must pass before marking tasks complete.
- **Knowledge Base**: A fractal documentation structure anchored by `START_HERE.md`.

## Documentation

- [Start Here](./START_HERE.md) - The entry point for this repository's knowledge base.
- [Vision](./docs/product_vision/1-vision.md)
- [Architecture](./docs/technical/architecture.md)
