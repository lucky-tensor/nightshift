# START HERE: Dark Factory Knowledge Base

## Welcome

This is the entry point for the Dark Factory codebase. All agents and developers should start here to understand the project structure, goals, and current state.

## Canonical Documentation Index

### 1. Product Vision (The Why)

- [Vision & Goals](./docs/product_vision/1-vision.md): High-level purpose of the Dark Factory.

### 2. Product Features (The What)

- [Feature Specifications](./docs/product_features/1-features.md): Functional requirements and capabilities.
- [Nags (Quality Enforcement)](./docs/product_features/2-nags.md): System for overcoming agent amnesia and enforcing quality gates.

### 3. Technical (The How)

- [Technical Challenges & Architecture](./docs/technical/1-technical-challenges.md): System architecture, constraints, and core technical decisions.
- [Git-Brain Workflow](./docs/technical/2-git-brain.md): Specification for the "Reasoning Ledger" and commit metadata system.

### 4. Development (The Process)

- [Quickstart](./docs/development/1-quickstart.md): How to build, run, and install the project.
- [Coding Guidelines](./docs/development/2-coding-guidelines.md): Style guides, patterns, and linting rules.
- [Testing Strategy](./docs/development/3-testing.md): How to run and write tests.
- [Implementation Strategy](./docs/development/4-implementation-strategy.md): Current development plan and roadmap.

### 5. Tasks (The Work)

- [Todo](./docs/tasks/1-todo.md): Active and pending tasks.
- [Done](./docs/tasks/2-done.md): Completed work history.
- [Wontfix](./docs/tasks/3-wontfix.md): Discarded ideas.

## Key Directories & Module Guides

- [`src/`](./src/QUICK_START.md): Source code root.
- [`scripts/`](./scripts/QUICK_START.md): Utility and maintenance scripts.
- [`prototypes/`](./prototypes/QUICK_START.md): Experimental code and proofs of concept.
- [`docs/`](./docs/README.md): Archive of legacy documentation and deep-dive research specs.

## Navigation Protocol

- Always update the relevant document in the `canonical` folders when making changes.
- Follow the "Cascade Update" protocol: Vision -> Features -> Tech -> Code.
