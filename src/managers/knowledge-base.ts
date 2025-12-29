/**
 * Knowledge Base Manager
 *
 * Manages documentation and knowledge for products. Handles:
 * - Project-specific documentation in worktree ./docs
 * - Merging docs to product root when branch merges
 * - Organizing research, handbooks, and decisions
 * - Deduplication and knowledge synthesis
 */

import { v4 as uuid } from "uuid";
import { existsSync, writeFileSync, mkdirSync, copyFileSync } from "fs";
import { join, basename } from "path";
import { getStorage } from "../storage/yaml";
import { ProductManager } from "./product-manager";
import type { KnowledgeEntry } from "../types";
import { gitCommit, logInfo, logSuccess, logWarning, logDim } from "../utils/helpers";

export class KnowledgeBaseManager {
    private productManager: ProductManager;

    constructor() {
        this.productManager = new ProductManager();
    }

    /**
     * Add a knowledge entry to a project
     *
     * Creates a new documentation file in the project's ./docs directory
     * and tracks it in the knowledge base.
     *
     * @param productId - Product UUID
     * @param projectId - Project UUID
     * @param entry - Entry details (type, title, content)
     * @returns The created knowledge entry
     *
     * @example
     * ```typescript
     * const kb = new KnowledgeBaseManager();
     * await kb.addEntry(productId, projectId, {
     *   type: "research",
     *   title: "Authentication Research",
     *   content: "# Auth Options\n\n..."
     * });
     * ```
     */
    async addEntry(
        productId: string,
        projectId: string,
        entry: {
            type: "research" | "handbook" | "decision" | "reference";
            title: string;
            content: string;
            worktreePath: string; // Path to project worktree
        }
    ): Promise<KnowledgeEntry> {
        const product = this.productManager.getProduct(productId);
        if (!product) {
            throw new Error(`Product not found: ${productId}`);
        }

        logInfo(`[KB] Adding ${entry.type}: ${entry.title}`);

        // Determine subdirectory based on type
        const typeDir = this.getTypeDirectory(entry.type);
        const docsDir = join(entry.worktreePath, "docs", typeDir);

        // Ensure directory exists
        if (!existsSync(docsDir)) {
            mkdirSync(docsDir, { recursive: true });
        }

        // Generate filename from title
        const filename = this.titleToFilename(entry.title);
        const filePath = join(docsDir, filename);

        // Write content
        writeFileSync(filePath, entry.content, "utf-8");

        // Create knowledge entry
        const knowledgeEntry: KnowledgeEntry = {
            id: uuid(),
            projectId,
            productId,
            type: entry.type,
            title: entry.title,
            filePath: join("docs", typeDir, filename), // Relative to project/product root
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            mergedToMain: false,
        };

        // Track in storage
        const storage = getStorage();
        storage.knowledge(productId).addEntry(knowledgeEntry);

        logSuccess(`[KB] ✓ Entry added: ${filePath}`);

        return knowledgeEntry;
    }

    /**
     * Merge project documentation to product root
     *
     * Called after a project branch is merged to main.
     * Copies all ./docs from the project to the product root,
     * handles deduplication, and marks entries as merged.
     *
     * @param productId - Product UUID
     * @param projectId - Project UUID
     * @param worktreePath - Path to project worktree
     * @returns Number of files merged
     *
     * @example
     * ```typescript
     * const kb = new KnowledgeBaseManager();
     * const merged = await kb.mergeToMain(productId, projectId, worktreePath);
     * console.log(`Merged ${merged} docs`);
     * ```
     */
    async mergeToMain(productId: string, projectId: string, worktreePath: string): Promise<number> {
        const product = this.productManager.getProduct(productId);
        if (!product) {
            throw new Error(`Product not found: ${productId}`);
        }

        logInfo(`[KB] Merging knowledge base to product root...`);

        const storage = getStorage();
        const projectDocs = join(worktreePath, "docs");

        if (!existsSync(projectDocs)) {
            logWarning(`[KB] No docs found in project worktree`);
            return 0;
        }

        let mergedCount = 0;

        // Get unmerged entries for this project
        const entries = storage
            .knowledge(productId)
            .getEntries()
            .filter((e) => e.projectId === projectId && !e.mergedToMain);

        // Copy files
        for (const entry of entries) {
            const sourcePath = join(worktreePath, entry.filePath);
            const destPath = join(product.repoPath, entry.filePath);

            if (!existsSync(sourcePath)) {
                logWarning(`[KB] Source not found: ${sourcePath}`);
                continue;
            }

            // Ensure destination directory exists
            const destDir = join(destPath, "..");
            if (!existsSync(destDir)) {
                mkdirSync(destDir, { recursive: true });
            }

            // Handle deduplication
            if (existsSync(destPath)) {
                // File exists, append project-specific suffix
                const base = basename(destPath, ".md");
                const newPath = join(destDir, `${base}-${projectId.substring(0, 8)}.md`);
                copyFileSync(sourcePath, newPath);
                logDim(`[KB] Merged (renamed): ${newPath}`);
            } else {
                copyFileSync(sourcePath, destPath);
                logDim(`[KB] Merged: ${destPath}`);
            }

            // Mark as merged
            const allEntries = storage.knowledge(productId).getEntries();
            const entryIndex = allEntries.findIndex((e) => e.id === entry.id);
            if (entryIndex !== -1 && allEntries[entryIndex]) {
                allEntries[entryIndex]!.mergedToMain = true;
                allEntries[entryIndex]!.updatedAt = new Date().toISOString();
            }
            storage.knowledge(productId).saveEntries(allEntries);

            mergedCount++;
        }

        // Commit merged docs
        if (mergedCount > 0) {
            gitCommit(
                product.repoPath,
                "docs/",
                `docs: Merge knowledge base from project ${projectId.substring(0, 8)}`,
                { ignoreErrors: false }
            );
            logSuccess(`[KB] ✓ Committed ${mergedCount} merged docs`);
        }

        logSuccess(`[KB] ✓ Merged ${mergedCount} knowledge entries`);

        return mergedCount;
    }

    /**
     * List knowledge entries
     *
     * @param productId - Product UUID
     * @param filters - Optional filters
     * @returns Array of knowledge entries
     */
    listEntries(
        productId: string,
        filters?: {
            projectId?: string;
            type?: KnowledgeEntry["type"];
            mergedToMain?: boolean;
        }
    ): KnowledgeEntry[] {
        const storage = getStorage();
        let entries = storage.knowledge(productId).getEntries();

        if (filters?.projectId) {
            entries = entries.filter((e) => e.projectId === filters.projectId);
        }

        if (filters?.type) {
            entries = entries.filter((e) => e.type === filters.type);
        }

        if (filters?.mergedToMain !== undefined) {
            entries = entries.filter((e) => e.mergedToMain === filters.mergedToMain);
        }

        return entries;
    }

    /**
     * Find entries by type
     *
     * @param productId - Product UUID
     * @param type - Entry type
     * @returns Array of entries
     */
    findByType(productId: string, type: KnowledgeEntry["type"]): KnowledgeEntry[] {
        return this.listEntries(productId, { type });
    }

    /**
     * Get unmerged entries (docs that haven't been merged to main yet)
     *
     * @param productId - Product UUID
     * @returns Array of unmerged entries
     */
    getUnmerged(productId: string): KnowledgeEntry[] {
        const storage = getStorage();
        return storage.knowledge(productId).findUnmerged();
    }

    /**
     * Generate a knowledge base index
     *
     * Creates an INDEX.md in the product docs/ directory
     * listing all documentation organized by type.
     *
     * @param productId - Product UUID
     */
    async generateIndex(productId: string): Promise<void> {
        const product = this.productManager.getProduct(productId);
        if (!product) {
            throw new Error(`Product not found: ${productId}`);
        }

        logInfo(`[KB] Generating knowledge base index...`);

        const entries = this.listEntries(productId, { mergedToMain: true });

        let markdown = `# Knowledge Base Index\n\n`;
        markdown += `**Product**: ${product.name}  \n`;
        markdown += `**Total Entries**: ${entries.length}  \n`;
        markdown += `**Last Updated**: ${new Date().toLocaleDateString()}  \n\n`;

        // Group by type
        const byType: Record<string, KnowledgeEntry[]> = {
            research: [],
            handbook: [],
            decision: [],
            reference: [],
        };

        for (const entry of entries) {
            if (byType[entry.type]) {
                byType[entry.type]!.push(entry);
            }
        }

        // Write each section
        for (const [type, typeEntries] of Object.entries(byType)) {
            if (typeEntries.length === 0) continue;

            markdown += `## ${this.capitalizeFirst(type)}\n\n`;

            for (const entry of typeEntries) {
                markdown += `- [${entry.title}](./${entry.filePath})\n`;
            }

            markdown += `\n`;
        }

        const indexPath = join(product.repoPath, "docs", "INDEX.md");
        writeFileSync(indexPath, markdown, "utf-8");

        logSuccess(`[KB] ✓ Index generated at docs/INDEX.md`);
    }

    /**
     * Get type directory name
     */
    private getTypeDirectory(type: KnowledgeEntry["type"]): string {
        const dirMap = {
            research: "research",
            handbook: "handbooks",
            decision: "decisions",
            reference: "reference",
        };
        return dirMap[type] || "other";
    }

    /**
     * Convert title to filename
     */
    private titleToFilename(title: string): string {
        return (
            title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-+|-+$/g, "") + ".md"
        );
    }

    /**
     * Capitalize first letter
     */
    private capitalizeFirst(str: string): string {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
     * Get knowledge base statistics
     *
     * @param productId - Product UUID
     * @returns Stats object
     */
    getStats(productId: string): {
        total: number;
        merged: number;
        unmerged: number;
        byType: Record<string, number>;
    } {
        const entries = this.listEntries(productId);

        const byType: Record<string, number> = {
            research: 0,
            handbook: 0,
            decision: 0,
            reference: 0,
        };

        for (const entry of entries) {
            const count = byType[entry.type];
            if (count !== undefined) {
                byType[entry.type] = count + 1;
            }
        }

        return {
            total: entries.length,
            merged: entries.filter((e) => e.mergedToMain).length,
            unmerged: entries.filter((e) => !e.mergedToMain).length,
            byType,
        };
    }
}
