#!/usr/bin/env bun

/**
 * Dark Factory CLI
 *
 * Main entry point for the Dark Factory orchestration tool.
 */

import { Command } from "commander";
import chalk from "chalk";
import { getStorage } from "../storage/yaml";
import { getOpenCodeAdapter, initializeOpenCode } from "../adapter/opencode";
import { ProjectManager } from "../managers/project";
import { TaskManager } from "../managers/task";
import { FinanceManager } from "../managers/finance";
import { AgentRuntime } from "../runtime/agent";
import { FactoryManager } from "../managers/factory";
import { ProductManager } from "../managers/product-manager";
import { PlanManager } from "../managers/plan-manager";
import { KnowledgeBaseManager } from "../managers/knowledge-base";
import Table from "cli-table3";
import ora from "ora";
import { resolveProjectId, groupModels } from "../utils/helpers";

const program = new Command();

program.name("df").description("Dark Factory - Autonomous AI Agent Orchestration").version("0.1.0");

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
        try {
            const adapter = getOpenCodeAdapter();
            await adapter.initialize();

            const models = adapter.getAvailableModels();

            if (models.length === 0) {
                console.log(chalk.yellow("\nNo models available."));
                console.log(
                    chalk.dim("Please run 'df auth' to authenticate with Antigravity OAuth.\n")
                );
                return;
            }

            console.log(chalk.bold("\nAvailable Models (via Antigravity OAuth):\n"));

            const grouped = groupModels(models);

            if (grouped.claude.length > 0) {
                console.log(chalk.magenta("Claude Models:"));
                for (const model of grouped.claude) {
                    console.log(`  - ${model}`);
                }
                console.log();
            }

            if (grouped.gemini.length > 0) {
                console.log(chalk.cyan("Gemini Models:"));
                for (const model of grouped.gemini) {
                    console.log(`  - ${model}`);
                }
                console.log();
            }

            if (grouped.other.length > 0) {
                console.log(chalk.white("Other Models:"));
                for (const model of grouped.other) {
                    console.log(`  - ${model}`);
                }
                console.log();
            }

            console.log(chalk.dim(`Total: ${models.length} model(s) available`));
        } catch (error) {
            console.error(chalk.red(`\nError listing models: ${error}`));
            console.log(
                chalk.dim("Please run 'df auth' to authenticate with Antigravity OAuth.\n")
            );
            process.exit(1);
        }
    });

program
    .command("quota")
    .description("Check quota status for all authenticated models")
    .option("--probe", "Force a fresh quota probe (lightweight, no liveness check)")
    .option("--liveness", "Run full liveness check (slow, validates AI responses)")
    .option("--models <models>", "Specific models to liveness check (comma-separated)")
    .action(async (options) => {
        try {
            const adapter = getOpenCodeAdapter();
            await adapter.initialize();

            console.log(chalk.bold("\n💰 Quota Status Check\n"));

            const { FinanceManager } = await import("../managers/finance.js");

            // Check if we should probe or use cached data
            const shouldProbe =
                options.probe ||
                options.liveness ||
                options.models ||
                FinanceManager.shouldProbeQuota();

            if (shouldProbe) {
                if (options.liveness) {
                    console.log(chalk.dim("Running FULL liveness check on all models (slow)...\n"));
                    const results = await adapter.probeAllModels({ checkLiveness: true });
                    FinanceManager.updateQuotaStatus(results);
                } else if (options.models) {
                    const modelList = options.models.split(",").map((m: string) => m.trim());
                    console.log(chalk.dim(`Running liveness check on: ${modelList.join(", ")}\n`));
                    const results = await adapter.probeAllModels({ livenessModels: modelList });
                    FinanceManager.updateQuotaStatus(results);
                } else {
                    console.log(chalk.dim("Probing quota (lightweight, no liveness check)...\n"));
                    const results = await adapter.probeAllModels({ checkLiveness: false });
                    FinanceManager.updateQuotaStatus(results);
                }
            } else {
                console.log(chalk.dim("Using cached quota data (use --probe to force refresh)\n"));
            }

            const quotaStatus = FinanceManager.getQuotaStatus();
            const availableModels = FinanceManager.getAvailableModels();
            const exhaustedModels = FinanceManager.getExhaustedModels();

            if (Object.keys(quotaStatus).length === 0) {
                console.log(chalk.yellow("No quota data available. Run with --probe to check."));
                return;
            }

            // Show available models
            if (availableModels.length > 0) {
                console.log(chalk.green(`✓ Available Models (${availableModels.length}):`));
                for (const model of availableModels) {
                    const status = quotaStatus[model];
                    if (status) {
                        const age = Math.floor((Date.now() - status.lastChecked) / 1000);
                        console.log(
                            `  ${chalk.green("●")} ${model} ${chalk.dim(`(checked ${age}s ago)`)}`
                        );
                    }
                }
                console.log();
            }

            // Show exhausted models
            if (exhaustedModels.length > 0) {
                console.log(chalk.red(`✗ Quota Exhausted (${exhaustedModels.length}):`));
                for (const model of exhaustedModels) {
                    const status = quotaStatus[model];
                    if (status) {
                        const age = Math.floor((Date.now() - status.lastChecked) / 1000);
                        const errorMsg = status.error
                            ? chalk.dim(` - ${status.error.substring(0, 60)}...`)
                            : "";
                        console.log(
                            `  ${chalk.red("●")} ${model} ${chalk.dim(`(checked ${age}s ago)`)}${errorMsg}`
                        );
                    }
                }
                console.log();
            }

            // Summary
            const totalModels = Object.keys(quotaStatus).length;
            const availablePercent =
                totalModels > 0 ? Math.round((availableModels.length / totalModels) * 100) : 0;
            console.log(
                chalk.bold(
                    `Summary: ${availableModels.length}/${totalModels} models available (${availablePercent}%)`
                )
            );
        } catch (error) {
            console.error(chalk.red(`\nError checking quota: ${error}`));
            process.exit(1);
        }
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
            console.log(
                chalk.dim(
                    "Next: Use 'df task add' to manually add tasks or wait for agent to plan."
                )
            );
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
            head: [
                chalk.cyan("ID"),
                chalk.cyan("Name"),
                chalk.cyan("Status"),
                chalk.cyan("Created"),
            ],
            colWidths: [10, 20, 15, 20],
        });

        for (const p of projects) {
            table.push([
                p.id.substring(0, 8),
                p.name,
                p.status,
                new Date(p.createdAt).toLocaleDateString(),
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
            const projects = pm.listProjects();
            const projectId = resolveProjectId(id, projects);

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
            const projects = pm.listProjects();
            const projectId = resolveProjectId(project, projects);

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
            const projects = pm.listProjects();
            const projectId = resolveProjectId(project, projects);

            const tasks = tm.listTasks(projectId);
            if (tasks.length === 0) {
                console.log(chalk.yellow("No tasks found for this project."));
                return;
            }

            const table = new Table({
                head: [
                    chalk.cyan("ID"),
                    chalk.cyan("Title"),
                    chalk.cyan("Status"),
                    chalk.cyan("Persona"),
                ],
                colWidths: [10, 30, 15, 15],
            });

            for (const t of tasks) {
                table.push([t.id.substring(0, 8), t.title, t.status, t.assignedSubagent || "-"]);
            }

            console.log(`\nTasks for ${projectId.substring(0, 8)}:`);
            console.log(table.toString());
        } catch (error) {
            console.error(chalk.red("Failed to list tasks:"), error);
            process.exit(1);
        }
    });

// ============================================================================
// Factory Management
// ============================================================================

const factoryCmd = program.command("factory").description("Manage the Dark Factory");

factoryCmd
    .command("init")
    .description("Initialize a new factory")
    .argument("<name>", "Factory name")
    .argument("<description>", "Factory description")
    .option("-o, --output <dir>", "Output directory for products", "./products")
    .option("-b, --budget <amount>", "Budget limit in USD", "100")
    .option("-m, --model <model>", "Default model", "gemini-1.5-pro")
    .action(async (name, description, options) => {
        const spinner = ora("Initializing factory...").start();

        try {
            const fm = new FactoryManager();
            const factory = await fm.initialize(name, description, {
                outputDirectory: options.output,
                budgetLimit: parseFloat(options.budget),
                defaultModel: options.model,
            });

            spinner.succeed(chalk.green(`Factory "${name}" initialized!`));
            console.log();
            console.log(chalk.bold("ID:      "), factory.id);
            console.log(chalk.bold("Output:  "), factory.outputDirectory);
            console.log(chalk.bold("Budget:  "), `$${factory.budgetLimit}`);
            console.log(chalk.bold("Model:   "), factory.defaultModel);
            console.log();
            console.log(chalk.dim("Next: Use 'df product create' to start building products."));
        } catch (error) {
            spinner.fail(chalk.red("Failed to initialize factory"));
            console.error(error);
            process.exit(1);
        }
    });

factoryCmd
    .command("status")
    .description("Show factory status")
    .action(async () => {
        try {
            const fm = new FactoryManager();
            const factory = fm.getFactory();

            if (!factory) {
                console.log(chalk.yellow("\nNo factory initialized."));
                console.log(chalk.dim("Run 'df factory init' to create one.\n"));
                return;
            }

            const status = fm.getStatus();
            const percentUsed = (status.budget.used / status.budget.limit) * 100;

            console.log(chalk.bold("\n🏭 Factory Status\n"));
            console.log(chalk.cyan("Name:        "), factory.name);
            console.log(chalk.cyan("Status:      "), factory.status);
            console.log(chalk.cyan("Products:    "), status.products);
            console.log(chalk.cyan("Output Dir:  "), factory.outputDirectory);
            console.log();
            console.log(chalk.green("💰 Budget"));
            console.log(chalk.cyan("  Limit:     "), `$${status.budget.limit.toFixed(2)}`);
            console.log(chalk.cyan("  Spent:     "), `$${status.budget.used.toFixed(4)}`);
            console.log(chalk.cyan("  Remaining: "), `$${status.budget.remaining.toFixed(4)}`);
            console.log(chalk.cyan("  Used:      "), `${percentUsed.toFixed(1)}%`);
            console.log();
            console.log(chalk.green("📊 Usage"));
            console.log(chalk.cyan("  Tokens:    "), status.tokens.toLocaleString());
            console.log(chalk.cyan("  Model:     "), factory.defaultModel);
            console.log();
        } catch (error) {
            console.error(chalk.red("Failed to get factory status:"), error);
            process.exit(1);
        }
    });

factoryCmd
    .command("pause")
    .description("Pause factory operations")
    .action(async () => {
        try {
            const fm = new FactoryManager();
            const factory = fm.getFactory();

            if (!factory) {
                console.log(chalk.yellow("No factory initialized."));
                return;
            }

            fm.updateFactory({ status: "paused" });
            console.log(chalk.yellow("Factory paused. Use 'df factory resume' to continue."));
        } catch (error) {
            console.error(chalk.red("Failed to pause factory:"), error);
            process.exit(1);
        }
    });

factoryCmd
    .command("resume")
    .description("Resume factory operations")
    .action(async () => {
        try {
            const fm = new FactoryManager();
            const factory = fm.getFactory();

            if (!factory) {
                console.log(chalk.yellow("No factory initialized."));
                return;
            }

            fm.updateFactory({ status: "active" });
            console.log(chalk.green("Factory resumed and active."));
        } catch (error) {
            console.error(chalk.red("Failed to resume factory:"), error);
            process.exit(1);
        }
    });

// ============================================================================
// Product Management
// ============================================================================

const productCmd = program.command("product").description("Manage products");

productCmd
    .command("create")
    .description("Create a new product")
    .argument("<name>", "Product name (kebab-case recommended)")
    .argument("<description>", "Product description")
    .option("-r, --remote <url>", "Remote git URL")
    .option("-b, --branch <name>", "Main branch name", "main")
    .action(async (name, description, options) => {
        const spinner = ora(`Creating product "${name}"...`).start();

        try {
            const pm = new ProductManager();
            const product = await pm.createProduct(name, description, {
                remoteUrl: options.remote,
                mainBranch: options.branch,
            });

            spinner.succeed(chalk.green(`Product "${name}" created!`));
            console.log();
            console.log(chalk.bold("ID:          "), product.id);
            console.log(chalk.bold("Repository:  "), product.repoPath);
            console.log(chalk.bold("Status:      "), product.status);
            console.log();
            console.log(
                chalk.dim(
                    "Next: Use 'df product generate <id>' to generate PRD and implementation plan with AI."
                )
            );
        } catch (error) {
            spinner.fail(chalk.red("Failed to create product"));
            console.error(error);
            process.exit(1);
        }
    });

productCmd
    .command("list")
    .description("List all products")
    .option("-s, --status <status>", "Filter by status")
    .action(async (options) => {
        try {
            const pm = new ProductManager();
            const products = pm.listProducts(options.status ? { status: options.status } : {});

            if (products.length === 0) {
                console.log(chalk.yellow("\nNo products found."));
                console.log(chalk.dim("Use 'df product create' to start one.\n"));
                return;
            }

            const table = new Table({
                head: [
                    chalk.cyan("ID"),
                    chalk.cyan("Name"),
                    chalk.cyan("Status"),
                    chalk.cyan("Projects"),
                    chalk.cyan("Cost"),
                ],
                colWidths: [10, 25, 15, 12, 12],
            });

            for (const p of products) {
                table.push([
                    p.id.substring(0, 8),
                    p.name,
                    p.status,
                    `${p.completedProjects}/${p.totalProjects}`,
                    `$${p.totalCost.toFixed(2)}`,
                ]);
            }

            console.log("\n" + table.toString() + "\n");
        } catch (error) {
            console.error(chalk.red("Failed to list products:"), error);
            process.exit(1);
        }
    });

productCmd
    .command("status")
    .description("Show product status")
    .argument("<id>", "Product ID (full or prefix)")
    .action(async (id) => {
        try {
            const pm = new ProductManager();
            const product = pm.getProduct(id);

            if (!product) {
                console.log(chalk.yellow(`\nProduct not found: ${id}\n`));
                return;
            }

            const status = pm.getStatus(product.id);
            const planMgr = new PlanManager();
            const plan = planMgr.getPlan(product.id);

            console.log(chalk.bold(`\n📦 ${product.name}\n`));
            console.log(chalk.cyan("ID:          "), product.id);
            console.log(chalk.cyan("Status:      "), product.status);
            console.log(chalk.cyan("Repository:  "), status.repoPath);
            console.log();
            console.log(chalk.green("Projects"));
            console.log(chalk.cyan("  Total:     "), status.projects.total);
            console.log(chalk.cyan("  Completed: "), status.projects.completed);
            console.log();
            console.log(chalk.green("💰 Cost"));
            console.log(chalk.cyan("  Total:     "), `$${status.cost.toFixed(4)}`);
            console.log(chalk.cyan("  Tokens:    "), status.tokens.toLocaleString());

            if (plan) {
                const progress = planMgr.getProgress(product.id);
                console.log();
                console.log(chalk.green("📋 Plan Progress"));
                console.log(chalk.cyan("  Ready:     "), progress.ready);
                console.log(chalk.cyan("  In Progress:"), progress.inProgress);
                console.log(chalk.cyan("  Completed: "), progress.completed);
                console.log(chalk.cyan("  Blocked:   "), progress.blocked);
                console.log(chalk.cyan("  Complete:  "), `${progress.percentComplete}%`);
            }

            console.log();
        } catch (error) {
            console.error(chalk.red("Failed to get product status:"), error);
            process.exit(1);
        }
    });

productCmd
    .command("generate")
    .description("Generate PRD and/or Plan using AI")
    .argument("<id>", "Product ID (full or prefix)")
    .option("--prd-only", "Generate only PRD")
    .option("--plan-only", "Generate only Plan (requires existing PRD)")
    .action(async (id, options) => {
        try {
            const pm = new ProductManager();
            const product = pm.getProduct(id);

            if (!product) {
                console.log(chalk.yellow(`\nProduct not found: ${id}\n`));
                return;
            }

            const shouldGeneratePRD = !options.planOnly;
            const shouldGeneratePlan = !options.prdOnly;

            // Generate PRD
            if (shouldGeneratePRD) {
                const spinner = ora("Generating PRD with AI...").start();
                try {
                    await pm.generateProductPRD(product.id);
                    spinner.succeed(chalk.green("PRD generated successfully"));
                    console.log(chalk.dim(`  See ${product.prdPath}`));
                } catch (error) {
                    spinner.fail(chalk.red("Failed to generate PRD"));
                    console.error(error);
                    if (!shouldGeneratePlan) {
                        process.exit(1);
                    }
                }
            }

            // Generate Plan
            if (shouldGeneratePlan) {
                const spinner = ora("Generating implementation plan with AI...").start();
                try {
                    await pm.generateProductPlan(product.id);
                    spinner.succeed(chalk.green("Implementation plan generated successfully"));
                    console.log(chalk.dim(`  See ${product.planPath}`));

                    // Show quick summary
                    const planMgr = new PlanManager();
                    const plan = planMgr.getPlan(product.id);
                    if (plan) {
                        console.log();
                        console.log(chalk.bold(`${plan.projects.length} projects planned`));
                        const readyCount = plan.projects.filter((p) => p.status === "ready").length;
                        console.log(chalk.green(`${readyCount} ready to start`));
                    }
                } catch (error) {
                    spinner.fail(chalk.red("Failed to generate plan"));
                    console.error(error);
                    process.exit(1);
                }
            }

            console.log();
            console.log(chalk.dim("Use 'df product plan <id>' to view the full plan"));
        } catch (error) {
            console.error(chalk.red("Failed to generate:"), error);
            process.exit(1);
        }
    });

productCmd
    .command("plan")
    .description("Show implementation plan")
    .argument("<id>", "Product ID (full or prefix)")
    .action(async (id) => {
        try {
            const pm = new ProductManager();
            const product = pm.getProduct(id);

            if (!product) {
                console.log(chalk.yellow(`\nProduct not found: ${id}\n`));
                return;
            }

            const planMgr = new PlanManager();
            const plan = planMgr.getPlan(product.id);

            if (!plan) {
                console.log(chalk.yellow(`\nNo plan found for ${product.name}`));
                console.log(
                    chalk.dim("Use 'df product generate <id>' to generate PRD and Plan with AI.\n")
                );
                return;
            }

            const progress = planMgr.getProgress(product.id);

            console.log(chalk.bold(`\n📋 Implementation Plan: ${product.name}\n`));
            console.log(chalk.cyan("Version:     "), plan.version);
            console.log(chalk.cyan("Progress:    "), `${progress.percentComplete}%`);
            console.log();
            console.log(chalk.bold("Overview"));
            console.log(plan.overview);
            console.log();
            console.log(chalk.bold("Projects"));

            const table = new Table({
                head: [
                    chalk.cyan("Name"),
                    chalk.cyan("Status"),
                    chalk.cyan("Priority"),
                    chalk.cyan("Days"),
                ],
                colWidths: [30, 15, 10, 8],
            });

            for (const proj of plan.projects) {
                const statusIcon =
                    proj.status === "completed"
                        ? "✔️"
                        : proj.status === "in_progress"
                          ? "🚧"
                          : proj.status === "ready"
                            ? "✅"
                            : proj.status === "blocked"
                              ? "🚫"
                              : "⏳";
                table.push([
                    `${statusIcon} ${proj.name}`,
                    proj.status,
                    proj.priority,
                    proj.estimatedDays,
                ]);
            }

            console.log(table.toString());
            console.log();
            console.log(chalk.dim(`See ${product.planPath} for full details.\n`));
        } catch (error) {
            console.error(chalk.red("Failed to show plan:"), error);
            process.exit(1);
        }
    });

// ============================================================================
// Knowledge Base Management
// ============================================================================

const docsCmd = program.command("docs").description("Manage product knowledge base");

docsCmd
    .command("list")
    .description("List knowledge base entries")
    .argument("<productId>", "Product ID (full or prefix)")
    .option("-t, --type <type>", "Filter by type (research/handbook/decision/reference)")
    .option("-u, --unmerged", "Show only unmerged entries")
    .action(async (productId, options) => {
        try {
            const pm = new ProductManager();
            const product = pm.getProduct(productId);

            if (!product) {
                console.log(chalk.yellow(`\nProduct not found: ${productId}\n`));
                return;
            }

            const kb = new KnowledgeBaseManager();
            const filters: any = {};

            if (options.type) filters.type = options.type;
            if (options.unmerged) filters.mergedToMain = false;

            const entries = kb.listEntries(product.id, filters);

            if (entries.length === 0) {
                console.log(chalk.yellow("\nNo knowledge base entries found.\n"));
                return;
            }

            const table = new Table({
                head: [
                    chalk.cyan("Type"),
                    chalk.cyan("Title"),
                    chalk.cyan("Merged"),
                    chalk.cyan("Created"),
                ],
                colWidths: [12, 40, 10, 12],
            });

            for (const entry of entries) {
                table.push([
                    entry.type,
                    entry.title,
                    entry.mergedToMain ? "Yes" : "No",
                    new Date(entry.createdAt).toLocaleDateString(),
                ]);
            }

            console.log(`\n${chalk.bold(product.name)} - Knowledge Base\n`);
            console.log(table.toString());
            console.log();
        } catch (error) {
            console.error(chalk.red("Failed to list knowledge base:"), error);
            process.exit(1);
        }
    });

docsCmd
    .command("stats")
    .description("Show knowledge base statistics")
    .argument("<productId>", "Product ID (full or prefix)")
    .action(async (productId) => {
        try {
            const pm = new ProductManager();
            const product = pm.getProduct(productId);

            if (!product) {
                console.log(chalk.yellow(`\nProduct not found: ${productId}\n`));
                return;
            }

            const kb = new KnowledgeBaseManager();
            const stats = kb.getStats(product.id);

            console.log(chalk.bold(`\n📚 Knowledge Base Stats: ${product.name}\n`));
            console.log(chalk.cyan("Total Entries:   "), stats.total);
            console.log(chalk.cyan("Merged to Main:  "), stats.merged);
            console.log(chalk.cyan("Unmerged:        "), stats.unmerged);
            console.log();
            console.log(chalk.bold("By Type"));
            console.log(chalk.cyan("  Research:      "), stats.byType.research);
            console.log(chalk.cyan("  Handbooks:     "), stats.byType.handbook);
            console.log(chalk.cyan("  Decisions:     "), stats.byType.decision);
            console.log(chalk.cyan("  Reference:     "), stats.byType.reference);
            console.log();
        } catch (error) {
            console.error(chalk.red("Failed to get knowledge base stats:"), error);
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
    .option("-s, --subagent <subagent>", "Subagent to use", "engineer")
    .action(async (project, task, options) => {
        try {
            const pm = new ProjectManager(process.cwd());
            const tm = new TaskManager();
            const runtime = new AgentRuntime();
            const projects = pm.listProjects();
            const projectId = resolveProjectId(project, projects);

            const projectObj = pm.getProject(projectId);
            if (!projectObj) throw new Error("Project not found in storage");

            // Resolve task
            let targetTask;
            if (task) {
                const tasks = tm.listTasks(projectId);
                const matches = tasks.filter((t) => t.id.startsWith(task));
                if (matches.length === 0) throw new Error("No task found");
                targetTask = matches[0];
            } else {
                const executable = tm.getExecutableTasks(projectId);
                if (executable.length === 0) {
                    console.log(
                        chalk.yellow(
                            "No executable tasks found. All tasks may be completed or blocked."
                        )
                    );
                    return;
                }
                targetTask = executable[0];
            }

            if (!targetTask) throw new Error("Failed to resolve task");

            // Mark task as in-progress
            await tm.updateTask(projectId, targetTask.id, {
                status: "in_progress",
                startedAt: new Date().toISOString(),
                assignedSubagent: options.subagent,
            });

            // Run Agent
            const result = await runtime.runTask(projectObj, targetTask, options.subagent);

            // Update task with result
            await tm.updateTask(projectId, targetTask.id, {
                status: result.success ? "completed" : "failed",
                completedAt: new Date().toISOString(),
                verificationNotes: [result.message],
            });

            // Record economics
            const finance = new FinanceManager();
            finance.recordOperation(
                targetTask.assignedSubagent || options.subagent,
                result.tokensUsed
            );

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
    .option(
        "-p, --prompt <prompt>",
        "Prompt to send",
        "Say 'Hello Dark Factory!' and nothing else."
    )
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
            const finance = new FinanceManager();
            finance.recordOperation(options.model, response.tokensUsed);

            console.log(chalk.bold("Response:"));
            console.log(chalk.dim("─".repeat(50)));
            console.log(response.content);
            console.log(chalk.dim("─".repeat(50)));

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
