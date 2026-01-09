# Knowledge Base Indexing Protocol

## Purpose

To maintain the **"Documentation Fractal"**. In the Nightshift methodology, the codebase is a traversable graph where every node (directory, file, function) provides context about its place in the whole. This ensures agents never get "lost in the woods" and can always trace a path back to the root vision.

## Triggers

- **Post-Dev**: Run immediately after a feature is completed/merged.
- **Idle State**: Run continuously when agents are waiting for human input.

## The Fractal Standard

1.  **Root-to-Leaf Connectivity**: Every file must be reachable via links starting from `START_HERE.md`.
2.  **Bi-Directional Navigation**: Every README must link "Up" to its parent and "Down" to its children.
3.  **Code-Adjacent Documentation**: Documentation lives _next to_ the code it describes, not just in a `docs/` silo.

## Steps

### 1. The Crawl (Topology Check)

Start at the project root (usually `START_HERE.md` or `README.md`) and perform a depth-first traversal:

- **Check Directory Identity**: Does every major directory (e.g., `src/`, `src/components/`) have a `README.md` or `QUICK_START.md`?
    - _Action_: If missing, create a stub that describes the directory's purpose and links back to the parent.
- **Check Connectivity**:
    - Does the Parent link to this Child?
    - Does the Child link back to the Parent? ("Back to Root" or "Up to src")

### 2. Code Interface Gardening

Walk through source files (`.ts`, `.rs`, `.py`, etc.) modified in recent sessions:

- **Public API Audit**: Do exported functions, classes, and types have JSDoc/Docstring comments?
    - _Action_: Add comments focusing on _intent_ and _usage_, not just restating the type.
- **Complexity Check**: Do complex logic blocks have inline comments explaining the _Why_?

### 3. Link Verification

- **Dead Link Hunt**: Scan all markdown files for broken relative links.
    - _Action_: Fix typos or update paths.
- **Deprecation Check**: Ensure no "live" documents link to files marked `.deprecated.md` unless explicitly labeled as "Historical Reference".

### 4. Index Regeneration

For directories containing many loose files (e.g., `docs/research/`, `personas/`):

- **Auto-Index**: Update the local `INDEX.md` or `README.md` to list all files in the directory with 1-line descriptions.

## Checklist

- [ ] Can an agent navigate from `START_HERE.md` to the deepest new file solely by following relative paths?
- [ ] Do all new directories have a `README.md` providing context?
- [ ] Are all new exported functions documented for symbol retrieval?
- [ ] Are there any broken paths in the modified files?
