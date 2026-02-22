/**
 * Dispute Client - Zkest Dispute Management API Client
 * @spec ADRL-0003
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import {
  CoreDispute,
  DisputeStatus,
  DisputeResolution,
  CreateDisputeDto,
  ResolveDisputeDto,
  DisputeFilterDto,
  ApiResponse,
  PaginatedResponse,
  RetryableAxiosRequestConfig,
} from '../types';

/**
 * DisputeClient Options
 */
export interface DisputeClientOptions {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
  maxRetries?: number;
}

/**
 * Dispute Statistics
 */
export interface DisputeStatistics {
  totalDisputes: number;
  openDisputes: number;
  resolvedDisputes: number;
  escalatedDisputes: number;
  averageResolutionTime: number;
  resolutionBreakdown: Record<DisputeResolution, number>;
}

/**
 * Dispute Client
 *
 * Provides methods to interact with the Zkest Disputes API.
 *
 * @example
 * ```typescript
 * const client = new DisputeClient({
 *   baseUrl: 'https://api.zkest.com',
 *   apiKey: 'your-api-key'
 * });
 *
 * // Create a dispute
 * const dispute = await client.create({
 *   assignmentId: 'assignment-123',
 *   reason: 'Task not completed as specified',
 *   evidence: { files: ['ipfs://...'] }
 * });
 *
 * // Get dispute statistics
 * const stats = await client.getStatistics();
 *
 * // Escalate a dispute
 * await client.escalate('dispute-456');
 * ```
 */
export class DisputeClient {
  private readonly client: AxiosInstance;
  private readonly maxRetries: number;

  constructor(options: DisputeClientOptions) {
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

        if (!config || config.__retryCount >= this.maxRetries) {
          return Promise.reject(error);
        }

        config.__retryCount = config.__retryCount ?? 0;
        config.__retryCount++;

        // Exponential backoff
        const delay = Math.pow(2, config.__retryCount) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));

        return this.client.request(config);
      }
    );
  }

  /**
   * Create a new dispute
   */
  async create(dto: CreateDisputeDto): Promise<CoreDispute> {
    const response = await this.client.post<ApiResponse<CoreDispute>>(
      '/disputes',
      dto
    );
    return response.data.data;
  }

  /**
   * Get all disputes with optional filtering
   */
  async findAll(filter?: DisputeFilterDto): Promise<CoreDispute[]> {
    const response = await this.client.get<PaginatedResponse<CoreDispute>>(
      '/disputes',
      { params: filter }
    );
    return response.data.data;
  }

  /**
   * Get dispute statistics
   */
  async getStatistics(): Promise<DisputeStatistics> {
    const response = await this.client.get<ApiResponse<DisputeStatistics>>(
      '/disputes/statistics'
    );
    return response.data.data;
  }

  /**
   * Get a dispute by ID
   */
  async findOne(id: string): Promise<CoreDispute> {
    const response = await this.client.get<ApiResponse<CoreDispute>>(
      `/disputes/${id}`
    );
    return response.data.data;
  }

  /**
   * Resolve a dispute (admin only)
   */
  async resolve(id: string, dto: ResolveDisputeDto): Promise<CoreDispute> {
    const response = await this.client.patch<ApiResponse<CoreDispute>>(
      `/disputes/${id}/resolve`,
      dto
    );
    return response.data.data;
  }

  /**
   * Escalate a dispute
   */
  async escalate(id: string): Promise<CoreDispute> {
    const response = await this.client.patch<ApiResponse<CoreDispute>>(
      `/disputes/${id}/escalate`
    );
    return response.data.data;
  }

  /**
   * Get disputes by assignment
   */
  async findByAssignment(assignmentId: string): Promise<CoreDispute[]> {
    const response = await this.client.get<PaginatedResponse<CoreDispute>>(
      '/disputes',
      { params: { assignmentId } }
    );
    return response.data.data;
  }

  /**
   * Get disputes by initiator
   */
  async findByInitiator(initiatorId: string): Promise<CoreDispute[]> {
    const response = await this.client.get<PaginatedResponse<CoreDispute>>(
      '/disputes',
      { params: { initiatorId } }
    );
    return response.data.data;
  }

  /**
   * Get disputes by status
   */
  async findByStatus(status: DisputeStatus): Promise<CoreDispute[]> {
    const response = await this.client.get<PaginatedResponse<CoreDispute>>(
      '/disputes',
      { params: { status } }
    );
    return response.data.data;
  }
}
