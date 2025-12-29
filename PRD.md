# Product Requirements Document: Dark Factory

## Executive Summary

Dark Factory is a TypeScript-based orchestration tool for Antigravity IDE that enables autonomous, long-running AI agents to complete large software projects without human intervention. The system manages multiple concurrent agent workflows, handles resource constraints, and ensures code quality through automated branching, testing, and decision-making processes.

## Problem Statement

Current AI coding assistants require constant human supervision and cannot:
- Work autonomously for extended periods (hours/days)
- Handle resource constraints (API rate limits, token budgets)
- Make and explore multiple solution paths simultaneously
- Maintain code quality standards without human review
- Recover from failures or resource exhaustion automatically

## Goals

### Primary Goals
1. Enable AI agents to work autonomously on large projects for up to 12 hours
2. Automatically manage API costs and switch between inference providers
3. Maintain code quality through automated testing and linting
4. Explore multiple solution paths when facing uncertain decisions
5. Provide transparent project tracking and task management

### Secondary Goals
1. Minimize human intervention while maintaining safety guardrails
2. Optimize for cost-efficiency across multiple LLM providers
3. Enable easy debugging and audit trails of agent decisions
4. Support collaborative multi-agent workflows

## Non-Goals

1. Pushing code directly to remote repositories (security constraint)
2. Running agents indefinitely (12-hour maximum per session)
3. Supporting more than 2 parallel decision branches per decision point
4. Real-time human-in-the-loop interactions during agent execution
5. Cross-repository or multi-repository orchestration (single repo focus)

## User Personas

### Primary: Solo Developer
- **Need**: Automate large refactoring or feature development tasks
- **Pain Point**: Context switching between multiple tasks
- **Success Metric**: Complete features while sleeping/working on other projects

### Secondary: Engineering Team Lead
- **Need**: Parallelize exploration of technical approaches
- **Pain Point**: Limited engineering bandwidth for prototyping
- **Success Metric**: Compare multiple implementation strategies automatically

## User Stories

### Core Workflows

**US-1: Start Autonomous Project**
```
As a developer
I want to start a Dark Factory project with a high-level task description
So that an agent can work autonomously toward completion
```

**US-2: Automatic Cost Management**
```
As a developer with limited API credits
I want Dark Factory to automatically switch between LLM providers
So that work continues without manual intervention when credits run low
```

**US-3: Decision Point Exploration**
```
As a developer facing architectural uncertainty
I want Dark Factory to automatically explore multiple approaches in parallel
So that I can compare working implementations of each option
```

**US-4: Quality Assurance**
```
As a developer
I want all agent work to pass tests, linting, and formatting checks
So that I receive production-ready code
```

**US-5: Progress Tracking**
```
As a developer
I want to see real-time task completion status
So that I can monitor progress without interrupting the agent
```

**US-6: Automatic Recovery**
```
As a developer
I want Dark Factory to handle API outages gracefully
So that work resumes automatically when services recover
```

## Functional Requirements

### FR-1: Project Initialization
- **FR-1.1**: Create new Dark Factory project from task description
- **FR-1.2**: Select one or more persona templates (engineer, tester, etc.)
- **FR-1.3**: Initialize git worktree with semantic branch name
- **FR-1.4**: Generate initial task list from project description

### FR-2: Agent Orchestration
- **FR-2.1**: Execute agent personas in isolated environments
- **FR-2.2**: Enforce 12-hour maximum runtime per agent session
- **FR-2.3**: Maintain agent state across interruptions
- **FR-2.4**: Log all agent actions and decisions

### FR-3: Finance Management
- **FR-3.1**: Monitor API credit availability via noop probes
- **FR-3.2**: Detect overage/rate-limit errors
- **FR-3.3**: Switch to alternative LLM providers automatically
- **FR-3.4**: Enter polling mode when no providers available
- **FR-3.5**: Resume work when provider becomes available
- **FR-3.6**: Track and report cost per project

### FR-4: Project Management
- **FR-4.1**: Maintain task list with completion checkboxes
- **FR-4.2**: Periodically audit task list for accuracy
- **FR-4.3**: Prompt agents to update task status
- **FR-4.4**: Detect false positives/negatives in completion status
- **FR-4.5**: Generate progress reports

### FR-5: Decision Branching
- **FR-5.1**: Detect low-confidence decision points
- **FR-5.2**: Create up to 2 parallel branches per decision
- **FR-5.3**: Execute each branch in separate worktree
- **FR-5.4**: Track branch lineage and relationships
- **FR-5.5**: Generate comparison reports between branches

### FR-6: Git Integration
- **FR-6.1**: Create semantic branch names showing work lineage
- **FR-6.2**: Use git worktrees for isolation
- **FR-6.3**: Commit work at logical checkpoints
- **FR-6.4**: Prevent pushing to remote repositories
- **FR-6.5**: Support branch merging after human review

### FR-7: Quality Gates
- **FR-7.1**: Define acceptance criteria per persona
- **FR-7.2**: Run tests before marking work complete
- **FR-7.3**: Run linters and formatters
- **FR-7.4**: Block completion until criteria met
- **FR-7.5**: Report quality metrics

### FR-8: Persona System
- **FR-8.1**: Store personas as markdown templates
- **FR-8.2**: Support multiple personas per project
- **FR-8.3**: Define persona-specific acceptance criteria
- **FR-8.4**: Enable persona composition and inheritance

## Non-Functional Requirements

### NFR-1: Reliability
- System must recover from API failures within 5 minutes
- Must preserve work state across crashes
- Must handle network interruptions gracefully

### NFR-2: Performance
- Project initialization: < 30 seconds
- Provider switching: < 2 minutes
- Task list updates: < 10 seconds

### NFR-3: Cost Efficiency
- Minimize redundant API calls
- Use cheapest available provider that meets quality requirements
- Batch operations where possible

### NFR-4: Observability
- Log all agent interactions
- Provide real-time status dashboard
- Generate audit trails for debugging
- Track token usage per project

### NFR-5: Safety
- Never push to remote without explicit human approval
- Sandbox all code execution
- Validate all git operations
- Prevent infinite loops (12-hour hard limit)

### NFR-6: Usability
- CLI interface for all operations
- Clear error messages
- Simple project setup (< 5 commands)
- Intuitive task list format

## Technical Constraints

1. **TypeScript-based**: Core system must be TypeScript
2. **Antigravity IDE Integration**: Must work within Antigravity environment
3. **Git Worktrees**: Required for isolation
4. **No Remote Push**: Security constraint
5. **12-Hour Limit**: Hard timeout per agent session
6. **2-Branch Limit**: Maximum parallel branches per decision

## Success Metrics

### Primary Metrics
1. **Autonomous Completion Rate**: % of projects completed without human intervention
2. **Cost Efficiency**: Average cost per completed task vs. manual development
3. **Quality Score**: % of completed work passing all quality gates
4. **Uptime**: % of time agents are actively working vs. blocked

### Secondary Metrics
1. **Provider Switch Success Rate**: % of successful failovers
2. **Decision Branch Utility**: % of branches that provide valuable insights
3. **Task List Accuracy**: % of tasks correctly marked complete/incomplete
4. **Time to Recovery**: Average time to resume after failures

## Future Considerations

### Phase 2 Enhancements
- Support for > 2 decision branches
- Multi-repository orchestration
- Human-in-the-loop checkpoints
- Agent collaboration protocols
- Custom persona creation UI

### Phase 3 Enhancements
- Cloud-hosted orchestration
- Team collaboration features
- Advanced cost optimization (model routing)
- Integration with CI/CD pipelines
- Automated code review agents

## Open Questions

1. How do we determine "low confidence" thresholds for decision branching?
2. What's the optimal frequency for project manager check-ins?
3. Should we support custom LLM provider plugins?
4. How do we handle merge conflicts between decision branches?
5. What metrics determine when to switch providers vs. wait?

## Appendix

### Glossary
- **Worktree**: Git feature for multiple working directories from one repository
- **Persona**: Template defining agent behavior and acceptance criteria
- **Finance Persona**: Special persona managing API costs and provider switching
- **Project Manager Persona**: Special persona managing task lists and progress
- **Decision Branch**: Parallel workflow exploring one solution approach

### References
- Antigravity IDE Documentation
- Git Worktree Documentation
- LLM Provider APIs (OpenAI, Anthropic, etc.)
