/**
 * Common utility functions for Nightshift
 *
 * This module provides reusable helper functions to promote DRY principles
 * and maintain consistency across the codebase.
 */

import type { ProjectSession } from "../types";
import { execSync } from "child_process";
import chalk from "chalk";

/**
 * Resolve a project ID from a full UUID or prefix
 *
 * @param idOrPrefix - Full project UUID or a prefix (minimum 1 character)
 * @param projects - Array of projects to search through
 * @returns The resolved full project ID
 * @throws Error if no project found or multiple matches exist
 *
 * @example
 * ```typescript
 * const projects = pm.listProjects();
 * const fullId = resolveProjectId("abc123", projects);
 * ```
 */
export function resolveProjectId(idOrPrefix: string, projects: ProjectSession[]): string {
    // If already a full UUID (36 characters), return as-is
    if (idOrPrefix.length === 36) {
        return idOrPrefix;
    }

    // Search for matching prefix
    const matches = projects.filter((p) => p.id.startsWith(idOrPrefix));

    if (matches.length === 0) {
        throw new Error(`No project found with ID prefix: ${idOrPrefix}`);
    }

    if (matches.length > 1) {
        throw new Error(`Multiple projects match ID prefix: ${idOrPrefix}`);
    }

    const matchedProject = matches[0];
    if (!matchedProject) {
        throw new Error("Failed to resolve project ID");
    }

    return matchedProject.id;
}

/**
 * Group models by provider/category
 *
 * @param models - Array of model names to categorize
 * @returns Object containing arrays of models grouped by type
 *
 * @example
 * ```typescript
 * const grouped = groupModels(["claude-sonnet", "gemini-3-flash"]);
 * // { claude: ["claude-sonnet"], gemini: ["gemini-3-flash"], other: [] }
 * ```
 */
export function groupModels(models: string[]): {
    gemini: string[];
    claude: string[];
    other: string[];
} {
    const geminiModels = models.filter((m) => m.toLowerCase().includes("gemini"));
    const claudeModels = models.filter((m) => m.toLowerCase().includes("claude"));
    const otherModels = models.filter(
        (m) => !m.toLowerCase().includes("gemini") && !m.toLowerCase().includes("claude")
    );

    return {
        gemini: geminiModels.sort(),
        claude: claudeModels.sort(),
        other: otherModels.sort(),
    };
}

/**
 * Format time duration in seconds to human-readable string
 *
 * @param seconds - Number of seconds
 * @returns Human-readable time string (e.g., "2m 30s", "1h 15m")
 *
 * @example
 * ```typescript
 * formatDuration(90); // "1m 30s"
 * formatDuration(3665); // "1h 1m"
 * ```
 */
export function formatDuration(seconds: number): string {
    if (seconds < 60) {
        return `${seconds}s`;
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes < 60) {
        return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

/**
 * Truncate a string with ellipsis if it exceeds max length
 *
 * @param str - String to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated string with "..." if needed
 *
 * @example
 * ```typescript
 * truncate("Very long error message here", 20); // "Very long error me..."
 * ```
 */
export function truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) {
        return str;
    }
    return str.substring(0, maxLength - 3) + "...";
}

/**
 * Extract provider name from model identifier
 *
 * @param _modelId - Model identifier (e.g., "claude-sonnet", "gemini-3-flash")
 * @returns Provider name ("google" or "anthropic")
 *
 * @example
 * ```typescript
 * getProviderFromModel("claude-sonnet"); // "google" (via Antigravity)
 * getProviderFromModel("gemini-3-flash"); // "google"
 * ```
 */
export function getProviderFromModel(_modelId: string): "google" | "anthropic" {
    // All Antigravity models come through google provider
    // This is a simplification - in reality, both Claude and Gemini use google provider
    return "google";
}

/**
 * Git helper: Add and commit files with optional error handling
 *
 * Wraps git add and commit operations with consistent error handling.
 * Silently ignores git errors if ignoreErrors is true.
 *
 * @param cwd - Working directory for git operations
 * @param files - Files/patterns to add (e.g., ".", "PRD.md", "docs/")
 * @param message - Commit message
 * @param options - Optional configuration
 *
 * @example
 * ```typescript
 * gitCommit("/path/to/repo", "PRD.md", "docs: Add Product Requirements Document");
 * gitCommit("/path/to/repo", "docs/", "docs: Merge knowledge base", { ignoreErrors: true });
 * ```
 */
export function gitCommit(
    cwd: string,
    files: string,
    message: string,
    options: { ignoreErrors?: boolean } = {}
): void {
    try {
        execSync(`git add ${files}`, { cwd });
        execSync(`git commit -m "${message}"`, { cwd });
    } catch (error) {
        if (!options.ignoreErrors) {
            throw error;
        }
        // Silently ignore git errors (e.g., nothing to commit)
    }
}

/**
 * Logging helper: Format and display info message
 *
 * @param message - Message to display
 *
 * @example
 * ```typescript
 * logInfo("Initializing factory...");
 * ```
 */
export function logInfo(message: string): void {
    console.error(chalk.blue(message));
}

/**
 * Logging helper: Format and display success message
 *
 * @param message - Message to display
 *
 * @example
 * ```typescript
 * logSuccess("✓ Factory initialized!");
 * ```
 */
export function logSuccess(message: string): void {
    console.error(chalk.green(message));
}

/**
 * Logging helper: Format and display warning message
 *
 * @param message - Message to display
 *
 * @example
 * ```typescript
 * logWarning("No docs found in project worktree");
 * ```
 */
export function logWarning(message: string): void {
    console.error(chalk.yellow(message));
}

/**
 * Logging helper: Format and display error message
 *
 * @param message - Message to display
 *
 * @example
 * ```typescript
 * logError("Failed to generate PRD");
 * ```
 */
export function logError(message: string): void {
    console.error(chalk.red(message));
}

/**
 * Logging helper: Format and display dim message (secondary info)
 *
 * @param message - Message to display
 *
 * @example
 * ```typescript
 * logDim("Storage location: ~/.nightshift/");
 * ```
 */
export function logDim(message: string): void {
    console.error(chalk.dim(message));
}
