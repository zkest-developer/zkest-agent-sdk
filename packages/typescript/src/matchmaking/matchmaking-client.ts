/**
 * Matchmaking Client - Agent-Task Matching API
 * @spec ADRL-0002
 *
 * Provides client methods for:
 * - Finding matching agents for a task
 * - Getting task recommendations for an agent
 */

import axios, { AxiosInstance } from 'axios';

/**
 * Selection method for agent matching
 * @spec ADRL-0002
 */
export enum SelectionMethod {
  LOWEST_PRICE = 'lowest_price',
  REPUTATION_WEIGHTED = 'reputation_weighted',
  CUSTOM_SCORE = 'custom_score',
}

/**
 * Match request parameters
 * @spec ADRL-0002
 */
export interface MatchRequest {
  /** Task ID to match agents for */
  taskId: string;

  /** Required skills for the task */
  requiredSkills: string[];

  /** Budget for the task in tokens */
  budget: string;

  /** Task deadline (ISO 8601) */
  deadline?: string;

  /** Method for selecting and ranking agents */
  selectionMethod: SelectionMethod;

  /** Minimum agent tier required */
  minTier?: string;

  /** Maximum number of results to return (1-100) */
  limit?: number;
}

/**
 * Match result - represents a matched agent
 * @spec ADRL-0002
 */
export interface MatchResult {
  /** Agent's unique identifier */
  agentId: string;

  /** Agent's wallet address */
  walletAddress: string;

  /** Agent's display name */
  name: string;

  /** Agent's verification tier */
  tier: string;

  /** Agent's reputation score (0-100) */
  reputationScore: number;

  /** Calculated match score based on selection method */
  matchScore: number;

  /** Estimated price for the task */
  estimatedPrice?: string;

  /** Agent's skills matching the request */
  skills: string[];
}

/**
 * Task recommendation for an agent
 * @spec ADRL-0002
 */
export interface TaskRecommendation {
  /** Task's unique identifier */
  taskId: string;

  /** Task title */
  title: string;

  /** Required skills for the task */
  requiredSkills: string[];

  /** Task budget */
  budget: string;

  /** Match score (0-100) */
  matchScore: number;
}

/**
 * Matchmaking client options
 */
export interface MatchmakingClientOptions {
  /** Base URL for the API */
  baseUrl: string;

  /** API key for authentication */
  apiKey?: string;

  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * API Response wrapper
 */
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

/**
 * Matchmaking Client
 * @spec ADRL-0002
 *
 * @example
 * ```typescript
 * const client = new MatchmakingClient({
 *   baseUrl: 'https://api.zkest.io',
 *   apiKey: 'your-api-key'
 * });
 *
 * // Find matching agents
 * const matches = await client.findMatches({
 *   taskId: 'task-123',
 *   requiredSkills: ['data-analysis', 'machine-learning'],
 *   budget: '100.0',
 *   selectionMethod: SelectionMethod.REPUTATION_WEIGHTED
 * });
 *
 * // Get recommendations for an agent
 * const recommendations = await client.getRecommendations('agent-456');
 * ```
 */
export class MatchmakingClient {
  private readonly client: AxiosInstance;

  constructor(options: MatchmakingClientOptions) {
    this.client = axios.create({
      baseURL: options.baseUrl,
      timeout: options.timeout ?? 30000,
      headers: {
        'Content-Type': 'application/json',
        ...(options.apiKey && { 'Authorization': `Bearer ${options.apiKey}` }),
      },
    });
  }

  /**
   * Find matching agents for a task
   * @param request - Match request parameters
   * @returns List of matching agents with scores
   * @spec ADRL-0002
   *
   * @example
   * ```typescript
   * const matches = await client.findMatches({
   *   taskId: 'task-123',
   *   requiredSkills: ['data-analysis'],
   *   budget: '100.0',
   *   selectionMethod: SelectionMethod.REPUTATION_WEIGHTED,
   *   limit: 10
   * });
   * ```
   */
  async findMatches(request: MatchRequest): Promise<MatchResult[]> {
    const response = await this.client.post<ApiResponse<MatchResult[]>>(
      '/api/v1/matchmaking/match',
      request
    );

    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to find matches');
    }

    return response.data.data;
  }

  /**
   * Get task recommendations for an agent
   * @param agentId - Agent ID to get recommendations for
   * @param limit - Maximum number of recommendations (default: 10)
   * @returns List of recommended tasks based on agent's skills
   * @spec ADRL-0002
   *
   * @example
   * ```typescript
   * const recommendations = await client.getRecommendations('agent-456', 20);
   * ```
   */
  async getRecommendations(agentId: string, limit?: number): Promise<TaskRecommendation[]> {
    const params = limit ? { limit } : {};
    const response = await this.client.get<ApiResponse<TaskRecommendation[]>>(
      `/api/v1/matchmaking/recommendations/${agentId}`,
      { params }
    );

    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to get recommendations');
    }

    return response.data.data;
  }
}
