# Nightshift MVP Architecture

## Hierarchy

```
Factory (singleton instance)
└── Products (multiple software products)
    ├── Product Repo (own git repo + remote)
    ├── product_vision/original_prd.md (Product Requirements Document)
    ├── PLAN.md (Implementation plan)
    └── Plan
        └── Projects (git branches + worktrees)
            ├── Tasks (work items)
            └── ./docs (project knowledge base)
                ├── research/
                ├── handbooks/
                └── decisions/
```

## Agent Architecture

### Supervisor Agents

- **Project Manager Agent**: Coordinates projects, assigns tasks, monitors progress
- **Git Manager Agent**: Manages branches, merges, worktrees, conflict resolution
- **Finance Manager Agent**: Tracks costs, manages quotas, optimizes model usage

### Worker Agents

- **Planner Agent**: Creates plans, breaks down requirements into projects/tasks
- **Coder Agent**: Implements features, writes code, runs tests
- **Knowledge Base Curator Agent**: Organizes docs, creates handbooks, maintains research

## Data Flow

### Product Creation

1. Factory creates Product
2. Product initializes git repo (local + remote)
3. product_vision/original_prd.md created from description
4. Planner agent creates PLAN.md with projects

### Project Execution

1. PM agent selects next project from PLAN
2. Git manager creates branch + worktree
3. PM agent breaks project into tasks
4. Coder agents execute tasks
5. KB curator maintains ./docs during work

### Knowledge Base Merge

1. When branch merges to main
2. KB curator triggered
3. All project ./docs merged to product root ./docs
4. Deduplicate and organize knowledge

## File Structure

```
/output/directory/ (e.g. ~/factory-products/)
├── {product-name}/           # Product Container (Root)
│   ├── {product-name}-main/  # Main Repository (Git Init)
│   │   ├── .git/
│   │   ├── README.md
│   │   ├── product_vision/original_prd.md
│   │   ├── PLAN.md
│   │   ├── docs/
│   │   └── src/
│   │
│   └── worktree-{task-id}/   # Task Workspaces (Git Worktrees)
│       ├── .git/ (file linking to main repo)
│       ├── src/
│       └── ...
│
~/.nightshift/
├── factory.yaml              # Factory state
├── products/
│   └── {product-id}.yaml     # Product metadata (points to Root & Repo paths)
├── plans/
│   └── {product-id}.yaml
└── projects/
    └── {project-id}.yaml     # Task Session metadata
```

## CLI Architecture

The Nightshift CLI (`nightshift`) is a standalone TUI application built with Ink and React.

### Components

- **Entry Point**: `src/cli.tsx` - Initializes storage and renders the App.
- **Dashboard**: `src/cli/components/Dashboard.tsx` - Main view showing factory status and active products.
- **Project Creation**: `src/cli/components/ProjectCreate.tsx` - Form for creating new software products.

### Commands

- `start`: Run the TUI (`bun run start`)
- `n`: Create new project (in TUI)
- `q`: Quit (in TUI)

## Agent Personas

### Planner (planner.md)

- Strategic thinking
- Requirements analysis
- Project breakdown
- Dependency mapping

### Coder (engineer.md - existing)

- Code implementation
- Testing
- Debugging
- Code review

### KB Curator (curator.md)

- Documentation
- Research organization
- Knowledge synthesis
- Handbook creation

### PM Supervisor (pm-supervisor.md)

- Task prioritization
- Progress tracking
- Risk management
- Team coordination

### Git Supervisor (git-supervisor.md)

- Branch strategy
- Merge management
- Conflict resolution
- Repository health

### Finance Supervisor (finance-supervisor.md)

- Cost tracking
- Quota management
- Model optimization
- Budget forecasting

## MVP Implementation Phases

### Phase 1: Core Types & Storage ✓ (Current)

- [x] Factory type
- [x] Product type
- [x] Plan type
- [x] Storage managers

### Phase 2: Product & Repo Management

- [ ] ProductManager
- [ ] Git repo initialization (local + remote)
- [ ] product_vision/original_prd.md generation
- [ ] PLAN.md generation

### Phase 3: Agent System

- [ ] Supervisor agent framework
- [ ] Worker agent framework
- [ ] Agent coordination
- [ ] Knowledge base management

### Phase 4: CLI & Workflow

- [ ] `nightshift factory init`
- [ ] `nightshift product create`
- [ ] `nightshift product plan`
- [ ] `nightshift product work`
- [ ] `nightshift product merge`

### Phase 5: Testing & Validation

- [ ] End-to-end workflow tests
- [ ] Integration tests
- [ ] Documentation

## Git Hooks System

Nightshift provides automated git hooks to maintain code quality across all projects.

### Hook Types

| Hook       | Purpose           | Behavior                                 |
| ---------- | ----------------- | ---------------------------------------- |
| pre-commit | Auto-format code  | Non-blocking, fixes issues automatically |
| pre-push   | Strict validation | Blocking, fails push if issues found     |

### Hooks Manager

Located in `src/managers/hooks.ts`, the HooksManager provides:

- `installHook(hookName)` - Install a specific hook
- `uninstallHook(hookName)` - Remove a hook
- `listInstalledHooks()` - List currently installed hooks
- `isHookInstalled(hookName)` - Check if a hook is installed

### Hook Scripts

Located in `scripts/hooks/`:

- `pre-commit.js` - Auto-formats code based on project type
- `pre-push.js` - Strict linting validation

### Supported Project Types

- **Node.js/Bun**: prettier, eslint, tsc
- **Rust**: cargo fmt, cargo clippy
- **Python**: ruff, black, isort, mypy

### Agent Tools for Hook Management

Agents can use these tools to manage hooks:

- `nags_install` - Install git hooks and initialize default nags
- `nags_uninstall` - Remove installed git hooks
- `nags_status` - Check hook and nag configuration status
- `nags_list` - List all configured nags
- `nags_add_tool` - Add a tool-based nag (executes commands)
- `nags_add_agent` - Add an agent-based nag (AI evaluation)
- `nags_remove` - Remove a nag by ID
- `nags_run` - Execute nags for testing
- `nags_export` - Export nags configuration as JSON
- `nags_import` - Import nags configuration
- `nags_defaults` - Apply default nags for project type
