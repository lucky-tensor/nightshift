#!/usr/bin/env bun

/**
 * Dark Factory CLI
 * 
 * Main entry point for the Dark Factory orchestration tool.
 */

import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { getStorage } from "../storage/yaml";
import { getOpenCodeAdapter, initializeOpenCode } from "../adapter/opencode";
import { v4 as uuid } from "uuid";

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

// ============================================================================
// Status Command
// ============================================================================

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
