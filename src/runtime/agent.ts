/**
 * Agent Runtime
 * 
 * Drives the autonomy loop for a specific task using a persona.
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { getOpenCodeAdapter } from "../adapter/opencode";
import type { Project, Task, PersonaConfig } from "../types";
import chalk from "chalk";

export interface AgentRunResult {
    success: boolean;
    message: string;
    tokensUsed: number;
    cost: number;
}

export class AgentRuntime {
    /**
     * Run the autonomy loop for a single task
     */
    async runTask(project: Project, task: Task, persona: string = "engineer"): Promise<AgentRunResult> {
        const adapter = getOpenCodeAdapter();
        await adapter.initialize();

        console.log(chalk.blue(`[Agent] Starting task: ${chalk.bold(task.title)} as ${chalk.bold(persona)}`));

        // 1. Prepare Persona
        const template = this.loadTemplate(persona);
        const systemPrompt = this.renderTemplate(template, { project, task });

        // 2. Initialize Session
        const sessionId = await adapter.createSession(`Project: ${project.name} | Task: ${task.title}`);

        // 3. Autonomy Loop (Simplified for MVP)
        // In a full implementation, this would be a multi-turn conversation 
        // where the agent uses tools. For now, we'll send the prompt and 
        // expect the agent (via OpenCode's own agentic capability if enabled) 
        // to perform the task.

        try {
            const response = await adapter.sendMessage(systemPrompt, {
                persona,
                model: adapter.getPersonaModel(persona)
            });

            console.log(chalk.green(`[Agent] Task execution completed.`));

            return {
                success: true,
                message: response.content,
                tokensUsed: response.tokensUsed,
                cost: 0 // TBD
            };
        } catch (error) {
            console.error(chalk.red(`[Agent] Task execution failed:`), error);
            return {
                success: false,
                message: String(error),
                tokensUsed: 0,
                cost: 0
            };
        } finally {
            // await adapter.shutdown(); // Keep alive for next task or shutdown later
        }
    }

    /**
     * Load persona template
     */
    private loadTemplate(persona: string): string {
        const path = join(process.cwd(), "templates", `${persona}.md`);
        if (!existsSync(path)) {
            throw new Error(`Template not found for persona: ${persona}`);
        }
        return readFileSync(path, "utf-8");
    }

    /**
     * Basic template engine (variable substitution)
     */
    private renderTemplate(template: string, data: { project: Project, task: Task }): string {
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
