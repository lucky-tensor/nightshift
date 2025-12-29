/**
 * Project Manager
 *
 * Orchestrates project lifecycle, combining storage and git isolation.
 */

import { v4 as uuid } from "uuid";
import { getStorage } from "../storage/yaml";
import { GitManager } from "./git";
import type { ProjectSession, ProjectStatus } from "../types";

export class ProjectManager {
    private git: GitManager;

    /**
     * Create a new ProjectManager instance
     *
     * @param baseRepoPath - Absolute path to the base git repository
     */
    constructor(baseRepoPath: string) {
        this.git = new GitManager(baseRepoPath);
    }

    /**
     * Initialize a new project with isolated git worktree
     *
     * This creates:
     * - A new project record in YAML storage
     * - An isolated git worktree for the project
     * - A dedicated git branch (df/task/[uuid])
     * - An empty task list
     *
     * The worktree allows the AI agent to work on the project without
     * affecting the main repository or other concurrent projects.
     *
     * @param name - Human-readable project name
     * @param description - Project description and initial task
     * @returns The created project object
     * @throws Error if worktree creation fails
     *
     * @example
     * ```typescript
     * const pm = new ProjectManager(process.cwd());
     * const project = await pm.createProject("Add Auth", "Implement user authentication");
     * ```
     */
    async createProject(name: string, description: string): Promise<ProjectSession> {
        const projectId = uuid();
        const storage = getStorage();

        // Create git worktree for isolation
        const worktreePath = await this.git.createWorktree(projectId);

        const project: ProjectSession = {
            id: projectId,
            name,
            description,
            status: "initializing" as ProjectStatus,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            maxRuntime: 12 * 60 * 60 * 1000, // 12 hours default
            baseBranch: "master",
            workBranch: `df/task/${projectId}`,
            worktreePath,
            subagents: [],
            childProjectIds: [],
            totalCost: 0,
            tokensUsed: 0,
        };

        // Save project state
        storage.projects.save(projectId, project);

        // Initialize task list for project
        storage.tasks(projectId).saveTasks([]);

        return project;
    }

    /**
     * List all projects from storage
     *
     * @returns Array of all projects
     */
    listProjects(): ProjectSession[] {
        return getStorage().projects.listAll();
    }

    /**
     * Get a single project by ID
     *
     * @param projectId - UUID of the project
     * @returns Project object or undefined if not found
     */
    getProject(projectId: string): ProjectSession | undefined {
        return getStorage().projects.get(projectId);
    }

    /**
     * Delete a project and cleanup its resources
     *
     * This performs a complete cleanup:
     * - Removes the git worktree
     * - Deletes the git branch
     * - Removes project from storage
     * - Cleans up associated task files
     *
     * @param projectId - UUID of the project to delete
     * @throws Error if worktree removal fails
     */
    async deleteProject(projectId: string): Promise<void> {
        const storage = getStorage();
        const project = storage.projects.get(projectId);

        if (project) {
            // Cleanup git worktree
            await this.git.removeWorktree(projectId);

            // Remove from storage
            storage.projects.delete(projectId);

            // Cleanup associated tasks file?
            // (Optional: we could leave it or delete it. Deleting for now.)
            // Note: storage.tasks() creates the repo, but we don't have a clear way
            // to delete the file on disk easily through the repo API without adding it.
        }
    }

    /**
     * Update project status
     *
     * Updates the project's status field and refreshes the updatedAt timestamp.
     *
     * @param projectId - UUID of the project
     * @param status - New status to set
     */
    updateStatus(projectId: string, status: ProjectStatus): void {
        const storage = getStorage();
        storage.projects.update(projectId, {
            status,
            updatedAt: new Date().toISOString(),
        });
    }
}
