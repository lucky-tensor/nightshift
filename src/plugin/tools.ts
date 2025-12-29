import { ProjectManager } from "../managers/project.js";
import { TaskManager } from "../managers/task.js";
import { FactoryManager } from "../managers/factory.js";
import { AgentRuntime } from "../runtime/agent.js";
import { resolveProjectId } from "../utils/helpers.js";

export interface ToolDefinition {
    name: string;
    description: string;
    inputSchema: any;
    handler: (args: any) => Promise<any>;
}

const factoryTools: ToolDefinition[] = [
    {
        name: "factory_init",
        description: "Initialize a new factory with configuration",
        inputSchema: {
            type: "object",
            properties: {
                name: { type: "string", description: "Name of the factory" },
                description: {
                    type: "string",
                    description: "Description of the factory's purpose",
                },
                budgetLimit: { type: "number", description: "Budget limit in USD (default: 100)" },
                defaultModel: { type: "string", description: "Default LLM model to use" },
            },
            required: ["name", "description"],
        },
        handler: async (args) => {
            const fm = new FactoryManager();
            const factory = await fm.initialize(args.name, args.description, {
                budgetLimit: args.budgetLimit,
                defaultModel: args.defaultModel,
            });
            return factory;
        },
    },
    {
        name: "factory_status",
        description: "Get the current status of the factory including budget and products",
        inputSchema: {
            type: "object",
            properties: {},
        },
        handler: async () => {
            const fm = new FactoryManager();
            return fm.getStatus();
        },
    },
];

const projectTools: ToolDefinition[] = [
    {
        name: "create_project",
        description: "Create a new project with an isolated git worktree",
        inputSchema: {
            type: "object",
            properties: {
                name: { type: "string", description: "Project name" },
                description: { type: "string", description: "Project description" },
            },
            required: ["name", "description"],
        },
        handler: async (args) => {
            const pm = new ProjectManager(process.cwd());
            return await pm.createProject(args.name, args.description);
        },
    },
    {
        name: "list_projects",
        description: "List all projects managed by the factory",
        inputSchema: {
            type: "object",
            properties: {},
        },
        handler: async () => {
            const pm = new ProjectManager(process.cwd());
            return pm.listProjects();
        },
    },
    {
        name: "delete_project",
        description: "Delete a project and its resources",
        inputSchema: {
            type: "object",
            properties: {
                projectId: { type: "string", description: "Project ID or prefix" },
            },
            required: ["projectId"],
        },
        handler: async (args) => {
            const pm = new ProjectManager(process.cwd());
            const projects = pm.listProjects();
            const id = resolveProjectId(args.projectId, projects);
            await pm.deleteProject(id);
            return { success: true, message: `Project ${id} deleted` };
        },
    },
];

const taskTools: ToolDefinition[] = [
    {
        name: "add_task",
        description: "Add a task to a project",
        inputSchema: {
            type: "object",
            properties: {
                projectId: { type: "string", description: "Project ID or prefix" },
                title: { type: "string", description: "Task title" },
                description: { type: "string", description: "Task description" },
            },
            required: ["projectId", "title", "description"],
        },
        handler: async (args) => {
            const pm = new ProjectManager(process.cwd());
            const tm = new TaskManager();
            const projects = pm.listProjects();
            const id = resolveProjectId(args.projectId, projects);

            return await tm.addTask(id, args.title, args.description);
        },
    },
    {
        name: "list_tasks",
        description: "List all tasks for a specific project",
        inputSchema: {
            type: "object",
            properties: {
                projectId: { type: "string", description: "Project ID or prefix" },
            },
            required: ["projectId"],
        },
        handler: async (args) => {
            const pm = new ProjectManager(process.cwd());
            const tm = new TaskManager();
            const projects = pm.listProjects();
            const id = resolveProjectId(args.projectId, projects);

            return tm.listTasks(id);
        },
    },
    {
        name: "run_task",
        description: "Execute a task using an AI agent",
        inputSchema: {
            type: "object",
            properties: {
                projectId: { type: "string", description: "Project ID or prefix" },
                taskId: {
                    type: "string",
                    description: "Task ID or prefix (optional, runs next executable)",
                },
                subagent: {
                    type: "string",
                    description: "Subagent to use (engineer, tester, etc.)",
                    default: "engineer",
                },
            },
            required: ["projectId"],
        },
        handler: async (args) => {
            const pm = new ProjectManager(process.cwd());
            const tm = new TaskManager();
            const runtime = new AgentRuntime();

            const projects = pm.listProjects();
            const projectId = resolveProjectId(args.projectId, projects);
            const project = pm.getProject(projectId);

            if (!project) throw new Error("Project not found");

            let targetTask;
            if (args.taskId) {
                const tasks = tm.listTasks(projectId);
                const matches = tasks.filter((t) => t.id.startsWith(args.taskId));
                if (matches.length === 0) throw new Error("Task not found");
                targetTask = matches[0];
            } else {
                const executable = tm.getExecutableTasks(projectId);
                if (executable.length === 0)
                    return { success: false, message: "No executable tasks found" };
                targetTask = executable[0];
            }

            if (!targetTask) {
                return { success: false, message: "Failed to resolve task" };
            }

            // Update status to in_progress
            await tm.updateTask(projectId, targetTask.id, {
                status: "in_progress",
                startedAt: new Date().toISOString(),
                assignedSubagent: args.subagent || "engineer",
            });

            // Run agent
            const result = await runtime.runTask(project, targetTask, args.subagent || "engineer");

            // Update final status
            await tm.updateTask(projectId, targetTask.id, {
                status: result.success ? "completed" : "failed",
                completedAt: new Date().toISOString(),
                verificationNotes: [result.message],
            });

            return result;
        },
    },
];

export const tools: ToolDefinition[] = [...factoryTools, ...projectTools, ...taskTools];
