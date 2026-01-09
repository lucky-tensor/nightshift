# Technical Questions & Investigations

This document tracks technical questions that need resolution before implementation can proceed. These are potential blockers that require research, prototyping, or testing.

## Status Legend
- 🔴 **BLOCKER** - Must be resolved before proceeding
- 🟡 **HIGH PRIORITY** - Should be resolved soon
- 🟢 **MEDIUM PRIORITY** - Can be deferred
- ⚪ **LOW PRIORITY** - Nice to have

---

## Q1: Finance Manager - Quota Detection 🔴 BLOCKER

**Question**: Can the Finance Manager detect when an Antigravity agent has run out of inference capability/quota?

### Context
The Finance Manager needs to monitor when agents exhaust their API quota to trigger provider switching. This is critical for autonomous operation.

### What We Need to Determine

1. **Error Detection**
   - What error/response does Antigravity CLI return when quota is exhausted?
   - Is it a specific exit code, error message, or response format?
   - Can we distinguish quota errors from other failures?

2. **Proactive Monitoring**
   - Can we query remaining quota before it runs out?
   - Does Antigravity expose quota/usage information?
   - Can we use "noop" probes to check quota status?

### Investigation Steps

#### Step 1: Test Quota Exhaustion
```bash
# Create a test script that intentionally exhausts quota
# Monitor the response/error

antigravity chat --mode agent "Simple task" 2>&1 | tee quota-test.log

# Check exit code
echo "Exit code: $?"

# Examine error output
cat quota-test.log
```

#### Step 2: Check for Quota API
```bash
# Check if there's a status/quota command
antigravity --help | grep -i quota
antigravity --help | grep -i usage
antigravity --help | grep -i limit

# Try common patterns
antigravity --status
antigravity quota
antigravity usage
```

#### Step 3: Test Noop Probe
```bash
# Minimal request to check if service is available
antigravity chat --mode ask "test" 2>&1

# Measure response time and check for quota errors
time antigravity chat --mode ask "1+1" 2>&1
```

### Expected Outcomes

**Best Case**: 
- Clear error message/code when quota exhausted
- API to check remaining quota
- Noop probes work reliably

**Acceptable Case**:
- Detectable error pattern when quota exhausted
- Noop probes work (even without quota API)

**Worst Case**:
- No clear quota detection mechanism
- **Mitigation**: Track usage locally, estimate quota consumption

### Success Criteria
- [ ] Document exact error response when quota exhausted
- [ ] Identify method to detect quota status (API or error pattern)
- [ ] Verify noop probe works without consuming significant quota
- [ ] Create test script that reliably detects quota exhaustion

---

## Q2: Finance Manager - Model Provider Switching 🔴 BLOCKER

**Question**: Can the Finance Manager switch an active Antigravity chat session to a different model provider?

### Context
When quota is exhausted, we need to continue the same conversation using a different LLM provider. 

**Important**: Antigravity has multiple built-in models:
- **Gemini** models (Google)
- **Claude Sonnet** and **Claude Opus** (Anthropic)
- **GPT-OSS** (OpenAI)

This means we may be able to switch models *within* Antigravity rather than switching to external providers.

### What We Need to Determine

1. **Model Selection**
   - Can we specify which model to use via CLI? (e.g., `--model gemini-pro`)
   - How does Antigravity manage quota across different models?
   - Can we switch models mid-conversation?
   - Does each model have separate quota/billing?

2. **Conversation Continuity**
   - Can we export/import conversation history?
   - Can we resume a conversation with a different model?
   - How do we maintain context across provider switches?

3. **Provider Configuration**
   - Where are LLM providers configured in Antigravity?
   - Can we add/configure providers programmatically?
   - What providers does Antigravity support?

### Investigation Steps

#### Step 1: Check Model Selection Options
```bash
# Check for model-related flags
antigravity chat --help | grep -i model
antigravity chat --help | grep -i provider

# Try specifying different models
antigravity chat --model "gemini-pro" "test"
antigravity chat --model "claude-sonnet" "test"
antigravity chat --model "claude-opus" "test"
antigravity chat --model "gpt-4" "test"

# Check if there's a way to list available models
antigravity --list-models
antigravity models
```

#### Step 2: Explore Configuration
```bash
# Find Antigravity config directory
ls -la ~/Library/Application\ Support/Antigravity/
ls -la ~/.antigravity/
ls -la ~/.config/antigravity/

# Look for model/provider configuration
find ~/Library/Application\ Support/Antigravity/ -name "*.json" -o -name "*.yaml" 2>/dev/null
```

#### Step 3: Test Conversation Export/Import
```bash
# Check if there's a way to export conversation
antigravity chat --help | grep -i export
antigravity chat --help | grep -i save
antigravity chat --help | grep -i history

# Check if we can reference previous conversations
antigravity chat --help | grep -i conversation
antigravity chat --help | grep -i session
```

#### Step 4: Test Multi-Provider Setup
```bash
# Try to configure multiple providers
# (This may require GUI configuration)

# Test if we can switch between them
antigravity chat --model "gemini-pro" "test 1"
antigravity chat --model "gpt-4" "test 2"
```

### Expected Outcomes

**Best Case**:
- CLI flag to specify model/provider
- Conversation export/import capability
- Multiple providers configurable

**Acceptable Case**:
- Can specify provider per invocation
- Can maintain context by re-sending history
- **Approach**: Export conversation history, replay to new provider

**Worst Case**:
- No provider switching capability
- **Mitigation**: Each provider switch starts fresh conversation
- **Workaround**: Use project state files to maintain context

### Success Criteria
- [ ] Document how to specify model/provider via CLI
- [ ] Identify method to maintain conversation context across switches
- [ ] Test successful provider switch with context preservation
- [ ] Document provider configuration process

---

## Q3: Antigravity CLI - Conversation State Management 🟡 HIGH PRIORITY

**Question**: How does Antigravity manage conversation state, and can we control it programmatically?

### Context
For long-running agents, we need to save/restore conversation state, especially when:
- Agent is paused/resumed
- Provider is switched
- System restarts

### Investigation Steps

#### Step 1: Understand Window/Session Management
```bash
# Test window reuse
antigravity chat --reuse-window "Task 1"
antigravity chat --reuse-window "Task 2"  # Does this continue conversation?

# Test new window
antigravity chat --new-window "Task 3"
antigravity chat --new-window "Task 4"
```

#### Step 2: Find Conversation Storage
```bash
# Look for conversation history files
find ~/Library/Application\ Support/Antigravity/ -type f -name "*conversation*" -o -name "*chat*" -o -name "*history*" 2>/dev/null

# Check recent files
ls -lt ~/Library/Application\ Support/Antigravity/ | head -20
```

#### Step 3: Test State Persistence
```bash
# Start conversation
antigravity chat --mode agent "Remember: my name is TestUser"

# Close Antigravity completely
killall Antigravity

# Restart and check if it remembers
antigravity chat --reuse-window "What is my name?"
```

### Success Criteria
- [ ] Document conversation state storage location
- [ ] Identify how to save/restore conversation programmatically
- [ ] Test state persistence across restarts

---

## Q4: Antigravity CLI - Exit Codes and Error Handling 🟡 HIGH PRIORITY

**Question**: What exit codes and error patterns does Antigravity CLI use?

### Context
We need to programmatically detect different failure modes:
- Quota exhaustion
- Network errors
- Invalid input
- Agent failures
- Timeout

### Investigation Steps

#### Step 1: Test Various Failure Modes
```bash
# Test invalid input
antigravity chat --mode invalid "test"
echo "Exit code: $?"

# Test network failure (disconnect wifi)
antigravity chat "test"
echo "Exit code: $?"

# Test timeout (if possible)
timeout 5s antigravity chat --mode agent "Long running task"
echo "Exit code: $?"
```

#### Step 2: Capture Error Formats
```bash
# Capture stderr for different errors
antigravity chat --mode agent "test" 2>error.log
cat error.log

# Check for JSON error responses
antigravity chat "test" 2>&1 | jq . 2>/dev/null
```

### Success Criteria
- [ ] Document all exit codes and their meanings
- [ ] Create error pattern matching rules
- [ ] Build error classification system

---

## Q5: Antigravity CLI - Performance and Rate Limits 🟢 MEDIUM PRIORITY

**Question**: What are the performance characteristics and rate limits of Antigravity CLI?

### Context
Understanding performance helps us:
- Set appropriate timeouts
- Optimize noop probes
- Avoid rate limiting

### Investigation Steps

#### Step 1: Measure Response Times
```bash
# Measure minimal request
time antigravity chat --mode ask "1+1"

# Measure with file context
time antigravity chat --mode ask "summarize" -a largefile.txt

# Measure agent mode startup
time antigravity chat --mode agent "echo hello"
```

#### Step 2: Test Rate Limits
```bash
# Rapid requests
for i in {1..10}; do
  time antigravity chat --mode ask "test $i" 2>&1 | grep -i "rate\|limit\|quota"
done
```

### Success Criteria
- [ ] Document typical response times
- [ ] Identify rate limit thresholds
- [ ] Optimize noop probe frequency

---

## Investigation Priority Order

1. **Q1: Quota Detection** 🔴 - Start immediately
2. **Q2: Provider Switching** 🔴 - Start immediately (can run parallel with Q1)
3. **Q4: Exit Codes** 🟡 - Start after Q1/Q2 basics understood
4. **Q3: State Management** 🟡 - Can be deferred slightly
5. **Q5: Performance** 🟢 - Can be deferred to Phase 2

---

## Next Steps

### Immediate Actions (Before Phase 1)
1. Set up test environment with Antigravity CLI
2. Run Q1 investigation (quota detection)
3. Run Q2 investigation (provider switching)
4. Document findings in this file
5. Update technical/technical_spec.md and development/original_plan.md based on findings

### Decision Points

**If Q1/Q2 are fully supported:**
- Proceed with implementation as planned
- Finance Manager can work as designed

**If Q1/Q2 are partially supported:**
- Adjust Finance Manager design
- May need workarounds (local quota tracking, context replay)

**If Q1/Q2 are not supported:**
- **CRITICAL**: May need to reconsider Antigravity as primary adapter
- **Alternative**: Build OpenAI/Anthropic adapters first
- **Fallback**: Implement basic version without provider switching

---

## Investigation Results

### Q1: Quota Detection
**Status**: 🔴 NOT STARTED

**Findings**:
- [ ] TBD

**Conclusion**:
- [ ] TBD

---

### Q2: Provider Switching
**Status**: 🔴 NOT STARTED

**Findings**:
- [ ] TBD

**Conclusion**:
- [ ] TBD

---

## Updates Log

| Date | Question | Update |
|------|----------|--------|
| 2025-12-26 | All | Initial document created |
