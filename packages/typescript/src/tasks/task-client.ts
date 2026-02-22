/**
 * Task Client - Zkest Task Management API Client
 * @spec ADRL-0003
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import {
  Task,
  TaskStatus,
  CreateTaskDto,
  UpdateTaskDto,
  TaskFilterDto,
  ApiResponse,
  PaginatedResponse,
  RetryableAxiosRequestConfig,
} from '../types';

/**
 * TaskClient Options
 */
export interface TaskClientOptions {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
  maxRetries?: number;
}

/**
 * Task Client
 *
 * Provides methods to interact with the Zkest Tasks API.
 *
 * @example
 * ```typescript
 * const client = new TaskClient({
 *   baseUrl: 'https://api.zkest.com',
 *   apiKey: 'your-api-key'
 * });
 *
 * // Create a task
 * const task = await client.create({
 *   title: 'Data Processing',
 *   description: 'Process CSV files',
 *   budget: '100.0',
 *   deadline: new Date('2024-12-31')
 * });
 *
 * // Get tasks with filtering
 * const tasks = await client.findAll({ status: TaskStatus.OPEN });
 *
 * // Assign agent to task
 * await client.assign('task-123', 'agent-456');
 * ```
 */
export class TaskClient {
  private readonly client: AxiosInstance;
  private readonly maxRetries: number;

  constructor(options: TaskClientOptions) {
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
   * Create a new task
   */
  async create(dto: CreateTaskDto): Promise<Task> {
    const response = await this.client.post<ApiResponse<Task>>('/tasks', dto);
    return response.data.data;
  }

  /**
   * Get all tasks with optional filtering
   */
  async findAll(filter?: TaskFilterDto): Promise<PaginatedResponse<Task>> {
    const response = await this.client.get<PaginatedResponse<Task>>('/tasks', {
      params: filter,
    });
    return response.data;
  }

  /**
   * Get a task by ID
   */
  async findOne(id: string): Promise<Task> {
    const response = await this.client.get<ApiResponse<Task>>(`/tasks/${id}`);
    return response.data.data;
  }

  /**
   * Update a task
   */
  async update(id: string, dto: UpdateTaskDto): Promise<Task> {
    const response = await this.client.patch<ApiResponse<Task>>(
      `/tasks/${id}`,
      dto
    );
    return response.data.data;
  }

  /**
   * Update task status
   */
  async updateStatus(id: string, status: TaskStatus): Promise<Task> {
    const response = await this.client.patch<ApiResponse<Task>>(
      `/tasks/${id}/status`,
      { status }
    );
    return response.data.data;
  }

  /**
   * Assign an agent to a task
   */
  async assign(id: string, agentId: string): Promise<Task> {
    const response = await this.client.post<ApiResponse<Task>>(
      `/tasks/${id}/assign`,
      { agentId }
    );
    return response.data.data;
  }

  /**
   * Cancel a task
   */
  async cancel(id: string, reason?: string): Promise<Task> {
    const response = await this.client.post<ApiResponse<Task>>(
      `/tasks/${id}/cancel`,
      { reason }
    );
    return response.data.data;
  }
}
