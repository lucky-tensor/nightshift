# Antigravity CLI Investigation Results

**Date**: 2025-12-26  
**Antigravity Version**: 1.104.0  
**Investigator**: Nightshift Team

---

## Executive Summary

🔴 **CRITICAL FINDINGS**:
1. **No CLI model selection** - Cannot specify model via command-line flags
2. **No quota API** - No visible way to check quota from CLI
3. **Unknown error patterns** - Need actual quota exhaustion to test

✅ **POSITIVE FINDINGS**:
1. CLI accepts commands and processes them
2. Window management flags exist (`--reuse-window`, `--new-window`)
3. Exit codes are consistent (0 for success)

---

## Q1: Quota Detection 🔴 BLOCKER

### Findings

**No Quota API Found**:
- No `--quota`, `--usage`, or similar flags in `antigravity --help`
- No `antigravity quota` or `antigravity usage` subcommands
- No quota information in user settings.json

**Tested Commands**:
```bash
$ antigravity --help | grep -i quota
# No results

$ antigravity quota
# Command not found

$ antigravity chat --help | grep -i quota
# No results
```

### Implications

**For Finance Manager**:
- ❌ Cannot proactively check remaining quota
- ❌ Cannot use noop probes to monitor quota
- ⚠️ Must rely on error detection when quota exhausted

**Next Steps**:
1. ⏳ **REQUIRED**: Test actual quota exhaustion to capture error message
2. ⏳ **REQUIRED**: Document exact error pattern when quota runs out
3. ⏳ **REQUIRED**: Test if different models have separate quotas

**Workaround Options**:
- Track usage locally (estimate token consumption)
- Parse error messages when quota exhausted
- Set conservative usage limits

---

## Q2: Model Selection 🔴 BLOCKER

### Findings

**No CLI Model Selection**:
```bash
$ antigravity chat --help
# No --model or --provider flags listed

$ antigravity chat --model gemini-pro "test"
# Warning: 'model' is not in the list of known options for subcommand 'chat'
# (But command still executes - uses default model)
```

**Available Flags**:
- `-m --mode <mode>` - Chat mode (ask/edit/agent)
- `-a --add-file <path>` - Add context files
- `--maximize` - Maximize chat view
- `-r --reuse-window` - Reuse last window
- `-n --new-window` - Open new window

**No Model Configuration in Settings**:
- Checked `~/Library/Application Support/Antigravity/User/settings.json`
- No model or provider settings found
- Settings appear to be UI preferences only

### Implications

**For Finance Manager**:
- ❌ Cannot switch models via CLI
- ❌ Cannot specify which model to use per request
- ⚠️ Model selection happens in Antigravity GUI only

**Critical Questions**:
1. ⏳ How does Antigravity decide which model to use?
2. ⏳ Can we change the default model programmatically?
3. ⏳ Do different models share the same quota?
4. ⏳ Can we detect which model was used for a response?

**Potential Solutions**:
1. **GUI Automation**: Use AppleScript/UI automation to change model in GUI
2. **Multiple Antigravity Instances**: Configure different instances with different models
3. **External Providers**: Fall back to OpenAI/Anthropic SDKs directly
4. **User Configuration**: Ask user to manually set model in GUI

---

## Recommended Architecture Changes

### Finance Manager Redesign

```typescript
interface FinanceManager {
  // PRIMARY: Antigravity (GUI-configured model)
  // - Use until quota exhausted
  // - Detect exhaustion via error parsing
  // - Track usage locally
  
  // FALLBACK: External APIs
  // - OpenAI SDK (direct API calls)
  // - Anthropic SDK (direct API calls)
  // - Full control over model selection
  
  // STRATEGY:
  // 1. Start with Antigravity (free/included)
  // 2. On quota error, switch to OpenAI
  // 3. On OpenAI quota error, switch to Anthropic
  // 4. On all exhausted, enter polling mode
}
```

### Provider Priority

1. **Antigravity** (Priority 1)
   - Use GUI-configured model
   - No cost tracking needed (included)
   - Switch on error detection

2. **OpenAI** (Priority 2)
   - Direct API via SDK
   - Full model control
   - Explicit quota management

3. **Anthropic** (Priority 3)
   - Direct API via SDK
   - Full model control
   - Explicit quota management

---

## Conclusion

**Can we proceed with implementation?**

**YES, with modifications**:

1. **Antigravity as primary** ✅
   - Use for initial requests
   - Accept GUI model configuration
   - Detect quota via errors

2. **External APIs as fallbacks** ✅
   - Implement OpenAI adapter
   - Implement Anthropic adapter
   - Switch on Antigravity quota exhaustion

3. **Simplified Finance Manager** ✅
   - Error-based detection (not proactive)
   - Local usage tracking
   - Provider switching works

**Blockers resolved**: Architecture adjusted to work within Antigravity's limitations.

**Next step**: Update technical/technical_spec.md and development/original_plan.md with findings, then proceed to Phase 0.
