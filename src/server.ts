/**
 * BringSkills MCP Server
 * Implements the Model Context Protocol for AI agents
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { BringSkillsClient, Skill, AgentConfirmationInfo } from './client.js';

// 用于跟踪是否已经确认过 Agent
let agentConfirmed = false;

export class BringSkillsMCPServer {
  private server: Server;
  private client: BringSkillsClient;
  private skillsCache: Map<string, Skill> = new Map();
  private pendingConfirmation: AgentConfirmationInfo | null = null;

  constructor(apiKey: string) {
    this.client = new BringSkillsClient(apiKey);
    this.server = new Server(
      {
        name: 'bringskills-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
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
          {
            name: 'bringskills_confirm_agent',
            description: 'Confirm your AI agent type for optimized skill output. Call this when prompted after executing a skill.',
            inputSchema: {
              type: 'object',
              properties: {
                agent_type: {
                  type: 'string',
                  description: 'Your agent type (e.g., claude-code, cursor, codex, openclaw, windsurf, aider, continue, cody, github-copilot, tabnine, amazon-q, jetbrains-ai, replit-ai, generic)',
                },
                confirmed: {
                  type: 'boolean',
                  description: 'Set to true to confirm the detected agent, or false to specify a different one',
                },
              },
              required: ['confirmed'],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'bringskills_search':
            return await this.handleSearch(args as { query: string; category?: string; limit?: number });

          case 'bringskills_get_skill':
            return await this.handleGetSkill(args as { skill_id: string });

          case 'bringskills_execute':
            return await this.handleExecute(args as { skill_id: string; input: Record<string, unknown> });

          case 'bringskills_my_skills':
            return await this.handleMySkills();

          case 'bringskills_acquire_free':
            return await this.handleAcquireFree(args as { skill_slug: string });

          case 'bringskills_categories':
            return await this.handleCategories();

          case 'bringskills_confirm_agent':
            return await this.handleConfirmAgent(args as { agent_type?: string; confirmed: boolean });

          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [{ type: 'text', text: `Error: ${message}` }],
          isError: true,
        };
      }
    });

    // List resources (skills as resources)
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
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
      } catch {
        return { resources: [] };
      }
    });

    // Read resource
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const uri = request.params.uri;
      const match = uri.match(/^bringskills:\/\/skill\/(.+)$/);

      if (!match) {
        throw new McpError(ErrorCode.InvalidRequest, `Invalid resource URI: ${uri}`);
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

  private async handleSearch(args: { query: string; category?: string; limit?: number }) {
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

  private async handleGetSkill(args: { skill_id: string }) {
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

  private async handleExecute(args: { skill_id: string; input: Record<string, unknown> }) {
    const result = await this.client.executeSkill(args.skill_id, args.input);

    if (!result.success) {
      return {
        content: [{ type: 'text', text: `Execution failed: ${result.error}` }],
        isError: true,
      };
    }

    // 检查是否需要确认 Agent 类型
    if (result.agent_confirmation_required && !agentConfirmed) {
      this.pendingConfirmation = result.agent_confirmation_required;
      
      const detected = result.agent_confirmation_required.detected;
      const options = result.agent_confirmation_required.options;
      
      let confirmMessage: string;
      if (detected) {
        confirmMessage = `🔔 **Agent 确认**\n\n${result.agent_confirmation_required.message}\n\n` +
          `请使用 bringskills_confirm_agent 工具确认：\n` +
          `- 如果是 ${detected}，调用: bringskills_confirm_agent(confirmed=true)\n` +
          `- 如果不是，调用: bringskills_confirm_agent(confirmed=false, agent_type="你的agent类型")\n\n` +
          `支持的 Agent 类型：\n${options.map(o => `  • ${o.value} - ${o.label}`).join('\n')}`;
      } else {
        confirmMessage = `🔔 **Agent 确认**\n\n${result.agent_confirmation_required.message}\n\n` +
          `请使用 bringskills_confirm_agent 工具选择你的 Agent 类型：\n` +
          `bringskills_confirm_agent(confirmed=false, agent_type="你的agent类型")\n\n` +
          `支持的 Agent 类型：\n${options.map(o => `  • ${o.value} - ${o.label}`).join('\n')}`;
      }

      // 返回执行结果 + 确认提示
      return {
        content: [
          {
            type: 'text',
            text: `${result.output || 'Skill executed successfully'}\n\n---\n\n${confirmMessage}`,
          },
        ],
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

  private async handleMySkills() {
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

  private async handleAcquireFree(args: { skill_slug: string }) {
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

  private async handleCategories() {
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

  private async handleConfirmAgent(args: { agent_type?: string; confirmed: boolean }) {
    let agentTypeToConfirm: string;

    if (args.confirmed) {
      // 用户确认检测到的 Agent
      if (!this.pendingConfirmation?.detected) {
        return {
          content: [
            {
              type: 'text',
              text: 'No agent was detected. Please specify your agent type using: bringskills_confirm_agent(confirmed=false, agent_type="your-agent-type")',
            },
          ],
          isError: true,
        };
      }
      agentTypeToConfirm = this.pendingConfirmation.detected;
    } else {
      // 用户指定不同的 Agent
      if (!args.agent_type) {
        // 列出可选项
        const agents = this.pendingConfirmation?.options || [];
        return {
          content: [
            {
              type: 'text',
              text: `Please specify your agent type. Available options:\n\n${agents.map(a => `• ${a.value} - ${a.label}`).join('\n')}\n\nUsage: bringskills_confirm_agent(confirmed=false, agent_type="your-agent-type")`,
            },
          ],
          isError: true,
        };
      }
      agentTypeToConfirm = args.agent_type;
    }

    try {
      const result = await this.client.confirmAgentType(agentTypeToConfirm);
      
      if (result.success) {
        agentConfirmed = true;
        this.pendingConfirmation = null;
        
        return {
          content: [
            {
              type: 'text',
              text: `✅ ${result.message}\n\n你的 API Key 已绑定到 ${agentTypeToConfirm}，以后所有技能输出都会针对此 Agent 优化。`,
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to confirm agent: ${result.message}`,
            },
          ],
          isError: true,
        };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [
          {
            type: 'text',
            text: `Error confirming agent: ${message}`,
          },
        ],
        isError: true,
      };
    }
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('BringSkills MCP Server running on stdio');
  }
}
