import { tool } from "@opencode-ai/plugin";
import { ProjectManager } from "../managers/project";
import { TaskManager } from "../managers/task";
import { FactoryManager } from "../managers/factory";
import { AgentRuntime } from "../runtime/agent";
import { resolveProjectId } from "../utils/helpers";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

export function createTools(
    client: any,
    directory: string,
    projectManager: ProjectManager,
    factoryManager: FactoryManager
) {
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
    };
}
