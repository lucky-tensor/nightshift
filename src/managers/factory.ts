import { v4 as uuid } from "uuid";
import { join } from "path";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { execSync } from "child_process";
import { GlobalConfigManager } from "./global-config";
import type { FactoryConfig } from "../types";
import { parse, stringify } from "yaml";
import { readFileSync } from "fs";

export class FactoryManager {
    private globalConfig: GlobalConfigManager;

    constructor() {
        this.globalConfig = new GlobalConfigManager();
    }

    /**
     * Create a new Factory (and Git Repo)
     *
     * Structure:
     * /path/to/root/
     *   .dark-factory/
     *     factory.yaml
     *   {factory-name}-main/  (Main Git Repo)
     *     .git/
     *     ...
     */
    createFactory(name: string, rootPath: string): FactoryConfig {
        if (!existsSync(rootPath)) {
            mkdirSync(rootPath, { recursive: true });
        }

        const mainRepoName = `${name}-main`;
        const mainRepoPath = join(rootPath, mainRepoName);
        const metadataDir = join(rootPath, ".dark-factory");

        // 1. Create Directory Structure
        if (!existsSync(mainRepoPath)) {
            mkdirSync(mainRepoPath);
            // Initialize Git
            execSync("git init", { cwd: mainRepoPath });
            execSync(`echo "# ${name}" > README.md`, { cwd: mainRepoPath });
            execSync("git add .", { cwd: mainRepoPath });
            execSync('git commit -m "Initial commit"', { cwd: mainRepoPath });
            // Enforce 'main' branch
            execSync("git branch -M main", { cwd: mainRepoPath });
        }

        if (!existsSync(metadataDir)) {
            mkdirSync(metadataDir);
        }

        // 2. Create Factory Config
        const config: FactoryConfig = {
            id: uuid(),
            name,
            rootPath,
            mainRepoPath,
            createdAt: new Date().toISOString(),
            budgetLimit: 100, // Default
            defaultModel: "gemini-pro",
        };

        // 3. Save Local Config
        writeFileSync(join(metadataDir, "factory.yaml"), stringify(config));

        // 4. Register Globally
        this.globalConfig.registerFactory(name, rootPath);

        return config;
    }

    /**
     * Load a Factory from a given root path
     */
    loadFactory(rootPath: string): FactoryConfig | null {
        const configPath = join(rootPath, ".dark-factory", "factory.yaml");
        if (!existsSync(configPath)) return null;

        try {
            const content = readFileSync(configPath, "utf-8");
            return parse(content) as FactoryConfig;
        } catch (e) {
            console.error("Failed to load factory config:", e);
            return null;
        }
    }

    listKnownFactories() {
        return this.globalConfig.listFactories();
    }
}
