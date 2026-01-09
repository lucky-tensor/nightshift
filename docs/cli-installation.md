# Nightshift CLI Installation Guide

Nightshift is distributed as a standalone binary for Linux, macOS, and Windows. It relies on the [Bun](https://bun.sh) runtime, which is bundled directly into the executable, ensuring no external dependencies (like Node.js or Opencode) are required to run it.

## Quick Install (Linux & macOS)

The easiest way to install Nightshift is via our automatic installer script. This will download the correct binary for your system and install it to `/usr/local/bin`.

```bash
curl -fsSL https://raw.githubusercontent.com/opencode-ai/nightshift/main/install.sh | bash
```

_Note: You may be prompted for your password if `sudo` is required to write to `/usr/local/bin`._

## Manual Installation

If you prefer to install manually, you can download the pre-compiled binaries from our [GitHub Releases](https://github.com/opencode-ai/nightshift/releases) page.

1.  **Download** the binary for your platform:
    - **Linux (x64):** `nightshift-linux-amd64`
    - **Linux (ARM64):** `nightshift-linux-arm64`
    - **macOS (Intel):** `nightshift-darwin-amd64`
    - **macOS (Apple Silicon):** `nightshift-darwin-arm64`
    - **Windows:** `nightshift-windows-amd64.exe`

2.  **Make it executable** (Linux/macOS only):

    ```bash
    chmod +x nightshift-linux-amd64
    ```

3.  **Move to your PATH**:

    ```bash
    mv nightshift-linux-amd64 /usr/local/bin/nightshift
    ```

4.  **Verify installation**:
    ```bash
    nightshift --help
    ```

## Building from Source

If you want to build the CLI yourself, you will need [Bun](https://bun.sh) installed.

1.  **Clone the repository**:

    ```bash
    git clone https://github.com/opencode-ai/nightshift.git
    cd nightshift
    ```

2.  **Install dependencies**:

    ```bash
    bun install
    ```

3.  **Build the binary**:

    ```bash
    # For your current platform
    bun build --compile ./src/cli.tsx --outfile nightshift
    ```

4.  **Run**:
    ```bash
    ./nightshift --help
    ```

## Troubleshooting

### "Command not found"

Ensure that the directory where you installed the binary (e.g., `/usr/local/bin`) is in your system's `PATH`.

### Permission denied

If you cannot run the binary, ensure you have set the executable permission:

```bash
chmod +x /path/to/nightshift
```

### macOS Security Warning

On macOS, you might see a warning that the developer cannot be verified. You can allow the app to run by going to **System Settings > Privacy & Security** and clicking "Allow Anyway" for Nightshift.
