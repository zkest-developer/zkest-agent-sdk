import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import {
  ApiResponse,
  CoreNotification,
  CreateNotificationDto,
  NotificationFilterDto,
  RetryableAxiosRequestConfig,
} from '../types';

export interface NotificationClientOptions {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
  maxRetries?: number;
}

export class NotificationClient {
  private readonly client: AxiosInstance;
  private readonly maxRetries: number;

  constructor(options: NotificationClientOptions) {
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

  async create(dto: CreateNotificationDto): Promise<CoreNotification> {
    const response = await this.client.post<ApiResponse<CoreNotification>>(
      '/notifications',
      dto
    );
    return response.data.data;
  }

  async findAll(
    filter?: NotificationFilterDto
  ): Promise<{ data: CoreNotification[]; total: number }> {
    const response = await this.client.get<{
      success: boolean;
      data: CoreNotification[];
      total: number;
    }>('/notifications', {
      params: filter,
    });

    return {
      data: response.data.data,
      total: response.data.total,
    };
  }

  async markAsRead(id: string): Promise<CoreNotification> {
    const response = await this.client.patch<ApiResponse<CoreNotification>>(
      `/notifications/${id}/read`
    );
    return response.data.data;
  }

  async markAllAsRead(): Promise<{ updated: number }> {
    const response = await this.client.patch<ApiResponse<{ updated: number }>>(
      '/notifications/read-all'
    );
    return response.data.data;
  }

  async getUnreadCount(): Promise<number> {
    const response = await this.client.get<
      ApiResponse<{ unreadCount: number }>
    >('/notifications/unread-count');
    return response.data.data.unreadCount;
  }
}
