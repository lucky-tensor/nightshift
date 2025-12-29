/**
 * Planner Agent Runtime
 *
 * AI-powered PRD and implementation plan generation using the planner agent persona.
 * This module handles:
 * - PRD generation from product description
 * - Implementation plan generation from PRD
 * - Project breakdown with dependencies
 */

import { readFileSync } from "fs";
import { join } from "path";
import { getOpenCodeAdapter } from "../adapter/opencode";
import type { Milestone, PlannedProject } from "../types";
import { logInfo, logSuccess, logError } from "../utils/helpers";

/**
 * Generate a Product Requirements Document (PRD) from product description
 *
 * Uses the planner agent to expand a product description into a comprehensive PRD
 * with goals, features, technical requirements, and success criteria.
 *
 * @param productName - Product name
 * @param productDescription - High-level product description
 * @returns Generated PRD markdown content
 *
 * @example
 * ```typescript
 * const prd = await generatePRD(
 *   "task-manager",
 *   "A simple task management app with user authentication"
 * );
 * ```
 */
export async function generatePRD(
    productName: string,
    productDescription: string
): Promise<string> {
    logInfo(`[Planner] Generating PRD for "${productName}"...`);

    const adapter = getOpenCodeAdapter();
    await adapter.initialize();

    // Load planner persona template
    const personaPath = join(process.cwd(), "templates", "planner.md");
    const personaTemplate = readFileSync(personaPath, "utf-8");

    // Create prompt for PRD generation
    const prompt = `${personaTemplate}

## Your Task: Generate Product Requirements Document

You are creating a PRD for a new product. Here are the details:

**Product Name**: ${productName}
**Product Description**: ${productDescription}

## Instructions

Generate a comprehensive Product Requirements Document (PRD) in markdown format with the following sections:

1. **Overview** - Expand the product description into a clear, detailed overview (2-3 paragraphs)
2. **Goals** - List 3-5 primary goals this product aims to achieve
3. **Features** - Break down into specific features (5-10 features), each with a brief description
4. **Technical Requirements** - List technical considerations (frameworks, APIs, data models, etc.)
5. **Success Criteria** - Define measurable success criteria (user metrics, performance targets)

## Output Format

Provide ONLY the markdown content for the PRD. Do not include any meta-commentary or explanations outside the PRD.

Start with:
\`\`\`markdown
# Product Requirements Document: ${productName}
...
\`\`\`

Generate the PRD now:`;

    try {
        const response = await adapter.sendMessage(prompt, {
            model: "claude-3-5-sonnet", // Use premium model for strategic planning
        });

        logSuccess(`[Planner] ✓ PRD generated (${response.tokensUsed} tokens)`);

        // Extract markdown from response (strip code fences if present)
        let prdContent = response.content.trim();
        if (prdContent.startsWith("```markdown")) {
            prdContent = prdContent.substring("```markdown".length);
        }
        if (prdContent.startsWith("```")) {
            prdContent = prdContent.substring("```".length);
        }
        if (prdContent.endsWith("```")) {
            prdContent = prdContent.substring(0, prdContent.length - 3);
        }

        return prdContent.trim();
    } catch (error) {
        logError(`[Planner] Failed to generate PRD: ${error}`);
        throw error;
    }
}

/**
 * Generate an implementation plan from a PRD
 *
 * Uses the planner agent to analyze a PRD and create a detailed implementation plan
 * with projects, milestones, dependencies, and time estimates.
 *
 * @param productId - Product UUID
 * @param productName - Product name
 * @param prdContent - PRD markdown content
 * @returns Structured plan object
 *
 * @example
 * ```typescript
 * const plan = await generatePlan(productId, "task-manager", prdMarkdown);
 * ```
 */
export async function generatePlan(
    productId: string,
    productName: string,
    prdContent: string
): Promise<{
    overview: string;
    goals: string[];
    milestones: Milestone[];
    projects: Omit<PlannedProject, "id" | "status">[];
}> {
    logInfo(`[Planner] Generating implementation plan for "${productName}"...`);

    const adapter = getOpenCodeAdapter();
    await adapter.initialize();

    // Load planner persona template
    const personaPath = join(process.cwd(), "templates", "planner.md");
    const personaTemplate = readFileSync(personaPath, "utf-8");

    // Create prompt for plan generation
    const prompt = `${personaTemplate}

## Your Task: Generate Implementation Plan

You are creating an implementation plan for a product. Here are the details:

**Product Name**: ${productName}
**Product ID**: ${productId}

**PRD Content**:
\`\`\`markdown
${prdContent}
\`\`\`

## Instructions

Analyze the PRD and create a comprehensive implementation plan. Break the product into 3-8 logical projects that can be implemented sequentially or in parallel.

For each project:
- Assign a clear, descriptive name
- Provide a 2-3 sentence description
- Estimate realistic time (1-10 days typical)
- Set priority (1 = critical path, 2-5 = decreasing priority)
- Identify dependencies (which projects must complete first)
- Specify required agents (planner, coder, curator)

Also create 2-4 major milestones representing significant achievements.

## Output Format

Provide your plan as VALID JSON matching this exact structure:

\`\`\`json
{
  "overview": "Brief 2-3 sentence plan overview",
  "goals": ["Goal 1", "Goal 2", "Goal 3"],
  "milestones": [
    {
      "name": "Milestone Name",
      "description": "What this milestone achieves"
    }
  ],
  "projects": [
    {
      "name": "Project Name",
      "description": "Detailed project description",
      "priority": 1,
      "estimatedDays": 3,
      "dependencies": [],
      "plannerAgent": true,
      "coderAgent": true,
      "curatorAgent": false
    }
  ]
}
\`\`\`

IMPORTANT:
- Output ONLY valid JSON, no markdown code fences
- Ensure dependencies array contains valid project names that appear earlier in the list
- Projects with no dependencies should have priority 1
- Total estimated days should be realistic for the product scope

Generate the plan now:`;

    try {
        const response = await adapter.sendMessage(prompt, {
            model: "claude-3-5-sonnet", // Use premium model for strategic planning
        });

        logSuccess(`[Planner] ✓ Plan generated (${response.tokensUsed} tokens)`);

        // Extract and parse JSON
        let jsonContent = response.content.trim();

        // Strip markdown code fences if present
        if (jsonContent.startsWith("```json")) {
            jsonContent = jsonContent.substring("```json".length);
        }
        if (jsonContent.startsWith("```")) {
            jsonContent = jsonContent.substring("```".length);
        }
        if (jsonContent.endsWith("```")) {
            jsonContent = jsonContent.substring(0, jsonContent.length - 3);
        }

        jsonContent = jsonContent.trim();

        // Parse the JSON
        const planData = JSON.parse(jsonContent);

        // Validate structure
        if (!planData.overview || !planData.goals || !planData.projects) {
            throw new Error("Invalid plan structure: missing required fields");
        }

        // Convert project dependencies from names to IDs (will be done by PlanManager)
        // Just ensure we have the right structure
        const projects: Omit<PlannedProject, "id" | "status">[] = planData.projects.map(
            (p: any) => ({
                name: p.name,
                description: p.description,
                priority: p.priority || 3,
                estimatedDays: p.estimatedDays || 3,
                dependencies: [], // Dependencies will be resolved by name later
                plannerAgent: p.plannerAgent ?? false,
                coderAgent: p.coderAgent ?? true,
                curatorAgent: p.curatorAgent ?? false,
            })
        );

        const milestones: Milestone[] = (planData.milestones || []).map((m: any) => ({
            name: m.name,
            description: m.description,
            targetDate: m.targetDate,
        }));

        return {
            overview: planData.overview,
            goals: planData.goals,
            milestones,
            projects,
        };
    } catch (error) {
        logError(`[Planner] Failed to generate plan: ${error}`);
        throw error;
    }
}

/**
 * Generate both PRD and Plan for a product
 *
 * Convenience function that generates PRD first, then creates plan from it.
 *
 * @param productId - Product UUID
 * @param productName - Product name
 * @param productDescription - Product description
 * @returns Object with PRD content and Plan data
 */
export async function generatePRDAndPlan(
    productId: string,
    productName: string,
    productDescription: string
): Promise<{
    prd: string;
    plan: {
        overview: string;
        goals: string[];
        milestones: Milestone[];
        projects: Omit<PlannedProject, "id" | "status">[];
    };
}> {
    const prd = await generatePRD(productName, productDescription);
    const plan = await generatePlan(productId, productName, prd);

    return { prd, plan };
}
