#!/bin/bash
set -e

# Ensure bun is available
export PATH=$PATH:$HOME/.bun/bin

VERSION=$(grep -oE '"version": "[^"]+"' package.json | cut -d'"' -f4)
DIST_DIR="./dist/releases/$VERSION"
mkdir -p "$DIST_DIR"

echo "Building Nightshift v$VERSION..."

# Targets
targets=(
  "bun-linux-x64"
  "bun-linux-arm64"
  "bun-darwin-x64"
  "bun-darwin-arm64"
  # "bun-windows-x64" # Optional
)

for target in "${targets[@]}"; do
  echo "Building for $target..."
  
  # Map target to friendly name
  if [[ "$target" == "bun-linux-x64" ]]; then
    filename="nightshift-linux-amd64"
  elif [[ "$target" == "bun-linux-arm64" ]]; then
    filename="nightshift-linux-arm64"
  elif [[ "$target" == "bun-darwin-x64" ]]; then
    filename="nightshift-darwin-amd64"
  elif [[ "$target" == "bun-darwin-arm64" ]]; then
    filename="nightshift-darwin-arm64"
  elif [[ "$target" == "bun-windows-x64" ]]; then
    filename="nightshift-windows-amd64.exe"
  fi

  bun build --compile ./src/cli.tsx --outfile "$DIST_DIR/$filename" --target "$target"
done

echo "Build complete. Artifacts in $DIST_DIR"
ls -lh "$DIST_DIR"
