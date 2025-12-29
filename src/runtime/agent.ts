/**
 * Agent Runtime
 *
 * Drives the autonomy loop for a specific task using a subagent.
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { getOpenCodeAdapter } from "../adapter/opencode";
import { FinanceManager } from "../managers/finance";
import type { ProjectSession, TaskPrompt } from "../types";
import { logInfo, logSuccess, logError } from "../utils/helpers";

export interface AgentRunResult {
    success: boolean;
    message: string;
    tokensUsed: number;
    cost: number;
}

export class AgentRuntime {
    /**
     * Execute a task using an AI agent with a specific subagent
     *
     * This is the core execution engine for Dark Factory. It:
     * 1. Loads the subagent template
     * 2. Creates an isolated session
     * 3. Sends the task to the LLM
     * 4. Records costs and token usage
     * 5. Returns execution results
     *
     * In the current MVP implementation, this is a single-turn conversation.
     * Future versions will implement multi-turn agentic loops with tool usage.
     *
     * @param project - The project context
     * @param task - The task to execute
     * @param subagent - Subagent template to use (default: "engineer")
     * @returns Execution result with success status, message, tokens, and cost
     *
     * @example
     * ```typescript
     * const runtime = new AgentRuntime();
     * const result = await runtime.runTask(project, task, "engineer");
     * if (result.success) {
     *   console.log(`Task completed! Cost: $${result.cost}`);
     * }
     * ```
     */
    async runTask(
        project: ProjectSession,
        task: TaskPrompt,
        subagent: string = "engineer"
    ): Promise<AgentRunResult> {
        const adapter = getOpenCodeAdapter();
        await adapter.initialize();

        logInfo(`[Agent] Starting task: ${task.title} as ${subagent}`);

        // 1. Prepare Subagent
        const template = this.loadTemplate(subagent);
        const systemPrompt = this.renderTemplate(template, { project, task });

        // 2. Initialize Session
        await adapter.createSession(`Project: ${project.name} | Task: ${task.title}`);

        // 3. Autonomy Loop (Simplified for MVP)
        // In a full implementation, this would be a multi-turn conversation
        // where the agent uses tools. For now, we'll send the prompt and
        // expect the agent (via OpenCode's own agentic capability if enabled)
        // to perform the task.

        try {
            const finance = new FinanceManager();
            const category = finance.getCategoryForPersona(subagent);
            const model = finance.getOptimalModel(category);

            const response = await adapter.sendMessage(systemPrompt, {
                persona: subagent,
                model: model,
                tools: {
                    // Enable standard tools if available in the environment
                    bash: true,
                    read: true,
                    write: true,
                    edit: true,
                    glob: true,
                    grep: true,
                },
            });

            const cost = finance.recordOperation(model, response.tokensUsed);
            logSuccess(`[Agent] Task execution completed. Cost: $${cost.toFixed(4)}`);

            return {
                success: true,
                message: response.content,
                tokensUsed: response.tokensUsed,
                cost: cost,
            };
        } catch (error) {
            logError(`[Agent] Task execution failed: ${error}`);
            return {
                success: false,
                message: String(error),
                tokensUsed: 0,
                cost: 0,
            };
        } finally {
            // await adapter.shutdown(); // Keep alive for next task or shutdown later
        }
    }

    /**
     * Load subagent template from disk
     *
     * Subagent templates are markdown files that define the agent's behavior,
     * skills, and objectives. They support variable substitution for dynamic content.
     *
     * @param subagent - Subagent name (e.g., "engineer", "tester", "reviewer")
     * @returns Template content as string
     * @throws Error if template file not found
     */
    private loadTemplate(subagent: string): string {
        const path = join(process.cwd(), "templates", `${subagent}.md`);
        if (!existsSync(path)) {
            throw new Error(`Template not found for subagent: ${subagent}`);
        }
        return readFileSync(path, "utf-8");
    }

    /**
     * Render a template with variable substitution
     *
     * Replaces template variables with actual values from project and task data.
     * Supports the following variables:
     * - {{project.name}} - Project name
     * - {{project.description}} - Project description
     * - {{task.title}} - Task title
     * - {{task.description}} - Task description
     *
     * @param template - Template string with {{variables}}
     * @param data - Data object containing project and task
     * @returns Rendered template string
     */
    private renderTemplate(
        template: string,
        data: { project: ProjectSession; task: TaskPrompt }
    ): string {
        let rendered = template;

        // Replace {{project.*}}
        rendered = rendered.replace(/\{\{project\.name\}\}/g, data.project.name);
        rendered = rendered.replace(/\{\{project\.description\}\}/g, data.project.description);

        // Replace {{task.*}}
        rendered = rendered.replace(/\{\{task\.title\}\}/g, data.task.title);
        rendered = rendered.replace(/\{\{task\.description\}\}/g, data.task.description);

        return rendered;
    }
}
