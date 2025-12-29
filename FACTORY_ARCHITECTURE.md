# Dark Factory MVP Architecture

## Hierarchy

```
Factory (singleton instance)
└── Products (multiple software products)
    ├── Product Repo (own git repo + remote)
    ├── PRD.md (Product Requirements Document)
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
3. PRD.md created from description
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
~/.dark-factory/
├── factory.yaml           # Factory state
├── products/
│   └── {product-id}.yaml  # Product metadata
├── plans/
│   └── {product-id}.yaml  # Plan with projects
└── projects/             # Existing project storage
    └── {project-id}.yaml

/path/to/product-repo/
├── .git/
├── README.md
├── PRD.md
├── PLAN.md
├── docs/
│   ├── research/
│   ├── handbooks/
│   └── decisions/
└── src/

~/.dark-factory/worktrees/
└── {project-id}/         # Isolated worktree for each project
    ├── src/
    └── docs/             # Project-specific docs
```

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
- [ ] PRD.md generation
- [ ] PLAN.md generation

### Phase 3: Agent System
- [ ] Supervisor agent framework
- [ ] Worker agent framework
- [ ] Agent coordination
- [ ] Knowledge base management

### Phase 4: CLI & Workflow
- [ ] `df factory init`
- [ ] `df product create`
- [ ] `df product plan`
- [ ] `df product work`
- [ ] `df product merge`

### Phase 5: Testing & Validation
- [ ] End-to-end workflow tests
- [ ] Integration tests
- [ ] Documentation
