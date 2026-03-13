"use strict";
/**
 * BringSkills MCP Server
 * Implements the Model Context Protocol for AI agents
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BringSkillsMCPServer = void 0;
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const client_js_1 = require("./client.js");
class BringSkillsMCPServer {
    server;
    client;
    skillsCache = new Map();
    constructor(apiKey) {
        this.client = new client_js_1.BringSkillsClient(apiKey);
        this.server = new index_js_1.Server({
            name: 'bringskills-mcp-server',
            version: '1.0.0',
        }, {
            capabilities: {
                tools: {},
                resources: {},
            },
        });
        this.setupHandlers();
    }
    setupHandlers() {
        // List available tools
        this.server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => {
            return {
                tools: [
                    {
                        name: 'bringskills_search',
                        description: 'Search for AI skills in the BringSkills marketplace',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                query: {
                                    type: 'string',
                                    description: 'Search query for skills',
                                },
                                category: {
                                    type: 'string',
                                    description: 'Filter by category (optional)',
                                },
                                limit: {
                                    type: 'number',
                                    description: 'Maximum number of results (default: 10)',
                                },
                            },
                            required: ['query'],
                        },
                    },
                    {
                        name: 'bringskills_get_skill',
                        description: 'Get detailed information about a specific skill',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                skill_id: {
                                    type: 'string',
                                    description: 'Skill ID or slug',
                                },
                            },
                            required: ['skill_id'],
                        },
                    },
                    {
                        name: 'bringskills_execute',
                        description: 'Execute a skill with given input parameters',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                skill_id: {
                                    type: 'string',
                                    description: 'Skill ID or slug to execute',
                                },
                                input: {
                                    type: 'object',
                                    description: 'Input parameters for the skill',
                                },
                            },
                            required: ['skill_id', 'input'],
                        },
                    },
                    {
                        name: 'bringskills_my_skills',
                        description: 'List all skills you have purchased or acquired',
                        inputSchema: {
                            type: 'object',
                            properties: {},
                        },
                    },
                    {
                        name: 'bringskills_acquire_free',
                        description: 'Acquire a free skill and add it to your library',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                skill_slug: {
                                    type: 'string',
                                    description: 'Slug of the free skill to acquire',
                                },
                            },
                            required: ['skill_slug'],
                        },
                    },
                    {
                        name: 'bringskills_categories',
                        description: 'List all available skill categories',
                        inputSchema: {
                            type: 'object',
                            properties: {},
                        },
                    },
                ],
            };
        });
        // Handle tool calls
        this.server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            try {
                switch (name) {
                    case 'bringskills_search':
                        return await this.handleSearch(args);
                    case 'bringskills_get_skill':
                        return await this.handleGetSkill(args);
                    case 'bringskills_execute':
                        return await this.handleExecute(args);
                    case 'bringskills_my_skills':
                        return await this.handleMySkills();
                    case 'bringskills_acquire_free':
                        return await this.handleAcquireFree(args);
                    case 'bringskills_categories':
                        return await this.handleCategories();
                    default:
                        throw new types_js_1.McpError(types_js_1.ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
                }
            }
            catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                return {
                    content: [{ type: 'text', text: `Error: ${message}` }],
                    isError: true,
                };
            }
        });
        // List resources (skills as resources)
        this.server.setRequestHandler(types_js_1.ListResourcesRequestSchema, async () => {
            try {
                const mySkills = await this.client.getMySkills();
                return {
                    resources: mySkills.map((userSkill) => ({
                        uri: `bringskills://skill/${userSkill.skill.slug}`,
                        name: userSkill.skill.title,
                        description: userSkill.skill.description,
                        mimeType: 'application/json',
                    })),
                };
            }
            catch {
                return { resources: [] };
            }
        });
        // Read resource
        this.server.setRequestHandler(types_js_1.ReadResourceRequestSchema, async (request) => {
            const uri = request.params.uri;
            const match = uri.match(/^bringskills:\/\/skill\/(.+)$/);
            if (!match) {
                throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidRequest, `Invalid resource URI: ${uri}`);
            }
            const skillSlug = match[1];
            const skill = await this.client.getSkill(skillSlug);
            return {
                contents: [
                    {
                        uri,
                        mimeType: 'application/json',
                        text: JSON.stringify(skill, null, 2),
                    },
                ],
            };
        });
    }
    async handleSearch(args) {
        const result = await this.client.listSkills({
            search: args.query,
            category: args.category,
            limit: args.limit || 10,
        });
        const skillsList = result.skills
            .map((s) => `• ${s.title} (${s.slug}) - ${s.price === 0 ? 'Free' : `$${s.price}`}\n  ${s.description}`)
            .join('\n\n');
        return {
            content: [
                {
                    type: 'text',
                    text: `Found ${result.skills.length} skills:\n\n${skillsList}`,
                },
            ],
        };
    }
    async handleGetSkill(args) {
        const skill = await this.client.getSkill(args.skill_id);
        this.skillsCache.set(skill.slug, skill);
        return {
            content: [
                {
                    type: 'text',
                    text: `**${skill.title}**\n\nCategory: ${skill.category}\nPrice: ${skill.price === 0 ? 'Free' : `$${skill.price}`}\nRating: ${skill.rating}/5 (${skill.download_count} downloads)\n\n${skill.description}\n\nTags: ${skill.tags.join(', ')}`,
                },
            ],
        };
    }
    async handleExecute(args) {
        const result = await this.client.executeSkill(args.skill_id, args.input);
        if (!result.success) {
            return {
                content: [{ type: 'text', text: `Execution failed: ${result.error}` }],
                isError: true,
            };
        }
        return {
            content: [
                {
                    type: 'text',
                    text: result.output || 'Skill executed successfully (no output)',
                },
            ],
        };
    }
    async handleMySkills() {
        const skills = await this.client.getMySkills();
        if (skills.length === 0) {
            return {
                content: [
                    {
                        type: 'text',
                        text: 'You have no skills yet. Use bringskills_search to find skills, or bringskills_acquire_free to get free skills.',
                    },
                ],
            };
        }
        const skillsList = skills
            .map((s) => `• ${s.skill.title} (${s.skill.slug}) - Acquired: ${new Date(s.acquired_at).toLocaleDateString()}`)
            .join('\n');
        return {
            content: [
                {
                    type: 'text',
                    text: `Your skills (${skills.length}):\n\n${skillsList}`,
                },
            ],
        };
    }
    async handleAcquireFree(args) {
        const result = await this.client.acquireFreeSkill(args.skill_slug);
        return {
            content: [
                {
                    type: 'text',
                    text: `Successfully acquired skill: ${args.skill_slug}\nOrder ID: ${result.order_id}`,
                },
            ],
        };
    }
    async handleCategories() {
        const result = await this.client.getCategories();
        const categoriesList = result.categories
            .map((c) => `• ${c.name} (${c.slug}) - ${c.count} skills`)
            .join('\n');
        return {
            content: [
                {
                    type: 'text',
                    text: `Available categories:\n\n${categoriesList}`,
                },
            ],
        };
    }
    async run() {
        const transport = new stdio_js_1.StdioServerTransport();
        await this.server.connect(transport);
        console.error('BringSkills MCP Server running on stdio');
    }
}
exports.BringSkillsMCPServer = BringSkillsMCPServer;
//# sourceMappingURL=server.js.map