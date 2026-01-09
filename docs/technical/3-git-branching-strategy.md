# Git Branching Strategy: Access Paths & Lineage

## 1. Philosophy: Branches as Access Paths

In the Dark Factory, a branch name is not just a label; it is an **address** that defines the lineage of a work session.

Because agents fork efficiently to explore solution paths (decision branching), the branch structure resembles a tree of possibilities rather than a flat list of features. We use **Access Path Naming** to encode this ancestry directly into the branch name.

## 2. Naming Convention

### 2.1 The Root

All automated work begins from a shared root, typically `main` or a `develop` branch.

### 2.2 The Session Fork

When a top-level session starts (e.g., implementing a feature), it creates a root for that session.

- **Format**: `df/session-{id}`
- **Example**: `df/session-auth-v1`

### 2.3 Recursive Forking (Access Paths)

When an agent decides to fork a session to explore a decision (e.g., "Option A: Use Auth0" vs "Option B: Custom JWT"), it appends the new branch ID to the parent's name.

- **Format**: `{parent-branch}/{child-id}`
- **Example**:
    - Parent: `df/session-auth-v1`
    - Child A: `df/session-auth-v1/opt-auth0`
    - Child B: `df/session-auth-v1/opt-custom`

If Child A forks again:

- Grandchild: `df/session-auth-v1/opt-auth0/fix-callback`

This structure allows any agent to look at a branch name and instantly know:

1.  Where it came from (Ancestry).
2.  What decision path led here (Context).
3.  How deep the divergence is (Complexity).

## 3. Worktree 1:1 Mapping

Every "Dark Factory" branch is checked out into its own unique **Git Worktree**. This is critical for concurrency.

- **Rule**: `1 Branch = 1 Worktree`
- **Path**: `/output/{product}/worktree-{leaf-name}`
- **Implication**: Agents never switch branches inside a worktree. They create a _new_ worktree for a _new_ branch.

## 4. The Pruning Protocol (Depth Limit)

Recursion has limits. Deeply nested branch names (e.g., `df/session-A/opt-B/fix-C/try-D/revert-E`) become unwieldy and indicate a "fractal" loss of focus.

### 4.1 The Threshold

When a branch depth exceeds **7 levels** (Root -> ... -> **Limit**), the system triggers a **Prune & Rename**.

### 4.2 The Pruning Action

1.  **Consolidate**: The agent effectively says, "This specific path is now the new main effort."
2.  **Rename**: The deep branch is renamed (or branched off) to a new top-level feature name.
    - _Old_: `df/session-auth-v1/opt-custom/refactor-db/fix-schema`
    - _New_: `df/feat-auth-schema-fix`
3.  **Archive**: The old lineage is preserved in git history, but active work continues on the new, shortened "Access Path."

## 5. Summary Table

| Type              | Pattern                      | Example                             |
| :---------------- | :--------------------------- | :---------------------------------- |
| **Root Session**  | `df/session-{id}`            | `df/session-login-flow`             |
| **Decision Fork** | `{parent}/{option}`          | `df/session-login-flow/opt-oauth`   |
| **Deep Nesting**  | `{parent}/{opt}/{sub}/{sub}` | `df/.../opt-oauth/fix-ui/style-btn` |
| **Pruned**        | `df/feat-{name}`             | `df/feat-oauth-ui`                  |

## 6. Implementation Notes

- **Git Manager**: Must support recursive directory creation for worktrees if using path-based storage, or flatten worktree directories while keeping hierarchical branch names.
- **Agent Awareness**: Agents must be aware of their `currentBranch` name to generate valid child names.
