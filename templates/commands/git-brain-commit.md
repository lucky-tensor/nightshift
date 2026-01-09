# Git-Brain Commit Protocol

## Purpose

To create a commit that preserves the "Reasoning Ledger". The goal is not just to save the code, but to save the _intent_ and the _recipe_ so that another agent can reconstruct this work in the future.

## Steps

### 1. Analyze the Change

- **Review Diff**: Look at the staged changes. What files were modified? What is the _functional_ impact?
- **Review Context**: What was the original user request or task? What architectural constraints were applied?

### 2. Synthesize Metadata

You need to generate three specific pieces of information:

- **Prompt (The Trigger)**:
    - _Do not_ copy the full conversation history.
    - _Do_ write a compressed, standalone instruction that would trigger this specific change.
    - _Example_: "Update the `User` interface to add an optional `phoneNumber` field and update the validation schema."

- **Expected Outcome (The Goal)**:
    - Describe the functional state after this commit.
    - _Example_: "User objects accept phone numbers; validation fails if phone number format is invalid."

- **Diff Hints (The Recipe)**:
    - List specific implementation constraints or "magic strings" that appear in the diff.
    - _Example_: ["Use regex `^\+\d{10,15}$`", "Update `src/types/user.ts`", "Use `zod` optional()"]

### 3. Construct the Commit Message

Format the message as follows:

1.  **Header**: Standard conventional commit (e.g., `feat(auth): add phone number to user profile`).
2.  **Body**: Human-readable summary of changes.
3.  **Footer**: The `GIT_BRAIN_METADATA` block.

### 4. JSON Structure

The footer must be a valid JSON object wrapped in an HTML comment.

```json
<!--
GIT_BRAIN_METADATA:
{
  "prompt": "<COMPRESSED_INSTRUCTION>",
  "expectedOutcome": "<FUNCTIONAL_GOAL>",
  "contextSummary": "<ARCHITECTURAL_CONTEXT>",
  "diffHints": ["<HINT_1>", "<HINT_2>"],
  "agentId": "<YOUR_AGENT_ID>",
  "sessionId": "<CURRENT_SESSION_ID>"
}
-->
```

## Checklist

- [ ] Does the `prompt` describe _what to do_, not _what happened_?
- [ ] Are `diffHints` specific enough to guide a future model?
- [ ] Is the JSON valid?
- [ ] Is the HTML comment syntax `<!-- ... -->` correct?
