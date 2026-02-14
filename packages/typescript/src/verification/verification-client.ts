/**
 * Verification Client
 * @spec ADRL-0004
 *
 * HTTP client for verification-related API operations
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  VerificationRequest,
  AgentMetrics,
  CreateVerificationDto,
  UpdateVerificationDto,
  UpdateReputationDto,
  Tier,
  TierUpdateEvent,
  ApiResponse,
  ApiError,
  RetryableAxiosRequestConfig,
} from '../types';

/**
 * Verification Client Configuration
 */
export interface VerificationClientConfig {
  apiUrl: string;
  timeout?: number;
  maxRetries?: number;
}

/**
 * Verification Client
 *
 * Provides methods to interact with the verification API
 */
export class VerificationClient {
  private client: AxiosInstance;
  private maxRetries: number;

  constructor(config: VerificationClientConfig) {
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
   * Submit skill for verification
   * @param data Verification data
   * @param token JWT token
   * @returns Verification request
   */
  async submitVerification(
    data: CreateVerificationDto,
    token: string
  ): Promise<VerificationRequest> {
    try {
      const response = await this.client.post<ApiResponse<VerificationRequest>>(
        '/verifications',
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
   * Get pending verifications
   * @returns Array of pending verification requests
   */
  async getPendingVerifications(): Promise<VerificationRequest[]> {
    try {
      const response = await this.client.get<ApiResponse<VerificationRequest[]>>(
        '/verifications/pending'
      );

      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get verification by ID
   * @param id Verification ID
   * @returns Verification request
   */
  async getVerification(id: string): Promise<VerificationRequest> {
    try {
      const response = await this.client.get<ApiResponse<VerificationRequest>>(
        `/verifications/${id}`
      );

      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Approve or reject verification
   * @param id Verification ID
   * @param data Update data
   * @param token JWT token
   * @returns Updated verification request
   */
  async updateVerification(
    id: string,
    data: UpdateVerificationDto,
    token: string
  ): Promise<VerificationRequest> {
    try {
      const response = await this.client.patch<ApiResponse<VerificationRequest>>(
        `/verifications/${id}`,
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
   * Get agent metrics
   * @param agentId Agent ID
   * @returns Agent metrics
   */
  async getAgentMetrics(agentId: string): Promise<AgentMetrics> {
    try {
      const response = await this.client.get<ApiResponse<AgentMetrics>>(
        `/verifications/agents/${agentId}/metrics`
      );

      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update agent reputation
   * @param agentId Agent ID
   * @param data Reputation update data
   * @returns Updated metrics
   */
  async updateReputation(
    agentId: string,
    data: UpdateReputationDto,
    token: string
  ): Promise<AgentMetrics> {
    try {
      const response = await this.client.post<ApiResponse<AgentMetrics>>(
        `/verifications/agents/${agentId}/reputation`,
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
   * Get agent tier history
   * @param agentId Agent ID
   * @returns Tier history
   */
  async getTierHistory(agentId: string): Promise<TierUpdateEvent[]> {
    try {
      const response = await this.client.get<ApiResponse<TierUpdateEvent[]>>(
        `/verifications/agents/${agentId}/history`
      );

      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Set agent tier
   * @param agentId Agent ID
   * @param tier New tier
   * @param reason Reason for tier change
   * @param token JWT token
   * @returns Updated metrics
   */
  async setTier(
    agentId: string,
    tier: Tier,
    reason: string,
    token: string
  ): Promise<AgentMetrics> {
    try {
      const response = await this.client.patch<ApiResponse<AgentMetrics>>(
        `/verifications/agents/${agentId}/tier`,
        { tier, reason },
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
