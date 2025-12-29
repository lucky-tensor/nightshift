#!/usr/bin/env bash
# Agent workflow examples for Antigravity CLI

ANTIGRAVITY="/Applications/Antigravity.app/Contents/Resources/app/bin/antigravity"

echo "🤖 Antigravity Agent Workflow Examples"
echo "======================================"
echo ""

# Example 1: Code Review Agent
echo "📋 Example 1: Automated Code Review"
echo "-----------------------------------"
cat << 'EOF'
# Review uncommitted changes
git diff | antigravity chat --mode agent \
  "Review these changes for:
   - Security issues
   - Performance problems
   - Code quality
   - Best practices" -

EOF
echo ""

# Example 2: Feature Builder Agent
echo "🏗️  Example 2: Feature Builder"
echo "-----------------------------------"
cat << 'EOF'
# Build a complete feature
antigravity chat --mode agent \
  "Create a user authentication feature with:
   - Login/logout endpoints
   - JWT tokens
   - Password hashing
   - Input validation
   - Unit tests"

EOF
echo ""

# Example 3: Debug Agent
echo "🐛 Example 3: Automated Debugging"
echo "-----------------------------------"
cat << 'EOF'
# Debug test failures
npm test 2>&1 | antigravity chat --mode agent \
  "Fix all failing tests" -

EOF
echo ""

# Example 4: Documentation Agent
echo "📚 Example 4: Documentation Generator"
echo "-----------------------------------"
cat << 'EOF'
# Generate docs for a module
antigravity chat --mode agent \
  "Generate comprehensive documentation" \
  -a src/mymodule.js

EOF
echo ""

# Example 5: Refactoring Agent
echo "♻️  Example 5: Code Refactoring"
echo "-----------------------------------"
cat << 'EOF'
# Refactor to TypeScript
antigravity chat --mode agent \
  "Convert this project to TypeScript:
   - Add tsconfig.json
   - Convert all .js to .ts
   - Add type annotations
   - Fix type errors" \
  -a package.json

EOF
echo ""

# Example 6: Migration Agent
echo "🔄 Example 6: Framework Migration"
echo "-----------------------------------"
cat << 'EOF'
# Migrate to a new framework
antigravity chat --mode agent \
  "Migrate from Express to Fastify:
   - Update dependencies
   - Convert route handlers
   - Update middleware
   - Ensure tests pass"

EOF
echo ""

echo "💡 To run any example, copy the command and execute it in your terminal"
echo ""
echo "🎯 Pro Tips:"
echo "  - Use --mode agent for complex, multi-step tasks"
echo "  - Use --mode edit for focused code changes"
echo "  - Use --mode ask for questions and explanations"
echo "  - Add files with -a to provide context"
echo "  - Pipe output with | ... - for dynamic input"
echo ""
