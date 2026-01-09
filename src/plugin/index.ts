import type { Plugin } from "@opencode-ai/plugin";
import { join } from "path";
import { getStorage } from "../storage/yaml";
import { ProjectManager } from "../managers/project";
import { FactoryManager } from "../managers/factory";
import { FactorySupervisor } from "../managers/supervisor";
import { createTools } from "./tools";

const Nightshift: Plugin = async ({ client, directory, project }) => {
    try {
        console.log("[Nightshift] Plugin initializing...");
        console.log("[Nightshift] Directory:", directory);

        // 1. Initialize Storage in project-local .opencode directory
        const storageDir = join(directory, ".opencode", "nightshift");
        console.log("[Nightshift] Storage directory:", storageDir);
        getStorage(storageDir);

        // 2. Initialize Managers
        console.log("[Nightshift] Initializing managers...");
        const factoryManager = new FactoryManager(storageDir);
        const projectManager = new ProjectManager(factoryManager, storageDir);

        // 3. Initialize Supervisor (Background Worker)
        console.log("[Nightshift] Initializing supervisor...");
        const supervisor = new FactorySupervisor(client, factoryManager, projectManager);

        // Start polling loop (every 60 seconds)
        // Note: This runs in the plugin process and persists as long as OpenCode is open
        supervisor.start();

        // 4. Create and return tools
        console.log("[Nightshift] Creating tools...");
        const tools = createTools(client, directory, projectManager, factoryManager);

        console.log("[Nightshift] Plugin initialized successfully");

        // Removed Toast notification in favor of status file updates via Supervisor

        return {
            tool: tools,
        };
    } catch (error) {
        console.error("[Nightshift] Plugin initialization failed:", error);
        console.error("[Nightshift] Stack trace:", error instanceof Error ? error.stack : "N/A");

        // Return empty tools to prevent total failure
        return {
            tool: {},
        };
    }
};

export default Nightshift;
