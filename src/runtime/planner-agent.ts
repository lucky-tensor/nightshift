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
// import { getOpenCodeAdapter } from "../adapter/opencode"; // Deleted module
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
 */
export async function generatePRD(
    productName: string,
    productDescription: string
): Promise<string> {
    logInfo(`[Planner] Generating PRD for "${productName}"...`);
    throw new Error("Not implemented: PlannerAgent requires refactoring to use AgentRuntime");
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
    throw new Error("Not implemented: PlannerAgent requires refactoring to use AgentRuntime");
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
