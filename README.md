![Nightshift Banner](./docs/assets/banner.svg)


**Nightshift** is a methodology and toolset for enabling autonomous AI agents to build, maintain, and document large software projects. It shifts the focus from human-readable code to machine-reproducible "Reasoning Ledgers." It's a factory for autonomous software.

## Why
**We want agents to work overnight, and the factory must not catch fire.**

Ever had an agent:

- Fake the tests?
- Say "it's perfect" but it doesn't compile?
- Get stuck in a loop?

We all have. Engineers don't want to be agent nannies.

We need to change our workflow and our tools to autonomous software factories.


## Core Concepts

- **Git-Brain**: Git is all you need. Commits are a "Reasoning Ledger." We store the _prompt_ and _intent_ in hidden metadata to allow perfect replayability.
- **Deep Context**: A "Documentation Fractal" anchored by `START_HERE.md` allows agents to situate themselves without RAG, vector stores, or "magic."
- **Multi-Agent**: Use different reasoning providers for what they do best, at the best cost, for the right unit of work.
- **Semantic Worktrees**: Git branches are named like file paths (`ns/session/option-a`) to show lineage and intent.
- **Nags**: Mandatory "Gateways of Last Resort" checklists that agents must pass before marking tasks complete.

## Two Ways to Use

### 1. The Methodology (Quickstart)

**For: Users with existing AI coding assistants (Cursor, Windsurf, Cody, etc.)**

You don't need to install any new software. You simply adopt the **Nightshift Standard** to give your agents better memory, context, and quality control.

**Copy/Paste this prompt to your Agent:**

> Agent, I want to adopt the Nightshift methodology for this repository. Please read the bootstrapping guide at https://github.com/opencode-ai/nightshift/blob/main/docs/development/agent_bootstrap_instructions.md.

### 2. The Service (Advanced)

**For: Users who want fully autonomous, long-running orchestration.**

The Nightshift Service is a standalone CLI/TUI that manages multiple agents, handles API costs, and runs while you sleep.

**Features**

- 🖥️ **TUI Dashboard** - Real-time factory monitoring.
- 📦 **Project Isolation** - Git worktree sandboxing.
- 💰 **Finance Management** - Automatic provider switching and budget tracking.

**Installation**

```bash
# Install via curl (Linux & macOS)
curl -fsSL https://raw.githubusercontent.com/lucky-tensor/nightshift/main/install.sh | bash

# Run
nightshift
```

For manual installation or building from source, see [Installation Guide](./docs/cli-installation.md).

## Documentation

- [Start Here](./START_HERE.md) - The entry point for this repository's knowledge base.
- [Vision](./docs/product_vision/1-vision.md)
- [Architecture](./docs/technical/architecture.md)
