# Agent Configuration Instructions

This document guides you (or your agent) on how to install the Dark Factory methodology into your specific AI coding environment.

## 1. Source Templates

All standard Dark Factory templates are located in the `templates/` directory of this repository:

- **`templates/agents/`**: Persona definitions (Engineer, Planner, Curator).
- **`templates/nags/`**: Quality assurance checklists (The "Gateway of Last Resort").
- **`templates/commands/`**: Protocols for Git-Brain commits and branching.

## 2. Installation by Tool

Identify your AI assistant below and copy the templates to the appropriate configuration location.

### Claude Code (Anthropic)

- **Target Directory**: `.claude/`
- **Action**: Copy the files from `templates/agents/` into `.claude/`.
- **Context**: Ensure the `START_HERE.md` file is pinned or added to the project context.

### Cursor

- **Target Directory**: `.cursor/rules/`
- **Action**: Create `.mdc` files for each major persona.
    - Example: Copy `templates/agents/engineer.md` to `.cursor/rules/engineer.mdc`.
    - Add the glob pattern `**/*` to ensure it applies broadly, or restrict as needed.

### Windsurf / Codeium

- **Target Directory**: `.windsurf/` (or project root rules)
- **Action**: Define the personas in your workspace configuration or "Memories" to reference the `templates/` folder.

### GitHub Copilot / Codex / Gemini / Other

If your tool does not have a strict "project config" directory structure:

- **Target Directory**: `.agent/`
- **Action**: Create a `.agent/` directory in the root of your project.
- **Setup**:
    ```bash
    mkdir -p .agent
    cp -r templates/* .agent/
    ```
- **Usage**: At the start of a session, prompt your agent:
    > "I am using the Dark Factory methodology. Please read the context in `.agent/` and `START_HERE.md` before we begin."

## 3. Verification

To verify the installation, ask your agent:

> "What is the protocol for a Git-Brain commit?"

It should reference the instructions in `templates/commands/git-brain-commit.md` (or your tool's equivalent location).
