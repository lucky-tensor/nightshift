# Product Features

## Feature Matrix by Mode

### Mode 1: Methodology (Passive)

These features are available simply by adopting the file structure and templates.

- **Knowledge Base Structure**: `docs/` hierarchy (Vision, Features, Tech, Dev) for context grounding.
- **Agent Personas**: Markdown templates defining specific roles (Planner, Coder, Curator).
- **Nags**: Single-task binary gateways (OK/NOK) enforced by git hooks.
- **Git-Brain Protocol**: Commit message standards for reasoning preservation.

### Mode 2: Service (Active)

These features require running the Nightshift orchestration engine.

## Core Capabilities (Service Mode)

### 1. Autonomous Agent Orchestration

- **Long-Running Sessions**: Support for up to 12-hour continuous agent operation.
- **State Persistence**: Agents maintain context across interruptions and crashes.
- **Sandbox Execution**: Agents run in isolated environments to prevent system damage.

### 2. Factory Management (Multi-Product)

- **Concurrent Development**: Develop multiple software products simultaneously.
- **TUI Dashboard**: Real-time monitoring of factory status, active projects, and budget via a terminal interface.
- **Project Isolation**: Uses `git worktree` to isolate agent workspaces from the main repository.

### 3. Financial & Resource Management

- **Cost Tracking**: Real-time tracking of token usage and API costs per project.
- **Provider Switching**: Automatically switch LLM providers (e.g., OpenAI -> Anthropic) on rate limits or outages.
- **Budget Guardrails**: Enforce strict spending limits.

### 4. Decision Branching & Exploration

- **Parallel Exploration**: Detect low-confidence decisions and fork the process into parallel branches to explore different solutions.
- **Comparison Reports**: Generate reports comparing the outcomes of different approaches.

### 5. Quality Assurance Gates

- **Automated Testing**: Run project-specific tests before marking tasks as complete.
- **Linting & Formatting**: Enforce code style standards automatically.
- **Human Review Integration**: Support for human checkpoints before critical merges.

## Functional Requirements

- **FR-1 Project Initialization**: Create projects from high-level descriptions, utilizing persona templates.
- **FR-2 Agent Orchestration**: Execute personas in isolated environments with comprehensive logging.
- **FR-3 Finance Management**: Monitor credits, detect overages, and handle provider failover.
- **FR-4 Project Management**: Maintain accurate task lists and generate progress reports.
- **FR-5 Decision Branching**: Support up to 2 parallel branches per decision point.
- **FR-6 Git Integration**: Semantic branching and worktree isolation.
