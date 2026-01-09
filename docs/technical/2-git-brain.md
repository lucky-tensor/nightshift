# Git-Brain: The Reasoning Ledger

## 1. Motivation

In traditional software development, the "why" behind a code change is often lost. Git commit messages provide a summary of _what_ changed, but rarely capture the full reasoning, the alternative approaches considered, or the specific prompt that led to the solution.

For autonomous agents, this context loss is critical. An agent entering an existing project needs to understand not just the current state of the code, but the _trajectory_ of decisions that led there.

**Git-Brain** transforms the version control system from a simple state tracker into a **Reasoning Ledger**. By embedding structured metadata into every commit, we create a searchable, replayable history of the agent's thought process.

### Goals

- **Context Preservation**: Enable agents to "remember" why a decision was made months ago.
- **Replayability**: Allow an agent to reconstruct a coding session by re-executing the stored prompts.
- **Auditability**: Provide a transparent log of autonomous decision-making.
- **Knowledge Transfer**: specific "Diff Reconstruction Hints" help new agents understand the architectural constraints without reading every line of code.

## 2. Specification

### 2.1 The Metadata Schema

Every automated commit must include a structured metadata block, invisible to casual human inspection (using HTML comments) but machine-readable.

```typescript
interface CommitMetadata {
    // The "trigger": A retroactive instruction that, if run now, would produce this result.
    // MUST reference specific existing .md files (templates, nags, methods) present BEFORE this commit.
    retroactive_prompt: string;

    // The "goal": Functional verification criteria
    expectedOutcome: string;

    // The "map": High-level architectural context or constraints
    contextSummary: string;

    // Identity
    agentId: string;
    sessionId: string;

    // The "Recipe": Implementation constraints/hints (Diff Reconstruction)
    diffHints?: string[];
}
```

### 2.2 Storage Format

The metadata is serialized as a JSON object and wrapped in an HTML comment block at the very end of the commit message.

**Example Commit Message:**

```text
feat(auth): implement jwt validation middleware

Adds a new middleware function to verify JWT tokens on protected routes.
Uses the 'jsonwebtoken' library.

<!--
GIT_BRAIN_METADATA:
{
  "retroactive_prompt": "Implement JWT middleware using templates/agents/security-engineer.md and enforcing templates/nags/security-nag.md",
  "expectedOutcome": "Requests without valid tokens should return 401",
  "contextSummary": "Securing API endpoints for phase 2",
  "agentId": "coder-alpha-1",
  "sessionId": "sess_12345",
  "diffHints": ["Use req.headers.authorization", "Handle TokenExpiredError"]
}
-->
```

### 2.3 The Replay Protocol

The "Replay" capability allows an agent to checkout a previous point in history and re-run the `retroactive_prompt` against the current model.

1.  **Checkout**: Revert to the parent commit state.
2.  **Inject**: Feed the `retroactive_prompt` and `contextSummary` to the agent.
3.  **Execute**: Allow the agent to generate code.
4.  **Compare**: Measure the "Diff Fidelity" between the agent's new output and the stored commit diff.

## 3. Implementation

### 3.1 GitManager Extension

The `GitManager` class is the primary interface for this feature.

```typescript
class GitManager {
    /**
     * Creates a commit with the standard message AND the hidden metadata block.
     */
    async commitWithMetadata(
        path: string,
        message: string,
        metadata: CommitMetadata
    ): Promise<string> {
        const fullMessage = `${message}\n\n<!--\nGIT_BRAIN_METADATA:\n${JSON.stringify(metadata, null, 2)}\n-->`;
        return this.commit(path, fullMessage);
    }

    /**
     * Parses the commit log to extract the structured metadata.
     */
    async extractCommitMetadata(path: string, hash: string): Promise<CommitMetadata | null> {
        const log = await this.getCommitMessage(path, hash);
        const match = log.match(/GIT_BRAIN_METADATA:\n([\s\S]*?)\n-->/);
        return match ? JSON.parse(match[1]) : null;
    }
}
```

### 3.2 CLI Integration

- `dark-factory log --brain`: Displays the commit history with the "Why" (prompt/context) expanded.
- `dark-factory replay <commit-hash>`: Interactive mode to re-run a specific commit's task.

### 3.3 The "Diff Inversion" Strategy

To ensure high fidelity during replay, we use **Diff Reconstruction Hints**. Instead of storing the full chat history (which is verbose and model-specific), we store "Implementation Constraints".

- _Bad Hint_: "The user said to add a check."
- _Good Hint_: "Must throw `AuthError` if `age < 18`."

This "Ironman" approach ensures that even if the underlying LLM changes (e.g., GPT-4 to GPT-5), the _intent_ and _constraints_ are preserved, yielding a semantically equivalent result.
