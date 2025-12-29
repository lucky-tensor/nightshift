/**
 * Product Manager
 *
 * Manages software products produced by the factory. Each product has:
 * - Its own git repository (local + optional remote)
 * - PRD (Product Requirements Document)
 * - PLAN (Implementation plan with projects)
 * - Knowledge base (docs/)
 */

import { v4 as uuid } from "uuid";
import { execSync } from "child_process";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";
import { getStorage } from "../storage/yaml";
import { FactoryManager } from "./factory";
import type { Product, ProductStatus } from "../types";
import { generatePRD, generatePlan } from "../runtime/planner-agent";
import { gitCommit, logInfo, logSuccess, logWarning, logDim } from "../utils/helpers";

export class ProductManager {
    private factoryManager: FactoryManager;

    constructor() {
        this.factoryManager = new FactoryManager();
    }

    /**
     * Create a new product with git repository
     *
     * This creates:
     * - Product metadata in storage
     * - Local git repository
     * - Initial directory structure (src/, docs/)
     * - README.md
     * - Optional remote repository link
     *
     * @param name - Product name (kebab-case recommended, e.g., "task-manager-app")
     * @param description - High-level product description
     * @param options - Optional configuration
     * @returns The created product
     *
     * @example
     * ```typescript
     * const pm = new ProductManager();
     * const product = await pm.createProduct(
     *   "task-manager-app",
     *   "A simple task management application with user authentication"
     * );
     * ```
     */
    async createProduct(
        name: string,
        description: string,
        options: {
            remoteUrl?: string;
            mainBranch?: string;
        } = {}
    ): Promise<Product> {
        const factory = this.factoryManager.getFactory();
        if (!factory) {
            throw new Error("Factory not initialized. Run 'df factory init' first.");
        }

        if (factory.status !== "active") {
            throw new Error(`Factory is ${factory.status}. Cannot create products.`);
        }

        const storage = getStorage();
        const productId = uuid();

        // Determine product repository path
        const repoPath = join(factory.outputDirectory, name);

        if (existsSync(repoPath)) {
            throw new Error(`Product directory already exists: ${repoPath}`);
        }

        logInfo(`[Product] Creating product "${name}"...`);

        // Create product structure
        await this.initializeRepository(repoPath, name, description, options.remoteUrl);

        const product: Product = {
            id: productId,
            factoryId: factory.id,
            name,
            description,

            // Repository
            repoPath,
            remoteUrl: options.remoteUrl,
            mainBranch: options.mainBranch || "main",

            // Documents
            prdPath: join(repoPath, "PRD.md"),
            planPath: join(repoPath, "PLAN.md"),

            // Status
            status: "planning",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),

            // Metrics
            totalProjects: 0,
            completedProjects: 0,
            totalCost: 0,
            totalTokens: 0,
        };

        // Save product
        storage.products.save(productId, product);

        // Update factory metrics
        this.factoryManager.recordProductCreated();

        logSuccess(`[Product] ✓ Product created at ${repoPath}`);

        return product;
    }

    /**
     * Initialize a git repository for a product
     *
     * Creates:
     * - Git repository (git init)
     * - Directory structure (src/, docs/, tests/)
     * - README.md with product info
     * - .gitignore
     * - Initial commit
     * - Optional remote setup
     *
     * @param repoPath - Absolute path to create repository
     * @param name - Product name
     * @param description - Product description
     * @param remoteUrl - Optional remote git URL
     */
    private async initializeRepository(
        repoPath: string,
        name: string,
        description: string,
        remoteUrl?: string
    ): Promise<void> {
        logDim(`[Product] Initializing git repository...`);

        // Create directory structure
        mkdirSync(repoPath, { recursive: true });
        mkdirSync(join(repoPath, "src"), { recursive: true });
        mkdirSync(join(repoPath, "docs"), { recursive: true });
        mkdirSync(join(repoPath, "docs", "research"), { recursive: true });
        mkdirSync(join(repoPath, "docs", "handbooks"), { recursive: true });
        mkdirSync(join(repoPath, "docs", "decisions"), { recursive: true });
        mkdirSync(join(repoPath, "tests"), { recursive: true });

        // Create README.md
        const readme = this.generateReadme(name, description);
        writeFileSync(join(repoPath, "README.md"), readme, "utf-8");

        // Create .gitignore
        const gitignore = this.generateGitignore();
        writeFileSync(join(repoPath, ".gitignore"), gitignore, "utf-8");

        // Initialize git
        execSync("git init", { cwd: repoPath });
        execSync("git checkout -b main", { cwd: repoPath });

        // Initial commit
        execSync("git add .", { cwd: repoPath });
        execSync('git commit -m "Initial commit: Product structure"', { cwd: repoPath });

        // Setup remote if provided
        if (remoteUrl) {
            try {
                execSync(`git remote add origin ${remoteUrl}`, { cwd: repoPath });
                logDim(`[Product] Remote added: ${remoteUrl}`);
            } catch (error) {
                logWarning(`[Product] Warning: Could not add remote: ${error}`);
            }
        }

        logSuccess(`[Product] ✓ Repository initialized`);
    }

    /**
     * Generate README.md content
     */
    private generateReadme(name: string, description: string): string {
        return `# ${name}

${description}

## Overview

This product is being developed by Dark Factory - an AI-powered software factory.

## Documents

- [PRD.md](./PRD.md) - Product Requirements Document
- [PLAN.md](./PLAN.md) - Implementation Plan
- [docs/](./docs/) - Knowledge base and documentation

## Structure

\`\`\`
${name}/
├── src/              # Source code
├── docs/             # Documentation and knowledge base
│   ├── research/     # Research notes and findings
│   ├── handbooks/    # How-to guides and handbooks
│   └── decisions/    # Architecture and design decisions
├── tests/            # Test suites
├── PRD.md            # Product requirements
└── PLAN.md           # Implementation plan
\`\`\`

## Development

This product is developed using an autonomous AI agent workflow:

1. **Planning** - Planner agent creates projects from PRD
2. **Implementation** - Coder agents execute projects
3. **Documentation** - Curator agents maintain knowledge base
4. **Supervision** - PM, Git, and Finance agents coordinate work

## Status

**Status**: Planning
**Projects**: 0 / 0 completed

---

*Generated by Dark Factory*
`;
    }

    /**
     * Generate .gitignore content
     */
    private generateGitignore(): string {
        return `# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/
*.test.local

# Build outputs
dist/
build/
*.tsbuildinfo

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Temporary
tmp/
temp/
*.tmp
`;
    }

    /**
     * Get a product by ID
     *
     * @param productId - Product UUID or name
     * @returns Product object or undefined
     */
    getProduct(productId: string): Product | undefined {
        const storage = getStorage();

        // Try as ID first
        let product = storage.products.get(productId);

        // Try as name
        if (!product) {
            const products = storage.products.listAll();
            product = products.find((p) => p.name === productId);
        }

        return product;
    }

    /**
     * List all products
     *
     * @param filters - Optional filters
     * @returns Array of products
     */
    listProducts(filters?: { status?: ProductStatus; factoryId?: string }): Product[] {
        const storage = getStorage();
        let products = storage.products.listAll();

        if (filters?.status) {
            products = products.filter((p) => p.status === filters.status);
        }

        if (filters?.factoryId) {
            products = products.filter((p) => p.factoryId === filters.factoryId);
        }

        return products;
    }

    /**
     * Update product status or metadata
     *
     * @param productId - Product UUID
     * @param updates - Partial product object
     * @returns Updated product
     */
    updateProduct(productId: string, updates: Partial<Product>): Product {
        const storage = getStorage();
        const product = storage.products.get(productId);

        if (!product) {
            throw new Error(`Product not found: ${productId}`);
        }

        const updated: Product = {
            ...product,
            ...updates,
            updatedAt: new Date().toISOString(),
        };

        storage.products.save(productId, updated);
        return updated;
    }

    /**
     * Record project completion
     *
     * Updates product metrics when a project completes
     *
     * @param productId - Product UUID
     */
    recordProjectCompleted(productId: string): void {
        const product = this.getProduct(productId);
        if (!product) return;

        this.updateProduct(productId, {
            completedProjects: product.completedProjects + 1,
        });
    }

    /**
     * Record cost and token usage for a product
     *
     * @param productId - Product UUID
     * @param cost - Cost in USD
     * @param tokens - Number of tokens
     */
    recordUsage(productId: string, cost: number, tokens: number): void {
        const product = this.getProduct(productId);
        if (!product) return;

        this.updateProduct(productId, {
            totalCost: product.totalCost + cost,
            totalTokens: product.totalTokens + tokens,
        });

        // Also update factory totals
        this.factoryManager.recordUsage(cost, tokens);
    }

    /**
     * Delete a product and its repository
     *
     * WARNING: This removes the git repository from disk!
     *
     * @param productId - Product UUID
     * @param deleteRepo - If true, deletes the git repository (default: false)
     */
    async deleteProduct(productId: string, deleteRepo: boolean = false): Promise<void> {
        const storage = getStorage();
        const product = storage.products.get(productId);

        if (!product) {
            throw new Error(`Product not found: ${productId}`);
        }

        if (deleteRepo && existsSync(product.repoPath)) {
            logWarning(`[Product] WARNING: Deleting repository at ${product.repoPath}`);
            // Use rm -rf carefully
            execSync(`rm -rf "${product.repoPath}"`);
        }

        // Remove from storage
        storage.products.delete(productId);

        logSuccess(`[Product] ✓ Product deleted: ${product.name}`);
    }

    /**
     * Get product status summary
     *
     * @param productId - Product UUID
     * @returns Human-readable status object
     */
    getStatus(productId: string): {
        name: string;
        status: string;
        repoPath: string;
        projects: { total: number; completed: number };
        cost: number;
        tokens: number;
    } {
        const product = this.getProduct(productId);
        if (!product) {
            throw new Error(`Product not found: ${productId}`);
        }

        return {
            name: product.name,
            status: product.status,
            repoPath: product.repoPath,
            projects: {
                total: product.totalProjects,
                completed: product.completedProjects,
            },
            cost: product.totalCost,
            tokens: product.totalTokens,
        };
    }

    /**
     * Generate PRD for a product using AI
     *
     * Uses the planner agent to create a comprehensive Product Requirements Document
     * from the product description.
     *
     * @param productId - Product UUID
     * @returns Path to generated PRD.md
     *
     * @example
     * ```typescript
     * const pm = new ProductManager();
     * await pm.generateProductPRD(productId);
     * ```
     */
    async generateProductPRD(productId: string): Promise<string> {
        const product = this.getProduct(productId);
        if (!product) {
            throw new Error(`Product not found: ${productId}`);
        }

        logInfo(`[Product] Generating PRD for "${product.name}"...`);

        // Generate PRD using planner agent
        const prdContent = await generatePRD(product.name, product.description);

        // Write to PRD.md
        writeFileSync(product.prdPath, prdContent, "utf-8");

        // Commit to git
        gitCommit(product.repoPath, "PRD.md", "docs: Add Product Requirements Document", {
            ignoreErrors: true,
        });

        logSuccess(`[Product] ✓ PRD generated at ${product.prdPath}`);

        return product.prdPath;
    }

    /**
     * Generate implementation plan for a product using AI
     *
     * Uses the planner agent to analyze the PRD and create a detailed implementation
     * plan with projects, milestones, and dependencies.
     *
     * @param productId - Product UUID
     * @returns The created plan
     *
     * @example
     * ```typescript
     * const pm = new ProductManager();
     * const plan = await pm.generateProductPlan(productId);
     * ```
     */
    async generateProductPlan(productId: string): Promise<void> {
        const product = this.getProduct(productId);
        if (!product) {
            throw new Error(`Product not found: ${productId}`);
        }

        // Ensure PRD exists
        if (!existsSync(product.prdPath)) {
            throw new Error(`PRD not found. Run generateProductPRD() first.`);
        }

        logInfo(`[Product] Generating implementation plan...`);

        // Read PRD
        const prdContent = readFileSync(product.prdPath, "utf-8");

        // Generate plan using planner agent
        const planData = await generatePlan(productId, product.name, prdContent);

        // Create plan using PlanManager
        const { PlanManager } = await import("./plan-manager");
        const planManager = new PlanManager();

        await planManager.createPlan(productId, planData);

        logSuccess(`[Product] ✓ Implementation plan generated`);
    }
}
