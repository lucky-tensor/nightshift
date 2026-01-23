import { tool } from "@opencode-ai/plugin";
import { ProjectManager } from "../managers/project";
import { TaskManager } from "../managers/task";
import { FactoryManager } from "../managers/factory";
import { NagsManager } from "../managers/nags";
import { AgentRuntime } from "../runtime/agent";
import { resolveProjectId } from "../utils/helpers";
import { readFileSync, existsSync, writeFileSync } from "fs";
import { join } from "path";

export function createTools(
    client: any,
    directory: string,
    projectManager: ProjectManager,
    factoryManager: FactoryManager
) {
    const nagsManager = new NagsManager(directory);
    const agentRuntime = new AgentRuntime(client);

    return {
        // Factory Tools
        factory_init: tool({
            description: "Initialize a new factory with configuration",
            args: {
                name: tool.schema.string(),
                description: tool.schema.string(),
                budgetLimit: tool.schema.number().optional(),
                defaultModel: tool.schema.string().optional(),
                path: tool.schema.string().optional(),
            },
            async execute(args) {
                const factory = await factoryManager.initialize(args.name, args.description, {
                    budgetLimit: args.budgetLimit || 100,
                    defaultModel: args.defaultModel,
                    path: args.path,
                });
                return JSON.stringify(factory, null, 2);
            },
        }),

        factory_status: tool({
            description:
                "Get the current status of the factory (returns Markdown dashboard if available)",
            args: {},
            async execute() {
                const storageDir = factoryManager.getStorageDir();
                if (storageDir) {
                    const statusPath = join(storageDir, "FACTORY_STATUS.md");
                    if (existsSync(statusPath)) {
                        return readFileSync(statusPath, "utf-8");
                    }
                }

                const status = await factoryManager.getStatus();
                return JSON.stringify(status, null, 2);
            },
        }),

        factory_reset: tool({
            description: "Force reset the factory state (use if stuck in inconsistency)",
            args: {},
            async execute() {
                factoryManager.reset();
                return "Factory state reset. You can now run factory_init again.";
            },
        }),

        // Project Tools
        create_project: tool({
            description: "Create a new project with an isolated git worktree",
            args: {
                name: tool.schema.string(),
                description: tool.schema.string(),
            },
            async execute(args) {
                const project = await projectManager.createProject(args.name, args.description);
                return JSON.stringify(project, null, 2);
            },
        }),

        list_projects: tool({
            description: "List all projects managed by the factory",
            args: {},
            async execute() {
                const projects = projectManager.listProjects();
                return JSON.stringify(projects, null, 2);
            },
        }),

        delete_project: tool({
            description: "Delete a project and its resources",
            args: {
                projectId: tool.schema.string(),
            },
            async execute(args) {
                const projects = projectManager.listProjects();
                const id = resolveProjectId(args.projectId, projects);
                await projectManager.deleteProject(id);
                return `Project ${id} deleted successfully.`;
            },
        }),

        // Task Tools
        add_task: tool({
            description: "Add a task to a project",
            args: {
                projectId: tool.schema.string(),
                title: tool.schema.string(),
                description: tool.schema.string(),
            },
            async execute(args) {
                const projects = projectManager.listProjects();
                const id = resolveProjectId(args.projectId, projects);
                const tm = new TaskManager();
                const task = await tm.addTask(id, args.title, args.description);
                return JSON.stringify(task, null, 2);
            },
        }),

        list_tasks: tool({
            description: "List all tasks for a specific project",
            args: {
                projectId: tool.schema.string(),
            },
            async execute(args) {
                const projects = projectManager.listProjects();
                const id = resolveProjectId(args.projectId, projects);
                const tm = new TaskManager();
                const tasks = tm.listTasks(id);
                return JSON.stringify(tasks, null, 2);
            },
        }),

        run_task: tool({
            description: "Execute a task using an AI agent",
            args: {
                projectId: tool.schema.string(),
                taskId: tool.schema.string().optional(),
                subagent: tool.schema.string().optional(),
            },
            async execute(args) {
                const tm = new TaskManager();
                const runtime = new AgentRuntime(client);

                const projects = projectManager.listProjects();
                const projectId = resolveProjectId(args.projectId, projects);
                const project = projectManager.getProject(projectId);

                if (!project) throw new Error("Project not found");

                let targetTask;
                if (args.taskId) {
                    const tasks = tm.listTasks(projectId);
                    const matches = tasks.filter((t) => t.id.startsWith(args.taskId!));
                    if (matches.length === 0) throw new Error("Task not found");
                    targetTask = matches[0];
                } else {
                    const executable = tm.getExecutableTasks(projectId);
                    if (executable.length === 0) return "No executable tasks found.";
                    targetTask = executable[0];
                }

                if (!targetTask) {
                    return "Failed to resolve task.";
                }

                await tm.updateTask(projectId, targetTask.id, {
                    status: "in_progress",
                    startedAt: new Date().toISOString(),
                    assignedSubagent: args.subagent || "engineer",
                });

                const result = await runtime.runTask(
                    project,
                    targetTask,
                    args.subagent || "engineer"
                );

                await tm.updateTask(projectId, targetTask.id, {
                    status: result.success ? "completed" : "failed",
                    completedAt: new Date().toISOString(),
                    verificationNotes: [result.message],
                });

                return JSON.stringify(result, null, 2);
            },
        }),

        // Nags Management Tools
        nags_install: tool({
            description:
                "Install git hooks (pre-commit and pre-push) and initialize nags with project defaults",
            args: {
                hook: tool.schema.string().optional(),
            },
            async execute(args) {
                const hook = args.hook;

                nagsManager.applyProjectDefaults();

                const projectType = nagsManager.detectProjectType();
                const config = nagsManager.loadConfig();

                let installed = [];
                let skipped = [];

                if (!hook || hook === "pre-commit") {
                    const preCommitScript = join(
                        nagsManager.getNagsPath(),
                        "..",
                        "..",
                        "scripts",
                        "hooks",
                        "pre-commit.js"
                    );
                    if (existsSync(preCommitScript)) {
                        try {
                            const fs = require("fs");
                            const targetHook = join(process.cwd(), ".git", "hooks", "pre-commit");
                            if (existsSync(targetHook)) fs.unlinkSync(targetHook);
                            fs.writeFileSync(targetHook, fs.readFileSync(preCommitScript));
                            require("child_process").execSync(`chmod +x ${targetHook}`);
                            installed.push("pre-commit");
                        } catch (e) {
                            skipped.push("pre-commit");
                        }
                    } else {
                        skipped.push("pre-commit");
                    }
                }

                if (!hook || hook === "pre-push") {
                    const prePushScript = join(
                        nagsManager.getNagsPath(),
                        "..",
                        "..",
                        "scripts",
                        "hooks",
                        "pre-push.js"
                    );
                    if (existsSync(prePushScript)) {
                        try {
                            const fs = require("fs");
                            const targetHook = join(process.cwd(), ".git", "hooks", "pre-push");
                            if (existsSync(targetHook)) fs.unlinkSync(targetHook);
                            fs.writeFileSync(targetHook, fs.readFileSync(prePushScript));
                            require("child_process").execSync(`chmod +x ${targetHook}`);
                            installed.push("pre-push");
                        } catch (e) {
                            skipped.push("pre-push");
                        }
                    } else {
                        skipped.push("pre-push");
                    }
                }

                return (
                    `Nags initialized for ${projectType} project.\n` +
                    `Installed hooks: ${installed.join(", ") || "none"}\n` +
                    `Skipped: ${skipped.join(", ") || "none"}\n` +
                    `Total nags configured: ${config.nags.length}`
                );
            },
        }),

        nags_uninstall: tool({
            description: "Remove installed git hooks",
            args: {
                hook: tool.schema.string().optional(),
            },
            async execute(args) {
                const hook = args.hook;
                const removed: string[] = [];

                const removeHook = (hookName: string) => {
                    const targetHook = join(process.cwd(), ".git", "hooks", hookName);
                    if (existsSync(targetHook)) {
                        try {
                            require("fs").unlinkSync(targetHook);
                            removed.push(hookName);
                        } catch (e) {}
                    }
                };

                if (!hook || hook === "pre-commit") removeHook("pre-commit");
                if (!hook || hook === "pre-push") removeHook("pre-push");

                return removed.length > 0
                    ? `Uninstalled hooks: ${removed.join(", ")}`
                    : "No hooks were uninstalled";
            },
        }),

        nags_status: tool({
            description: "Check the status of installed git hooks and nags configuration",
            args: {},
            async execute() {
                const config = nagsManager.loadConfig();
                const preCommitHook = join(process.cwd(), ".git", "hooks", "pre-commit");
                const prePushHook = join(process.cwd(), ".git", "hooks", "pre-push");

                return JSON.stringify(
                    {
                        projectType: nagsManager.detectProjectType(),
                        hooks: {
                            "pre-commit": existsSync(preCommitHook),
                            "pre-push": existsSync(prePushHook),
                        },
                        nagsConfig: {
                            totalNags: config.nags.length,
                            preCommitNags: config.nags.filter((n) => n.stage === "pre-commit")
                                .length,
                            prePushNags: config.nags.filter((n) => n.stage === "pre-push").length,
                            toolNags: config.nags.filter((n) => n.type === "tool").length,
                            agentNags: config.nags.filter((n) => n.type === "agent").length,
                        },
                        defaults: config.defaults,
                    },
                    null,
                    2
                );
            },
        }),

        nags_list: tool({
            description: "List all configured nags with their settings",
            args: {},
            async execute() {
                const config = nagsManager.loadConfig();
                return JSON.stringify(config.nags, null, 2);
            },
        }),

        nags_add_tool: tool({
            description: "Add a tool-based nag (executes a command)",
            args: {
                id: tool.schema.string(),
                name: tool.schema.string(),
                description: tool.schema.string(),
                stage: tool.schema.string(),
                command: tool.schema.string(),
                blocking: tool.schema.boolean().optional(),
                severity: tool.schema.string().optional(),
            },
            async execute(args) {
                const { id, name, description, stage, command, blocking, severity } = args;

                if (!["pre-commit", "pre-push"].includes(stage)) {
                    return `Invalid stage: ${stage}. Must be 'pre-commit' or 'pre-push'`;
                }

                const nag = {
                    id,
                    name,
                    description,
                    stage: stage as "pre-commit" | "pre-push",
                    type: "tool" as const,
                    enabled: true,
                    severity: (severity as "error" | "warning" | "info") || "error",
                    blocking: blocking || stage === "pre-push",
                    command,
                    successCriteria: "exit_code_zero" as const,
                };

                nagsManager.addNag(nag);
                return `Added tool nag: ${name} (${id}) for ${stage}`;
            },
        }),

        nags_add_agent: tool({
            description: "Add an agent-based nag (evaluated by an AI agent as OK/NOK)",
            args: {
                id: tool.schema.string(),
                name: tool.schema.string(),
                description: tool.schema.string(),
                stage: tool.schema.string(),
                prompt: tool.schema.string(),
                agentId: tool.schema.string().optional(),
                blocking: tool.schema.boolean().optional(),
            },
            async execute(args) {
                const { id, name, description, stage, prompt, agentId, blocking } = args;

                if (!["pre-commit", "pre-push"].includes(stage)) {
                    return `Invalid stage: ${stage}. Must be 'pre-commit' or 'pre-push'`;
                }

                const nag = {
                    id,
                    name,
                    description,
                    stage: stage as "pre-commit" | "pre-push",
                    type: "agent" as const,
                    enabled: true,
                    severity: "info" as const,
                    blocking: blocking || false,
                    prompt,
                    agentId,
                };

                nagsManager.addNag(nag);
                return `Added agent nag: ${name} (${id}) for ${stage}`;
            },
        }),

        nags_remove: tool({
            description: "Remove a nag by ID",
            args: {
                id: tool.schema.string(),
            },
            async execute(args) {
                const removed = nagsManager.removeNag(args.id);
                return removed ? `Removed nag: ${args.id}` : `Nag not found: ${args.id}`;
            },
        }),

        nags_run: tool({
            description: "Execute nags for a specific stage (for testing)",
            args: {
                stage: tool.schema.string(),
            },
            async execute(args) {
                if (!["pre-commit", "pre-push"].includes(args.stage)) {
                    return `Invalid stage: ${args.stage}. Must be 'pre-commit' or 'pre-push'`;
                }

                const report = await nagsManager.executeStage(
                    args.stage as "pre-commit" | "pre-push",
                    client,
                    agentRuntime
                );
                return JSON.stringify(report, null, 2);
            },
        }),

        nags_export: tool({
            description: "Export the current nags configuration as JSON",
            args: {},
            async execute() {
                return nagsManager.exportNags();
            },
        }),

        nags_import: tool({
            description: "Import a nags configuration JSON",
            args: {
                config: tool.schema.string(),
            },
            async execute(args) {
                try {
                    nagsManager.importNags(args.config);
                    return "Nags configuration imported successfully";
                } catch (error) {
                    return `Failed to import: ${error instanceof Error ? error.message : "Invalid JSON"}`;
                }
            },
        }),

        nags_defaults: tool({
            description: "Apply default nags for the detected project type",
            args: {},
            async execute() {
                nagsManager.applyProjectDefaults();
                const config = nagsManager.loadConfig();
                const projectType = nagsManager.detectProjectType();
                return (
                    `Applied defaults for ${projectType} project.\n` +
                    `Total nags: ${config.nags.length}\n` +
                    JSON.stringify(
                        config.nags.map((n) => ({
                            id: n.id,
                            name: n.name,
                            stage: n.stage,
                            type: n.type,
                        })),
                        null,
                        2
                    )
                );
            },
        }),
    };
}
