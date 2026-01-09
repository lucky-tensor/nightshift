#!/bin/bash
set -e

# Repository configuration (Update these!)
REPO="lucky-tensor/nightshift" # Example: username/repo
BINARY_NAME="nightshift"
INSTALL_DIR="/usr/local/bin"

# Ensure OpenCode is installed
if ! command -v opencode &> /dev/null; then
    echo "OpenCode not found. Installing..."
    curl -fsSL https://opencode.ai/install | bash
else
    echo "OpenCode is already installed."
fi

# Detect OS and Architecture
OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"

if [ "$OS" == "linux" ]; then
    if [ "$ARCH" == "x86_64" ]; then
        TARGET="linux-amd64"
    elif [ "$ARCH" == "aarch64" ]; then
        TARGET="linux-arm64"
    else
        echo "Unsupported architecture: $ARCH"
        exit 1
    fi
elif [ "$OS" == "darwin" ]; then
    if [ "$ARCH" == "x86_64" ]; then
        TARGET="darwin-amd64"
    elif [ "$ARCH" == "arm64" ]; then
        TARGET="darwin-arm64"
    else
        echo "Unsupported architecture: $ARCH"
        exit 1
    fi
else
    echo "Unsupported OS: $OS"
    exit 1
fi

echo "Detected platform: $OS-$ARCH ($TARGET)"

# Determine download URL
# Uses GitHub "latest" release redirect to find the version
LATEST_URL="https://github.com/$REPO/releases/latest/download/$BINARY_NAME-$TARGET"

# Check if user has write access to INSTALL_DIR, otherwise use sudo
USE_SUDO=""
if [ ! -w "$INSTALL_DIR" ]; then
    echo "Sudo access required to install to $INSTALL_DIR"
    USE_SUDO="sudo"
fi

echo "Downloading $BINARY_NAME from $LATEST_URL..."
curl -fsSL "$LATEST_URL" -o "$BINARY_NAME"

echo "Installing to $INSTALL_DIR..."
chmod +x "$BINARY_NAME"
$USE_SUDO mv "$BINARY_NAME" "$INSTALL_DIR/$BINARY_NAME"

echo "$BINARY_NAME installed successfully!"
echo "Run '$BINARY_NAME --help' to get started."
