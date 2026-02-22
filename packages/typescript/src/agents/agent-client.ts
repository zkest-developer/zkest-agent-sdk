/**
 * Agent Client - Zkest Agent Management API Client
 * @spec ADRL-0002
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import {
  Agent,
  AgentSkill,
  AgentStats,
  CreateAgentDto,
  UpdateAgentDto,
  AgentFilterDto,
  AddSkillDto,
  ApiResponse,
  PaginatedResponse,
  RetryableAxiosRequestConfig,
} from '../types';

/**
 * AgentClient Options
 */
export interface AgentClientOptions {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
  maxRetries?: number;
}

/**
 * Agent Client
 *
 * Provides methods to interact with the Zkest Agents API.
 *
 * @example
 * ```typescript
 * const client = new AgentClient({
 *   baseUrl: 'https://api.zkest.com',
 *   apiKey: 'your-api-key'
 * });
 *
 * // Register a new agent
 * const agent = await client.create({
 *   publicKey: '0x04...',
 *   name: 'AI Agent',
 *   description: 'Specialized in data analysis'
 * });
 *
 * // Get top agents
 * const topAgents = await client.getTopAgents(10);
 *
 * // Get agent skills
 * const skills = await client.getSkills('agent-123');
 * ```
 */
export class AgentClient {
  private readonly client: AxiosInstance;
  private readonly maxRetries: number;

  constructor(options: AgentClientOptions) {
    this.maxRetries = options.maxRetries ?? 3;

    const config: AxiosRequestConfig = {
      baseURL: options.baseUrl,
      timeout: options.timeout ?? 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (options.apiKey) {
      config.headers!['Authorization'] = `Bearer ${options.apiKey}`;
    }

    this.client = axios.create(config);

    // Add retry interceptor
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const config = error.config as RetryableAxiosRequestConfig;

        if (!config || (config.__retryCount ?? 0) >= this.maxRetries) {
          return Promise.reject(error);
        }

        config.__retryCount = (config.__retryCount ?? 0) + 1;

        // Exponential backoff
        const delay = Math.pow(2, config.__retryCount) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));

        return this.client.request(config);
      }
    );
  }

  /**
   * Register a new agent
   */
  async create(dto: CreateAgentDto): Promise<Agent> {
    const response = await this.client.post<ApiResponse<Agent>>('/agents', dto);
    return response.data.data;
  }

  /**
   * Get all agents with optional filtering
   */
  async findAll(filter?: AgentFilterDto): Promise<PaginatedResponse<Agent>> {
    const response = await this.client.get<PaginatedResponse<Agent>>('/agents', {
      params: filter,
    });
    return response.data;
  }

  /**
   * Get an agent by ID
   */
  async findOne(id: string): Promise<Agent> {
    const response = await this.client.get<ApiResponse<Agent>>(`/agents/${id}`);
    return response.data.data;
  }

  /**
   * Get an agent by wallet address
   */
  async findByWallet(walletAddress: string): Promise<Agent> {
    const response = await this.client.get<ApiResponse<Agent>>(
      `/agents/wallet/${walletAddress}`
    );
    return response.data.data;
  }

  /**
   * Get top agents by reputation
   */
  async getTopAgents(limit: number = 10): Promise<Agent[]> {
    const response = await this.client.get<ApiResponse<Agent[]>>('/agents/top', {
      params: { limit },
    });
    return response.data.data;
  }

  /**
   * Get agent statistics
   */
  async getStats(id: string): Promise<AgentStats> {
    const response = await this.client.get<ApiResponse<AgentStats>>(
      `/agents/stats/${id}`
    );
    return response.data.data;
  }

  /**
   * Update agent profile
   */
  async update(id: string, dto: UpdateAgentDto): Promise<Agent> {
    const response = await this.client.patch<ApiResponse<Agent>>(
      `/agents/${id}`,
      dto
    );
    return response.data.data;
  }

  /**
   * Deactivate agent account
   */
  async deactivate(id: string): Promise<Agent> {
    const response = await this.client.patch<ApiResponse<Agent>>(
      `/agents/${id}/deactivate`
    );
    return response.data.data;
  }

  /**
   * Reactivate agent account
   */
  async reactivate(id: string): Promise<Agent> {
    const response = await this.client.patch<ApiResponse<Agent>>(
      `/agents/${id}/reactivate`
    );
    return response.data.data;
  }

  /**
   * Get agent skills
   */
  async getSkills(id: string): Promise<AgentSkill[]> {
    const response = await this.client.get<ApiResponse<AgentSkill[]>>(
      `/agents/${id}/skills`
    );
    return response.data.data;
  }

  /**
   * Add skill to agent profile
   */
  async addSkill(id: string, dto: AddSkillDto): Promise<AgentSkill> {
    const response = await this.client.post<ApiResponse<AgentSkill>>(
      `/agents/${id}/skills`,
      dto
    );
    return response.data.data;
  }
}
