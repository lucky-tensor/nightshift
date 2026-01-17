import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Agent } from "../Agent";
import { createOpencode } from "@opencode-ai/sdk";

const MODEL_ID = "google/gemini-2.0-flash-exp:free";

describe("Agent E2E Feedback Loop", () => {
    let agent: Agent;
    let sessionId: string;

    beforeAll(async () => {
        // Initialize agent (which starts its own server)
        agent = new Agent({ modelId: MODEL_ID, workingDirectory: process.cwd() });
        await agent.initialize();
    });

    it("should start a session and receive real-time answers", async () => {
        sessionId = await agent.createSession();
        expect(sessionId).toBeDefined();

        const contentEvents: string[] = [];
        const thinkingEvents: string[] = [];
        let done = false;

        const stream = agent.run(sessionId, "What is the capital of France? Answer in one word.");

        for await (const event of stream) {
            console.log("Test received event:", event.type);
            if (event.type === "content_delta" && event.content) {
                contentEvents.push(event.content);
            }
            if (event.type === "thinking_delta" && event.content) {
                thinkingEvents.push(event.content);
            }
            if (event.type === "done") {
                done = true;
                break;
            }
            if (event.type === "error") {
                throw new Error(`Agent error: ${JSON.stringify(event.error)}`);
            }
        }

        expect(done).toBe(true);
        expect(contentEvents.length).toBeGreaterThan(0);
        const fullContent = contentEvents.join("");
        expect(fullContent).toContain("Paris");
    }, 30000); // 30s timeout

    it("should steer the agent with new prompts (multi-turn)", async () => {
        expect(sessionId).toBeDefined();

        let fullContent = "";
        // Multi-turn: ask for more details
        const stream = agent.run(
            sessionId,
            "Write a very long poem about the history of computing, at least 50 stanzas."
        );

        // We will cancel this request, so we don't need to wait for full completion
        // But we want to see *some* output starts flowing
        let eventCount = 0;
        for await (const event of stream) {
            if (event.type === "content_delta") {
                fullContent += event.content;
                eventCount++;
            }

            // Cancel after receiving some tokens
            if (eventCount > 5) {
                await agent.cancel(sessionId);
                break;
            }
        }

        expect(fullContent.length).toBeGreaterThan(0);
    }, 30000);

    it("should stop (cancel) the agent session", async () => {
        const stream = agent.run(sessionId, "Are you there?");
        let received = false;
        for await (const event of stream) {
            if (event.type === "content_delta") {
                received = true;
            }
            if (event.type === "done") break;
        }
        expect(received).toBe(true);
    });

    afterAll(async () => {
        await agent.shutdown();
    });
});
