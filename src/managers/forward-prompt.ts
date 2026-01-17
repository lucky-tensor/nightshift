/**
 * Forward Prompt Manager
 *
 * Manages the forward prompt system for agent continuity.
 * The forward prompt describes what the next agent should do,
 * surviving agent disconnects by being committed to the branch.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { execSync } from "child_process";

// ============================================================================
// TYPES
// ============================================================================

export interface ForwardPrompt {
    /** Session ID that created/updated this prompt */
    sessionId: string;
    /** Agent ID if applicable */
    agentId?: string;
    /** High-level goal being worked toward */
    objective: string;
    /** What has been accomplished so far */
    currentStatus: string;
    /** Prioritized list of next steps (most important first) */
    nextSteps: string[];
    /** Known issues or blockers */
    blockers: string[];
    /** Important context for the next agent */
    contextNotes: string;
    /** ISO timestamp of last update */
    updatedAt: string;
}

// ============================================================================
// FORWARD PROMPT MANAGER
// ============================================================================

export class ForwardPromptManager {
    private readonly FORWARD_PROMPT_FILENAME = "forward-prompt.md";
    private readonly NIGHTSHIFT_DIR = ".nightshift";

    /**
     * Get the path to the forward prompt file in a worktree
     */
    getPromptPath(worktreePath: string): string {
        return join(worktreePath, this.NIGHTSHIFT_DIR, this.FORWARD_PROMPT_FILENAME);
    }

    /**
     * Check if a forward prompt exists
     */
    exists(worktreePath: string): boolean {
        return existsSync(this.getPromptPath(worktreePath));
    }

    /**
     * Read the current forward prompt from a worktree
     *
     * @param worktreePath - Absolute path to the worktree
     * @returns The forward prompt or null if not found
     */
    read(worktreePath: string): ForwardPrompt | null {
        const promptPath = this.getPromptPath(worktreePath);

        if (!existsSync(promptPath)) {
            return null;
        }

        try {
            const content = readFileSync(promptPath, "utf-8");
            return this.fromMarkdown(content);
        } catch (error) {
            console.error(`Failed to read forward prompt: ${error}`);
            return null;
        }
    }

    /**
     * Update the forward prompt (creates if doesn't exist)
     *
     * This should be called frequently during agent work to ensure
     * continuity if the agent is disconnected.
     *
     * @param worktreePath - Absolute path to the worktree
     * @param updates - Partial forward prompt to merge with existing
     */
    update(worktreePath: string, updates: Partial<ForwardPrompt>): void {
        const promptPath = this.getPromptPath(worktreePath);
        const promptDir = dirname(promptPath);

        // Ensure .nightshift directory exists
        if (!existsSync(promptDir)) {
            mkdirSync(promptDir, { recursive: true });
        }

        // Read existing or create new
        const existing = this.read(worktreePath);
        const updated: ForwardPrompt = {
            sessionId: updates.sessionId ?? existing?.sessionId ?? "unknown",
            agentId: updates.agentId ?? existing?.agentId,
            objective: updates.objective ?? existing?.objective ?? "",
            currentStatus: updates.currentStatus ?? existing?.currentStatus ?? "",
            nextSteps: updates.nextSteps ?? existing?.nextSteps ?? [],
            blockers: updates.blockers ?? existing?.blockers ?? [],
            contextNotes: updates.contextNotes ?? existing?.contextNotes ?? "",
            updatedAt: new Date().toISOString(),
        };

        const markdown = this.toMarkdown(updated);
        writeFileSync(promptPath, markdown, "utf-8");
    }

    /**
     * Append a step to the next steps list
     */
    addNextStep(worktreePath: string, step: string): void {
        const existing = this.read(worktreePath);
        if (existing) {
            this.update(worktreePath, {
                nextSteps: [...existing.nextSteps, step],
            });
        }
    }

    /**
     * Remove the first next step (mark as done)
     */
    completeNextStep(worktreePath: string): string | null {
        const existing = this.read(worktreePath);
        if (existing && existing.nextSteps.length > 0) {
            const completed = existing.nextSteps[0];
            const remaining = existing.nextSteps.slice(1);
            this.update(worktreePath, {
                nextSteps: remaining,
            });
            return completed ?? null;
        }
        return null;
    }

    /**
     * Add a blocker
     */
    addBlocker(worktreePath: string, blocker: string): void {
        const existing = this.read(worktreePath);
        if (existing) {
            this.update(worktreePath, {
                blockers: [...existing.blockers, blocker],
            });
        }
    }

    /**
     * Remove a blocker
     */
    removeBlocker(worktreePath: string, blocker: string): void {
        const existing = this.read(worktreePath);
        if (existing) {
            this.update(worktreePath, {
                blockers: existing.blockers.filter((b) => b !== blocker),
            });
        }
    }

    /**
     * Commit the forward prompt to git
     *
     * @param worktreePath - Absolute path to the worktree
     * @param message - Optional commit message (defaults to "chore: update forward prompt")
     */
    commit(worktreePath: string, message: string = "chore: update forward prompt"): void {
        const promptPath = this.getPromptPath(worktreePath);
        const relativePath = join(this.NIGHTSHIFT_DIR, this.FORWARD_PROMPT_FILENAME);

        try {
            execSync(`git -C "${worktreePath}" add "${relativePath}"`, { stdio: "pipe" });
            execSync(`git -C "${worktreePath}" commit -m "${message}" -- "${relativePath}"`, {
                stdio: "pipe",
            });
        } catch (error) {
            // Ignore "nothing to commit" errors
            const errorStr =
                (error as any).stderr?.toString() || (error as any).stdout?.toString() || "";
            if (!errorStr.includes("nothing to commit") && !errorStr.includes("no changes added")) {
                throw new Error(`Failed to commit forward prompt: ${error}`);
            }
        }
    }

    /**
     * Convert a ForwardPrompt to markdown format
     */
    toMarkdown(prompt: ForwardPrompt): string {
        const nextStepsList = prompt.nextSteps.map((step, i) => `${i + 1}. ${step}`).join("\n");

        const blockersList = prompt.blockers.map((blocker) => `- ${blocker}`).join("\n");

        return `# Forward Prompt

> This document describes the state of work for the next agent to continue.
> Last updated: ${prompt.updatedAt}

## Objective

${prompt.objective || "_No objective set_"}

## Current Status

${prompt.currentStatus || "_No status set_"}

## Next Steps

${nextStepsList || "_No next steps defined_"}

## Blockers

${blockersList || "_No blockers_"}

## Context Notes

${prompt.contextNotes || "_No context notes_"}

---
<!-- FORWARD_PROMPT_METADATA
${JSON.stringify(
    {
        sessionId: prompt.sessionId,
        agentId: prompt.agentId,
        updatedAt: prompt.updatedAt,
    },
    null,
    2
)}
-->
`;
    }

    /**
     * Parse markdown content back to a ForwardPrompt
     */
    fromMarkdown(content: string): ForwardPrompt {
        // Extract metadata from HTML comment
        const metadataMatch = content.match(/<!-- FORWARD_PROMPT_METADATA\s*([\s\S]*?)\s*-->/);

        let metadata: Partial<ForwardPrompt> = {};
        if (metadataMatch && metadataMatch[1]) {
            try {
                metadata = JSON.parse(metadataMatch[1]);
            } catch {
                // Ignore parse errors
            }
        }

        // Parse sections
        const objectiveMatch = content.match(/## Objective\s*\n\n([\s\S]*?)(?=\n## |$)/);
        const statusMatch = content.match(/## Current Status\s*\n\n([\s\S]*?)(?=\n## |$)/);
        const nextStepsMatch = content.match(/## Next Steps\s*\n\n([\s\S]*?)(?=\n## |$)/);
        const blockersMatch = content.match(/## Blockers\s*\n\n([\s\S]*?)(?=\n## |$)/);
        const contextMatch = content.match(/## Context Notes\s*\n\n([\s\S]*?)(?=\n---|$)/);

        // Parse next steps list
        const nextStepsRaw = nextStepsMatch?.[1]?.trim() || "";
        const nextSteps = nextStepsRaw
            .split("\n")
            .filter((line) => /^\d+\./.test(line))
            .map((line) => line.replace(/^\d+\.\s*/, "").trim());

        // Parse blockers list
        const blockersRaw = blockersMatch?.[1]?.trim() || "";
        const blockers = blockersRaw
            .split("\n")
            .filter((line) => line.startsWith("-"))
            .map((line) => line.replace(/^-\s*/, "").trim());

        // Clean up extracted text
        const cleanText = (text: string | undefined): string => {
            if (!text) return "";
            const cleaned = text.trim();
            return cleaned.startsWith("_") && cleaned.endsWith("_") ? "" : cleaned;
        };

        return {
            sessionId: metadata.sessionId || "unknown",
            agentId: metadata.agentId,
            objective: cleanText(objectiveMatch?.[1]),
            currentStatus: cleanText(statusMatch?.[1]),
            nextSteps,
            blockers,
            contextNotes: cleanText(contextMatch?.[1]),
            updatedAt: metadata.updatedAt || new Date().toISOString(),
        };
    }

    /**
     * Generate a summary of the forward prompt for injection into agent context
     */
    getSummary(worktreePath: string): string | null {
        const prompt = this.read(worktreePath);
        if (!prompt) return null;

        const lines = [
            `**Objective**: ${prompt.objective || "Not set"}`,
            `**Status**: ${prompt.currentStatus || "Unknown"}`,
        ];

        if (prompt.nextSteps.length > 0) {
            lines.push(`**Next Step**: ${prompt.nextSteps[0]}`);
            if (prompt.nextSteps.length > 1) {
                lines.push(`  _(+${prompt.nextSteps.length - 1} more steps)_`);
            }
        }

        if (prompt.blockers.length > 0) {
            lines.push(`**Blockers**: ${prompt.blockers.join(", ")}`);
        }

        return lines.join("\n");
    }
}
