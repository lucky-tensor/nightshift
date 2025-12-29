import { v4 as uuid } from "uuid";
import { join } from "path";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { execSync } from "child_process";
import { parse, stringify } from "yaml";
import type { FactoryConfig, Project } from "../types";

export class ProjectManager {
    private factory: FactoryConfig;

    constructor(factory: FactoryConfig) {
        this.factory = factory;
    }

    /**
     * Helper to detect default branch (main or master)
     */
    private getDefaultBranch(): string {
        try {
            // Check if main exists
            execSync("git rev-parse --verify main", {
                cwd: this.factory.mainRepoPath,
                stdio: "ignore",
            });
            return "main";
        } catch {
            try {
                // Check if master exists
                execSync("git rev-parse --verify master", {
                    cwd: this.factory.mainRepoPath,
                    stdio: "ignore",
                });
                return "master";
            } catch {
                // Fallback to HEAD
                return "HEAD";
            }
        }
    }

    /**
     * Create a new Project (Worktree)
     * 1. Create worktree dir
     * 2. git worktree add
     * 3. Create metadata
     */
    createProject(name: string, parentContext?: string): Project {
        const projectId = uuid();
        const branchName = `df/${name}`;
        const baseBranch = this.getDefaultBranch();

        // Worktree is a sibling to the main repo in the Factory Root
        const worktreePath = join(this.factory.rootPath, `worktree-${name}`);

        if (existsSync(worktreePath)) {
            throw new Error(`Worktree path already exists: ${worktreePath}`);
        }

        // Create Branch & Worktree
        // We run git commands from the MAIN REPO
        try {
            // Check if branch exists
            let branchExists = false;
            try {
                execSync(`git rev-parse --verify ${branchName}`, {
                    cwd: this.factory.mainRepoPath,
                    stdio: "ignore",
                });
                branchExists = true;
            } catch {
                branchExists = false;
            }

            // Create branch if it doesn't exist
            if (!branchExists) {
                execSync(`git branch ${branchName} ${baseBranch}`, {
                    cwd: this.factory.mainRepoPath,
                });
            }

            execSync(`git worktree add ${worktreePath} ${branchName}`, {
                cwd: this.factory.mainRepoPath,
            });
        } catch (e) {
            throw new Error(`Failed to create git worktree: ${e}`);
        }

        // Initialize Context
        const contextPath = join(worktreePath, "initial-context.md");
        writeFileSync(contextPath, parentContext || "# Initial Context\n\nNo context provided.");

        // Initial Commit for the Project
        try {
            execSync("git add initial-context.md", { cwd: worktreePath });
            execSync('git commit -m "chore: Initialize project context"', { cwd: worktreePath });
        } catch (e) {
            console.warn("Failed to create initial commit:", e);
        }

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

    private getProjectStoragePath(id: string): string {
        return join(this.factory.rootPath, ".dark-factory", "projects", `${id}.yaml`);
    }

    private saveProject(project: Project) {
        const projectsDir = join(this.factory.rootPath, ".dark-factory", "projects");
        if (!existsSync(projectsDir)) {
            mkdirSync(projectsDir, { recursive: true });
        }
        writeFileSync(this.getProjectStoragePath(project.id), stringify(project));
    }

    listProjects(): Project[] {
        const projectsDir = join(this.factory.rootPath, ".dark-factory", "projects");
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
