import { v4 as uuid } from "uuid";
import { join } from "path";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { execSync } from "child_process";
import { parse, stringify } from "yaml";
import type { FactoryConfig, Project } from "../types";
import { GitManager } from "./git";
import { CodeIndexManager } from "./code-index";
import { MultiAgentManager } from "./multi-agent";

export class ProjectManager {
    private factory: FactoryConfig;
    private git: GitManager;

    constructor(factory: FactoryConfig) {
        this.factory = factory;
        this.git = new GitManager(factory.mainRepoPath);
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

        await this.git.commitWithMetadata(worktreePath, "chore: Initialize project context", {
            prompt: `Initialize project ${name} with context`,
            expectedOutcome: "Project context file created and committed",
            contextSummary: "Project initialization",
            agentId: "system",
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
            const fs = require("fs");
            fs.unlinkSync(path);
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
        const fs = require("fs");
        const files = fs.readdirSync(projectsDir).filter((f: string) => f.endsWith(".yaml"));
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
