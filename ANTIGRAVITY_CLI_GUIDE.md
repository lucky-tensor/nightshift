# Antigravity CLI Guide

## 🎉 Success! Antigravity HAS a Command-Line Interface!

The Antigravity CLI is located at:
```
/Applications/Antigravity.app/Contents/Resources/app/bin/antigravity
```

## 🚀 Quick Setup

Run the setup script to add `antigravity` to your PATH:
```bash
./antigravity-cli-setup.sh
```

Or manually create a symlink:
```bash
sudo ln -s /Applications/Antigravity.app/Contents/Resources/app/bin/antigravity /usr/local/bin/antigravity
```

## 💬 Chat Command (The Key Feature!)

The `chat` subcommand allows you to control Antigravity's AI agent from the terminal!

### Basic Usage
```bash
antigravity chat "Your prompt here"
```

### Chat Modes

#### 1. **Agent Mode** (Default - Full Autonomy)
```bash
antigravity chat --mode agent "Create a REST API with authentication"
```
- AI can plan, execute, and verify tasks
- Can edit files, run commands, use browser
- Most powerful mode

#### 2. **Edit Mode** (Code Editing)
```bash
antigravity chat --mode edit "Refactor this function to use async/await"
```
- Focused on code editing
- Makes direct file modifications

#### 3. **Ask Mode** (Q&A Only)
```bash
antigravity chat --mode ask "How does async/await work in Python?"
```
- Question answering only
- No file modifications

### Adding Context

#### Add Files as Context
```bash
antigravity chat "Explain this code" --add-file myfile.py
antigravity chat "Debug this" -a error.log -a config.json
```

#### Pipe Input from stdin
```bash
cat error.log | antigravity chat "What's causing this error?" -
ps aux | grep node | antigravity chat "Which processes should I kill?" -
git diff | antigravity chat "Review these changes" -
```

### Window Management

```bash
# Open in new window
antigravity chat --new-window "Create a new project"

# Reuse existing window
antigravity chat --reuse-window "Continue working on this"

# Maximize chat view
antigravity chat --maximize "Show me the full interface"
```

## 📁 File & Folder Management

```bash
# Open files
antigravity myfile.py

# Open folder
antigravity /path/to/project

# Open at specific line
antigravity --goto myfile.py:42

# Open at line and column
antigravity --goto myfile.py:42:15

# Compare files
antigravity --diff file1.py file2.py

# Add folder to workspace
antigravity --add /path/to/folder
```

## 🔧 Extension Management

```bash
# List installed extensions
antigravity --list-extensions

# Install extension
antigravity --install-extension publisher.extension-name

# Uninstall extension
antigravity --uninstall-extension publisher.extension-name
```

## 🤖 Model Context Protocol (MCP)

```bash
# Add MCP server
antigravity --add-mcp '{"name":"server-name","command":"..."}'
```

## 💡 Practical Examples

### 1. Debug from Terminal
```bash
# Run tests and debug failures
npm test 2>&1 | antigravity chat "Debug these test failures" -
```

### 2. Code Review
```bash
# Review uncommitted changes
git diff | antigravity chat --mode agent "Review and improve this code" -
```

### 3. Error Analysis
```bash
# Analyze application logs
tail -n 100 app.log | antigravity chat "Find the root cause of errors" -
```

### 4. Automated Refactoring
```bash
# Refactor with context
antigravity chat --mode agent "Refactor to use TypeScript" \
  -a src/index.js \
  -a src/utils.js
```

### 5. Documentation Generation
```bash
# Generate docs for a file
antigravity chat "Generate comprehensive documentation" -a mymodule.py
```

### 6. Quick Scripts
```bash
# Create utility scripts
antigravity chat --mode agent "Create a bash script to backup my database"
```

### 7. CI/CD Integration
```bash
# In your CI pipeline
if [ $? -ne 0 ]; then
  echo "Build failed" | antigravity chat "Analyze build failure and suggest fixes" -
fi
```

## 🎯 Advanced Workflows

### Automated Code Review Script
```bash
#!/bin/bash
# review.sh - Automated code review

BRANCH=$(git branch --show-current)
git diff main...$BRANCH | \
  antigravity chat --mode agent \
    "Review this PR for: security issues, performance problems, and code quality. Suggest improvements." -
```

### Error Monitor
```bash
#!/bin/bash
# monitor.sh - Monitor logs and auto-debug

tail -f /var/log/app.log | while read line; do
  if echo "$line" | grep -i "error"; then
    echo "$line" | antigravity chat "Quick diagnosis of this error" -
  fi
done
```

### Smart Git Commit Messages
```bash
#!/bin/bash
# smart-commit.sh

git diff --staged | \
  antigravity chat "Generate a conventional commit message for these changes" - | \
  git commit -F -
```

## 🔍 Other Useful Commands

```bash
# Check version
antigravity --version

# Print status
antigravity --status

# Verbose mode
antigravity --verbose

# Disable extensions
antigravity --disable-extensions
```

## 📝 Tips & Tricks

1. **Use stdin for dynamic content**: Pipe command output directly to Antigravity
2. **Combine with shell scripts**: Automate complex workflows
3. **Add multiple files**: Use `-a` multiple times for better context
4. **Use agent mode for complex tasks**: Let AI handle multi-step operations
5. **Integrate with CI/CD**: Automate code review and debugging

## 🚨 Important Notes

- The chat command opens Antigravity IDE (if not already open)
- Commands execute in the context of your current working directory
- Agent mode has full access to your system (use carefully)
- The CLI respects your Antigravity settings and extensions

## 🔗 Integration Examples

### VS Code Tasks
```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "AI Review",
      "type": "shell",
      "command": "git diff | antigravity chat 'Review changes' -"
    }
  ]
}
```

### Git Hooks
```bash
# .git/hooks/pre-commit
#!/bin/bash
git diff --cached | antigravity chat --mode ask "Any issues with these changes?" -
```

## 📚 Resources

- Full help: `antigravity --help`
- Chat help: `antigravity chat --help`
- Antigravity Docs: https://antigravity.google

---

**You now have full command-line control of Antigravity IDE! 🎊**
