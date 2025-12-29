#!/bin/bash
# Quick Antigravity CLI Investigation

ANTIGRAVITY="/Applications/Antigravity.app/Contents/Resources/app/bin/antigravity"

echo "=== ANTIGRAVITY CLI INVESTIGATION ==="
echo ""

echo "1. VERSION"
$ANTIGRAVITY --version
echo ""

echo "2. CHAT HELP (checking for model/provider flags)"
$ANTIGRAVITY chat --help | grep -i -E "(model|provider|gemini|claude|gpt)" || echo "No model/provider flags found"
echo ""

echo "3. TESTING --model FLAG"
echo "test" | $ANTIGRAVITY chat --model gemini-pro - 2>&1 | head -5
echo "Exit code: $?"
echo ""

echo "4. TESTING INVALID MODE (to see error format)"
echo "test" | $ANTIGRAVITY chat --mode invalid - 2>&1
echo "Exit code: $?"
echo ""

echo "5. CHECKING FOR CONVERSATION STATE FILES"
find ~/Library/Application\ Support/Antigravity/ -type f -name "*chat*" 2>/dev/null | head -5
echo ""

echo "6. CHECKING USER SETTINGS"
if [ -f ~/Library/Application\ Support/Antigravity/User/settings.json ]; then
  echo "User settings.json exists"
  grep -i -E "(model|provider)" ~/Library/Application\ Support/Antigravity/User/settings.json || echo "No model/provider settings found"
else
  echo "No settings.json found"
fi
echo ""

echo "=== INVESTIGATION COMPLETE ==="
