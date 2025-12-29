# Dark Factory Plugin for OpenCode

Autonomous AI Agent Orchestration for Antigravity IDE (OpenCode).

Dark Factory is a plugin for **OpenCode** that enables autonomous, long-running AI agents to complete large software projects. It provides a "Factory" environment where multiple projects and tasks can be orchestrated by specialized sub-agents (Engineer, Tester, PM).

## Features

- 🤖 **Autonomous Agents** - Run complex tasks without constant supervision
- 💰 **Finance Management** - Track costs and manage token budgets
- 📦 **Project Isolation** - Uses git worktrees to keep agent work separate from your main branch
- 🏭 **Factory Management** - Orchestrate multiple concurrent projects

## Installation

This is an **OpenCode Plugin**. It must be installed into your OpenCode environment.

### 1. Build the Plugin

```bash
bun install
bun run build
```

This generates a `dist/index.js` file.

### 2. Install into OpenCode

You can install the plugin globally or per-project.

**Global Installation:**
Link the built plugin to your global OpenCode config:

```bash
mkdir -p ~/.config/opencode/plugin
ln -s $(pwd)/dist/index.js ~/.config/opencode/plugin/dark-factory.js
```

**Project Installation:**
Copy or link the plugin to your project's `.opencode/plugin` directory:

```bash
mkdir -p .opencode/plugin
cp dist/index.js .opencode/plugin/dark-factory.js
```

### 3. Install Commands (Optional)

To enable slash commands like `/factory`, `/project`, and `/task`, copy the command definitions to your configuration.

**Global:**

```bash
mkdir -p ~/.config/opencode/command
cp commands/*.md ~/.config/opencode/command/
```

**Project:**

```bash
mkdir -p .opencode/command
cp commands/*.md .opencode/command/
```

### 4. Install Templates

Dark Factory uses subagent templates to configure AI behavior. Copy the template files to your global OpenCode config:

```bash
mkdir -p ~/.config/opencode/plugin/dark-factory/templates
cp templates/*.md ~/.config/opencode/plugin/dark-factory/templates/
```

Templates define how different agent personas (engineer, tester, PM, etc.) approach tasks. See [TEMPLATES.md](./TEMPLATES.md) for customization options.

## Usage

Once installed, Dark Factory exposes several tools to OpenCode. You can invoke them via the OpenCode chat interface.

### Initialize the Factory

Ask OpenCode:

> "Initialize the Dark Factory with a budget of $50"

Or use the slash command:

```
/factory init --budgetLimit 50
```

### Create a Project

Ask OpenCode:

> "Create a new project called 'auth-service' to implement JWT authentication"

Or use the slash command:

```
/project create auth-service "Implement JWT authentication"
```

**What happens:** Dark Factory creates an isolated git worktree for this project, keeping agent work separate from your main branch.

### Run a Task

Ask OpenCode:

> "Add a task to 'auth-service' to setup the project structure, then run it"

Or use the slash command:

```
/task run --projectId [id]
```

**What happens:** Dark Factory spawns a new OpenCode session that you can monitor through the standard OpenCode session UI. The agent works autonomously in the isolated worktree.

## How It Works

### Git Worktree Isolation

Each project runs in its own git worktree, which creates a separate working directory linked to a new branch. This keeps agent work isolated from your main branch.

- **Automatic setup**: When you create a project, Dark Factory automatically creates a worktree as a sibling to your project directory (e.g., if your project is at `my_project/`, worktrees appear alongside it as `worktree_df_task_<id>/`)
- **Branch naming**: Projects use the branch pattern `df/task/{project-id}`
- **Safe experimentation**: Agents can make changes without affecting your current work

**Example Directory Structure:**
```
parent_directory/
  my_project/              # Your main project
  worktree_df_task_abc123/ # Dark Factory worktree 1
  worktree_df_task_def456/ # Dark Factory worktree 2
```

### Merging Work Back

**Dark Factory requires human review before merging.** When a task completes:

1. Review the agent's work in the project's worktree or branch
2. Test the changes as needed
3. Manually merge the branch when satisfied:
   ```bash
   git merge df/task/{project-id}
   ```
4. Delete the project to clean up the worktree:
   ```
   /project delete {project-id}
   ```

### Session Monitoring

When agents run tasks, they create standard OpenCode sessions that appear in your OpenCode UI. You can:

- Monitor agent progress in real-time
- See tool calls and output as they happen
- View the full conversation history
- Interrupt or stop sessions if needed

Sessions are created with titles like `Dark Factory: {project-name} - {task-title}` for easy identification.

## Development

```bash
# Install dependencies
bun install

# Run tests
bun test

# Lint
bun run lint
```

## License

MIT
