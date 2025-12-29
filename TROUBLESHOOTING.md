# Dark Factory Troubleshooting Guide

## Black Screen / OpenCode Not Loading

If you see a black screen after OpenCode loads with Dark Factory installed, try these steps:

### 1. Check Console Logs

The plugin now includes detailed logging. Check the console output:

**Terminal where you launched OpenCode:**
```bash
# Look for lines starting with [Dark Factory]
# These will tell you where initialization failed
```

**Expected successful output:**
```
[Dark Factory] Plugin initializing...
[Dark Factory] Directory: /path/to/your/project
[Dark Factory] Storage directory: /path/to/your/project/.opencode/dark-factory
[Dark Factory] Initializing managers...
[Dark Factory] Initializing supervisor...
[Dark Factory] Creating tools...
[Dark Factory] Plugin initialized successfully
```

**Error output will show:**
```
[Dark Factory] Plugin initialization failed: <error message>
[Dark Factory] Stack trace: <details>
```

### 2. Test Plugin in Isolation

Run the test script to verify the plugin loads correctly:

```bash
cd /path/to/dark-factory
node test-plugin-load.js
```

If this fails, the plugin has a code issue. If it succeeds, the issue is with OpenCode integration.

### 3. Verify Symlinks

Check that symlinks are correctly created:

```bash
# Plugin file
ls -la ~/.config/opencode/plugin/dark-factory.js
# Should show: ... -> /path/to/dark-factory/dist/index.js

# Templates
ls -la ~/.config/opencode/plugin/dark-factory/templates
# Should show: ... -> /path/to/dark-factory/templates

# Commands
ls -la ~/.config/opencode/command/factory.md
```

### 4. Check Git Repository

Dark Factory requires your project to be a git repository. If not initialized:

```bash
cd /path/to/your/project
git init
git add .
git commit -m "Initial commit"
```

### 5. Temporarily Disable Plugin

To verify the plugin is causing the issue:

```bash
# Remove the symlink
rm ~/.config/opencode/plugin/dark-factory.js

# Restart OpenCode
# If it loads normally, the plugin is the issue
```

### 6. Check OpenCode Plugin Directory Permissions

Ensure OpenCode can read the plugin:

```bash
# Check permissions
ls -la ~/.config/opencode/plugin/

# Fix if needed
chmod 755 ~/.config/opencode/plugin/
chmod 644 ~/.config/opencode/plugin/dark-factory.js
```

### 7. Rebuild Plugin

Sometimes a stale build can cause issues:

```bash
cd /path/to/dark-factory

# Clean and rebuild
rm -rf dist/
bun run build

# Verify build succeeded
ls -lh dist/index.js
```

### 8. Check for Conflicting Plugins

Other plugins might conflict. Try disabling other plugins temporarily:

```bash
# Backup and clear plugins
mv ~/.config/opencode/plugin ~/.config/opencode/plugin.backup
mkdir ~/.config/opencode/plugin

# Install only Dark Factory
bun run dev:install

# Test OpenCode
# Then restore other plugins if needed
```

## Common Error Messages

### "Storage not initialized"

**Cause:** Storage initialization failed
**Solution:** Ensure `.opencode/dark-factory` directory can be created in your project

```bash
mkdir -p .opencode/dark-factory
chmod 755 .opencode/dark-factory
```

### "Worktree already exists"

**Cause:** Previous worktree wasn't cleaned up
**Solution:** Remove stale worktrees

```bash
# List worktrees
git worktree list

# Remove stale ones
git worktree remove /path/to/stale/worktree
```

### "Failed to create session"

**Cause:** OpenCode client API issue
**Solution:** This is an OpenCode issue, not Dark Factory. Check OpenCode is running correctly.

## Plugin Not Showing Tools

If OpenCode loads but Dark Factory tools aren't available:

### 1. Verify Plugin Registration

Check if OpenCode recognizes the plugin (this depends on OpenCode's plugin listing feature).

### 2. Check Tool Names

Tools are registered with these names:
- `factory_init`
- `factory_status`
- `create_project`
- `list_projects`
- `delete_project`
- `add_task`
- `list_tasks`
- `run_task`

Try invoking them directly in chat:
> "Use the factory_init tool to initialize a factory"

### 3. Restart OpenCode

Sometimes OpenCode needs a restart to pick up plugin changes:

```bash
# Kill OpenCode process
pkill -f opencode

# Restart
opencode
```

## Getting Help

If none of these steps work:

1. **Capture console output:**
   ```bash
   opencode 2>&1 | tee opencode-debug.log
   ```

2. **Run plugin test:**
   ```bash
   node test-plugin-load.js > plugin-test.log 2>&1
   ```

3. **Gather information:**
   - OpenCode version
   - Operating system
   - Contents of `opencode-debug.log`
   - Contents of `plugin-test.log`
   - Output of `git --version`

4. **Create an issue** with the above information

## Development Mode Debugging

If you're developing Dark Factory:

### Watch Mode Logs

When running `bun run dev`, you'll see rebuild logs:

```bash
bun run dev
# Watching for changes...
# [change detected]
# Bundled 180 modules in 97ms
```

### Force Rebuild

```bash
# Stop watch mode (Ctrl+C)
# Clean build
rm -rf dist/
bun run build
```

### Check Bundle Size

Large bundles might cause loading issues:

```bash
ls -lh dist/index.js
# Should be around 700KB
# If much larger, investigate bundling issues
```

### Verify Dependencies Are Bundled

```bash
# Check that external imports are bundled
grep -c "node_modules" dist/index.js
# Should be 0 or very low
```

## Performance Issues

If Dark Factory loads but runs slowly:

### Disable Supervisor

The supervisor polls every 60 seconds. To disable temporarily, comment out in `src/plugin/index.ts`:

```typescript
// supervisor.start();  // Comment this line
```

### Check Storage I/O

YAML storage operations are synchronous. Large state files can slow things down:

```bash
# Check storage file sizes
du -sh .opencode/dark-factory/*.yaml
```

## Still Stuck?

Check the Dark Factory logs in your project:

```bash
# If any error logs were written
cat .opencode/dark-factory/error.log
```

Or check OpenCode's logs (if available).
