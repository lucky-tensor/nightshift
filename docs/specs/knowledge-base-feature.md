# Feature Spec: Dark Factory Knowledge Base (DFKB)

## 1. Overview

The Dark Factory Knowledge Base (DFKB) is the central nervous system of the codebase, designed specifically for autonomous agent consumption. It operates in two distinct modes:

1.  **Bootstrap (The Blitz):** A massive, one-time initialization event to convert a legacy or empty repo into a Dark Factory compliant environment.
2.  **Steady State (The Garden):** A continuous background process that maintains truth across documentation and code through "Cascade Updates."

## 2. Mode 1: Bootstrap ("The Blitz")

The Blitz is a high-intensity agent swarm operation used to onboard an existing repository. It executes in four sequential phases.

### Phase A: The Anchor

Agents first scan the entire repository to generate a single entry point file at the root.

- **File:** `START_HERE.md`
- **Purpose:** The definitive map for any agent entering the workspace. It contains the index of all canonical docs and high-level architecture diagrams.

### Phase B: Canonical Documentation

Agents generate a structured hierarchy of directories and markdown files. These are the "Source of Truth."

- **`product_vision/`**
    - `1-vision.md`: The "Why". High-level purpose and goals.
- **`product_features/`**
    - `1-features.md`: The "What". Functional requirements and user capabilities.
- **`technical/`**
    - `1-technical-challenges.md`: The "How". Architecture, constraints, and tricky implementation details.
- **`development/`**
    - `1-quickstart.md`: Environment setup and build instructions.
    - `2-coding-guidelines.md`: Style guides and patterns.
    - `3-testing.md`: Test strategies and command references.
    - `4-implementation-strategy.md`: The approach for current/future dev cycles.
- **`tasks/`**
    - `1-todo.md`: Pending work.
    - `2-done.md`: Completed history.
    - `3-wontfix.md`: Discarded ideas and rationale.

### Phase C: Fractal Localization (Module Docs)

Every major code module or directory receives a localized guide.

- **File:** `QUICK_START.md` (inside each module root)
- **Content:** Explains the local directory's purpose, key classes, and logic.
- **Linking:** Must contain bidirectional links:
    - **Up:** To the canonical `START_HERE.md` and relevant `technical/` docs.
    - **Down:** To specific source files within the module.

### Phase D: Hyper-Commenting (The 3x Rule)

Agents rewrite source code comments to achieve extreme explicitness.

- **Rule:** ~3 lines of comments for every 1 line of complex code.
- **Intent:** "Leave nothing to question."
- **Style:** Explain the _why_ and the _context_, not just the syntax.

## 3. Mode 2: Steady State ("The Garden")

Once bootstrapped, "Knowledge Base Workers" monitor the repo for changes. They strictly enforce the **Cascade Update** protocol.

### The Cascade Protocol

Changes flow from high-level intent down to low-level implementation.

1.  **Trigger:** A change in feature requirements or technical strategy.
2.  **Level 1 Update:** Worker updates `product_features/` or `technical/`.
3.  **Level 2 Update:** Worker follows links to relevant module `QUICK_START.md` files and updates context.
4.  **Level 3 Update:** Worker updates the Hyper-Comments in the actual source code to reflect the new reality.

## 4. Navigation Standards

To ensure agents never get lost, the **Bidirectional Link Enforcement** is applied:

- Every document must link back to its parent.
- Every summary must link forward to its children/details.
- The `START_HERE.md` must be reachable from anywhere within 2 hops.
