#!/usr/bin/env bun

/**
 * Dark Factory CLI
 * 
 * Main entry point for the Dark Factory orchestration tool.
 */

import { Command } from "commander";
import chalk from "chalk";
import { getStorage } from "../storage/yaml";
import type { Task, TaskStatus } from "../types";
import { getOpenCodeAdapter, initializeOpenCode } from "../adapter/opencode";
import { ProjectManager } from "../managers/project";
import { TaskManager } from "../managers/task";
import { AgentRuntime } from "../runtime/agent";
import { v4 as uuid } from "uuid";
import Table from "cli-table3";
import ora from "ora"; // Added this import as it's used but not imported

const program = new Command();

program
    .name("df")
    .description("Dark Factory - Autonomous AI Agent Orchestration")
    .version("0.1.0");

// ============================================================================
// Init Command
// ============================================================================

program
    .command("init")
    .description("Initialize Dark Factory storage")
    .action(async () => {
        const spinner = ora("Initializing Dark Factory...").start();

        try {
            const storage = getStorage();
            storage.initialize();

            spinner.succeed(chalk.green("Dark Factory initialized!"));
            console.log(chalk.dim(`Storage location: ~/.dark-factory/`));
        } catch (error) {
            spinner.fail(chalk.red("Failed to initialize"));
            console.error(error);
            process.exit(1);
        }
    });

// ============================================================================
// Auth Command
// ============================================================================

program
    .command("auth")
    .description("Authenticate with Antigravity via OpenCode")
    .action(async () => {
        console.log(chalk.yellow("Authentication Setup"));
        console.log();
        console.log("Dark Factory uses OpenCode SDK with Antigravity OAuth.");
        console.log("Please ensure you have:");
        console.log();
        console.log("  1. Installed OpenCode globally:");
        console.log(chalk.dim("     npm install -g opencode"));
        console.log();
        console.log("  2. Run authentication:");
        console.log(chalk.dim("     opencode auth login"));
        console.log();
        console.log("  3. Select 'OAuth with Google (Antigravity)' when prompted");
        console.log();
        console.log("After authentication, Dark Factory will use your Antigravity quota.");
    });

// ============================================================================
// Models Command
// ============================================================================

program
    .command("models")
    .description("List available LLM models")
    .action(async () => {
        const adapter = getOpenCodeAdapter();
        const models = adapter.getAvailableModels();

        console.log(chalk.bold("\nAvailable Models (via Antigravity OAuth):\n"));

        console.log(chalk.cyan("Gemini Models:"));
        for (const model of models.filter(m => m.startsWith("gemini"))) {
            console.log(`  - ${model}`);
        }

        console.log();
        console.log(chalk.magenta("Claude Models:"));
        for (const model of models.filter(m => m.startsWith("claude"))) {
            console.log(`  - ${model}`);
        }

        console.log();
        console.log(chalk.dim("Default model: gemini-3-pro-high"));
    });

program
    .command("status")
    .description("Show Dark Factory status")
    .action(async () => {
        const storage = getStorage();

        console.log(chalk.bold("\n📊 Dark Factory Status\n"));

        // Projects
        const projects = storage.projects.listAll();
        const activeProjects = storage.projects.getActive();

        console.log(chalk.cyan("Projects:"));
        console.log(`  Total: ${projects.length}`);
        console.log(`  Active: ${activeProjects.length}`);

        // Finance
        const finance = storage.finance.getState();
        if (finance) {
            console.log();
            console.log(chalk.green("Finance:"));
            console.log(`  Total Cost: $${finance.totalCost.toFixed(4)}`);
            console.log(`  Total Tokens: ${finance.totalTokens.toLocaleString()}`);
            console.log(`  Current Model: ${finance.currentModel}`);
        }

        console.log();
    });


program
    .command("create")
    .description("Create a new project/task")
    .argument("<name>", "Project name")
    .argument("<description>", "Task description")
    .action(async (name, description) => {
        const spinner = ora(`Creating project "${name}"...`).start();

        try {
            const pm = new ProjectManager(process.cwd());
            const project = await pm.createProject(name, description);

            spinner.succeed(chalk.green(`Project "${name}" created!`));
            console.log();
            console.log(chalk.bold("ID:      "), project.id);
            console.log(chalk.bold("Path:    "), project.worktreePath);
            console.log(chalk.bold("Branch:  "), project.workBranch);
            console.log();
            console.log(chalk.dim("Next: Use 'df task add' to manually add tasks or wait for agent to plan."));
        } catch (error) {
            spinner.fail(chalk.red("Failed to create project"));
            console.error(error);
            process.exit(1);
        }
    });

program
    .command("list")
    .description("List all projects")
    .action(async () => {
        const pm = new ProjectManager(process.cwd());
        const projects = pm.listProjects();

        if (projects.length === 0) {
            console.log(chalk.yellow("\nNo projects found. Use 'df create' to start one."));
            return;
        }

        const table = new Table({
            head: [chalk.cyan("ID"), chalk.cyan("Name"), chalk.cyan("Status"), chalk.cyan("Created")],
            colWidths: [10, 20, 15, 20]
        });

        for (const p of projects) {
            table.push([
                p.id.substring(0, 8),
                p.name,
                p.status,
                new Date(p.createdAt).toLocaleDateString()
            ]);
        }

        console.log("\n" + table.toString());
    });

program
    .command("delete")
    .description("Delete a project and its worktree")
    .argument("<id>", "Project ID (full or prefix)")
    .action(async (id) => {
        const spinner = ora("Deleting project...").start();

        try {
            const pm = new ProjectManager(process.cwd());
            let projectId = id;

            // Handle prefix
            if (id.length < 36) {
                const projects = pm.listProjects();
                const matches = projects.filter(p => p.id.startsWith(id));
                if (matches.length === 0) throw new Error("No project found with that ID prefix");
                if (matches.length > 1) throw new Error("Multiple projects match that ID prefix");
                const matchedProject = matches[0];
                if (!matchedProject) throw new Error("Failed to resolve project ID");
                projectId = matchedProject.id;
            }

            await pm.deleteProject(projectId);
            spinner.succeed(chalk.green("Project deleted successfully"));
        } catch (error) {
            spinner.fail(chalk.red("Failed to delete project"));
            console.error(error);
            process.exit(1);
        }
    });

// ============================================================================
// Task Management
// ============================================================================

const taskCmd = program.command("task").description("Manage project tasks");

taskCmd
    .command("add")
    .description("Add a task to a project")
    .argument("<project>", "Project ID or prefix")
    .argument("<title>", "Task title")
    .argument("<description>", "Task description")
    .action(async (project, title, description) => {
        try {
            const pm = new ProjectManager(process.cwd());
            const tm = new TaskManager();

            // Resolve project ID
            let projectId = project;
            if (project.length < 36) {
                const projects = pm.listProjects();
                const matches = projects.filter(p => p.id.startsWith(project));
                if (matches.length === 0) throw new Error("No project found");
                const matchedProject = matches[0];
                if (!matchedProject) throw new Error("Failed to resolve project ID");
                projectId = matchedProject.id;
            }

            const task = await tm.addTask(projectId, title, description);
            console.log(chalk.green(`Task added to project ${projectId.substring(0, 8)}`));
            console.log(chalk.bold("Task ID: "), task.id);
        } catch (error) {
            console.error(chalk.red("Failed to add task:"), error);
            process.exit(1);
        }
    });

taskCmd
    .command("list")
    .description("List tasks for a project")
    .argument("<project>", "Project ID or prefix")
    .action(async (project) => {
        try {
            const pm = new ProjectManager(process.cwd());
            const tm = new TaskManager();

            // Resolve project ID
            let projectId = project;
            if (project.length < 36) {
                const projects = pm.listProjects();
                const matches = projects.filter(p => p.id.startsWith(project));
                if (matches.length === 0) throw new Error("No project found");
                const matchedProject = matches[0];
                if (!matchedProject) throw new Error("Failed to resolve project ID");
                projectId = matchedProject.id;
            }

            const tasks = tm.listTasks(projectId);
            if (tasks.length === 0) {
                console.log(chalk.yellow("No tasks found for this project."));
                return;
            }

            const table = new Table({
                head: [chalk.cyan("ID"), chalk.cyan("Title"), chalk.cyan("Status"), chalk.cyan("Persona")],
                colWidths: [10, 30, 15, 15]
            });

            for (const t of tasks) {
                table.push([
                    t.id.substring(0, 8),
                    t.title,
                    t.status,
                    t.assignedPersona || "-"
                ]);
            }

            console.log(`\nTasks for ${projectId.substring(0, 8)}:`);
            console.log(table.toString());
        } catch (error) {
            console.error(chalk.red("Failed to list tasks:"), error);
            process.exit(1);
        }
    });

// ============================================================================
// Execution
// ============================================================================

program
    .command("run")
    .description("Execute a task using an AI agent")
    .argument("<project>", "Project ID or prefix")
    .argument("[task]", "Task ID or prefix (optional, runs next executable task)")
    .option("-p, --persona <persona>", "Persona to use", "engineer")
    .action(async (project, task, options) => {
        try {
            const pm = new ProjectManager(process.cwd());
            const tm = new TaskManager();
            const runtime = new AgentRuntime();

            // Resolve project ID
            let projectId = project;
            if (project.length < 36) {
                const projects = pm.listProjects();
                const matches = projects.filter(p => p.id.startsWith(project));
                if (matches.length === 0) throw new Error("No project found");
                const matchedProject = matches[0];
                if (!matchedProject) throw new Error("Failed to resolve project ID");
                projectId = matchedProject.id;
            }

            const projectObj = pm.getProject(projectId);
            if (!projectObj) throw new Error("Project not found in storage");

            // Resolve task
            let targetTask;
            if (task) {
                const tasks = tm.listTasks(projectId);
                const matches = tasks.filter(t => t.id.startsWith(task));
                if (matches.length === 0) throw new Error("No task found");
                targetTask = matches[0];
            } else {
                const executable = tm.getExecutableTasks(projectId);
                if (executable.length === 0) {
                    console.log(chalk.yellow("No executable tasks found. All tasks may be completed or blocked."));
                    return;
                }
                targetTask = executable[0];
            }

            if (!targetTask) throw new Error("Failed to resolve task");

            // Mark task as in-progress
            await tm.updateTask(projectId, targetTask.id, {
                status: "in_progress",
                startedAt: new Date().toISOString(),
                assignedPersona: options.persona
            });

            // Run Agent
            const result = await runtime.runTask(projectObj, targetTask, options.persona);

            // Update task with result
            await tm.updateTask(projectId, targetTask.id, {
                status: result.success ? "completed" : "failed",
                completedAt: new Date().toISOString(),
                verificationNotes: [result.message]
            });

            // Record economics
            const storage = getStorage();
            const adapterObj = getOpenCodeAdapter();
            storage.finance.recordCost(adapterObj.getPersonaModel(options.persona) || "default", result.tokensUsed, result.cost);

            if (result.success) {
                console.log(chalk.green(`\nTask "${targetTask.title}" completed successfully!`));
            } else {
                console.log(chalk.red(`\nTask "${targetTask.title}" failed.`));
                console.error(result.message);
            }

        } catch (error) {
            console.error(chalk.red("Execution failed:"), error);
            process.exit(1);
        }
    });




// ============================================================================
// Test Command (for development)
// ============================================================================

program
    .command("test-llm")
    .description("Test LLM connection (development)")
    .option("-m, --model <model>", "Model to use", "gemini-3-pro-high")
    .option("-p, --prompt <prompt>", "Prompt to send", "Say 'Hello Dark Factory!' and nothing else.")
    .action(async (options) => {
        const spinner = ora("Initializing OpenCode...").start();

        try {
            const adapter = await initializeOpenCode();
            spinner.text = "Sending message...";

            const response = await adapter.sendMessage(options.prompt, {
                model: options.model,
            });

            spinner.succeed("Response received!");

            console.log();
            console.log(chalk.bold("Model:"), response.model);
            console.log(chalk.bold("Tokens:"), response.tokensUsed);
            console.log(chalk.bold("Response:"));
            console.log(chalk.dim("─".repeat(50)));
            console.log(response.content);
            console.log(chalk.dim("─".repeat(50)));

            // Record cost
            const storage = getStorage();
            storage.finance.recordCost(response.model, response.tokensUsed, 0); // Cost tracking TBD

            await adapter.shutdown();
        } catch (error) {
            spinner.fail("Failed to connect to LLM");
            console.error(chalk.red(String(error)));
            process.exit(1);
        }
    });

// ============================================================================
// Run CLI
// ============================================================================

program.parse();
