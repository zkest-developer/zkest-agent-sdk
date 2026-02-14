/**
 * Multi-Verifier Client
 * @spec ADRL-0005
 *
 * HTTP client for multi-verifier consensus-based task verification
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  TaskVerification,
  SubmitTaskVerificationDto,
  ConsensusResult,
  VerifierMetrics,
  ApiResponse,
  ApiError,
  RetryableAxiosRequestConfig,
} from '../types';

/**
 * Eligible Verifier
 */
export interface EligibleVerifier {
  address: string;
  tier: string;
  accuracy: number;
  stakeAmount: string;
}

/**
 * Auto-approve result
 */
export interface AutoApproveResult {
  taskId: string;
  approved: boolean;
  reason: string;
  timestamp: Date;
}

/**
 * Multi-Verifier Client Configuration
 */
export interface MultiVerifierClientConfig {
  apiUrl: string;
  timeout?: number;
  maxRetries?: number;
}

/**
 * Multi-Verifier Client
 *
 * Provides methods for multi-verifier consensus-based verification
 */
export class MultiVerifierClient {
  private client: AxiosInstance;
  private maxRetries: number;

  constructor(config: MultiVerifierClientConfig) {
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
   * Request verification for a task
   * @param taskId Task ID
   * @param token JWT token
   * @returns Verification request details
   */
  async requestVerification(taskId: string, token: string): Promise<TaskVerification> {
    try {
      const response = await this.client.post<ApiResponse<TaskVerification>>(
        `/api/v1/tasks/${taskId}/verification-request`,
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
   * Get eligible verifiers for a task
   * @param taskId Task ID
   * @returns List of eligible verifiers
   */
  async getEligibleVerifiers(taskId: string): Promise<EligibleVerifier[]> {
    try {
      const response = await this.client.get<ApiResponse<EligibleVerifier[]>>(
        `/api/v1/tasks/${taskId}/verifiers`
      );

      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Submit verification for a task
   * @param taskId Task ID
   * @param data Verification data
   * @param token JWT token
   * @returns Verification submission result
   */
  async submitVerification(
    taskId: string,
    data: SubmitTaskVerificationDto,
    token: string
  ): Promise<{ consensusReached: boolean; approvalRatio: number }> {
    try {
      const response = await this.client.post<
        ApiResponse<{
          consensusReached: boolean;
          approvalRatio: number;
        }>
      >(`/api/v1/tasks/${taskId}/verifications`, data, {
        headers: { Authorization: `Bearer ${token}` },
      });

      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get consensus result for a task
   * @param taskId Task ID
   * @returns Consensus result
   */
  async getConsensus(taskId: string): Promise<ConsensusResult> {
    try {
      const response = await this.client.get<ApiResponse<ConsensusResult>>(
        `/api/v1/tasks/${taskId}/consensus`
      );

      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Auto-approve or reject a task (requester agent)
   * @param taskId Task ID
   * @param approved Approval status
   * @param reason Reason for approval/rejection
   * @param testResults Test results if available
   * @param token JWT token
   * @returns Approval result
   */
  async autoApproveOrReject(
    taskId: string,
    approved: boolean,
    reason: string,
    testResults?: object,
    token?: string
  ): Promise<AutoApproveResult> {
    try {
      const response = await this.client.post<ApiResponse<AutoApproveResult>>(
        `/api/v1/tasks/${taskId}/auto-approve`,
        { approved, reason, testResults },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get verifier metrics
   * @param verifierId Verifier ID or address
   * @returns Verifier metrics
   */
  async getVerifierMetrics(verifierId: string): Promise<VerifierMetrics> {
    try {
      const response = await this.client.get<ApiResponse<VerifierMetrics>>(
        `/api/v1/verifiers/${verifierId}/metrics`
      );

      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get verification status for a task
   * @param taskId Task ID
   * @returns Task verification details
   */
  async getVerificationStatus(taskId: string): Promise<TaskVerification> {
    try {
      const response = await this.client.get<ApiResponse<TaskVerification>>(
        `/api/v1/tasks/${taskId}/verification`
      );

      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Check if quorum is reached
   * @param taskId Task ID
   * @returns Whether quorum is reached and current count
   */
  async checkQuorum(taskId: string): Promise<{
    reached: boolean;
    currentVerifications: number;
    minVerifiers: number;
    quorumRatio: number;
  }> {
    try {
      const response = await this.client.get<
        ApiResponse<{
          reached: boolean;
          currentVerifications: number;
          minVerifiers: number;
          quorumRatio: number;
        }>
      >(`/api/v1/tasks/${taskId}/quorum`);

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
