# Dark Factory

**Autonomous AI Software Factory**

Dark Factory is a standalone CLI tool that orchestrates AI agents to build software products. It acts as a "Factory" environment where multiple products are developed concurrently by specialized sub-agents (Planner, Coder, Curator).

## Features

- 🖥️ **TUI Dashboard** - Monitor your factory status, budget, and active projects in real-time.
- 🤖 **Autonomous Agents** - Run complex tasks without constant supervision.
- 📦 **Project Isolation** - Uses git worktrees to keep agent work separate from main branches.
- 🏭 **Factory Management** - Orchestrate multiple concurrent software products.
- 💰 **Finance Management** - Track costs and manage token budgets.

## Installation & Usage

### 1. Install Dependencies

```bash
bun install
```

### 2. Run the CLI (TUI)

```bash
bun run start
```

This launches the interactive dashboard.

- **First Run**: Press `Enter` to initialize the factory.
- **New Product**: Press `n` to create a new software product.
- **Quit**: Press `q` to exit.

## How It Works

### File Structure

When you create a product (e.g., "my-app"), Dark Factory creates the following structure in your output directory:

```
my-app/                 # Product Container
├── my-app-main/        # Main Git Repository
│   ├── .git/
│   ├── src/
│   ├── docs/
│   └── ...
└── worktree-task-123/  # Isolated Agent Workspace
    └── ...
```

This structure ensures that agents work in isolated environments (worktrees) without messing up the main repository state until their work is verified and merged.

## Architecture

See [docs/FACTORY_ARCHITECTURE.md](./docs/FACTORY_ARCHITECTURE.md) for detailed architecture documentation.
