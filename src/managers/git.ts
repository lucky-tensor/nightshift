/**
 * Git Manager
 *
 * Handles git worktrees and branch management for isolated project execution.
 */

import { execSync } from "child_process";
import { existsSync, mkdirSync, rmSync } from "fs";
import { join, dirname } from "path";
import type { CommitMetadata, EnhancedCommitMessage } from "../types/index";
import { HooksManager } from "./hooks";

export class GitManager {
    private baseRepoPath: string;
    private worktreeBaseDir: string;
    private hooksManager: HooksManager;

    /**
     * Create a new GitManager instance
     *
     * @param baseRepoPath - Absolute path to the base git repository
     */
    constructor(baseRepoPath: string) {
        this.baseRepoPath = baseRepoPath;
        // Worktrees are created as siblings to the base repo
        this.worktreeBaseDir = dirname(baseRepoPath);
        this.hooksManager = new HooksManager();
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
     * @param installHooks - Whether to install nightshift hooks (default: true)
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
    async createWorktree(
        projectId: string,
        baseBranch: string = "master",
        installHooks: boolean = true
    ): Promise<string> {
        const worktreeName = `worktree_df_task_${projectId}`;
        const worktreePath = join(this.worktreeBaseDir, worktreeName);
        const branchName = `ns/task/${projectId}`;

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

            // Install nightshift hooks for nag enforcement
            if (installHooks) {
                await this.hooksManager.installHooks(worktreePath);
            }

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
        const branchName = `ns/task/${projectId}`;

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
     * Commit all changes in a worktree with enhanced metadata
     *
     * Stages and commits all changes (tracked and untracked files) with
     * structured metadata that enables replay and context reconstruction.
     *
     * @param worktreePath - Absolute path to the worktree
     * @param title - Short commit title
     * @param metadata - Enhanced commit metadata
     * @throws Error if commit fails (except for "nothing to commit")
     */
    /**
     * Commit changes with highly specific Diff-Reconstruction metadata.
     * This aims to store the MINIMAL intent required to yield the current DIFF.
     */
    async commitDiffBrain(
        worktreePath: string,
        title: string,
        metadata: CommitMetadata
    ): Promise<void> {
        // Calculate the actual diff to help "verify" if the metadata is sufficient
        const actualDiff = execSync(`git -C "${worktreePath}" diff HEAD`).toString();

        // In a real implementation, we might run a "compression agent" here
        // to turn the actualDiff + chat history into the minimal metadata.prompt

        const enhancedMessage: EnhancedCommitMessage = {
            title,
            metadata: {
                ...metadata,
                // We could even store a hash of the diff to verify replay fidelity
            },
        };

        const messageJson = JSON.stringify(enhancedMessage, null, 2);
        const fullMessage = `${title}\n\n<!-- DIFF_BRAIN_METADATA\n${messageJson}\n-->\n\nEXPECTED_DIFF_SIZE: ${actualDiff.length} bytes`;

        try {
            execSync(`git -C "${worktreePath}" add .`);
            execSync(`git -C "${worktreePath}" commit -m "${fullMessage}" --no-verify`);
        } catch (error) {
            if (!(error as any).stdout?.toString().includes("nothing to commit")) {
                throw new Error(`Failed to commit Diff-Brain changes: ${error}`);
            }
        }
    }

    /**
     * Legacy commit method for backward compatibility
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
     * Extract enhanced commit metadata from a commit message
     *
     * @param worktreePath - Absolute path to the worktree
     * @param commitHash - Git commit hash (default: HEAD)
     * @returns Enhanced commit message or null if no metadata found
     */
    extractCommitMetadata(
        worktreePath: string,
        commitHash: string = "HEAD"
    ): EnhancedCommitMessage | null {
        try {
            const commitMessage = execSync(
                `git -C "${worktreePath}" log --format=%B -n 1 ${commitHash}`
            )
                .toString()
                .trim();

            // Look for Nightshift metadata section
            const metadataStart = commitMessage.indexOf("<!-- NIGHTSHIFT_METADATA");
            const metadataEnd = commitMessage.indexOf("-->", metadataStart);

            if (metadataStart === -1 || metadataEnd === -1) {
                return null;
            }

            const metadataJson = commitMessage
                .substring(metadataStart + "<!-- NIGHTSHIFT_METADATA\n".length, metadataEnd)
                .trim();

            const metadata = JSON.parse(metadataJson);
            const title = commitMessage.split("\n")[0] ?? "";

            return { title, metadata };
        } catch (error) {
            console.error(`Failed to extract commit metadata: ${error}`);
            return null;
        }
    }

    /**
     * Attempt to replay a commit's prompt to verify reproducibility
     *
     * @param worktreePath - Absolute path to the worktree
     * @param commitHash - Hash to replay
     * @param modelCallback - Function that simulates the LLM call
     * @returns Comparison result between original diff and replayed diff
     */
    async replayCommit(
        worktreePath: string,
        commitHash: string,
        modelCallback: (prompt: string) => Promise<string>
    ): Promise<{
        match: boolean;
        originalDiff: string;
        replayedDiff: string;
        similarity: number;
    }> {
        const enhanced = this.extractCommitMetadata(worktreePath, commitHash);
        if (!enhanced) {
            throw new Error(`No metadata found for commit ${commitHash}`);
        }

        const originalDiff = execSync(`git -C "${worktreePath}" show ${commitHash}`).toString();

        // 1. Get the state before this commit
        execSync(`git -C "${worktreePath}" checkout ${commitHash}^`);

        // 2. Run the prompt through the model
        const replayedCode = await modelCallback(enhanced.metadata.prompt);

        // 3. (Simplified) In a real scenario, the agent would apply changes.
        // For this demo, we assume the agent replaces the files.
        // ... implementation details for applying changes ...

        const replayedDiff = "REPLAY_RESULT_PLACEHOLDER"; // Placeholder

        // 4. Reset worktree back to HEAD
        execSync(`git -C "${worktreePath}" checkout -`);

        return {
            match: false, // Placeholder
            originalDiff,
            replayedDiff,
            similarity: 0.5, // Placeholder
        };
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

    /**
     * Get enhanced commit history with metadata
     *
     * @param worktreePath - Optional worktree path (defaults to base repo)
     * @param limit - Maximum number of commits to return (default: 10)
     * @returns Array of enhanced commit messages with metadata
     */
    getEnhancedCommitHistory(
        worktreePath?: string,
        limit: number = 10
    ): EnhancedCommitMessage[] {
        const path = worktreePath || this.baseRepoPath;
        const commits: EnhancedCommitMessage[] = [];

        try {
            // Get commit hashes
            const hashesOutput = execSync(
                `git -C "${path}" log --format="%H" -n ${limit}`,
                { encoding: "utf-8" }
            ).trim();

            if (!hashesOutput) return [];

            const hashes = hashesOutput.split("\n").filter(Boolean);

            for (const hash of hashes) {
                const enhanced = this.extractCommitMetadata(path, hash);
                if (enhanced) {
                    commits.push(enhanced);
                } else {
                    // Create a basic entry for non-nightshift commits
                    const title = execSync(
                        `git -C "${path}" log --format="%s" -n 1 ${hash}`,
                        { encoding: "utf-8" }
                    ).trim();

                    commits.push({
                        title,
                        metadata: {
                            prompt: "",
                            diffReconstructionHint: "",
                            expectedOutcome: "",
                            filesChanged: [],
                            contextSummary: "",
                        },
                    });
                }
            }
        } catch (error) {
            console.error(`Failed to get commit history: ${error}`);
        }

        return commits;
    }
}
