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
    private currentFactory: FactoryConfig | null = null;

    constructor() {
        this.globalConfig = new GlobalConfigManager();
    }

    /**
     * Get the currently loaded factory
     */
    getFactory(): FactoryConfig | null {
        return this.currentFactory;
    }

    /**
     * Set the currently loaded factory
     */
    setFactory(factory: FactoryConfig) {
        this.currentFactory = factory;
    }

    /**
     * Get storage directory for current factory metadata
     */
    getStorageDir(): string | null {
        if (!this.currentFactory) return null;
        return join(this.currentFactory.rootPath, ".nightshift");
    }

    /**
     * Get factory status summary
     */
    getStatus() {
        if (!this.currentFactory) {
            return {
                budget: { used: 0, limit: 0 },
                products: 0,
                tokens: 0,
            };
        }

        // In a real implementation, these would be calculated from project metrics
        return {
            budget: {
                used: 0, // Placeholder
                limit: this.currentFactory.budgetLimit,
            },
            products: 0, // Placeholder
            tokens: 0, // Placeholder
        };
    }

    /**
     * Initialize/Create a new Factory (and Git Repo)
     */
    async initialize(name: string, description: string, options: any = {}): Promise<FactoryConfig> {
        const rootPath = options.path || join(process.cwd(), name);
        return this.createFactory(name, rootPath);
    }

    /**
     * Reset the factory state (for dev/emergency use)
     */
    reset() {
        this.currentFactory = null;
    }

    /**
     * Create a new Factory (and Git Repo)
     *
     * Structure:
     * /path/to/root/
     *   .nightshift/
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
        const metadataDir = join(rootPath, ".nightshift");

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
            outputDirectory: rootPath,
            status: "active",
        };

        // 3. Save Local Config
        writeFileSync(join(metadataDir, "factory.yaml"), stringify(config));

        // 4. Register Globally
        this.globalConfig.registerFactory(name, rootPath);

        this.currentFactory = config;
        return config;
    }

    /**
     * Load a Factory from a given root path
     */
    loadFactory(rootPath: string): FactoryConfig | null {
        const configPath = join(rootPath, ".nightshift", "factory.yaml");
        if (!existsSync(configPath)) return null;

        try {
            const content = readFileSync(configPath, "utf-8");
            const config = parse(content) as FactoryConfig;
            this.currentFactory = config;
            return config;
        } catch (e) {
            console.error("Failed to load factory config:", e);
            return null;
        }
    }

    listKnownFactories() {
        return this.globalConfig.listFactories();
    }

    recordUsage(_cost: number, _tokens: number) {
        // Placeholder for future implementation
    }

    recordProductCreated() {
        // Placeholder
    }
}
