# Source Code Quick Start

## Overview

This directory contains the core source code for the Nightshift CLI application.

## Directory Structure

- **`cli/` & `cli.tsx`**: The Ink-based Terminal User Interface.
- **`managers/`**: Business logic controllers (Git, Product, Task management).
- **`runtime/`**: The Agent execution engine (Planner, Worker, etc.).
- **`storage/`**: Persistence layer (YAML/SQLite).
- **`types/`**: Shared TypeScript definitions.
- **`utils/`**: Helper functions.

## Key Entry Points

- **Application Boot**: `src/cli.tsx`
- **Agent Logic**: `src/runtime/agent.ts`

## Navigation

- [Return to Root](../START_HERE.md)
- [Technical Architecture](../docs/technical/1-technical-challenges.md)
