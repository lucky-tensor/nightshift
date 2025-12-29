import { execSync } from "child_process";
import { readFileSync, writeFileSync, existsSync, readdirSync } from "fs";
import { join, isAbsolute, relative } from "path";
import { globSync } from "glob";

export class ToolExecutor {
    private cwd: string;

    constructor(cwd: string) {
        this.cwd = cwd;
    }

    execute(toolName: string, args: any): string {
        switch (toolName) {
            case "bash":
                return this.bash(args.command);
            case "read":
                return this.read(args.filePath);
            case "write":
                return this.write(args.filePath, args.content);
            case "edit":
                return this.edit(args.filePath, args.oldString, args.newString, args.replaceAll);
            case "glob":
                return this.glob(args.pattern);
            default:
                throw new Error(`Unknown tool: ${toolName}`);
        }
    }

    private resolvePath(filePath: string): string {
        // If absolute, check if it's within CWD (security)
        // For MVP, we trust the agent but ensure we resolve relative paths to CWD
        if (isAbsolute(filePath)) return filePath;
        return join(this.cwd, filePath);
    }

    private bash(command: string): string {
        try {
            // Run in CWD
            const output = execSync(command, { cwd: this.cwd, encoding: "utf-8" });
            return output || "(no output)";
        } catch (e: any) {
            return `Error: ${e.message}\nStdout: ${e.stdout}\nStderr: ${e.stderr}`;
        }
    }

    private read(filePath: string): string {
        const path = this.resolvePath(filePath);
        try {
            if (!existsSync(path)) return `Error: File not found: ${filePath}`;
            const content = readFileSync(path, "utf-8");

            // Add line numbers
            const lines = content.split("\n");
            const numbered = lines.map((line, i) => `${i + 1}\t${line}`).join("\n");
            return numbered;
        } catch (e) {
            return `Error reading file: ${e}`;
        }
    }

    private write(filePath: string, content: string): string {
        const path = this.resolvePath(filePath);
        try {
            writeFileSync(path, content, "utf-8");
            return `Successfully wrote to ${filePath}`;
        } catch (e) {
            return `Error writing file: ${e}`;
        }
    }

    private edit(
        filePath: string,
        oldString: string,
        newString: string,
        replaceAll: boolean = false
    ): string {
        const path = this.resolvePath(filePath);
        try {
            if (!existsSync(path)) return `Error: File not found: ${filePath}`;
            const content = readFileSync(path, "utf-8");

            if (!content.includes(oldString)) {
                return "Error: oldString not found in content";
            }

            let newContent;
            if (replaceAll) {
                newContent = content.split(oldString).join(newString);
            } else {
                newContent = content.replace(oldString, newString);
            }

            writeFileSync(path, newContent, "utf-8");
            return `Successfully edited ${filePath}`;
        } catch (e) {
            return `Error editing file: ${e}`;
        }
    }

    private glob(pattern: string): string {
        try {
            const files = globSync(pattern, { cwd: this.cwd });
            return files.join("\n") || "No matches found";
        } catch (e) {
            return `Error executing glob: ${e}`;
        }
    }
}
