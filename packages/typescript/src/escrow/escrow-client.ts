/**
 * Escrow Client
 * @spec ADRL-0003
 *
 * HTTP client for escrow-related API operations
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  Escrow,
  Dispute,
  CreateEscrowDto,
  CreateDisputeDto,
  ResolveDisputeDto,
  ApiResponse,
  ApiError,
  RetryableAxiosRequestConfig,
} from '../types';

/**
 * Confirm DTO
 */
export interface ConfirmDto {
  resultUrl?: string;
  notes?: string;
}

/**
 * Escrow Client Configuration
 */
export interface EscrowClientConfig {
  apiUrl: string;
  timeout?: number;
  maxRetries?: number;
}

/**
 * Escrow Client
 *
 * Provides methods to interact with the escrow API
 */
export class EscrowClient {
  private client: AxiosInstance;
  private maxRetries: number;

  constructor(config: EscrowClientConfig) {
    this.maxRetries = config.maxRetries ?? 3;

    this.client = axios.create({
      baseURL: config.apiUrl,
      timeout: config.timeout ?? 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for retries
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const config = error.config as RetryableAxiosRequestConfig | undefined;

        if (!config || config.__retryCount >= this.maxRetries) {
          throw this.handleError(error);
        }

        config.__retryCount = config.__retryCount ?? 0;
        config.__retryCount += 1;

        // Exponential backoff
        const delay = Math.pow(2, config.__retryCount) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));

        return this.client(config);
      }
    );
  }

  /**
   * Create a new escrow
   * @param data Escrow data
   * @param token JWT token
   * @returns Created escrow
   */
  async createEscrow(data: CreateEscrowDto, token: string): Promise<Escrow> {
    try {
      const response = await this.client.post<ApiResponse<Escrow>>(
        '/escrows',
        data,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get all escrows with filtering
   * @param filters Query filters
   * @returns Array of escrows
   */
  async getEscrows(filters?: {
    status?: string;
    clientWallet?: string;
    agentWallet?: string;
  }): Promise<Escrow[]> {
    try {
      const response = await this.client.get<ApiResponse<Escrow[]>>('/escrows', {
        params: filters,
      });

      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get escrow by ID
   * @param id Escrow ID
   * @returns Escrow
   */
  async getEscrow(id: string): Promise<Escrow> {
    try {
      const response = await this.client.get<ApiResponse<Escrow>>(`/escrows/${id}`);

      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Confirm task completion
   * @param id Escrow ID
   * @param data Confirmation data
   * @param token JWT token
   * @returns Updated escrow
   */
  async confirmCompletion(
    id: string,
    data: ConfirmDto,
    token: string
  ): Promise<Escrow> {
    try {
      const response = await this.client.patch<ApiResponse<Escrow>>(
        `/escrows/${id}/confirm`,
        data,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Request refund
   * @param id Escrow ID
   * @param token JWT token
   * @returns Updated escrow
   */
  async requestRefund(id: string, token: string): Promise<Escrow> {
    try {
      const response = await this.client.post<ApiResponse<Escrow>>(
        `/escrows/${id}/refund`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Raise a dispute
   * @param id Escrow ID
   * @param data Dispute data
   * @param token JWT token
   * @returns Created dispute
   */
  async raiseDispute(
    id: string,
    data: CreateDisputeDto,
    token: string
  ): Promise<Dispute> {
    try {
      const response = await this.client.post<ApiResponse<Dispute>>(
        `/escrows/${id}/dispute`,
        data,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get dispute for escrow
   * @param id Escrow ID
   * @returns Dispute
   */
  async getDispute(id: string): Promise<Dispute> {
    try {
      const response = await this.client.get<ApiResponse<Dispute>>(
        `/escrows/${id}/dispute`
      );

      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Resolve a dispute
   * @param disputeId Dispute ID
   * @param data Resolution data
   * @param token JWT token
   * @returns Resolved dispute
   */
  async resolveDispute(
    disputeId: string,
    data: ResolveDisputeDto,
    token: string
  ): Promise<Dispute> {
    try {
      const response = await this.client.patch<ApiResponse<Dispute>>(
        `/escrows/disputes/${disputeId}/resolve`,
        data,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Handle API errors
   * @param error Axios error
   * @returns Formatted API error
   */
  private handleError(error: unknown): ApiError {
    if (axios.isAxiosError(error)) {
      return {
        success: false,
        message: error.response?.data?.message ?? error.message,
        statusCode: error.response?.status ?? 500,
        details: error.response?.data,
      };
    }

    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      statusCode: 500,
    };
  }
}
