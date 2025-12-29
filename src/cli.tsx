#!/usr/bin/env node
import React, { useState, useEffect } from "react";
import { render, Text, Box, useApp } from "ink";
import meow from "meow";
import { join } from "path";
import { getStorage } from "./storage/yaml";
import { FactoryManager } from "./managers/factory";
import { ProjectManager } from "./managers/project";
import { FactorySupervisor } from "./managers/supervisor";
import Dashboard from "./cli/components/Dashboard";

const cli = meow(
    `
	Usage
	  $ dark-factory

	Options
	  --name  Your name

	Examples
	  $ dark-factory --name=Jane
	  Hello, Jane
`,
    {
        importMeta: import.meta,
        flags: {
            name: {
                type: "string",
            },
        },
    }
);

const App = () => {
    const [initialized, setInitialized] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        try {
            // Initialize Storage
            const cwd = process.cwd();
            // Use same path as plugin: .opencode/dark-factory
            const storageDir = join(cwd, ".opencode", "dark-factory");
            getStorage(storageDir);

            // Managers will be instantiated in the Dashboard or passed down
            // For now, we just ensure storage is ready
            setInitialized(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        }
    }, []);

    if (error) {
        return <Text color="red">Error: {error}</Text>;
    }

    if (!initialized) {
        return <Text>Initializing Dark Factory...</Text>;
    }

    return <Dashboard />;
};

render(<App />);
