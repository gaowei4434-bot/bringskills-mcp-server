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

export class BringSkillsClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(apiKey: string, baseUrl: string = 'https://bringskills-production.up.railway.app') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      ...((options.headers as Record<string, string>) || {}),
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText })) as { detail?: string };
      throw new Error(error.detail || `API Error: ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * List all available skills in the marketplace
   */
  async listSkills(params?: {
    category?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ skills: Skill[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());

    const query = searchParams.toString();
    return this.request(`/api/v1/skills${query ? `?${query}` : ''}`);
  }

  /**
   * Get details of a specific skill
   */
  async getSkill(slugOrId: string): Promise<Skill> {
    return this.request(`/api/v1/skills/${slugOrId}`);
  }

  /**
   * Execute a skill with given input
   */
  async executeSkill(
    slugOrId: string,
    input: Record<string, unknown>
  ): Promise<SkillExecuteResult> {
    return this.request(`/api/v1/skills/${slugOrId}/execute`, {
      method: 'POST',
      body: JSON.stringify({ input }),
    });
  }

  /**
   * Get user's purchased/acquired skills
   */
  async getMySkills(): Promise<UserSkill[]> {
    const response = await this.request<{ orders: UserSkill[] }>('/api/v1/orders');
    return response.orders || [];
  }

  /**
   * Acquire a free skill
   */
  async acquireFreeSkill(skillSlug: string): Promise<{ success: boolean; order_id: string }> {
    return this.request('/api/v1/orders/free', {
      method: 'POST',
      body: JSON.stringify({ skill_slug: skillSlug }),
    });
  }

  /**
   * List skill categories
   */
  async getCategories(): Promise<{ categories: { slug: string; name: string; count: number }[] }> {
    return this.request('/api/v1/categories');
  }

  /**
   * Search skills by query
   */
  async searchSkills(query: string, limit: number = 10): Promise<Skill[]> {
    const result = await this.listSkills({ search: query, limit });
    return result.skills;
  }

  /**
   * Check if API key is valid
   */
  async validateApiKey(): Promise<boolean> {
    try {
      await this.request('/api/v1/users/me');
      return true;
    } catch {
      return false;
    }
  }
}
