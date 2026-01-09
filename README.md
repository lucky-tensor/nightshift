# Nightshift

**Agents will one day code entire products autonomously.**

We are not there yet.

Ever had an agent:

- Fake the tests?
- Say "it's perfect" but it doesn't compile?
- Get stuck in a loop?

We all have. Engineers don't want to be their nannies. We want to let them work overnight, and not have the factory on fire when we come home.

We need to change our workflow and our tools to get there faster.

---

**Nightshift** is a methodology and toolset for enabling autonomous AI agents to build, maintain, and document large software projects. It shifts the focus from human-readable code to machine-reproducible "Reasoning Ledgers."

## Two Ways to Use

### 1. The Methodology (Quickstart)

**For: Users with existing AI coding assistants (Cursor, Windsurf, Cody, etc.)**

You don't need to install any new software. You simply adopt the **Nightshift Standard** to give your agents better memory, context, and quality control.

**Copy/Paste this prompt to your Agent:**

> "Agent, I want to adopt the Nightshift methodology for this repository. Please read the bootstrapping guide at [https://github.com/opencode-ai/nightshift/blob/main/docs/development/agent_bootstrap_instructions.md](https://github.com/opencode-ai/nightshift/blob/main/docs/development/agent_bootstrap_instructions.md) and execute the steps to restructure my documentation, create the START_HERE.md anchor, and install the 'Nag' quality gates."

### 2. The Service (Advanced)

**For: Users who want fully autonomous, long-running orchestration.**

The Nightshift Service is a standalone CLI/TUI that manages multiple agents, handles API costs, and runs while you sleep.

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
- **Access Paths**: Git branches are named like file paths (`ns/session/option-a`) to show lineage.
- **Nags**: Mandatory "Gateways of Last Resort" checklists that agents must pass before marking tasks complete.
- **Knowledge Base**: A fractal documentation structure anchored by `START_HERE.md`.

## Documentation

- [Start Here](./START_HERE.md) - The entry point for this repository's knowledge base.
- [Vision](./docs/product_vision/1-vision.md)
- [Architecture](./docs/technical/architecture.md)
