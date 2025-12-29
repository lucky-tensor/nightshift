/**
 * Git Manager
 * 
 * Handles git worktrees and branch management for isolated project execution.
 */

import { execSync } from "child_process";
import { existsSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const WORKTREE_BASE_DIR = join(homedir(), ".dark-factory", "worktrees");

export class GitManager {
    private baseRepoPath: string;

    constructor(baseRepoPath: string) {
        this.baseRepoPath = baseRepoPath;
        this.ensureBaseDir();
    }

    /**
     * Ensure the worktree base directory exists
     */
    private ensureBaseDir(): void {
        if (!existsSync(WORKTREE_BASE_DIR)) {
            mkdirSync(WORKTREE_BASE_DIR, { recursive: true });
        }
    }

    /**
     * Create a new git worktree for a project
     */
    async createWorktree(projectId: string, baseBranch: string = "master"): Promise<string> {
        const worktreePath = join(WORKTREE_BASE_DIR, projectId);
        const branchName = `df/task/${projectId}`;

        if (existsSync(worktreePath)) {
            throw new Error(`Worktree already exists at ${worktreePath}`);
        }

        try {
            // Create a unique branch for the task
            execSync(`git -C "${this.baseRepoPath}" branch "${branchName}" "${baseBranch}"`);

            // Add the worktree
            execSync(`git -C "${this.baseRepoPath}" worktree add "${worktreePath}" "${branchName}"`);

            return worktreePath;
        } catch (error) {
            // Cleanup branch if worktree creation fails
            try {
                execSync(`git -C "${this.baseRepoPath}" branch -D "${branchName}"`);
            } catch (e) { }
            throw new Error(`Failed to create worktree: ${error}`);
        }
    }

    /**
     * Remove a git worktree and its associated branch
     */
    async removeWorktree(projectId: string): Promise<void> {
        const worktreePath = join(WORKTREE_BASE_DIR, projectId);
        const branchName = `df/task/${projectId}`;

        if (!existsSync(worktreePath)) {
            return;
        }

        try {
            // Remove worktree from git
            execSync(`git -C "${this.baseRepoPath}" worktree remove "${worktreePath}" --force`);

            // Remove the branch
            try {
                execSync(`git -C "${this.baseRepoPath}" branch -D "${branchName}"`);
            } catch (e) { }
        } catch (error) {
            console.error(`Failed to remove worktree ${worktreePath}:`, error);
            // Fallback: manual directory removal if git fails
            if (existsSync(worktreePath)) {
                rmSync(worktreePath, { recursive: true, force: true });
            }
        }
    }

    /**
     * Commit all changes in a worktree
     */
    async commitChanges(worktreePath: string, message: string): Promise<void> {
        try {
            execSync(`git -C "${worktreePath}" add .`);
            execSync(`git -C "${worktreePath}" commit -m "${message}" --no-verify`);
        } catch (error) {
            // It's possible there are no changes to commit, which is fine
            if (!(error as any).stdout?.toString().includes("nothing to commit")) {
                throw new Error(`Failed to commit changes in ${worktreePath}: ${error}`);
            }
        }
    }

    /**
     * Get current branch in a worktree
     */
    getCurrentBranch(worktreePath: string): string {
        return execSync(`git -C "${worktreePath}" rev-parse --abbrev-ref HEAD`).toString().trim();
    }

    /**
     * Check if repo is clean
     */
    isClean(path: string): boolean {
        const status = execSync(`git -C "${path}" status --porcelain`).toString().trim();
        return status === "";
    }
}
