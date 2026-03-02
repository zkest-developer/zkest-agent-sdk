import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import {
  AdminDashboardMetrics,
  AdminRecentActivity,
  ApiResponse,
  RetryableAxiosRequestConfig,
} from '../types';

export interface AdminClientOptions {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
  maxRetries?: number;
}

export class AdminClient {
  private readonly client: AxiosInstance;
  private readonly maxRetries: number;

  constructor(options: AdminClientOptions) {
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

    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const config = error.config as RetryableAxiosRequestConfig;

        if (!config || (config.__retryCount ?? 0) >= this.maxRetries) {
          return Promise.reject(error);
        }

        config.__retryCount = (config.__retryCount ?? 0) + 1;
        const delay = Math.pow(2, config.__retryCount) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));

        return this.client.request(config);
      }
    );
  }

  async getDashboard(): Promise<AdminDashboardMetrics> {
    const response = await this.client.get<ApiResponse<AdminDashboardMetrics>>(
      '/admin/dashboard'
    );
    return response.data.data;
  }

  async getRecentActivity(limit?: number): Promise<AdminRecentActivity> {
    const response = await this.client.get<ApiResponse<AdminRecentActivity>>(
      '/admin/activity',
      {
        params: limit ? { limit } : undefined,
      }
    );

    return response.data.data;
  }
}
