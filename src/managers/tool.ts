/**
 * Tool Manager
 *
 * Defines and registers tools that the AI agent can use in its autonomy loop.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { execSync } from "child_process";
import { join } from "path";

export class ToolManager {
    /**
     * Get tool definitions for OpenCode
     */
    getToolDefinitions() {
        return [
            {
                name: "readFile",
                description: "Read the contents of a file in the project worktree",
                parameters: {
                    type: "object",
                    properties: {
                        path: { type: "string", description: "Relative path to the file" },
                    },
                    required: ["path"],
                },
            },
            {
                name: "writeFile",
                description: "Write content to a file in the project worktree",
                parameters: {
                    type: "object",
                    properties: {
                        path: { type: "string", description: "Relative path to the file" },
                        content: { type: "string", description: "Content to write" },
                    },
                    required: ["path", "content"],
                },
            },
            {
                name: "runCommand",
                description: "Run a shell command in the project worktree",
                parameters: {
                    type: "object",
                    properties: {
                        command: { type: "string", description: "Shell command to execute" },
                    },
                    required: ["command"],
                },
            },
        ];
    }

    /**
     * Execute a tool call
     */
    executeTool(name: string, args: any, worktreePath: string): any {
        const fullPath = (relPath: string) => join(worktreePath, relPath);

        switch (name) {
            case "readFile":
                if (!existsSync(fullPath(args.path)))
                    return `Error: File not found at ${args.path}`;
                return readFileSync(fullPath(args.path), "utf-8");

            case "writeFile":
                writeFileSync(fullPath(args.path), args.content, "utf-8");
                return `Successfully wrote to ${args.path}`;

            case "runCommand":
                try {
                    const output = execSync(args.command, {
                        cwd: worktreePath,
                        timeout: 60000,
                    }).toString();
                    return output || "Command executed successfully (no output).";
                } catch (error) {
                    return `Error executing command: ${(error as any).stderr?.toString() || (error as any).message}`;
                }

            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    }
}
