import { execSync } from "child_process";

/**
 * Tool: runCommand
 * Executes a shell command in the project worktree.
 */
export const runCommand = {
    description: "Execute a shell command",
    args: {
        command: { type: "string", description: "The command to run" },
    },
    async execute({ command }: { command: string }) {
        try {
            const output = execSync(command, { encoding: "utf-8", timeout: 60000 });
            return output || "Command executed successfully.";
        } catch (error: any) {
            return `Error: ${error.stderr || error.message}`;
        }
    },
};
