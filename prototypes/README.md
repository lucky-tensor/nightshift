# Dark Factory Prototypes

This directory contains standalone, runnable prototypes for the core features of the Dark Factory system.

## 📂 Prototype Structure

Each prototype is designed to be:

- **TypeScript-native**: Written in TypeScript, integrated with the main codebase
- **Self-contained**: Runs independently with Bun
- **Demonstrable**: Shows clear before/after states
- **Testable**: Includes fidelity/accuracy verification

All prototypes use **Bun** to run TypeScript directly.

---

### 1. `diff-brain/`

**Purpose**: Demonstrates the "Diff-Centric Git Brain" - encoding commit messages with minimal intent and diff reconstruction hints to enable high-fidelity replay.

**Key Files**:

- `prototype.ts` - Main implementation and demo

**Run**: `bun run prototypes/diff-brain/prototype.ts`

**Key Features**:

- Creates git worktrees with embedded metadata
- Extracts intent and reconstruction hints from commits
- Simulates replay with fidelity verification (100% in demo)

---

### 2. `code-index/`

**Purpose**: Demonstrates the semantic code indexing system with embeddings and keyword extraction for fast agent navigation.

**Key Files**:

- `prototype.ts` - Index manager and search demo

**Run**: `bun run prototypes/code-index/prototype.ts`

**Key Features**:

- Indexes code elements (classes, functions)
- Supports keyword search (high precision) and semantic search (high recall)
- Hybrid search with Reciprocal Rank Fusion (RRF)

---

### 3. `multi-agent/`

**Purpose**: Demonstrates the multi-agent architecture with specialized roles (Planner, Coder, Tester, Curator) and structured handoff protocols.

**Key Files**:

- `prototype.ts` - Agent system demo

**Run**: `bun run prototypes/multi-agent/prototype.ts`

**Key Features**:

- Specialized agents with distinct responsibilities
- Structured handoffs with context transfer
- Agent state tracking and message passing

---

### 4. `blackboard/`

**Purpose**: Demonstrates the asynchronous shared memory "Blackboard" architecture for agent collaboration without linear handoffs.

**Key Files**:

- `prototype.ts` - Blackboard system demo

**Run**: `bun run prototypes/blackboard/prototype.ts`

**Key Features**:

- Agents post goals, findings, and blockers
- Other agents react asynchronously to postings
- No central coordinator - emergent workflow

---

### 5. `demo/`

**Purpose**: Comprehensive demo showing all features working together in an integrated workflow.

**Key Files**:

- `demo.ts` - Main demo script

**Run**: `bun run prototypes/demo.ts`

**Features Demonstrated**:

1. Git-Brain commit with metadata
2. Code indexing and search
3. Multi-agent collaboration with handoffs
4. System state monitoring

---

## 🚀 Quick Start

All prototypes are written in TypeScript and run with Bun:

```bash
# Run individual prototypes
bun run prototypes/diff-brain/prototype.ts
bun run prototypes/code-index/prototype.ts
bun run prototypes/multi-agent/prototype.ts
bun run prototypes/blackboard/prototype.ts

# Run comprehensive demo (all features working together)
bun run prototypes/demo.ts

# Run all prototypes
bun run prototype:all
```

Or via package.json:

```bash
npm run prototype:diff-brain
npm run prototype:code-index
npm run prototype:multi-agent
npm run prototype:blackboard
npm run prototype:demo     # Comprehensive demo
npm run prototype:all
```

---

## 📊 Prototype Results Summary

| Prototype   | Status     | Key Metric                         |
| ----------- | ---------- | ---------------------------------- |
| Diff-Brain  | ✅ Working | 100% Fidelity                      |
| Code Index  | ✅ Working | Hybrid search (keyword + semantic) |
| Multi-Agent | ✅ Working | Structured handoffs                |
| Blackboard  | ✅ Working | Async collaboration                |
| Demo        | ✅ Working | All features integrated            |

---
