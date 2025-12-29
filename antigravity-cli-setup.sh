#!/usr/bin/env bash
# Antigravity CLI Setup Script
# This script sets up convenient access to the Antigravity CLI

ANTIGRAVITY_BIN="/Applications/Antigravity.app/Contents/Resources/app/bin/antigravity"

echo "🚀 Antigravity CLI Setup"
echo "========================"
echo ""

# Check if Antigravity is installed
if [ ! -f "$ANTIGRAVITY_BIN" ]; then
    echo "❌ Error: Antigravity not found at $ANTIGRAVITY_BIN"
    exit 1
fi

echo "✅ Antigravity found at: $ANTIGRAVITY_BIN"
echo ""

# Add to PATH by creating a symlink
echo "📝 Adding Antigravity to PATH..."
sudo ln -sf "$ANTIGRAVITY_BIN" /usr/local/bin/antigravity

if [ $? -eq 0 ]; then
    echo "✅ Symlink created at /usr/local/bin/antigravity"
else
    echo "⚠️  Could not create symlink (may need sudo)"
fi

echo ""
echo "🎯 Available Commands:"
echo "  antigravity --help              # Show all options"
echo "  antigravity chat 'prompt'       # Send a chat message"
echo "  antigravity chat --mode agent   # Use agent mode"
echo "  antigravity chat --mode edit    # Use edit mode"
echo "  antigravity chat --mode ask     # Use ask mode"
echo "  antigravity chat -a file.py     # Add file as context"
echo ""
echo "📚 Example Usage:"
echo "  antigravity chat 'Explain this code' -a myfile.py"
echo "  antigravity chat --mode agent 'Create a REST API'"
echo "  cat error.log | antigravity chat 'Debug this error' -"
echo ""
echo "✨ Setup complete!"
