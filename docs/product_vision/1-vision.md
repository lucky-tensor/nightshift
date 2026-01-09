# Product Vision

## Executive Summary

Nightshift is a TypeScript-based orchestration tool for Antigravity IDE that enables autonomous, long-running AI agents to complete large software projects without human intervention. The system manages multiple concurrent agent workflows, handles resource constraints, and ensures code quality through automated branching, testing, and decision-making processes.

## Problem Statement

Current AI coding assistants require constant human supervision and cannot:

- Work autonomously for extended periods (hours/days)
- Handle resource constraints (API rate limits, token budgets)
- Make and explore multiple solution paths simultaneously
- Maintain code quality standards without human review
- Recover from failures or resource exhaustion automatically

## Core Goals

1.  **Autonomous Operation**: Enable AI agents to work on large projects for up to 12 hours.
2.  **Resource Management**: Automatically manage API costs and switch between inference providers.
3.  **Quality Assurance**: Maintain code quality through automated testing and linting.
4.  **Exploration**: Explore multiple solution paths when facing uncertain decisions.
5.  **Transparency**: Provide clear project tracking and task management.

## The Long-Term Vision

We are moving toward a future where agents execute long-running engineering jobs with near-autonomy. While current model capabilities are limited, they are rapidly improving.

**The Shift**: As AI takes on more of the implementation work, the primary audience for code and documentation shifts from humans to machines. This necessitates a fundamental change in how we write, manage, and document software.

- **Code**: Must be hyper-explicit, prioritizing machine-readability and context over human-centric brevity.
- **Management**: Shifts from task assignment to constraint definition and outcome verification.
- **Documentation**: Becomes the "prompt" that drives the factory.

Nightshift provides the **Methods** (Mode 1) and the **Tools** (Mode 2) to bridge this gap, preparing repositories for the age of autonomous engineering.

## Deployment Modes

Nightshift is designed to be adopted in two stages, allowing users to start with low risk and scale to full autonomy.

### Mode 1: The Methodology (Low Risk)

In this mode, Nightshift is a **passive set of standards**.

- **Installation**: Users simply install markdown templates (Agents, Nags, Knowledge Base) into their repository.
- **Vendor Agnostic**: Templates are adapted to specific vendor structures (e.g., placing agent prompts in `.claude/agents/` or `.cursor/rules/`).
- **Function**: It structures the _context_ provided to existing AI tools, improving their recall and quality without requiring a new runtime.

### Mode 2: The Service (Advanced)

In this mode, Nightshift is an **active orchestration runtime**.

- **Installation**: Users run the `nightshift` CLI or web service.
- **Function**: The service actively "prods" agents, managing their lifecycles.
    - **Orchestration**: Assigns work to specialized agents based on expertise.
    - **Finance Strategy**: Maximizes rate limits by switching vendors/plans (e.g., using cheap models for drafts, expensive models for review).
    - **Continuous Operation**: Keeps working while the user sleeps.

## User Personas

- **Solo Developer**: Automate large refactoring or feature development tasks to avoid context switching.
- **Engineering Team Lead**: Parallelize exploration of technical approaches.
