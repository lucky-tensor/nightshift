# Custom Modes Investigation

## Question
The Antigravity CLI help states:
```
-m --mode <mode>     The mode to use for the chat session. 
                     Available options: 'ask', 'edit', 'agent', 
                     or the identifier of a custom mode.
```

What are the customization options for a "mode"?

## Investigation Results

### Built-in Modes
Three modes are documented and confirmed:
- **ask** - Q&A only, no file modifications
- **edit** - Code editing focused
- **agent** - Full autonomy (plan, execute, verify)

### Custom Modes - Findings

**No CLI Configuration Found**:
- No mode configuration files in `~/Library/Application Support/Antigravity/`
- No mode-related settings in `User/settings.json`
- No obvious mode configuration in `globalStorage/storage.json`

**Possible Custom Mode Sources**:
1. **Extensions** - Antigravity extensions might register custom modes
2. **GUI Configuration** - Custom modes might be configurable in the IDE
3. **Workspace Settings** - Might be defined per-workspace
4. **Future Feature** - May be planned but not yet implemented

### Testing Custom Mode Identifier

```bash
$ echo "test" | antigravity chat --mode my-custom-mode -
# Result: Command executes, no error
# Behavior: Unknown (need to observe in GUI)
```

**Note**: The CLI accepts any mode identifier without error, but behavior is unknown.

### Agent Preferences Found

In `globalStorage/storage.json`:
```json
{
  "antigravityUnifiedStateSync.agentPreferences.hasPlanningModeMigrated": true,
  "antigravityUnifiedStateSync.agentPreferences.hasArtifactReviewPolicyMigrated": true,
  "antigravityUnifiedStateSync.agentPreferences.hasTerminalAutoExecutionPolicyMigrated": true,
  "antigravityUnifiedStateSync.agentPreferences.hasTerminalAllowedCommandsMigrated": true,
  "antigravityUnifiedStateSync.agentPreferences.hasTerminalDeniedCommandsMigrated": true,
  "antigravityUnifiedStateSync.agentPreferences.hasAgentFileAccessMigration": true
}
```

These suggest agent behavior can be configured, but not necessarily custom modes.

## Implications for Nightshift

### Current Assessment
- ❌ No documented way to create custom modes via CLI
- ❌ No configuration files found for custom modes
- ⚠️ Custom modes likely require GUI or extension development

### Potential Use Cases (if custom modes exist)
1. **Model-specific modes** - Different modes for different models
2. **Task-specific modes** - Specialized modes for testing, reviewing, etc.
3. **Persona modes** - Map Nightshift personas to Antigravity modes

### Recommendations

**For MVP**:
- ✅ Use built-in modes (ask, edit, agent)
- ✅ Map Nightshift personas to appropriate built-in modes:
  - Engineer persona → `agent` mode
  - Tester persona → `agent` mode  
  - Reviewer persona → `ask` or `edit` mode
  - PM persona → `ask` mode

**For Future Investigation**:
1. Check Antigravity extension marketplace for custom mode examples
2. Review Antigravity extension API documentation
3. Test if custom modes can be defined via extensions
4. Investigate GUI for custom mode configuration

## Conclusion

**Custom modes are mentioned but not documented or easily accessible via CLI.**

For Nightshift MVP, we should:
- Use the three built-in modes
- Not rely on custom mode functionality
- Revisit in Phase 2+ if needed

**Impact on Architecture**: None - we can proceed with built-in modes.
