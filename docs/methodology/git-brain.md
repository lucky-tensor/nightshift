# Git-Brain Commits

## Overview

**Git-Brain** commits are structured commits that include reasoning metadata - creating a "Reasoning Ledger" in your git history. They capture not just _what_ changed, but _why_ and _how_ you arrived at that solution.

## The Problem

Traditional git commits:

```
feat: add user authentication
```

**Missing**: Why this approach? What alternatives were considered? What's the intent?

## The Solution

Git-Brain commits add structured metadata:

```
feat: add user authentication

Intent: Allow users to securely log in with email/password
Context: Previous auth was session-only, need persistent login
Reasoning: Chose JWT over sessions for API compatibility
Alternatives: Considered OAuth, but overkill for MVP
Next: Add password reset flow
```

## Format

See `.nightshift/commands/git-brain-commit.md` for the full specification.

Basic structure:

```
<type>: <subject>

[body - detailed description]

Intent: <why this change?>
Context: <what led to this?>
Reasoning: <decision rationale>
Alternatives: <what else was considered?>
Next: <what comes after?>
```

## Benefits

✅ **Agent continuity**: Next agent understands your thinking
✅ **Human readability**: Future you remembers why
✅ **Decision audit**: Track architectural choices
✅ **Replayability**: Reproduce thought process

## Commands

### OpenCode

```bash
/git-brain-commit
```

### Other Vendors

Follow the template in `.nightshift/commands/git-brain-commit.md`.

## Example

```
feat: implement Stripe payment processing

Added payment service with Stripe integration. Handles
credit card payments and stores transaction history.

Intent: Enable users to pay for premium features
Context: Business requirement for monetization, Stripe
         chosen for PCI compliance handling
Reasoning: Repository pattern for data access allows
          switching payment providers later without
          changing business logic
Alternatives: Considered PayPal, but Stripe has better
             developer experience and lower fees
Next: Add refund processing and webhook handling
```

## Git Hooks

Commit messages are validated by `.git/hooks/commit-msg`:

- Requires minimum 10 characters
- Encourages descriptive messages

For Git-Brain commits, aim for detailed reasoning metadata.

## Philosophy

> "Git is all you need."

Your commit history becomes a complete reasoning ledger. No need for external documentation of decisions - it's in the commit metadata.

**See also**: [Git-Brain original concept](../../docs/product_vision/1-vision.md)
