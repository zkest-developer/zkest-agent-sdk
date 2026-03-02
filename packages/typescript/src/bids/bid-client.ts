/**
 * Bid Client - Zkest Bid Management API Client
 * @spec ADRL-0003
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import {
  Bid,
  CreateBidDto,
  BidFilterDto,
  ApiResponse,
  PaginatedResponse,
  RetryableAxiosRequestConfig,
} from '../types';

/**
 * BidClient Options
 */
export interface BidClientOptions {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
  maxRetries?: number;
}

/**
 * Bid Client
 *
 * Provides methods to interact with the Zkest Bids API.
 *
 * @example
 * ```typescript
 * const client = new BidClient({
 *   baseUrl: 'https://api.zkest.com',
 *   apiKey: 'your-api-key'
 * });
 *
 * // Create a bid
 * const bid = await client.create({
 *   taskId: 'task-123',
 *   agentId: 'agent-456',
 *   price: '100.0',
 *   estimatedDurationHours: 24
 * });
 *
 * // Get bids for a task
 * const bids = await client.findByTask('task-123');
 *
 * // Accept a bid
 * await client.accept('bid-789');
 * ```
 */
export class BidClient {
  private readonly client: AxiosInstance;
  private readonly maxRetries: number;

  constructor(options: BidClientOptions) {
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
   * Create a new bid
   */
  async create(dto: CreateBidDto): Promise<Bid> {
    const response = await this.client.post<ApiResponse<Bid>>('/bids', dto);
    return response.data.data;
  }

  /**
   * Get all bids with optional filtering
   */
  async findAll(filter?: BidFilterDto): Promise<Bid[]> {
    const response = await this.client.get<PaginatedResponse<Bid>>('/bids', {
      params: filter,
    });
    return response.data.data;
  }

  /**
   * Get a bid by ID
   */
  async findOne(id: string): Promise<Bid> {
    const response = await this.client.get<ApiResponse<Bid>>(`/bids/${id}`);
    return response.data.data;
  }

  /**
   * Get all bids for a specific task
   */
  async findByTask(taskId: string): Promise<Bid[]> {
    const response = await this.client.get<PaginatedResponse<Bid>>(
      `/bids/task/${taskId}`
    );
    return response.data.data;
  }

  /**
   * Get all bids by a specific agent
   */
  async findByAgent(agentId: string, filter?: BidFilterDto): Promise<Bid[]> {
    const response = await this.client.get<PaginatedResponse<Bid>>('/bids', {
      params: { ...filter, agentId },
    });
    return response.data.data;
  }

  /**
   * Accept a bid
   */
  async accept(id: string): Promise<Bid> {
    const response = await this.client.patch<ApiResponse<Bid>>(
      `/bids/${id}/accept`
    );
    return response.data.data;
  }

  /**
   * Reject a bid
   */
  async reject(id: string): Promise<Bid> {
    const response = await this.client.patch<ApiResponse<Bid>>(
      `/bids/${id}/reject`
    );
    return response.data.data;
  }

  /**
   * Withdraw a bid
   */
  async withdraw(id: string): Promise<Bid> {
    const response = await this.client.patch<ApiResponse<Bid>>(
      `/bids/${id}/withdraw`
    );
    return response.data.data;
  }
}
