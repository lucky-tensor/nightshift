# Product Hypothesis: Diff-Centric Git Brain

## Hypothesis Statement

**If** we encode commit messages with "Diff Reconstruction Hints" and "Minimal Intent" instead of raw conversation history, **then** we can recreate the exact (or near-exact) code changes with 90%+ fidelity across different models, **because** we are providing the model with the same semantic constraints that generated the original diff.

## The Core Concept: Diff Inversion

Standard AI commits record the _conversation_. The "Diff-Centric Brain" records the **Diff Instruction**.

### From Conversation to Reconstruction

- **Raw Chat**: "Can you please update the user validation to check for age, and also maybe add a log when it fails? Thanks!"
- **Minimal Intent**: "Update `validateUser` in `src/auth.ts` to enforce `age >= 18`."
- **Diff Reconstruction Hint**: "Add `if (user.age < 18) throw Error('Too young')`. Add `console.warn('Validation failed')` inside the catch block."

## The Ironman Argument (Steel Man)

By capturing the **Semantic Delta** (Intent + Hint), we are creating a "Compiled" version of the AI's reasoning. This is superior to chat logs because it strips away the "noise" of human-AI interaction and stores the precise "signal" required to modify the code. It allows for **Mathematical Reproducibility**: given state `S` and intent `I`, the model should consistently produce diff `D`. This makes the codebase self-healing and the AI's logic fully versionable.

## The Strawman Argument

If you provide a "Diff Reconstruction Hint" that is detailed enough to recreate the diff, you are essentially just storing a second, more verbose version of the code in the commit message. This isn't "reasoning"; it's just **Manual Redundancy**. If the code changes manually, the stored hints become "Lying Metadata" which will lead future agents to break the system when they try to "replay" an outdated instruction.

## The Debate: Compression vs. Description

The fundamental challenge is finding the **Optimal Compression Point**.

- Too compressed: Replay produces the wrong code.
- Too descriptive: Metadata is just a slower version of the code itself.

The solution is to store **Implementation Constraints** rather than implementation code. Instead of "Add this line", we store "Must use the `AuthError` class for exceptions." This guides the model to the same functional diff without being a literal copy.

## Success Metrics

- **Diff Fidelity**: % similarity between original git diff and replayed diff (Target: >90%).
- **Metadata Efficiency**: Ratio of metadata size to diff size (Target: <0.5).
- **Repair Rate**: % of replayed diffs that pass the original unit tests.

---

_This hypothesis transforms git history into a series of "Reasoning Deltas" that can be re-executed to reconstruct the software's evolution._
