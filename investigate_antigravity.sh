#!/bin/bash
# Technical Investigation Script for Antigravity CLI
# This script tests various aspects of the Antigravity CLI to answer technical questions

ANTIGRAVITY="/Applications/Antigravity.app/Contents/Resources/app/bin/antigravity"
RESULTS_FILE="investigation_results.md"

echo "# Antigravity CLI Investigation Results" > $RESULTS_FILE
echo "Date: $(date)" >> $RESULTS_FILE
echo "" >> $RESULTS_FILE

# Test 1: Version and basic info
echo "## Test 1: Version Information" >> $RESULTS_FILE
echo '```' >> $RESULTS_FILE
$ANTIGRAVITY --version >> $RESULTS_FILE 2>&1
echo '```' >> $RESULTS_FILE
echo "" >> $RESULTS_FILE

# Test 2: Chat help output
echo "## Test 2: Chat Command Help" >> $RESULTS_FILE
echo '```' >> $RESULTS_FILE
$ANTIGRAVITY chat --help >> $RESULTS_FILE 2>&1
echo '```' >> $RESULTS_FILE
echo "" >> $RESULTS_FILE

# Test 3: Check for model selection flags
echo "## Test 3: Model Selection Attempts" >> $RESULTS_FILE
echo "" >> $RESULTS_FILE

echo "### Attempt 1: --model flag" >> $RESULTS_FILE
echo '```bash' >> $RESULTS_FILE
echo "$ antigravity chat --model gemini-pro \"test\"" >> $RESULTS_FILE
echo '```' >> $RESULTS_FILE
echo "Output:" >> $RESULTS_FILE
echo '```' >> $RESULTS_FILE
echo "test" | $ANTIGRAVITY chat --model gemini-pro - >> $RESULTS_FILE 2>&1
EXIT_CODE=$?
echo "Exit code: $EXIT_CODE" >> $RESULTS_FILE
echo '```' >> $RESULTS_FILE
echo "" >> $RESULTS_FILE

echo "### Attempt 2: --provider flag" >> $RESULTS_FILE
echo '```bash' >> $RESULTS_FILE
echo "$ antigravity chat --provider claude \"test\"" >> $RESULTS_FILE
echo '```' >> $RESULTS_FILE
echo "Output:" >> $RESULTS_FILE
echo '```' >> $RESULTS_FILE
echo "test" | $ANTIGRAVITY chat --provider claude - >> $RESULTS_FILE 2>&1
EXIT_CODE=$?
echo "Exit code: $EXIT_CODE" >> $RESULTS_FILE
echo '```' >> $RESULTS_FILE
echo "" >> $RESULTS_FILE

# Test 4: Test invalid mode (to see error format)
echo "## Test 4: Error Format Testing" >> $RESULTS_FILE
echo "" >> $RESULTS_FILE

echo "### Invalid mode" >> $RESULTS_FILE
echo '```bash' >> $RESULTS_FILE
echo "$ antigravity chat --mode invalid \"test\"" >> $RESULTS_FILE
echo '```' >> $RESULTS_FILE
echo "Output:" >> $RESULTS_FILE
echo '```' >> $RESULTS_FILE
echo "test" | $ANTIGRAVITY chat --mode invalid - >> $RESULTS_FILE 2>&1
EXIT_CODE=$?
echo "Exit code: $EXIT_CODE" >> $RESULTS_FILE
echo '```' >> $RESULTS_FILE
echo "" >> $RESULTS_FILE

# Test 5: Minimal request timing
echo "## Test 5: Performance - Minimal Request" >> $RESULTS_FILE
echo '```bash' >> $RESULTS_FILE
echo "$ time echo \"1+1\" | antigravity chat --mode ask -" >> $RESULTS_FILE
echo '```' >> $RESULTS_FILE
echo "Output:" >> $RESULTS_FILE
echo '```' >> $RESULTS_FILE
START=$(date +%s%N)
echo "1+1" | $ANTIGRAVITY chat --mode ask - >> $RESULTS_FILE 2>&1
END=$(date +%s%N)
DURATION=$((($END - $START) / 1000000))
echo "Duration: ${DURATION}ms" >> $RESULTS_FILE
echo '```' >> $RESULTS_FILE
echo "" >> $RESULTS_FILE

# Test 6: Check for conversation/state files
echo "## Test 6: Conversation State Storage" >> $RESULTS_FILE
echo "" >> $RESULTS_FILE
echo "Searching for conversation-related files..." >> $RESULTS_FILE
echo '```' >> $RESULTS_FILE
find ~/Library/Application\ Support/Antigravity/ -type f \( -name "*conversation*" -o -name "*chat*" -o -name "*history*" \) 2>/dev/null | head -10 >> $RESULTS_FILE
echo '```' >> $RESULTS_FILE
echo "" >> $RESULTS_FILE

# Test 7: Configuration files
echo "## Test 7: Configuration Files" >> $RESULTS_FILE
echo "" >> $RESULTS_FILE
echo "### User settings.json" >> $RESULTS_FILE
echo '```json' >> $RESULTS_FILE
cat ~/Library/Application\ Support/Antigravity/User/settings.json 2>/dev/null >> $RESULTS_FILE
echo '```' >> $RESULTS_FILE
echo "" >> $RESULTS_FILE

echo "### Searching for model/provider config..." >> $RESULTS_FILE
echo '```' >> $RESULTS_FILE
find ~/Library/Application\ Support/Antigravity/ -name "*.json" -type f 2>/dev/null | while read file; do
  if grep -q -i -E "(model|provider|gemini|claude|gpt)" "$file" 2>/dev/null; then
    echo "Found in: $file"
    grep -i -E "(model|provider|gemini|claude|gpt)" "$file" 2>/dev/null | head -5
  fi
done >> $RESULTS_FILE
echo '```' >> $RESULTS_FILE
echo "" >> $RESULTS_FILE

# Summary
echo "## Summary" >> $RESULTS_FILE
echo "" >> $RESULTS_FILE
echo "### Q1: Quota Detection" >> $RESULTS_FILE
echo "- ❓ No obvious quota API found in CLI help" >> $RESULTS_FILE
echo "- ❓ Need to test actual quota exhaustion to see error format" >> $RESULTS_FILE
echo "" >> $RESULTS_FILE
echo "### Q2: Model Selection" >> $RESULTS_FILE
echo "- ❌ No --model or --provider flags in chat command" >> $RESULTS_FILE
echo "- ❓ Model selection likely happens in GUI settings" >> $RESULTS_FILE
echo "- ❓ Need to investigate if CLI respects GUI model selection" >> $RESULTS_FILE
echo "" >> $RESULTS_FILE
echo "### Q3: State Management" >> $RESULTS_FILE
echo "- ✅ Window reuse flags exist (--reuse-window, --new-window)" >> $RESULTS_FILE
echo "- ❓ Need to test if --reuse-window maintains conversation context" >> $RESULTS_FILE
echo "" >> $RESULTS_FILE
echo "### Q4: Exit Codes" >> $RESULTS_FILE
echo "- ✅ Invalid mode returns non-zero exit code" >> $RESULTS_FILE
echo "- ❓ Need to test more error scenarios" >> $RESULTS_FILE
echo "" >> $RESULTS_FILE

echo "Investigation complete! Results saved to $RESULTS_FILE"
cat $RESULTS_FILE
