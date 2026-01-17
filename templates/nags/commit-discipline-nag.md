# Commit Discipline Nag

Your working changes have exceeded acceptable limits. Before continuing with new work, you **must** commit your current progress.

## Current Violation

{{violation_reason}}

**Current Stats:**
- Lines changed: {{lines_changed}}
- Files changed: {{files_changed}}
- Time since last commit: {{minutes_since_commit}} minutes

## Required Actions

Complete these checks and commit your work:

- [ ] **Review Changes**: Run `git diff` to review your current changes
- [ ] **Stage Changes**: Use `git add` to stage files for commit (or `git add .` for all)
- [ ] **Write Message**: Create a clear, descriptive commit message
- [ ] **Commit**: Execute the commit

## Commit Message Guidelines

A good commit message follows this format:

```
<type>: <short summary>

<optional body with more details>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code restructuring (no behavior change)
- `chore`: Maintenance tasks
- `docs`: Documentation changes
- `test`: Adding/updating tests

**Examples:**
- `feat: add user login endpoint`
- `fix: resolve null pointer in auth middleware`
- `refactor: extract validation logic into helper`

## Why This Matters

Frequent, small commits:
- **Easier reviews**: Reviewers can understand changes in context
- **Better bisect**: `git bisect` can pinpoint which change broke something
- **Safe rollback**: Can revert specific changes without losing other work
- **Clear history**: The project history tells a story of how it evolved

## After Committing

Once you've committed your changes:
1. Update the forward prompt with your progress
2. Continue with your next task
3. This nag will be cleared automatically
