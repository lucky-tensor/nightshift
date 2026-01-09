# Dark Factory Feature Reference

This document provides a comprehensive reference for the core features of the Dark Factory system.

## Table of Contents

1. [Git-Brain Workflow](#git-brain-workflow)
2. [Code Indexing System](#code-indexing-system)
3. [Multi-Agent Architecture](#multi-agent-architecture)
4. [Blackboard Architecture](#blackboard-architecture)
5. [Quick Start Guide](#quick-start-guide)

---

## Git-Brain Workflow

The Git-Brain system treats git commits as the "brain" of the factory, encoding intent and reconstruction hints to enable high-fidelity replay.

### Key Classes

```typescript
import { GitManager } from "./managers/git";

interface CommitMetadata {
    prompt: string; // Minimal instructions to reproduce
    expectedOutcome: string; // Functional verification criteria
    contextSummary: string; // Architectural context
    agentId?: string;
    sessionId?: string;
}
```

### Usage

```typescript
const git = new GitManager("/path/to/repo");

// Create enhanced commit
await git.commitWithMetadata(worktreePath, "Add feature", {
    prompt: "Update validate() to check age >= 18",
    expectedOutcome: "Underage users rejected",
    contextSummary: "Adding age validation to auth flow",
});

// Extract metadata from commit
const metadata = git.extractCommitMetadata(worktreePath, commitHash);

// Get all enhanced commits
const history = git.getEnhancedCommitHistory(worktreePath, 10);
```

### Commands

```bash
# Run prototype
bun run prototype:diff-brain
```

---

## Code Indexing System

The Code Index system creates semantic embeddings and keyword indices for fast code navigation.

### Key Classes

```typescript
import { CodeIndexManager } from "./managers/code-index";

interface CodeEmbedding {
    filePath: string;
    contentHash: string;
    embedding: number[];
    type: "function" | "class" | "interface" | "comment";
}
```

### Usage

```typescript
const indexer = new CodeIndexManager("/project/path");

// Index all code
await indexer.indexProject();

// Search by keyword (high precision)
const kwResults = indexer.searchByKeyword("token", 5);

// Search by semantic similarity (high recall)
const semResults = await indexer.searchByEmbedding("authentication", 5);

// Hybrid search (combines both)
const results = await indexer.search("user login validation", {
    keywordWeight: 0.4,
    semanticWeight: 0.6,
    limit: 5,
});

// Get statistics
const stats = indexer.getIndexStats();
// { totalEmbeddings, totalKeywords, filesIndexed }
```

### Commands

```bash
# Run prototype
bun run prototype:code-index
```

---

## Multi-Agent Architecture

The Multi-Agent system orchestrates specialized agents (Planner, Coder, Tester, Curator) with structured handoffs and shared context.

### Key Classes

```typescript
import { MultiAgentManager } from "./managers/multi-agent";

interface AgentContext {
    id: string;
    type: "planner" | "coder" | "curator" | "tester" | "reviewer";
    state: "idle" | "active" | "completed" | "failed";
    currentTask?: string;
}

interface SharedContext {
    projectId: string;
    sessionId: string;
    codeIndex: CodeIndex;
    recentCommits: EnhancedCommitMessage[];
}
```

### Usage

```typescript
const multiAgent = new MultiAgentManager("project-id", "/path", git);

// Create specialized agent
const coder = multiAgent.createAgent("coder-1", "coder");

// Assign task
multiAgent.assignTask("coder-1", "Implement login feature");

// Complete and handoff to next agent
multiAgent.completeTask("coder-1", "Implementation complete", "tester");

// Search shared context
const results = await multiAgent.searchSharedContext("authentication");

// Get system state
const state = multiAgent.getSystemState();
```

### Agent Roles

| Role         | Responsibility                      |
| ------------ | ----------------------------------- |
| **Planner**  | Creates task breakdowns and plans   |
| **Coder**    | Implements features based on plans  |
| **Tester**   | Validates implementation with tests |
| **Curator**  | Documents and organizes knowledge   |
| **Reviewer** | Ensures quality and compliance      |

### Commands

```bash
# Run prototype
bun run prototype:multi-agent
```

---

## Blackboard Architecture

The Blackboard system provides asynchronous shared memory for agent collaboration without linear handoffs.

### Key Classes

```typescript
import { Blackboard } from "./managers/blackboard";

type EntryType = "goal" | "finding" | "blocker" | "solution";
type EntryStatus = "open" | "in_progress" | "resolved";
```

### Usage

```typescript
const blackboard = new Blackboard();

// Register agents with interests
blackboard.registerAgent({
    agentId: "agent-1",
    role: "Coder",
    interests: ["goal", "blocker", "finding"],
});

// Post goals
blackboard.post({
    entryType: "goal",
    author: "agent-planner",
    title: "Implement Auth",
    content: "Create login/logout functionality",
    tags: ["auth"],
    status: "open",
    priority: "high",
});

// Update entry status
blackboard.update(entryId, "in_progress");

// Query entries
const goals = blackboard.getByType("goal");
const openItems = blackboard.getByStatus("open");
```

### Commands

```bash
# Run prototype
bun run prototype:blackboard
```

---

## Quick Start Guide

### Running All Prototypes

```bash
# Run individual features
bun run prototype:diff-brain    # Git-Brain workflow
bun run prototype:code-index     # Semantic code search
bun run prototype:multi-agent    # Agent collaboration
bun run prototype:blackboard     # Async shared memory

# Run comprehensive demo
bun run prototype:demo

# Run all at once
bun run prototype:all
```

### Integration with Main App

```typescript
import { GitManager, CodeIndexManager, MultiAgentManager } from "./managers";

// Create factory system
const git = new GitManager(mainRepoPath);
const codeIndex = new CodeIndexManager(projectPath);
const multiAgent = new MultiAgentManager(projectId, projectPath, git);

// Use together
await git.commitWithMetadata(path, title, metadata);
await codeIndex.indexProject();
const results = await codeIndex.search("query");
multiAgent.assignTask("coder", "task");
```

---

## File Structure

```
src/
├── managers/
│   ├── index.ts           # Unified exports
│   ├── git.ts             # Git-Brain system
│   ├── code-index.ts      # Semantic indexing
│   ├── multi-agent.ts     # Agent orchestration
│   └── ...
├── types/
│   └── index.ts           # Type definitions
└── plugin/
    └── index.ts           # Main plugin entry

prototypes/
├── README.md              # This document
├── demo.ts                # Comprehensive demo
├── diff-brain/
│   └── prototype.ts       # Git-Brain demo
├── code-index/
│   └── prototype.ts       # Code search demo
├── multi-agent/
│   └── prototype.ts       # Agent demo
└── blackboard/
    └── prototype.ts       # Blackboard demo
```

---

## Next Steps

1. **Run the demos**: `bun run prototype:demo`
2. **Explore the code**: Read the prototype implementations
3. **Integrate**: Use the managers in your main application
4. **Extend**: Add new agent types or search strategies

---

_Dark Factory - Autonomous AI Software Factory_
