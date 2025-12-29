import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { parse, stringify } from "yaml";
import { v4 as uuid } from "uuid";
import type { GlobalConfig, KnownFactory } from "../types";

const GLOBAL_CONFIG_DIR = join(homedir(), ".config", "dark-factory");
const CONFIG_FILE = join(GLOBAL_CONFIG_DIR, "config.yaml");

export class GlobalConfigManager {
    constructor() {
        this.ensureConfig();
    }

    private ensureConfig() {
        if (!existsSync(GLOBAL_CONFIG_DIR)) {
            mkdirSync(GLOBAL_CONFIG_DIR, { recursive: true });
        }
        if (!existsSync(CONFIG_FILE)) {
            const initialConfig: GlobalConfig = {
                factories: [],
            };
            this.saveConfig(initialConfig);
        }
    }

    private readConfig(): GlobalConfig {
        try {
            const file = readFileSync(CONFIG_FILE, "utf-8");
            return parse(file) as GlobalConfig;
        } catch (error) {
            return { factories: [] };
        }
    }

    private saveConfig(config: GlobalConfig) {
        writeFileSync(CONFIG_FILE, stringify(config));
    }

    listFactories(): KnownFactory[] {
        return this.readConfig().factories;
    }

    getFactory(id: string): KnownFactory | undefined {
        return this.readConfig().factories.find((f) => f.id === id);
    }

    registerFactory(name: string, path: string): KnownFactory {
        const config = this.readConfig();

        // Check if exists
        const existing = config.factories.find((f) => f.path === path);
        if (existing) return existing;

        const factory: KnownFactory = {
            id: uuid(),
            name,
            path,
            lastOpenedAt: new Date().toISOString(),
        };

        config.factories.push(factory);
        this.saveConfig(config);
        return factory;
    }

    updateLastOpened(id: string) {
        const config = this.readConfig();
        const factory = config.factories.find((f) => f.id === id);
        if (factory) {
            factory.lastOpenedAt = new Date().toISOString();
            this.saveConfig(config);
        }
    }
}
