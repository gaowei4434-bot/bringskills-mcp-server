/**
 * BringSkills API Client
 * Handles all communication with the BringSkills API
 */
export interface Skill {
    id: string;
    slug: string;
    title: string;
    description: string;
    category: string;
    price: number;
    icon_url?: string;
    author: {
        id: string;
        name: string;
    };
    rating: number;
    download_count: number;
    tags: string[];
}
export interface SkillExecuteResult {
    success: boolean;
    output?: string;
    error?: string;
    usage?: {
        tokens_used: number;
        execution_time_ms: number;
    };
}
export interface UserSkill {
    skill_id: string;
    skill: Skill;
    acquired_at: string;
}
export declare class BringSkillsClient {
    private baseUrl;
    private apiKey;
    constructor(apiKey: string, baseUrl?: string);
    private request;
    /**
     * List all available skills in the marketplace
     */
    listSkills(params?: {
        category?: string;
        search?: string;
        limit?: number;
        offset?: number;
    }): Promise<{
        skills: Skill[];
        total: number;
    }>;
    /**
     * Get details of a specific skill
     */
    getSkill(slugOrId: string): Promise<Skill>;
    /**
     * Execute a skill with given input
     */
    executeSkill(slugOrId: string, input: Record<string, unknown>): Promise<SkillExecuteResult>;
    /**
     * Get user's purchased/acquired skills
     */
    getMySkills(): Promise<UserSkill[]>;
    /**
     * Acquire a free skill
     */
    acquireFreeSkill(skillSlug: string): Promise<{
        success: boolean;
        order_id: string;
    }>;
    /**
     * List skill categories
     */
    getCategories(): Promise<{
        categories: {
            slug: string;
            name: string;
            count: number;
        }[];
    }>;
    /**
     * Search skills by query
     */
    searchSkills(query: string, limit?: number): Promise<Skill[]>;
    /**
     * Check if API key is valid
     */
    validateApiKey(): Promise<boolean>;
}
//# sourceMappingURL=client.d.ts.map