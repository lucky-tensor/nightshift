/**
 * Task Manager
 *
 * Manages task lists for projects, including dependencies and status tracking.
 */

import { v4 as uuid } from "uuid";
import { getStorage } from "../storage/yaml";
import type { TaskPrompt, TaskStatus } from "../types";

export class TaskManager {
    /**
     * Add a manual task to a project
     *
     * Creates a new task with default settings (medium priority, pending status)
     * and saves it to the project's task list in YAML storage.
     *
     * @param projectId - UUID of the project
     * @param title - Short task title
     * @param description - Detailed task description
     * @returns The created task object
     *
     * @example
     * ```typescript
     * const tm = new TaskManager();
     * const task = await tm.addTask(projectId, "Add login", "Implement user auth");
     * ```
     */
    async addTask(projectId: string, title: string, description: string): Promise<TaskPrompt> {
        const storage = getStorage();
        const taskRepo = storage.tasks(projectId);

        const task: TaskPrompt = {
            id: uuid(),
            title,
            description,
            status: "pending" as TaskStatus,
            priority: 3, // Medium priority
            dependencies: [],
            createdAt: new Date().toISOString(),
            completionConfidence: 0,
            verificationNotes: [],
        };

        taskRepo.addTask(task);
        return task;
    }

    /**
     * List all tasks for a project
     *
     * @param projectId - UUID of the project
     * @returns Array of all tasks for the project
     */
    listTasks(projectId: string): TaskPrompt[] {
        return getStorage().tasks(projectId).getTasks();
    }

    /**
     * Update task status or details
     *
     * Performs a partial update on a task. Only fields provided in `updates`
     * will be modified; other fields remain unchanged.
     *
     * @param projectId - UUID of the project
     * @param taskId - UUID of the task to update
     * @param updates - Partial task object with fields to update
     * @returns Updated task object, or undefined if task not found
     */
    async updateTask(
        projectId: string,
        taskId: string,
        updates: Partial<TaskPrompt>
    ): Promise<TaskPrompt | undefined> {
        return getStorage().tasks(projectId).updateTask(taskId, updates);
    }

    /**
     * Get project tasks ready for execution
     *
     * Returns only tasks that are:
     * - In "pending" status
     * - Have all dependencies completed
     *
     * Tasks are filtered based on the dependency graph to ensure
     * prerequisites are met before execution.
     *
     * @param projectId - UUID of the project
     * @returns Array of executable tasks
     */
    getExecutableTasks(projectId: string): TaskPrompt[] {
        const tasks = this.listTasks(projectId);
        const completedIds = new Set(
            tasks.filter((t) => t.status === "completed").map((t) => t.id)
        );

        return tasks.filter(
            (t) =>
                t.status === "pending" && t.dependencies.every((depId) => completedIds.has(depId))
        );
    }
}
