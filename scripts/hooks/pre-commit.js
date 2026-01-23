#!/usr/bin/env node

import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

const NAGS_DIR = join(process.cwd(), ".nightshift", "nags");
const NAGS_CONFIG = join(NAGS_DIR, "nags.json");

console.log("[pre-commit] Running nags-based automated fixes...");

let exitCode = 0;

function loadNagsConfig() {
    if (!existsSync(NAGS_CONFIG)) {
        console.log("[pre-commit] No nags configuration found, using defaults");
        return null;
    }
    try {
        return JSON.parse(readFileSync(NAGS_CONFIG, "utf-8"));
    } catch {
        return null;
    }
}

function runCommand(name, command, allowFailure = true) {
    console.log(`[pre-commit] Running: ${name}`);
    try {
        execSync(command, { stdio: "inherit", cwd: process.cwd() });
        console.log(`[pre-commit] ${name} passed`);
        return true;
    } catch (e) {
        if (allowFailure) {
            console.log(`[pre-commit] ${name} failed (non-blocking): ${e.message}`);
            return true;
        }
        console.error(`[pre-commit] ${name} FAILED: ${e.message}`);
        exitCode = 1;
        return false;
    }
}

try {
    const config = loadNagsConfig();

    if (!config || !config.nags || config.nags.length === 0) {
        const projectType = detectProjectType();
        console.log(`[pre-commit] Auto-detected project type: ${projectType}`);

        if (projectType === "nodejs" || projectType === "bun") {
            runCommand("Prettier", "bunx prettier --write .");
            runCommand("ESLint", "bunx eslint . --fix", true);
        } else if (projectType === "rust") {
            runCommand("Cargo Format", "cargo fmt");
            runCommand("Cargo Clippy Fix", "cargo clippy --fix", true);
        } else if (projectType === "python") {
            runCommand("Ruff Fix", "python -m ruff check --fix .");
            runCommand("Black", "python -m black .");
            runCommand("ISort", "python -m isort .");
        } else {
            console.log("[pre-commit] Unknown project type, skipping formatting");
        }
    } else {
        const preCommitNags = (config.nags || []).filter(
            (n) => n.stage === "pre-commit" && n.enabled !== false
        );

        for (const nag of preCommitNags) {
            if (nag.type === "tool") {
                runCommand(nag.name, nag.command, !nag.blocking);
            } else if (nag.type === "agent") {
                console.log(
                    `[pre-commit] Agent nag "${nag.name}" requires agent runtime, skipping in script`
                );
            }
        }
    }
} catch (error) {
    console.error("[pre-commit] Error during execution:", error);
    exitCode = 1;
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

if (exitCode === 0) {
    console.log("[pre-commit] Nags execution complete");
} else {
    console.error("[pre-commit] Nags execution failed");
}

process.exit(exitCode);
