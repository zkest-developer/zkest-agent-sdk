/**
 * Payment Client - Zkest Payment Management API Client
 * @spec ADRL-0003
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import {
  CorePayment,
  PaymentStatus,
  CreatePaymentDto,
  PaymentFilterDto,
  ApiResponse,
  PaginatedResponse,
  RetryableAxiosRequestConfig,
} from '../types';

/**
 * PaymentClient Options
 */
export interface PaymentClientOptions {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
  maxRetries?: number;
}

/**
 * Payment Statistics
 */
export interface PaymentStatistics {
  totalPayments: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  totalVolume: string;
}

/**
 * Update Payment Status DTO
 */
export interface UpdatePaymentStatusDto {
  status: PaymentStatus;
  txHash?: string;
}

/**
 * Payment Client
 *
 * Provides methods to interact with the Zkest Payments API.
 *
 * @example
 * ```typescript
 * const client = new PaymentClient({
 *   baseUrl: 'https://api.zkest.com',
 *   apiKey: 'your-api-key'
 * });
 *
 * // Get payments for an assignment
 * const payments = await client.findByAssignment('assignment-123');
 *
 * // Update payment status
 * await client.updateStatus('payment-456', {
 *   status: PaymentStatus.CONFIRMED,
 *   txHash: '0x...'
 * });
 * ```
 */
export class PaymentClient {
  private readonly client: AxiosInstance;
  private readonly maxRetries: number;

  constructor(options: PaymentClientOptions) {
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
   * Create a new payment
   */
  async create(dto: CreatePaymentDto): Promise<CorePayment> {
    const response = await this.client.post<ApiResponse<CorePayment>>(
      '/payments',
      dto
    );
    return response.data.data;
  }

  /**
   * Get all payments with optional filtering
   */
  async findAll(filter?: PaymentFilterDto): Promise<CorePayment[]> {
    const params: Record<string, unknown> = { ...(filter ?? {}) };
    if (filter?.wallet) {
      params.wallet = filter.wallet;
      delete params.address;
    } else if (filter?.address) {
      params.address = filter.address;
    } else if (filter?.fromAddress) {
      params.address = filter.fromAddress;
    } else if (filter?.toAddress) {
      params.address = filter.toAddress;
    }
    delete params.fromAddress;
    delete params.toAddress;

    const response = await this.client.get<PaginatedResponse<CorePayment>>(
      '/payments',
      { params }
    );
    return response.data.data;
  }

  /**
   * Get payment statistics
   */
  async getStatistics(): Promise<PaymentStatistics> {
    const response = await this.client.get<ApiResponse<PaymentStatistics>>(
      '/payments/statistics'
    );
    return response.data.data;
  }

  /**
   * Get a payment by ID
   */
  async findOne(id: string): Promise<CorePayment> {
    const response = await this.client.get<ApiResponse<CorePayment>>(
      `/payments/${id}`
    );
    return response.data.data;
  }

  /**
   * Get all payments for an assignment
   */
  async findByAssignment(assignmentId: string): Promise<CorePayment[]> {
    const response = await this.client.get<PaginatedResponse<CorePayment>>(
      `/payments/assignment/${assignmentId}`
    );
    return response.data.data;
  }

  /**
   * Get all payments for a specific address
   */
  async findByAddress(address: string): Promise<CorePayment[]> {
    const response = await this.client.get<PaginatedResponse<CorePayment>>(
      `/payments/address/${address}`
    );
    return response.data.data;
  }

  /**
   * Update payment status
   */
  async updateStatus(
    id: string,
    dto: UpdatePaymentStatusDto
  ): Promise<CorePayment> {
    const response = await this.client.post<ApiResponse<CorePayment>>(
      `/payments/${id}/status`,
      dto
    );
    return response.data.data;
  }
}
