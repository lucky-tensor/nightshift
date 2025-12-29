# Dark Factory Templates

Templates define the behavior and instructions for Dark Factory's autonomous agents. Each template is a markdown file that configures how a specific agent persona approaches tasks.

## Installation

Templates should be installed in your global OpenCode plugin directory:

```bash
mkdir -p ~/.config/opencode/plugin/dark-factory/templates
cp templates/*.md ~/.config/opencode/plugin/dark-factory/templates/
```

## Available Templates

Dark Factory includes the following default templates:

### Core Agent Templates

- **engineer.md** - Autonomous software engineer for implementing features and fixing bugs
- **planner.md** - Strategic planner for breaking down products into projects
- **curator.md** - Knowledge manager for documenting decisions and maintaining context

### Supervisor Templates

- **pm-supervisor.md** - Project manager overseeing project progress
- **git-supervisor.md** - Git workflow manager for branch and merge operations
- **finance-supervisor.md** - Cost and budget tracking supervisor

## Template Variables

Templates use double-brace syntax for variable substitution. When an agent runs, these variables are replaced with actual values.

### Task Variables

Available in all task-based agents (engineer, tester, etc.):

- `{{task.title}}` - Short title of the task
- `{{task.description}}` - Detailed task description and acceptance criteria
- `{{project.name}}` - Name of the project this task belongs to
- `{{project.description}}` - Project's overall goal and context

### Product Variables

Available in product-level agents (planner, curator):

- `{{product.name}}` - Product name
- `{{product.description}}` - Product description and goals
- `{{prd.content}}` - Full Product Requirements Document content

## Template Structure

A well-structured template includes:

### 1. Persona Definition

Define who the agent is and their role:

```markdown
# Persona: Autonomous Engineer

You are an expert software engineer tasked with implementing features...
```

### 2. Objective

State the agent's primary goal clearly:

```markdown
## Your Objective
Implement the task described below with high quality, ensuring all tests pass...
```

### 3. Operating Principles

List core principles the agent should follow:

```markdown
## Operating Principles
1. **Autonomy**: You are responsible for the entire implementation lifecycle
2. **Safety**: Never run destructive commands without being sure
3. **Quality**: Write clean, maintainable code
```

### 4. Available Tools

Describe what the agent has access to:

```markdown
## Tools Available
You have access to:
- Read/write files
- Run build/test commands
- Search the codebase
```

### 5. Context Injection

Use template variables to provide specific context:

```markdown
## Task Context
Task Title: {{task.title}}
Task Description: {{task.description}}

## Project Context
Project Name: {{project.name}}
Project Description: {{project.description}}
```

### 6. Workflow Instructions

Provide step-by-step instructions:

```markdown
## Instructions
1. **Research**: Understand the existing code and requirements
2. **Plan**: Write down your implementation plan before starting
3. **Execute**: Make the necessary changes
4. **Verify**: Run tests and verify the changes meet criteria
5. **Finalize**: Summarize your work
```

## Customizing Templates

You can create custom templates for specialized agent behaviors.

### Creating a Custom Template

1. Copy an existing template as a starting point:
   ```bash
   cp ~/.config/opencode/plugin/dark-factory/templates/engineer.md \
      ~/.config/opencode/plugin/dark-factory/templates/my-agent.md
   ```

2. Modify the template to define your agent's behavior

3. Use the template by specifying the subagent name:
   ```
   /task run --projectId abc123 --subagent my-agent
   ```

### Example: Frontend Specialist

```markdown
# Persona: Frontend Specialist

You are an expert frontend engineer focused on React, TypeScript, and modern UI/UX.

## Your Objective
Build beautiful, accessible, and performant user interfaces.

## Operating Principles
1. **User Experience First**: Prioritize usability and accessibility
2. **Component Design**: Create reusable, composable components
3. **Performance**: Optimize bundle size and runtime performance
4. **Accessibility**: Follow WCAG 2.1 AA standards

## Task Context
Task Title: {{task.title}}
Task Description: {{task.description}}

## Instructions
1. Review existing component library and design system
2. Design component API and props interface
3. Implement component with TypeScript
4. Add comprehensive tests (unit + integration)
5. Verify accessibility with axe-core
6. Check bundle impact with webpack-bundle-analyzer
```

### Example: Database Migration Agent

```markdown
# Persona: Database Migration Specialist

You are an expert database engineer focused on safe schema migrations.

## Your Objective
Create and execute database migrations safely, with rollback plans.

## Operating Principles
1. **Safety First**: Always create reversible migrations
2. **Zero Downtime**: Design migrations that don't require downtime
3. **Data Integrity**: Verify data consistency before and after
4. **Documentation**: Document migration rationale and risks

## Task Context
Task Title: {{task.title}}
Task Description: {{task.description}}

## Instructions
1. Analyze current schema and proposed changes
2. Write forward migration (up)
3. Write rollback migration (down)
4. Create data validation queries
5. Test on copy of production data
6. Document migration steps and risks
```

## Best Practices

### 1. Be Specific

Provide clear, actionable instructions rather than vague guidance:

✅ Good: "Run `npm test` and ensure all tests pass. Fix any failing tests before proceeding."

❌ Bad: "Make sure tests work."

### 2. Set Constraints

Define boundaries and safety rails:

```markdown
## Safety Constraints
- NEVER run `rm -rf` or other destructive commands
- ALWAYS verify file paths before deletion
- NEVER commit secrets or API keys
```

### 3. Provide Examples

Show the agent what good output looks like:

```markdown
## Output Format
Provide a summary in this format:

**Changes Made:**
- Added user authentication endpoint at `/api/auth/login`
- Updated user model with `lastLoginAt` field

**Tests:**
- ✓ All 47 tests passing
- Added 3 new integration tests for auth flow

**Next Steps:**
- Ready for code review
- Consider adding rate limiting
```

### 4. Define Success Criteria

Be explicit about what "done" means:

```markdown
## Definition of Done
- [ ] All acceptance criteria met
- [ ] All tests passing (including new tests)
- [ ] No linting errors
- [ ] Code follows project style guide
- [ ] Changes verified manually
```

### 5. Encourage Communication

Prompt the agent to explain their thinking:

```markdown
## Instructions
1. **Analyze**: Read the requirements and explain your understanding
2. **Plan**: Write your implementation plan and share it
3. **Implement**: Make changes, explaining key decisions
4. **Verify**: Test your work and report results
5. **Summarize**: Provide a clear summary of what was accomplished
```

## Template Variable Reference

### Currently Supported

| Variable | Context | Description |
|----------|---------|-------------|
| `{{task.title}}` | Task agents | Short task name |
| `{{task.description}}` | Task agents | Full task description |
| `{{project.name}}` | All agents | Project name |
| `{{project.description}}` | All agents | Project description |
| `{{product.name}}` | Product agents | Product name |
| `{{product.description}}` | Product agents | Product description |
| `{{prd.content}}` | Product agents | Full PRD content |

### Template Expansion Roadmap

Future versions may support:

- `{{project.baseBranch}}` - Git base branch
- `{{project.workBranch}}` - Current work branch
- `{{project.worktreePath}}` - Path to worktree
- `{{task.dependencies}}` - List of dependency tasks
- `{{budget.remaining}}` - Remaining budget
- `{{context.files}}` - List of relevant files

## Troubleshooting

### Template Not Found

If you see "Template not found" errors:

1. Check template location:
   ```bash
   ls -la ~/.config/opencode/plugin/dark-factory/templates/
   ```

2. Verify file naming matches subagent name:
   ```
   engineer.md → --subagent engineer
   my-agent.md → --subagent my-agent
   ```

3. Ensure templates were copied correctly:
   ```bash
   cp templates/*.md ~/.config/opencode/plugin/dark-factory/templates/
   ```

### Variables Not Substituting

If variables appear as `{{task.title}}` instead of actual values:

1. Ensure you're using the correct variable names (case-sensitive)
2. Check that the variable is available in your agent context (task vs product)
3. Verify template syntax uses double braces: `{{var}}` not `{var}` or `$var`

## Contributing Templates

Have a useful custom template? Consider sharing it with the community:

1. Create a template following best practices above
2. Test it with several tasks to ensure reliability
3. Document the use case and any special requirements
4. Submit a PR to the Dark Factory repository

## Examples in the Wild

See the `templates/` directory for production-ready examples:

- `engineer.md` - General-purpose software engineer
- `planner.md` - Strategic product planner
- `curator.md` - Knowledge base manager
- `pm-supervisor.md` - Project oversight
- `git-supervisor.md` - Git workflow automation
- `finance-supervisor.md` - Budget tracking

Each template demonstrates different aspects of agent design and can serve as a starting point for your custom agents.
