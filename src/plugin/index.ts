import type { Plugin } from "@opencode-ai/plugin";
import { join } from "path";
import { getStorage } from "../storage/yaml";
import { ProjectManager } from "../managers/project";
import { FactoryManager } from "../managers/factory";
import { FactorySupervisor } from "../managers/supervisor";
import { createTools } from "./tools";

const DarkFactory: Plugin = async ({ client, directory, project }) => {
    try {
        console.log("[Dark Factory] Plugin initializing...");
        console.log("[Dark Factory] Directory:", directory);

        // 1. Initialize Storage in project-local .opencode directory
        const storageDir = join(directory, ".opencode", "dark-factory");
        console.log("[Dark Factory] Storage directory:", storageDir);
        getStorage(storageDir);

        // 2. Initialize Managers
        console.log("[Dark Factory] Initializing managers...");
        const factoryManager = new FactoryManager(storageDir);
        const projectManager = new ProjectManager(factoryManager, storageDir);

        // 3. Initialize Supervisor (Background Worker)
        console.log("[Dark Factory] Initializing supervisor...");
        const supervisor = new FactorySupervisor(client, factoryManager, projectManager);

        // Start polling loop (every 60 seconds)
        // Note: This runs in the plugin process and persists as long as OpenCode is open
        supervisor.start();

        // 4. Create and return tools
        console.log("[Dark Factory] Creating tools...");
        const tools = createTools(client, directory, projectManager, factoryManager);

        console.log("[Dark Factory] Plugin initialized successfully");

        // Removed Toast notification in favor of status file updates via Supervisor

        return {
            tool: tools,
        };
    } catch (error) {
        console.error("[Dark Factory] Plugin initialization failed:", error);
        console.error("[Dark Factory] Stack trace:", error instanceof Error ? error.stack : "N/A");

        // Return empty tools to prevent total failure
        return {
            tool: {},
        };
    }
};

export default DarkFactory;
