# Dark Factory

A TypeScript-based orchestration tool for Antigravity IDE that enables autonomous, long-running AI agents to complete large software projects.

## Overview

Dark Factory allows AI agents to work autonomously for up to 12 hours on complex coding tasks, handling:
- **Automatic cost management** - Switches between LLM providers when credits run low
- **Decision branching** - Explores multiple solution paths in parallel when uncertain
- **Quality assurance** - Enforces tests, linting, and formatting before completion
- **Isolated environments** - Uses git worktrees to prevent pollution
- **Task management** - Autonomous project manager persona audits progress

## Key Features

- 🤖 **Autonomous Agents** - Work for hours without human intervention
- 💰 **Finance Management** - Auto-switch providers, handle rate limits gracefully
- 🌳 **Decision Branching** - Explore up to 2 solution paths in parallel
- ✅ **Quality Gates** - Tests, linting, formatting enforced automatically
- 📋 **Task Tracking** - PM persona keeps task lists accurate
- 🔒 **Safety** - Cannot push to remote repos, 12-hour hard timeout

## Status

🚧 **In Development** - Currently in planning phase

See [IMPLEMENTATION_PLAN.md](./docs/IMPLEMENTATION_PLAN.md) for development roadmap.

## Documentation

- [PRD.md](./docs/PRD.md) - Product Requirements Document
- [SPEC.md](./docs/SPEC.md) - Technical Specification
- [IMPLEMENTATION_PLAN.md](./docs/IMPLEMENTATION_PLAN.md) - Implementation Plan

## Requirements

- **Bun**: >= 1.0.0
- **Git**: >= 2.25.0 (for worktree support)
- **OS**: macOS, Linux, or Windows WSL

## Installation (Coming Soon)

```bash
bun install -g @dark-factory/cli

# Initialize config
df setup

# Configure LLM provider
df provider add --name openai --model gpt-4 --api-key $OPENAI_KEY
```

## Quick Start (Coming Soon)

```bash
# Create a new project
df init my-feature \
  --description "Add user authentication" \
  --persona engineer,tester

# Start autonomous work
df start my-feature

# Check status
df status my-feature

# View task list
df tasks my-feature
```

## Architecture

```
┌─────────────────────────────────────────┐
│       Orchestration Engine              │
│  ┌──────────┐  ┌──────────┐  ┌────────┐│
│  │ Project  │  │ Finance  │  │  Git   ││
│  │ Manager  │  │ Manager  │  │Manager ││
│  └──────────┘  └──────────┘  └────────┘│
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│          Agent Runtime                  │
│  ┌──────────┐  ┌──────────┐            │
│  │ Persona  │  │ Quality  │            │
│  │ Loader   │  │  Gates   │            │
│  └──────────┘  └──────────┘            │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│       LLM Provider Layer                │
│  OpenCode SDK + Antigravity OAuth       │
│  (Gemini 3, Claude 4.5 via Antigravity) │
└─────────────────────────────────────────┘
```

## Core Concepts

### Personas
Markdown templates that define agent behavior and acceptance criteria. Built-in personas:
- **Engineer** - Feature development, refactoring
- **Tester** - Test writing, coverage improvement
- **Reviewer** - Code review, quality checks
- **Project Manager** - Task tracking, progress auditing

### Decision Branching
When agents face low-confidence decisions, Dark Factory automatically:
1. Creates 2 parallel branches in separate worktrees
2. Explores each option independently
3. Generates comparison reports
4. Lets you choose the best approach

### Finance Persona
Special persona that:
- Monitors API credits via noop probes
- Switches providers when credits exhausted
- Enters polling mode if no providers available
- Resumes automatically when provider recovers

## Development

```bash
# Clone the repository
git clone https://github.com/yourusername/dark-factory.git
cd dark-factory

# Install dependencies
bun install

# Run tests
bun test

# Run in watch mode
bun --watch src/cli/index.ts

# Build
bun run build
```

## Contributing

Contributions welcome! Please read our contributing guidelines (coming soon).

## License

MIT (see LICENSE file)

## Roadmap

- [x] Phase 0: Planning & Documentation
- [ ] Phase 1: Core Infrastructure (Weeks 2-3)
- [ ] Phase 2: LLM Integration (Weeks 4-5)
- [ ] Phase 3: Agent Runtime (Weeks 6-7)
- [ ] Phase 4: Decision Branching (Week 8)
- [ ] Phase 5: Project Manager Persona (Week 9)
- [ ] Phase 6: Polish & Documentation (Week 10)
- [ ] Phase 7: Beta Testing (Week 11)
- [ ] Phase 8: Release (Week 12)

## Support

- 📖 Documentation: [docs/](./docs/) (coming soon)
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/dark-factory/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/yourusername/dark-factory/discussions)

---

Built with ❤️ for autonomous coding
