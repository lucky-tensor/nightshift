/**
 * Factory Manager
 *
 * Manages the top-level Factory singleton that produces software products.
 * A Factory orchestrates multiple products, each with their own git repositories
 * and implementation plans.
 */

import { v4 as uuid } from "uuid";
import { getStorage } from "../storage/yaml";
import type { Factory } from "../types";
import { join } from "path";
import { homedir } from "os";

const DEFAULT_OUTPUT_DIR = join(homedir(), "factory-products");

export class FactoryManager {
    /**
     * Initialize a new factory instance
     *
     * Creates a singleton factory that will produce software products.
     * The factory maintains configuration, tracks metrics, and manages
     * the lifecycle of all products.
     *
     * @param name - Factory name (e.g., "Dark Factory")
     * @param description - Factory description and purpose
     * @param options - Optional configuration
     * @returns The created factory instance
     *
     * @example
     * ```typescript
     * const fm = new FactoryManager();
     * const factory = await fm.initialize("Dark Factory", "AI-powered software factory");
     * ```
     */
    async initialize(
        name: string,
        description: string,
        options: {
            defaultModel?: string;
            budgetLimit?: number;
            outputDirectory?: string;
        } = {}
    ): Promise<Factory> {
        const storage = getStorage();

        // Check if factory already exists
        const existing = storage.factory?.getState();
        if (existing) {
            throw new Error(
                `Factory already initialized: ${existing.name}. Use getFactory() to retrieve it.`
            );
        }

        const factory: Factory = {
            id: uuid(),
            name,
            description,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),

            // Configuration
            defaultModel: options.defaultModel || "gemini-3-flash",
            budgetLimit: options.budgetLimit || 100, // $100 default
            outputDirectory: options.outputDirectory || DEFAULT_OUTPUT_DIR,

            // Metrics
            totalProducts: 0,
            totalCost: 0,
            totalTokens: 0,

            // State
            status: "active",
        };

        storage.factory.saveState(factory);
        return factory;
    }

    /**
     * Get the current factory instance
     *
     * @returns Factory instance or undefined if not initialized
     */
    getFactory(): Factory | undefined {
        const storage = getStorage();
        return storage.factory?.getState();
    }

    /**
     * Update factory configuration
     *
     * @param updates - Partial factory object with fields to update
     * @returns Updated factory instance
     */
    updateFactory(updates: Partial<Factory>): Factory {
        const storage = getStorage();
        const factory = this.getFactory();

        if (!factory) {
            throw new Error("Factory not initialized. Call initialize() first.");
        }

        const updated: Factory = {
            ...factory,
            ...updates,
            updatedAt: new Date().toISOString(),
        };

        storage.factory.saveState(updated);
        return updated;
    }

    /**
     * Record product creation
     *
     * Updates factory metrics when a new product is created
     */
    recordProductCreated(): void {
        const factory = this.getFactory();
        if (!factory) return;

        this.updateFactory({
            totalProducts: factory.totalProducts + 1,
        });
    }

    /**
     * Record cost and token usage
     *
     * @param cost - Cost in USD
     * @param tokens - Number of tokens used
     */
    recordUsage(cost: number, tokens: number): void {
        const factory = this.getFactory();
        if (!factory) return;

        this.updateFactory({
            totalCost: factory.totalCost + cost,
            totalTokens: factory.totalTokens + tokens,
        });
    }

    /**
     * Check if factory is within budget
     *
     * @returns true if within budget, false if limit exceeded
     */
    isWithinBudget(): boolean {
        const factory = this.getFactory();
        if (!factory) return true;

        return factory.totalCost < factory.budgetLimit;
    }

    /**
     * Pause factory operations
     */
    pause(): void {
        this.updateFactory({ status: "paused" });
    }

    /**
     * Resume factory operations
     */
    resume(): void {
        this.updateFactory({ status: "active" });
    }

    /**
     * Shutdown factory (pauses all operations)
     */
    shutdown(): void {
        this.updateFactory({ status: "shutdown" });
    }

    /**
     * Get factory status summary
     *
     * @returns Human-readable status object
     */
    getStatus(): {
        name: string;
        status: string;
        products: number;
        budget: { used: number; limit: number; remaining: number };
        tokens: number;
    } {
        const factory = this.getFactory();
        if (!factory) {
            throw new Error("Factory not initialized");
        }

        return {
            name: factory.name,
            status: factory.status,
            products: factory.totalProducts,
            budget: {
                used: factory.totalCost,
                limit: factory.budgetLimit,
                remaining: factory.budgetLimit - factory.totalCost,
            },
            tokens: factory.totalTokens,
        };
    }
}
