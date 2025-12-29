# Antigravity Agents CLI Guide 🤖

## Understanding Antigravity Agents

Antigravity IDE is built on an **"agent-first"** architecture where AI agents can autonomously plan, execute, and verify complex software tasks. These agents can work across the editor, terminal, and browser simultaneously.

## Agent Architecture

### What is an Agent?
An Antigravity agent is an autonomous AI assistant powered by Google's Gemini models that can:
- **Plan**: Break down complex tasks into actionable steps
- **Execute**: Run commands, edit files, and interact with tools
- **Verify**: Check results and iterate until completion
- **Collaborate**: Work with other agents in parallel

### Agent Manager
The **Agent Manager** is your "Mission Control" dashboard that:
- Orchestrates multiple agents across workspaces
- Manages agent conversations and artifacts
- Provides asynchronous task execution
- Allows monitoring and control of agent activities

## Using Agents from the CLI

### Basic Agent Invocation

The `chat` command with `--mode agent` gives you full agent capabilities:

```bash
antigravity chat --mode agent "Your high-level objective"
```

### Agent Modes Explained

#### 1. **Agent Mode** (Full Autonomy)
```bash
antigravity chat --mode agent "Build a REST API with authentication"
```

**Capabilities:**
- ✅ Plan multi-step workflows
- ✅ Edit multiple files
- ✅ Run terminal commands
- ✅ Use browser for research
- ✅ Install dependencies
- ✅ Run tests and verify results
- ✅ Iterate until completion

**Best for:**
- Complex, multi-step tasks
- Full project setup
- End-to-end feature implementation
- Debugging and troubleshooting

#### 2. **Edit Mode** (Code-Focused)
```bash
antigravity chat --mode edit "Refactor this to use async/await"
```

**Capabilities:**
- ✅ Direct code editing
- ✅ Focused refactoring
- ❌ Limited terminal access
- ❌ No browser interaction

**Best for:**
- Code refactoring
- Quick fixes
- Focused edits

#### 3. **Ask Mode** (Q&A Only)
```bash
antigravity chat --mode ask "How does this algorithm work?"
```

**Capabilities:**
- ✅ Answer questions
- ✅ Explain code
- ❌ No file modifications
- ❌ No command execution

**Best for:**
- Learning and understanding
- Documentation lookup
- Code explanation

### Agent Terminal Execution Policies

Agents can execute terminal commands with configurable safety levels. While these are typically set in the IDE, understanding them helps you predict agent behavior:

#### **Off** - No Auto-Execution
- Agent will never run commands automatically
- Always asks for permission
- Safest option

#### **Auto** - Smart Execution
- Agent decides when to ask permission
- Balances safety and autonomy
- Recommended for most users

#### **Turbo** - Maximum Autonomy
- Agent runs commands automatically
- Only blocks commands on deny list
- Fastest but requires trust

## Advanced Agent Usage

### 1. Multi-File Context

Provide multiple files for comprehensive understanding:

```bash
antigravity chat --mode agent \
  "Refactor the authentication system" \
  -a src/auth.js \
  -a src/middleware.js \
  -a src/routes.js \
  -a tests/auth.test.js
```

### 2. Piped Input for Dynamic Context

```bash
# Debug based on test output
npm test 2>&1 | antigravity chat --mode agent \
  "Fix all failing tests" -

# Review git changes
git diff main...feature | antigravity chat --mode agent \
  "Review and improve this PR" -

# Analyze logs
tail -n 100 app.log | antigravity chat --mode agent \
  "Find and fix the root cause" -
```

### 3. Workspace-Aware Agents

Agents operate in the context of your current working directory:

```bash
# Navigate to project
cd ~/projects/my-app

# Agent has full context of the workspace
antigravity chat --mode agent \
  "Add user authentication with JWT"
```

### 4. Iterative Development

Agents can handle complex, multi-step workflows:

```bash
antigravity chat --mode agent \
  "Create a complete CRUD API for users with:
   - PostgreSQL database
   - Express.js backend
   - Input validation
   - Error handling
   - Unit tests
   - API documentation"
```

The agent will:
1. Plan the architecture
2. Set up dependencies
3. Create database schema
4. Implement endpoints
5. Write tests
6. Generate documentation
7. Verify everything works

## Agent Orchestration Patterns

### Pattern 1: Sequential Tasks

```bash
# Task 1: Setup
antigravity chat --mode agent "Initialize a Next.js project with TypeScript"

# Wait for completion, then Task 2
antigravity chat --mode agent "Add Tailwind CSS and configure dark mode"

# Task 3: Build
antigravity chat --mode agent "Create a landing page with hero section"
```

### Pattern 2: Parallel Workflows

Open multiple agent sessions for parallel work:

```bash
# Terminal 1: Backend work
antigravity chat --mode agent "Implement user authentication API"

# Terminal 2: Frontend work (different workspace)
cd ../frontend
antigravity chat --mode agent "Create login UI components"

# Terminal 3: Testing
cd ../e2e-tests
antigravity chat --mode agent "Write end-to-end auth tests"
```

### Pattern 3: Monitoring and Auto-Fix

```bash
#!/bin/bash
# watch-and-fix.sh - Continuous monitoring

while true; do
  npm test 2>&1 | grep "FAIL" && \
    npm test 2>&1 | antigravity chat --mode agent \
      "Fix the failing tests" -
  sleep 60
done
```

## Practical Agent Workflows

### Workflow 1: Feature Development

```bash
#!/bin/bash
# feature-dev.sh

FEATURE="user profile management"

# Step 1: Planning
antigravity chat --mode agent \
  "Create an implementation plan for $FEATURE"

# Step 2: Implementation
antigravity chat --mode agent \
  "Implement $FEATURE following the plan"

# Step 3: Testing
antigravity chat --mode agent \
  "Write comprehensive tests for $FEATURE"

# Step 4: Documentation
antigravity chat --mode agent \
  "Generate API documentation for $FEATURE"
```

### Workflow 2: Code Review Automation

```bash
#!/bin/bash
# auto-review.sh

# Get current branch
BRANCH=$(git branch --show-current)

# Generate diff
git diff main...$BRANCH > /tmp/changes.diff

# Agent review
cat /tmp/changes.diff | antigravity chat --mode agent \
  "Perform a thorough code review checking for:
   - Security vulnerabilities
   - Performance issues
   - Code quality and best practices
   - Test coverage
   - Documentation completeness
   Provide specific suggestions for improvement." -
```

### Workflow 3: Debugging Pipeline

```bash
#!/bin/bash
# debug-pipeline.sh

# Capture error
ERROR_LOG=$(npm run build 2>&1)

# Agent diagnosis
echo "$ERROR_LOG" | antigravity chat --mode agent \
  "Diagnose and fix this build error. Steps:
   1. Identify the root cause
   2. Fix the issue
   3. Verify the build succeeds
   4. Explain what was wrong" -
```

### Workflow 4: Migration Assistant

```bash
#!/bin/bash
# migrate.sh

antigravity chat --mode agent \
  "Migrate this project from JavaScript to TypeScript:
   - Add TypeScript configuration
   - Convert all .js files to .ts
   - Add proper type annotations
   - Fix all type errors
   - Update package.json
   - Verify build and tests pass" \
  -a package.json \
  -a src/**/*.js
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: AI Code Review

on: [pull_request]

jobs:
  ai-review:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Get PR diff
        run: |
          git diff origin/main...HEAD > pr-changes.diff
      
      - name: AI Review
        run: |
          cat pr-changes.diff | \
          /Applications/Antigravity.app/Contents/Resources/app/bin/antigravity \
            chat --mode agent \
            "Review this PR for issues" -
```

### Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

# Get staged changes
git diff --cached > /tmp/staged.diff

# Agent review
cat /tmp/staged.diff | antigravity chat --mode ask \
  "Quick review: any critical issues?" -

# Note: Use --mode ask for speed, or --mode agent for fixes
```

## Agent Best Practices

### 1. **Be Specific with Objectives**

❌ Bad:
```bash
antigravity chat --mode agent "Make it better"
```

✅ Good:
```bash
antigravity chat --mode agent \
  "Improve performance by:
   - Adding database indexes
   - Implementing caching
   - Optimizing N+1 queries
   - Adding pagination"
```

### 2. **Provide Context**

```bash
# Include relevant files
antigravity chat --mode agent \
  "Fix the authentication bug" \
  -a src/auth.js \
  -a tests/auth.test.js \
  -a logs/error.log
```

### 3. **Use Appropriate Modes**

- **Quick questions** → `--mode ask`
- **Code edits** → `--mode edit`
- **Complex tasks** → `--mode agent`

### 4. **Leverage Piping**

```bash
# Dynamic context from commands
docker logs myapp | antigravity chat --mode agent \
  "Debug the container crash" -
```

### 5. **Workspace Organization**

```bash
# Navigate to correct directory first
cd ~/projects/my-app

# Agent operates in this context
antigravity chat --mode agent "Add feature X"
```

## Agent Limitations & Considerations

### What Agents Can Do
✅ Edit files in the workspace
✅ Run terminal commands
✅ Install dependencies
✅ Browse documentation
✅ Run tests
✅ Commit changes (if configured)

### What Agents Cannot Do
❌ Access files outside workspace
❌ Make external API calls (without tools)
❌ Modify system settings
❌ Access credentials (unless provided)

### Safety Considerations

1. **Review Agent Actions**: Always review what agents do, especially in production
2. **Use Version Control**: Commit before running agents on critical code
3. **Test in Isolation**: Try agents on non-critical projects first
4. **Set Execution Policies**: Configure terminal execution based on trust level
5. **Provide Clear Constraints**: Specify what agents should NOT do

## Troubleshooting

### Agent Not Responding
```bash
# Check if Antigravity is running
ps aux | grep Antigravity

# Try with explicit window
antigravity chat --new-window --mode agent "test"
```

### Agent Stuck or Wrong Direction
```bash
# Start fresh conversation
antigravity chat --new-window --mode agent \
  "Ignore previous context. New task: ..."
```

### Need More Control
```bash
# Use edit mode for precise changes
antigravity chat --mode edit "specific change"

# Or ask mode for guidance first
antigravity chat --mode ask "How should I approach this?"
```

## Advanced: Custom Agent Workflows

### Create Reusable Agent Scripts

```bash
#!/bin/bash
# agents/feature-builder.sh

FEATURE_NAME=$1
DESCRIPTION=$2

antigravity chat --mode agent \
  "Build feature: $FEATURE_NAME
   
   Description: $DESCRIPTION
   
   Requirements:
   - Follow existing code patterns
   - Include unit tests
   - Add JSDoc comments
   - Update README if needed
   - Ensure all tests pass
   
   Files to consider:" \
  -a src/**/*.js \
  -a tests/**/*.test.js
```

Usage:
```bash
./agents/feature-builder.sh "dark-mode" "Add dark mode toggle to UI"
```

## Resources

- **Antigravity Docs**: https://antigravity.google
- **Agent Manager Guide**: Open Antigravity → View → Agent Manager
- **Gemini Models**: https://deepmind.google/technologies/gemini/

---

**🎯 Key Takeaway**: Antigravity agents are most powerful when given clear objectives, proper context, and appropriate autonomy levels. Use the CLI to integrate agent capabilities into your entire development workflow.
