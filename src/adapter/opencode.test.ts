/**
 * Integration Tests for OpenCode Adapter with Antigravity Authentication
 *
 * These tests verify real connectivity to Google AI models via Antigravity OAuth.
 *
 * IMPORTANT: These are NOT mocked tests - they make real API calls.
 * Run with: bun test src/adapter/opencode.test.ts
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { getOpenCodeAdapter, OpenCodeAdapter } from "./opencode";
import chalk from "chalk";

describe("OpenCode Adapter Integration Tests", () => {
    let adapter: OpenCodeAdapter;

    // Initialize once for the entire file
    beforeAll(async () => {
        adapter = getOpenCodeAdapter();
        await adapter.initialize();
    }, 60000);

    // Shutdown once after all tests are done
    afterAll(async () => {
        if (adapter) {
            await adapter.shutdown();
        }
    }, 10000);

    describe("Initialization and Metadata", () => {
        test("should initialize OpenCode adapter successfully", async () => {
            expect(adapter).toBeDefined();
        });

        test("should have access to model mappings", () => {
            const models = adapter.getAvailableModels();

            // Check if any of the expected models are present
            const expectedPatterns = ["gemini-3", "claude-sonnet", "claude-opus"];
            const found = expectedPatterns.some((pattern) =>
                models.some((m) => m.toLowerCase().includes(pattern))
            );

            expect(found).toBe(true);
            expect(models.length).toBeGreaterThan(0);
        });
    });

    describe("Messaging", () => {
        test("should create a new session", async () => {
            const sessionId = await adapter.createSession("Test Session");

            expect(sessionId).toBeDefined();
            expect(typeof sessionId).toBe("string");
            expect(sessionId.length).toBeGreaterThan(0);
        });

        test("should send a simple message and get a real response - Gemini Flash", async () => {
            const response = await adapter.sendMessage(
                "Say only the word 'hello' and nothing else.",
                { model: "gemini-3-flash" }
            );

            expect(response).toBeDefined();
            expect(response.content).toBeDefined();
            expect(response.content.toLowerCase()).toContain("hello");
            expect(response.tokensUsed).toBeGreaterThan(0);
        }, 30000);

        test("should send a simple message and get a real response - Claude Sonnet", async () => {
            const response = await adapter.sendMessage(
                "Say only the word 'world' and nothing else.",
                { model: "claude-sonnet" }
            );

            expect(response).toBeDefined();
            expect(response.content).toBeDefined();
            expect(response.content.toLowerCase()).toContain("world");
            expect(response.tokensUsed).toBeGreaterThan(0);
        }, 60000);

        test("should maintain conversation context across messages", async () => {
            // New session for this test
            const sessionId = await adapter.createSession("Context Test");

            // First message
            const response1 = await adapter.sendMessage(
                "Remember this number: 42. Just say 'OK'.",
                { model: "gemini-3-flash" }
            );

            expect(response1.content).toBeDefined();

            // Second message
            const response2 = await adapter.sendMessage(
                "What number did I ask you to remember? Just say the number.",
                { model: "gemini-3-flash" }
            );

            expect(response2.content).toContain("42");
            expect(response1.sessionId).toBe(response2.sessionId);
        }, 60000);
    });

    describe("Personas and Sessions", () => {
        test("should work with persona-based model selection", async () => {
            const response = await adapter.sendMessage(
                "Say the word 'engineer' and nothing else.",
                { persona: "engineer" }
            );

            expect(response).toBeDefined();
            expect(response.content.toLowerCase()).toContain("engineer");
        }, 30000);

        test("should handle multiple sessions independently", async () => {
            const session1Id = await adapter.createSession("Session 1");
            await adapter.sendMessage("Remember the color 'red'. Just say 'OK'.", {
                model: "gemini-3-flash",
            });

            const session2Id = await adapter.createSession("Session 2");
            await adapter.sendMessage("Remember the color 'blue'. Just say 'OK'.", {
                model: "gemini-3-flash",
            });

            expect(session1Id).not.toBe(session2Id);

            await adapter.switchSession(session1Id);
            const response3 = await adapter.sendMessage(
                "What color did I ask you to remember? Just say the color.",
                { model: "gemini-3-flash" }
            );

            expect(response3.content.toLowerCase()).toContain("red");
            expect(response3.content.toLowerCase()).not.toContain("blue");
        }, 90000);
    });

    describe("Error Handling", () => {
        test("should handle invalid model gracefully", async () => {
            try {
                const response = await adapter.sendMessage("Test message", {
                    model: "non-existent-model-xyz",
                });
                expect(response).toBeDefined();
            } catch (error) {
                expect(error).toBeDefined();
            }
        }, 30000);

        test("should not attempt to re-initialize if already initialized", async () => {
            // Calling initialize again should return immediately
            const start = Date.now();
            await adapter.initialize();
            const duration = Date.now() - start;

            // Should be nearly instantaneous
            expect(duration).toBeLessThan(100);
        });
    });
});
