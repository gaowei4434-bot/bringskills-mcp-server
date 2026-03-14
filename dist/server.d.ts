/**
 * BringSkills MCP Server
 * Implements the Model Context Protocol for AI agents
 */
export declare class BringSkillsMCPServer {
    private server;
    private client;
    private skillsCache;
    private pendingConfirmation;
    constructor(apiKey: string);
    private setupHandlers;
    private handleSearch;
    private handleGetSkill;
    private handleExecute;
    private handleMySkills;
    private handleAcquireFree;
    private handleCategories;
    private handleConfirmAgent;
    run(): Promise<void>;
}
//# sourceMappingURL=server.d.ts.map