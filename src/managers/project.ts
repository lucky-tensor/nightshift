import { v4 as uuid } from "uuid";
import { join } from "path";
import { existsSync, mkdirSync, writeFileSync, readFileSync, unlinkSync, readdirSync } from "fs";
import { parse, stringify } from "yaml";
import type { FactoryConfig, Project } from "../types";
import { GitManager } from "./git";
import { CodeIndexManager } from "./code-index";

import { FactoryManager } from "./factory";

export class ProjectManager {
    private factoryManager: FactoryManager;

    constructor(factoryManager: FactoryManager) {
        this.factoryManager = factoryManager;
    }

    private get factory(): FactoryConfig {
        const f = this.factoryManager.getFactory();
        if (!f) throw new Error("Factory not initialized");
        return f;
    }

    private get git(): GitManager {
        return new GitManager(this.factory.mainRepoPath);
    }

    /**
     * Create a new Project (Worktree) with Enhanced Workflow
     */
    async createProject(name: string, parentContext?: string): Promise<Project> {
        const projectId = uuid();

        // 1. Create Worktree using GitManager
        const worktreePath = await this.git.createWorktree(projectId);
        const branchName = this.git.getCurrentBranch(worktreePath);

        // 2. Initialize Context with Git-Brain metadata
        const contextPath = join(worktreePath, "initial-context.md");
        const contextContent = parentContext || "# Initial Context\n\nNo context provided.";
        writeFileSync(contextPath, contextContent);

        await this.git.commitDiffBrain(worktreePath, "chore: Initialize project context", {
            prompt: `Initialize project ${name} with context`,
            diffReconstructionHint: "Create initial-context.md file",
            expectedOutcome: "Project context file created and committed",
            contextSummary: "Project initialization",
            agentId: "system",
            filesChanged: ["initial-context.md"],
        });

        // 3. Initialize Code Index
        const indexer = new CodeIndexManager(worktreePath);
        await indexer.indexProject();

        const project: Project = {
            id: projectId,
            name,
            factoryId: this.factory.id,
            branchName,
            worktreePath,
            status: "active",
            childProjectIds: [],
            contextPath,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            totalCost: 0,
            tokensUsed: 0,
        };

        this.saveProject(project);
        return project;
    }

    /**
     * Delete a project and its worktree
     */
    async deleteProject(projectId: string): Promise<void> {
        const project = this.getProject(projectId);
        if (!project) return;

        // 1. Remove Worktree
        await this.git.removeWorktree(projectId);

        // 2. Remove Metadata
        const path = this.getProjectStoragePath(projectId);
        if (existsSync(path)) {
            if (existsSync(path)) {
                unlinkSync(path);
            }
        }
    }

    private getProjectStoragePath(id: string): string {
        return join(this.factory.rootPath, ".nightshift", "projects", `${id}.yaml`);
    }

    private saveProject(project: Project) {
        const projectsDir = join(this.factory.rootPath, ".nightshift", "projects");
        if (!existsSync(projectsDir)) {
            mkdirSync(projectsDir, { recursive: true });
        }
        writeFileSync(this.getProjectStoragePath(project.id), stringify(project));
    }

    listProjects(): Project[] {
        const projectsDir = join(this.factory.rootPath, ".nightshift", "projects");
        if (!existsSync(projectsDir)) return [];

        // In a real app we'd use readdir and loop
        // keeping it simple for now, assuming we might need an index later
        // or just read all files
        const files = readdirSync(projectsDir).filter((f: string) => f.endsWith(".yaml"));
        return files.map((f: string) => {
            const content = readFileSync(join(projectsDir, f), "utf-8");
            return parse(content) as Project;
        });
    }

    getProject(projectId: string): Project | undefined {
        const path = this.getProjectStoragePath(projectId);
        if (!existsSync(path)) return undefined;
        try {
            return parse(readFileSync(path, "utf-8")) as Project;
        } catch {
            return undefined;
        }
    }

    updateProject(projectId: string, updates: Partial<Project>): void {
        const project = this.getProject(projectId);
        if (!project) throw new Error(`Project ${projectId} not found`);

        const updatedProject = { ...project, ...updates, updatedAt: new Date().toISOString() };
        this.saveProject(updatedProject);
    }
}
