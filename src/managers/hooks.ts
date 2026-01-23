/**
 * Git Hooks Manager
 *
 * Installs and manages git hooks for nightshift enforcement.
 * Hooks enforce nag completion, commit discipline, and other quality gates.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync, unlinkSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

// ============================================================================
// TYPES
// ============================================================================

export interface NagStatus {
    /** Session ID this status belongs to */
    sessionId: string;
    /** Map of nag template name to completion status */
    nags: Record<string, NagCompletion>;
    /** ISO timestamp of last update */
    lastUpdated: string;
}

export interface NagCompletion {
    /** Whether the nag has been completed */
    completed: boolean;
    /** ISO timestamp when completed */
    completedAt: string | null;
    /** Individual check statuses */
    checks: Record<string, boolean>;
}

export interface HookConfig {
    /** Whether to enforce nags on commit */
    enforceNags: boolean;
    /** Whether to allow bypass with --no-verify */
    allowBypass: boolean;
    /** File patterns that trigger specific nags */
    nagTriggers: Record<string, string[]>;
}

// ============================================================================
// HOOKS MANAGER
// ============================================================================

export class HooksManager {
    private readonly NIGHTSHIFT_DIR = ".nightshift";
    private readonly HOOKS_DIR = ".git/hooks";
    private readonly NAG_STATUS_FILE = "nag-status.json";

    /**
     * Install all nightshift git hooks in a repository
     *
     * @param repoPath - Absolute path to the git repository
     */
    async installHooks(repoPath: string): Promise<void> {
        const hooksDir = join(repoPath, this.HOOKS_DIR);

        // Ensure hooks directory exists
        if (!existsSync(hooksDir)) {
            mkdirSync(hooksDir, { recursive: true });
        }

        // Install pre-commit hook
        await this.installPreCommitHook(repoPath);

        // Install commit-msg hook
        await this.installCommitMsgHook(repoPath);

        // Initialize nag status file
        this.initializeNagStatus(repoPath);
    }

    /**
     * Uninstall all nightshift git hooks
     *
     * @param repoPath - Absolute path to the git repository
     */
    async uninstallHooks(repoPath: string): Promise<void> {
        const preCommitPath = join(repoPath, this.HOOKS_DIR, "pre-commit");
        const commitMsgPath = join(repoPath, this.HOOKS_DIR, "commit-msg");

        // Only remove if it's a nightshift hook
        if (existsSync(preCommitPath) && this.isNightshiftHook(preCommitPath)) {
            unlinkSync(preCommitPath);
        }

        if (existsSync(commitMsgPath) && this.isNightshiftHook(commitMsgPath)) {
            unlinkSync(commitMsgPath);
        }
    }

    /**
     * Check if a hook file is a nightshift-managed hook
     */
    private isNightshiftHook(hookPath: string): boolean {
        try {
            const content = readFileSync(hookPath, "utf-8");
            return content.includes("NIGHTSHIFT_HOOK");
        } catch {
            return false;
        }
    }

    /**
     * Install the pre-commit hook
     */
    private async installPreCommitHook(repoPath: string): Promise<void> {
        const hookPath = join(repoPath, this.HOOKS_DIR, "pre-commit");
        const nightshiftDir = this.NIGHTSHIFT_DIR;

        const hookScript = `#!/bin/bash
# NIGHTSHIFT_HOOK - Pre-commit hook for nag enforcement
# Do not modify this hook manually - it is managed by Nightshift

NAG_STATUS="${nightshiftDir}/nag-status.json"

# Check if this is a nightshift-managed repo
if [ ! -f "$NAG_STATUS" ]; then
    # Not a nightshift repo, allow commit
    exit 0
fi

# Check if NIGHTSHIFT_BYPASS is set (for human-supervised commits)
if [ -n "$NIGHTSHIFT_BYPASS" ]; then
    echo "⚠️  Nightshift nag check bypassed (NIGHTSHIFT_BYPASS set)"
    exit 0
fi

# Parse the nag status and check if all required nags are complete
# Using node for JSON parsing since it's likely available in a JS project
check_nags() {
    node -e "
        const fs = require('fs');
        try {
            const status = JSON.parse(fs.readFileSync('$NAG_STATUS', 'utf-8'));
            const incomplete = Object.entries(status.nags || {})
                .filter(([name, nag]) => !nag.completed)
                .map(([name]) => name);
            
            if (incomplete.length > 0) {
                console.error('❌ COMMIT BLOCKED: Incomplete nag checklists:');
                incomplete.forEach(name => console.error('   - ' + name));
                console.error('');
                console.error('Complete the quality checks and mark nags complete before committing.');
                console.error('To bypass (human-supervised): NIGHTSHIFT_BYPASS=1 git commit ...');
                process.exit(1);
            }
        } catch (err) {
            // If we can't parse the status, allow commit
            console.error('⚠️  Could not parse nag status, allowing commit');
        }
    " 2>&1
    return $?
}

check_nags
exit $?
`;

        writeFileSync(hookPath, hookScript, { mode: 0o755 });
    }

    /**
     * Install the commit-msg hook
     */
    private async installCommitMsgHook(repoPath: string): Promise<void> {
        const hookPath = join(repoPath, this.HOOKS_DIR, "commit-msg");

        const hookScript = `#!/bin/bash
# NIGHTSHIFT_HOOK - Commit message hook for metadata enforcement
# Do not modify this hook manually - it is managed by Nightshift

COMMIT_MSG_FILE="$1"

# Check if NIGHTSHIFT_BYPASS is set
if [ -n "$NIGHTSHIFT_BYPASS" ]; then
    exit 0
fi

# Could add validation for commit message format here
# For now, we just pass through

exit 0
`;

        writeFileSync(hookPath, hookScript, { mode: 0o755 });
    }

    /**
     * Initialize the nag status file for a repository
     */
    initializeNagStatus(repoPath: string, sessionId: string = "unknown"): void {
        const nightshiftDir = join(repoPath, this.NIGHTSHIFT_DIR);
        const statusPath = join(nightshiftDir, this.NAG_STATUS_FILE);

        // Ensure .nightshift directory exists
        if (!existsSync(nightshiftDir)) {
            mkdirSync(nightshiftDir, { recursive: true });
        }

        // Only initialize if doesn't exist
        if (!existsSync(statusPath)) {
            const initialStatus: NagStatus = {
                sessionId,
                nags: {},
                lastUpdated: new Date().toISOString(),
            };

            writeFileSync(statusPath, JSON.stringify(initialStatus, null, 2));
        }
    }

    /**
     * Get the current nag status
     */
    getNagStatus(repoPath: string): NagStatus | null {
        const statusPath = join(repoPath, this.NIGHTSHIFT_DIR, this.NAG_STATUS_FILE);

        if (!existsSync(statusPath)) {
            return null;
        }

        try {
            return JSON.parse(readFileSync(statusPath, "utf-8"));
        } catch {
            return null;
        }
    }

    /**
     * Register a nag that must be completed before commit
     *
     * @param repoPath - Repository path
     * @param nagName - Name of the nag template
     * @param checks - List of check names that must be completed
     */
    registerNag(repoPath: string, nagName: string, checks: string[]): void {
        const statusPath = join(repoPath, this.NIGHTSHIFT_DIR, this.NAG_STATUS_FILE);
        const status = this.getNagStatus(repoPath) || {
            sessionId: "unknown",
            nags: {},
            lastUpdated: new Date().toISOString(),
        };

        status.nags[nagName] = {
            completed: false,
            completedAt: null,
            checks: checks.reduce((acc, check) => ({ ...acc, [check]: false }), {}),
        };
        status.lastUpdated = new Date().toISOString();

        writeFileSync(statusPath, JSON.stringify(status, null, 2));
    }

    /**
     * Mark a specific check within a nag as complete
     */
    completeCheck(repoPath: string, nagName: string, checkName: string): void {
        const statusPath = join(repoPath, this.NIGHTSHIFT_DIR, this.NAG_STATUS_FILE);
        const status = this.getNagStatus(repoPath);

        if (!status || !status.nags[nagName]) {
            return;
        }

        status.nags[nagName].checks[checkName] = true;

        // Check if all checks are complete
        const allComplete = Object.values(status.nags[nagName].checks).every(Boolean);
        if (allComplete) {
            status.nags[nagName].completed = true;
            status.nags[nagName].completedAt = new Date().toISOString();
        }

        status.lastUpdated = new Date().toISOString();
        writeFileSync(statusPath, JSON.stringify(status, null, 2));
    }

    /**
     * Mark an entire nag as complete
     */
    completeNag(repoPath: string, nagName: string): void {
        const statusPath = join(repoPath, this.NIGHTSHIFT_DIR, this.NAG_STATUS_FILE);
        const status = this.getNagStatus(repoPath);

        if (!status || !status.nags[nagName]) {
            return;
        }

        // Mark all checks as complete
        for (const check of Object.keys(status.nags[nagName].checks)) {
            status.nags[nagName].checks[check] = true;
        }

        status.nags[nagName].completed = true;
        status.nags[nagName].completedAt = new Date().toISOString();
        status.lastUpdated = new Date().toISOString();

        writeFileSync(statusPath, JSON.stringify(status, null, 2));
    }

    /**
     * Reset a nag (mark as incomplete)
     */
    resetNag(repoPath: string, nagName: string): void {
        const statusPath = join(repoPath, this.NIGHTSHIFT_DIR, this.NAG_STATUS_FILE);
        const status = this.getNagStatus(repoPath);

        if (!status || !status.nags[nagName]) {
            return;
        }

        // Reset all checks
        for (const check of Object.keys(status.nags[nagName].checks)) {
            status.nags[nagName].checks[check] = false;
        }

        status.nags[nagName].completed = false;
        status.nags[nagName].completedAt = null;
        status.lastUpdated = new Date().toISOString();

        writeFileSync(statusPath, JSON.stringify(status, null, 2));
    }

    /**
     * Clear all nags (for new session)
     */
    clearNags(repoPath: string, sessionId: string): void {
        const statusPath = join(repoPath, this.NIGHTSHIFT_DIR, this.NAG_STATUS_FILE);

        const status: NagStatus = {
            sessionId,
            nags: {},
            lastUpdated: new Date().toISOString(),
        };

        writeFileSync(statusPath, JSON.stringify(status, null, 2));
    }

    /**
     * Check if all registered nags are complete
     */
    allNagsComplete(repoPath: string): boolean {
        const status = this.getNagStatus(repoPath);
        if (!status) return true; // No nags registered

        return Object.values(status.nags).every((nag) => nag.completed);
    }

    /**
     * Get list of incomplete nags
     */
    getIncompleteNags(repoPath: string): string[] {
        const status = this.getNagStatus(repoPath);
        if (!status) return [];

        return Object.entries(status.nags)
            .filter(([_, nag]) => !nag.completed)
            .map(([name]) => name);
    }

    /**
     * Detect which nags should apply based on changed files
     *
     * @param repoPath - Repository path
     * @returns List of nag template names that should be applied
     */
    detectRequiredNags(repoPath: string): string[] {
        try {
            // Get list of staged files
            const stagedFiles = execSync(`git -C "${repoPath}" diff --cached --name-only`, {
                encoding: "utf-8",
            })
                .trim()
                .split("\n")
                .filter(Boolean);

            const requiredNags: Set<string> = new Set();

            for (const file of stagedFiles) {
                // JavaScript/TypeScript files
                if (/\.(js|jsx|ts|tsx|mjs|cjs)$/.test(file)) {
                    requiredNags.add("javascript-nag");
                }

                // Security-sensitive files
                if (
                    file.includes("auth") ||
                    file.includes("security") ||
                    file.includes("crypto") ||
                    file.includes("password")
                ) {
                    requiredNags.add("security-nag");
                }

                // Documentation files
                if (/\.(md|mdx|rst|txt)$/.test(file) || file.includes("docs/")) {
                    requiredNags.add("documentation-nag");
                }
            }

            return Array.from(requiredNags);
        } catch {
            return [];
        }
    }
}
