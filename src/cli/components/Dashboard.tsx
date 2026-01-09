import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import Gradient from "ink-gradient";
import BigText from "ink-big-text";
import SelectInput from "ink-select-input";
import { FactoryManager } from "../../managers/factory";
import { ProjectManager } from "../../managers/project";
import ProjectCreate from "./ProjectCreate";
import FactoryCreate from "./FactoryCreate";
import Settings from "./Settings";
import SessionView from "./SessionView";
import type { FactoryConfig, Project } from "../../types";

// Use default FactoryManager which handles GlobalConfig
const factoryManager = new FactoryManager();

type ViewState =
    | "loading"
    | "factory-selection"
    | "factory-create"
    | "dashboard"
    | "project-create"
    | "settings"
    | "session-view";

const Dashboard = () => {
    // Global State
    const [knownFactories, setKnownFactories] = useState<any[]>([]);

    // Session State
    const [selectedFactory, setSelectedFactory] = useState<FactoryConfig | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);

    // UI State
    const [view, setView] = useState<ViewState>("loading");
    const [error, setError] = useState<string | null>(null);
    const [loadingMessage, setLoadingMessage] = useState<string>("Initializing...");

    // Initial Load
    useEffect(() => {
        refreshFactoryList();
    }, []);

    const refreshFactoryList = () => {
        try {
            const factories = factoryManager.listKnownFactories();
            setKnownFactories(factories);

            if (factories.length === 0) {
                setView("factory-create");
            } else {
                setView("factory-selection");
            }
        } catch (err) {
            setError(String(err));
        }
    };

    const selectFactory = (rootPath: string) => {
        setLoadingMessage(`Loading factory at ${rootPath}...`);
        setView("loading");

        try {
            const factory = factoryManager.loadFactory(rootPath);
            if (factory) {
                setSelectedFactory(factory);
                refreshProjects(factory);
                setView("dashboard");
            } else {
                setError(`Failed to load factory at ${rootPath}`);
                setView("factory-selection");
            }
        } catch (err) {
            setError(String(err));
            setView("factory-selection");
        }
    };

    const refreshProjects = (factory: FactoryConfig) => {
        try {
            const pm = new ProjectManager(factory);
            const list = pm.listProjects();
            setProjects(list);
        } catch (err) {
            console.error("Failed to list projects:", err);
        }
    };

    // Handlers
    const handleFactoryCreate = (name: string, path: string) => {
        try {
            const factory = factoryManager.createFactory(name, path);
            setKnownFactories(factoryManager.listKnownFactories());
            selectFactory(factory.rootPath);
        } catch (err) {
            setError(String(err));
        }
    };

    const handleProjectCreate = async (name: string, description: string) => {
        if (!selectedFactory) return;
        try {
            const pm = new ProjectManager(selectedFactory);
            await pm.createProject(name, `# Task: ${name}\n\n${description}`);
            refreshProjects(selectedFactory);
            setView("dashboard");
        } catch (err) {
            setError(String(err));
        }
    };

    const handleProjectSelect = (project: Project) => {
        setSelectedProject(project);
        setView("session-view");
    };

    // Global Key Bindings (when not in specific forms)
    useInput((input, key) => {
        if (view === "dashboard") {
            if (input === "n") setView("project-create");
            if (input === "s") setView("settings");
            if (input === "f") setView("factory-selection"); // Switch factory
            if (input === "q") process.exit(0);
        }

        if (view === "factory-selection") {
            if (input === "n") setView("factory-create");
            if (input === "q") process.exit(0);
        }
    });

    // --- RENDERERS ---

    if (error) {
        return (
            <Box flexDirection="column" padding={1} borderColor="red" borderStyle="round">
                <Text color="red" bold>
                    Error:
                </Text>
                <Text>{error}</Text>
                <Text color="gray">Press [Enter] to dismiss</Text>
            </Box>
        );
    }

    if (view === "loading") {
        return (
            <Box padding={1}>
                <Text>{loadingMessage}</Text>
            </Box>
        );
    }

    if (view === "factory-create") {
        return (
            <Box padding={1} justifyContent="center">
                <FactoryCreate
                    onSubmit={handleFactoryCreate}
                    onCancel={() =>
                        knownFactories.length > 0 ? setView("factory-selection") : process.exit(0)
                    }
                />
            </Box>
        );
    }

    if (view === "factory-selection") {
        const items = knownFactories.map((f) => ({
            label: `${f.name} (${f.path})`,
            value: f.path,
        }));

        return (
            <Box flexDirection="column" padding={1} alignItems="center">
                <Gradient name="mind">
                    <BigText text="Nightshift" />
                </Gradient>
                <Box marginBottom={1}>
                    <Text>Select a Factory to manage:</Text>
                </Box>
                <Box borderStyle="round" borderColor="blue" padding={1} minWidth={50}>
                    <SelectInput items={items} onSelect={(item) => selectFactory(item.value)} />
                </Box>
                <Box marginTop={1}>
                    <Text color="gray">[n] Create New Factory | [q] Quit</Text>
                </Box>
            </Box>
        );
    }

    if (view === "project-create") {
        return (
            <Box padding={1} justifyContent="center">
                <ProjectCreate
                    onSubmit={handleProjectCreate}
                    onCancel={() => setView("dashboard")}
                />
            </Box>
        );
    }

    if (view === "settings") {
        return (
            <Box padding={1} justifyContent="center">
                <Settings
                    onBack={() => setView("dashboard")}
                    onResetComplete={() => {
                        setKnownFactories([]);
                        setView("factory-create");
                    }}
                />
            </Box>
        );
    }

    if (view === "session-view" && selectedProject && selectedFactory) {
        return (
            <Box padding={1} justifyContent="center">
                <SessionView
                    factory={selectedFactory}
                    project={selectedProject}
                    onBack={() => {
                        refreshProjects(selectedFactory); // Refresh to catch status updates
                        setView("dashboard");
                    }}
                />
            </Box>
        );
    }

    // DASHBOARD VIEW
    if (!selectedFactory) return null;

    // Prepare items for SelectInput
    const projectItems = projects.map((p) => {
        const statusColor = p.currentSessionId ? "green" : "gray";
        // Hacky column alignment with spaces (Ink doesn't support grid layout in SelectInput)
        // Adjust spacing based on terminal width or fixed widths
        const name = p.name.padEnd(25).slice(0, 25);
        const branch = p.branchName.padEnd(30).slice(0, 30);
        const status = (p.currentSessionId ? "ACTIVE" : "IDLE").padEnd(10);

        return {
            label: `${name} | ${branch} | ${status}`,
            value: p.id,
            project: p, // Store full object for retrieval
        };
    });

    return (
        <Box flexDirection="column" padding={1}>
            <Box flexDirection="column" alignItems="center" marginBottom={1}>
                <Gradient name="mind">
                    <BigText text="Nightshift" font="tiny" />
                </Gradient>
                <Text color="gray">
                    {selectedFactory.name} • {selectedFactory.rootPath}
                </Text>
            </Box>

            {/* Status Bar */}
            <Box borderStyle="round" borderColor="blue" paddingX={1} marginBottom={1}>
                <Box marginRight={4}>
                    <Text bold>Projects: </Text>
                    <Text>{projects.length}</Text>
                </Box>
                <Box marginRight={4}>
                    <Text bold>Budget: </Text>
                    <Text>${selectedFactory.budgetLimit}</Text>
                </Box>
                <Box>
                    <Text bold>Model: </Text>
                    <Text>{selectedFactory.defaultModel}</Text>
                </Box>
            </Box>

            {/* Active Projects List */}
            <Box flexDirection="column" borderStyle="round" borderColor="green" paddingX={1}>
                <Box marginBottom={1}>
                    <Text bold underline>
                        Select a Project to Enter Session:
                    </Text>
                </Box>

                {projects.length === 0 ? (
                    <Text italic color="gray">
                        No projects created yet. Press [n] to create one.
                    </Text>
                ) : (
                    <SelectInput
                        items={projectItems}
                        onSelect={(item) => handleProjectSelect((item as any).project)}
                    />
                )}
            </Box>

            <Box marginTop={1} flexDirection="column">
                <Text>Commands:</Text>
                <Text color="gray">
                    {" "}
                    [n] New Project | [f] Switch Factory | [s] Settings | [q] Quit
                </Text>
            </Box>
        </Box>
    );
};

export default Dashboard;
