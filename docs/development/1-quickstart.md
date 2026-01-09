# Quickstart Guide

## Prerequisites

- **Bun**: The project uses the Bun runtime.
- **Git**: Required for version control operations.

## Installation

1.  **Install Dependencies**

    ```bash
    bun install
    ```

2.  **Environment Setup**
    Ensure you have your LLM provider API keys configured (details tbd in `.env`).

## Running the Factory

### Launch the TUI

The primary interface is the Terminal User Interface (TUI).

```bash
bun run start
```

### Controls

- **Enter**: Initialize the factory (first run).
- **n**: Create a new software product.
- **q**: Quit the application.

## Project Structure

When a product is created, it resides in:

```
/output/directory/{product-name}/
├── {product-name}-main/        # Main Repo
└── worktree-{task-id}/         # Agent Workspace
```

## Troubleshooting

See `TROUBLESHOOTING.md` in the root for common issues.
