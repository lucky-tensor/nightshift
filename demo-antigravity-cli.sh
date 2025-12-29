#!/usr/bin/env bash
# Demo script to test Antigravity CLI chat functionality

ANTIGRAVITY="/Applications/Antigravity.app/Contents/Resources/app/bin/antigravity"

echo "🧪 Antigravity CLI Demo"
echo "======================="
echo ""

# Test 1: Simple chat
echo "📝 Test 1: Simple chat query"
echo "Command: antigravity chat 'What is 2+2?'"
$ANTIGRAVITY chat "What is 2+2?"
echo ""

# Test 2: Agent mode
echo "📝 Test 2: Agent mode (creating a file)"
echo "Command: antigravity chat --mode agent 'Create a simple hello.txt file with Hello World'"
$ANTIGRAVITY chat --mode agent "Create a simple hello.txt file with Hello World"
echo ""

# Test 3: Piped input
echo "📝 Test 3: Piped input"
echo "Command: echo 'def add(a, b): return a + b' | antigravity chat 'Explain this code' -"
echo "def add(a, b): return a + b" | $ANTIGRAVITY chat "Explain this code" -
echo ""

# Test 4: With file context
echo "📝 Test 4: With file context"
if [ -f "ANTIGRAVITY_CLI_GUIDE.md" ]; then
    echo "Command: antigravity chat 'Summarize this guide in one sentence' -a ANTIGRAVITY_CLI_GUIDE.md"
    $ANTIGRAVITY chat "Summarize this guide in one sentence" -a ANTIGRAVITY_CLI_GUIDE.md
else
    echo "⚠️  Skipping - ANTIGRAVITY_CLI_GUIDE.md not found"
fi
echo ""

echo "✅ Demo complete!"
echo ""
echo "💡 The commands were sent to Antigravity IDE."
echo "   Check the Antigravity window to see the AI responses!"
