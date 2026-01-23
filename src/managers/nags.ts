import { execSync } from "child_process";
import type { ExecSyncOptions } from "child_process";
import type { Nag, NagResult, NagReport, ToolNag, AgentNag, NagConfig } from "../types/nags";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { DEFAULT_NAG_CONFIG } from "../types/nags";

export class NagsManager {
    private rootPath: string;
    private nagsDir: string;
    private configPath: string;

    constructor(rootPath: string) {
        this.rootPath = rootPath;
        this.nagsDir = join(this.rootPath, ".nightshift", "nags");
        this.configPath = join(this.nagsDir, "nags.json");
    }

    ensureNagsDir(): void {
        if (!existsSync(this.nagsDir)) {
            mkdirSync(this.nagsDir, { recursive: true });
        }
    }

    getConfigPath(): string {
        return this.configPath;
    }

    getNagsPath(): string {
        return this.nagsDir;
    }

    loadConfig(): NagConfig {
        if (!existsSync(this.configPath)) {
            return { ...DEFAULT_NAG_CONFIG };
        }

        try {
            const content = readFileSync(this.configPath, "utf-8");
            const config = JSON.parse(content) as NagConfig;
            return { ...DEFAULT_NAG_CONFIG, ...config, nags: config.nags || [] };
        } catch {
            return { ...DEFAULT_NAG_CONFIG };
        }
    }

    saveConfig(config: NagConfig): void {
        this.ensureNagsDir();
        writeFileSync(this.configPath, JSON.stringify(config, null, 2));
    }

    addNag(nag: Nag): void {
        const config = this.loadConfig();
        const existingIndex = config.nags.findIndex((n) => n.id === nag.id);
        if (existingIndex >= 0) {
            config.nags[existingIndex] = nag;
        } else {
            config.nags.push(nag);
        }
        this.saveConfig(config);
    }

    removeNag(nagId: string): boolean {
        const config = this.loadConfig();
        const initialLength = config.nags.length;
        config.nags = config.nags.filter((n) => n.id !== nagId);
        if (config.nags.length !== initialLength) {
            this.saveConfig(config);
            return true;
        }
        return false;
    }

    getNagsForStage(stage: "pre-commit" | "pre-push"): Nag[] {
        const config = this.loadConfig();
        return config.nags.filter((n) => n.enabled && n.stage === stage);
    }

    async executeToolNag(nag: ToolNag): Promise<NagResult> {
        const startTime = Date.now();

        try {
            const options: ExecSyncOptions = {
                stdio: "pipe",
                timeout: (nag.timeout || 60) * 1000,
                cwd: nag.workingDirectory || this.rootPath,
            };

            const output = execSync(nag.command, options).toString();

            let passed = true;
            if (nag.successCriteria === "exit_code_zero") {
                passed = true;
            } else if (nag.successCriteria === "output_contains" && nag.expectedOutput) {
                passed = output.includes(nag.expectedOutput);
            } else if (nag.successCriteria === "output_not_contains" && nag.expectedOutput) {
                passed = !output.includes(nag.expectedOutput);
            }

            return {
                nagId: nag.id,
                status: passed ? "passed" : "failed",
                message: passed
                    ? `Tool nag "${nag.name}" passed`
                    : `Tool nag "${nag.name}" failed: output did not meet criteria`,
                duration: Date.now() - startTime,
                output: output.substring(0, 500),
                timestamp: new Date().toISOString(),
            };
        } catch (error) {
            return {
                nagId: nag.id,
                status: "error",
                message: `Tool nag "${nag.name}" error: ${error instanceof Error ? error.message : "Unknown error"}`,
                duration: Date.now() - startTime,
                timestamp: new Date().toISOString(),
            };
        }
    }

    async executeAgentNag(
        nag: AgentNag,
        client?: any,
        agentRuntime?: { runTask: (project: any, task: any, subagent: string) => Promise<any> }
    ): Promise<NagResult> {
        const startTime = Date.now();

        if (!client && !agentRuntime) {
            return {
                nagId: nag.id,
                status: "skipped",
                message: `Agent nag "${nag.name}" skipped: no agent runtime available`,
                duration: Date.now() - startTime,
                timestamp: new Date().toISOString(),
            };
        }

        try {
            const prompt = nag.prompt;

            let evaluation: "OK" | "NOK" = "NOK";
            let message = "";

            if (agentRuntime && client) {
                const result = await agentRuntime.runTask(
                    { id: "nag-check", name: nag.name, worktreePath: this.rootPath },
                    {
                        id: nag.id,
                        name: nag.name,
                        prompt,
                        expectedOutcome:
                            nag.evaluationCriteria ||
                            "Evaluate if the code meets quality standards",
                        contextSummary: `Agent nag evaluation for ${nag.name}`,
                        agentId: nag.agentId || "engineer",
                    },
                    nag.agentId || "engineer"
                );

                evaluation = result.success ? "OK" : "NOK";
                message = result.message || `Agent evaluation: ${evaluation}`;
            } else {
                message = `Agent nag "${nag.name}" requires agent runtime for execution`;
            }

            return {
                nagId: nag.id,
                status: evaluation === "OK" ? "passed" : "failed",
                evaluation,
                message,
                duration: Date.now() - startTime,
                timestamp: new Date().toISOString(),
            };
        } catch (error) {
            return {
                nagId: nag.id,
                status: "error",
                message: `Agent nag "${nag.name}" error: ${error instanceof Error ? error.message : "Unknown error"}`,
                duration: Date.now() - startTime,
                timestamp: new Date().toISOString(),
            };
        }
    }

    async executeStage(
        stage: "pre-commit" | "pre-push",
        client?: any,
        agentRuntime?: { runTask: (project: any, task: any, subagent: string) => Promise<any> }
    ): Promise<NagReport> {
        const startTime = Date.now();
        const nags = this.getNagsForStage(stage);
        const results: NagResult[] = [];
        let blocked = false;

        const config = this.loadConfig();
        const stageConfig =
            stage === "pre-commit" ? config.defaults.preCommit : config.defaults.prePush;

        for (const nag of nags) {
            let result: NagResult;

            if (nag.type === "tool") {
                result = await this.executeToolNag(nag as ToolNag);
            } else {
                result = await this.executeAgentNag(nag as AgentNag, client, agentRuntime);
            }

            results.push(result);

            if (result.status === "failed" && nag.blocking && stageConfig.blocking) {
                blocked = true;
            }
        }

        const summary = {
            total: results.length,
            passed: results.filter((r) => r.status === "passed").length,
            failed: results.filter((r) => r.status === "failed").length,
            skipped: results.filter((r) => r.status === "skipped").length,
            blocked,
        };

        return {
            stage,
            results,
            summary,
            duration: Date.now() - startTime,
        };
    }

    detectProjectType(): string {
        if (existsSync(join(this.rootPath, "package.json"))) return "nodejs";
        if (existsSync(join(this.rootPath, "bun.lockb"))) return "bun";
        if (existsSync(join(this.rootPath, "Cargo.toml"))) return "rust";
        if (
            existsSync(join(this.rootPath, "pyproject.toml")) ||
            existsSync(join(this.rootPath, "requirements.txt"))
        ) {
            return "python";
        }
        return "unknown";
    }

    applyProjectDefaults(): void {
        const projectType = this.detectProjectType();
        const config = this.loadConfig();

        if (config.nags.length > 0) {
            return;
        }

        const defaultNags: Nag[] = [];

        if (projectType === "nodejs" || projectType === "bun") {
            defaultNags.push({
                id: "format-prettier",
                name: "Prettier Format",
                description: "Ensure code is formatted with Prettier",
                stage: "pre-commit",
                type: "tool",
                enabled: true,
                severity: "warning",
                blocking: false,
                command: "bunx prettier --write .",
                successCriteria: "exit_code_zero",
            });

            defaultNags.push({
                id: "lint-eslint",
                name: "ESLint Check",
                description: "Run ESLint to check for code quality issues",
                stage: "pre-push",
                type: "tool",
                enabled: true,
                severity: "error",
                blocking: true,
                command: "bunx eslint .",
                successCriteria: "exit_code_zero",
            });

            defaultNags.push({
                id: "typecheck-tsc",
                name: "TypeScript Type Check",
                description: "Run TypeScript compiler to check types",
                stage: "pre-push",
                type: "tool",
                enabled: true,
                severity: "error",
                blocking: true,
                command: "npx tsc --noEmit",
                successCriteria: "exit_code_zero",
            });
        } else if (projectType === "rust") {
            defaultNags.push({
                id: "format-cargo-fmt",
                name: "Cargo Format",
                description: "Format Rust code with cargo fmt",
                stage: "pre-commit",
                type: "tool",
                enabled: true,
                severity: "warning",
                blocking: false,
                command: "cargo fmt",
                successCriteria: "exit_code_zero",
            });

            defaultNags.push({
                id: "check-cargo-check",
                name: "Cargo Check",
                description: "Check Rust code for errors",
                stage: "pre-push",
                type: "tool",
                enabled: true,
                severity: "error",
                blocking: true,
                command: "cargo check",
                successCriteria: "exit_code_zero",
            });

            defaultNags.push({
                id: "clippy-cargo-clippy",
                name: "Cargo Clippy",
                description: "Run Clippy for linting",
                stage: "pre-push",
                type: "tool",
                enabled: true,
                severity: "error",
                blocking: true,
                command: "cargo clippy",
                successCriteria: "exit_code_zero",
            });
        } else if (projectType === "python") {
            defaultNags.push({
                id: "format-black",
                name: "Black Format",
                description: "Format Python code with Black",
                stage: "pre-commit",
                type: "tool",
                enabled: true,
                severity: "warning",
                blocking: false,
                command: "python -m black .",
                successCriteria: "exit_code_zero",
            });

            defaultNags.push({
                id: "lint-ruff",
                name: "Ruff Lint",
                description: "Lint Python code with Ruff",
                stage: "pre-push",
                type: "tool",
                enabled: true,
                severity: "error",
                blocking: true,
                command: "python -m ruff check .",
                successCriteria: "exit_code_zero",
            });

            defaultNags.push({
                id: "typecheck-mypy",
                name: "Mypy Type Check",
                description: "Type check Python code with Mypy",
                stage: "pre-push",
                type: "tool",
                enabled: true,
                severity: "error",
                blocking: true,
                command: "python -m mypy .",
                successCriteria: "exit_code_zero",
            });
        }

        config.nags = defaultNags;
        config.projectType = projectType;
        this.saveConfig(config);
    }

    exportNags(): string {
        const config = this.loadConfig();
        return JSON.stringify(config, null, 2);
    }

    importNags(jsonContent: string): void {
        const imported = JSON.parse(jsonContent) as NagConfig;
        const config = this.loadConfig();
        config.nags = imported.nags || [];
        config.projectType = imported.projectType || config.projectType;
        this.saveConfig(config);
    }
}
