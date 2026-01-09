# Product Vision

## Executive Summary

Dark Factory is a TypeScript-based orchestration tool for Antigravity IDE that enables autonomous, long-running AI agents to complete large software projects without human intervention. The system manages multiple concurrent agent workflows, handles resource constraints, and ensures code quality through automated branching, testing, and decision-making processes.

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

## User Personas

- **Solo Developer**: Automate large refactoring or feature development tasks to avoid context switching.
- **Engineering Team Lead**: Parallelize exploration of technical approaches.
