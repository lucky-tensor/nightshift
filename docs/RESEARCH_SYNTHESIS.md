# Research Synthesis: The Cognitive Factory

This document explores the deeper technical implications and future directions of the Dark Factory's core hypotheses.

## 1. Git-Brain: From Versioning State to Versioning Reasoning

### The Replay Paradox

The "Strawman" argument correctly identifies that **Model Drift** threatens the reproducibility of prompts. However, our research suggests a path forward through **Prompt Inversion** and **Diff-Normalization**.

**Hypothesis**: If a prompt fails to recreate a specific diff upon replay, we can use the diff itself as a constraint to "repair" the prompt.

- **Technique**: Store not just the prompt, but a set of **Instructional Invariants** (e.g., "Must use `useEffect`", "Must export `validateUser`").
- **Future Work**: Implement a "Verify & Patch" loop during replay that updates the compressed prompt if the underlying model behavior has changed.

### Git Notes as the "Subconscious"

To solve the **History Bloat** problem, we should explore using `git notes`.

- **Strategy**: Keep the commit message human-readable. Store the heavy JSON metadata (prompts, chain-of-thought, trace IDs) in `refs/notes/dark-factory`.
- **Benefit**: Metadata is decoupled from the main history but remains bound to the commit hash. It can be pushed/pulled separately.

## 2. Multi-Agent Systems: Beyond the Committee

### The Coordination Tax vs. The Specialization Gain

The debate on "Too Many Cooks" vs. "Specialized Experts" can be resolved through **Asynchronous Shared Memory**.

**Concept: The Project Blackboard**
Instead of linear handoffs (Planner -> Coder), agents should use a "Blackboard" architecture.

1. **Planner** posts a high-level goal.
2. **Coder** starts implementation and posts "Blockers" to the blackboard.
3. **Tester** sees the implementation and starts drafting tests in parallel, posting "Edge Cases" for the Coder.
4. **Shared Context** is not a dump of history, but a **Curated State Object** (The Blackboard).

### Cognitive Partitioning

We've identified that the most critical partition is not by _role_ but by _contextual depth_:

- **Macro-Agents**: Focus on architecture and file-to-file relationships (Plan/Structure).
- **Micro-Agents**: Focus on block-level implementation (Functions/Logic).
- **Meta-Agents**: Focus on quality control and standard compliance (Review/Format).

## 3. Code Indexing: Semantic Anchoring

### Semantic Density vs. Noise

To mitigate the **Vector Noise** problem, we propose **Semantic Anchoring**.

- **Technique**: Instead of indexing every line, we index "Anchors" (Exported members, Public APIs) with high-density embeddings, and treat the body of those members as "Shadow Context" that is only retrieved when the Anchor is matched.
- **Hybrid Search**: We use BM25 for keyword precision and Cosine Similarity for semantic recall, combined via Reciprocal Rank Fusion (RRF).

## Synthesis: The "Autonomous Loop"

The ultimate goal is a system where:

1. **Multi-Agents** collaborate on a **Blackboard**.
2. Their decisions and the code they produce are indexed in the **Code Index**.
3. Every successful loop is recorded in the **Git-Brain**, preserving the reasoning for future agents.

### Experiment Recommendation: "The Re-Gen Test"

Attempt to delete a 5-file feature and have a new set of agents recreate it using _only_ the compressed prompts and index from the Git-Brain history. Measure the **Structural Similarity Index** between the original and the recreated code.

---

_This research moves us from "Agents using tools" to "A Factory that thinks."_
