/**
 * Factory Supervisor
 *
 * "The Factory Never Stops"
 *
 * This background service monitors the state of the factory, active projects,
 * and running tasks. It acts as the heartbeat of the Nightshift.
 */

import { ProjectManager } from "./project";
import { TaskManager } from "./task";
import { FactoryManager } from "./factory";
import { logInfo, logWarning } from "../utils/helpers";
import { writeFileSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import { GitManager } from "./git";
import { CodeIndexManager } from "./code-index";

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

        // 2. Monitor Active Projects
        const projects = this.projectManager.listProjects();
        const activeProjects = projects.filter((p) => p.status === "active");

        // Update external status file with enhanced info
        this.updateStatusFile(factory, activeProjects);

        for (const project of activeProjects) {
            await this.checkProjectHealth(project);
            // Re-index project code periodically
            await this.refreshProjectIndex(project);
        }
    }

    /**
     * Re-index code for an active project
     */
    private async refreshProjectIndex(project: any) {
        try {
            const indexer = new CodeIndexManager(project.worktreePath);
            await indexer.indexProject();
        } catch (error) {
            console.error(`[Supervisor] Failed to re-index project ${project.name}:`, error);
        }
    }

    /**
     * Writes the current factory status to a Markdown file that can be previewed.
     * This acts as a "UI Component" for the user.
     */
    private updateStatusFile(factory: any, activeProjects: any[]) {
        try {
            const status = this.factoryManager.getStatus();
            const storageDir = this.factoryManager.getStorageDir();
            if (!storageDir) return;

            const statusPath = join(storageDir, "FACTORY_STATUS.md");

            const lastUpdated = new Date().toLocaleTimeString();

            // Status Icon
            const statusIcon =
                factory.status === "active" ? "🟢" : factory.status === "paused" ? "⏸️" : "🔴";

            let md = `# ${statusIcon} Nightshift Status\n\n`;
            md += `**Last Updated:** ${lastUpdated}\n\n`;

            md += `## 📊 Overview\n`;
            md += `| Metric | Value |\n`;
            md += `|--------|-------|\n`;
            md += `| **Status** | ${factory.status.toUpperCase()} |\n`;
            md += `| **Budget** | $${status.budget.used.toFixed(2)} / $${status.budget.limit.toFixed(2)} |\n`;
            md += `| **Products** | ${status.products} |\n`;
            md += `| **Tokens** | ${status.tokens.toLocaleString()} |\n\n`;

            md += `## 🏗️ Active Projects\n`;
            if (activeProjects.length > 0) {
                md += `| Project | Status | Branch | Index Stats | Last Brain Activity |\n`;
                md += `|---------|--------|--------|-------------|---------------------|\n`;

                for (const p of activeProjects) {
                    const indexer = new CodeIndexManager(p.worktreePath);
                    const stats = indexer.getIndexStats();

                    const git = new GitManager(factory.mainRepoPath);
                    const history = git.getEnhancedCommitHistory(p.worktreePath, 1);
                    const lastActivity =
                        history.length > 0
                            ? `${history[0].title} (${history[0].metadata.agentId})`
                            : "No activity";

                    md += `| ${p.name} | ${p.status} | \`${p.branchName}\` | ${stats.totalEmbeddings} emb / ${stats.totalKeywords} keys | ${lastActivity} |\n`;
                }
            } else {
                md += `_No active projects._\n`;
            }

            md += `\n---\n*To refresh, this file updates automatically every 60s.*\n`;

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
