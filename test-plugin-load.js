#!/usr/bin/env node

/**
 * Test script to verify Dark Factory plugin loads without errors
 *
 * This simulates OpenCode loading the plugin and checks for initialization errors.
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testPluginLoad() {
    console.log("🧪 Testing Dark Factory Plugin Load...\n");

    try {
        // Import the built plugin
        const pluginPath = join(__dirname, 'dist', 'index.js');
        console.log(`📦 Loading plugin from: ${pluginPath}`);

        const { DarkFactory } = await import(pluginPath);
        console.log("✅ Plugin file loaded successfully\n");

        // Create mock OpenCode client
        const mockClient = {
            tui: {
                showToast: async ({ message, variant }) => {
                    console.log(`📬 Toast (${variant}): ${message}`);
                }
            },
            session: {
                create: async () => ({ data: { id: 'test-session' }, error: null }),
                prompt: async () => ({ data: {}, error: null })
            }
        };

        // Test plugin initialization
        console.log("🔧 Initializing plugin...\n");
        const testDir = process.cwd();

        const plugin = await DarkFactory({
            client: mockClient,
            directory: testDir,
            project: { name: 'test-project' }
        });

        console.log("\n✅ Plugin initialized successfully!");
        console.log(`📊 Tools registered: ${Object.keys(plugin.tool || {}).length}`);
        console.log(`🔧 Available tools:`);
        for (const toolName of Object.keys(plugin.tool || {})) {
            console.log(`   - ${toolName}`);
        }

        console.log("\n✨ All tests passed!");
        process.exit(0);

    } catch (error) {
        console.error("\n❌ Plugin load test FAILED:");
        console.error(error);
        if (error.stack) {
            console.error("\nStack trace:");
            console.error(error.stack);
        }
        process.exit(1);
    }
}

testPluginLoad();
