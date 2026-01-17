/**
 * Commit Policy Manager
 *
 * Enforces commit discipline to ensure agents make frequent, small commits.
 * This is critical for:
 * - Code reviews (smaller diffs are easier to review)
 * - Git bisect (easier to find which commit introduced a bug)
 * - Rollback capability (can revert small, focused changes)
 */

import { execSync } from "child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

// ============================================================================
// TYPES
// ============================================================================

export interface CommitPolicy {
    /** Maximum number of changed lines before triggering a reminder (default: 200) */
    maxDiffLines: number;
    /** Maximum number of changed files before triggering a reminder (default: 10) */
    maxFilesChanged: number;
    /** Maximum minutes since last commit before triggering a reminder (default: 30) */
    maxMinutesSinceCommit: number;
    /** Minimum minutes between commits to avoid commit spam (default: 2) */
    minMinutesBetweenCommits: number;
}

export interface PolicyViolation {
    type: "diff_too_large" | "too_many_files" | "time_exceeded";
    message: string;
    currentValue: number;
    threshold: number;
}

export interface DiffStats {
    /** Number of lines added */
    additions: number;
    /** Number of lines deleted */
    deletions: number;
    /** Total changed lines */
    totalLines: number;
    /** Number of files changed */
    filesChanged: number;
    /** List of changed file paths */
    changedFiles: string[];
}

export interface CommitHistory {
    /** Hash of the last commit */
    lastCommitHash: string;
    /** ISO timestamp of last commit */
    lastCommitTime: string;
    /** Number of commits in current session */
    commitCount: number;
    /** Average lines per commit */
    averageLinesPerCommit: number;
}

// ============================================================================
// COMMIT POLICY MANAGER
// ============================================================================

export class CommitPolicyManager {
    private readonly NIGHTSHIFT_DIR = ".nightshift";
    private readonly POLICY_FILE = "commit-policy.json";
    private readonly DEFAULT_POLICY: CommitPolicy = {
        maxDiffLines: 200,
        maxFilesChanged: 10,
        maxMinutesSinceCommit: 30,
        minMinutesBetweenCommits: 2,
    };

    /**
     * Get the current commit policy for a repository
     */
    getPolicy(repoPath: string): CommitPolicy {
        const policyPath = join(repoPath, this.NIGHTSHIFT_DIR, this.POLICY_FILE);

        if (existsSync(policyPath)) {
            try {
                const custom = JSON.parse(readFileSync(policyPath, "utf-8"));
                return { ...this.DEFAULT_POLICY, ...custom };
            } catch {
                return this.DEFAULT_POLICY;
            }
        }

        return this.DEFAULT_POLICY;
    }

    /**
     * Set a custom commit policy for a repository
     */
    setPolicy(repoPath: string, policy: Partial<CommitPolicy>): void {
        const nightshiftDir = join(repoPath, this.NIGHTSHIFT_DIR);
        const policyPath = join(nightshiftDir, this.POLICY_FILE);

        if (!existsSync(nightshiftDir)) {
            mkdirSync(nightshiftDir, { recursive: true });
        }

        const fullPolicy = { ...this.DEFAULT_POLICY, ...policy };
        writeFileSync(policyPath, JSON.stringify(fullPolicy, null, 2));
    }

    /**
     * Get statistics about the current uncommitted changes
     */
    getCurrentDiffStats(repoPath: string): DiffStats {
        try {
            // Get list of changed files (staged and unstaged)
            const statusOutput = execSync(`git -C "${repoPath}" status --porcelain`, {
                encoding: "utf-8",
            }).trim();

            const changedFiles = statusOutput
                .split("\n")
                .filter(Boolean)
                .map((line) => line.slice(3).trim());

            // Get diff statistics
            const diffOutput = execSync(
                `git -C "${repoPath}" diff --stat HEAD 2>/dev/null || echo ""`,
                {
                    encoding: "utf-8",
                }
            ).trim();

            // Parse additions and deletions from diff output
            let additions = 0;
            let deletions = 0;

            // Also check staged changes
            const stagedDiffOutput = execSync(
                `git -C "${repoPath}" diff --cached --stat HEAD 2>/dev/null || echo ""`,
                { encoding: "utf-8" }
            ).trim();

            const combinedOutput = diffOutput + "\n" + stagedDiffOutput;

            // Count insertions and deletions from the stat output
            const insertionMatch = combinedOutput.match(/(\d+) insertions?\(\+\)/g);
            const deletionMatch = combinedOutput.match(/(\d+) deletions?\(-\)/g);

            if (insertionMatch) {
                additions = insertionMatch.reduce((sum, match) => {
                    const num = parseInt(match.match(/\d+/)?.[0] || "0", 10);
                    return sum + num;
                }, 0);
            }

            if (deletionMatch) {
                deletions = deletionMatch.reduce((sum, match) => {
                    const num = parseInt(match.match(/\d+/)?.[0] || "0", 10);
                    return sum + num;
                }, 0);
            }

            return {
                additions,
                deletions,
                totalLines: additions + deletions,
                filesChanged: changedFiles.length,
                changedFiles,
            };
        } catch {
            return {
                additions: 0,
                deletions: 0,
                totalLines: 0,
                filesChanged: 0,
                changedFiles: [],
            };
        }
    }

    /**
     * Get the time since the last commit in minutes
     */
    getMinutesSinceLastCommit(repoPath: string): number {
        try {
            const lastCommitTime = execSync(
                `git -C "${repoPath}" log -1 --format=%ci 2>/dev/null || echo ""`,
                { encoding: "utf-8" }
            ).trim();

            if (!lastCommitTime) {
                return 0; // No commits yet, don't trigger time-based violation
            }

            const lastCommitDate = new Date(lastCommitTime);
            const now = new Date();
            const diffMs = now.getTime() - lastCommitDate.getTime();
            return Math.floor(diffMs / (1000 * 60));
        } catch {
            return 0;
        }
    }

    /**
     * Get commit history statistics
     */
    getCommitHistory(repoPath: string, sinceMinutes: number = 60): CommitHistory | null {
        try {
            const since = new Date(Date.now() - sinceMinutes * 60 * 1000).toISOString();

            // Get commits since timestamp
            const logOutput = execSync(
                `git -C "${repoPath}" log --since="${since}" --format="%H|%ci" 2>/dev/null || echo ""`,
                { encoding: "utf-8" }
            ).trim();

            if (!logOutput) {
                return null;
            }

            const commits = logOutput.split("\n").filter(Boolean);
            const latestCommit = commits[0]?.split("|");

            // Get average lines per commit
            const statOutput = execSync(
                `git -C "${repoPath}" log --since="${since}" --numstat --format="" 2>/dev/null || echo ""`,
                { encoding: "utf-8" }
            ).trim();

            let totalLines = 0;
            if (statOutput) {
                const lines = statOutput.split("\n").filter(Boolean);
                for (const line of lines) {
                    const parts = line.split("\t");
                    if (parts.length >= 2) {
                        const add = parseInt(parts[0] || "0", 10) || 0;
                        const del = parseInt(parts[1] || "0", 10) || 0;
                        totalLines += add + del;
                    }
                }
            }

            return {
                lastCommitHash: latestCommit?.[0] || "",
                lastCommitTime: latestCommit?.[1] || "",
                commitCount: commits.length,
                averageLinesPerCommit:
                    commits.length > 0 ? Math.round(totalLines / commits.length) : 0,
            };
        } catch {
            return null;
        }
    }

    /**
     * Check if the current state violates the commit policy
     *
     * @returns The violation if found, null otherwise
     */
    checkPolicyViolation(repoPath: string): PolicyViolation | null {
        const policy = this.getPolicy(repoPath);
        const stats = this.getCurrentDiffStats(repoPath);
        const minutesSinceCommit = this.getMinutesSinceLastCommit(repoPath);

        // Check diff size
        if (stats.totalLines > policy.maxDiffLines) {
            return {
                type: "diff_too_large",
                message: `Your changes are ${stats.totalLines} lines, exceeding the ${policy.maxDiffLines} line limit.`,
                currentValue: stats.totalLines,
                threshold: policy.maxDiffLines,
            };
        }

        // Check number of files
        if (stats.filesChanged > policy.maxFilesChanged) {
            return {
                type: "too_many_files",
                message: `You've modified ${stats.filesChanged} files, exceeding the ${policy.maxFilesChanged} file limit.`,
                currentValue: stats.filesChanged,
                threshold: policy.maxFilesChanged,
            };
        }

        // Check time since last commit (only if there are changes)
        if (stats.totalLines > 0 && minutesSinceCommit > policy.maxMinutesSinceCommit) {
            return {
                type: "time_exceeded",
                message: `It's been ${minutesSinceCommit} minutes since your last commit, exceeding the ${policy.maxMinutesSinceCommit} minute limit.`,
                currentValue: minutesSinceCommit,
                threshold: policy.maxMinutesSinceCommit,
            };
        }

        return null;
    }

    /**
     * Generate a reminder message for agents when policy is violated
     */
    generateCommitReminder(violation: PolicyViolation): string {
        const header = `
╔══════════════════════════════════════════════════════════════╗
║              ⚠️  COMMIT DISCIPLINE REMINDER                   ║
╠══════════════════════════════════════════════════════════════╣`;

        let body = "";
        let guidance = "";

        switch (violation.type) {
            case "diff_too_large":
                body = `
║  Your changes are getting too large.                         ║
║  Current: ${String(violation.currentValue).padEnd(10)} lines  |  Limit: ${String(violation.threshold).padEnd(10)} lines   ║`;
                guidance = `
║  GUIDANCE:                                                   ║
║  1. Commit your current work now with a descriptive message  ║
║  2. Each commit should represent ONE logical change          ║
║  3. Large diffs are hard to review and debug                 ║`;
                break;

            case "too_many_files":
                body = `
║  You've modified too many files at once.                     ║
║  Current: ${String(violation.currentValue).padEnd(10)} files  |  Limit: ${String(violation.threshold).padEnd(10)} files   ║`;
                guidance = `
║  GUIDANCE:                                                   ║
║  1. Commit changes to related files together                 ║
║  2. Group by feature or component                            ║
║  3. Each commit should be atomic and focused                 ║`;
                break;

            case "time_exceeded":
                body = `
║  Too much time has passed since your last commit.            ║
║  Current: ${String(violation.currentValue).padEnd(10)} min    |  Limit: ${String(violation.threshold).padEnd(10)} min     ║`;
                guidance = `
║  GUIDANCE:                                                   ║
║  1. Commit frequently to save your progress                  ║
║  2. Small commits enable easier rollback                     ║
║  3. "Work-in-progress" commits are acceptable                ║`;
                break;
        }

        const footer = `
╠══════════════════════════════════════════════════════════════╣
║  ACTION: Please commit your changes now.                     ║
╚══════════════════════════════════════════════════════════════╝`;

        return header + body + guidance + footer;
    }

    /**
     * Check if enough time has passed since last commit to allow a new one
     */
    canCommit(repoPath: string): boolean {
        const policy = this.getPolicy(repoPath);
        const minutesSinceCommit = this.getMinutesSinceLastCommit(repoPath);
        return minutesSinceCommit >= policy.minMinutesBetweenCommits;
    }

    /**
     * Get a summary of current state for agent context
     */
    getStatusSummary(repoPath: string): string {
        const stats = this.getCurrentDiffStats(repoPath);
        const minutesSince = this.getMinutesSinceLastCommit(repoPath);
        const violation = this.checkPolicyViolation(repoPath);

        let status = `📊 **Commit Status**: ${stats.totalLines} lines changed across ${stats.filesChanged} files`;
        status += `\n⏱️ **Time Since Last Commit**: ${minutesSince} minutes`;

        if (violation) {
            status += `\n⚠️ **Policy Violation**: ${violation.message}`;
        } else {
            status += `\n✅ **Status**: Within policy limits`;
        }

        return status;
    }
}
