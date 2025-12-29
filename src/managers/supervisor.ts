/**
 * Factory Supervisor
 *
 * "The Factory Never Stops"
 *
 * This background service monitors the state of the factory, active projects,
 * and running tasks. It acts as the heartbeat of the Dark Factory.
 */

import { ProjectManager } from "./project";
import { TaskManager } from "./task";
import { FactoryManager } from "./factory";
import { logInfo, logWarning } from "../utils/helpers";
import { writeFileSync } from "fs";
import { join } from "path";

export class FactorySupervisor {
    private intervalId: Timer | null = null;
    private isPolling = false;

    constructor(
        private client: any,
        private factoryManager: FactoryManager,
        private projectManager: ProjectManager
    ) {}

    /**
     * Start the factory heartbeat
     * @param intervalMs Polling interval in milliseconds (default: 60s)
     */
    start(intervalMs: number = 60000) {
        if (this.intervalId) return;

        logInfo("[Supervisor] Factory Supervisor started. Monitoring operations...");

        // Run immediately on start
        this.poll().catch((err) => console.error("[Supervisor] Initial poll error:", err));

        this.intervalId = setInterval(async () => {
            if (this.isPolling) return;
            this.isPolling = true;
            try {
                await this.poll();
            } catch (error) {
                console.error("[Supervisor] Polling error:", error);
            } finally {
                this.isPolling = false;
            }
        }, intervalMs);
    }

    /**
     * Stop monitoring
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            logInfo("[Supervisor] Factory Supervisor stopped.");
        }
    }

    /**
     * Main polling cycle
     */
    private async poll() {
        // 1. Check Factory Status
        const factory = this.factoryManager.getFactory();
        if (!factory) return;

        // Update external status file for UI/Sidebar visibility
        this.updateStatusFile(factory);

        if (factory.status !== "active") return;

        // 2. Monitor Active Projects
        const projects = this.projectManager.listProjects();
        const activeProjects = projects.filter((p) => p.status === "active");

        for (const project of activeProjects) {
            await this.checkProjectHealth(project);
        }
    }

    /**
     * Writes the current factory status to a Markdown file that can be previewed.
     * This acts as a "UI Component" for the user.
     */
    private updateStatusFile(factory: any) {
        try {
            const status = this.factoryManager.getStatus();
            const statusPath = join(
                this.factoryManager.getStorageDir() || process.cwd(),
                "FACTORY_STATUS.md"
            );

            const projects = this.projectManager.listProjects();
            const activeProjects = projects.filter(
                (p) => p.status !== "completed" && p.status !== "failed"
            );

            const lastUpdated = new Date().toLocaleTimeString();

            // Status Icon
            const statusIcon =
                factory.status === "active" ? "🟢" : factory.status === "paused" ? "⏸️" : "🔴";

            const md = `# ${statusIcon} Dark Factory Status

**Last Updated:** ${lastUpdated}

## 📊 Overview
| Metric | Value |
|--------|-------|
| **Status** | ${factory.status.toUpperCase()} |
| **Budget** | $${status.budget.used.toFixed(2)} / $${status.budget.limit.toFixed(2)} |
| **Products** | ${status.products} |
| **Tokens** | ${status.tokens.toLocaleString()} |

## 🏗️ Active Projects
${
    activeProjects.length > 0
        ? `| Project | Status | Branch | Cost |
|---------|--------|--------|------|
${activeProjects.map((p) => `| ${p.name} | ${p.status} | \`${p.workBranch}\` | $${p.totalCost.toFixed(2)} |`).join("\n")}`
        : "_No active projects._"
}

---
*To refresh, this file updates automatically every 60s.*
`;

            writeFileSync(statusPath, md);
        } catch (error) {
            console.error("[Supervisor] Failed to update status file:", error);
        }
    }

    /**
     * Check individual project health and tasks
     */
    private async checkProjectHealth(project: any) {
        // We instantiate a task manager for this project scope
        // Note: TaskManager internal storage usage needs to be consistent
        const tm = new TaskManager();
        const tasks = tm.listTasks(project.id);
        const inProgress = tasks.filter((t) => t.status === "in_progress");

        const now = Date.now();

        for (const task of inProgress) {
            if (!task.startedAt) continue;

            const runtime = now - new Date(task.startedAt).getTime();
            const ONE_HOUR = 60 * 60 * 1000;

            // Alert on long-running tasks (> 1 hour)
            if (runtime > ONE_HOUR) {
                const message = `Task "${task.title}" in project "${project.name}" has been running for over 1 hour.`;
                logWarning(`[Supervisor] ${message}`);
            }
        }
    }
}
