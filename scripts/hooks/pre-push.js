#!/usr/bin/env node

import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

const NAGS_DIR = join(process.cwd(), ".nightshift", "nags");
const NAGS_CONFIG = join(NAGS_DIR, "nags.json");

console.log("[pre-push] Running strict nag-based validation...");

let hasErrors = false;
const errors = [];

function loadNagsConfig() {
    if (!existsSync(NAGS_CONFIG)) {
        console.log("[pre-push] No nags configuration found, using defaults");
        return null;
    }
    try {
        return JSON.parse(readFileSync(NAGS_CONFIG, "utf-8"));
    } catch {
        return null;
    }
}

function checkCommand(name, command, failOnError = true) {
    console.log(`[pre-push] Checking: ${name}`);
    try {
        execSync(command, { stdio: "pipe", cwd: process.cwd() });
        console.log(`[pre-push] ${name} passed`);
        return true;
    } catch (e) {
        const errorMsg = `${name} FAILED`;
        console.error(`[pre-push] ${errorMsg}`);
        errors.push(errorMsg);
        if (failOnError) {
            hasErrors = true;
        }
        return false;
    }
}

try {
    const config = loadNagsConfig();

    if (!config || !config.nags || config.nags.length === 0) {
        const projectType = detectProjectType();
        console.log(`[pre-push] Auto-detected project type: ${projectType}`);

        if (projectType === "nodejs" || projectType === "bun") {
            checkCommand("TypeScript Type Check", "npx tsc --noEmit");
            checkCommand("ESLint", "bunx eslint .");
            checkCommand("Prettier Format Check", "bunx prettier --check .");
        } else if (projectType === "rust") {
            checkCommand("Cargo Check", "cargo check");
            checkCommand("Cargo Format Check", "cargo fmt --check");
            checkCommand("Cargo Clippy", "cargo clippy");
        } else if (projectType === "python") {
            checkCommand("Ruff Check", "python -m ruff check .");
            checkCommand("Black Format Check", "python -m black --check .");
            checkCommand("Mypy Type Check", "python -m mypy .");
        } else {
            console.log("[pre-push] Unknown project type, skipping validation");
        }
    } else {
        const prePushNags = (config.nags || []).filter(
            (n) => n.stage === "pre-push" && n.enabled !== false
        );

        for (const nag of prePushNags) {
            if (nag.type === "tool") {
                checkCommand(nag.name, nag.command, nag.blocking);
            } else if (nag.type === "agent") {
                console.log(
                    `[pre-push] Agent nag "${nag.name}" requires agent runtime, skipping in script`
                );
            }
        }
    }
} catch (error) {
    console.error("[pre-push] Error during execution:", error);
    hasErrors = true;
}

function detectProjectType() {
    if (existsSync(join(process.cwd(), "package.json"))) return "nodejs";
    if (existsSync(join(process.cwd(), "bun.lockb"))) return "bun";
    if (existsSync(join(process.cwd(), "Cargo.toml"))) return "rust";
    if (
        existsSync(join(process.cwd(), "pyproject.toml")) ||
        existsSync(join(process.cwd(), "requirements.txt"))
    ) {
        return "python";
    }
    return "unknown";
}

if (hasErrors) {
    console.error("\n[pre-push] PUSH BLOCKED due to nag failures:");
    errors.forEach((e) => console.error(`  - ${e}`));
    console.error("\n[pre-push] Fix the issues and try again.");
    process.exit(1);
} else {
    console.log("[pre-push] All nag checks passed - push allowed");
    process.exit(0);
}
