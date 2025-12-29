/**
 * Git Manager
 *
 * Handles git worktrees and branch management for isolated project execution.
 */

import { execSync } from "child_process";
import { existsSync, mkdirSync, rmSync } from "fs";
import { join, dirname } from "path";

export class GitManager {
    private baseRepoPath: string;
    private worktreeBaseDir: string;

    /**
     * Create a new GitManager instance
     *
     * @param baseRepoPath - Absolute path to the base git repository
     */
    constructor(baseRepoPath: string) {
        this.baseRepoPath = baseRepoPath;
        // Worktrees are created as siblings to the base repo
        this.worktreeBaseDir = dirname(baseRepoPath);
    }

    /**
     * Create a new git worktree for isolated project work
     *
     * Creates a new branch and worktree as a sibling to the main project directory.
     * The worktree allows the AI agent to work independently without affecting
     * the main repository or other concurrent projects.
     *
     * @param projectId - UUID of the project
     * @param baseBranch - Base branch to fork from (default: "master")
     * @returns Absolute path to the created worktree
     * @throws Error if worktree creation fails or already exists
     *
     * @example
     * ```typescript
     * const git = new GitManager(process.cwd());
     * const worktreePath = await git.createWorktree(projectId);
     * // Creates worktree at ../worktree_df_task_{projectId}/
     * ```
     */
    async createWorktree(projectId: string, baseBranch: string = "master"): Promise<string> {
        const worktreeName = `worktree_df_task_${projectId}`;
        const worktreePath = join(this.worktreeBaseDir, worktreeName);
        const branchName = `df/task/${projectId}`;

        if (existsSync(worktreePath)) {
            throw new Error(`Worktree already exists at ${worktreePath}`);
        }

        try {
            // Create a unique branch for the task
            execSync(`git -C "${this.baseRepoPath}" branch "${branchName}" "${baseBranch}"`);

            // Add the worktree
            execSync(
                `git -C "${this.baseRepoPath}" worktree add "${worktreePath}" "${branchName}"`
            );

            return worktreePath;
        } catch (error) {
            // Cleanup branch if worktree creation fails
            try {
                execSync(`git -C "${this.baseRepoPath}" branch -D "${branchName}"`);
            } catch {
                // Ignore branch cleanup errors
            }
            throw new Error(`Failed to create worktree: ${error}`);
        }
    }

    /**
     * Remove a git worktree and its associated branch
     *
     * Cleans up both the worktree and the git branch. If git commands fail,
     * falls back to manual directory removal.
     *
     * @param projectId - UUID of the project
     */
    async removeWorktree(projectId: string): Promise<void> {
        const worktreeName = `worktree_df_task_${projectId}`;
        const worktreePath = join(this.worktreeBaseDir, worktreeName);
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
            } catch {
                // Ignore branch deletion errors
            }
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
     *
     * Stages and commits all changes (tracked and untracked files).
     * Uses --no-verify to skip git hooks.
     *
     * @param worktreePath - Absolute path to the worktree
     * @param message - Commit message
     * @throws Error if commit fails (except for "nothing to commit")
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
     * Get the current branch name in a worktree
     *
     * @param worktreePath - Absolute path to the worktree
     * @returns Current branch name
     */
    getCurrentBranch(worktreePath: string): string {
        return execSync(`git -C "${worktreePath}" rev-parse --abbrev-ref HEAD`).toString().trim();
    }

    /**
     * Check if a git repository has uncommitted changes
     *
     * @param path - Path to the git repository or worktree
     * @returns true if clean (no changes), false if dirty
     */
    isClean(path: string): boolean {
        const status = execSync(`git -C "${path}" status --porcelain`).toString().trim();
        return status === "";
    }
}
