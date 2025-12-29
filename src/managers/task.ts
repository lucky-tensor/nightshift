/**
 * Task Manager
 * 
 * Manages task lists for projects, including dependencies and status tracking.
 */

import { v4 as uuid } from "uuid";
import { getStorage } from "../storage/yaml";
import type { Task, TaskStatus } from "../types";

export class TaskManager {
    /**
     * Add a manual task to a project
     */
    async addTask(projectId: string, title: string, description: string): Promise<Task> {
        const storage = getStorage();
        const taskRepo = storage.tasks(projectId);

        const task: Task = {
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
     */
    listTasks(projectId: string): Task[] {
        return getStorage().tasks(projectId).getTasks();
    }

    /**
     * Update task status or details
     */
    async updateTask(projectId: string, taskId: string, updates: Partial<Task>): Promise<Task | undefined> {
        return getStorage().tasks(projectId).updateTask(taskId, updates);
    }

    /**
     * Get project tasks sorted by priority and dependencies
     */
    getExecutableTasks(projectId: string): Task[] {
        const tasks = this.listTasks(projectId);
        const completedIds = new Set(
            tasks.filter(t => t.status === "completed").map(t => t.id)
        );

        return tasks.filter(t =>
            t.status === "pending" &&
            t.dependencies.every(depId => completedIds.has(depId))
        );
    }
}
