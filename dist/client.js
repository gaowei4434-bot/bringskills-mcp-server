"use strict";
/**
 * BringSkills API Client
 * Handles all communication with the BringSkills API
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BringSkillsClient = void 0;
class BringSkillsClient {
    baseUrl;
    apiKey;
    constructor(apiKey, baseUrl = 'https://bringskills-production.up.railway.app') {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
    }
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            ...(options.headers || {}),
        };
        const response = await fetch(url, {
            ...options,
            headers,
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: response.statusText }));
            throw new Error(error.detail || `API Error: ${response.status}`);
        }
        return response.json();
    }
    /**
     * List all available skills in the marketplace
     */
    async listSkills(params) {
        const searchParams = new URLSearchParams();
        if (params?.category)
            searchParams.set('category', params.category);
        if (params?.search)
            searchParams.set('search', params.search);
        if (params?.limit)
            searchParams.set('limit', params.limit.toString());
        if (params?.offset)
            searchParams.set('offset', params.offset.toString());
        const query = searchParams.toString();
        return this.request(`/api/v1/skills${query ? `?${query}` : ''}`);
    }
    /**
     * Get details of a specific skill
     */
    async getSkill(slugOrId) {
        return this.request(`/api/v1/skills/${slugOrId}`);
    }
    /**
     * Execute a skill with given input
     */
    async executeSkill(slugOrId, input) {
        return this.request(`/api/v1/skills/${slugOrId}/execute`, {
            method: 'POST',
            body: JSON.stringify({ input }),
        });
    }
    /**
     * Get user's purchased/acquired skills
     */
    async getMySkills() {
        const response = await this.request('/api/v1/orders');
        return response.orders || [];
    }
    /**
     * Acquire a free skill
     */
    async acquireFreeSkill(skillSlug) {
        return this.request('/api/v1/orders/free', {
            method: 'POST',
            body: JSON.stringify({ skill_slug: skillSlug }),
        });
    }
    /**
     * List skill categories
     */
    async getCategories() {
        return this.request('/api/v1/categories');
    }
    /**
     * Search skills by query
     */
    async searchSkills(query, limit = 10) {
        const result = await this.listSkills({ search: query, limit });
        return result.skills;
    }
    /**
     * Check if API key is valid
     */
    async validateApiKey() {
        try {
            await this.request('/api/v1/users/me');
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Confirm agent type binding
     */
    async confirmAgentType(agentType) {
        return this.request('/api/v1/api-keys/confirm-agent', {
            method: 'POST',
            body: JSON.stringify({ agent_type: agentType }),
        });
    }
    /**
     * Get list of supported agents
     */
    async getSupportedAgents() {
        return this.request('/api/v1/api-keys/supported-agents');
    }
}
exports.BringSkillsClient = BringSkillsClient;
//# sourceMappingURL=client.js.map