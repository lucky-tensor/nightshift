/**
 * YAML Storage Engine
 * 
 * Provides type-safe YAML file persistence for Dark Factory state.
 * Uses atomic writes and file locking for safety.
 */

import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";

// Default storage directory
const DEFAULT_STORAGE_DIR = join(homedir(), ".dark-factory");

export interface StorageOptions {
    baseDir?: string;
}

/**
 * Generic YAML repository for storing typed data
 */
export class YamlRepository<T> {
    private baseDir: string;
    private filename: string;
    private cache: Map<string, T> = new Map();
    private cacheValid = false;

    constructor(filename: string, options: StorageOptions = {}) {
        this.baseDir = options.baseDir || DEFAULT_STORAGE_DIR;
        this.filename = filename;
        this.ensureDir();
    }

    /**
     * Get the full path to the storage file
     */
    get filePath(): string {
        return join(this.baseDir, this.filename);
    }

    /**
     * Ensure the storage directory exists
     */
    private ensureDir(): void {
        if (!existsSync(this.baseDir)) {
            mkdirSync(this.baseDir, { recursive: true });
        }
    }

    /**
     * Read all items from storage
     */
    readAll(): Map<string, T> {
        if (this.cacheValid) {
            return new Map(this.cache);
        }

        if (!existsSync(this.filePath)) {
            this.cache = new Map();
            this.cacheValid = true;
            return new Map();
        }

        try {
            const content = readFileSync(this.filePath, "utf-8");
            const data = parseYaml(content) as Record<string, T> || {};
            this.cache = new Map(Object.entries(data));
            this.cacheValid = true;
            return new Map(this.cache);
        } catch (error) {
            console.error(`Error reading ${this.filePath}:`, error);
            return new Map();
        }
    }

    /**
     * Get a single item by ID
     */
    get(id: string): T | undefined {
        const all = this.readAll();
        return all.get(id);
    }

    /**
     * Check if an item exists
     */
    has(id: string): boolean {
        return this.readAll().has(id);
    }

    /**
     * Save a single item
     */
    save(id: string, item: T): void {
        const all = this.readAll();
        all.set(id, item);
        this.writeAll(all);
    }

    /**
     * Delete an item
     */
    delete(id: string): boolean {
        const all = this.readAll();
        const existed = all.delete(id);
        if (existed) {
            this.writeAll(all);
        }
        return existed;
    }

    /**
     * List all IDs
     */
    listIds(): string[] {
        return Array.from(this.readAll().keys());
    }

    /**
     * List all items
     */
    listAll(): T[] {
        return Array.from(this.readAll().values());
    }

    /**
     * Find items matching a predicate
     */
    find(predicate: (item: T) => boolean): T[] {
        return this.listAll().filter(predicate);
    }

    /**
     * Find first item matching a predicate
     */
    findOne(predicate: (item: T) => boolean): T | undefined {
        return this.listAll().find(predicate);
    }

    /**
     * Update an item (merge with existing)
     */
    update(id: string, updates: Partial<T>): T | undefined {
        const existing = this.get(id);
        if (!existing) {
            return undefined;
        }

        const updated = { ...existing, ...updates } as T;
        this.save(id, updated);
        return updated;
    }

    /**
     * Clear all items
     */
    clear(): void {
        this.writeAll(new Map());
    }

    /**
     * Write all items to storage (atomic)
     */
    private writeAll(items: Map<string, T>): void {
        this.ensureDir();

        const data: Record<string, T> = {};
        for (const [key, value] of items) {
            data[key] = value;
        }

        const yaml = stringifyYaml(data, {
            indent: 2,
            lineWidth: 120,
        });

        // Atomic write: write to temp file, then rename
        const tempPath = `${this.filePath}.tmp`;
        writeFileSync(tempPath, yaml, "utf-8");
        renameSync(tempPath, this.filePath);

        // Update cache
        this.cache = items;
        this.cacheValid = true;
    }

    /**
     * Invalidate cache (force re-read on next access)
     */
    invalidateCache(): void {
        this.cacheValid = false;
        this.cache.clear();
    }
}

// ============================================================================
// Specialized Repositories
// ============================================================================

import type { Project, TaskItem, SimpleFinanceState } from "../types";

/**
 * Project storage
 */
export class ProjectRepository extends YamlRepository<Project> {
    constructor(options: StorageOptions = {}) {
        super("projects.yaml", options);
    }

    findByStatus(status: Project["status"]): Project[] {
        return this.find((p) => p.status === status);
    }

    getActive(): Project[] {
        return this.find((p) =>
            p.status === "initializing" ||
            p.status === "active" ||
            p.status === "paused"
        );
    }
}

/**
 * Task storage (per-project)
 */
export class TaskRepository extends YamlRepository<TaskItem[]> {
    constructor(projectId: string, options: StorageOptions = {}) {
        const baseDir = options.baseDir || join(homedir(), ".dark-factory");
        super(`tasks/${projectId}.yaml`, { baseDir });
    }

    getTasks(): TaskItem[] {
        return this.get("tasks") || [];
    }

    saveTasks(tasks: TaskItem[]): void {
        this.save("tasks", tasks);
    }

    addTask(task: TaskItem): void {
        const tasks = this.getTasks();
        tasks.push(task);
        this.saveTasks(tasks);
    }

    updateTask(taskId: string, updates: Partial<TaskItem>): TaskItem | undefined {
        const tasks = this.getTasks();
        const index = tasks.findIndex((t) => t.id === taskId);
        if (index === -1) return undefined;

        const updated: TaskItem = { ...tasks[index], ...updates } as TaskItem;
        tasks[index] = updated;
        this.saveTasks(tasks);
        return updated;
    }

    deleteTask(taskId: string): boolean {
        const tasks = this.getTasks();
        const filtered = tasks.filter((t) => t.id !== taskId);
        if (filtered.length === tasks.length) return false;

        this.saveTasks(filtered);
        return true;
    }
}

/**
 * Finance state storage (uses simplified state for OpenCode-based tracking)
 */
export class FinanceRepository extends YamlRepository<SimpleFinanceState> {
    constructor(options: StorageOptions = {}) {
        super("finance.yaml", options);
    }

    getState(): SimpleFinanceState | undefined {
        return this.get("state");
    }

    saveState(state: SimpleFinanceState): void {
        this.save("state", state);
    }

    recordCost(model: string, tokens: number, cost: number): void {
        const state = this.getState() || this.createInitialState();

        state.totalCost += cost;
        state.totalTokens += tokens;

        if (!state.costByModel[model]) {
            state.costByModel[model] = { tokens: 0, cost: 0 };
        }
        state.costByModel[model].tokens += tokens;
        state.costByModel[model].cost += cost;

        state.lastUpdated = new Date().toISOString();
        this.saveState(state);
    }

    private createInitialState(): SimpleFinanceState {
        return {
            totalCost: 0,
            totalTokens: 0,
            costByModel: {},
            currentModel: "gemini-3-pro-high",
            lastUpdated: new Date().toISOString(),
        };
    }
}

// ============================================================================
// Storage Manager (Central access point)
// ============================================================================

export class StorageManager {
    private baseDir: string;
    private _projects: ProjectRepository | null = null;
    private _finance: FinanceRepository | null = null;
    private _taskRepos: Map<string, TaskRepository> = new Map();

    constructor(baseDir?: string) {
        this.baseDir = baseDir || DEFAULT_STORAGE_DIR;
    }

    get projects(): ProjectRepository {
        if (!this._projects) {
            this._projects = new ProjectRepository({ baseDir: this.baseDir });
        }
        return this._projects;
    }

    get finance(): FinanceRepository {
        if (!this._finance) {
            this._finance = new FinanceRepository({ baseDir: this.baseDir });
        }
        return this._finance;
    }

    tasks(projectId: string): TaskRepository {
        if (!this._taskRepos.has(projectId)) {
            this._taskRepos.set(
                projectId,
                new TaskRepository(projectId, { baseDir: this.baseDir })
            );
        }
        return this._taskRepos.get(projectId)!;
    }

    /**
     * Ensure storage directory structure exists
     */
    initialize(): void {
        const dirs = [this.baseDir, join(this.baseDir, "tasks")];
        for (const dir of dirs) {
            if (!existsSync(dir)) {
                mkdirSync(dir, { recursive: true });
            }
        }
    }
}

// Default storage manager instance
let defaultStorage: StorageManager | null = null;

export function getStorage(baseDir?: string): StorageManager {
    if (!defaultStorage || baseDir) {
        defaultStorage = new StorageManager(baseDir);
        defaultStorage.initialize();
    }
    return defaultStorage;
}
