/**
 * Project Manager
 * 
 * Orchestrates project lifecycle, combining storage and git isolation.
 */

import { v4 as uuid } from "uuid";
import { getStorage } from "../storage/yaml";
import { GitManager } from "./git";
import type { Project, ProjectStatus } from "../types";
import { join } from "path";

export class ProjectManager {
    private git: GitManager;

    constructor(baseRepoPath: string) {
        this.git = new GitManager(baseRepoPath);
    }

    /**
     * Initialize a new project/task
     */
    async createProject(name: string, description: string): Promise<Project> {
        const projectId = uuid();
        const storage = getStorage();

        // Create git worktree for isolation
        const worktreePath = await this.git.createWorktree(projectId);

        const project: Project = {
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
            personas: [],
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
     * List all projects
     */
    listProjects(): Project[] {
        return getStorage().projects.listAll();
    }

    /**
     * Get project status
     */
    getProject(projectId: string): Project | undefined {
        return getStorage().projects.get(projectId);
    }

    /**
     * Delete a project and cleanup its resources
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
     */
    updateStatus(projectId: string, status: ProjectStatus): void {
        const storage = getStorage();
        storage.projects.update(projectId, {
            status,
            updatedAt: new Date().toISOString()
        });
    }
}
