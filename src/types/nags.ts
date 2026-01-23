export type NagEvaluation = "OK" | "NOK";

export type NagType = "tool" | "agent";

export interface BaseNag {
    id: string;
    name: string;
    description: string;
    stage: "pre-commit" | "pre-push";
    type: NagType;
    enabled: boolean;
    severity: "error" | "warning" | "info";
    blocking: boolean;
}

export interface ToolNag extends BaseNag {
    type: "tool";
    command: string;
    workingDirectory?: string;
    timeout?: number;
    successCriteria?: "exit_code_zero" | "output_contains" | "output_not_contains";
    expectedOutput?: string;
}

export interface AgentNag extends BaseNag {
    type: "agent";
    prompt: string;
    agentId?: string;
    evaluationCriteria?: string;
    maxTokens?: number;
}

export type Nag = ToolNag | AgentNag;

export interface NagResult {
    nagId: string;
    status: "passed" | "failed" | "skipped" | "error";
    evaluation?: NagEvaluation;
    message: string;
    duration: number;
    output?: string;
    timestamp: string;
}

export interface NagReport {
    stage: string;
    results: NagResult[];
    summary: {
        total: number;
        passed: number;
        failed: number;
        skipped: number;
        blocked: boolean;
    };
    duration: number;
}

export interface NagConfig {
    version: string;
    projectType: string;
    nags: Nag[];
    defaults: {
        preCommit: {
            autoFix: boolean;
            blocking: boolean;
        };
        prePush: {
            strict: boolean;
            blocking: boolean;
        };
    };
}

export const DEFAULT_NAG_CONFIG: NagConfig = {
    version: "1.0.0",
    projectType: "auto-detect",
    nags: [],
    defaults: {
        preCommit: {
            autoFix: true,
            blocking: false,
        },
        prePush: {
            strict: true,
            blocking: true,
        },
    },
};
